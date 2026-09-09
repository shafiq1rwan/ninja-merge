import Phaser from 'phaser';
import type { SfxKey } from '../data/assets';
import { mergeCharacter, techniqueFor, type StrengthTier, type TechniqueHit, type TechniqueSpec } from '../data/mergeCharacters';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import { DEPTH } from '../ui/theme';
import type { ParticleEffects } from './ParticleEffects';

export interface HitInfo {
  tier: StrengthTier;
  critical: boolean;
  /** Strike index inside this technique. */
  index: number;
  /** True on the technique's closing strike. */
  last: boolean;
  /** Which technique in a multi-merge chain this strike came from. */
  comboIndex: number;
}

export interface CharacterAttackOptions {
  /** Merge rank that produced the attack - decides the whole technique. */
  rank: number;
  critical: boolean;
  /** Position in a multi-merge chain (used only to escalate sound pitch). */
  comboIndex: number;
  /** World point on the enemy's body that every effect lands on. */
  target: { x: number; y: number };
  /** Enemy size multiplier, so bosses get slightly larger effects. */
  targetScale: number;
  /** Fired on each visible strike so the scene can react (hit-stop, recoil, numbers). */
  onHit?: (info: HitInfo) => void;
}

/**
 * Plays the ninja technique that belongs to a merged character, directly on the monster.
 *
 * Everything is data-driven from data/mergeCharacters.ts: this class only turns a TechniqueSpec into
 * pooled sprites, sounds and particles. It never computes damage and never waits for gameplay - the
 * caller already has the final numbers and simply asks for the matching visuals.
 *
 * Nothing here travels from the board or the HUD: cues, projectiles and slashes all spawn inside the
 * combat zone around the enemy.
 */
export class CombatVFX {
  private scene: Phaser.Scene;
  private particles: ParticleEffects;
  /** Reusable sprites per texture key. */
  private pool = new Map<string, Phaser.GameObjects.Sprite[]>();
  private live = new Set<Phaser.GameObjects.Sprite>();

