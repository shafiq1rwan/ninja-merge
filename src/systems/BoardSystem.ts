import { BOARD } from '../data/balance';
import type { ActivationEvent, Direction, MergeEvent, MoveResult, Tile, TileKind, TileMove } from '../types';
import { Rng } from './Rng';

/**
 * Pure 2048-style board logic. Holds the authoritative grid state (board[row][col]).
 * Rendering (BoardView) reflects this state - sprites are never the source of truth.
 *
 * Special tiles:
 *  - potion / bomb slide like ninja tiles but never merge. They ACTIVATE when a move pushes them
 *    against the board edge in the swipe direction (they end the move in the leading cell of their line),
 *    or when the player taps them (activateAt).
 *  - blocked tiles never move and act as walls; they expire after `ttl` valid moves.
 */
export interface SpawnModifiers {
  /** Chance that a spawn becomes a temporary blocked tile (boss Curse). */
  blockedChance?: number;
  blockedTtl?: number;
}

export interface BoardOptions {
  rng?: Rng;
  size?: number;
  potionChance?: number;
  bombChance?: number;
  spawnRanks?: readonly { rank: number; weight: number }[];
}

type Grid = (Tile | null)[][];

export class BoardSystem {
  readonly size: number;
  board: Grid;
  private nextId = 1;
  readonly rng: Rng;
  potionChance: number;
  bombChance: number;
  spawnRanks: readonly { rank: number; weight: number }[];
  spawnModifiers: SpawnModifiers = {};
  /** Highest ninja rank ever created on this board. */
  highestRank = 0;

  constructor(opts: BoardOptions = {}) {
    this.size = opts.size ?? BOARD.size;
    this.rng = opts.rng ?? new Rng();
    this.potionChance = opts.potionChance ?? BOARD.potionSpawnChance;
    this.bombChance = opts.bombChance ?? BOARD.bombSpawnChance;
    this.spawnRanks = opts.spawnRanks ?? BOARD.spawnRanks;
    this.board = this.emptyGrid();
  }

  // ---------------------------------------------------------------- setup

  private emptyGrid(): Grid {
    return Array.from({ length: this.size }, () => Array<Tile | null>(this.size).fill(null));
  }

  reset(): void {
    this.board = this.emptyGrid();
    this.highestRank = 0;
  }

  /** Start a fresh board with `count` spawned tiles. */
  start(count = 2): Tile[] {
    this.reset();
    const spawned: Tile[] = [];
    for (let i = 0; i < count; i++) {
      const t = this.spawnNinja();
      if (t) spawned.push(t);
    }
    return spawned;
  }

