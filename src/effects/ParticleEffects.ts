import Phaser from 'phaser';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';
import { DEPTH } from '../ui/theme';

export interface BurstOptions {
  count?: number;
  color?: number;
  /** Pixel size of each mote (kept axis-aligned so it stays crisp). */
  size?: number;
  speed?: number;
  lifeMs?: number;
  /** Bias the spread: 1 = ring, 0.4 = mostly sideways. */
  gravity?: number;
  depth?: number;
}

export interface FlyOptions {
  texture: string;
  scale?: number;
  delay?: number;
  durationMs?: number;
  arc?: number;
  depth?: number;
}

/**
 * Pooled, deliberately small pixel effects: square motes for bursts and sprite icons for rewards.
 * Nothing emits continuously and every object is reused, so a long battle allocates almost nothing.
 */
export class ParticleEffects {
  private scene: Phaser.Scene;
  private motes: Phaser.GameObjects.Rectangle[] = [];
  private icons: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene, prewarmMotes = 20) {
    this.scene = scene;
    for (let i = 0; i < prewarmMotes; i++) this.motes.push(this.makeMote());
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.motes.length = 0;
      this.icons.length = 0;
    });
  }

  private makeMote(): Phaser.GameObjects.Rectangle {
    return this.scene.add
      .rectangle(0, 0, 6, 6, 0xffffff)
      .setDepth(DEPTH.fx)
      .setVisible(false)
      .setActive(false);
  }

  /** Short outward burst of pixel motes. Returns immediately. */
  burst(x: number, y: number, opts: BurstOptions = {}): void {
    const count = effects.particles(opts.count ?? 6);
    if (count <= 0) return;
    const size = opts.size ?? 6;
    const speed = opts.speed ?? 90;
    const life = effects.ms(opts.lifeMs ?? 320);
    const gravity = opts.gravity ?? 0.5;
    for (let i = 0; i < count; i++) {
      const mote = this.motes.pop() ?? this.makeMote();
      const angle = (Math.PI * 2 * i) / count + Phaser.Math.FloatBetween(-0.3, 0.3);
      const dist = speed * Phaser.Math.FloatBetween(0.55, 1);
      mote
        .setPosition(Math.round(x), Math.round(y))
        .setSize(size, size)
        .setDisplaySize(size, size)
        .setFillStyle(opts.color ?? 0xffffff, 1)
        .setDepth(opts.depth ?? DEPTH.fx)
        .setAlpha(1)
        .setVisible(true)
        .setActive(true);
      this.scene.tweens.add({
        targets: mote,
        x: Math.round(x + Math.cos(angle) * dist),
        y: Math.round(y + Math.sin(angle) * dist * gravity + dist * 0.25),
        alpha: 0,
        duration: life,
        ease: 'Quad.easeOut',
        onComplete: () => {
          mote.setVisible(false).setActive(false);
          this.motes.push(mote);
        },
      });
    }
  }

  /** A few motes drifting straight up (healing, sparkle). */
  rise(x: number, y: number, opts: BurstOptions = {}): void {
    const count = effects.particles(opts.count ?? 5);
    if (count <= 0) return;
    const size = opts.size ?? 6;
    const life = effects.ms(opts.lifeMs ?? 420);
    for (let i = 0; i < count; i++) {
      const mote = this.motes.pop() ?? this.makeMote();
      const ox = Phaser.Math.Between(-24, 24);
      mote
        .setPosition(Math.round(x + ox), Math.round(y))
        .setSize(size, size)
        .setDisplaySize(size, size)
        .setFillStyle(opts.color ?? 0x8fe3c8, 1)
        .setDepth(opts.depth ?? DEPTH.fx)
        .setAlpha(1)
        .setVisible(true)
        .setActive(true);
      this.scene.tweens.add({
        targets: mote,
        y: Math.round(y - Phaser.Math.Between(40, 70)),
        alpha: 0,
        delay: i * 40,
        duration: life,
        ease: 'Sine.easeOut',
        onComplete: () => {
          mote.setVisible(false).setActive(false);
          this.motes.push(mote);
        },
      });
    }
  }

  /** Fly a small sprite along an arc to a target (reward pickups). Resolves when the last one lands. */
  flyTo(fromX: number, fromY: number, toX: number, toY: number, count: number, opts: FlyOptions): Promise<void> {
    const n = effects.reduced ? Math.min(1, count) : effects.level === 'low' ? Math.max(1, Math.floor(count * 0.5)) : count;
    if (n <= 0 || !this.scene.textures.exists(opts.texture)) return Promise.resolve();
    const duration = effects.ms(opts.durationMs ?? JUICE.reward.arcMs);
    return new Promise((resolve) => {
      let landed = 0;
      for (let i = 0; i < n; i++) {
        const icon = this.icons.pop() ?? this.scene.add.image(0, 0, opts.texture).setDepth(DEPTH.floating);
        const startX = fromX + Phaser.Math.Between(-40, 40);
        const startY = fromY + Phaser.Math.Between(-20, 20);
        icon
          .setTexture(opts.texture)
          .setPosition(startX, startY)
          .setScale(opts.scale ?? 3)
          .setAlpha(1)
          .setDepth(opts.depth ?? DEPTH.floating)
          .setVisible(true)
          .setActive(true);
        const arc = opts.arc ?? 90;
        const midX = (startX + toX) / 2 + Phaser.Math.Between(-30, 30);
        const midY = Math.min(startY, toY) - arc;
        const path = { t: 0 };
        this.scene.tweens.add({
          targets: path,
          t: 1,
          delay: (opts.delay ?? 0) + i * 55,
          duration,
          ease: 'Sine.easeIn',
          onUpdate: () => {
            const t = path.t;
            const inv = 1 - t;
            // Quadratic bezier so the pickup arcs instead of sliding in a straight line.
            icon.setPosition(
              Math.round(inv * inv * startX + 2 * inv * t * midX + t * t * toX),
              Math.round(inv * inv * startY + 2 * inv * t * midY + t * t * toY),
            );
          },
          onComplete: () => {
            icon.setVisible(false).setActive(false);
            this.icons.push(icon);
            if (++landed >= n) resolve();
          },
        });
      }
    });
  }
}
