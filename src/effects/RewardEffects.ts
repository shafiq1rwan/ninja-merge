import Phaser from 'phaser';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';
import { audio } from '../systems/AudioSystem';
import type { ParticleEffects } from './ParticleEffects';

export interface RewardTarget {
  x: number;
  y: number;
}

/**
 * Coins and XP travelling from the fallen enemy to their HUD counters, then the counter itself
 * counting up. Deliberately a handful of sprites, not a shower.
 */
export class RewardEffects {
  private scene: Phaser.Scene;
  private particles: ParticleEffects;

  constructor(scene: Phaser.Scene, particles: ParticleEffects) {
    this.scene = scene;
    this.particles = particles;
  }

  /** Gold pickups arcing to the gold counter. Resolves when they land. */
  async gold(from: RewardTarget, to: RewardTarget, onArrive: () => void): Promise<void> {
    const count = effects.reduced ? 0 : JUICE.reward.coins;
    if (count <= 0) {
      onArrive();
      return;
    }
    audio.play('goldReward');
    await this.particles.flyTo(from.x, from.y, to.x, to.y, count, { texture: 'item_GoldCoin', scale: 3, arc: 110 });
    audio.play('coin', { detune: 100 });
    onArrive();
  }

  /** XP scrolls arcing to the XP bar. */
  async xp(from: RewardTarget, to: RewardTarget, onArrive: () => void): Promise<void> {
    const count = effects.reduced ? 0 : 3;
    if (count <= 0) {
      onArrive();
      return;
    }
    await this.particles.flyTo(from.x, from.y, to.x, to.y, count, { texture: 'item_Scroll', scale: 2.6, arc: 80, durationMs: JUICE.reward.arcMs * 0.9 });
    onArrive();
  }

  /** A picked upgrade icon flying into the player HUD. */
  async upgrade(icon: string, from: RewardTarget, to: RewardTarget): Promise<void> {
    if (effects.reduced || !this.scene.textures.exists(icon)) return;
    await this.particles.flyTo(from.x, from.y, to.x, to.y, 1, { texture: icon, scale: 3.5, arc: 70, durationMs: 380 });
  }
}
