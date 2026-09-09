import Phaser from 'phaser';
import { MIN_TOUCH } from '../config/gameConfig';
import { audio } from '../systems/AudioSystem';
import { COLORS, TEXT, textStyle } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  /** Text colour override (defaults per variant). */
  color?: string;
  variant?: ButtonVariant;
  icon?: string; // texture key drawn left of the label
  iconScale?: number;
  disabled?: boolean;
  /** Skip the click sound (e.g. when the scene plays its own). */
  silent?: boolean;
  /** Render as primary (used for selected tabs). */
  selected?: boolean;
}

interface Skin { fill: number; border: number; shadow: number; text: string }

const SKINS: Record<ButtonVariant, Skin> = {
  primary: { fill: COLORS.gold, border: 0x8a5a2b, shadow: 0x8a5a2b, text: TEXT.dark },
  secondary: { fill: COLORS.woodLight, border: 0x5a3a1e, shadow: 0x3a2412, text: TEXT.light },
  danger: { fill: 0xa23b32, border: 0x6a1f18, shadow: 0x4a1410, text: TEXT.light },
};

const DISABLED: Skin = { fill: 0x4a4038, border: 0x2a241e, shadow: 0x2a241e, text: TEXT.muted };
const RADIUS = 12;
const SHADOW = 5;

type State = 'normal' | 'hover' | 'pressed';

/**
 * Flat drawn button with a solid drop edge for depth, hover lightening and a press-down animation.
 * Always at least MIN_TOUCH tall so it is comfortable on phones.
 */
export class Button extends Phaser.GameObjects.Container {
  private g: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private hit: Phaser.GameObjects.Rectangle;
  private disabled = false;
  private variant: ButtonVariant;
  private visual: State = 'normal';
  private textColor?: string;
  readonly buttonWidth: number;
  readonly buttonHeight: number;
  private onClick: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.onClick = onClick;
    this.variant = opts.variant ?? (opts.selected ? 'primary' : 'secondary');
    this.textColor = opts.color;
    const w = (this.buttonWidth = Math.max(opts.width ?? 320, MIN_TOUCH));
    const h = (this.buttonHeight = Math.max(opts.height ?? MIN_TOUCH, MIN_TOUCH));

    this.g = scene.add.graphics();
    this.add(this.g);

    const fontSize = opts.fontSize ?? 30;
    this.label = scene.add.text(0, 0, text, textStyle(fontSize, { color: this.skin().text, strokeThickness: 0, stroke: false })).setOrigin(0.5);
    if (opts.icon && scene.textures.exists(opts.icon)) {
      this.icon = scene.add.image(0, 0, opts.icon).setScale(opts.iconScale ?? 3);
      const gap = 14;
      const total = this.icon.displayWidth + gap + this.label.width;
      this.icon.setX(-total / 2 + this.icon.displayWidth / 2);
      this.label.setX(-total / 2 + this.icon.displayWidth + gap + this.label.width / 2);
      this.add(this.icon);
    }
    this.add(this.label);

    this.hit = scene.add.rectangle(0, 0, w, h + SHADOW, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.add(this.hit);

    this.hit.on(Phaser.Input.Events.POINTER_OVER, () => this.setVisual('hover'));
    this.hit.on(Phaser.Input.Events.POINTER_OUT, () => this.setVisual('normal'));
    this.hit.on(Phaser.Input.Events.POINTER_DOWN, () => { if (!this.disabled) this.setVisual('pressed'); });
    this.hit.on(Phaser.Input.Events.POINTER_UP, (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      if (this.disabled) return;
      event?.stopPropagation?.();
      this.setVisual('hover');
      if (!opts.silent) audio.play('button');
      this.onClick();
    });
    this.hit.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => this.setVisual('normal'));

    if (opts.disabled) this.setDisabled(true);
    else this.draw();
    scene.add.existing(this);
  }

  private skin(): Skin {
    return this.disabled ? DISABLED : SKINS[this.variant];
  }

  private setVisual(s: State): void {
    if (this.visual === s) return;
    this.visual = s;
    this.draw();
  }

  private draw(): void {
    const w = this.buttonWidth;
    const h = this.buttonHeight;
    const skin = this.skin();
    const pressed = this.visual === 'pressed' && !this.disabled;
    let fill = skin.fill;
    if (this.visual === 'hover' && !this.disabled) {
      const c = Phaser.Display.Color.IntegerToColor(fill).lighten(8);
      fill = c.color;
    }
    const g = this.g;
    g.clear();
    const dy = pressed ? SHADOW - 1 : 0;
    if (!pressed) {
      g.fillStyle(skin.shadow, 1);
      g.fillRoundedRect(-w / 2, -h / 2 + SHADOW, w, h, RADIUS);
    }
    g.fillStyle(fill, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + dy, w, h, RADIUS);
    g.lineStyle(3, skin.border, 1);
    g.strokeRoundedRect(-w / 2, -h / 2 + dy, w, h, RADIUS);
    const contentY = dy - 1;
    this.label.setY(contentY).setColor(this.disabled ? DISABLED.text : this.textColor ?? skin.text);
    this.icon?.setY(contentY);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setDisabled(v: boolean): this {
    this.disabled = v;
    this.label.setAlpha(v ? 0.6 : 1);
    this.icon?.setAlpha(v ? 0.5 : 1);
    if (v) this.hit.disableInteractive();
    else this.hit.setInteractive({ useHandCursor: true });
    this.draw();
    return this;
  }

  setSelected(v: boolean): this {
    this.variant = v ? 'primary' : 'secondary';
    this.draw();
    return this;
  }

  setVariant(v: ButtonVariant): this {
    this.variant = v;
    this.draw();
    return this;
  }

  setOnClick(fn: () => void): this {
    this.onClick = fn;
    return this;
  }
}

/** Small square icon button (pause, close, back). */
export function iconButton(scene: Phaser.Scene, x: number, y: number, glyph: string, onClick: () => void, size = MIN_TOUCH): Button {
  return new Button(scene, x, y, glyph, onClick, { width: size, height: size, fontSize: 34 });
}
