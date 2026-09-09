import type { EnemyDef } from '../types';

/**
 * Enemy archetypes. Stage difficulty scaling (balance.ENEMY_SCALING) is applied on top of these base numbers.
 * `sprite` is a texture key defined in assets.ts. Monster sheets are 16x16, 4 columns (down/up/left/right)
 * x 4 rows (frames); the facing-down walk cycle is frames [0, 4, 8, 12].
 */
const DOWN = [0, 4, 8, 12];

export const ENEMIES: Record<string, EnemyDef> = {
  slime: {
    id: 'slime', name: 'Slime', sprite: 'enemy_Slime', idleFrames: DOWN, scale: 8,
    maxHp: 30, attack: 6, attackInterval: 3, defense: 0, xpReward: 30, goldReward: 15,
    possibleDrops: [{ itemId: 'rusty_katana', chance: 0.08 }],
  },
  bamboo: {
    id: 'bamboo', name: 'Bamboo Sprout', sprite: 'enemy_Bamboo', idleFrames: DOWN, scale: 8,
    maxHp: 36, attack: 7, attackInterval: 3, defense: 0, xpReward: 32, goldReward: 16,
    possibleDrops: [{ itemId: 'cloth_armor', chance: 0.08 }],
  },
  bat: {
    id: 'bat', name: 'Cave Bat', sprite: 'enemy_BlueBat', idleFrames: DOWN, scale: 8,
    maxHp: 28, attack: 8, attackInterval: 2, defense: 0, xpReward: 34, goldReward: 17,
    possibleDrops: [{ itemId: 'lucky_charm', chance: 0.05 }],
  },
  mushroom: {
    id: 'mushroom', name: 'Spore Cap', sprite: 'enemy_Mushroom', idleFrames: DOWN, scale: 8,
    maxHp: 44, attack: 8, attackInterval: 4, defense: 1, xpReward: 36, goldReward: 18,
    possibleDrops: [{ itemId: 'cloth_armor', chance: 0.1 }],
  },
  goblin: {
    id: 'goblin', name: 'Kappa Goblin', sprite: 'enemy_KappaGreen', idleFrames: DOWN, scale: 8,
    maxHp: 48, attack: 10, attackInterval: 3, defense: 1, xpReward: 40, goldReward: 22,
    possibleDrops: [{ itemId: 'iron_katana', chance: 0.06 }, { itemId: 'ninja_scroll', chance: 0.04 }],
  },
  snake: {
    id: 'snake', name: 'Viper', sprite: 'enemy_Snake', idleFrames: DOWN, scale: 8,
    maxHp: 40, attack: 11, attackInterval: 3, defense: 0, xpReward: 38, goldReward: 20,
    possibleDrops: [{ itemId: 'lucky_charm', chance: 0.06 }],
  },
  skeleton: {
    id: 'skeleton', name: 'Skeleton', sprite: 'enemy_Skeleton', idleFrames: DOWN, scale: 8,
    maxHp: 55, attack: 12, attackInterval: 3, defense: 2, xpReward: 44, goldReward: 24,
    possibleDrops: [{ itemId: 'iron_katana', chance: 0.08 }],
  },
  skull: {
    id: 'skull', name: 'Cursed Skull', sprite: 'enemy_Skull', idleFrames: DOWN, scale: 8,
    maxHp: 50, attack: 12, attackInterval: 2, defense: 1, xpReward: 42, goldReward: 22,
    possibleDrops: [{ itemId: 'ninja_scroll', chance: 0.05 }],
  },
  larva: {
    id: 'larva', name: 'Grub', sprite: 'enemy_Larva', idleFrames: DOWN, scale: 8,
    maxHp: 60, attack: 9, attackInterval: 4, defense: 2, xpReward: 40, goldReward: 20,
    possibleDrops: [{ itemId: 'samurai_armor', chance: 0.04 }],
  },
  spirit: {
    id: 'spirit', name: 'Wisp', sprite: 'enemy_Spirit', idleFrames: DOWN, scale: 8,
    maxHp: 45, attack: 14, attackInterval: 3, defense: 0, xpReward: 46, goldReward: 24,
    possibleDrops: [{ itemId: 'ninja_scroll', chance: 0.06 }],
  },
  mole: {
    id: 'mole', name: 'Tunnel Mole', sprite: 'enemy_Mole', idleFrames: DOWN, scale: 8,
    maxHp: 65, attack: 11, attackInterval: 3, defense: 3, xpReward: 44, goldReward: 24,
    possibleDrops: [{ itemId: 'samurai_armor', chance: 0.05 }],
  },
  bear: {
    id: 'bear', name: 'Mountain Bear', sprite: 'enemy_Bear', idleFrames: DOWN, scale: 8,
    maxHp: 80, attack: 15, attackInterval: 4, defense: 2, xpReward: 50, goldReward: 28,
    possibleDrops: [{ itemId: 'samurai_armor', chance: 0.06 }],
  },
  owl: {
    id: 'owl', name: 'Night Owl', sprite: 'enemy_Owl', idleFrames: DOWN, scale: 8,
    maxHp: 55, attack: 14, attackInterval: 2, defense: 1, xpReward: 48, goldReward: 26,
    possibleDrops: [{ itemId: 'lucky_charm', chance: 0.08 }],
  },
  racoon: {
    id: 'racoon', name: 'Bandit Racoon', sprite: 'enemy_Racoon', idleFrames: DOWN, scale: 8,
    maxHp: 60, attack: 13, attackInterval: 3, defense: 2, xpReward: 48, goldReward: 34,
    possibleDrops: [{ itemId: 'shadow_blade', chance: 0.03 }],
  },
  eye: {
    id: 'eye', name: 'Watcher', sprite: 'enemy_Eye', idleFrames: DOWN, scale: 8,
    maxHp: 58, attack: 16, attackInterval: 3, defense: 1, xpReward: 50, goldReward: 28,
    possibleDrops: [{ itemId: 'ninja_scroll', chance: 0.06 }],
  },
  cyclope: {
    id: 'cyclope', name: 'Cyclops', sprite: 'enemy_Cyclope', idleFrames: DOWN, scale: 8,
    maxHp: 95, attack: 18, attackInterval: 4, defense: 3, xpReward: 56, goldReward: 32,
    possibleDrops: [{ itemId: 'shadow_armor', chance: 0.03 }],
  },
  lizard: {
    id: 'lizard', name: 'Sand Lizard', sprite: 'enemy_Lizard', idleFrames: DOWN, scale: 8,
    maxHp: 70, attack: 16, attackInterval: 3, defense: 2, xpReward: 52, goldReward: 30,
    possibleDrops: [{ itemId: 'shadow_blade', chance: 0.04 }],
  },
  reptile: {
    id: 'reptile', name: 'Dune Reptile', sprite: 'enemy_Reptile', idleFrames: DOWN, scale: 8,
    maxHp: 85, attack: 17, attackInterval: 3, defense: 3, xpReward: 54, goldReward: 30,
    possibleDrops: [{ itemId: 'shadow_armor', chance: 0.04 }],
  },
  spider: {
    id: 'spider', name: 'Red Spider', sprite: 'enemy_SpiderRed', idleFrames: DOWN, scale: 8,
    maxHp: 66, attack: 19, attackInterval: 2, defense: 1, xpReward: 54, goldReward: 30,
    possibleDrops: [{ itemId: 'lucky_charm', chance: 0.08 }],
  },
  yellowbat: {
    id: 'yellowbat', name: 'Frost Bat', sprite: 'enemy_YellowsBat', idleFrames: DOWN, scale: 8,
    maxHp: 70, attack: 18, attackInterval: 2, defense: 2, xpReward: 58, goldReward: 32,
    possibleDrops: [{ itemId: 'ninja_scroll', chance: 0.06 }],
  },
  beast: {
    id: 'beast', name: 'Snow Beast', sprite: 'enemy_Beast', idleFrames: DOWN, scale: 8,
    maxHp: 110, attack: 22, attackInterval: 4, defense: 4, xpReward: 64, goldReward: 36,
    possibleDrops: [{ itemId: 'shadow_armor', chance: 0.05 }],
  },
  mouse: {
    id: 'mouse', name: 'Ice Rat', sprite: 'enemy_Mouse', idleFrames: DOWN, scale: 8,
    maxHp: 60, attack: 17, attackInterval: 2, defense: 2, xpReward: 56, goldReward: 34,
    possibleDrops: [{ itemId: 'lucky_charm', chance: 0.08 }],
  },
  mage: {
    id: 'mage', name: 'Frost Mage', sprite: 'enemy_SorcererBlack', idleFrames: DOWN, scale: 8,
    maxHp: 80, attack: 24, attackInterval: 3, defense: 2, xpReward: 66, goldReward: 40,
    possibleDrops: [{ itemId: 'dragon_amulet', chance: 0.02 }, { itemId: 'ninja_scroll', chance: 0.1 }],
  },
  skeleton_demon: {
    id: 'skeleton_demon', name: 'Demon Skeleton', sprite: 'enemy_SkeletonDemon', idleFrames: DOWN, scale: 8,
    maxHp: 120, attack: 24, attackInterval: 3, defense: 4, xpReward: 72, goldReward: 44,
    possibleDrops: [{ itemId: 'shadow_blade', chance: 0.06 }],
  },
  demon: {
    id: 'demon', name: 'Red Demon', sprite: 'enemy_DemonRed', idleFrames: DOWN, scale: 8,
    maxHp: 140, attack: 26, attackInterval: 3, defense: 4, xpReward: 76, goldReward: 46,
    possibleDrops: [{ itemId: 'dragon_armor', chance: 0.02 }],
  },
  samurai: {
    id: 'samurai', name: 'Rogue Samurai', sprite: 'enemy_SamuraiRed', idleFrames: DOWN, scale: 8,
    maxHp: 130, attack: 28, attackInterval: 3, defense: 5, xpReward: 78, goldReward: 48,
    possibleDrops: [{ itemId: 'dragon_katana', chance: 0.02 }],
  },
  dark_ninja: {
    id: 'dark_ninja', name: 'Dark Ninja', sprite: 'enemy_NinjaDark', idleFrames: DOWN, scale: 8,
    maxHp: 110, attack: 30, attackInterval: 2, defense: 3, xpReward: 80, goldReward: 50,
    possibleDrops: [{ itemId: 'dragon_amulet', chance: 0.03 }],
  },
  master: {
    id: 'master', name: 'Fallen Master', sprite: 'enemy_Master', idleFrames: DOWN, scale: 8,
    maxHp: 150, attack: 30, attackInterval: 3, defense: 5, xpReward: 84, goldReward: 52,
    possibleDrops: [{ itemId: 'dragon_katana', chance: 0.03 }],
  },
};

export function getEnemyDef(id: string): EnemyDef {
  const def = ENEMIES[id];
  if (!def) throw new Error(`Unknown enemy: ${id}`);
  return def;
}
