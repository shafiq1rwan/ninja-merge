import { PLAYER_BASE, PROGRESSION, UPGRADES } from '../data/balance';
import { upgradeCost, xpForLevel, type UpgradeId } from '../data/progression';
import { ALL_STAGES, getStage, nextStage } from '../data/stages';
import type { PlayerStats } from '../types';
import { equipment } from './EquipmentSystem';
import { save } from './SaveSystem';

export interface LevelUpInfo {
  from: number;
  to: number;
  hpGained: number;
  skillPointsGained: number;
}

/**
 * Player level / XP / gold / upgrades / stage unlocks. Operates on the save singleton.
 */
export class ProgressionSystem {
  /** Derived stats = base + level + permanent upgrades + equipment. */
  computeStats(): PlayerStats {
    const p = save.data.player;
    const eq = equipment.totals();
    const u = p.upgrades;
    return {
      maxHp: PLAYER_BASE.maxHp + (p.level - 1) * PROGRESSION.hpPerLevel + u.vitality * UPGRADES.vitalityPerLevel + eq.hp,
      attackMult: PLAYER_BASE.attackMult + (p.level - 1) * PROGRESSION.attackPerLevel + u.attack * UPGRADES.attackTrainingPerLevel + eq.attack / 100,
      defense: PLAYER_BASE.defense + u.defense * UPGRADES.defenseTrainingPerLevel + eq.defense,
      critChance: Math.min(0.75, PLAYER_BASE.critChance + u.crit * UPGRADES.critTrainingPerLevel + eq.crit / 100),
      critMult: PLAYER_BASE.critMult,
      goldBonus: eq.goldBonus / 100,
      xpBonus: eq.xpBonus / 100,
    };
  }

  xpToNext(): number {
    return xpForLevel(save.data.player.level);
  }

  /** Add XP (already including bonuses). Returns level-up info when at least one level was gained. */
  addXp(amount: number): LevelUpInfo | null {
    const p = save.data.player;
    const from = p.level;
    p.xp += Math.max(0, Math.round(amount));
    let skill = 0;
    while (p.level < PROGRESSION.maxLevel && p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level);
      p.level++;
      if (p.level % PROGRESSION.skillPointEveryLevels === 0) {
        p.skillPoints++;
        skill++;
      }
    }
    if (p.level === PROGRESSION.maxLevel) p.xp = Math.min(p.xp, xpForLevel(p.level) - 1);
    if (p.level === from) return null;
    return { from, to: p.level, hpGained: (p.level - from) * PROGRESSION.hpPerLevel, skillPointsGained: skill };
  }

  addGold(amount: number): void {
    save.data.player.gold += Math.max(0, Math.round(amount));
    save.data.stats.goldEarned += Math.max(0, Math.round(amount));
  }

  upgradeLevel(id: UpgradeId): number {
    return save.data.player.upgrades[id];
  }

  upgradeCost(id: UpgradeId): number {
    return upgradeCost(this.upgradeLevel(id));
  }

  canUpgrade(id: UpgradeId): boolean {
    return this.upgradeLevel(id) < UPGRADES.maxLevel && save.data.player.gold >= this.upgradeCost(id);
  }

  /** Buy an upgrade level with gold. */
  buyUpgrade(id: UpgradeId): boolean {
    if (!this.canUpgrade(id)) return false;
    save.data.player.gold -= this.upgradeCost(id);
    save.data.player.upgrades[id]++;
    save.persist();
    return true;
  }

  /** Spend a skill point for a free upgrade level. */
  spendSkillPoint(id: UpgradeId): boolean {
    const p = save.data.player;
    if (p.skillPoints <= 0 || this.upgradeLevel(id) >= UPGRADES.maxLevel) return false;
    p.skillPoints--;
    p.upgrades[id]++;
    save.persist();
    return true;
  }

  // ------------------------------------------------------------- stages

  isUnlocked(stageId: string): boolean {
    return save.data.unlockedStages.includes(stageId);
  }

  isCompleted(stageId: string): boolean {
    return save.data.completedStages.includes(stageId);
  }

  /** Mark a stage complete and unlock the next one. Returns the newly unlocked stage id (or null). */
  completeStage(stageId: string): string | null {
    const d = save.data;
    if (!d.completedStages.includes(stageId)) d.completedStages.push(stageId);
    const next = nextStage(stageId);
    if (next && !d.unlockedStages.includes(next.id)) {
      d.unlockedStages.push(next.id);
      return next.id;
    }
    return null;
  }

  /** First unlocked-but-not-completed stage, or the last unlocked one. */
  currentStageId(): string {
    const d = save.data;
    const pending = ALL_STAGES.find((s) => d.unlockedStages.includes(s.id) && !d.completedStages.includes(s.id));
    if (pending) return pending.id;
    return d.unlockedStages[d.unlockedStages.length - 1] ?? ALL_STAGES[0].id;
  }

  regionProgress(regionId: string): { done: number; total: number } {
    const stages = ALL_STAGES.filter((s) => s.regionId === regionId);
    return { done: stages.filter((s) => this.isCompleted(s.id)).length, total: stages.length };
  }

  /** A region is reachable if its first stage is unlocked. */
  isRegionUnlocked(regionId: string): boolean {
    const first = ALL_STAGES.find((s) => s.regionId === regionId);
    return !!first && this.isUnlocked(first.id);
  }

  stageLabel(stageId: string): string {
    return getStage(stageId).name;
  }
}

export const progression = new ProgressionSystem();
