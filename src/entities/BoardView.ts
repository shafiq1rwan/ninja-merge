import Phaser from 'phaser';
import { BOARD_GAP, TILE_SIZE } from '../data/battleAssets';
import { JUICE } from '../data/juice';
import { mergeEffects } from '../effects/MergeEffects';
import type { ParticleEffects } from '../effects/ParticleEffects';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import type { BoardSystem } from '../systems/BoardSystem';
import type { ActivationEvent, Direction, MoveResult, Tile } from '../types';
import { delay, tweenAsync } from '../ui/async';
import { motion } from '../ui/motion';
import { COLORS, DEPTH } from '../ui/theme';
import { TileView } from './MergeTile';

export { BOARD_GAP };

/**
 * Renders a BoardSystem and animates MoveResults. The logical board is the source of truth;
 * after every animation `sync()` reconciles views with the state so nothing can drift.
 *
 * The move animation is deliberately short so the attack can follow almost immediately:
 *   slide (~100ms) -> squash the merging pair (~42ms) -> pop the upgraded tile + burst -> spawn.
 * `animateMove` resolves as soon as the board is visually safe, not when every tween has finished.
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
  private particles?: ParticleEffects;
  /** Set while a merge chain is playing, so callers know the visuals are mid-flight. */
  private lastMergeRanks: number[] = [];

  constructor(scene: Phaser.Scene, board: BoardSystem, x0: number, y0: number, particles?: ParticleEffects) {
    this.scene = scene;
    this.board = board;
    this.x0 = x0;
    this.y0 = y0;
    this.particles = particles;
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

  /** Ranks produced by the most recent animateMove (for rank announcements). */
  get mergedRanks(): number[] {
    return this.lastMergeRanks;
  }

  private createView(tile: Tile, animateIn: boolean): TileView {
    const { x, y } = this.cellCenter(tile.row, tile.col);
    const v = new TileView(this.scene, x, y, tile);
    this.container.add(v);
    this.views.set(tile.id, v);
    if (animateIn) {
      v.setScale(0);
      this.scene.tweens.add({ targets: v, scale: 1, duration: effects.ms(JUICE.tile.spawnMs), ease: 'Back.easeOut' });
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

  /**
   * Animate a full MoveResult. Resolves when the board is safe to act on.
   */
  async animateMove(result: MoveResult): Promise<void> {
    const slideMs = effects.ms(JUICE.tile.slideMs);
    this.lastMergeRanks = result.merges.map((m) => m.rank);
    const mergingIds = new Set<number>(result.merges.flatMap((m) => m.fromIds));

    // 1. Slides. Tiles that are not merging get a tiny settle on arrival.
    if (result.moves.length) audio.play('tileSlide', { detune: Phaser.Math.Between(-60, 60) });
    const slides: Promise<void>[] = [];
    for (const m of result.moves) {
      const v = this.views.get(m.id);
      if (!v) continue;
      const { x, y } = this.cellCenter(m.toRow, m.toCol);
      const settles = !mergingIds.has(m.id);
      slides.push(
        tweenAsync(this.scene, {
          targets: v,
          x,
          y,
          duration: slideMs,
          ease: 'Quad.easeOut',
          onComplete: () => { if (settles) v.settle(); },
        }),
      );
    }
    await Promise.all(slides);

    // 2. Compression of each merging pair.
    if (result.merges.length) {
      const squash = effects.reduced ? 1 : JUICE.merge.squash;
      const squashes: Promise<void>[] = [];
      for (const id of mergingIds) {
        const v = this.views.get(id);
        if (v) squashes.push(tweenAsync(this.scene, { targets: v, scaleX: squash, scaleY: squash, duration: effects.ms(JUICE.merge.squashMs), ease: 'Quad.easeIn' }));
      }
      await Promise.all(squashes);
    }

    // 3. Merges: swap in the upgraded tile with a pop, a small burst and a rising pitch per merge.
    result.merges.forEach((merge, i) => {
      this.removeView(merge.fromIds[0]);
      this.removeView(merge.fromIds[1]);
      const tile = this.board.tileAt(merge.row, merge.col);
      if (!tile) return;
      const v = this.createView(tile, false);
      v.setScale(mergeEffects.popScale(merge.rank));
      this.scene.tweens.add({ targets: v, scale: 1, duration: effects.ms(JUICE.merge.popMs), ease: 'Back.easeOut' });
      const c = this.cellCenter(merge.row, merge.col);
      if (this.particles) mergeEffects.burst(this.particles, c.x, c.y, merge.rank);
      this.glow(merge.row, merge.col, v.glowColor);
      audio.play('merge', { detune: mergeEffects.mergeDetune(i), volume: mergeEffects.isHigh(merge.rank) ? 1.15 : 1 });
    });

    // 4. Special tiles that reached an edge, then expiring locks (staggered).
    for (const act of result.activations) this.playActivation(act);
    result.expired.forEach((t, i) => {
      const v = this.views.get(t.id);
      if (!v) return;
      this.scene.tweens.add({
        targets: v,
        alpha: 0,
        scale: 0.7,
        delay: i * 40,
        duration: effects.ms(140),
        onComplete: () => this.removeView(t.id),
      });
    });

    // 5. Spawn runs in parallel - the player never waits for it.
    if (result.spawned) this.createView(result.spawned, true);
    this.sync(true);
    await delay(this.scene, effects.ms(result.merges.length ? JUICE.merge.safeMs : 20));
  }

  /**
   * Visual for an activation (also used for tap activations). Views are removed; call sync() afterwards.
   * Bomb destruction is staggered by ring distance so a blast reads as a chain, not one flat wipe.
   */
  playActivation(act: ActivationEvent): void {
    const { x, y } = this.cellCenter(act.row, act.col);
    if (act.kind === 'bomb') {
      audio.play('explosion');
      if (this.scene.anims.exists('fx_explosion')) {
        const fx = this.scene.add.sprite(x, y, 'fx_Explosion').setScale(5).setDepth(DEPTH.fx).play('fx_explosion');
        fx.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => fx.destroy());
      }
      if (this.particles) {
        this.particles.burst(x, y, { count: 12, color: 0xff8a5b, size: 8, speed: 150, lifeMs: 360 });
      }
      motion.shake(this.scene, JUICE.shake.bomb, 130);
      for (const d of act.destroyed) {
        const v = this.views.get(d.id);
        if (!v) continue;
        const ring = Math.max(Math.abs(d.row - act.row), Math.abs(d.col - act.col));
        const stagger = effects.reduced ? 0 : ring * JUICE.stagger.bombRingMs;
        this.scene.tweens.add({
          targets: v,
          alpha: 0,
          scale: 0.4,
          angle: effects.reduced ? 0 : Phaser.Math.Between(-40, 40),
          delay: stagger,
          duration: effects.ms(200),
          onComplete: () => this.removeView(d.id),
        });
        if (this.particles && !effects.reduced) {
          const c = this.cellCenter(d.row, d.col);
          this.scene.time.delayedCall(stagger, () => this.particles?.burst(c.x, c.y, { count: 4, color: 0xffb833, size: 6, speed: 70, lifeMs: 240 }));
        }
      }
    } else {
      audio.play('heal');
      if (this.scene.anims.exists('fx_aura')) {
        const fx = this.scene.add.sprite(x, y, 'fx_Aura').setScale(6).setDepth(DEPTH.fx).setTint(0x8fe3c8).play('fx_aura');
        this.scene.time.delayedCall(500, () => fx.destroy());
      }
      this.particles?.rise(x, y, { count: 6, color: 0x8fe3c8 });
    }
    const v = this.views.get(act.id);
    if (v) this.scene.tweens.add({ targets: v, alpha: 0, scale: 1.3, duration: effects.ms(160), onComplete: () => this.removeView(act.id) });
  }

  /** Shrink-and-fade a set of tiles, staggered in groups (board-blocked penalty). */
  async animateRemoval(tiles: Tile[]): Promise<void> {
    const step = effects.reduced ? 0 : Math.min(JUICE.stagger.clearMs, JUICE.stagger.clearMaxMs / Math.max(1, tiles.length));
    const ps: Promise<void>[] = [];
    tiles.forEach((t, i) => {
      const v = this.views.get(t.id);
      if (!v) return;
      ps.push(
        tweenAsync(this.scene, {
          targets: v,
          alpha: 0,
          scale: 0.3,
          delay: i * step,
          duration: effects.ms(200),
          ease: 'Quad.easeIn',
          onComplete: () => this.removeView(t.id),
        }),
      );
      if (this.particles && !effects.reduced) {
        const c = this.cellCenter(t.row, t.col);
        this.scene.time.delayedCall(i * step, () => this.particles?.burst(c.x, c.y, { count: 3, color: 0x8a8078, size: 5, speed: 50, lifeMs: 220 }));
      }
    });
    await Promise.all(ps);
    this.sync(true);
  }

  /** Brief highlight square behind a merged tile. */
  private glow(row: number, col: number, color: number): void {
    if (effects.reduced) return;
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
    audio.play('cancel', { volume: 0.35 });
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
