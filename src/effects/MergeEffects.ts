import { JUICE } from '../data/juice';
import { RANKS, rankName } from '../data/ranks';
import { effects } from '../settings/EffectsSettings';
import type { ParticleEffects } from './ParticleEffects';

/**
 * Merge-specific presentation rules: how hard a rank pops, how many motes it throws, how the merge
 * sound escalates within one swipe, and whether a rank is worth announcing this run.
 */
class MergeEffectsSystem {
  /** Ranks already announced during the current run (presentation only - never persisted). */
  private announced = new Set<number>();

  /** Called when a run (or a standalone battle) begins. */
  resetAnnouncements(): void {
    this.announced.clear();
  }

  /** True the first time a notable rank is forged in this run. */
  shouldAnnounce(rank: number): boolean {
    if (rank < JUICE.merge.announceRank || this.announced.has(rank)) return false;
    this.announced.add(rank);
    return true;
  }

  announceText(rank: number): string {
    return `${rankName(rank).toUpperCase()} FORGED!`;
  }

  isHigh(rank: number): boolean {
    return rank >= JUICE.merge.highRank;
  }

  /** Pop scale for the new tile - slightly stronger for high ranks, damped by reduced motion. */
  popScale(rank: number): number {
    return effects.pop(this.isHigh(rank) ? JUICE.merge.popHigh : JUICE.merge.pop);
  }

  /** Detune (in cents) for the nth merge inside one swipe, so combos climb in pitch. */
  mergeDetune(index: number): number {
    return Math.min(JUICE.merge.maxPitch, index * JUICE.merge.pitchStep);
  }

  /** Pixel burst around a finished merge. */
  burst(particles: ParticleEffects, x: number, y: number, rank: number): void {
    const high = this.isHigh(rank);
    particles.burst(x, y, {
      count: high ? JUICE.merge.burstHigh : JUICE.merge.burstNormal,
      color: RANKS[Math.min(rank, RANKS.length - 1)]?.accent ?? 0xffffff,
      size: high ? 8 : 6,
      speed: high ? 110 : 82,
      lifeMs: high ? 360 : 300,
    });
  }
}

export const mergeEffects = new MergeEffectsSystem();
