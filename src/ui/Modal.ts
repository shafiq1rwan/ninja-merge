import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { Button } from './Button';
import { Panel } from './Panel';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from './theme';

export interface ModalButton {
  label: string;
  onClick?: () => void;
  color?: string;
  /** Keep the modal open after clicking. */
  keepOpen?: boolean;
}

export interface ModalOptions {
  title: string;
  message?: string;
  buttons: ModalButton[];
  width?: number;
  /** Extra content builder; receives the modal container and the inner content top y. */
  content?: (container: Phaser.GameObjects.Container, contentTop: number, width: number) => number;
  /** Tapping the dim background closes the modal. */
  dismissible?: boolean;
}

/**
 * Blocking dialog: dim overlay (swallows input), wooden panel, title, message, buttons stacked for touch.
 */
export class Modal extends Phaser.GameObjects.Container {
  private overlay: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene, opts: ModalOptions) {
    super(scene, 0, 0);
    this.setDepth(DEPTH.modal);

    this.overlay = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.65).setInteractive();
    this.add(this.overlay);
    if (opts.dismissible) this.overlay.on(Phaser.Input.Events.POINTER_UP, () => this.close());

    const width = opts.width ?? 600;
    const buttonH = 88;
    const gap = 16;
    const messageText = opts.message
      ? scene.add.text(0, 0, opts.message, textStyle(28, { color: TEXT.light, wordWrapWidth: width - 80, align: 'center' })).setOrigin(0.5, 0)
      : null;

    // Measure content height first.
    const titleH = 60;
    const msgH = messageText ? messageText.height + 16 : 0;
    const tmp = scene.add.container(0, 0);
    let extraH = 0;
    if (opts.content) extraH = opts.content(tmp, 0, width);
    const buttonsH = opts.buttons.length * (buttonH + gap);
    const height = 40 + titleH + msgH + extraH + buttonsH + 24;

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    const panel = new Panel(scene, cx, cy, width, height, 'ui_panel');
    this.add(panel);

    let y = cy - height / 2 + 34;
    const title = scene.add.text(cx, y, heading(opts.title), titleStyle(36, { color: TEXT.gold, wordWrapWidth: width - 60 })).setOrigin(0.5, 0);
    this.add(title);
    y += titleH;
    if (messageText) {
      messageText.setPosition(cx, y);
      this.add(messageText);
      y += msgH;
    }
    if (opts.content) {
      tmp.setPosition(cx, y);
      this.add(tmp);
      y += extraH;
    }
    y += 12;
    for (const b of opts.buttons) {
      const btn = new Button(scene, cx, y + buttonH / 2, b.label, () => {
        b.onClick?.();
        if (!b.keepOpen) this.close();
      }, { width: width - 100, height: buttonH, color: b.color });
      this.add(btn);
      y += buttonH + gap;
    }

    scene.add.existing(this);
    // Pop-in
    this.setScale(0.96).setAlpha(0);
    scene.tweens.add({ targets: this, alpha: 1, scale: 1, duration: 140, ease: 'Back.easeOut' });
  }

  close(): void {
    this.scene.tweens.add({ targets: this, alpha: 0, duration: 100, onComplete: () => this.destroy() });
  }
}

/** Convenience: yes/no confirmation. */
export function confirmModal(scene: Phaser.Scene, title: string, message: string, onYes: () => void, yesLabel = 'Yes', noLabel = 'Cancel'): Modal {
  return new Modal(scene, {
    title,
    message,
    buttons: [
      { label: yesLabel, onClick: onYes, color: TEXT.gold },
      { label: noLabel },
    ],
  });
}
