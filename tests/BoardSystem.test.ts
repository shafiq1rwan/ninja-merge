import { describe, expect, it } from 'vitest';
import { BoardSystem } from '../src/systems/BoardSystem';
import { Rng } from '../src/systems/Rng';
import type { Direction } from '../src/types';

/** Board with deterministic RNG and no special-tile spawns unless asked. */
function makeBoard(seed = 1, opts: { potionChance?: number; bombChance?: number } = {}) {
  return new BoardSystem({ rng: new Rng(seed), potionChance: opts.potionChance ?? 0, bombChance: opts.bombChance ?? 0 });
}

/** Load a single row into row 0 and move; returns row 0 after the move (no spawn). */
function moveRow(row: number[], dir: Direction = 'left', seed = 1) {
  const b = makeBoard(seed);
  b.loadRanks([row, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
  const res = b.move(dir, false);
  return { row: b.toRanks()[0], res, board: b };
}

describe('merge rules (moving left)', () => {
  it('[1,1,0,0] -> [2,0,0,0]', () => {
    expect(moveRow([1, 1, 0, 0]).row).toEqual([2, 0, 0, 0]);
  });
  it('[1,1,1,0] -> [2,1,0,0]', () => {
    expect(moveRow([1, 1, 1, 0]).row).toEqual([2, 1, 0, 0]);
  });
  it('[1,1,1,1] -> [2,2,0,0] (a tile merges only once per move)', () => {
    const { row, res } = moveRow([1, 1, 1, 1]);
    expect(row).toEqual([2, 2, 0, 0]);
    expect(res.merges).toHaveLength(2);
  });
  it('[2,2,2,2] -> [3,3,0,0]', () => {
    expect(moveRow([2, 2, 2, 2]).row).toEqual([3, 3, 0, 0]);
  });
  it('[1,2,1,2] is unchanged and reports no move', () => {
    const { row, res } = moveRow([1, 2, 1, 2]);
    expect(row).toEqual([1, 2, 1, 2]);
    expect(res.moved).toBe(false);
    expect(res.spawned).toBeNull();
  });
  it('[0,1,0,1] -> [2,0,0,0] (merges across gaps)', () => {
    expect(moveRow([0, 1, 0, 1]).row).toEqual([2, 0, 0, 0]);
  });
  it('[1,0,0,2] -> [1,2,0,0] (slides without merging)', () => {
    const { row, res } = moveRow([1, 0, 0, 2]);
    expect(row).toEqual([1, 2, 0, 0]);
    expect(res.moved).toBe(true);
    expect(res.merges).toHaveLength(0);
  });
  it('a merged tile does not merge again in the same move: [1,1,2,0] -> [2,2,0,0]', () => {
    expect(moveRow([1, 1, 2, 0]).row).toEqual([2, 2, 0, 0]);
  });
  it('max rank tiles do not merge', () => {
    const { row } = moveRow([11, 11, 0, 0]);
    expect(row).toEqual([11, 11, 0, 0]);
  });
});

describe('all four directions', () => {
  it('right: [0,0,1,1] -> [0,0,0,2]', () => {
    expect(moveRow([0, 0, 1, 1], 'right').row).toEqual([0, 0, 0, 2]);
  });
  it('right: [1,1,1,1] -> [0,0,2,2]', () => {
    expect(moveRow([1, 1, 1, 1], 'right').row).toEqual([0, 0, 2, 2]);
  });
  it('right: [1,1,1,0] -> [0,0,1,2] (merge happens on the leading side)', () => {
    expect(moveRow([1, 1, 1, 0], 'right').row).toEqual([0, 0, 1, 2]);
  });
  it('up merges columns toward row 0', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 0, 3, 0],
      [1, 0, 0, 0],
      [1, 2, 3, 0],
      [1, 2, 0, 0],
    ]);
    b.move('up', false);
    expect(b.toRanks()).toEqual([
      [2, 3, 4, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]);
  });
  it('down merges columns toward row 3', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 2, 0, 5],
      [1, 0, 0, 0],
      [1, 2, 0, 0],
      [0, 0, 0, 5],
    ]);
    b.move('down', false);
    expect(b.toRanks()).toEqual([
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [1, 0, 0, 0],
      [2, 3, 0, 6],
    ]);
  });
});

