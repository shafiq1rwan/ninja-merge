import Phaser from 'phaser';
import { ANIM } from '../data/balance';
import { audio } from '../systems/AudioSystem';
import type { EnemyState } from '../systems/CombatSystem';
import type { EnemyDef } from '../types';
import { delay, tweenAsync } from '../ui/async';
import { HealthBar } from '../ui/HealthBar';
import { motion } from '../ui/motion';
import { flatPanel } from '../ui/Panel';
import { COLORS, DEPTH, TEXT, textStyle } from '../ui/theme';

/**
 * Enemy presentation: sprite + name + HP bar + attack countdown + status badges.
 * Animations return promises so the battle scene can sequence them.
 */
export class EnemyView extends Phaser.GameObjects.Container {
  readonly def: EnemyDef;
  readonly sprite: Phaser.GameObjects.Sprite;
  private hpBar: HealthBar;
  private nameText: Phaser.GameObjects.Text;
  private counterText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private shieldFx?: Phaser.GameObjects.Sprite;
  private idleKey: string;
  private hitKey?: string;
  private baseY: number;
  private spriteHomeX: number;
  private spriteHomeY: number;

  constructor(scene: Phaser.Scene, x: number, y: number, def: EnemyDef, state: EnemyState) {
    super(scene, x, y);
    this.def = def;
    this.baseY = y;
    this.setDepth(DEPTH.content);

    // Idle animation
    this.idleKey = `${def.sprite}_idle`;
    if (!scene.anims.exists(this.idleKey) && scene.textures.exists(def.sprite)) {
      const total = scene.textures.get(def.sprite).frameTotal - 1;
      const frames = (def.idleFrames ?? Array.from({ length: total }, (_, i) => i)).filter((f) => f < total);
      scene.anims.create({ key: this.idleKey, frames: scene.anims.generateFrameNumbers(def.sprite, { frames }), frameRate: def.isBoss ? 8 : 6, repeat: -1 });
    }
    if (def.hitSprite && scene.textures.exists(def.hitSprite)) {
      this.hitKey = `${def.hitSprite}_anim`;
      if (!scene.anims.exists(this.hitKey)) {
        scene.anims.create({ key: this.hitKey, frames: scene.anims.generateFrameNumbers(def.hitSprite, {}), frameRate: 12, repeat: 0 });
      }
    }

    // Shadow + sprite
    const shadowW = def.isBoss ? 220 : 110;
    this.add(scene.add.ellipse(0, 90, shadowW, 28, 0x000000, 0.35));
    this.spriteHomeX = 0;
    this.spriteHomeY = def.isBoss ? -10 : 20;
    const texture = scene.textures.exists(def.sprite) ? def.sprite : 'ui_emote1';
    this.sprite = scene.add.sprite(this.spriteHomeX, this.spriteHomeY, texture, 0).setScale(def.scale);
    if (scene.anims.exists(this.idleKey)) this.sprite.play(this.idleKey);
    this.add(this.sprite);

    // Name + level
    const title = def.isBoss ? `BOSS  ${def.name}` : def.name;
    this.nameText = scene.add.text(0, -150, `${title}   Lv ${state.level}`, textStyle(30, { color: def.isBoss ? TEXT.red : TEXT.light })).setOrigin(0.5);
    this.add(this.nameText);

    // HP bar
    this.hpBar = new HealthBar(scene, 0, 150, { width: 520, height: 38, fillColor: COLORS.red, lowColor: 0xff8a5b, label: 'HP' });
    this.hpBar.reset(state.hp, state.maxHp);
    this.add(this.hpBar);

    // Attack countdown + status
    this.add(flatPanel(scene, 0, 205, 420, 44, 0x1a1008, 0.7, 10));
    this.counterText = scene.add.text(0, 205, '', textStyle(26, { color: TEXT.light })).setOrigin(0.5);
    this.add(this.counterText);
    this.statusText = scene.add.text(0, 245, '', textStyle(22, { color: TEXT.blue })).setOrigin(0.5);
    this.add(this.statusText);
    this.setCounter(state.counter);

    scene.add.existing(this);

    if (!motion.reduced) {
      scene.tweens.add({ targets: this.sprite, y: this.spriteHomeY - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  setHp(hp: number, max: number): void {
    this.hpBar.set(hp, max);
  }

  setCounter(n: number): void {
    if (n <= 1) {
      this.counterText.setText('Enemy attacks NEXT move!').setColor(TEXT.red);
    } else {
      this.counterText.setText(`Enemy attack in: ${n}`).setColor(TEXT.light);
    }
  }

  setStatus(parts: string[]): void {
    this.statusText.setText(parts.join('   '));
  }

  /** Flash + recoil. Bosses swap to their hit sheet briefly. */
  async hitReaction(crit: boolean): Promise<void> {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(this.spriteHomeX, this.spriteHomeY);
    audio.play(crit ? 'crit' : 'enemyHit', { volume: crit ? 1 : 0.8 });
    motion.flashSprite(this.scene, this.sprite, crit ? 0xffd97a : 0xffffff, crit ? 140 : 90);
    if (crit) motion.shake(this.scene, 0.006, 160);
    if (this.hitKey && this.scene.anims.exists(this.hitKey)) {
      this.sprite.play(this.hitKey);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.sprite.active && this.scene.anims.exists(this.idleKey)) this.sprite.play(this.idleKey);
      });
    }
    await tweenAsync(this.scene, {
      targets: this.sprite,
      x: this.spriteHomeX + (motion.reduced ? 6 : 14),
      duration: 40,
      yoyo: true,
      repeat: crit ? 3 : 1,
      onComplete: () => this.idleBob(),
    });
  }

  /** Slash effect drawn over the enemy. */
  slashFx(crit: boolean): void {
    const key = crit ? 'fx_slash_curved' : 'fx_slash';
    const tex = crit ? 'fx_SlashCurved' : 'fx_CutX';
    if (!this.scene.anims.exists(key)) return;
    const fx = this.scene.add.sprite(this.x + Phaser.Math.Between(-30, 30), this.y + this.spriteHomeY + Phaser.Math.Between(-20, 20), tex)
      .setScale(crit ? 7 : 5)
      .setDepth(DEPTH.fx)
      .setAngle(Phaser.Math.Between(-30, 30))
      .play(key);
    if (crit) fx.setTint(0xffd97a);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  /** Lunge toward the player (down the screen) and back. Resolves at the moment of impact. */
  async attackLunge(): Promise<void> {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(this.spriteHomeX, this.spriteHomeY);
    const ms = motion.ms(ANIM.enemyAttackMs);
    await tweenAsync(this.scene, { targets: this.sprite, y: this.spriteHomeY - 26, scaleX: this.def.scale * 1.06, scaleY: this.def.scale * 0.94, duration: ms * 0.35, ease: 'Quad.easeOut' });
    audio.play('attack');
    tweenAsync(this.scene, { targets: this.sprite, y: this.spriteHomeY + 70, scaleX: this.def.scale, scaleY: this.def.scale, duration: ms * 0.2, ease: 'Quad.easeIn' })
      .then(() => tweenAsync(this.scene, { targets: this.sprite, y: this.spriteHomeY, duration: ms * 0.45, ease: 'Quad.easeOut' }))
      .then(() => this.idleBob());
    await delay(this.scene, ms * 0.2);
  }

  showShield(on: boolean): void {
    if (on && !this.shieldFx && this.scene.anims.exists('fx_shield')) {
      this.shieldFx = this.scene.add.sprite(0, this.spriteHomeY, 'fx_Shield').setScale(this.def.isBoss ? 11 : 7).setAlpha(0.8).play('fx_shield');
      this.add(this.shieldFx);
    } else if (!on && this.shieldFx) {
      this.shieldFx.destroy();
      this.shieldFx = undefined;
    }
  }

  showRage(): void {
    this.sprite.setTint(0xff9a8a);
    this.nameText.setColor(TEXT.red);
  }

  /** Death: fade + shrink with smoke. */
  async die(): Promise<void> {
    this.scene.tweens.killTweensOf(this.sprite);
    this.showShield(false);
    if (this.scene.anims.exists('fx_smoke')) {
      const fx = this.scene.add.sprite(this.x, this.y + this.spriteHomeY, 'fx_Smoke').setScale(this.def.isBoss ? 10 : 6).setDepth(DEPTH.fx).play('fx_smoke');
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    }
    await tweenAsync(this.scene, { targets: this.sprite, alpha: 0, scale: this.def.scale * 0.4, angle: motion.reduced ? 0 : 20, duration: motion.ms(520), ease: 'Quad.easeIn' });
  }

  private idleBob(): void {
    if (!this.sprite.active) return;
    this.sprite.setPosition(this.spriteHomeX, this.spriteHomeY);
    if (!motion.reduced) {
      this.scene.tweens.add({ targets: this.sprite, y: this.spriteHomeY - 6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  get hitPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y + this.spriteHomeY - 40 };
  }
}
