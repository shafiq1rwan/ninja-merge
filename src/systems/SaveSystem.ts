import { SAVE_KEY } from '../config/gameConfig';
import { FIRST_STAGE_ID } from '../data/stages';
import type { EquipSlot } from '../types';

export const SAVE_VERSION = 2;

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  musicMuted: boolean;
  sfxMuted: boolean;
  screenShake: boolean;
  damageNumbers: boolean;
  reducedMotion: boolean;
}

export interface Statistics {
  battlesWon: number;
  battlesLost: number;
  bossesDefeated: number;
  totalMerges: number;
  totalDamage: number;
  goldEarned: number;
  highestRank: number;
  highestCombo: number;
  criticalHits: number;
  potionsUsed: number;
  bombsUsed: number;
}

export type RunDifficulty = 'normal' | 'hard' | 'nightmare';

/** A dungeon run in progress (resumable from the dungeon-select screen). */
export interface ActiveRun {
  dungeonId: string;
  difficulty: RunDifficulty;
  /** 1-based wave the player is about to fight. */
  wave: number;
  /** Player HP carried between waves. */
  hp: number;
  /** Ids of run-only upgrades taken. */
  buffs: string[];
  goldEarned: number;
  xpEarned: number;
  drops: string[];
  startLevel: number;
  startedAt: number;
}

export interface DungeonProgress {
  bestWave: number;
  cleared: boolean;
  clearedDifficulties: RunDifficulty[];
}

export interface SaveData {
  saveVersion: number;
  createdAt: number;
  updatedAt: number;
  player: {
    level: number;
    xp: number;
    gold: number;
    skillPoints: number;
    upgrades: { attack: number; vitality: number; crit: number; defense: number };
  };
  equipped: Record<EquipSlot, string | null>;
  /** Unequipped item ids (duplicates allowed). */
  inventory: string[];
  unlockedStages: string[];
  completedStages: string[];
  settings: Settings;
  stats: Statistics;
  /** v2: roguelite dungeon runs. */
  run: { active: ActiveRun | null; dungeons: Record<string, DungeonProgress> };
}

export function defaultSave(): SaveData {
  const now = Date.now();
  return {
    saveVersion: SAVE_VERSION,
    createdAt: now,
    updatedAt: now,
    player: { level: 1, xp: 0, gold: 0, skillPoints: 0, upgrades: { attack: 0, vitality: 0, crit: 0, defense: 0 } },
    equipped: { weapon: null, armor: null, accessory: null },
    inventory: [],
    unlockedStages: [FIRST_STAGE_ID],
    completedStages: [],
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      musicMuted: false,
      sfxMuted: false,
      screenShake: true,
      damageNumbers: true,
      reducedMotion: false,
    },
    stats: {
      battlesWon: 0, battlesLost: 0, bossesDefeated: 0, totalMerges: 0, totalDamage: 0, goldEarned: 0,
      highestRank: 0, highestCombo: 0, criticalHits: 0, potionsUsed: 0, bombsUsed: 0,
    },
    run: { active: null, dungeons: {} },
  };
}

/**
 * Migrations keyed by the version they upgrade FROM. When SAVE_VERSION is bumped, add an entry:
 *   [1]: (old) => ({ ...old, saveVersion: 2, newField: defaultValue })
 * Migrations run in sequence until the data reaches SAVE_VERSION.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const MIGRATIONS: Record<number, (old: any) => any> = {
  /**
   * v1 -> v2: individual stage progress becomes dungeon progress. Each region had 5 stages + boss;
   * a cleared boss marks the dungeon cleared (best wave 10), otherwise each cleared stage counts as ~2 waves.
   */
  1: (old) => {
    const completed: string[] = Array.isArray(old.completedStages) ? old.completedStages : [];
    const dungeons: Record<string, DungeonProgress> = {};
    for (const id of completed) {
      const m = /^([a-z]+)_(\d+)$/.exec(id);
      if (!m) continue;
      const region = m[1];
      const idx = parseInt(m[2], 10);
      const d = (dungeons[region] ??= { bestWave: 0, cleared: false, clearedDifficulties: [] });
      if (idx === 6) {
        d.cleared = true;
        d.bestWave = 10;
        if (!d.clearedDifficulties.includes('normal')) d.clearedDifficulties.push('normal');
      } else {
        d.bestWave = Math.max(d.bestWave, Math.min(9, idx * 2));
      }
    }
    return { ...old, saveVersion: 2, run: { active: null, dungeons } };
  },
};

