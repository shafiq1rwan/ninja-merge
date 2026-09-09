import Phaser from 'phaser';
import { GAME_WIDTH } from '../config/gameConfig';
import { flatPanel } from './Panel';
import { DEPTH, TEXT, textStyle } from './theme';

/** Short, non-blocking notification that slides in from the top and fades. */
export function toast(scene: Phaser.Scene, message: string, color: string = TEXT.light, y = 140, duration = 1600): void {
  const text = scene.add.text(0, 0, message, textStyle(28, { color, wordWrapWidth: GAME_WIDTH - 120 })).setOrigin(0.5);
  const w = text.width + 60;
  const h = text.height + 28;
  const bg = flatPanel(scene, 0, 0, w, h, 0x1a1008, 0.85, 12);
  const c = scene.add.container(GAME_WIDTH / 2, y - 30, [bg, text]).setDepth(DEPTH.toast).setAlpha(0);
  scene.tweens.add({ targets: c, y, alpha: 1, duration: 160, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: c, alpha: 0, y: y - 20, delay: duration, duration: 220, onComplete: () => c.destroy() });
}
