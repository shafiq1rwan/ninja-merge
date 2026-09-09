import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import { BATTLE_LAYOUT, ENVIRONMENTS, GROUND_TILE_COUNT, type BattleEnvironment, type Placement } from '../data/battleAssets';
import { effects } from '../settings/EffectsSettings';
import type { RegionDef } from '../types';
import { DEPTH } from '../ui/theme';

/** One ambient look per dungeon: sprite, tint, drift direction and speed. Kept deliberately sparse. */
const AMBIENT: Record<RegionDef['theme'], { key: string; tint?: number; rise?: boolean; msMin: number; msMax: number; alpha: number }> = {
  forest: { key: 'fx_Leaf', msMin: 7000, msMax: 11000, alpha: 0.75 },
  cave: { key: 'fx_Spark', tint: 0x8fa8c4, msMin: 9000, msMax: 14000, alpha: 0.5 },
  mountain: { key: 'fx_Snow', tint: 0xdfe8f2, msMin: 9000, msMax: 13000, alpha: 0.5 },
  desert: { key: 'fx_Spark', tint: 0xffd97a, msMin: 6000, msMax: 10000, alpha: 0.45 },
  snow: { key: 'fx_Snow', msMin: 8000, msMax: 12000, alpha: 0.7 },
  castle: { key: 'fx_Spark', tint: 0xff8a5b, rise: true, msMin: 7000, msMax: 11000, alpha: 0.6 },
};

/**
 * The battle environment, built from exactly three depth layers:
 *   1. far background (sky gradient or tiled wall + tinted silhouettes)
 *   2. midground props standing on the ground line
 *   3. foreground ground strip
 * Everything below the ground strip is a flat base colour so the board and HUD sit on calm ground.
 */
