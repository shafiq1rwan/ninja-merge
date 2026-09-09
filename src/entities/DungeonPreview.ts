import Phaser from 'phaser';
import { BOSSES } from '../data/bosses';
import { ENVIRONMENTS, type BattleEnvironment } from '../data/battleAssets';
import type { RegionDef } from '../types';
import { COLORS, TEXT, textStyle } from '../ui/theme';

/** Preview size: width is a multiple of the 48px ground tile so the strip tiles cleanly. */
export const PREVIEW_W = 576;
export const PREVIEW_H = 432;
const TILE = 48; // 16px source at scale 3
const GROUND_Y = PREVIEW_H - TILE * 2;
const STAGE_W = 720; // battle stage width the environment placements are authored for

/**
 * One clean environment preview per dungeon, composed from the same verified crops as the battle
 * backdrop: background (sky or wall), far silhouettes, a few midground props, ground strip and the
 * boss as a dark silhouette. Everything is positioned inside the frame - nothing is clipped or bled.
 */
export class DungeonPreview extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, region: RegionDef, opts: { locked?: boolean; cleared?: boolean } = {}) {
    super(scene, x, y);
    const env: BattleEnvironment = ENVIRONMENTS[region.theme] ?? ENVIRONMENTS.forest;
    const g = scene.add.graphics();
    this.add(g);

    // Background
    if (env.wall) {
      this.drawWall(scene, env);
    } else {
      const bands = 12;
      const top = Phaser.Display.Color.IntegerToColor(env.skyTop);
      const bottom = Phaser.Display.Color.IntegerToColor(env.skyBottom);
      const bandH = Math.ceil(GROUND_Y / bands);
      for (let i = 0; i < bands; i++) {
        const c = Phaser.Display.Color.Interpolate.ColorWithColor(top, bottom, bands - 1, i);
        g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
        g.fillRect(0, i * bandH, PREVIEW_W, Math.min(bandH + 1, GROUND_Y - i * bandH));
      }
    }
    for (const p of env.far) this.prop(scene, p.frame, p.x, Math.max(2, p.scale - 1), GROUND_Y + 8 + (p.dy ?? 0) * 0.5, env.farTint, env.farAlpha);

    // Ground strip (two rows)
    const rows = [env.groundTop, env.groundBottom ?? env.groundTop];
    rows.forEach((frame, r) => {
      const tex = scene.textures.get('map_field').has(frame) ? 'map_field' : 'map_floor';
      if (!scene.textures.get(tex).has(frame)) return;
      for (let c = 0; c < PREVIEW_W / TILE; c++) {
        const img = scene.add.image(c * TILE, GROUND_Y + r * TILE, tex, frame).setOrigin(0, 0).setScale(3);
        if (env.groundTint !== undefined) img.setTint(env.groundTint);
        this.add(img);
      }
    });

    // Midground props (scaled down one step from the battle stage)
    for (const p of env.mid) this.prop(scene, p.frame, p.x, Math.max(2, p.scale - 1), GROUND_Y + 22 + (p.dy ?? 0) * 0.5);

    // Boss silhouette standing on the ground
    const boss = BOSSES[region.stages[5].enemyId];
    if (boss && scene.textures.exists(boss.sprite)) {
      const frameH = scene.textures.get(boss.sprite).get(0).height;
      const scale = Math.max(2, Math.min(3, Math.floor(200 / frameH)));
      const shadow = scene.add.ellipse(PREVIEW_W / 2, GROUND_Y + 26, 120, 16, 0x000000, 0.35);
      const sil = scene.add.image(PREVIEW_W / 2, GROUND_Y + 24, boss.sprite, 0).setOrigin(0.5, 1).setScale(scale);
      if (opts.cleared) sil.setTint(0xffffff);
      else sil.setTint(0x0b0b10).setAlpha(0.9);
      this.add([shadow, sil]);
    }

