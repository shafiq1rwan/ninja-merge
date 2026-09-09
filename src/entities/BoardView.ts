import Phaser from 'phaser';
import { ANIM } from '../data/balance';
import { audio } from '../systems/AudioSystem';
import type { BoardSystem } from '../systems/BoardSystem';
import type { ActivationEvent, Direction, MoveResult, Tile } from '../types';
import { delay, tweenAsync } from '../ui/async';
import { motion } from '../ui/motion';
import { COLORS, DEPTH } from '../ui/theme';
import { TILE_SIZE, TileView } from './MergeTile';

export const BOARD_GAP = 12;

/**
 * Renders a BoardSystem and animates MoveResults. The logical board is the source of truth;
 * after every animation `sync()` reconciles views with the state so nothing can drift.
 */
export class BoardView {
  readonly scene: Phaser.Scene;
  readonly board: BoardSystem;
  readonly x0: number;
  readonly y0: number;
  readonly pixelSize: number;
  readonly container: Phaser.GameObjects.Container;
  private views = new Map<number, TileView>();
  private frame: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, board: BoardSystem, x0: number, y0: number) {
    this.scene = scene;
    this.board = board;
    this.x0 = x0;
    this.y0 = y0;
    this.pixelSize = board.size * TILE_SIZE + (board.size + 1) * BOARD_GAP;
    this.container = scene.add.container(0, 0).setDepth(DEPTH.board);

    this.frame = scene.add.graphics();
    this.frame.fillStyle(COLORS.woodDark, 1);
    this.frame.fillRoundedRect(x0, y0, this.pixelSize, this.pixelSize, 18);
    this.frame.lineStyle(6, COLORS.woodLight, 1);
    this.frame.strokeRoundedRect(x0, y0, this.pixelSize, this.pixelSize, 18);
    for (let r = 0; r < board.size; r++) {
      for (let c = 0; c < board.size; c++) {
        const { x, y } = this.cellCenter(r, c);
        this.frame.fillStyle(COLORS.ink, 0.55);
        this.frame.fillRoundedRect(x - TILE_SIZE / 2, y - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE, 10);
      }
    }
    this.container.add(this.frame);
    this.sync(false);
  }

  cellCenter(row: number, col: number): { x: number; y: number } {
    return {
      x: this.x0 + BOARD_GAP + col * (TILE_SIZE + BOARD_GAP) + TILE_SIZE / 2,
      y: this.y0 + BOARD_GAP + row * (TILE_SIZE + BOARD_GAP) + TILE_SIZE / 2,
    };
  }

  /** Map a world point to a cell, or null when outside the board. */
  cellAt(x: number, y: number): { row: number; col: number } | null {
    const lx = x - this.x0 - BOARD_GAP;
    const ly = y - this.y0 - BOARD_GAP;
    if (lx < 0 || ly < 0) return null;
    const col = Math.floor(lx / (TILE_SIZE + BOARD_GAP));
    const row = Math.floor(ly / (TILE_SIZE + BOARD_GAP));
    if (col >= this.board.size || row >= this.board.size) return null;
    return { row, col };
  }

  private createView(tile: Tile, animateIn: boolean): TileView {
    const { x, y } = this.cellCenter(tile.row, tile.col);
    const v = new TileView(this.scene, x, y, tile);
    this.container.add(v);
    this.views.set(tile.id, v);
    if (animateIn) {
      v.setScale(0);
      this.scene.tweens.add({ targets: v, scale: 1, duration: motion.ms(ANIM.spawnMs), ease: 'Back.easeOut' });
    }
    return v;
  }

  private removeView(id: number): void {
    const v = this.views.get(id);
    if (v) {
      this.scene.tweens.killTweensOf(v);
      v.destroy();
      this.views.delete(id);
    }
  }

  /** Reconcile views with the logical board. */
  sync(animateNew = true): void {
    const present = new Set<number>();
    for (const tile of this.board.tiles()) {
      present.add(tile.id);
      const v = this.views.get(tile.id);
      if (!v) {
        this.createView(tile, animateNew);
      } else {
        const { x, y } = this.cellCenter(tile.row, tile.col);
        v.setPosition(x, y);
        v.updateBlocked(tile);
      }
    }
    for (const id of [...this.views.keys()]) if (!present.has(id)) this.removeView(id);
  }

  /** Animate a full MoveResult: slides -> merges -> activations -> expiry -> spawn. */
  async animateMove(result: MoveResult): Promise<void> {
    const slideMs = motion.ms(ANIM.slideMs);
    const slides: Promise<void>[] = [];
    for (const m of result.moves) {
      const v = this.views.get(m.id);
      if (!v) continue;
      const { x, y } = this.cellCenter(m.toRow, m.toCol);
      slides.push(tweenAsync(this.scene, { targets: v, x, y, duration: slideMs, ease: 'Quad.easeOut' }));
    }
    await Promise.all(slides);

    // Merges: drop the two sources, pop the result.
    if (result.merges.length) audio.play('merge', { detune: Math.min(600, result.merges.length * 120) });
    const pops: Promise<void>[] = [];
    for (const merge of result.merges) {
      this.removeView(merge.fromIds[0]);
      this.removeView(merge.fromIds[1]);
      const tile = this.board.tileAt(merge.row, merge.col);
      if (!tile) continue;
      const v = this.createView(tile, false);
      v.setScale(motion.pop(1.25));
      pops.push(tweenAsync(this.scene, { targets: v, scale: 1, duration: motion.ms(ANIM.mergePulseMs), ease: 'Back.easeOut' }));
      this.glow(merge.row, merge.col, v.glowColor);
    }

    // Activations (potion / bomb pushed to an edge)
    for (const act of result.activations) this.playActivation(act);

    // Expired locks fade
    for (const t of result.expired) {
      const v = this.views.get(t.id);
      if (v) pops.push(tweenAsync(this.scene, { targets: v, alpha: 0, scale: 0.7, duration: motion.ms(140), onComplete: () => this.removeView(t.id) }));
    }
    await Promise.all(pops);

    // Spawn
    if (result.spawned) this.createView(result.spawned, true);
    this.sync(true);
    if (result.spawned) await delay(this.scene, motion.ms(ANIM.spawnMs) * 0.6);
  }

  /** Visual for an activation (also used for tap activations). Views are removed; call sync() afterwards. */
  playActivation(act: ActivationEvent): void {
    const { x, y } = this.cellCenter(act.row, act.col);
    if (act.kind === 'bomb') {
      audio.play('explosion');
      if (this.scene.anims.exists('fx_explosion')) {
        const fx = this.scene.add.sprite(x, y, 'fx_Explosion').setScale(5).setDepth(DEPTH.fx).play('fx_explosion');
        fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
      }
      motion.shake(this.scene, 0.006, 160);
      for (const d of act.destroyed) {
        const v = this.views.get(d.id);
        if (!v) continue;
        this.scene.tweens.add({ targets: v, alpha: 0, scale: 0.4, angle: Phaser.Math.Between(-40, 40), duration: motion.ms(200), onComplete: () => this.removeView(d.id) });
      }
    } else {
      audio.play('heal');
      if (this.scene.anims.exists('fx_aura')) {
        const fx = this.scene.add.sprite(x, y, 'fx_Aura').setScale(6).setDepth(DEPTH.fx).setTint(0x8fe3c8).play('fx_aura');
        this.scene.time.delayedCall(500, () => fx.destroy());
      }
    }
    const v = this.views.get(act.id);
    if (v) this.scene.tweens.add({ targets: v, alpha: 0, scale: 1.3, duration: motion.ms(160), onComplete: () => this.removeView(act.id) });
  }

  /** Shrink-and-fade a set of tiles (board-blocked penalty). */
  async animateRemoval(tiles: Tile[]): Promise<void> {
    const ps: Promise<void>[] = [];
    for (const t of tiles) {
      const v = this.views.get(t.id);
      if (!v) continue;
      ps.push(tweenAsync(this.scene, { targets: v, alpha: 0, scale: 0.3, duration: motion.ms(260), ease: 'Quad.easeIn', onComplete: () => this.removeView(t.id) }));
    }
    await Promise.all(ps);
    this.sync(true);
  }

  /** Brief highlight square behind a merged tile. */
  private glow(row: number, col: number, color: number): void {
    if (motion.reduced) return;
    const { x, y } = this.cellCenter(row, col);
    const r = this.scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, color, 0.35).setDepth(DEPTH.board + 1);
    this.container.add(r);
    this.scene.tweens.add({ targets: r, alpha: 0, scale: 1.3, duration: 260, onComplete: () => r.destroy() });
  }

  /** Feedback for a swipe that changed nothing. */
  nudge(dir: Direction): void {
    const dx = dir === 'left' ? -8 : dir === 'right' ? 8 : 0;
    const dy = dir === 'up' ? -8 : dir === 'down' ? 8 : 0;
    this.scene.tweens.killTweensOf(this.container);
    this.container.setPosition(0, 0);
    this.scene.tweens.add({ targets: this.container, x: dx, y: dy, duration: 50, yoyo: true, ease: 'Quad.easeOut' });
  }

  /** Pulse a specific tile (e.g. tapped special tile that did nothing). */
  pulseTile(id: number): void {
    const v = this.views.get(id);
    if (v) this.scene.tweens.add({ targets: v, scale: 1.08, duration: 80, yoyo: true });
  }

  destroy(): void {
    for (const id of [...this.views.keys()]) this.removeView(id);
    this.container.destroy();
  }
}
