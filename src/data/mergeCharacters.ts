import type { SfxKey } from './assets';

/**
 * The merge roster: one ninja archetype per tile rank, and the combat technique it performs.
 *
 * This is the single source of truth for "which character is this rank, and what does it do when it
 * merges". Rank-specific attack logic must not be scattered through scenes - scenes ask CombatVFX to
 * play `TECHNIQUES[attackType]` and nothing else.
 *
 * Sprites are real folders under public/assets/characters (Ninja Adventure, CC0). Where the pack has
 * no character matching an archetype exactly, the closest visual match is used and the archetype name
 * stays logical (e.g. rank 4 "Shuriken Ninja" uses the red ninja sprite).
 */
export type AttackType =
  | 'slash'
  | 'slashAlt'
  | 'doubleSlash'
  | 'shuriken'
  | 'fireStrike'
  | 'shadowX'
  | 'heavySlash'
  | 'multiSlash'
  | 'thunderStrike'
  | 'shadowMulti'
  | 'ultimate';

/** Drives hit-stop, recoil and particle budget - not damage, which the battle system owns. */
export type StrengthTier = 'light' | 'medium' | 'heavy' | 'ultimate';

export interface MergeCharacter {
  rank: number;
  /** Displayed name (tile caption, "Board Ninja Rank", rank announcements). */
  name: string;
  /** Logical identity, independent of which sprite file happens to represent it. */
  archetype: string;
  /** Folder under public/assets/characters. */
  characterSprite: string;
  /** Tile fill / border colours, matched to the archetype. */
  color: number;
  accent: number;
  attackType: AttackType;
}

export const MERGE_CHARACTERS: readonly MergeCharacter[] = [
  { rank: 1, name: 'Novice Ninja', archetype: 'Basic Ninja', characterSprite: 'NinjaGray', color: 0x6e6a63, accent: 0x9a958c, attackType: 'slash' },
  { rank: 2, name: 'Apprentice', archetype: 'Apprentice Ninja', characterSprite: 'NinjaGreen', color: 0x4f7a3a, accent: 0x86b56a, attackType: 'slashAlt' },
  { rank: 3, name: 'Assassin', archetype: 'Assassin', characterSprite: 'NinjaBlue', color: 0x2f5f9e, accent: 0x6fa1e0, attackType: 'doubleSlash' },
  { rank: 4, name: 'Shuriken Ninja', archetype: 'Ranged Ninja', characterSprite: 'NinjaRed', color: 0xa23b32, accent: 0xe07a6f, attackType: 'shuriken' },
  { rank: 5, name: 'Fire Ninja', archetype: 'Fire Ninja', characterSprite: 'NinjaFire', color: 0xc44a13, accent: 0xffa64d, attackType: 'fireStrike' },
  { rank: 6, name: 'Shadow Ninja', archetype: 'Shadow Ninja', characterSprite: 'NinjaDark', color: 0x2c2440, accent: 0xb97cc9, attackType: 'shadowX' },
  { rank: 7, name: 'Samurai', archetype: 'Samurai', characterSprite: 'Samurai', color: 0x5a4a6e, accent: 0xc9bde0, attackType: 'heavySlash' },
  { rank: 8, name: 'Ninja Master', archetype: 'Ninja Master', characterSprite: 'Master', color: 0x2a8a80, accent: 0x6fd1c6, attackType: 'multiSlash' },
  { rank: 9, name: 'Thunder Ninja', archetype: 'Thunder Ninja', characterSprite: 'NinjaThunder', color: 0x1f5fa8, accent: 0xa7d4ff, attackType: 'thunderStrike' },
  { rank: 10, name: 'Shinobi Lord', archetype: 'Shinobi Lord', characterSprite: 'NinjaMasked', color: 0x4a2a6e, accent: 0xc9a6ff, attackType: 'shadowMulti' },
  { rank: 11, name: 'Dragon Shinobi', archetype: 'Legendary Shinobi', characterSprite: 'NinjaMageBlack', color: 0x8f1f1f, accent: 0xffd700, attackType: 'ultimate' },
];

/** A single visible strike inside a technique. */
export interface TechniqueHit {
  /** Texture key (see data/assets.ts) whose animation plays on the enemy. */
  vfx: string;
  scale: number;
  /** Degrees; alternating signs read as alternating slash directions. */
  angle?: number;
  flipX?: boolean;
  tint?: number;
  /** Offset from the impact point, in logical pixels. */
  dx?: number;
  dy?: number;
}

