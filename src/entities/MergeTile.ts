import Phaser from 'phaser';
import { charFaceKey } from '../data/assets';
import { TILE_SIZE } from '../data/battleAssets';
import { JUICE } from '../data/juice';
import { RANKS } from '../data/ranks';
import { effects } from '../settings/EffectsSettings';
import type { Tile } from '../types';
import { COLORS, TEXT, textStyle } from '../ui/theme';

export { TILE_SIZE };

/**
 * Visual for one logical tile. Purely presentational - BoardView keeps it in sync with BoardSystem.
 *
 * Rank treatments escalate so a powerful ninja reads as valuable without every tile glowing:
 *   rank 1-3   plain
 *   rank 4+    accent corner pips
 *   rank 7+    a small blinking pixel sparkle
 *   rank 10+   a restrained pulsing outline
 * All flourishes are disabled under Reduced Motion / Effects: Low.
 */
export class TileView extends Phaser.GameObjects.Container {
  tileId: number;
  kind: Tile['kind'];
  rank: number;
  private bg: Phaser.GameObjects.Rectangle;
  private badgeText?: Phaser.GameObjects.Text;
  private caption?: Phaser.GameObjects.Text;
  private flourishes: Phaser.Tweens.Tween[] = [];

  constructor(scene: Phaser.Scene, x: number, y: number, tile: Tile) {
    super(scene, x, y);
    this.tileId = tile.id;
    this.kind = tile.kind;
    this.rank = tile.rank;
    const inner = TILE_SIZE - 8;

    this.bg = scene.add.rectangle(0, 0, inner, inner, COLORS.wood).setStrokeStyle(5, COLORS.woodLight);
    this.add(this.bg);

    if (tile.kind === 'ninja') {
      const def = RANKS[tile.rank];
      this.bg.setFillStyle(def.color).setStrokeStyle(5, def.accent);
      const faceKey = charFaceKey(def.character);
      if (scene.textures.exists(faceKey)) {
        this.add(scene.add.image(0, -4, faceKey).setScale(3));
      } else {
        this.add(scene.add.text(0, -6, def.name, textStyle(20, { wordWrapWidth: inner - 12 })).setOrigin(0.5));
      }
      // Rank badge (bottom-right) - the "small level indicator".
      const badge = scene.add.rectangle(inner / 2 - 22, inner / 2 - 18, 40, 30, COLORS.ink, 0.85).setStrokeStyle(2, def.accent);
      this.badgeText = scene.add.text(inner / 2 - 22, inner / 2 - 18, `${tile.rank}`, textStyle(22, { color: TEXT.gold, strokeThickness: 3 })).setOrigin(0.5);
      this.add([badge, this.badgeText]);
      this.decorateRank(scene, tile.rank, inner, def.accent);
    } else if (tile.kind === 'potion') {
      this.bg.setFillStyle(0x1f5f4f).setStrokeStyle(5, 0x8fe3c8);
      if (scene.textures.exists('item_LifePot')) this.add(scene.add.image(0, -10, 'item_LifePot').setScale(7));
      this.caption = scene.add.text(0, inner / 2 - 18, 'POTION', textStyle(18, { color: '#8fe3c8' })).setOrigin(0.5);
      this.add(this.caption);
    } else if (tile.kind === 'bomb') {
      this.bg.setFillStyle(0x3a2a2a).setStrokeStyle(5, 0xff8a5b);
      if (scene.textures.exists('item_Bomb')) this.add(scene.add.image(0, -10, 'item_Bomb').setScale(6.5));
      this.caption = scene.add.text(0, inner / 2 - 18, 'BOMB', textStyle(18, { color: '#ff8a5b' })).setOrigin(0.5);
      this.add(this.caption);
      // A bomb visibly ticks so it reads as dangerous.
      if (!effects.reduced) {
        this.flourishes.push(scene.tweens.add({ targets: this.bg, strokeAlpha: 0.35, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }));
      }
    } else {
      // blocked
      this.bg.setFillStyle(0x3b3733).setStrokeStyle(5, 0x6b6560);
      const g = scene.add.graphics();
      g.lineStyle(8, 0x8a8078, 0.9);
      g.lineBetween(-36, -36, 36, 36);
      g.lineBetween(36, -36, -36, 36);
      this.add(g);
      this.caption = scene.add.text(0, inner / 2 - 20, '', textStyle(18, { color: TEXT.muted })).setOrigin(0.5);
      this.add(this.caption);
      this.updateBlocked(tile);
    }
    scene.add.existing(this);
  }

  /** Permanent, restrained rank flourishes. */
  private decorateRank(scene: Phaser.Scene, rank: number, inner: number, accent: number): void {
    if (rank >= JUICE.tile.detailRank) {
      const pip = 8;
      const off = inner / 2 - 10;
      for (const [sx, sy] of [[-1, -1], [1, -1]] as const) {
        this.add(scene.add.rectangle(sx * off, sy * off, pip, pip, accent, 0.9));
      }
    }
    if (!effects.tileFlourishes) return;
    if (rank >= JUICE.tile.sparkleRank) {
      const sparkle = scene.add.rectangle(inner / 2 - 16, -inner / 2 + 16, 6, 6, 0xffffff, 1);
      this.add(sparkle);
      this.flourishes.push(
        scene.tweens.add({
          targets: sparkle,
          alpha: { from: 0.15, to: 1 },
          duration: 620,
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
          delay: Phaser.Math.Between(0, 400),
        }),
      );
    }
    if (rank >= JUICE.tile.auraRank) {
      const aura = scene.add.rectangle(0, 0, inner + 10, inner + 10, 0x000000, 0).setStrokeStyle(3, accent, 0.5);
      this.addAt(aura, 0);
      this.flourishes.push(
        scene.tweens.add({ targets: aura, strokeAlpha: { from: 0.15, to: 0.6 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' }),
      );
    }
  }

  /** Tiny settle after sliding into place - a hint of weight, not a bounce. */
  settle(): void {
    if (effects.reduced || !this.scene) return;
    this.scene.tweens.add({
      targets: this,
      scaleY: JUICE.tile.settleScale,
      duration: effects.ms(JUICE.tile.settleMs) / 2,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.setScale(1),
    });
  }

  /** Refresh dynamic data (blocked tile countdown). */
  updateBlocked(tile: Tile): void {
    if (this.kind === 'blocked' && this.caption) {
      this.caption.setText(tile.ttl !== undefined ? `LOCKED ${tile.ttl}` : 'LOCKED');
    }
  }

  get glowColor(): number {
    return this.kind === 'ninja' ? RANKS[this.rank].accent : 0xffffff;
  }

  destroy(fromScene?: boolean): void {
    for (const t of this.flourishes) t.remove();
    this.flourishes.length = 0;
    super.destroy(fromScene);
  }
}
