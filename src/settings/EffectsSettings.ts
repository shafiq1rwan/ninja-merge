import { JUICE } from '../data/juice';
import { save } from '../systems/SaveSystem';

export type EffectsLevel = 'low' | 'normal';

/**
 * Single place that decides how much juice is allowed, from the player's Settings:
 *  - Reduced motion: no shake, no big scale pops, fewer particles, no ambient motion, shorter timings.
 *  - Effects: Low trims particles / camera movement / ambient motion but keeps every gameplay signal.
 *
 * Effects never gate information: damage numbers, HP changes and merge confirmation survive both modes.
 */
export const effects = {
  get level(): EffectsLevel {
    return save.data.settings.effectsLevel === 'low' ? 'low' : 'normal';
  },
  get reduced(): boolean {
    return save.data.settings.reducedMotion;
  },
  get low(): boolean {
    return this.level === 'low' || this.reduced;
  },
  get shakeEnabled(): boolean {
    return save.data.settings.screenShake && !this.reduced;
  },
  get damageNumbers(): boolean {
    return save.data.settings.damageNumbers;
  },
  /** Ambient background particles allowed at once. */
  get ambientCount(): number {
    return this.reduced || this.level === 'low' ? JUICE.ambient.low : JUICE.ambient.normal;
  },
  /** Permanent per-tile decorations (sparkle / aura) are cosmetic only. */
  get tileFlourishes(): boolean {
    return !this.low;
  },
  /** Scale a duration: reduced motion is snappier, never slower. */
  ms(base: number): number {
    return this.reduced ? Math.round(base * 0.6) : base;
  },
  /** Scale a "pop" amount, e.g. 1.15 -> 1.06 under reduced motion. */
  pop(amount: number): number {
    return this.reduced ? 1 + (amount - 1) * 0.4 : amount;
  },
  /** Scale a pixel offset (recoil, bumps). */
  px(amount: number): number {
    return this.reduced ? Math.round(amount * 0.4) : amount;
  },
  /** Particle count for an effect, 0 when effects are dialled down. */
  particles(count: number): number {
    if (this.reduced) return 0;
    return this.level === 'low' ? Math.floor(count * 0.4) : count;
  },
  /** Hit-stop duration; disabled entirely under reduced motion. */
  hitStop(ms: number): number {
    return this.reduced ? 0 : ms;
  },
};
