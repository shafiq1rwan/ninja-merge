import Phaser from 'phaser';

/**
 * Promise wrapper around a tween so battle sequences can be written linearly with await.
 *
 * The promise settles when the tween completes OR is stopped, and - as a last line of defence -
 * after the tween's expected running time plus a small margin. A tween whose target is destroyed
 * mid-flight (e.g. a board re-sync during an animation) must never leave the battle loop waiting forever.
 */
export function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      resolve();
    };
    const userComplete = config.onComplete as ((...args: unknown[]) => void) | undefined;
    const userStop = config.onStop as ((...args: unknown[]) => void) | undefined;
    scene.tweens.add({
      ...config,
      onComplete: (...args: unknown[]) => {
        userComplete?.(...args);
        finish();
      },
      onStop: (...args: unknown[]) => {
        userStop?.(...args);
        finish();
      },
    });
    const num = (v: unknown, fallback: number) => (typeof v === 'number' ? v : fallback);
    const duration = num(config.duration, 1000);
    const repeat = Math.max(0, num(config.repeat, 0));
    const cycles = config.yoyo ? 2 : 1;
    const estimate = num(config.delay, 0) + (duration * cycles + num(config.hold, 0) + num(config.repeatDelay, 0)) * (repeat + 1) + 150;
    scene.time.delayedCall(estimate, finish);
  });
}

export function delay(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}
