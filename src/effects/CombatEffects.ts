import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { getItem } from '../data/items';
import { JUICE } from '../data/juice';
import { RANKS } from '../data/ranks';
import type { EnemyView } from '../entities/Enemy';
import type { PlayerHud } from '../entities/Player';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import { equipment } from '../systems/EquipmentSystem';
import { delay } from '../ui/async';
import type { ComboIndicator } from '../ui/ComboIndicator';
import { DEPTH, TEXT } from '../ui/theme';
import type { CameraEffects } from './CameraEffects';
import type { DamageNumbers } from './DamageNumbers';
import { mergeEffects } from './MergeEffects';
import type { ParticleEffects } from './ParticleEffects';

/**
 * What the gameplay layer reports after a swipe. The numbers are already final - this system only
 * decides how the hit *looks and sounds*. Nothing here can change damage or state.
 */
export interface AttackReport {
  /** One entry per merge, with the damage actually shown for it. */
  hits: { rank: number; damage: number }[];
  critical: boolean;
  merges: number;
  comboMult: number;
  bombDamage: number;
  bestRank: number;
  /** True when this attack killed the enemy (stronger hit-stop). */
  killed: boolean;
  isBoss: boolean;
}

export interface CombatEffectRefs {
  enemy: EnemyView;
  hud: PlayerHud;
  particles: ParticleEffects;
  camera: CameraEffects;
  numbers: DamageNumbers;
  combo: ComboIndicator;
  /** Y used for centre-screen shouts. */
  shoutY: number;
}

/**
 * The merge -> attack -> impact feedback chain, in one place:
 *
 *   0ms    merge finished (caller)
 *   ~45ms  ninja winds up (portrait reacts, whoosh)
 *   ~90ms  weapon streak crosses to the enemy
 *   ~190ms impact: hit-stop, slash, recoil, flash, damage numbers, impact sound
 */
export class CombatEffects {
  private scene: Phaser.Scene;
  private refs: CombatEffectRefs;

  constructor(scene: Phaser.Scene, refs: CombatEffectRefs) {
    this.scene = scene;
    this.refs = refs;
  }

  /** Texture for the streak that flies at the enemy, based on the equipped weapon. */
  private weaponTexture(): string {
    const id = equipment.equipped.weapon;
    const icon = id ? getItem(id)?.icon : undefined;
    return icon && this.scene.textures.exists(icon) ? icon : 'item_Sword';
  }

  /**
   * Play a full attack. Resolves once the impact has registered, so the caller can continue
   * immediately afterwards (it does not wait for particles or numbers to finish).
   *
   * `onImpact` fires on the exact impact frame - the caller uses it to drop the HP bar then, so the
   * bar never moves before the hit connects.
   */
  async attackOccurred(report: AttackReport, onImpact?: () => void): Promise<void> {
    const { enemy, hud, numbers, particles, camera, combo } = this.refs;
    const strong = report.merges >= 2 || mergeEffects.isHigh(report.bestRank);

    // Combo + rank shouts go up straight away so they overlap the swing rather than delaying it.
    if (report.merges >= 2) combo.show(report.merges, report.comboMult);

    // 1. Wind-up: the ninja visibly acts.
    hud.attackReaction();
    audio.play(strong ? 'slashHeavy' : 'attack', { detune: report.critical ? 120 : 0 });
    await delay(this.scene, effects.ms(JUICE.attack.windupMs));

    // 2. Weapon streak from the player HUD up to the enemy.
    this.streak(report);
    await delay(this.scene, effects.ms(JUICE.attack.slashMs));

    // 3. Impact.
    const hitPoint = enemy.hitPoint;
    enemy.slashFx(report.critical);
    camera.hitStop(report.killed ? (report.isBoss ? JUICE.hitStop.boss : JUICE.hitStop.kill) : report.critical ? JUICE.hitStop.crit : strong ? JUICE.hitStop.strong : JUICE.hitStop.normal);
    audio.play('impact', { detune: report.critical ? 150 : strong ? 60 : 0 });
    if (report.critical) audio.play('crit');
    onImpact?.();
    const recoil = enemy.hitReaction(report.critical);

    particles.burst(hitPoint.x, hitPoint.y + 20, {
      count: report.critical ? 10 : strong ? 8 : 5,
      color: report.critical ? 0xffd97a : 0xffffff,
      size: report.critical ? 8 : 6,
      speed: report.critical ? 120 : 90,
    });
    if (report.critical) camera.shake(JUICE.shake.crit, 110);

    // Damage readouts. Up to three merges read as separate numbers; beyond that they would overlap,
    // so the swing reports one larger total (the combo indicator already says how many merges it was).
    if (report.hits.length <= 3) {
      report.hits.forEach((h, i) => numbers.enemyHit(hitPoint.x, hitPoint.y, Math.round(h.damage), { crit: report.critical, index: i }));
    } else {
      const total = report.hits.reduce((sum, h) => sum + h.damage, 0);
      numbers.enemyHit(hitPoint.x, hitPoint.y, Math.round(total), { crit: report.critical, size: JUICE.damage.critSize + 6 });
    }
    if (report.bombDamage > 0) numbers.enemyHit(hitPoint.x, hitPoint.y, report.bombDamage, { index: Math.min(report.hits.length, 3), color: '#ff8a5b' });
    if (report.critical) numbers.critTag(hitPoint.x, hitPoint.y);

    await recoil;
    await delay(this.scene, effects.ms(JUICE.attack.impactMs));
  }

