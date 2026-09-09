import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { effects } from '../settings/EffectsSettings';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from './theme';

export interface BannerOptions {
  /** Main line, pixel font. */
  title: string;
  /** Optional smaller line under it. */
  subtitle?: string;
  color?: string;
  titleSize?: number;
  /** Total time on screen including the in/out animation. */
  durationMs?: number;
  /** Dim the scene behind the banner (elite / boss). */
  dim?: number;
  y?: number;
}

/**
 * Short pixel-art banner ("WAVE 4", "ELITE WAVE", "WAVE CLEARED") that animates itself away.
 * Never needs a button and never blocks input on its own - the caller decides whether to wait.
 */
export function showBanner(scene: Phaser.Scene, opts: BannerOptions): Promise<void> {
  const y = opts.y ?? 430;
  const total = effects.ms(opts.durationMs ?? 640);
  const inMs = Math.min(180, total * 0.3);
  const outMs = Math.min(200, total * 0.3);
  const hold = Math.max(60, total - inMs - outMs);
  const objects: Phaser.GameObjects.GameObject[] = [];

  let dim: Phaser.GameObjects.Rectangle | undefined;
  if (opts.dim) {
    dim = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0).setDepth(DEPTH.floating - 1);
    objects.push(dim);
    scene.tweens.add({ targets: dim, fillAlpha: opts.dim, duration: inMs });
  }

  const title = scene.add
    .text(GAME_WIDTH / 2, y, heading(opts.title), titleStyle(opts.titleSize ?? 52, { color: opts.color ?? TEXT.gold }))
    .setOrigin(0.5)
    .setDepth(DEPTH.floating)
    .setAlpha(0);
  objects.push(title);
  const sub = opts.subtitle
    ? scene.add
        .text(GAME_WIDTH / 2, y + 52, opts.subtitle, textStyle(22, { color: TEXT.light, wordWrapWidth: GAME_WIDTH - 120 }))
        .setOrigin(0.5, 0)
        .setDepth(DEPTH.floating)
        .setAlpha(0)
    : null;
  if (sub) objects.push(sub);

  return new Promise((resolve) => {
    scene.tweens.add({
      targets: title,
      alpha: 1,
      scale: { from: effects.reduced ? 1 : 1.18, to: 1 },
      duration: inMs,
      ease: 'Back.easeOut',
    });
    if (sub) scene.tweens.add({ targets: sub, alpha: 1, duration: inMs, delay: 60 });
    scene.tweens.add({
      targets: sub ? [title, sub] : title,
      alpha: 0,
      y: `-=${effects.reduced ? 6 : 18}`,
      delay: inMs + hold,
      duration: outMs,
      onComplete: () => {
        if (dim) {
          scene.tweens.add({ targets: dim, fillAlpha: 0, duration: outMs, onComplete: () => dim?.destroy() });
        }
        for (const o of objects) if (o !== dim) o.destroy();
        resolve();
      },
    });
  });
}
