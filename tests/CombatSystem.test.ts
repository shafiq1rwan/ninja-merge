import { describe, expect, it } from 'vitest';
import { CombatSystem } from '../src/systems/CombatSystem';
import { Rng } from '../src/systems/Rng';
import { ENEMIES } from '../src/data/enemies';
import { BOSSES } from '../src/data/bosses';
import { DAMAGE_TABLE } from '../src/data/balance';
import type { MoveResult, PlayerStats } from '../src/types';

const stats: PlayerStats = { maxHp: 100, attackMult: 1, defense: 0, critChance: 0, critMult: 1.5, goldBonus: 0, xpBonus: 0 };

function moveWithMerges(ranks: number[]): MoveResult {
  return {
    moved: true,
    moves: [],
    merges: ranks.map((rank, i) => ({ row: 0, col: i, rank, fromIds: [1, 2] as [number, number], resultId: 100 + i })),
    activations: [],
    expired: [],
    spawned: null,
  };
}

describe('CombatSystem', () => {
  it('uses the damage table and combo multipliers', () => {
    const c = new CombatSystem(stats, ENEMIES.slime, 1, new Rng(1));
    const one = c.resolvePlayerMove(moveWithMerges([2]));
    expect(one.dealt).toBe(DAMAGE_TABLE[2]);
    const two = c.resolvePlayerMove(moveWithMerges([2, 3]));
    expect(two.comboMult).toBe(1.15);
    expect(two.dealt).toBe(Math.round((DAMAGE_TABLE[2] + DAMAGE_TABLE[3]) * 1.15));
  });

  it('enemy attacks every attackInterval moves', () => {
    const c = new CombatSystem(stats, ENEMIES.slime, 1, new Rng(1));
    const interval = ENEMIES.slime.attackInterval;
    for (let i = 0; i < interval - 1; i++) expect(c.enemyTick().some((e) => e.type === 'attack')).toBe(false);
    const events = c.enemyTick();
    expect(events.some((e) => e.type === 'attack')).toBe(true);
    expect(c.player.hp).toBe(100 - ENEMIES.slime.attack);
    expect(c.enemy.counter).toBe(interval);
  });

  it('defense reduces damage but never below the minimum', () => {
    const tanky = { ...stats, defense: 1000 };
    const c = new CombatSystem(tanky, ENEMIES.slime, 1, new Rng(1));
    expect(c.damagePlayer(5)).toBe(1);
  });

  it('scales enemy hp with stage level', () => {
    expect(CombatSystem.scaledHp(ENEMIES.slime, 1)).toBe(ENEMIES.slime.maxHp);
    expect(CombatSystem.scaledHp(ENEMIES.slime, 3)).toBeGreaterThan(ENEMIES.slime.maxHp);
  });

  it('boss board lock ability fires every N attacks', () => {
    const c = new CombatSystem(stats, BOSSES.bamboo_titan, 6, new Rng(1));
    const abilities: string[] = [];
    for (let i = 0; i < BOSSES.bamboo_titan.attackInterval * 4; i++) {
      for (const e of c.enemyTick()) if (e.type === 'ability') abilities.push(e.ability.type);
    }
    expect(abilities).toEqual(['boardLock', 'boardLock']);
  });

  it('critical hits multiply damage', () => {
    const critty = { ...stats, critChance: 1 };
    const c = new CombatSystem(critty, ENEMIES.slime, 1, new Rng(1));
    const r = c.resolvePlayerMove(moveWithMerges([3]));
    expect(r.crit).toBe(true);
    expect(r.dealt).toBe(Math.round(DAMAGE_TABLE[3] * 1.5));
  });
});
