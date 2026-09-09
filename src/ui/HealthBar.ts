import Phaser from 'phaser';
import { COLORS, TEXT, textStyle } from './theme';

export interface HealthBarOptions {
  width: number;
  height?: number;
  fillColor?: number;
  lowColor?: number;
  backColor?: number;
  icon?: string;
  iconScale?: number;
  label?: string; // prefix e.g. "HP"
  showText?: boolean;
  fontSize?: number;
}

/**
 * Bar with numeric text - never colour-only. `set(current, max)` tweens the fill.
 * A trailing "ghost" fill shows recent damage.
 */
export class HealthBar extends Phaser.GameObjects.Container {
  private back: Phaser.GameObjects.Rectangle;
  private ghost: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private barWidth: number;
  private barHeight: number;
  private fillColor: number;
  private lowColor: number;
  private labelPrefix: string;
  private current = 1;
  private max = 1;

  constructor(scene: Phaser.Scene, x: number, y: number, opts: HealthBarOptions) {
    super(scene, x, y);
    this.barWidth = opts.width;
    this.barHeight = opts.height ?? 34;
    this.fillColor = opts.fillColor ?? COLORS.green;
    this.lowColor = opts.lowColor ?? COLORS.red;
    this.labelPrefix = opts.label ?? '';

    let offsetX = 0;
    if (opts.icon && scene.textures.exists(opts.icon)) {
      const icon = scene.add.image(-this.barWidth / 2 - 6, 0, opts.icon).setScale(opts.iconScale ?? 3).setOrigin(1, 0.5);
      this.add(icon);
      offsetX = 0;
    }

    this.back = scene.add.rectangle(offsetX, 0, this.barWidth, this.barHeight, opts.backColor ?? COLORS.ink, 0.9).setStrokeStyle(3, COLORS.woodLight);
    this.ghost = scene.add.rectangle(offsetX - this.barWidth / 2 + 3, 0, this.barWidth - 6, this.barHeight - 6, COLORS.parchment, 0.6).setOrigin(0, 0.5);
    this.fill = scene.add.rectangle(offsetX - this.barWidth / 2 + 3, 0, this.barWidth - 6, this.barHeight - 6, this.fillColor).setOrigin(0, 0.5);
    this.text = scene.add.text(offsetX, 0, '', textStyle(opts.fontSize ?? Math.round(this.barHeight * 0.62), { color: TEXT.white })).setOrigin(0.5);
    if (opts.showText === false) this.text.setVisible(false);
    this.add([this.back, this.ghost, this.fill, this.text]);
    scene.add.existing(this);
  }

  /** Immediately set without animation. */
  reset(current: number, max: number): void {
    this.current = current;
    this.max = Math.max(1, max);
    const w = this.innerWidth() * Phaser.Math.Clamp(current / this.max, 0, 1);
    this.fill.width = w;
    this.ghost.width = w;
    this.updateColor();
    this.updateText();
  }

  set(current: number, max = this.max, animate = true): void {
    const prevW = this.fill.width;
    this.current = current;
    this.max = Math.max(1, max);
    const w = this.innerWidth() * Phaser.Math.Clamp(current / this.max, 0, 1);
    this.updateText();
    this.updateColor();
    this.scene.tweens.killTweensOf([this.fill, this.ghost]);
    if (!animate) {
      this.fill.width = w;
      this.ghost.width = w;
      return;
    }
    if (w < prevW) {
      this.fill.width = w;
      this.ghost.width = prevW;
      this.scene.tweens.add({ targets: this.ghost, width: w, duration: 400, delay: 120, ease: 'Cubic.easeOut' });
    } else {
      this.ghost.width = w;
      this.scene.tweens.add({ targets: this.fill, width: w, duration: 300, ease: 'Cubic.easeOut' });
    }
  }

  private innerWidth(): number {
    return this.barWidth - 6;
  }

  private updateColor(): void {
    const ratio = this.current / this.max;
    this.fill.setFillStyle(ratio <= 0.3 ? this.lowColor : this.fillColor);
  }

  private updateText(): void {
    const prefix = this.labelPrefix ? `${this.labelPrefix} ` : '';
    this.text.setText(`${prefix}${Math.max(0, Math.round(this.current))} / ${Math.round(this.max)}`);
  }

  setLabel(text: string): void {
    this.text.setText(text);
  }
}
