import { RUN } from '../data/balance';
import { getRegion, REGIONS } from '../data/stages';
import type { PlayerStats } from '../types';
import { progression } from './ProgressionSystem';
import { save, type ActiveRun, type DungeonProgress, type RunDifficulty } from './SaveSystem';

export const DIFFICULTIES: RunDifficulty[] = ['normal', 'hard', 'nightmare'];
export const DIFFICULTY_LABEL: Record<RunDifficulty, string> = { normal: 'Normal', hard: 'Hard', nightmare: 'Nightmare' };

export interface WaveDef {
  wave: number;
  total: number;
  enemyId: string;
  level: number;
  kind: 'normal' | 'elite' | 'boss';
  regionId: string;
}

/** Run-only blessings offered between waves. Stat fields stack additively on the computed player stats. */
export interface RunBuff {
  id: string;
  name: string;
  description: string;
  icon: string;
  attack?: number; // +attack multiplier (0.15 = +15%)
  defense?: number;
  crit?: number; // 0.05 = +5%
  maxHp?: number;
  goldBonus?: number;
  /** Immediate heal as a fraction of max HP. */
  heal?: number;
}

export const RUN_BUFFS: RunBuff[] = [
  { id: 'second_wind', name: 'Second Wind', description: 'Heal 40% of max HP now.', icon: 'item_LifePot', heal: 0.4 },
  { id: 'sharp_blade', name: 'Sharpened Blade', description: '+15% attack for this run.', icon: 'item_Katana', attack: 0.15 },
  { id: 'iron_skin', name: 'Iron Skin', description: '+2 defense for this run.', icon: 'icon_Guard', defense: 2 },
  { id: 'eagle_eye', name: 'Eagle Eye', description: '+6% critical chance for this run.', icon: 'icon_Shuriken', crit: 0.06 },
  { id: 'vigor', name: 'Vigor', description: '+30 max HP for this run and heal 30.', icon: 'ui_IconHeart', maxHp: 30, heal: 0.2 },
  { id: 'lucky_coin', name: 'Lucky Coin', description: '+30% gold for this run.', icon: 'item_GoldCoin', goldBonus: 0.3 },
];

/**
 * Roguelite dungeon runs: one dungeon = RUN.waves waves (normal, elite, boss) fought back-to-back,
 * with run-only upgrades between some waves. Difficulty just offsets the enemy level, so combat math,
 * rewards and progression are untouched - this system only decides which enemy comes next and remembers
 * the run between scenes (persisted in save.data.run so a run can be resumed).
 */
export class RunSystem {
  get active(): ActiveRun | null {
    return save.data.run.active;
  }

  progressFor(dungeonId: string): DungeonProgress {
    return save.data.run.dungeons[dungeonId] ?? { bestWave: 0, cleared: false, clearedDifficulties: [] };
  }

  isUnlocked(dungeonId: string): boolean {
    return progression.isRegionUnlocked(dungeonId);
  }

  unlockedDifficulties(dungeonId: string): RunDifficulty[] {
    const p = this.progressFor(dungeonId);
    const out: RunDifficulty[] = ['normal'];
    if (p.clearedDifficulties.includes('normal')) out.push('hard');
    if (p.clearedDifficulties.includes('hard')) out.push('nightmare');
    return out;
  }

  /** First unlocked dungeon that has not been cleared, else the last unlocked one. */
  suggestedDungeonId(): string {
    const unlocked = REGIONS.filter((r) => this.isUnlocked(r.id));
    return (unlocked.find((r) => !this.progressFor(r.id).cleared) ?? unlocked[unlocked.length - 1] ?? REGIONS[0]).id;
  }

