import Phaser from 'phaser';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';

/**
 * Count a displayed value up/down instead of snapping, so gold and XP changes read as a gain.
 * Purely visual: the real value is already committed in the save/systems before this runs.
 */
export function tweenNumber(
  scene: Phaser.Scene,
  from: number,
  to: number,
  onUpdate: (value: number) => void,
  durationMs = JUICE.numberTweenMs,
): void {
  const rounded = Math.round(to);
  if (effects.reduced || from === rounded) {
    onUpdate(rounded);
    return;
  }
  const holder = { v: from };
  scene.tweens.add({
    targets: holder,
    v: rounded,
    duration: effects.ms(durationMs),
    ease: 'Cubic.easeOut',
    onUpdate: () => onUpdate(Math.round(holder.v)),
    onComplete: () => onUpdate(rounded),
  });
}

/** Brief scale pop on a text object, used when its number changed. */
export function popText(scene: Phaser.Scene, target: Phaser.GameObjects.Text, amount = 1.18): void {
  if (effects.reduced) return;
  scene.tweens.killTweensOf(target);
  target.setScale(1);
  scene.tweens.add({ targets: target, scale: effects.pop(amount), duration: 90, yoyo: true, ease: 'Quad.easeOut' });
}
