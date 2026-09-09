import Phaser from 'phaser';
import { BODY_FONT, TITLE_FONT } from '../data/assets';

/** Palette: dark wood, parchment, bamboo, lantern gold. */
export const COLORS = {
  woodDarkest: 0x15110d,
  woodDark: 0x2b1d12,
  wood: 0x5a3a1e,
  woodLight: 0x8a5a2b,
  parchment: 0xf1e2c3,
  parchmentDark: 0xd8c39a,
  gold: 0xd9a441,
  goldLight: 0xffd97a,
  red: 0xc0392b,
  redDark: 0x7a1f16,
  green: 0x5cb85c,
  greenDark: 0x2e6b2e,
  blue: 0x4a90d9,
  purple: 0x8e5bd9,
  bamboo: 0x6f9a3d,
  ink: 0x1a1008,
  white: 0xffffff,
  black: 0x000000,
} as const;

export const TEXT = {
  light: '#f1e2c3',
  dark: '#2b1d12',
  gold: '#ffd97a',
  red: '#ff6b5b',
  green: '#8ee38e',
  blue: '#8fc4ff',
  purple: '#c9a6ff',
  muted: '#b8a98c',
  white: '#ffffff',
} as const;

export function hex(c: number): string {
  return '#' + c.toString(16).padStart(6, '0');
}

export interface StyleOpts {
  color?: string;
  stroke?: boolean;
  strokeColor?: string;
  strokeThickness?: number;
  align?: 'left' | 'center' | 'right';
  wordWrapWidth?: number;
  fontStyle?: string;
  shadow?: boolean;
}

function baseStyle(font: string, size: number, opts: StyleOpts): Phaser.Types.GameObjects.Text.TextStyle {
  const style: Phaser.Types.GameObjects.Text.TextStyle = {
    fontFamily: font,
    fontSize: `${size}px`,
    color: opts.color ?? TEXT.light,
    align: opts.align ?? 'center',
    fontStyle: opts.fontStyle,
  };
  if (opts.stroke !== false) {
    style.stroke = opts.strokeColor ?? '#1a1008';
    style.strokeThickness = opts.strokeThickness ?? Math.max(3, Math.round(size / 7));
  }
  if (opts.wordWrapWidth) style.wordWrap = { width: opts.wordWrapWidth, useAdvancedWrap: true };
  if (opts.shadow) style.shadow = { offsetX: 0, offsetY: 3, color: '#000000', blur: 0, fill: true };
  return style;
}

/** Body text: bold system font with an ink outline - readable at small sizes on phones. */
export function textStyle(size: number, opts: StyleOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return baseStyle(BODY_FONT, size, { fontStyle: 'bold', ...opts });
}

/**
 * Heading text in the pack's pixel font. Its space glyph is only ~3px wide, so pass strings
 * through `heading()` to pad word gaps.
 */
export function titleStyle(size: number, opts: StyleOpts = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return baseStyle(TITLE_FONT, size, opts);
}

/** Widen word gaps for the pixel font (see titleStyle). */
export function heading(text: string): string {
  return text.replace(/ /g, '   ');
}

/** Depth layers so overlays always win. */
export const DEPTH = {
  background: 0,
  decor: 5,
  content: 10,
  board: 20,
  tiles: 30,
  fx: 40,
  hud: 50,
  floating: 60,
  toast: 90,
  modal: 100,
} as const;
