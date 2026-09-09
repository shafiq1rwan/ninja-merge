import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { Button, type ButtonOptions } from './Button';
import { Panel, type PanelSkin } from './Panel';
import { DEPTH, heading, TEXT, textStyle, titleStyle, type StyleOpts } from './theme';

interface Item {
  h: number;
  place: (top: number) => void;
}

export interface CardOptions {
  /** Centre x (default: screen centre). */
  x?: number;
  width?: number;
  /** Either anchor the top edge... */
  top?: number;
  /** ...or centre the card vertically on this y. */
  centerY?: number;
  padding?: number;
  gap?: number;
  skin?: PanelSkin;
  depth?: number;
}

/**
 * Vertical flow layout inside a Panel. Add content top-to-bottom (titles, text, buttons, custom rows),
 * then call finish(): the panel is sized to fit and everything - buttons included - sits inside it.
 * All screens use this so cards look and behave the same.
 */
export class Card {
  private scene: Phaser.Scene;
  private items: Item[] = [];
  private objects: Phaser.GameObjects.GameObject[] = [];
  readonly x: number;
  readonly width: number;
  readonly padding: number;
  readonly gap: number;
  private opts: CardOptions;
  container?: Phaser.GameObjects.Container;
  height = 0;

  constructor(scene: Phaser.Scene, opts: CardOptions = {}) {
    this.scene = scene;
    this.opts = opts;
    this.x = opts.x ?? GAME_WIDTH / 2;
    this.width = opts.width ?? GAME_WIDTH - 48;
    this.padding = opts.padding ?? 28;
    this.gap = opts.gap ?? 14;
  }

  get innerWidth(): number {
    return this.width - this.padding * 2;
  }

  /** Pixel-font heading. */
  title(text: string, size = 44, color: string = TEXT.gold): Phaser.GameObjects.Text {
    const t = this.scene.add.text(this.x, 0, heading(text), titleStyle(size, { color, wordWrapWidth: this.innerWidth })).setOrigin(0.5, 0);
    this.objects.push(t);
    this.items.push({ h: t.height, place: (top) => t.setY(top) });
    return t;
  }

  /** Body text, centred by default. Pass align 'left' to hug the left padding. */
  text(text: string, size = 24, opts: StyleOpts = {}): Phaser.GameObjects.Text {
    const align = opts.align ?? 'center';
    const t = this.scene.add.text(0, 0, text, textStyle(size, { wordWrapWidth: this.innerWidth, ...opts, align }));
    if (align === 'left') t.setOrigin(0, 0).setX(this.x - this.innerWidth / 2);
    else if (align === 'right') t.setOrigin(1, 0).setX(this.x + this.innerWidth / 2);
    else t.setOrigin(0.5, 0).setX(this.x);
    this.objects.push(t);
    this.items.push({ h: t.height, place: (top) => t.setY(top) });
    return t;
  }

  /** Full-width button (or narrower via opts.width). */
  button(label: string, onClick: () => void, opts: ButtonOptions = {}): Button {
    const h = opts.height ?? 88;
    const b = new Button(this.scene, this.x, 0, label, onClick, { width: this.innerWidth, ...opts, height: h });
    this.objects.push(b);
    this.items.push({ h: h + 6, place: (top) => b.setY(top + h / 2) });
    return b;
  }

  /** Several buttons side by side in one row. */
  buttonRow(defs: { label: string; onClick: () => void; opts?: ButtonOptions }[], height = 84, gap = 16): Button[] {
    const w = (this.innerWidth - gap * (defs.length - 1)) / defs.length;
    const startX = this.x - this.innerWidth / 2 + w / 2;
    const buttons = defs.map((d, i) => new Button(this.scene, startX + i * (w + gap), 0, d.label, d.onClick, { ...d.opts, width: w, height }));
    this.objects.push(...buttons);
    this.items.push({ h: height + 6, place: (top) => buttons.forEach((b) => b.setY(top + height / 2)) });
    return buttons;
  }

  /** Any game object with a centre origin; positioned at the vertical middle of a slot of height h. */
  object<T extends Phaser.GameObjects.GameObject & { setY: (y: number) => T }>(obj: T, h: number): T {
    this.objects.push(obj);
    this.items.push({ h, place: (top) => obj.setY(top + h / 2) });
    return obj;
  }

  /** Custom row: builder receives (centreX, slotTop, innerWidth) and returns the objects it created. */
  custom(h: number, build: (cx: number, top: number, innerWidth: number) => Phaser.GameObjects.GameObject[]): void {
    this.items.push({
      h,
      place: (top) => {
        const created = build(this.x, top, this.innerWidth);
        this.objects.push(...created);
        this.container?.add(created);
      },
    });
  }

  spacer(h: number): void {
    this.items.push({ h, place: () => undefined });
  }

  /** Thin divider line. */
  divider(): void {
    this.custom(10, (cx, top, w) => {
      const g = this.scene.add.graphics();
      g.lineStyle(2, 0x8a5a2b, 0.6);
      g.lineBetween(cx - w / 2, top + 5, cx + w / 2, top + 5);
      return [g];
    });
  }

  /** Lay everything out, draw the panel behind it and return the container. */
  finish(): Phaser.GameObjects.Container {
    const content = this.items.reduce((a, it) => a + it.h, 0) + this.gap * Math.max(0, this.items.length - 1);
    this.height = content + this.padding * 2;
    const top = this.opts.top ?? (this.opts.centerY ?? 640) - this.height / 2;
    const panel = new Panel(this.scene, this.x, top + this.height / 2, this.width, this.height, this.opts.skin ?? 'ui_panel');
    const c = this.scene.add.container(0, 0).setDepth(this.opts.depth ?? DEPTH.content);
    this.container = c;
    c.add(panel);
    let y = top + this.padding;
    for (const it of this.items) {
      it.place(y);
      y += it.h + this.gap;
    }
    c.add(this.objects.filter((o) => o.parentContainer !== c));
    return c;
  }

  get top(): number {
    return (this.container ? (this.container.list[0] as Panel).y : 0) - this.height / 2;
  }
  get bottom(): number {
    return this.top + this.height;
  }
}
