import { describe, expect, it } from 'vitest';
import { BOARD } from '../src/data/balance';
import { BATTLE_LAYOUT, BOARD_GAP, BOARD_PIXEL_SIZE, TILE_SIZE } from '../src/data/battleAssets';
import { GAME_HEIGHT, GAME_WIDTH } from '../src/config/gameConfig';

/**
 * The battle screen is a single column: the stage title bar, the enemy status card, the board and the
 * player HUD all share one box. These assertions keep them from drifting apart again.
 */
describe('battle layout', () => {
  it('derives the board size from the tile metrics', () => {
    expect(BOARD_PIXEL_SIZE).toBe(BOARD.size * TILE_SIZE + (BOARD.size + 1) * BOARD_GAP);
    expect(BATTLE_LAYOUT.board.size).toBe(BOARD_PIXEL_SIZE);
  });

  it('gives the panels exactly the board box', () => {
    expect(BATTLE_LAYOUT.panel.width).toBe(BATTLE_LAYOUT.board.size);
    const panelLeft = BATTLE_LAYOUT.panel.x - BATTLE_LAYOUT.panel.width / 2;
    const panelRight = BATTLE_LAYOUT.panel.x + BATTLE_LAYOUT.panel.width / 2;
    expect(panelLeft).toBe(BATTLE_LAYOUT.board.x);
    expect(panelRight).toBe(BATTLE_LAYOUT.board.x + BATTLE_LAYOUT.board.size);
  });

  it('keeps equal margins inside the screen', () => {
    const left = BATTLE_LAYOUT.board.x;
    const right = GAME_WIDTH - (BATTLE_LAYOUT.board.x + BATTLE_LAYOUT.board.size);
    expect(left).toBe(right);
    expect(left).toBeGreaterThan(0);
  });

  it('stacks the rows without overlapping, inside the screen', () => {
    const rows = [
      { name: 'title', top: BATTLE_LAYOUT.titleBarY - 24, bottom: BATTLE_LAYOUT.titleBarY + 24 },
      { name: 'status', top: BATTLE_LAYOUT.status.top, bottom: BATTLE_LAYOUT.status.top + BATTLE_LAYOUT.status.height },
      { name: 'board', top: BATTLE_LAYOUT.board.y, bottom: BATTLE_LAYOUT.board.y + BATTLE_LAYOUT.board.size },
      { name: 'hud', top: BATTLE_LAYOUT.hud.top, bottom: BATTLE_LAYOUT.hud.top + BATTLE_LAYOUT.hud.height },
    ];
    expect(rows[0].top).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].top, `${rows[i].name} overlaps ${rows[i - 1].name}`).toBeGreaterThanOrEqual(rows[i - 1].bottom);
    }
    expect(rows[rows.length - 1].bottom).toBeLessThanOrEqual(GAME_HEIGHT);
  });

  it('leaves the enemy room above the status card', () => {
    expect(BATTLE_LAYOUT.enemyFeetY).toBeLessThan(BATTLE_LAYOUT.status.top);
    expect(BATTLE_LAYOUT.enemyFeetY - BATTLE_LAYOUT.enemyMaxHeight).toBeGreaterThan(BATTLE_LAYOUT.titleBarY);
  });
});