    // Frame + optional lock overlay
    if (opts.locked) {
      const dark = scene.add.rectangle(PREVIEW_W / 2, PREVIEW_H / 2, PREVIEW_W, PREVIEW_H, 0x000000, 0.62);
      this.add(dark);
      this.add(this.padlock(scene, PREVIEW_W / 2, PREVIEW_H / 2 - 20));
      this.add(scene.add.text(PREVIEW_W / 2, PREVIEW_H / 2 + 56, 'LOCKED', textStyle(28, { color: TEXT.muted })).setOrigin(0.5));
    }
    const frame = scene.add.graphics();
    frame.lineStyle(6, COLORS.woodLight, 1);
    frame.strokeRect(3, 3, PREVIEW_W - 6, PREVIEW_H - 6);
    frame.lineStyle(2, COLORS.ink, 1);
    frame.strokeRect(0, 0, PREVIEW_W, PREVIEW_H);
    this.add(frame);
    if (opts.cleared) {
      const tag = scene.add.container(PREVIEW_W - 14, 14);
      const label = scene.add.text(0, 0, 'CLEARED', textStyle(18, { color: TEXT.dark, stroke: false })).setOrigin(1, 0);
      const bg = scene.add.rectangle(-label.width / 2 - 8, label.height / 2, label.width + 16, label.height + 6, COLORS.gold, 1).setOrigin(0.5);
      tag.add([bg, label]);
      this.add(tag);
    }
    scene.add.existing(this);
  }

  private drawWall(scene: Phaser.Scene, env: BattleEnvironment): void {
    const wall = env.wall!;
    const rows = Math.ceil(GROUND_Y / TILE);
    for (let r = 0; r < rows; r++) {
      const frame = r === 0 && wall.topFrame ? wall.topFrame : wall.frame;
      const y = GROUND_Y - (rows - r) * TILE;
      for (let c = 0; c < PREVIEW_W / TILE; c++) {
        const img = scene.add.image(c * TILE, y, 'map_relief', frame).setOrigin(0, 0).setScale(3);
        if (wall.tint !== undefined) img.setTint(wall.tint);
        this.add(img);
      }
    }
    const shade = scene.add.graphics();
    for (let i = 0; i < 5; i++) {
      shade.fillStyle(0x000000, 0.35 - i * 0.06);
      shade.fillRect(0, (i * GROUND_Y) / 5, PREVIEW_W, GROUND_Y / 5 + 1);
    }
    this.add(shade);
  }

  private prop(scene: Phaser.Scene, frame: string, stageX: number, scale: number, baseY: number, tint?: number, alpha = 1): void {
    const tex = ['map_nature', 'map_dungeon', 'map_field', 'map_floor', 'map_relief'].find((t) => scene.textures.exists(t) && scene.textures.get(t).has(frame));
    if (!tex || alpha <= 0) return;
    const x = Math.round((stageX / STAGE_W) * PREVIEW_W);
    const img = scene.add.image(x, baseY, tex, frame).setOrigin(0.5, 1).setScale(scale).setAlpha(alpha);
    if (tint !== undefined) img.setTint(tint);
    // Keep every prop fully inside the frame.
    const half = img.displayWidth / 2;
    img.setX(Phaser.Math.Clamp(x, half + 4, PREVIEW_W - half - 4));
    this.add(img);
  }

  private padlock(scene: Phaser.Scene, x: number, y: number): Phaser.GameObjects.Graphics {
    const g = scene.add.graphics();
    g.fillStyle(COLORS.parchment, 1);
    g.fillRoundedRect(x - 34, y - 6, 68, 52, 8);
    g.lineStyle(10, COLORS.parchment, 1);
    g.beginPath();
    g.arc(x, y - 12, 22, Math.PI, 0, false);
    g.strokePath();
    g.fillStyle(COLORS.ink, 1);
    g.fillCircle(x, y + 16, 8);
    g.fillRect(x - 4, y + 16, 8, 16);
    return g;
  }
}

/** Full-screen atmospheric background matching a dungeon: soft gradient of the environment's sky/base. */
export function drawDungeonAtmosphere(scene: Phaser.Scene, region: RegionDef, width: number, height: number, depth: number): Phaser.GameObjects.Graphics {
  const env = ENVIRONMENTS[region.theme] ?? ENVIRONMENTS.forest;
  const g = scene.add.graphics().setDepth(depth);
  const top = Phaser.Display.Color.IntegerToColor(env.skyTop);
  const mid = Phaser.Display.Color.IntegerToColor(env.skyBottom);
  const bottom = Phaser.Display.Color.IntegerToColor(env.base);
  const bands = 24;
  const bandH = Math.ceil(height / bands);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = t < 0.5
      ? Phaser.Display.Color.Interpolate.ColorWithColor(top, mid, 1, t * 2)
      : Phaser.Display.Color.Interpolate.ColorWithColor(mid, bottom, 1, (t - 0.5) * 2);
    // Keep contrast low so UI text stays readable.
    g.fillStyle(Phaser.Display.Color.GetColor(Math.round(c.r * 0.6), Math.round(c.g * 0.6), Math.round(c.b * 0.6)), 1);
    g.fillRect(0, i * bandH, width, bandH + 1);
  }
  return g;
}
