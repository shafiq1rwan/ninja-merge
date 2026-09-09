import Phaser from 'phaser';
import { ANIM } from '../data/balance';
import { BATTLE_LAYOUT } from '../data/battleAssets';
import { JUICE } from '../data/juice';
import type { StrengthTier } from '../data/mergeCharacters';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import type { EnemyState } from '../systems/CombatSystem';
import type { EnemyDef } from '../types';
import { delay, tweenAsync } from '../ui/async';
import { HealthBar } from '../ui/HealthBar';
import { motion } from '../ui/motion';
import { Panel } from '../ui/Panel';
import { COLORS, DEPTH, TEXT, textStyle } from '../ui/theme';

/**
 * The enemy actor: sprite standing on the ground line with a ground shadow.
 * Purely presentational; animations return promises so the battle scene can sequence them.
 * Its stats/HP live in EnemyStatusCard so the environment stays free of HUD text.
 */
export class EnemyView extends Phaser.GameObjects.Container {
  readonly def: EnemyDef;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly renderScale: number;
  private shadow: Phaser.GameObjects.Ellipse;
  private shieldFx?: Phaser.GameObjects.Sprite;
  private idleKey: string;
  private hitKey?: string;
  private idleTween?: Phaser.Tweens.Tween;

  /** @param x centre x, @param feetY the ground line the enemy stands on */
  constructor(scene: Phaser.Scene, x: number, feetY: number, def: EnemyDef) {
    super(scene, x, feetY);
    this.def = def;
    this.setDepth(DEPTH.content);

    const texture = scene.textures.exists(def.sprite) ? def.sprite : 'ui_emote1';
    const frameH = scene.textures.get(texture).get(0).height;
    // Integer scale, clamped so the sprite always fits between the title bar and the ground.
    this.renderScale = Math.max(1, Math.min(def.scale, Math.floor(BATTLE_LAYOUT.enemyMaxHeight / frameH)));

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

    const w = scene.textures.get(texture).get(0).width * this.renderScale;
    this.shadow = scene.add.ellipse(0, 4, Math.round(w * 0.8), 18, 0x000000, 0.4);
    this.add(this.shadow);
    this.sprite = scene.add.sprite(0, 0, texture, 0).setOrigin(0.5, 1).setScale(this.renderScale);
    if (scene.anims.exists(this.idleKey)) this.sprite.play(this.idleKey);
    this.add(this.sprite);
    scene.add.existing(this);
    this.idleBob();
  }

  get spriteHeight(): number {
    return this.sprite.displayHeight;
  }