  /** The weapon sprite crossing from the player to the enemy. */
  private streak(report: AttackReport): void {
    if (effects.reduced) return;
    const from = this.refs.hud.portraitPoint;
    const to = this.refs.enemy.centerPoint;
    const tex = this.weaponTexture();
    if (!this.scene.textures.exists(tex)) return;
    const accent = RANKS[Math.min(report.bestRank, RANKS.length - 1)]?.accent;
    const img = this.scene.add
      .image(from.x, from.y, tex)
      .setScale(report.critical ? 4 : 3.2)
      .setDepth(DEPTH.fx)
      .setAngle(-35);
    if (accent && report.bestRank >= JUICE.tile.detailRank) img.setTint(accent);
    this.scene.tweens.add({
      targets: img,
      x: to.x,
      y: to.y,
      angle: 320,
      duration: effects.ms(JUICE.attack.slashMs + JUICE.attack.impactMs),
      ease: 'Quad.easeIn',
      onComplete: () => img.destroy(),
    });
  }

  /** Enemy destroyed: strong stop, burst, dissolve. */
  async enemyDied(isBoss: boolean): Promise<void> {
    const { enemy, particles, camera } = this.refs;
    const point = enemy.centerPoint;
    camera.hitStop(isBoss ? JUICE.hitStop.boss : JUICE.hitStop.kill);
    audio.play('enemyDeath');
    particles.burst(point.x, point.y, {
      count: isBoss ? 16 : 10,
      color: 0xf1e2c3,
      size: isBoss ? 9 : 7,
      speed: isBoss ? 150 : 110,
      lifeMs: 480,
    });
    if (isBoss) {
      audio.play('bossDefeat');
      camera.shake(JUICE.shake.bossDeath, 140);
      camera.zoomPunch(1.03, 300);
    }
    await enemy.die(isBoss);
  }

  /** Enemy connected with the player. */
  playerHurt(damage: number): void {
    const { hud, numbers, camera, particles } = this.refs;
    const p = hud.portraitPoint;
    hud.hitReaction();
    audio.play('playerHit');
    numbers.playerHit(hud.hpBarPoint.x, hud.hpBarPoint.y, damage);
    particles.burst(p.x, p.y, { count: 5, color: 0xff6b5b, size: 6, speed: 70, lifeMs: 260 });
    camera.shake(JUICE.shake.playerHit, 100);
    camera.bump(6, 110);
  }

  healed(amount: number): void {
    const { hud, numbers, particles } = this.refs;
    const p = hud.portraitPoint;
    hud.healReaction();
    audio.play('heal');
    numbers.heal(hud.hpBarPoint.x, hud.hpBarPoint.y, amount);
    particles.rise(p.x, p.y, { count: 6, color: 0x8fe3c8 });
  }

  /** Centre-screen shout (RAGE, BOARD LOCK, rank announcements). */
  shout(text: string, color: string = TEXT.gold, size = 36, duration = 900): void {
    this.refs.numbers.shout(GAME_WIDTH / 2, this.refs.shoutY, text, color, size, duration);
  }
}