  /** Which enemy shows up for a wave. */
  waveDef(dungeonId: string, wave: number, difficulty: RunDifficulty): WaveDef {
    const region = getRegion(dungeonId);
    const offset = RUN.difficultyLevelOffset[difficulty] ?? 0;
    const startLevel = region.stages[0].level;
    const total = RUN.waves;
    if (wave >= total) {
      return { wave, total, enemyId: region.stages[5].enemyId, level: startLevel + 5 + offset, kind: 'boss', regionId: dungeonId };
    }
    const normals = region.stages.slice(0, 5).map((s) => s.enemyId);
    const enemyId = normals[(wave - 1) % normals.length];
    const elite = (RUN.eliteWaves as readonly number[]).includes(wave);
    const level = startLevel + Math.floor((wave - 1) / RUN.wavesPerLevel) + offset + (elite ? RUN.eliteLevelBonus : 0);
    return { wave, total, enemyId, level, kind: elite ? 'elite' : 'normal', regionId: dungeonId };
  }

  startRun(dungeonId: string, difficulty: RunDifficulty, maxHp: number): ActiveRun {
    const run: ActiveRun = {
      dungeonId, difficulty, wave: 1, hp: maxHp, buffs: [], goldEarned: 0, xpEarned: 0, drops: [],
      startLevel: save.data.player.level, startedAt: Date.now(),
    };
    save.data.run.active = run;
    save.persist();
    return run;
  }

  currentWave(): WaveDef | null {
    const run = this.active;
    return run ? this.waveDef(run.dungeonId, run.wave, run.difficulty) : null;
  }

  /** Base stats plus the run's blessings. */
  stats(base: PlayerStats): PlayerStats {
    const run = this.active;
    if (!run) return base;
    const out = { ...base };
    for (const id of run.buffs) {
      const b = RUN_BUFFS.find((x) => x.id === id);
      if (!b) continue;
      out.attackMult += b.attack ?? 0;
      out.defense += b.defense ?? 0;
      out.critChance = Math.min(0.75, out.critChance + (b.crit ?? 0));
      out.maxHp += b.maxHp ?? 0;
      out.goldBonus += b.goldBonus ?? 0;
    }
    return out;
  }

  /** Record a cleared wave. Returns what happens next. */
  recordWaveVictory(hpLeft: number, gold: number, xp: number, drops: string[]): 'upgrade' | 'wave' | 'complete' {
    const run = this.active;
    if (!run) return 'complete';
    const cleared = run.wave;
    run.goldEarned += gold;
    run.xpEarned += xp;
    run.drops.push(...drops);
    run.hp = Math.max(1, hpLeft);
    const prog = this.progressFor(run.dungeonId);
    prog.bestWave = Math.max(prog.bestWave, cleared);
    save.data.run.dungeons[run.dungeonId] = prog;

    if (cleared >= RUN.waves) {
      prog.cleared = true;
      if (!prog.clearedDifficulties.includes(run.difficulty)) prog.clearedDifficulties.push(run.difficulty);
      save.data.run.active = null;
      save.persist();
      return 'complete';
    }
    run.wave = cleared + 1;
    save.persist();
    return (RUN.upgradeAfter as readonly number[]).includes(cleared) ? 'upgrade' : 'wave';
  }

  /** Random run-only upgrades the player has not taken yet. */
  offerUpgrades(count = RUN.upgradeChoices): RunBuff[] {
    const taken = new Set(this.active?.buffs ?? []);
    const pool = RUN_BUFFS.filter((b) => !taken.has(b.id) || b.heal);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, count);
  }

  /** Apply a blessing; heals are applied against the new max HP. Returns HP healed. */
  applyUpgrade(buffId: string, baseStats: PlayerStats): number {
    const run = this.active;
    const buff = RUN_BUFFS.find((b) => b.id === buffId);
    if (!run || !buff) return 0;
    if (!buff.heal || buff.maxHp || buff.attack || buff.defense || buff.crit || buff.goldBonus) run.buffs.push(buff.id);
    const maxHp = this.stats(baseStats).maxHp;
    const before = run.hp;
    run.hp = Math.min(maxHp, run.hp + Math.round(maxHp * (buff.heal ?? 0)));
    save.persist();
    return run.hp - before;
  }

  /** Run lost or abandoned: progress (best wave) is already recorded; the run is dropped. */
  endRun(): void {
    if (!save.data.run.active) return;
    save.data.run.active = null;
    save.persist();
  }
}

export const runSystem = new RunSystem();
