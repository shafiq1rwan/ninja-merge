/**
 * Every tunable number in one place. Scenes and systems must read from here, never hardcode.
 */

export const BOARD = {
  size: 4,
  maxRank: 11,
  /** Probability table for freshly spawned ninja tiles (must sum to 1). */
  spawnRanks: [
    { rank: 1, weight: 0.9 },
    { rank: 2, weight: 0.1 },
  ],
  /** Special tile spawn chances (rolled before the ninja rank roll). */
  potionSpawnChance: 0.05,
  bombSpawnChance: 0.02,
  /** Never have more than this many of a special kind on the board at once. */
  maxPotionsOnBoard: 1,
  maxBombsOnBoard: 1,
  /** Bomb clears the 8 surrounding cells when true, only 4 orthogonal when false. */
  bombDiagonals: true,
  /** Damage dealt to the enemy per ninja tile destroyed by a bomb. */
  bombDamagePerTile: 6,
  /** Potion heal as a fraction of max HP. */
  potionHealPercent: 0.3,
  /** Board-blocked penalty. */
  blockedPenaltyHpPercent: 0.25,
  /** Minimum number of low-rank tiles cleared when the board is blocked. */
  blockedPenaltyClearMin: 6,
} as const;

/** Damage per merge, indexed by the RESULTING rank (index 0 and 1 unused). */
export const DAMAGE_TABLE: readonly number[] = [0, 0, 4, 8, 14, 24, 40, 65, 100, 150, 225, 350];

export const COMBAT = {
  /** Combo multiplier by number of merges in a single swipe (index = merges; last entry applies to 4+). */
  comboMultipliers: [1, 1, 1.15, 1.3, 1.5],
  baseCritChance: 0.05,
  critMultiplier: 1.5,
  /** Minimum damage dealt by any successful hit after defense. */
  minDamage: 1,
  /** Fraction of enemy damage blocked per point of player defense... no - defense is flat. Kept for clarity. */
  defenseIsFlat: true,
} as const;

export const PLAYER_BASE = {
  maxHp: 100,
  attackMult: 1.0,
  defense: 0,
  critChance: COMBAT.baseCritChance,
  critMult: COMBAT.critMultiplier,
} as const;

/** How enemy stats scale with the stage `level` (1 = first forest stage). */
export const ENEMY_SCALING = {
  hpPerLevel: 0.3, // hp = base * (1 + 0.3 * (level - 1))
  attackPerLevel: 0.15,
  rewardPerLevel: 0.25,
  /** Random +/- variance applied to gold rewards. */
  goldVariance: 0.2,
  /** Boss reward multipliers on top of their own base values. */
  bossXpMult: 2.0,
  bossGoldMult: 2.5,
} as const;

export const PROGRESSION = {
  /** XP needed to go from level L to L+1 = round(base * growth^(L-1)). */
  xpBase: 100,
  xpGrowth: 1.4,
  /** Per player level gained. */
  hpPerLevel: 10,
  attackPerLevel: 0.02,
  /** A skill point every N levels (spent in Upgrade Ninja as a free training level). */
  skillPointEveryLevels: 3,
  maxLevel: 60,
} as const;

export const UPGRADES = {
  /** cost(level) = baseCost * growth^level  (level = current upgrade level, starting at 0). */
  baseCost: 100,
  costGrowth: 2,
  maxLevel: 20,
  attackTrainingPerLevel: 0.05, // +5% damage
  vitalityPerLevel: 10, // +10 max HP
  critTrainingPerLevel: 0.01, // +1% crit
  defenseTrainingPerLevel: 1, // +1 defense
} as const;

export const ECONOMY = {
  /** Sell price as a fraction of shop price. */
  sellRatio: 0.4,
  inventoryMax: 20,
  rarityPriceMult: { common: 1, rare: 2.2, epic: 5, legendary: 12 } as Record<string, number>,
} as const;

/** Roguelite dungeon runs (see systems/RunSystem.ts). Difficulty only shifts the stage level fed to ENEMY_SCALING. */
export const RUN = {
  waves: 10,
  /** Offer a run-only upgrade after clearing these waves. */
  upgradeAfter: [3, 6, 8],
  /** Elite waves: a normal enemy with a level bonus and an ELITE tag. */
  eliteWaves: [5, 8],
  eliteLevelBonus: 2,
  /** Normal enemy level rises by one every N waves inside a dungeon. */
  wavesPerLevel: 2,
  /** Level offset per difficulty. */
  difficultyLevelOffset: { normal: 0, hard: 4, nightmare: 8 } as Record<string, number>,
  /** Run-only upgrade choices offered at once. */
  upgradeChoices: 3,
} as const;

export const ANIM = {
  slideMs: 110,
  mergePulseMs: 140,
  spawnMs: 120,
  damageNumberMs: 800,
  enemyAttackMs: 380,
  swipeThresholdPx: 48, // logical pixels
} as const;