  constructor(scene: Phaser.Scene, particles: ParticleEffects) {
    this.scene = scene;
    this.particles = particles;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.pool.clear();
      this.live.clear();
    });
  }

  /** Animation key convention set up in PreloadScene: `fx_SlashBig` -> `anim_fx_SlashBig`. */
  private static animKey(texture: string): string {
    return `anim_${texture}`;
  }

  private acquire(texture: string): Phaser.GameObjects.Sprite | null {
    if (!this.scene?.sys?.isActive() || !this.scene.textures.exists(texture)) return null;
    const bucket = this.pool.get(texture) ?? [];
    const sprite = bucket.pop() ?? this.scene.add.sprite(0, 0, texture, 0);
    this.pool.set(texture, bucket);
    sprite.setActive(true).setVisible(true).setAlpha(1).setFlipX(false).setAngle(0).clearTint();
    this.live.add(sprite);
    return sprite;
  }

  private release(sprite: Phaser.GameObjects.Sprite, texture: string): void {
    if (!sprite.scene) return;
    sprite.setVisible(false).setActive(false);
    this.live.delete(sprite);
    const bucket = this.pool.get(texture) ?? [];
    if (bucket.length < 6) bucket.push(sprite);
    else sprite.destroy();
    this.pool.set(texture, bucket);
  }

  /** Spawn one effect sprite, play its animation once, then return it to the pool. */
  private flash(texture: string, x: number, y: number, opts: { scale: number; angle?: number; flipX?: boolean; tint?: number; alpha?: number; depth?: number } = { scale: 4 }): void {
    const sprite = this.acquire(texture);
    if (!sprite || !sprite.scene) return;
    const anim = CombatVFX.animKey(texture);
    sprite
      .setTexture(texture)
      .setPosition(Math.round(x), Math.round(y))
      .setScale(opts.scale)
      .setAngle(opts.angle ?? 0)
      .setFlipX(!!opts.flipX)
      .setAlpha(opts.alpha ?? 1)
      .setDepth(opts.depth ?? DEPTH.fx);
    if (opts.tint !== undefined) sprite.setTint(opts.tint);
    if (this.scene.anims.exists(anim)) {
      sprite.play({ key: anim, hideOnComplete: false });
      sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => this.release(sprite, texture));
      // Safety net: never leak a sprite if the animation event is missed.
      this.scene.time.delayedCall(900, () => { if (this.live.has(sprite)) this.release(sprite, texture); });
    } else {
      sprite.setFrame(0);
      this.scene.tweens.add({ targets: sprite, alpha: 0, duration: 160, onComplete: () => this.release(sprite, texture) });
    }
  }

  private play(key: SfxKey | undefined, detune = 0): void {
    if (key) audio.play(key, { detune });
  }

  /**
   * Play the technique for `rank`. Resolves when the FIRST strike lands, so the caller can drop the
   * HP bar and show numbers on the impact frame while the rest of the technique plays out.
   */
  playCharacterAttack(opts: CharacterAttackOptions): Promise<void> {
    const spec = techniqueFor(opts.rank);
    const tier = spec.tier;
    const critical = opts.critical;
    const detune = Math.min(300, opts.comboIndex * 90);
    const sizeScale = opts.targetScale;
    const critScale = critical ? 1.22 : 1;
    const { x, y } = opts.target;

    // Reduced motion: keep the technique recognisable but shorten it to at most two strikes.
    let hits: TechniqueHit[] = [...spec.hits];
    if (critical && hits.length > 1) {
      // A crit adds one extra, bigger closing strike rather than a generic explosion.
      const last = hits[hits.length - 1];
      hits.push({ ...last, scale: last.scale * 1.15, dx: (last.dx ?? 0) * -1, dy: (last.dy ?? 0) - 6 });
    }
    if (effects.reduced && hits.length > 2) hits = [hits[0], hits[hits.length - 1]];

    const gap = effects.ms(spec.hitGapMs);
    const lead = effects.ms(spec.leadMs);

    this.play(spec.sfx.open, detune);

    // Lead-in cue (smoke, apparition) - skipped under reduced motion.
    if (spec.cue && !effects.reduced) {
      this.flash(spec.cue.vfx, x, y, {
        scale: spec.cue.scale * sizeScale,
        tint: spec.cue.tint,
        alpha: spec.cue.alpha ?? 1,
        depth: DEPTH.fx - 1,
      });
    }

    // Ranged opener: spawned beside the enemy, flying into the body. Under reduced motion the
    // projectile still appears (so the technique stays recognisable) but does not travel.
    if (spec.projectile && effects.reduced) {
      const p = spec.projectile;
      this.flash(p.vfx, x, y, { scale: p.scale * sizeScale });
    } else if (spec.projectile) {
      const p = spec.projectile;
      const sprite = this.acquire(p.vfx);
      if (sprite) {
        const anim = CombatVFX.animKey(p.vfx);
        sprite.setTexture(p.vfx).setPosition(x + p.fromDx, y + p.fromDy).setScale(p.scale * sizeScale).setDepth(DEPTH.fx);
        if (this.scene.anims.exists(anim)) sprite.play(anim);
        this.scene.tweens.add({
          targets: sprite,
          x,
          y,
          duration: effects.ms(p.travelMs),
          ease: 'Linear',
          onComplete: () => this.release(sprite, p.vfx),
        });
      }
    }

    return new Promise((resolve) => {
      hits.forEach((hit, i) => {
        const at = lead + i * gap;
        this.scene.time.delayedCall(at, () => {
          const hx = x + (hit.dx ?? 0) * sizeScale;
          const hy = y + (hit.dy ?? 0) * sizeScale;
          this.flash(hit.vfx, hx, hy, {
            scale: hit.scale * sizeScale * critScale,
            angle: hit.angle,
            flipX: hit.flipX,
            tint: critical && hit.tint === undefined ? 0xffe9a8 : hit.tint,
          });
          if (spec.particles) {
            this.particles.burst(hx, hy, {
              count: spec.particles.count + (critical ? 4 : 0),
              color: spec.particles.color,
              size: spec.particles.size ?? 6,
              speed: spec.particles.speed ?? 90,
            });
          }
          this.play(spec.sfx.hit, detune + i * 60 + (critical ? 120 : 0));
          const last = i === hits.length - 1 && !spec.finisher;
          opts.onHit?.({ tier, critical, index: i, last, comboIndex: opts.comboIndex });
          if (i === 0) resolve();
        });
      });

      // Closing strike for the heaviest techniques.
      if (spec.finisher) {
        const at = lead + Math.max(0, hits.length - 1) * gap + effects.ms(spec.finisherGapMs ?? 80);
        this.scene.time.delayedCall(at, () => {
          const f = spec.finisher!;
          this.flash(f.vfx, x + (f.dx ?? 0), y + (f.dy ?? 0), {
            scale: f.scale * sizeScale * critScale,
            angle: f.angle,
            flipX: f.flipX,
            tint: f.tint,
          });
          if (spec.particles) {
            this.particles.burst(x, y, {
              count: spec.particles.count + 4 + (critical ? 4 : 0),
              color: spec.particles.color,
              size: (spec.particles.size ?? 6) + 1,
              speed: (spec.particles.speed ?? 90) + 30,
            });
          }
          this.play(spec.sfx.close ?? spec.sfx.hit, detune + 150);
          opts.onHit?.({ tier, critical, index: hits.length, last: true, comboIndex: opts.comboIndex });
        });
      }

      // Techniques with no strikes at all should never hang the caller.
      if (!hits.length) resolve();
    });
  }

  /** Name of the technique a rank performs (for debug overlays / tests). */
  describe(rank: number): string {
    const c = mergeCharacter(rank);
    return `${c.name} (${c.attackType})`;
  }
}