  /** Load a grid of ranks (0 = empty) - used by tests and debug. */
  loadRanks(ranks: number[][]): void {
    this.board = this.emptyGrid();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const rank = ranks[r]?.[c] ?? 0;
        if (rank > 0) this.placeTile(this.makeTile('ninja', rank), r, c);
      }
    }
  }

  /** Snapshot of ranks (0 = empty, -1 = potion, -2 = bomb, -3 = blocked). */
  toRanks(): number[][] {
    return this.board.map((row) =>
      row.map((t) => {
        if (!t) return 0;
        if (t.kind === 'ninja') return t.rank;
        if (t.kind === 'potion') return -1;
        if (t.kind === 'bomb') return -2;
        return -3;
      }),
    );
  }

  makeTile(kind: TileKind, rank = 0, ttl?: number): Tile {
    const t: Tile = { id: this.nextId++, kind, rank, row: -1, col: -1 };
    if (ttl !== undefined) t.ttl = ttl;
    return t;
  }

  placeTile(tile: Tile, row: number, col: number): Tile {
    tile.row = row;
    tile.col = col;
    this.board[row][col] = tile;
    if (tile.kind === 'ninja' && tile.rank > this.highestRank) this.highestRank = tile.rank;
    return tile;
  }

  // ---------------------------------------------------------------- queries

  tiles(): Tile[] {
    const out: Tile[] = [];
    for (const row of this.board) for (const t of row) if (t) out.push(t);
    return out;
  }

  emptyCells(): { row: number; col: number }[] {
    const out: { row: number; col: number }[] = [];
    for (let r = 0; r < this.size; r++) for (let c = 0; c < this.size; c++) if (!this.board[r][c]) out.push({ row: r, col: c });
    return out;
  }

  count(kind: TileKind): number {
    return this.tiles().filter((t) => t.kind === kind).length;
  }

  tileAt(row: number, col: number): Tile | null {
    return this.board[row]?.[col] ?? null;
  }

  /** True if a swipe in ANY direction would change the board. */
  hasValidMove(): boolean {
    return (['up', 'down', 'left', 'right'] as Direction[]).some((d) => this.simulate(d).moved);
  }

  /** True if the board is stuck: no swipe changes anything and no special tile can be tapped. */
  isBlocked(): boolean {
    if (this.hasValidMove()) return false;
    return !this.tiles().some((t) => t.kind === 'potion' || t.kind === 'bomb');
  }

  // ---------------------------------------------------------------- movement

  /** Ordered cell coordinates for each line, starting from the leading edge of `dir`. */
  private lines(dir: Direction): { row: number; col: number }[][] {
    const n = this.size;
    const out: { row: number; col: number }[][] = [];
    for (let i = 0; i < n; i++) {
      const line: { row: number; col: number }[] = [];
      for (let j = 0; j < n; j++) {
        switch (dir) {
          case 'left': line.push({ row: i, col: j }); break;
          case 'right': line.push({ row: i, col: n - 1 - j }); break;
          case 'up': line.push({ row: j, col: i }); break;
          case 'down': line.push({ row: n - 1 - j, col: i }); break;
        }
      }
      out.push(line);
    }
    return out;
  }

  /**
   * Compute the outcome of a move without mutating state.
   * Returns the new grid plus the events needed to animate it.
   */
  private compute(dir: Direction): { grid: Grid; moves: TileMove[]; merges: MergeEvent[]; activations: ActivationEvent[] } {
    const grid = this.emptyGrid();
    const moves: TileMove[] = [];
    const merges: MergeEvent[] = [];
    const activations: ActivationEvent[] = [];
    let idCounter = this.nextId;

    for (const line of this.lines(dir)) {
      // Split into segments separated by blocked tiles (walls).
      let segStart = 0;
      for (let j = 0; j <= line.length; j++) {
        const cell = j < line.length ? line[j] : null;
        const tile = cell ? this.board[cell.row][cell.col] : null;
        const isWall = tile?.kind === 'blocked';
        if (j === line.length || isWall) {
          // process segment [segStart, j)
          const segment = line.slice(segStart, j);
          const tiles: Tile[] = [];
          for (const cc of segment) {
            const t = this.board[cc.row][cc.col];
            if (t) tiles.push(t);
          }
          const placed: Tile[] = [];
          for (let i = 0; i < tiles.length; i++) {
            const a = tiles[i];
            const b = tiles[i + 1];
            if (
              b &&
              a.kind === 'ninja' &&
              b.kind === 'ninja' &&
              a.rank === b.rank &&
              a.rank < BOARD.maxRank
            ) {
              const target = segment[placed.length];
              const merged: Tile = { id: idCounter++, kind: 'ninja', rank: a.rank + 1, row: target.row, col: target.col };
              placed.push(merged);
              moves.push({ id: a.id, fromRow: a.row, fromCol: a.col, toRow: target.row, toCol: target.col });
              moves.push({ id: b.id, fromRow: b.row, fromCol: b.col, toRow: target.row, toCol: target.col });
              merges.push({ row: target.row, col: target.col, rank: merged.rank, fromIds: [a.id, b.id], resultId: merged.id });
              i++; // b consumed - a tile merges at most once per move
            } else {
              const target = segment[placed.length];
              const copy: Tile = { ...a, row: target.row, col: target.col };
              placed.push(copy);
              if (a.row !== target.row || a.col !== target.col) {
                moves.push({ id: a.id, fromRow: a.row, fromCol: a.col, toRow: target.row, toCol: target.col });
              }
            }
          }
          for (const t of placed) grid[t.row][t.col] = t;
          if (isWall && tile) grid[cell!.row][cell!.col] = { ...tile };
          segStart = j + 1;
        }
      }

      // Special tile activation: leading cell of the line, pushed against the edge.
      const lead = line[0];
      const leadTile = grid[lead.row][lead.col];
      if (leadTile && (leadTile.kind === 'potion' || leadTile.kind === 'bomb')) {
        activations.push(this.buildActivation(leadTile, grid));
      }
    }

    // Apply activations to the grid (remove activated + destroyed tiles).
    for (const act of activations) {
      grid[act.row][act.col] = null;
      for (const d of act.destroyed) if (grid[d.row][d.col]?.id === d.id) grid[d.row][d.col] = null;
    }

    return { grid, moves, merges, activations };
  }

  private buildActivation(tile: Tile, grid: Grid): ActivationEvent {
    const destroyed: Tile[] = [];
    if (tile.kind === 'bomb') {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          if (!BOARD.bombDiagonals && dr !== 0 && dc !== 0) continue;
          const r = tile.row + dr;
          const c = tile.col + dc;
          const t = grid[r]?.[c];
          if (t) destroyed.push(t);
        }
      }
    }
    return { kind: tile.kind as 'potion' | 'bomb', id: tile.id, row: tile.row, col: tile.col, destroyed };
  }

  /** Dry run - does not change state or spawn. */
  simulate(dir: Direction): { moved: boolean; merges: number } {
    const { moves, merges, activations } = this.compute(dir);
    return { moved: moves.length > 0 || merges.length > 0 || activations.length > 0, merges: merges.length };
  }

  /**
   * Perform a move. If the board changed: tick blocked-tile timers and spawn one tile.
   * If nothing changed, nothing is spawned and `moved` is false.
   */
  move(dir: Direction, spawn = true): MoveResult {
    const { grid, moves, merges, activations } = this.compute(dir);
    const moved = moves.length > 0 || merges.length > 0 || activations.length > 0;
    const result: MoveResult = { moved, moves, merges, activations, expired: [], spawned: null };
    if (!moved) return result;

    this.board = grid;
    this.nextId += merges.length; // ids consumed by compute()
    for (const m of merges) if (m.rank > this.highestRank) this.highestRank = m.rank;

    result.expired = this.tickBlocked();
    if (spawn) result.spawned = this.spawnTile();
    return result;
  }

  /** Decrement blocked tile timers; remove expired ones. */
  private tickBlocked(): Tile[] {
    const expired: Tile[] = [];
    for (const t of this.tiles()) {
      if (t.kind === 'blocked' && t.ttl !== undefined) {
        t.ttl -= 1;
        if (t.ttl <= 0) {
          this.board[t.row][t.col] = null;
          expired.push(t);
        }
      }
    }
    return expired;
  }

  // ---------------------------------------------------------------- spawning

  /** Spawn one tile according to the configured probabilities. Returns null if the board is full. */
  spawnTile(): Tile | null {
    const empty = this.emptyCells();
    if (empty.length === 0) return null;
    const cell = this.rng.pick(empty);

    const mod = this.spawnModifiers;
    if (mod.blockedChance && this.rng.chance(mod.blockedChance)) {
      return this.placeTile(this.makeTile('blocked', 0, mod.blockedTtl ?? 3), cell.row, cell.col);
    }
    if (this.count('potion') < BOARD.maxPotionsOnBoard && this.rng.chance(this.potionChance)) {
      return this.placeTile(this.makeTile('potion'), cell.row, cell.col);
    }
    if (this.count('bomb') < BOARD.maxBombsOnBoard && this.rng.chance(this.bombChance)) {
      return this.placeTile(this.makeTile('bomb'), cell.row, cell.col);
    }
    return this.placeTile(this.makeTile('ninja', this.rollRank()), cell.row, cell.col);
  }

  /** Spawn a plain ninja tile (no specials) - used for the opening board. */
  spawnNinja(rank?: number): Tile | null {
    const empty = this.emptyCells();
    if (empty.length === 0) return null;
    const cell = this.rng.pick(empty);
    return this.placeTile(this.makeTile('ninja', rank ?? this.rollRank()), cell.row, cell.col);
  }

  /** Spawn a specific tile kind in a random empty cell (debug / boss abilities). */
  spawnSpecial(kind: TileKind, ttl?: number): Tile | null {
    const empty = this.emptyCells();
    if (empty.length === 0) return null;
    const cell = this.rng.pick(empty);
    return this.placeTile(this.makeTile(kind, 0, ttl), cell.row, cell.col);
  }

  private rollRank(): number {
    const roll = this.rng.next();
    let acc = 0;
    for (const { rank, weight } of this.spawnRanks) {
      acc += weight;
      if (roll < acc) return rank;
    }
    return this.spawnRanks[0].rank;
  }

  // ---------------------------------------------------------------- special actions

  /** Tap-to-activate a potion or bomb. Returns null when the cell holds no activatable tile. */
  activateAt(row: number, col: number): ActivationEvent | null {
    const t = this.tileAt(row, col);
    if (!t || (t.kind !== 'potion' && t.kind !== 'bomb')) return null;
    const act = this.buildActivation(t, this.board);
    this.board[row][col] = null;
    for (const d of act.destroyed) if (this.board[d.row][d.col]?.id === d.id) this.board[d.row][d.col] = null;
    return act;
  }

  /** Lock a random empty cell for `ttl` moves (boss Board Lock). */
  lockRandomEmptyCell(ttl: number): Tile | null {
    return this.spawnSpecial('blocked', ttl);
  }

  /**
   * Board-blocked penalty helper: remove the lowest-rank ninja tiles until at least `min` are gone.
   * Returns the removed tiles.
   */
  clearLowRankTiles(min = BOARD.blockedPenaltyClearMin): Tile[] {
    const removed: Tile[] = [];
    const ninjas = this.tiles().filter((t) => t.kind === 'ninja').sort((a, b) => a.rank - b.rank);
    let rank = ninjas[0]?.rank ?? 0;
    while (removed.length < min && ninjas.length) {
      const batch = ninjas.filter((t) => t.rank === rank);
      if (batch.length === 0) {
        rank++;
        if (rank > BOARD.maxRank) break;
        continue;
      }
      for (const t of batch) {
        this.board[t.row][t.col] = null;
        removed.push(t);
        ninjas.splice(ninjas.indexOf(t), 1);
      }
      rank++;
    }
    // Also clear any blocked tiles so the player is never soft-locked.
    for (const t of this.tiles()) if (t.kind === 'blocked') { this.board[t.row][t.col] = null; removed.push(t); }
    return removed;
  }
}
