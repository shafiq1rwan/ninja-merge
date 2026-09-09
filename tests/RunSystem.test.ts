import { beforeEach, describe, expect, it } from 'vitest';
import { RUN } from '../src/data/balance';
import { REGIONS } from '../src/data/stages';
import { runSystem } from '../src/systems/RunSystem';
import { defaultSave, save, SaveSystem, SAVE_VERSION } from '../src/systems/SaveSystem';
import type { PlayerStats } from '../src/types';

const stats: PlayerStats = { maxHp: 100, attackMult: 1, defense: 0, critChance: 0.05, critMult: 1.5, goldBonus: 0, xpBonus: 0 };

describe('RunSystem waves', () => {
  beforeEach(() => {
    save.data = defaultSave();
  });

  it('builds 10 waves ending in the region boss, with elites on the configured waves', () => {
    const forest = REGIONS[0];
    const w1 = runSystem.waveDef(forest.id, 1, 'normal');
    expect(w1.kind).toBe('normal');
    expect(w1.level).toBe(forest.stages[0].level);
    for (const e of RUN.eliteWaves) expect(runSystem.waveDef(forest.id, e, 'normal').kind).toBe('elite');
    const boss = runSystem.waveDef(forest.id, RUN.waves, 'normal');
    expect(boss.kind).toBe('boss');
    expect(boss.enemyId).toBe(forest.stages[5].enemyId);
  });

  it('difficulty only shifts enemy level', () => {
    const a = runSystem.waveDef('forest', 4, 'normal');
    const b = runSystem.waveDef('forest', 4, 'hard');
    expect(b.enemyId).toBe(a.enemyId);
    expect(b.level - a.level).toBe(RUN.difficultyLevelOffset.hard);
  });

  it('runs progress through upgrade breaks to completion and unlock hard mode', () => {
    runSystem.startRun('forest', 'normal', stats.maxHp);
    expect(runSystem.active?.wave).toBe(1);
    const outcomes: string[] = [];
    for (let w = 1; w <= RUN.waves; w++) outcomes.push(runSystem.recordWaveVictory(80, 10, 5, []));
    expect(outcomes.filter((o) => o === 'upgrade').length).toBe(RUN.upgradeAfter.length);
    expect(outcomes[outcomes.length - 1]).toBe('complete');
    expect(runSystem.active).toBeNull();
    const prog = runSystem.progressFor('forest');
    expect(prog.cleared).toBe(true);
    expect(prog.bestWave).toBe(RUN.waves);
    expect(runSystem.unlockedDifficulties('forest')).toEqual(['normal', 'hard']);
  });

  it('blessings stack on stats and heals respect the new max HP', () => {
    runSystem.startRun('forest', 'normal', 100);
    runSystem.active!.hp = 50;
    runSystem.applyUpgrade('sharp_blade', stats);
    expect(runSystem.stats(stats).attackMult).toBeCloseTo(1.15);
    const healed = runSystem.applyUpgrade('vigor', stats);
    expect(runSystem.stats(stats).maxHp).toBe(130);
    expect(healed).toBe(26); // 20% of 130
    expect(runSystem.active!.hp).toBe(76);
  });

  it('a failed run keeps the best wave reached', () => {
    runSystem.startRun('forest', 'normal', 100);
    runSystem.recordWaveVictory(60, 5, 5, []);
    runSystem.recordWaveVictory(40, 5, 5, []);
    runSystem.endRun();
    expect(runSystem.active).toBeNull();
    expect(runSystem.progressFor('forest').bestWave).toBe(2);
  });
});

describe('save migration v1 -> v2', () => {
  it('derives dungeon progress from completed stages', () => {
    const v1 = { saveVersion: 1, completedStages: ['forest_1', 'forest_2', 'forest_3', 'forest_4', 'forest_5', 'forest_6', 'cave_1', 'cave_2'], unlockedStages: ['forest_1'] };
    const data = SaveSystem.parse(JSON.stringify(v1));
    expect(data.saveVersion).toBe(SAVE_VERSION);
    expect(data.run.dungeons.forest).toEqual({ bestWave: 10, cleared: true, clearedDifficulties: ['normal'] });
    expect(data.run.dungeons.cave.bestWave).toBe(4);
    expect(data.run.dungeons.cave.cleared).toBe(false);
    expect(data.run.active).toBeNull();
  });

  it('keeps an active run and open dungeon records through parse', () => {
    const v2 = { ...defaultSave(), run: { active: { dungeonId: 'forest', difficulty: 'hard', wave: 4, hp: 55, buffs: ['iron_skin'], goldEarned: 30, xpEarned: 40, drops: [], startLevel: 2, startedAt: 1 }, dungeons: { forest: { bestWave: 6, cleared: false, clearedDifficulties: [] } } } };
    const data = SaveSystem.parse(JSON.stringify(v2));
    expect(data.run.active?.wave).toBe(4);
    expect(data.run.active?.buffs).toEqual(['iron_skin']);
    expect(data.run.dungeons.forest.bestWave).toBe(6);
  });
});
