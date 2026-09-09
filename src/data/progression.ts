import { PROGRESSION, UPGRADES } from './balance';

/** XP required to advance from `level` to `level + 1`. */
export function xpForLevel(level: number): number {
  return Math.round(PROGRESSION.xpBase * PROGRESSION.xpGrowth ** (level - 1));
}

export type UpgradeId = 'attack' | 'vitality' | 'crit' | 'defense';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  icon: string;
  /** Human readable per-level effect. */
  perLevel: string;
}

export const UPGRADE_DEFS: UpgradeDef[] = [
  { id: 'attack', name: 'Attack Training', description: 'Sharper strikes.', icon: 'icon_AttackUpgrade', perLevel: `+${Math.round(UPGRADES.attackTrainingPerLevel * 100)}% damage` },
  { id: 'vitality', name: 'Vitality', description: 'Tougher body.', icon: 'ui_IconHeart', perLevel: `+${UPGRADES.vitalityPerLevel} max HP` },
  { id: 'crit', name: 'Critical Training', description: 'Find the weak spot.', icon: 'icon_Shuriken', perLevel: `+${Math.round(UPGRADES.critTrainingPerLevel * 100)}% crit chance` },
  { id: 'defense', name: 'Defense Training', description: 'Roll with the blow.', icon: 'icon_Guard', perLevel: `+${UPGRADES.defenseTrainingPerLevel} defense` },
];

/** Gold cost to buy the next level of an upgrade currently at `currentLevel`. */
export function upgradeCost(currentLevel: number): number {
  return Math.round(UPGRADES.baseCost * UPGRADES.costGrowth ** currentLevel);
}
