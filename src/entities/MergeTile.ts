import Phaser from 'phaser';
import { charFaceKey } from '../data/assets';
import { RANKS } from '../data/ranks';
import type { Tile } from '../types';
import { COLORS, TEXT, textStyle } from '../ui/theme';

export const TILE_SIZE = 140;

/**
 * Visual for one logical tile. Purely presentational - BoardView keeps it in sync with BoardSystem.
 */
export class TileView extends Phaser.GameObjects.Container {
  tileId: number;
  kind: Tile['kind'];
  rank: number;
  private bg: Phaser.GameObjects.Rectangle;
  private badgeText?: Phaser.GameObjects.Text;
  private caption?: Phaser.GameObjects.Text;

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

  /** Refresh dynamic data (blocked tile countdown). */
  updateBlocked(tile: Tile): void {
    if (this.kind === 'blocked' && this.caption) {
      this.caption.setText(tile.ttl !== undefined ? `LOCKED ${tile.ttl}` : 'LOCKED');
    }
  }

  get glowColor(): number {
    return this.kind === 'ninja' ? RANKS[this.rank].accent : 0xffffff;
  }
}
