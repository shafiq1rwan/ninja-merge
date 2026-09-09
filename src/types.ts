/** Shared domain types. Keep these free of Phaser so systems stay testable in Node. */

export type Direction = 'up' | 'down' | 'left' | 'right';

export type TileKind = 'ninja' | 'potion' | 'bomb' | 'blocked';

export interface Tile {
  id: number;
  kind: TileKind;
  /** Ninja rank 1..11. For special tiles rank is 0. */
  rank: number;
  row: number;
  col: number;
  /** Remaining moves for temporary tiles (blocked). */
  ttl?: number;
}

export interface TileMove {
  id: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
}

export interface MergeEvent {
  row: number;
  col: number;
  /** Resulting rank. */
  rank: number;
  fromIds: [number, number];
  resultId: number;
}

export interface ActivationEvent {
  kind: 'potion' | 'bomb';
  id: number;
  row: number;
  col: number;
  /** Tiles destroyed (bomb only). */
  destroyed: Tile[];
}

export interface MoveResult {
  moved: boolean;
  moves: TileMove[];
  merges: MergeEvent[];
  activations: ActivationEvent[];
  /** Blocked tiles whose ttl ran out this move. */
  expired: Tile[];
  spawned: Tile | null;
}

export type EquipSlot = 'weapon' | 'armor' | 'accessory';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ItemStats {
  attack?: number; // percent bonus to damage
  hp?: number; // flat max HP
  defense?: number; // flat damage reduction
  crit?: number; // percent points
  goldBonus?: number; // percent
  xpBonus?: number; // percent
}

export interface ItemDef {
  id: string;
  name: string;
  slot: EquipSlot;
  rarity: Rarity;
  icon: string; // texture key from assets
  stats: ItemStats;
  price: number; // shop price in gold
  description: string;
}

export type BossAbility =
  | { type: 'boardLock'; everyAttacks: number; ttl: number }
  | { type: 'poison'; everyAttacks: number; turns: number; damage: number }
  | { type: 'curse'; chance: number; ttl: number }
  | { type: 'shield'; everyAttacks: number; turns: number; reduction: number }
  | { type: 'rage'; hpThreshold: number; interval: number };

export interface DropDef {
  itemId: string;
  chance: number; // 0..1
}

export interface EnemyDef {
  id: string;
  name: string;
  /** Texture key (see assets.ts). */
  sprite: string;
  /** Frame indices for the idle animation. */
  idleFrames?: number[];
  /** Optional separate hit texture key (bosses). */
  hitSprite?: string;
  /** Render scale relative to source pixels. */
  scale: number;
  maxHp: number;
  attack: number;
  attackInterval: number;
  defense: number;
  xpReward: number;
  goldReward: number;
  possibleDrops: DropDef[];
  isBoss?: boolean;
  /** Where attack effects land, relative to the enemy's feet position. Defaults to the torso. */
  impactOffsetX?: number;
  impactOffsetY?: number;
  /** Effect size multiplier. Defaults by sprite size (bosses get slightly larger effects). */
  impactScale?: number;
  abilities?: BossAbility[];
  /** Music key override (bosses). */
  music?: string;
}

export interface StageDef {
  id: string;
  name: string;
  regionId: string;
  index: number; // 0..5
  enemyId: string;
  /** Difficulty level used by balance.enemyScaling. */
  level: number;
  isBoss: boolean;
}

export interface RegionDef {
  id: string;
  name: string;
  subtitle: string;
  /** Background palette + decor set key used by scene backgrounds. */
  theme: 'forest' | 'cave' | 'mountain' | 'desert' | 'snow' | 'castle';
  music: string;
  stages: StageDef[];
}

export interface PlayerStats {
  maxHp: number;
  attackMult: number;
  defense: number;
  critChance: number; // 0..1
  critMult: number;
  goldBonus: number; // 0..1
  xpBonus: number; // 0..1
}
