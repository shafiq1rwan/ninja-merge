import Phaser from 'phaser';
import { SCENES } from '../config/gameConfig';
import { assetUrl, FONT_FAMILY, FONT_PATH } from '../data/assets';

/**
 * First scene: loads the web font (so every Text object measures correctly) then hands over to Preload.
 * Waits at most ~2.5s for the font so a slow network never blocks the game.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENES.BOOT);
  }

  create(): void {
    const fontReady = loadFont();
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
    Promise.race([fontReady, timeout]).then(() => this.scene.start(SCENES.PRELOAD));
  }
}

async function loadFont(): Promise<void> {
  if (typeof FontFace === 'undefined' || !('fonts' in document)) return;
  try {
    const face = new FontFace(FONT_FAMILY, `url(${assetUrl(FONT_PATH)})`);
    const loaded = await face.load();
    document.fonts.add(loaded);
    // Warm the font in the canvas text renderer.
    await document.fonts.load(`24px "${FONT_FAMILY}"`);
  } catch (err) {
    console.warn('[Boot] font failed to load, using fallback', err);
  }
}
