import { MERGE_CHARACTERS } from './mergeCharacters';

/**
 * Merge-tile ranks. Rank N conceptually equals 2^N in classic 2048, but players see ninja forms.
 *
 * The roster itself (name, sprite, colours, and the technique each rank performs) lives in
 * data/mergeCharacters.ts; this stays as the small view-facing shape the tiles and HUD use.
 */
export interface RankDef {
  rank: number;
  name: string;
  /** Folder name under public/assets/characters (see assets.ts). */
  character: string;
  /** Tile background colour. Chosen so adjacent ranks are distinguishable, plus the badge number. */
  color: number;
  /** Border / accent colour. */
  accent: number;
}

export const RANKS: readonly RankDef[] = [
  { rank: 0, name: '', character: '', color: 0x000000, accent: 0x000000 }, // unused
  ...MERGE_CHARACTERS.map((c) => ({ rank: c.rank, name: c.name, character: c.characterSprite, color: c.color, accent: c.accent })),
];

export function rankName(rank: number): string {
  return RANKS[Math.min(Math.max(rank, 1), RANKS.length - 1)]?.name ?? '???';
}

/** Classic 2048 value for a rank, shown as the small indicator on tiles. */
export function rankValue(rank: number): number {
  return 2 ** rank;
}