export interface TechniqueSpec {
  tier: StrengthTier;
  /** Optional lead-in cue (smoke, apparition) before the strikes. */
  cue?: { vfx: string; scale: number; tint?: number; alpha?: number };
  /** Milliseconds between the technique starting and its first strike landing. */
  leadMs: number;
  /** Ranged opener: spawned beside the enemy inside the combat zone, never from the HUD. */
  projectile?: { vfx: string; travelMs: number; fromDx: number; fromDy: number; scale: number };
  /** The strikes, played in order. */
  hits: TechniqueHit[];
  /** Gap between consecutive strikes. */
  hitGapMs: number;
  /** Heavier closing strike after the rapid hits. */
  finisher?: TechniqueHit;
  finisherGapMs?: number;
  /** Impact motes per strike. */
  particles?: { count: number; color: number; size?: number; speed?: number };
  /** Sounds: `open` at the start, `hit` on each strike, `close` with the finisher. */
  sfx: { open?: SfxKey; hit?: SfxKey; close?: SfxKey };
}

const SLASH_WHITE = 0xffffff;

/**
 * One entry per attack type. Every vfx key here is a real, frame-verified sheet.
 * Total durations stay inside the game-feel budget: ~150-350ms for normal ranks, ~400ms for the
 * multi-strike and ultimate techniques.
 */