export class BattleBackdrop {
  constructor(scene: Phaser.Scene, theme: RegionDef['theme']) {
    const env = ENVIRONMENTS[theme] ?? ENVIRONMENTS.forest;
    const L = BATTLE_LAYOUT;
    const g = scene.add.graphics().setDepth(DEPTH.background);

    // Base colour under everything (UI area).
    g.fillStyle(env.base, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // Layer 1: far background
    if (env.wall) {
      this.drawWall(scene, env, L.groundY);
    } else {
      this.drawSky(g, env, L.groundY);
    }
    for (const p of env.far) this.placeProp(scene, p, L.groundY + L.farSink, DEPTH.background + 1, env.farTint, env.farAlpha);

    // Layer 3 first so midground props overlap the ground edge naturally.
    this.drawGround(scene, env, L.groundY);

    // Layer 2: midground props
    for (const p of env.mid) this.placeProp(scene, p, L.groundY + L.propSink, DEPTH.decor, undefined, 1, true);

    // Ambient motion so the scene is not frozen. Confined above the ground line - never over the board.
    this.ambient(scene, theme, L.groundY + 40);
  }

  /**
   * A handful of slow drifting motes in the environment band. Count comes from the effects setting
   * (zero under Reduced Motion / Effects: Low) and each one simply loops its own tween.
   */
  private ambient(scene: Phaser.Scene, theme: RegionDef['theme'], maxY: number): void {
    const spec = AMBIENT[theme] ?? AMBIENT.forest;
    const count = effects.ambientCount;
    if (count <= 0 || !scene.textures.exists(spec.key)) return;
    const frames = Math.max(1, scene.textures.get(spec.key).frameTotal - 1);
    for (let i = 0; i < count; i++) {
      const img = scene.add
        .image(Phaser.Math.Between(20, GAME_WIDTH - 20), Phaser.Math.Between(0, maxY), spec.key, Phaser.Math.Between(0, frames - 1))
        .setScale(2)
        .setAlpha(spec.alpha)
        .setDepth(DEPTH.decor + 1);
      if (spec.tint !== undefined) img.setTint(spec.tint);
      const loop = (first: boolean) => {
        if (!img.active) return;
        const startY = first ? img.y : spec.rise ? maxY + 10 : -10;
        img.setPosition(Phaser.Math.Between(20, GAME_WIDTH - 20), startY);
        scene.tweens.add({
          targets: img,
          y: spec.rise ? -10 : maxY + 10,
          x: img.x + Phaser.Math.Between(-70, 70),
          angle: spec.rise ? 0 : Phaser.Math.Between(-120, 120),
          duration: Phaser.Math.Between(spec.msMin, spec.msMax),
          ease: 'Sine.easeInOut',
          onComplete: () => loop(false),
        });
      };
      scene.time.delayedCall(i * 900, () => loop(true));
    }
  }

  private drawSky(g: Phaser.GameObjects.Graphics, env: BattleEnvironment, groundY: number): void {
    const bands = 16;
    const top = Phaser.Display.Color.IntegerToColor(env.skyTop);
    const bottom = Phaser.Display.Color.IntegerToColor(env.skyBottom);
    const bandH = Math.ceil(groundY / bands);
    for (let i = 0; i < bands; i++) {
      const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
      g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
      g.fillRect(0, i * bandH, GAME_WIDTH, bandH + 1);
    }
  }

  private drawWall(scene: Phaser.Scene, env: BattleEnvironment, groundY: number): void {
    const wall = env.wall!;
    const s = BATTLE_LAYOUT.groundScale;
    const tile = 16 * s;
    const rows = Math.ceil(groundY / tile);
    for (let r = 0; r < rows; r++) {
      const frame = r === 0 && wall.topFrame ? wall.topFrame : wall.frame;
      const y = groundY - (rows - r) * tile;
      for (let c = 0; c < GROUND_TILE_COUNT; c++) {
        const img = scene.add.image(c * tile, y, 'map_relief', frame).setOrigin(0, 0).setScale(s).setDepth(DEPTH.background);
        if (wall.tint !== undefined) img.setTint(wall.tint);
      }
    }
    // Darken the wall towards the top so the enemy silhouette reads clearly.
    const shade = scene.add.graphics().setDepth(DEPTH.background);
    for (let i = 0; i < 6; i++) {
      shade.fillStyle(0x000000, 0.35 - i * 0.05);
      shade.fillRect(0, (i * groundY) / 6, GAME_WIDTH, groundY / 6 + 1);
    }
  }

  private drawGround(scene: Phaser.Scene, env: BattleEnvironment, groundY: number): void {
    const s = BATTLE_LAYOUT.groundScale;
    const tile = 16 * s;
    const texFor = (frame: string) => (scene.textures.get('map_field').has(frame) ? 'map_field' : 'map_floor');
    const rows: string[] = [env.groundTop];
    if (env.groundBottom) rows.push(env.groundBottom);
    rows.forEach((frame, r) => {
      const tex = texFor(frame);
      if (!scene.textures.get(tex).has(frame)) return;
      for (let c = 0; c < GROUND_TILE_COUNT; c++) {
        const img = scene.add.image(c * tile, groundY + r * tile, tex, frame).setOrigin(0, 0).setScale(s).setDepth(DEPTH.background + 2);
        if (env.groundTint !== undefined) img.setTint(env.groundTint);
      }
    });
    // Soft shadow line where the ground meets the base so the strip reads as a platform edge.
    const g = scene.add.graphics().setDepth(DEPTH.background + 3);
    g.fillStyle(0x000000, 0.35);
    g.fillRect(0, groundY + rows.length * tile, GAME_WIDTH, 6);
  }

  private placeProp(scene: Phaser.Scene, p: Placement, baseY: number, depth: number, tint?: number, alpha = 1, shadow = false): void {
    const tex = ['map_nature', 'map_dungeon', 'map_field', 'map_floor', 'map_relief'].find((t) => scene.textures.exists(t) && scene.textures.get(t).has(p.frame));
    if (!tex || alpha <= 0) return;
    const y = baseY + (p.dy ?? 0);
    const img = scene.add.image(p.x, y, tex, p.frame).setOrigin(0.5, 1).setScale(p.scale).setDepth(depth).setAlpha(alpha);
    if (tint !== undefined) img.setTint(tint);
    // Contact shadow so the prop reads as standing on the surface.
    if (shadow) scene.add.ellipse(p.x, y - 2, Math.round(img.displayWidth * 0.7), 10, 0x000000, 0.3).setDepth(depth - 1);
  }
}
