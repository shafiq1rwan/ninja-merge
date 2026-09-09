import Phaser from 'phaser';

/** Promise wrapper around a tween so battle sequences can be written linearly with await. */
export function tweenAsync(scene: Phaser.Scene, config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
  return new Promise((resolve) => {
    const userComplete = config.onComplete as ((...args: unknown[]) => void) | undefined;
    scene.tweens.add({
      ...config,
      onComplete: (...args: unknown[]) => {
        userComplete?.(...args);
        resolve();
      },
    });
  });
}

export function delay(scene: Phaser.Scene, ms: number): Promise<void> {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}
