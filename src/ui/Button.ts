import Phaser from 'phaser';
import { MIN_TOUCH } from '../config/gameConfig';
import { audio } from '../systems/AudioSystem';
import { TEXT, textStyle } from './theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  icon?: string; // texture key drawn left of the label
  iconScale?: number;
  disabled?: boolean;
  /** Skip the click sound (e.g. when the scene plays its own). */
  silent?: boolean;
  /** Use the "pressed" wood skin permanently (for selected tabs). */
  selected?: boolean;
}

/**
 * Wooden pixel button with hover/press/disabled states and a comfortably large hit area.
 * Uses a scaled nine-slice of button_normal.png (16x8, 3px borders).
 */
export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.NineSlice | Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private icon?: Phaser.GameObjects.Image;
  private hit: Phaser.GameObjects.Rectangle;
  private disabled = false;
  private selectedSkin = false;
  readonly buttonWidth: number;
  readonly buttonHeight: number;
  private onClick: () => void;
  private opts: ButtonOptions;

  constructor(scene: Phaser.Scene, x: number, y: number, text: string, onClick: () => void, opts: ButtonOptions = {}) {
    super(scene, x, y);
    this.opts = opts;
    this.onClick = onClick;
    const w = (this.buttonWidth = Math.max(opts.width ?? 320, MIN_TOUCH));
    const h = (this.buttonHeight = Math.max(opts.height ?? MIN_TOUCH, MIN_TOUCH));
    this.selectedSkin = !!opts.selected;

    const factory = scene.add as unknown as { nineslice?: unknown };
    if (typeof factory.nineslice === 'function' && scene.textures.exists('ui_btn')) {
      const s = 4;
      this.bg = scene.add.nineslice(0, 0, this.skinFor('normal'), undefined, Math.round(w / s), Math.round(h / s), 3, 3, 3, 3).setScale(s);
    } else {
      this.bg = scene.add.rectangle(0, 0, w, h, 0x8a5a2b).setStrokeStyle(4, 0x2b1d12);
    }
    this.add(this.bg);

    const fontSize = opts.fontSize ?? 30;
    this.label = scene.add.text(0, -2, text, textStyle(fontSize, { color: opts.color ?? TEXT.light })).setOrigin(0.5);
    if (opts.icon && scene.textures.exists(opts.icon)) {
      this.icon = scene.add.image(0, 0, opts.icon).setScale(opts.iconScale ?? 3);
      const gap = 14;
      const total = this.icon.displayWidth + gap + this.label.width;
      this.icon.setX(-total / 2 + this.icon.displayWidth / 2);
      this.label.setX(-total / 2 + this.icon.displayWidth + gap + this.label.width / 2);
      this.add(this.icon);
    }
    this.add(this.label);

    this.hit = scene.add.rectangle(0, 0, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
    this.add(this.hit);

    this.hit.on(Phaser.Input.Events.POINTER_OVER, () => this.setSkin('hover'));
    this.hit.on(Phaser.Input.Events.POINTER_OUT, () => this.setSkin('normal'));
    this.hit.on(Phaser.Input.Events.POINTER_DOWN, () => {
      if (this.disabled) return;
      this.setSkin('pressed');
      this.label.setY(2);
    });
    this.hit.on(Phaser.Input.Events.POINTER_UP, (_p: Phaser.Input.Pointer, _x: number, _y: number, event: Phaser.Types.Input.EventData) => {
      if (this.disabled) return;
      event?.stopPropagation?.();
      this.setSkin('hover');
      this.label.setY(-2);
      if (!opts.silent) audio.play('button');
      this.onClick();
    });
    this.hit.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, () => {
      this.setSkin('normal');
      this.label.setY(-2);
    });

    if (opts.disabled) this.setDisabled(true);
    scene.add.existing(this);
  }

  private skinFor(state: 'normal' | 'hover' | 'pressed' | 'disabled'): string {
    if (this.disabled) return 'ui_btn_disabled';
    if (this.selectedSkin) return 'ui_btn_pressed';
    switch (state) {
      case 'hover': return 'ui_btn_hover';
      case 'pressed': return 'ui_btn_pressed';
      case 'disabled': return 'ui_btn_disabled';
      default: return 'ui_btn';
    }
  }

  private setSkin(state: 'normal' | 'hover' | 'pressed' | 'disabled'): void {
    if (this.bg instanceof Phaser.GameObjects.NineSlice) this.bg.setTexture(this.skinFor(state));
    else this.bg.setFillStyle(this.disabled ? 0x4a3a2a : state === 'pressed' ? 0x6a4520 : state === 'hover' ? 0x9a6a3b : 0x8a5a2b);
  }

  setText(text: string): this {
    this.label.setText(text);
    return this;
  }

  setDisabled(v: boolean): this {
    this.disabled = v;
    this.setSkin('normal');
    this.label.setAlpha(v ? 0.5 : 1);
    this.icon?.setAlpha(v ? 0.5 : 1);
    if (v) this.hit.disableInteractive();
    else this.hit.setInteractive({ useHandCursor: true });
    return this;
  }

  setSelected(v: boolean): this {
    this.selectedSkin = v;
    this.setSkin('normal');
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
