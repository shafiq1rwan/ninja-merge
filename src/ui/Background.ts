import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config/gameConfig';
import type { RegionDef } from '../types';
import { motion } from './motion';
import { DEPTH } from './theme';

type Theme = RegionDef['theme'] | 'village' | 'title' | 'map';

interface Palette {
  top: number;
  bottom: number;
  ground: number;
  decor: string[]; // decor frame names (map_nature / map_house frames)
  particle?: string; // fx sheet key for drifting particles
  particleTint?: number;
}

const PALETTES: Record<Theme, Palette> = {
  forest: { top: 0x10261a, bottom: 0x1f4a2b, ground: 0x2d5a33, decor: ['tree_tall_a', 'tree_tall_b', 'tree_tall_c', 'bush_a', 'bush_b'], particle: 'fx_Leaf' },
  cave: { top: 0x0b0a12, bottom: 0x1e1a2e, ground: 0x2a2540, decor: ['rock_a', 'rock_b'], particle: 'fx_Spark', particleTint: 0x8fc4ff },
  mountain: { top: 0x1a2230, bottom: 0x3a4658, ground: 0x4a5668, decor: ['rock_a', 'rock_b', 'tree_a'], particle: 'fx_Snow' },
  desert: { top: 0x2c1a0c, bottom: 0x8a5a2b, ground: 0xb8863b, decor: ['rock_b', 'bush_a'], particle: 'fx_Spark', particleTint: 0xffd97a },
  snow: { top: 0x0f1a2a, bottom: 0x4a6a8a, ground: 0xdde8f2, decor: ['tree_snow', 'tree_snow', 'igloo'], particle: 'fx_Snow' },
  castle: { top: 0x0a0508, bottom: 0x2a0d18, ground: 0x3a1420, decor: ['statue', 'statue', 'shrine_a'], particle: 'fx_Spark', particleTint: 0xff6b5b },
  village: { top: 0x1a2a3a, bottom: 0x3f6a3a, ground: 0x4f8a3f, decor: ['house_a', 'house_b', 'torii', 'tree_pink', 'tree_tall_b', 'bush_a'], particle: 'fx_Leaf', particleTint: 0xffb7c5 },
  title: { top: 0x0a0a14, bottom: 0x2a1a2e, ground: 0x1a2a1a, decor: ['tree_tall_a', 'tree_tall_c', 'torii', 'temple'], particle: 'fx_Leaf' },
  map: { top: 0x14241a, bottom: 0x2a3a2a, ground: 0x2a3a2a, decor: [], particle: 'fx_Leaf' },
};

/**
 * Cheap themed backdrop: vertical colour bands, a ground strip, a few decor sprites from the tilesets
 * and a handful of drifting particles animated with tweens (no particle emitters -> mobile friendly).
 */
export function drawBackground(scene: Phaser.Scene, theme: Theme, opts: { decorY?: number; decorCount?: number; particles?: number; edgesOnly?: boolean; decorScale?: number } = {}): void {
  const pal = PALETTES[theme];
  const g = scene.add.graphics().setDepth(DEPTH.background);
  const bands = 24;
  const topC = Phaser.Display.Color.IntegerToColor(pal.top);
  const botC = Phaser.Display.Color.IntegerToColor(pal.bottom);
  for (let i = 0; i < bands; i++) {
    const t = i / (bands - 1);
    const c = Phaser.Display.Color.Interpolate.ColorWithColor(topC, botC, 1, t);
    g.fillStyle(Phaser.Display.Color.GetColor(c.r, c.g, c.b), 1);
    g.fillRect(0, Math.floor((GAME_HEIGHT / bands) * i), GAME_WIDTH, Math.ceil(GAME_HEIGHT / bands) + 1);
  }
  const decorY = opts.decorY ?? GAME_HEIGHT - 120;
  g.fillStyle(pal.ground, 1);
  g.fillRect(0, decorY, GAME_WIDTH, GAME_HEIGHT - decorY);
  // Faint ground texture lines
  g.fillStyle(0x000000, 0.12);
  for (let y = decorY + 18; y < GAME_HEIGHT; y += 36) g.fillRect(0, y, GAME_WIDTH, 4);

  // Decor sprites along the horizon
  const count = opts.decorCount ?? 6;
  if (pal.decor.length && scene.textures.exists('map_nature')) {
    const rng = new Phaser.Math.RandomDataGenerator([theme]);
    for (let i = 0; i < count; i++) {
      const name = pal.decor[i % pal.decor.length];
      const tex = scene.textures.get('map_nature').has(name) ? 'map_nature' : scene.textures.get('map_house').has(name) ? 'map_house' : null;
      if (!tex) continue;
      let x = 40 + ((i + 0.5) * (GAME_WIDTH - 80)) / count + rng.between(-30, 30);
      if (opts.edgesOnly) x = i % 2 === 0 ? 70 + rng.between(-20, 40) : GAME_WIDTH - 70 - rng.between(-20, 40);
      const img = scene.add.image(x, decorY + 8, tex, name).setOrigin(0.5, 1).setScale(opts.decorScale ?? 4).setDepth(DEPTH.decor);
      img.setAlpha(0.95);
    }
  }

  // Drifting particles
  const n = motion.reduced ? 0 : opts.particles ?? 8;
  if (pal.particle && scene.textures.exists(pal.particle)) {
    for (let i = 0; i < n; i++) spawnDrifter(scene, pal.particle, pal.particleTint);
  }
}

function spawnDrifter(scene: Phaser.Scene, key: string, tint?: number): void {
  const frames = scene.textures.get(key).frameTotal - 1;
  const img = scene.add.image(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(-40, GAME_HEIGHT), key, Phaser.Math.Between(0, Math.max(0, frames - 1)))
    .setScale(3)
    .setAlpha(0.7)
    .setDepth(DEPTH.decor + 1);
  if (tint !== undefined) img.setTint(tint);
  const loop = () => {
    if (!img.active) return;
    img.setPosition(Phaser.Math.Between(-20, GAME_WIDTH + 20), -30);
    scene.tweens.add({
      targets: img,
      y: GAME_HEIGHT + 30,
      x: img.x + Phaser.Math.Between(-160, 160),
      angle: Phaser.Math.Between(-180, 180),
      duration: Phaser.Math.Between(9000, 16000),
      ease: 'Sine.easeInOut',
      onComplete: loop,
    });
  };
  // Stagger: first run starts mid-screen.
  scene.tweens.add({
    targets: img,
    y: GAME_HEIGHT + 30,
    x: img.x + Phaser.Math.Between(-120, 120),
    angle: 180,
    duration: Phaser.Math.Between(6000, 12000),
    onComplete: loop,
  });
}
