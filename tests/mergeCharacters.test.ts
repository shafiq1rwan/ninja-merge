import { describe, expect, it } from 'vitest';
import { SFX_KEYS, SPRITESHEETS } from '../src/data/assets';
import { BOARD } from '../src/data/balance';
import { MERGE_CHARACTERS, TECHNIQUES, mergeCharacter, techniqueDuration, techniqueFor, type TechniqueHit } from '../src/data/mergeCharacters';
import { RANKS, rankName } from '../src/data/ranks';

const textureKeys = new Set(SPRITESHEETS.map((s) => s.key));
const sfxKeys = new Set<string>(SFX_KEYS);

/** Every effect texture a technique can reference, including cues, projectiles and finishers. */
function allVfx(): { key: string; where: string }[] {
  const out: { key: string; where: string }[] = [];
  for (const [type, spec] of Object.entries(TECHNIQUES)) {
    if (spec.cue) out.push({ key: spec.cue.vfx, where: `${type}.cue` });
    if (spec.projectile) out.push({ key: spec.projectile.vfx, where: `${type}.projectile` });
    spec.hits.forEach((h: TechniqueHit, i) => out.push({ key: h.vfx, where: `${type}.hits[${i}]` }));
    if (spec.finisher) out.push({ key: spec.finisher.vfx, where: `${type}.finisher` });
  }
  return out;
}

describe('merge roster', () => {
  it('covers every board rank exactly once, in order', () => {
    expect(MERGE_CHARACTERS).toHaveLength(BOARD.maxRank);
    MERGE_CHARACTERS.forEach((c, i) => expect(c.rank).toBe(i + 1));
  });

  it('gives every rank a distinct character sprite and name', () => {
    expect(new Set(MERGE_CHARACTERS.map((c) => c.characterSprite)).size).toBe(MERGE_CHARACTERS.length);
    expect(new Set(MERGE_CHARACTERS.map((c) => c.name)).size).toBe(MERGE_CHARACTERS.length);
  });

  it('gives every rank its own attack type, so no two ranks look the same', () => {
    const types = MERGE_CHARACTERS.map((c) => c.attackType);
    expect(new Set(types).size).toBe(types.length);
  });

  it('keeps the tile view (RANKS) in step with the roster', () => {
    expect(RANKS).toHaveLength(BOARD.maxRank + 1); // index 0 is the unused placeholder
    for (const c of MERGE_CHARACTERS) {
      expect(rankName(c.rank)).toBe(c.name);
      expect(RANKS[c.rank].character).toBe(c.characterSprite);
    }
  });

  it('clamps out-of-range ranks instead of throwing', () => {
    expect(mergeCharacter(0).rank).toBe(1);
    expect(mergeCharacter(99).rank).toBe(BOARD.maxRank);
  });
});

describe('techniques', () => {
  it('defines a technique for every attack type in the roster', () => {
    for (const c of MERGE_CHARACTERS) {
      const spec = techniqueFor(c.rank);
      expect(spec, `rank ${c.rank}`).toBeDefined();
      expect(spec.hits.length, `rank ${c.rank} has no strike`).toBeGreaterThan(0);
    }
  });

  it('only references effect sheets that are actually loaded', () => {
    for (const { key, where } of allVfx()) {
      expect(textureKeys.has(key), `${where} -> unknown texture ${key}`).toBe(true);
    }
  });

  it('only references declared sound keys', () => {
    for (const [type, spec] of Object.entries(TECHNIQUES)) {
      for (const [beat, key] of Object.entries(spec.sfx)) {
        if (key) expect(sfxKeys.has(key), `${type}.sfx.${beat} -> unknown sound ${key}`).toBe(true);
      }
    }
  });

  it('never uses bomb or explosion visuals for a character merge', () => {
    // Bombs belong to the bomb special tile, a boss ability or an explicit upgrade - never a merge.
    for (const { key, where } of allVfx()) {
      expect(/explosion|bomb/i.test(key), `${where} uses bomb visuals (${key})`).toBe(false);
    }
  });

  it('gates power by rank without forcing a flat curve', () => {
    // Strength is not monotonic on purpose: rank 8's rapid multi-slash is fast rather than heavy,
    // which is what makes it feel different from rank 7's single heavy katana. What must hold is
    // that early ranks stay light, heavy techniques are reserved for later ranks, and the top rank
    // is the strongest, with all four tiers represented across the roster.
    for (const rank of [1, 2, 3]) expect(techniqueFor(rank).tier, `rank ${rank}`).toBe('light');
    for (const c of MERGE_CHARACTERS) {
      const tier = techniqueFor(c.rank).tier;
      if (tier === 'heavy' || tier === 'ultimate') expect(c.rank, `rank ${c.rank} is ${tier}`).toBeGreaterThanOrEqual(7);
    }
    expect(techniqueFor(BOARD.maxRank).tier).toBe('ultimate');
    expect(new Set(MERGE_CHARACTERS.map((c) => techniqueFor(c.rank).tier)).size).toBe(4);
  });

  it('keeps every technique inside the game-feel budget', () => {
    for (const c of MERGE_CHARACTERS) {
      const spec = techniqueFor(c.rank);
      // Normal ranks stay snappy; the multi-strike and ultimate techniques may run a little longer.
      const limit = spec.tier === 'ultimate' || spec.tier === 'heavy' ? 460 : 400;
      expect(techniqueDuration(spec), `rank ${c.rank} technique too long`).toBeLessThanOrEqual(limit);
    }
  });
});
