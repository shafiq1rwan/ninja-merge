import Phaser from 'phaser';
import { COLORS } from './theme';

/** Kept for call-site compatibility; skins now only pick a border colour. */
export type PanelSkin = 'ui_panel' | 'ui_panel2' | 'ui_panel3' | 'ui_panel_interior' | 'ui_bg' | 'ui_bg2';

const BORDER: Record<PanelSkin, number> = {
  ui_panel: COLORS.woodLight,
  ui_panel2: COLORS.wood,
  ui_panel3: COLORS.gold,
  ui_panel_interior: COLORS.wood,
  ui_bg: COLORS.wood,
  ui_bg2: COLORS.wood,
};

/**
 * Flat card: dark translucent fill with a thin border and rounded corners.
 * Deliberately no inner shading or bevel - it read badly at every screen size.
 */
export class Panel extends Phaser.GameObjects.Container {
  readonly panelWidth: number;
  readonly panelHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number, skin: PanelSkin = 'ui_panel', alpha = 1) {
    super(scene, x, y);
    this.panelWidth = width;
    this.panelHeight = height;
    const g = scene.add.graphics();
    g.fillStyle(COLORS.woodDark, 0.92 * alpha);
    g.fillRoundedRect(-width / 2, -height / 2, width, height, 16);
    g.lineStyle(4, BORDER[skin] ?? COLORS.woodLight, alpha);
    g.strokeRoundedRect(-width / 2, -height / 2, width, height, 16);
    this.add(g);
    scene.add.existing(this);
  }
}

/** Flat, cheap rectangle panel (drawn) for HUD strips. */
export function flatPanel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill = COLORS.ink, alpha = 0.55, radius = 10): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x - w / 2, y - h / 2, w, h, radius);
  return g;
}
