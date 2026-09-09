import Phaser from 'phaser';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';

/**
 * Motion / accessibility helpers used across scenes. The policy itself lives in
 * settings/EffectsSettings (reduced motion + effects level); this is the convenience wrapper
 * scenes call, plus the two sprite/camera helpers that need a scene.
 */
export const motion = {
  get reduced(): boolean {
    return effects.reduced;
  },
  get shakeEnabled(): boolean {
    return effects.shakeEnabled;
  },
  get damageNumbers(): boolean {
    return effects.damageNumbers;
  },
  /** Scale a duration (reduced motion = snappier, fewer frames of movement). */
  ms(base: number): number {
    return effects.ms(base);
  },
  /** Scale a "pop" amount (e.g. 1.25 -> 1.1 under reduced motion). */
  pop(amount: number): number {
    return effects.pop(amount);
  },
  shake(scene: Phaser.Scene, intensity = 0.004, duration = 120): void {
    if (!effects.shakeEnabled) return;
    scene.cameras.main.shake(Math.min(duration, JUICE.shake.maxMs), effects.level === 'low' ? intensity * 0.5 : intensity);
  },
  /**
   * Gentle tint flash on a sprite - never a full-screen flash.
   * 'add' brightens the sprite so its silhouette and the effect over it stay readable;
   * 'fill' blanks it to a solid colour and is reserved for critical hits.
   */
  flashSprite(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image,
    color = 0xffffff,
    duration = 90,
    mode: 'add' | 'fill' = 'fill',
  ): void {
    target.setTint(color).setTintMode(mode === 'add' ? Phaser.TintModes.ADD : Phaser.TintModes.FILL);
    scene.time.delayedCall(effects.reduced ? Math.min(duration, 60) : duration, () => {
      if (target.active) target.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  },
};