  /** World point on the enemy's upper body where damage numbers spawn. */
  get hitPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.spriteHeight * 0.6 };
  }

  /**
   * Where attack techniques land: the torso for small enemies, upper-middle for tall ones.
   * Per-enemy overrides live on the enemy definition (impactOffsetX / impactOffsetY).
   */
  get impactPoint(): { x: number; y: number } {
    return {
      x: this.x + (this.def.impactOffsetX ?? 0),
      y: this.y + (this.def.impactOffsetY ?? -this.spriteHeight * 0.55),
    };
  }

  /** Effect size multiplier: small enemy small effect, boss slightly larger. */
  get impactScale(): number {
    if (this.def.impactScale !== undefined) return this.def.impactScale;
    if (this.def.isBoss) return 1.3;
    return this.spriteHeight >= 140 ? 1.12 : 1;
  }

  /** World point at the sprite's centre (for effects). */
  get centerPoint(): { x: number; y: number } {
    return { x: this.x, y: this.y - this.spriteHeight / 2 };
  }

  private idleBob(): void {
    if (!this.sprite.active) return;
    this.idleTween?.remove();
    this.sprite.setPosition(0, 0);
    if (!effects.reduced) {
      this.idleTween = this.scene.tweens.add({ targets: this.sprite, y: -5, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  /**
   * Entrance. Normal enemies drop in quickly; a boss arrives with weight so the wave feels different.
   */
  async enter(kind: 'normal' | 'elite' | 'boss'): Promise<void> {
    this.idleTween?.remove();
    const drop = kind === 'boss' ? 220 : 90;
    this.sprite.setAlpha(0);
    this.shadow.setAlpha(0);
    this.sprite.setY(-drop);
    const ms = effects.ms(kind === 'boss' ? 520 : 240);
    this.scene.tweens.add({ targets: this.shadow, alpha: 0.4, duration: ms });
    await tweenAsync(this.scene, {
      targets: this.sprite,
      y: 0,
      alpha: 1,
      duration: ms,
      ease: kind === 'boss' ? 'Bounce.easeOut' : 'Quad.easeOut',
    });
    if (kind === 'boss') {
      motion.shake(this.scene, JUICE.shake.bossAttack, 120);
      this.squashLand();
    } else if (kind === 'elite') {
      motion.flashSprite(this.scene, this.sprite, 0xc9a6ff, 140);
    }
    this.idleBob();
  }

  private squashLand(): void {
    if (effects.reduced) return;
    const s = this.renderScale;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: s * 1.08,
      scaleY: s * 0.92,
      duration: 90,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.sprite.setScale(s),
    });
  }

  /**
   * Reaction to one landed strike: brief flash, recoil away from the player, and a small jitter.
   * Recoil scales with the technique's strength tier, so a heavy katana reads heavier than a quick
   * cut. Bosses swap to their hit sheet for one cycle.
   */
  async impact(tier: StrengthTier = 'medium', crit = false): Promise<void> {
    this.idleTween?.remove();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(0, 0);
    motion.flashSprite(this.scene, this.sprite, crit ? 0xffd97a : 0x707070, crit ? 110 : 70, crit ? 'fill' : 'add');
    if (this.hitKey && this.scene.anims.exists(this.hitKey)) {
      this.sprite.play(this.hitKey);
      this.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this.sprite.active && this.scene.anims.exists(this.idleKey)) this.sprite.play(this.idleKey);
      });
    }
    const tierPx = { light: 4, medium: JUICE.recoil.px, heavy: 7, ultimate: 9 }[tier];
    const px = effects.px(tierPx + (crit ? 3 : 0));
    const ms = effects.ms(JUICE.recoil.ms);
    // Recoil backwards (up-screen, away from the player) with a small sideways jitter.
    await tweenAsync(this.scene, {
      targets: this.sprite,
      y: -px,
      x: Phaser.Math.Between(-2, 2) * (crit ? 2 : 1),
      duration: ms * 0.4,
      yoyo: true,
      ease: 'Quad.easeOut',
    });
    this.idleBob();
  }

  /** Back-compat entry point for hits that are not character techniques (tapped bomb, debug). */
  hitReaction(crit: boolean): Promise<void> {
    return this.impact('medium', crit);
  }

  /** Slash effect drawn over the enemy. */
  slashFx(crit: boolean): void {
    const key = crit ? 'fx_slash_curved' : 'fx_slash';
    const tex = crit ? 'fx_SlashCurved' : 'fx_CutX';
    if (!this.scene.anims.exists(key)) return;
    const c = this.centerPoint;
    const fx = this.scene.add.sprite(c.x + Phaser.Math.Between(-24, 24), c.y + Phaser.Math.Between(-16, 16), tex)
      .setScale(crit ? 6 : 4)
      .setDepth(DEPTH.fx)
      .setAngle(Phaser.Math.Between(-30, 30))
      .play(key);
    if (crit) fx.setTint(0xffd97a);
    fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
  }

  /** Lunge toward the player (down the screen) and back. Resolves at the moment of impact. */
  async attackLunge(): Promise<void> {
    this.idleTween?.remove();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(0, 0);
    const s = this.renderScale;
    const ms = effects.ms(ANIM.enemyAttackMs);
    await tweenAsync(this.scene, { targets: this.sprite, y: -22, scaleX: s * 1.06, scaleY: s * 0.94, duration: ms * 0.35, ease: 'Quad.easeOut' });
    audio.play('attack', { detune: -150 });
    tweenAsync(this.scene, { targets: this.sprite, y: 44, scaleX: s, scaleY: s, duration: ms * 0.2, ease: 'Quad.easeIn' })
      .then(() => tweenAsync(this.scene, { targets: this.sprite, y: 0, duration: ms * 0.45, ease: 'Quad.easeOut' }))
      .then(() => this.idleBob());
    await delay(this.scene, ms * 0.2);
  }

  showShield(on: boolean): void {
    if (on && !this.shieldFx && this.scene.anims.exists('fx_shield')) {
      const size = Math.ceil(this.spriteHeight / 26) + 1;
      this.shieldFx = this.scene.add.sprite(0, -this.spriteHeight / 2, 'fx_Shield').setScale(size).setAlpha(0.75).play('fx_shield');
      this.add(this.shieldFx);
    } else if (!on && this.shieldFx) {
      this.shieldFx.destroy();
      this.shieldFx = undefined;
    }
  }

  /** Phase change / rage: the enemy visibly changes state. */
  async phaseChange(): Promise<void> {
    this.idleTween?.remove();
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setPosition(0, 0);
    motion.flashSprite(this.scene, this.sprite, 0xff6b5b, 160);
    this.squashLand();
    await tweenAsync(this.scene, { targets: this.sprite, y: -10, duration: effects.ms(120), yoyo: true, ease: 'Quad.easeOut' });
    this.sprite.setTint(0xff9a8a);
    this.idleBob();
  }

  showRage(): void {
    this.sprite.setTint(0xff9a8a);
  }

  /**
   * Death: recoil, dissolve and smoke. Bosses take noticeably longer so the kill lands.
   */
  async die(isBoss = false): Promise<void> {
    this.idleTween?.remove();
    this.scene.tweens.killTweensOf(this.sprite);
    this.showShield(false);
    // Final recoil before collapsing.
    await tweenAsync(this.scene, { targets: this.sprite, y: -effects.px(10), duration: effects.ms(isBoss ? 180 : 90), ease: 'Quad.easeOut' });
    if (this.scene.anims.exists('fx_smoke')) {
      const c = this.centerPoint;
      const fx = this.scene.add.sprite(c.x, c.y, 'fx_Smoke').setScale(Math.ceil(this.spriteHeight / 32) + 2).setDepth(DEPTH.fx).play('fx_smoke');
      fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
    }
    this.scene.tweens.add({ targets: this.shadow, alpha: 0, duration: effects.ms(isBoss ? 900 : 380) });
    await tweenAsync(this.scene, {
      targets: this.sprite,
      alpha: 0,
      scaleX: this.renderScale * 0.5,
      scaleY: this.renderScale * 0.35,
      y: 12,
      angle: effects.reduced ? 0 : isBoss ? 12 : 20,
      duration: effects.ms(isBoss ? 900 : 400),
      ease: 'Quad.easeIn',
    });
  }
}

