import type { ItemDef, Rarity } from '../types';

export const RARITY_COLORS: Record<Rarity, number> = {
  common: 0xbfb9ae,
  rare: 0x5aa7ff,
  epic: 0xc06cff,
  legendary: 0xffb833,
};

export const RARITY_LABEL: Record<Rarity, string> = {
  common: 'Common',
  rare: 'Rare',
  epic: 'Epic',
  legendary: 'Legendary',
};

export const ITEMS: Record<string, ItemDef> = {
  // Weapons
  rusty_katana: {
    id: 'rusty_katana', name: 'Rusty Katana', slot: 'weapon', rarity: 'common', icon: 'item_Sword',
    stats: { attack: 8 }, price: 120, description: 'Dull, but it still cuts.',
  },
  iron_katana: {
    id: 'iron_katana', name: 'Iron Katana', slot: 'weapon', rarity: 'rare', icon: 'item_Katana',
    stats: { attack: 18, crit: 2 }, price: 400, description: 'Forged in the village smithy.',
  },
  shadow_blade: {
    id: 'shadow_blade', name: 'Shadow Blade', slot: 'weapon', rarity: 'epic', icon: 'item_Sai',
    stats: { attack: 32, crit: 5 }, price: 1200, description: 'Strikes before it is seen.',
  },
  dragon_katana: {
    id: 'dragon_katana', name: 'Dragon Katana', slot: 'weapon', rarity: 'legendary', icon: 'item_BigSword',
    stats: { attack: 55, crit: 8, xpBonus: 10 }, price: 4000, description: 'A blade that remembers fire.',
  },
  // Armor
  cloth_armor: {
    id: 'cloth_armor', name: 'Cloth Armor', slot: 'armor', rarity: 'common', icon: 'icon_Armor',
    stats: { hp: 20, defense: 1 }, price: 120, description: 'Light and quiet.',
  },
  samurai_armor: {
    id: 'samurai_armor', name: 'Samurai Armor', slot: 'armor', rarity: 'rare', icon: 'icon_Guard',
    stats: { hp: 45, defense: 3 }, price: 450, description: 'Lacquered plates of a fallen warrior.',
  },
  shadow_armor: {
    id: 'shadow_armor', name: 'Shadow Armor', slot: 'armor', rarity: 'epic', icon: 'icon_Helmet',
    stats: { hp: 80, defense: 5, crit: 3 }, price: 1300, description: 'Woven from moonless nights.',
  },
  dragon_armor: {
    id: 'dragon_armor', name: 'Dragon Armor', slot: 'armor', rarity: 'legendary', icon: 'icon_Armor',
    stats: { hp: 150, defense: 9, attack: 10 }, price: 4200, description: 'Scales that laugh at steel.',
  },
  // Accessories
  lucky_charm: {
    id: 'lucky_charm', name: 'Lucky Charm', slot: 'accessory', rarity: 'common', icon: 'icon_Ring',
    stats: { goldBonus: 15, crit: 1 }, price: 150, description: 'Coins seem to find you.',
  },
  ninja_scroll: {
    id: 'ninja_scroll', name: 'Ninja Scroll', slot: 'accessory', rarity: 'rare', icon: 'icon_Scroll',
    stats: { xpBonus: 20, attack: 5 }, price: 500, description: 'Secret techniques, mostly legible.',
  },
  dragon_amulet: {
    id: 'dragon_amulet', name: 'Dragon Amulet', slot: 'accessory', rarity: 'legendary', icon: 'icon_Amulet',
    stats: { attack: 20, hp: 60, crit: 6, goldBonus: 20, xpBonus: 20 }, price: 5000, description: 'Warm to the touch. Always.',
  },
};

/** Items sold in the village shop (in display order). */
export const SHOP_CATALOG: string[] = [
  'rusty_katana', 'cloth_armor', 'lucky_charm', 'iron_katana', 'samurai_armor', 'ninja_scroll', 'shadow_blade', 'shadow_armor',
];

export function getItem(id: string): ItemDef | undefined {
  return ITEMS[id];
}

export function describeStats(item: ItemDef): string[] {
  const s = item.stats;
  const out: string[] = [];
  if (s.attack) out.push(`+${s.attack}% Attack`);
  if (s.hp) out.push(`+${s.hp} HP`);
  if (s.defense) out.push(`+${s.defense} Defense`);
  if (s.crit) out.push(`+${s.crit}% Crit`);
  if (s.goldBonus) out.push(`+${s.goldBonus}% Gold`);
  if (s.xpBonus) out.push(`+${s.xpBonus}% XP`);
  return out;
}
