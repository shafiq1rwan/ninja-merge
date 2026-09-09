import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TITLE, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { assetUrl, AUDIO, DECOR_FRAMES, IMAGES, SPRITESHEETS } from '../data/assets';
import { COLORS, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

/**
 * Loads every asset declared in data/assets.ts with a progress bar, then registers decor frames
 * and shared animations before moving to the title screen.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super(SCENES.PRELOAD);
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.cameras.main.setBackgroundColor(COLORS.woodDarkest);
    this.add.text(cx, cy - 120, heading(GAME_TITLE), titleStyle(56, { color: TEXT.gold })).setOrigin(0.5);
    const label = this.add.text(cx, cy + 60, 'Loading... 0%', textStyle(28, { color: TEXT.light })).setOrigin(0.5);
    const barW = 480;
    this.add.rectangle(cx, cy, barW, 36, COLORS.ink).setStrokeStyle(4, COLORS.woodLight);
    const fill = this.add.rectangle(cx - barW / 2 + 4, cy, 0, 28, COLORS.gold).setOrigin(0, 0.5);

    this.load.on(Phaser.Loader.Events.PROGRESS, (p: number) => {
      fill.width = (barW - 8) * p;
      label.setText(`Loading... ${Math.round(p * 100)}%`);
    });
    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      console.warn('[Preload] failed to load', file.key, file.src);
    });

    for (const img of IMAGES) this.load.image(img.key, assetUrl(img.path));
    for (const sheet of SPRITESHEETS) {
      this.load.spritesheet(sheet.key, assetUrl(sheet.path), { frameWidth: sheet.frameWidth, frameHeight: sheet.frameHeight });
    }
    for (const a of AUDIO) this.load.audio(a.key, a.paths.map(assetUrl));
  }

  create(): void {
    this.registerDecorFrames();
    this.registerSharedAnimations();
    this.scene.start(SCENES.TITLE);
  }

  /** Cut named sub-rectangles out of the tilesets so scenes can place trees/houses by name. */
  private registerDecorFrames(): void {
    for (const d of DECOR_FRAMES) {
      if (!this.textures.exists(d.texture)) continue;
      const tex = this.textures.get(d.texture);
      if (!tex.has(d.name)) tex.add(d.name, 0, d.x, d.y, d.w, d.h);
    }
  }

  private registerSharedAnimations(): void {
    const mk = (key: string, texture: string, frames: number[] | null, frameRate: number, repeat = -1) => {
      if (this.anims.exists(key) || !this.textures.exists(texture)) return;
      const total = this.textures.get(texture).frameTotal - 1;
      const list = frames ? frames.filter((f) => f < total) : Array.from({ length: total }, (_, i) => i);
      if (!list.length) return;
      this.anims.create({ key, frames: this.anims.generateFrameNumbers(texture, { frames: list }), frameRate, repeat });
    };
    mk('fx_slash', 'fx_CutX', null, 18, 0);
    mk('fx_slash_curved', 'fx_SlashCurved', null, 18, 0);
    mk('fx_explosion', 'fx_Explosion', null, 16, 0);
    mk('fx_smoke', 'fx_Smoke', null, 14, 0);
    mk('fx_aura', 'fx_Aura', null, 10);
    mk('fx_shield', 'fx_Shield', null, 8);
    mk('coin_spin', 'item_CoinAnim', null, 10);
    mk('flag_wave', 'map_flag', null, 8);
  }
}
