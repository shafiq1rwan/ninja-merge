import Phaser from 'phaser';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';
import { FloatingText } from '../ui/FloatingText';
import { TEXT } from '../ui/theme';

/**
 * Damage / heal readouts. Thin presets over the pooled FloatingText so numbers stay small, land
 * near the target, spread sideways instead of stacking, and disappear inside ~600ms.
 */
export class DamageNumbers {
  private floats: FloatingText;

  constructor(scene: Phaser.Scene, prewarm = 14) {
    this.floats = new FloatingText(scene, prewarm);
  }

  /** One merge's damage on the enemy. `index` staggers multi-merge swings. */
  enemyHit(x: number, y: number, damage: number, opts: { crit?: boolean; index?: number; color?: string; size?: number } = {}): void {
    if (!effects.damageNumbers) return;
    const i = opts.index ?? 0;
    const jitter = JUICE.damage.jitter;
    this.floats.show(x + (i % 2 === 0 ? -1 : 1) * Phaser.Math.Between(4, jitter), y - i * 12, `${damage}`, {
      size: opts.size ?? (opts.crit ? JUICE.damage.critSize : JUICE.damage.size),
      color: opts.color ?? (opts.crit ? TEXT.gold : '#ffffff'),
      delay: i * JUICE.damage.staggerMs,
      duration: JUICE.damage.lifeMs,
      rise: JUICE.damage.rise,
      scaleFrom: opts.crit ? 1.5 : 1.25,
    });
  }

  /** Small CRIT! tag above the damage. */
  critTag(x: number, y: number): void {
    if (!effects.damageNumbers) return;
    this.floats.show(x, y - 38, 'CRIT!', { size: 26, color: TEXT.red, duration: 620, rise: 26, scaleFrom: 1.6 });
  }

  playerHit(x: number, y: number, damage: number): void {
    if (!effects.damageNumbers) return;
    this.floats.show(x, y, `-${damage}`, { size: 34, color: TEXT.red, duration: JUICE.damage.lifeMs, rise: 26, scaleFrom: 1.35 });
  }

  heal(x: number, y: number, amount: number): void {
    if (!effects.damageNumbers) return;
    this.floats.show(x, y, `+${amount}`, { size: 32, color: TEXT.green, duration: JUICE.damage.lifeMs, rise: 26, scaleFrom: 1.3 });
  }

  /** Status readout (poison tick, XP, gold) - always allowed, it is information. */
  note(x: number, y: number, text: string, color: string, size = 24): void {
    this.floats.show(x, y, text, { size, color, duration: 700, rise: 26 });
  }

  /** Centre-screen shout: COMBO, CRITICAL, banners handled elsewhere. */
  shout(x: number, y: number, text: string, color: string, size = 36, duration = 900): void {
    this.floats.show(x, y, text, { size, color, duration, rise: 24, scaleFrom: 1.4 });
  }
}
