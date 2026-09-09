import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { JUICE } from '../data/juice';
import { techniqueFor } from '../data/mergeCharacters';
import type { EnemyView } from '../entities/Enemy';
import type { PlayerHud } from '../entities/Player';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import { delay } from '../ui/async';
import type { ComboIndicator } from '../ui/ComboIndicator';
import { TEXT } from '../ui/theme';
import type { CameraEffects } from './CameraEffects';
import type { CombatVFX, HitInfo } from './CombatVFX';
import type { DamageNumbers } from './DamageNumbers';
import type { ParticleEffects } from './ParticleEffects';

/**
 * What the gameplay layer reports after a swipe. The numbers are already final - this system only
 * decides how the hit *looks and sounds*. Nothing here can change damage or state.
 */
export interface AttackReport {
  /** One entry per merge: the rank that merged (which technique plays) and the damage shown for it. */
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
  vfx: CombatVFX;
  /** Y used for centre-screen shouts. */
  shoutY: number;
}

/**
 * The merge -> technique -> impact feedback chain.
 *
 * The merged character decides the attack: each merge plays its rank's ninja technique directly on
 * the monster (see data/mergeCharacters.ts + CombatVFX). Nothing is thrown from the board or the HUD,
 * and no character leaves its tile. Several merges in one swipe chain their techniques 60ms apart.
 */
export class CombatEffects {
  private scene: Phaser.Scene;
  private refs: CombatEffectRefs;

  constructor(scene: Phaser.Scene, refs: CombatEffectRefs) {
    this.scene = scene;
    this.refs = refs;
  }

  /**
   * Play the attack for a resolved swipe. Resolves shortly after the first strike lands, so the
   * caller can continue while the technique's tail plays out.
   *
   * `onImpact` fires on the first strike - the caller drops the HP bar there.
   */
  async attackOccurred(report: AttackReport, onImpact?: () => void): Promise<void> {
    const { enemy, hud, camera, combo, vfx } = this.refs;

    // Combo shout goes up straight away so it overlaps the techniques rather than delaying them.
    if (report.merges >= 2) combo.show(report.merges, report.comboMult);
    // The player avatar acknowledges the swing. Nothing is launched from the HUD.
    hud.attackReaction();

    const target = enemy.impactPoint;
    const targetScale = enemy.impactScale;
    const ranks = report.hits.map((h) => h.rank);
    const lastTechnique = ranks.length - 1;
    let firstLanded = false;
    let lastRecoilAt = 0;

    const onHit = (info: HitInfo) => {
      // Freeze only twice per swipe - the opening strike and the chain's closing strike. Applying
      // hit-stop to every strike of every technique would stack into real sluggishness on a big combo.
      const opening = info.comboIndex === 0 && info.index === 0;
      const closing = info.comboIndex >= lastTechnique && info.last;
      if (opening || closing) camera.hitStop(this.hitStopFor(info, report));
      // Recoil is throttled so overlapping techniques do not restart it every few milliseconds.
      const now = this.scene.time.now;
      if (now - lastRecoilAt >= 55) {
        lastRecoilAt = now;
        void enemy.impact(info.tier, info.critical);
      }
      if (info.critical && opening) camera.shake(JUICE.shake.crit, 110);
      if (!firstLanded) {
        firstLanded = true;
        onImpact?.();
        this.showDamage(report, target);
      }
    };

    // Damage with no merge (a bomb tile clearing ninjas): the board already showed the explosion,
    // so the enemy just reacts. A normal merge never uses bomb visuals.
    if (!ranks.length) {
      audio.play('impact');
      onHit({ tier: 'medium', critical: report.critical, index: 0, last: true, comboIndex: 0 });
      await delay(this.scene, effects.ms(JUICE.attack.impactMs));
      return;
    }

    // Chain the techniques. With many merges the gap shrinks so the whole flurry still reads as one
    // combined attack instead of a queue of separate turns.
    const gap = Math.min(JUICE.attack.techniqueGapMs, JUICE.attack.chainWindowMs / Math.max(1, ranks.length - 1));
    const first = vfx.playCharacterAttack({ rank: ranks[0], critical: report.critical, comboIndex: 0, target, targetScale, onHit });
    for (let i = 1; i < ranks.length; i++) {
      const rank = ranks[i];
      const at = i * effects.ms(gap);
      this.scene.time.delayedCall(at, () => {
        void vfx.playCharacterAttack({ rank, critical: report.critical, comboIndex: i, target, targetScale, onHit });
      });
    }

    await first;
    await delay(this.scene, effects.ms(this.tailMs(ranks)));
  }

  /** How long to keep the loop busy after the first strike, so the technique reads without dragging. */
  private tailMs(ranks: number[]): number {
    const gap = Math.min(JUICE.attack.techniqueGapMs, JUICE.attack.chainWindowMs / Math.max(1, ranks.length - 1));
    let ms: number = JUICE.attack.impactMs;
    ranks.forEach((rank, i) => {
      const spec = techniqueFor(rank);
      const after = Math.max(0, spec.hits.length - 1) * spec.hitGapMs + (spec.finisher ? spec.finisherGapMs ?? 80 : 0);
      ms = Math.max(ms, i * gap + after + 60);
    });
    return Math.min(JUICE.attack.tailCapMs, ms);
  }

  private hitStopFor(info: HitInfo, report: AttackReport): number {
    if (report.killed && info.last) return report.isBoss ? JUICE.hitStop.boss : JUICE.hitStop.kill;
    if (info.critical) return JUICE.hitStop.crit;
    switch (info.tier) {
      case 'ultimate': return JUICE.hitStop.kill;
      case 'heavy': return JUICE.hitStop.strong;
      case 'medium': return JUICE.hitStop.normal + 8;
      default: return JUICE.hitStop.normal;
    }
  }

  /**
   * Damage readouts. Up to three merges read as separate numbers; beyond that they would overlap,
   * so the swing reports one larger total (the combo indicator already says how many merges it was).
   */
  private showDamage(report: AttackReport, point: { x: number; y: number }): void {
    const { numbers } = this.refs;
    if (report.hits.length <= 3) {
      report.hits.forEach((h, i) => numbers.enemyHit(point.x, point.y, Math.round(h.damage), { crit: report.critical, index: i }));
    } else {
      const total = report.hits.reduce((sum, h) => sum + h.damage, 0);
      numbers.enemyHit(point.x, point.y, Math.round(total), { crit: report.critical, size: JUICE.damage.critSize + 6 });
    }
    if (report.bombDamage > 0) numbers.enemyHit(point.x, point.y, report.bombDamage, { index: Math.min(report.hits.length, 3), color: '#ff8a5b' });
    if (report.critical) numbers.critTag(point.x, point.y);
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
