import Phaser from 'phaser';
import { save } from '../systems/SaveSystem';

/**
 * Motion / accessibility helpers. Reads the reduced-motion + screen-shake settings so effects
 * degrade gracefully instead of being sprinkled with if-statements in scenes.
 */
export const motion = {
  get reduced(): boolean {
    return save.data.settings.reducedMotion;
  },
  get shakeEnabled(): boolean {
    return save.data.settings.screenShake && !save.data.settings.reducedMotion;
  },
  get damageNumbers(): boolean {
    return save.data.settings.damageNumbers;
  },
  /** Scale a duration (reduced motion = snappier, fewer frames of movement). */
  ms(base: number): number {
    return this.reduced ? Math.round(base * 0.6) : base;
  },
  /** Scale a "pop" amount (e.g. 1.25 -> 1.1 under reduced motion). */
  pop(amount: number): number {
    return this.reduced ? 1 + (amount - 1) * 0.4 : amount;
  },
  shake(scene: Phaser.Scene, intensity = 0.004, duration = 120): void {
    if (!this.shakeEnabled) return;
    scene.cameras.main.shake(duration, intensity);
  },
  /** Gentle tint flash on a sprite - avoids full-screen flashing. */
  flashSprite(scene: Phaser.Scene, target: Phaser.GameObjects.Sprite | Phaser.GameObjects.Image, color = 0xffffff, duration = 90): void {
    target.setTint(color).setTintMode(Phaser.TintModes.FILL);
    scene.time.delayedCall(this.reduced ? Math.min(duration, 60) : duration, () => {
      if (target.active) target.clearTint().setTintMode(Phaser.TintModes.MULTIPLY);
    });
  },
};
