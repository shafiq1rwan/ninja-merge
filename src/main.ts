import Phaser from 'phaser';
import './style.css';
import { GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH } from './config/gameConfig';
import { BattleScene } from './scenes/BattleScene';
import { BootScene } from './scenes/BootScene';
import { EquipmentScene } from './scenes/EquipmentScene';
import { PreloadScene } from './scenes/PreloadScene';
import { ResultsScene } from './scenes/ResultsScene';
import { RunUpgradeScene } from './scenes/RunUpgradeScene';
import { SettingsScene } from './scenes/SettingsScene';
import { ShopScene } from './scenes/ShopScene';
import { TitleScene } from './scenes/TitleScene';
import { UpgradeScene } from './scenes/UpgradeScene';
import { VillageScene } from './scenes/VillageScene';
import { WaveIntroScene } from './scenes/WaveIntroScene';
import { WorldMapScene } from './scenes/WorldMapScene';
import { audio } from './systems/AudioSystem';
import { save } from './systems/SaveSystem';

document.title = GAME_TITLE;

// Load the save before the game boots so every scene can rely on it.
save.load();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  title: GAME_TITLE,
  version: GAME_VERSION,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#15110d',
  // Crisp pixel art: nearest-neighbour texture filtering and rounded positions.
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  input: {
    activePointers: 2,
    touch: { capture: true },
  },
  audio: {
    disableWebAudio: false,
  },
  scene: [
    BootScene,
    PreloadScene,
    TitleScene,
    VillageScene,
    WorldMapScene,
    BattleScene,
    ResultsScene,
    EquipmentScene,
    UpgradeScene,
    ShopScene,
    SettingsScene,
    WaveIntroScene,
    RunUpgradeScene,
  ],
};

const game = new Phaser.Game(config);
audio.attach(game);

// Belt and braces: stop touch gestures from scrolling/zooming the page around the canvas.
document.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
document.addEventListener('gesturestart', (e) => e.preventDefault());

// Expose for debugging in dev only.
if (import.meta.env.DEV) {
  (window as unknown as { game: Phaser.Game }).game = game;
}
