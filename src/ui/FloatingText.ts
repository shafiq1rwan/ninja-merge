import Phaser from 'phaser';
import { ANIM } from '../data/balance';
import { motion } from './motion';
import { DEPTH, heading, titleStyle } from './theme';

export interface FloatOpts {
  size?: number;
  color?: string;
  rise?: number;
  duration?: number;
  scaleFrom?: number;
  delay?: number;
}

/**
 * Pooled floating text (damage numbers, COMBO, CRITICAL!, +gold...).
 * Objects are reused so a long battle never allocates hundreds of Text objects.
 */
export class FloatingText {
  private pool: Phaser.GameObjects.Text[] = [];
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, prewarm = 12) {
    this.scene = scene;
    for (let i = 0; i < prewarm; i++) this.pool.push(this.make());
  }

  private make(): Phaser.GameObjects.Text {
    return this.scene.add.text(0, 0, '', titleStyle(36)).setOrigin(0.5).setDepth(DEPTH.floating).setVisible(false).setActive(false);
  }

  show(x: number, y: number, text: string, opts: FloatOpts = {}): void {
    const t = this.pool.pop() ?? this.make();
    t.setStyle(titleStyle(opts.size ?? 36, { color: opts.color ?? '#ffffff', strokeThickness: Math.max(4, Math.round((opts.size ?? 36) / 6)) }));
    t.setText(heading(text)).setPosition(x, y).setAlpha(1).setScale(opts.scaleFrom ?? 1).setVisible(true).setActive(true);
    const rise = motion.reduced ? (opts.rise ?? 70) * 0.5 : opts.rise ?? 70;
    const duration = motion.ms(opts.duration ?? ANIM.damageNumberMs);
    this.scene.tweens.add({
      targets: t,
      y: y - rise,
      scale: 1,
      delay: opts.delay ?? 0,
      duration: duration * 0.3,
      ease: 'Back.easeOut',
    });
    this.scene.tweens.add({
      targets: t,
      alpha: 0,
      delay: (opts.delay ?? 0) + duration * 0.55,
      duration: duration * 0.45,
      onComplete: () => {
        t.setVisible(false).setActive(false);
        this.pool.push(t);
      },
    });
  }
}
