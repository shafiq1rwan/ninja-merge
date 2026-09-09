/**
 * Merge-tile ranks. Rank N conceptually equals 2^N in classic 2048 but players see ninja forms, not numbers.
 * `character` is the folder name under public/assets/characters (see assets.ts).
 */
export interface RankDef {
  rank: number;
  name: string;
  character: string;
  /** Tile background colour (hex). Chosen so adjacent ranks are distinguishable, plus the badge number. */
  color: number;
  /** Border / accent colour. */
  accent: number;
}

export const RANKS: readonly RankDef[] = [
  { rank: 0, name: '', character: '', color: 0x000000, accent: 0x000000 }, // unused
  { rank: 1, name: 'Novice', character: 'NinjaGray', color: 0x6e6a63, accent: 0x9a958c },
  { rank: 2, name: 'Apprentice', character: 'NinjaGreen', color: 0x4f7a3a, accent: 0x86b56a },
  { rank: 3, name: 'Ninja', character: 'NinjaBlue', color: 0x2f5f9e, accent: 0x6fa1e0 },
  { rank: 4, name: 'Veteran Ninja', character: 'NinjaRed', color: 0xa23b32, accent: 0xe07a6f },
  { rank: 5, name: 'Elite Ninja', character: 'NinjaYellow', color: 0xb8892b, accent: 0xf2c65a },
  { rank: 6, name: 'Samurai', character: 'Samurai', color: 0x7c3d8f, accent: 0xb97cc9 },
  { rank: 7, name: 'Ninja Master', character: 'NinjaMasked', color: 0x2a8a80, accent: 0x6fd1c6 },
  { rank: 8, name: 'Shadow Master', character: 'NinjaDark', color: 0x2c2440, accent: 0x7b6aa8 },
  { rank: 9, name: 'Legendary Ninja', character: 'NinjaThunder', color: 0x1f5fa8, accent: 0xa7d4ff },
  { rank: 10, name: 'Shinobi Lord', character: 'NinjaFire', color: 0xc44a13, accent: 0xffa64d },
  { rank: 11, name: 'Dragon Shinobi', character: 'NinjaMageBlack', color: 0x8f1f1f, accent: 0xffd700 },
];

export function rankName(rank: number): string {
  return RANKS[Math.min(Math.max(rank, 1), RANKS.length - 1)]?.name ?? '???';
}

/** Classic 2048 value for a rank, shown as the small indicator on tiles. */
export function rankValue(rank: number): number {
  return 2 ** rank;
}
