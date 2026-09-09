/**
 * Top-level, non-balance configuration: title, logical resolution, scene keys.
 * Change GAME_TITLE here to rename the game everywhere in the UI.
 */
export const GAME_TITLE = 'Ninja Merge RPG';
export const GAME_VERSION = '0.1.0';

/** Logical (design) resolution. Portrait; FIT-scaled and centred on every device. */
export const GAME_WIDTH = 720;
export const GAME_HEIGHT = 1280;

/** Minimum comfortable touch target in logical pixels (~44 CSS px on a 390px-wide phone). */
export const MIN_TOUCH = 84;

export const SCENES = {
  BOOT: 'BootScene',
  PRELOAD: 'PreloadScene',
  TITLE: 'TitleScene',
  VILLAGE: 'VillageScene',
  WORLD_MAP: 'WorldMapScene',
  BATTLE: 'BattleScene',
  RESULTS: 'ResultsScene',
  EQUIPMENT: 'EquipmentScene',
  UPGRADE: 'UpgradeScene',
  SHOP: 'ShopScene',
  SETTINGS: 'SettingsScene',
  WAVE_INTRO: 'WaveIntroScene',
  RUN_UPGRADE: 'RunUpgradeScene',
} as const;

/** localStorage key for the save file. */
export const SAVE_KEY = 'ninja-merge-rpg:save';

/** True in `vite dev`, false in production builds (debug keys are compiled out). */
export const IS_DEV: boolean = import.meta.env.DEV;