/** Deep-merge `partial` over `base`, so missing fields in older/edited saves fall back to defaults. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeDefaults<T>(base: T, partial: any): T {
  if (partial === undefined) return base;
  // Nullable slots (e.g. run.active) accept whatever the save holds.
  if (base === null) return (partial ?? null) as T;
  if (Array.isArray(base)) return (Array.isArray(partial) ? partial : base) as T;
  if (base && typeof base === 'object') {
    if (!partial || typeof partial !== 'object' || Array.isArray(partial)) return base;
    const baseKeys = Object.keys(base as object);
    // Open records (e.g. run.dungeons) have no default keys - keep the saved content as-is.
    if (baseKeys.length === 0) return partial as T;
    const out: Record<string, unknown> = { ...(base as Record<string, unknown>) };
    for (const k of baseKeys) {
      if (k in partial) out[k] = mergeDefaults((base as Record<string, unknown>)[k], partial[k]);
    }
    return out as T;
  }
  return (partial === null || typeof partial !== typeof base ? base : partial) as T;
}

export class SaveSystem {
  data: SaveData = defaultSave();
  private storage: Storage | null;
  private listeners = new Set<() => void>();

  constructor(storage: Storage | null = typeof localStorage !== 'undefined' ? localStorage : null) {
    this.storage = storage;
  }

  /** Load from storage (or defaults). Returns true if an existing save was found. */
  load(): boolean {
    if (!this.storage) return false;
    try {
      const raw = this.storage.getItem(SAVE_KEY);
      if (!raw) return false;
      this.data = SaveSystem.parse(raw);
      return true;
    } catch (err) {
      console.warn('[Save] Failed to load save, starting fresh.', err);
      this.data = defaultSave();
      return false;
    }
  }

  /** Parse + migrate + validate a JSON save string. Throws on garbage. */
  static parse(raw: string): SaveData {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsed: any = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw new Error('Save is not an object');
    if (typeof parsed.saveVersion !== 'number') throw new Error('Save has no version');
    if (parsed.saveVersion > SAVE_VERSION) throw new Error(`Save version ${parsed.saveVersion} is newer than this game (${SAVE_VERSION})`);
    while (parsed.saveVersion < SAVE_VERSION) {
      const migrate = MIGRATIONS[parsed.saveVersion];
      if (!migrate) throw new Error(`No migration from save version ${parsed.saveVersion}`);
      parsed = migrate(parsed);
    }
    const merged = mergeDefaults(defaultSave(), parsed);
    if (!merged.unlockedStages.length) merged.unlockedStages = [FIRST_STAGE_ID];
    return merged;
  }

  /** Persist to storage. Call after victory, purchase, equipment change, upgrade, stage unlock. */
  persist(): void {
    this.data.updatedAt = Date.now();
    if (this.storage) {
      try {
        this.storage.setItem(SAVE_KEY, JSON.stringify(this.data));
      } catch (err) {
        console.warn('[Save] Failed to persist save.', err);
      }
    }
    for (const l of this.listeners) l();
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  exportJson(): string {
    return JSON.stringify(this.data, null, 2);
  }

  /** Replace the current save with imported data. Throws if invalid. */
  importJson(raw: string): void {
    this.data = SaveSystem.parse(raw);
    this.persist();
  }

  reset(): void {
    this.data = defaultSave();
    if (this.storage) this.storage.removeItem(SAVE_KEY);
    this.persist();
  }
}

/** Game-wide singleton. */
export const save = new SaveSystem();