describe('valid move detection', () => {
  it('detects no valid move on a checkerboard-full board', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
      [2, 1, 2, 1],
    ]);
    expect(b.hasValidMove()).toBe(false);
    expect(b.isBlocked()).toBe(true);
    for (const d of ['up', 'down', 'left', 'right'] as Direction[]) {
      const res = b.move(d);
      expect(res.moved).toBe(false);
      expect(res.spawned).toBeNull();
    }
  });
  it('detects a valid move when two equal tiles are adjacent on a full board', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 2, 1, 2],
      [3, 4, 3, 4],
      [1, 2, 1, 2],
      [3, 4, 4, 3],
    ]);
    expect(b.hasValidMove()).toBe(true);
    expect(b.simulate('left').moved).toBe(true);
    expect(b.simulate('up').moved).toBe(false);
  });
  it('an empty cell that can be reached counts as a valid move', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
      [2, 1, 2, 0],
    ]);
    expect(b.hasValidMove()).toBe(true);
  });
  it('blocked tiles act as walls and never move', () => {
    const b = makeBoard();
    b.loadRanks([[1, 0, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    b.placeTile(b.makeTile('blocked', 0, 5), 0, 2);
    b.move('left', false);
    // The wall at col 2 stops the right-hand tile; the two 1s cannot merge across it.
    expect(b.toRanks()[0]).toEqual([1, 0, -3, 1]);
  });
});

describe('spawning', () => {
  it('spawns exactly one tile after a valid move and none after an invalid one', () => {
    const b = makeBoard(42);
    b.loadRanks([[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    const res = b.move('right');
    expect(res.moved).toBe(true);
    expect(res.spawned).not.toBeNull();
    expect(b.tiles()).toHaveLength(2);
    const again = b.move('right');
    // Could still be valid depending on where the spawn landed, so check the invariant instead:
    expect(b.tiles().length).toBe(again.moved ? 3 : 2);
  });
  it('spawns rank 1 ~90% and rank 2 ~10% (deterministic seed)', () => {
    const b = makeBoard(7);
    const counts = { 1: 0, 2: 0 };
    for (let i = 0; i < 2000; i++) {
      b.reset();
      const t = b.spawnTile()!;
      counts[t.rank as 1 | 2]++;
    }
    expect(counts[1]).toBeGreaterThan(1700);
    expect(counts[2]).toBeGreaterThan(120);
    expect(counts[1] + counts[2]).toBe(2000);
  });
  it('is deterministic for a given seed', () => {
    const a = makeBoard(123);
    const b = makeBoard(123);
    a.start(2);
    b.start(2);
    expect(a.toRanks()).toEqual(b.toRanks());
    for (const d of ['left', 'up', 'right', 'down'] as Direction[]) {
      a.move(d);
      b.move(d);
    }
    expect(a.toRanks()).toEqual(b.toRanks());
  });
  it('never exceeds the special tile cap', () => {
    const b = makeBoard(3, { potionChance: 1 });
    b.spawnTile();
    b.spawnTile();
    expect(b.count('potion')).toBe(1);
  });
});

describe('special tiles', () => {
  it('potions never merge with ninja tiles', () => {
    const b = makeBoard();
    b.loadRanks([[0, 1, 0, 1], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    b.placeTile(b.makeTile('potion'), 0, 2);
    b.move('right', false);
    expect(b.toRanks()[0]).toEqual([0, 1, -1, 1]);
  });
  it('a potion pushed against the edge activates and is removed', () => {
    const b = makeBoard();
    b.loadRanks([[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    b.placeTile(b.makeTile('potion'), 1, 2);
    const res = b.move('left', false);
    expect(res.activations).toHaveLength(1);
    expect(res.activations[0].kind).toBe('potion');
    expect(b.tiles()).toHaveLength(0);
  });
  it('a bomb destroys the surrounding tiles when activated', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 2, 3, 0],
      [4, 0, 5, 0],
      [6, 7, 8, 0],
      [0, 0, 0, 0],
    ]);
    b.placeTile(b.makeTile('bomb'), 1, 1);
    const act = b.activateAt(1, 1)!;
    expect(act.kind).toBe('bomb');
    expect(act.destroyed).toHaveLength(8);
    expect(b.tiles()).toHaveLength(0);
  });
  it('tapping a ninja tile does nothing', () => {
    const b = makeBoard();
    b.loadRanks([[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    expect(b.activateAt(0, 0)).toBeNull();
    expect(b.tiles()).toHaveLength(1);
  });
  it('blocked tiles expire after their ttl', () => {
    const b = makeBoard();
    b.loadRanks([[1, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
    b.placeTile(b.makeTile('blocked', 0, 2), 3, 3);
    b.move('right', false);
    expect(b.count('blocked')).toBe(1);
    const res = b.move('left', false);
    expect(res.expired).toHaveLength(1);
    expect(b.count('blocked')).toBe(0);
  });
});

describe('board-blocked penalty', () => {
  it('clears the lowest ranks until at least the minimum is removed', () => {
    const b = makeBoard();
    b.loadRanks([
      [1, 2, 1, 2],
      [2, 1, 2, 1],
      [1, 2, 1, 2],
      [3, 4, 3, 4],
    ]);
    const removed = b.clearLowRankTiles(6);
    expect(removed.length).toBe(6); // all six rank-1 tiles
    expect(b.tiles().every((t) => t.rank >= 2)).toBe(true);
    expect(b.hasValidMove()).toBe(true);
  });
});
