import Phaser from 'phaser';
import { COLORS } from './theme';

export type PanelSkin = 'ui_panel' | 'ui_panel2' | 'ui_panel3' | 'ui_panel_interior' | 'ui_bg' | 'ui_bg2';

/**
 * Wooden nine-slice panel. The source art is 16x16, so the nine-slice is built at 1/PIXEL_SCALE size
 * and scaled up - this keeps the pixel border chunky instead of 1px thin.
 * Falls back to a drawn rounded rectangle if nine-slice is unavailable.
 */
export class Panel extends Phaser.GameObjects.Container {
  static readonly PIXEL_SCALE = 4;
  readonly panelWidth: number;
  readonly panelHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, skin: PanelSkin = 'ui_panel', alpha = 1) {
    super(scene, x, y);
    this.panelWidth = width;
    this.panelHeight = height;
    const s = Panel.PIXEL_SCALE;
    const factory = scene.add as unknown as { nineslice?: (...args: unknown[]) => Phaser.GameObjects.GameObject };
    if (typeof factory.nineslice === 'function' && scene.textures.exists(skin)) {
      const slice = scene.add.nineslice(0, 0, skin, undefined, Math.round(width / s), Math.round(height / s), 5, 5, 5, 5);
      slice.setScale(s);
      slice.setAlpha(alpha);
      this.add(slice);
    } else {
      const g = scene.add.graphics();
      g.fillStyle(COLORS.woodDark, alpha);
      g.fillRoundedRect(-width / 2, -height / 2, width, height, 12);
      g.lineStyle(6, COLORS.woodLight, alpha);
      g.strokeRoundedRect(-width / 2, -height / 2, width, height, 12);
      this.add(g);
    }
    scene.add.existing(this);
  }
}

/** Flat, cheap rectangle panel (drawn) for HUD strips where the wooden frame would be too heavy. */
export function flatPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = COLORS.ink, alpha = 0.55, radius = 10): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}