/**
 * Combat status card under the enemy scene: portrait, name + level, HP bar, attack countdown, statuses.
 * Sits in its own panel so no HUD text floats over the environment.
 */
export class EnemyStatusCard extends Phaser.GameObjects.Container {
  private hpBar: HealthBar;
  private counterText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private nameText: Phaser.GameObjects.Text;
  private scene2: Phaser.Scene;

  constructor(scene: Phaser.Scene, top: number, height: number, def: EnemyDef, state: EnemyState) {
    super(scene, 0, 0);
    this.scene2 = scene;
    this.setDepth(DEPTH.hud);
    const width = BATTLE_LAYOUT.panel.width;
    const cx = BATTLE_LAYOUT.panel.x;
    const cy = top + height / 2;
    const left = cx - width / 2 + 16;
    const right = cx + width / 2 - 16;
    this.add(new Panel(scene, cx, cy, width, height, def.isBoss ? 'ui_panel3' : 'ui_panel'));

    // Portrait
    const faceKey = def.isBoss ? def.sprite.replace(/_(idle|walk)$/, '_face') : `${def.sprite}_face`;
    const faceSize = 76;
    this.add(scene.add.rectangle(left + faceSize / 2, cy, faceSize + 6, faceSize + 6, COLORS.ink, 0.8).setStrokeStyle(3, def.isBoss ? COLORS.gold : COLORS.woodLight));
    if (scene.textures.exists(faceKey)) this.add(scene.add.image(left + faceSize / 2, cy, faceKey).setScale(2));

    const textX = left + faceSize + 18;
    const label = def.isBoss ? `BOSS  ${def.name}` : def.name;
    this.nameText = scene.add.text(textX, top + 14, label, textStyle(24, { color: def.isBoss ? TEXT.red : TEXT.light, align: 'left' })).setOrigin(0, 0);
    this.add(this.nameText);
    this.add(scene.add.text(right, top + 16, `Lv ${state.level}`, textStyle(20, { color: TEXT.muted, align: 'right' })).setOrigin(1, 0));

    const barW = right - textX;
    this.hpBar = new HealthBar(scene, textX + barW / 2, top + 58, { width: barW, height: 30, fillColor: COLORS.red, lowColor: 0xff8a5b, label: 'HP', fontSize: 18 });
    this.hpBar.reset(state.hp, state.maxHp);
    this.add(this.hpBar);

    this.counterText = scene.add.text(textX, top + height - 14, '', textStyle(20, { color: TEXT.light, align: 'left' })).setOrigin(0, 1);
    this.statusText = scene.add.text(right, top + height - 14, '', textStyle(18, { color: TEXT.blue, align: 'right' })).setOrigin(1, 1);
    this.add([this.counterText, this.statusText]);
    this.setCounter(state.counter);
    scene.add.existing(this);
  }

  setHp(hp: number, max: number): void {
    this.hpBar.set(hp, max);
  }

  setCounter(n: number): void {
    if (n <= 1) this.counterText.setText('Enemy attacks NEXT move!').setColor(TEXT.red);
    else this.counterText.setText(`Enemy attack in: ${n}`).setColor(TEXT.light);
  }

  setStatus(parts: string[]): void {
    this.statusText.setText(parts.join('  '));
  }

  showRage(): void {
    this.nameText.setColor(TEXT.red);
  }

  /** Slide the card in (used for a boss entrance). */
  appear(): Promise<void> {
    if (effects.reduced) return Promise.resolve();
    this.setAlpha(0);
    this.y = 24;
    return tweenAsync(this.scene2, { targets: this, alpha: 1, y: 0, duration: effects.ms(260), ease: 'Quad.easeOut' });
  }
}
