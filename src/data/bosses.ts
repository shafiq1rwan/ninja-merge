import type { EnemyDef } from '../types';

/**
 * Region bosses. Each introduces ONE headline mechanic; later bosses may combine two.
 * Boss sheets are horizontal strips (see assets.ts for frame sizes).
 */
export const BOSSES: Record<string, EnemyDef> = {
  bamboo_titan: {
    id: 'bamboo_titan', name: 'Bamboo Titan', sprite: 'boss_GiantBamboo_idle', hitSprite: 'boss_GiantBamboo_hit',
    scale: 4, isBoss: true, music: 'music_boss',
    maxHp: 140, attack: 10, attackInterval: 4, defense: 1, xpReward: 90, goldReward: 45,
    possibleDrops: [{ itemId: 'iron_katana', chance: 0.5 }, { itemId: 'cloth_armor', chance: 0.5 }],
    // Forest boss mechanic: Board Lock - every 2nd attack it roots one empty square for 3 moves.
    abilities: [{ type: 'boardLock', everyAttacks: 2, ttl: 3 }],
  },
  slime_king: {
    id: 'slime_king', name: 'Slime King', sprite: 'boss_GiantSlime_idle', hitSprite: 'boss_GiantSlime_hit',
    scale: 4, isBoss: true, music: 'music_boss',
    maxHp: 170, attack: 12, attackInterval: 4, defense: 2, xpReward: 110, goldReward: 55,
    possibleDrops: [{ itemId: 'samurai_armor', chance: 0.5 }, { itemId: 'lucky_charm', chance: 0.5 }],
    abilities: [{ type: 'poison', everyAttacks: 2, turns: 4, damage: 3 }],
  },
  racoon_chief: {
    id: 'racoon_chief', name: 'Racoon Chieftain', sprite: 'boss_GiantRacoon_idle',
    scale: 4, isBoss: true, music: 'music_boss',
    maxHp: 190, attack: 14, attackInterval: 3, defense: 3, xpReward: 130, goldReward: 80,
    possibleDrops: [{ itemId: 'shadow_blade', chance: 0.5 }, { itemId: 'ninja_scroll', chance: 0.6 }],
    abilities: [{ type: 'shield', everyAttacks: 2, turns: 3, reduction: 0.5 }],
  },
  tengu: {
    id: 'tengu', name: 'Desert Tengu', sprite: 'boss_TenguRed_idle', hitSprite: 'boss_TenguRed_hit',
    scale: 3, isBoss: true, music: 'music_boss',
    maxHp: 210, attack: 15, attackInterval: 3, defense: 3, xpReward: 150, goldReward: 90,
    possibleDrops: [{ itemId: 'shadow_armor', chance: 0.5 }, { itemId: 'dragon_amulet', chance: 0.15 }],
    abilities: [{ type: 'curse', chance: 0.15, ttl: 4 }, { type: 'boardLock', everyAttacks: 3, ttl: 3 }],
  },
  frost_spirit: {
    id: 'frost_spirit', name: 'Frost Spirit', sprite: 'boss_GiantSpirit_idle', hitSprite: 'boss_GiantSpirit_hit',
    scale: 5, isBoss: true, music: 'music_boss',
    maxHp: 240, attack: 16, attackInterval: 3, defense: 4, xpReward: 170, goldReward: 100,
    possibleDrops: [{ itemId: 'dragon_amulet', chance: 0.4 }, { itemId: 'shadow_blade', chance: 0.5 }],
    abilities: [{ type: 'poison', everyAttacks: 2, turns: 4, damage: 4 }, { type: 'shield', everyAttacks: 3, turns: 2, reduction: 0.4 }],
  },
  demon_lord: {
    id: 'demon_lord', name: 'Demon Lord', sprite: 'boss_DemonCyclop_idle', hitSprite: 'boss_DemonCyclop_hit',
    scale: 5, isBoss: true, music: 'music_boss',
    maxHp: 300, attack: 18, attackInterval: 3, defense: 5, xpReward: 220, goldReward: 140,
    possibleDrops: [{ itemId: 'dragon_katana', chance: 0.6 }, { itemId: 'dragon_armor', chance: 0.6 }],
    abilities: [{ type: 'rage', hpThreshold: 0.3, interval: 2 }, { type: 'curse', chance: 0.12, ttl: 3 }],
  },
};
