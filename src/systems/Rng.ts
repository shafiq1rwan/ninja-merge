/**
 * Small deterministic PRNG (mulberry32). Used by BoardSystem so tests are reproducible.
 * Pass no seed for a time-based seed in the real game.
 */
export class Rng {
  private state: number;

  constructor(seed?: number) {
    this.state = (seed ?? (Date.now() ^ (Math.random() * 0xffffffff))) >>> 0;
  }

  /** Float in [0, 1). */
  next(): number {
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [min, max] inclusive. */
  int(min: number, max: number): number {
    return min + Math.floor(this.next() * (max - min + 1));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}