export const TECHNIQUES: Record<AttackType, TechniqueSpec> = {
  // Rank 1 - a single clean diagonal cut.
  slash: {
    tier: 'light',
    leadMs: 55,
    hits: [{ vfx: 'fx_Cut', scale: 4.5, angle: 20 }],
    hitGapMs: 0,
    particles: { count: 4, color: SLASH_WHITE, size: 5, speed: 70 },
    sfx: { hit: 'attack' },
  },
  // Rank 2 - the mirrored cut, so rank 1 and 2 read as different swings.
  slashAlt: {
    tier: 'light',
    leadMs: 55,
    hits: [{ vfx: 'fx_Cut', scale: 4.5, angle: -20, flipX: true }],
    hitGapMs: 0,
    particles: { count: 4, color: 0xd8f0b0, size: 5, speed: 70 },
    sfx: { hit: 'attack' },
  },
  // Rank 3 - two fast cuts from opposite angles.
  doubleSlash: {
    tier: 'light',
    leadMs: 50,
    hits: [
      { vfx: 'fx_Cut', scale: 4.4, angle: 25, dx: -10, dy: -6 },
      { vfx: 'fx_Cut', scale: 4.4, angle: -25, flipX: true, dx: 10, dy: 6 },
    ],
    hitGapMs: 65,
    particles: { count: 4, color: 0x9fd0ff, size: 5, speed: 80 },
    sfx: { hit: 'attack', close: 'slashHeavy' },
  },
  // Rank 4 - a shuriken thrown inside the combat zone, landing on the torso.
  shuriken: {
    tier: 'medium',
    leadMs: 120,
    projectile: { vfx: 'fx_ShurikenSpin', travelMs: 110, fromDx: -150, fromDy: -40, scale: 3.5 },
    hits: [{ vfx: 'fx_Cut', scale: 3.6, angle: 60 }],
    hitGapMs: 0,
    particles: { count: 6, color: 0xffe6a8, size: 5, speed: 95 },
    sfx: { open: 'launch', hit: 'impact' },
  },
  // Rank 5 - a compact flame burst, no screen-crossing fireball.
  fireStrike: {
    tier: 'medium',
    leadMs: 60,
    hits: [
      { vfx: 'fx_Flam', scale: 5, dx: -14, dy: 4 },
      { vfx: 'fx_Flam', scale: 4.2, dx: 16, dy: -10 },
    ],
    hitGapMs: 70,
    particles: { count: 6, color: 0xffa64d, size: 6, speed: 90 },
    sfx: { open: 'fire', hit: 'impact' },
  },
  // Rank 6 - smoke cue, then a dark X-slash.
  shadowX: {
    tier: 'medium',
    cue: { vfx: 'fx_Smoke', scale: 5, tint: 0x2c2440, alpha: 0.85 },
    leadMs: 90,
    hits: [{ vfx: 'fx_CutX', scale: 5.5, tint: 0xc9a6ff }],
    hitGapMs: 0,
    particles: { count: 6, color: 0xb97cc9, size: 6, speed: 85 },
    sfx: { open: 'stealth', hit: 'crit' },
  },
  // Rank 7 - one heavy katana arc. Reads weighty via hit-stop, not duration.
  heavySlash: {
    tier: 'heavy',
    leadMs: 70,
    hits: [{ vfx: 'fx_SlashBig', scale: 3, angle: 12 }],
    hitGapMs: 0,
    particles: { count: 8, color: 0xe8eef7, size: 7, speed: 110 },
    sfx: { open: 'slashHeavy', hit: 'impact' },
  },
  // Rank 8 - four rapid cuts, all inside ~280ms.
  multiSlash: {
    tier: 'medium',
    leadMs: 45,
    hits: [
      { vfx: 'fx_SlashQuick', scale: 4, angle: 20, dx: -18, dy: -14 },
      { vfx: 'fx_SlashQuick', scale: 4, angle: -20, flipX: true, dx: 16, dy: -2 },
      { vfx: 'fx_SlashQuick', scale: 4, angle: 35, dx: -8, dy: 14 },
      { vfx: 'fx_SlashQuick', scale: 4.2, angle: -40, flipX: true, dx: 14, dy: 18 },
    ],
    hitGapMs: 55,
    particles: { count: 3, color: 0x9fe8df, size: 5, speed: 70 },
    sfx: { hit: 'attack' },
  },
  // Rank 9 - a bolt striking down onto the enemy, twice.
  thunderStrike: {
    tier: 'heavy',
    leadMs: 60,
    hits: [
      { vfx: 'fx_Thunder', scale: 5.5, dy: -10 },
      { vfx: 'fx_Thunder', scale: 4.5, dx: 22, dy: 6 },
    ],
    hitGapMs: 65,
    particles: { count: 7, color: 0xa7d4ff, size: 6, speed: 105 },
    sfx: { open: 'energy', hit: 'impact' },
  },
  // Rank 10 - shadow cue, a rapid cluster, then a curved finisher.
  shadowMulti: {
    tier: 'heavy',
    cue: { vfx: 'fx_Smoke', scale: 5.5, tint: 0x2c2440, alpha: 0.9 },
    leadMs: 85,
    hits: [
      { vfx: 'fx_SlashQuick', scale: 4, angle: 25, tint: 0xc9a6ff, dx: -20, dy: -12 },
      { vfx: 'fx_SlashQuick', scale: 4, angle: -25, tint: 0xc9a6ff, flipX: true, dx: 18, dy: 0 },
      { vfx: 'fx_SlashQuick', scale: 4, angle: 40, tint: 0xc9a6ff, dx: -6, dy: 16 },
    ],
    hitGapMs: 50,
    finisher: { vfx: 'fx_SlashDoubleCurved', scale: 5.5, tint: 0xd8bcff },
    finisherGapMs: 70,
    particles: { count: 5, color: 0xc9a6ff, size: 6, speed: 95 },
    sfx: { open: 'stealth', hit: 'attack', close: 'crit' },
  },
  // Rank 11 - apparition, a circular slash and a heavy closing cut.
  ultimate: {
    tier: 'ultimate',
    cue: { vfx: 'fx_Spirit', scale: 5.5, tint: 0xffd700, alpha: 0.9 },
    leadMs: 100,
    hits: [{ vfx: 'fx_SlashCircular', scale: 3.4 }],
    hitGapMs: 0,
    finisher: { vfx: 'fx_SlashHeavy', scale: 3.6, tint: 0xffe9a8 },
    finisherGapMs: 110,
    particles: { count: 10, color: 0xffd700, size: 7, speed: 130 },
    sfx: { open: 'energy', hit: 'slashHeavy', close: 'crit' },
  },
};

export function mergeCharacter(rank: number): MergeCharacter {
  const clamped = Math.min(Math.max(rank, 1), MERGE_CHARACTERS.length);
  return MERGE_CHARACTERS[clamped - 1];
}

export function techniqueFor(rank: number): TechniqueSpec {
  return TECHNIQUES[mergeCharacter(rank).attackType];
}

/** Total time a technique occupies, used for combo pacing. */
export function techniqueDuration(spec: TechniqueSpec): number {
  const strikes = spec.leadMs + Math.max(0, spec.hits.length - 1) * spec.hitGapMs;
  return strikes + (spec.finisher ? (spec.finisherGapMs ?? 80) : 0) + 120;
}
