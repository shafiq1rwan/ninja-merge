/**
 * Central asset registry. Every texture / audio key used by the game is declared here so
 * sprite paths are never hardcoded in scenes. Paths are relative to public/assets and are
 * resolved against Vite's BASE_URL so the game works from a GitHub Pages sub-directory.
 *
 * All art is from the Ninja Adventure Asset Pack by Pixel-Boy (CC0), copied by scripts/import-assets.mjs.
 * To swap a sprite, change the path (or frame size) here - nothing else needs to change.
 */
import { RANKS } from './ranks';

export const ASSET_BASE = `${import.meta.env.BASE_URL}assets/`;

export function assetUrl(relative: string): string {
  return ASSET_BASE + relative;
}

export interface ImageAsset { key: string; path: string }
export interface SheetAsset { key: string; path: string; frameWidth: number; frameHeight: number }
export interface AudioAsset { key: string; paths: string[] }

// ------------------------------------------------------------------ characters (player ninja forms)

export const CHARACTER_FOLDERS = RANKS.slice(1).map((r) => r.character);
export const HERO_CHARACTER = 'NinjaBlue';

export const charFaceKey = (folder: string) => `char_${folder}_face`;
export const charWalkKey = (folder: string) => `char_${folder}_walk`;
export const charAttackKey = (folder: string) => `char_${folder}_attack`;

const characterImages: ImageAsset[] = CHARACTER_FOLDERS.map((f) => ({ key: charFaceKey(f), path: `characters/${f}/Faceset.png` }));
const characterSheets: SheetAsset[] = CHARACTER_FOLDERS.flatMap((f) => [
  { key: charWalkKey(f), path: `characters/${f}/Walk.png`, frameWidth: 16, frameHeight: 16 },
  { key: charAttackKey(f), path: `characters/${f}/Attack.png`, frameWidth: 16, frameHeight: 16 },
]);

// ------------------------------------------------------------------ enemies (16x16, 4 cols x 4 rows)

export const ENEMY_FOLDERS = [
  'Slime', 'Slime2', 'Skull', 'BlueBat', 'YellowsBat', 'Mushroom', 'Snake', 'Spirit', 'Bamboo', 'KappaGreen', 'Racoon', 'Mole',
  'Larva', 'Eye', 'Cyclope', 'Beast', 'Flam', 'Lizard', 'SpiderRed', 'Owl', 'Bear', 'Mouse', 'Reptile',
  'Skeleton', 'SkeletonDemon', 'DemonRed', 'SamuraiRed', 'SorcererBlack', 'NinjaDark', 'Master',
];
const enemySheets: SheetAsset[] = ENEMY_FOLDERS.map((f) => ({ key: `enemy_${f}`, path: `enemies/${f}.png`, frameWidth: 16, frameHeight: 16 }));
const enemyFaces: ImageAsset[] = ENEMY_FOLDERS.map((f) => ({ key: `enemy_${f}_face`, path: `enemies/${f}_face.png` }));

// ------------------------------------------------------------------ bosses (horizontal strips)

interface BossSpec { folder: string; w: number; h: number; files: Record<string, string> }
const BOSS_SPECS: BossSpec[] = [
  { folder: 'GiantBamboo', w: 62, h: 62, files: { idle: 'Idle.png', hit: 'Hit.png', attack: 'Attack.png' } },
  { folder: 'GiantSlime', w: 62, h: 52, files: { idle: 'Idle.png', hit: 'Hit.png' } },
  { folder: 'GiantRacoon', w: 60, h: 60, files: { idle: 'Idle.png', attack: 'Attack.png' } },
  { folder: 'TenguRed', w: 82, h: 82, files: { idle: 'Idle.png', hit: 'Hit.png' } },
  { folder: 'GiantSpirit', w: 50, h: 50, files: { idle: 'Idle.png', hit: 'Hit.png' } },
  { folder: 'DemonCyclop', w: 50, h: 50, files: { idle: 'Idle.png', hit: 'Hit.png' } },
];
const bossSheets: SheetAsset[] = BOSS_SPECS.flatMap((b) =>
  Object.entries(b.files).map(([anim, file]) => ({ key: `boss_${b.folder}_${anim}`, path: `bosses/${b.folder}/${file}`, frameWidth: b.w, frameHeight: b.h })),
);
const bossFaces: ImageAsset[] = BOSS_SPECS.map((b) => ({ key: `boss_${b.folder}_face`, path: `bosses/${b.folder}/Faceset.png` }));

// ------------------------------------------------------------------ items & icons

const itemImages: ImageAsset[] = [
  { key: 'item_LifePot', path: 'items/LifePot.png' },
  { key: 'item_Heart', path: 'items/Heart.png' },
  { key: 'item_Bomb', path: 'items/Bomb.png' },
  { key: 'item_Shuriken', path: 'items/Shuriken.png' },
  { key: 'item_Scroll', path: 'items/Scroll.png' },
  { key: 'item_GoldCoin', path: 'items/GoldCoin.png' },
  { key: 'item_Chest', path: 'items/LittleTreasureChest.png' },
  { key: 'item_MoneyBag', path: 'items/MoneyBag.png' },
  { key: 'item_Katana', path: 'items/weapons/Katana.png' },
  { key: 'item_Sword', path: 'items/weapons/Sword.png' },
  { key: 'item_BigSword', path: 'items/weapons/BigSword.png' },
  { key: 'item_Sai', path: 'items/weapons/Sai.png' },
  ...['Armor', 'Amulet', 'Ring', 'Scroll', 'Money', 'Shuriken', 'Kunai', 'Guard', 'Helmet', 'Potion', 'Punch', 'Repair', 'Interact', 'AttackUpgrade', 'Counter']
    .map((n) => ({ key: `icon_${n}`, path: `items/icons/${n}.png` })),
];
const itemSheets: SheetAsset[] = [{ key: 'item_CoinAnim', path: 'items/CoinAnim.png', frameWidth: 8, frameHeight: 10 }];

// ------------------------------------------------------------------ UI (Theme Wood)

const uiImages: ImageAsset[] = [
  { key: 'ui_panel', path: 'ui/wood/nine_path_panel.png' },
  { key: 'ui_panel2', path: 'ui/wood/nine_path_panel_2.png' },
  { key: 'ui_panel3', path: 'ui/wood/nine_path_panel_3.png' },
  { key: 'ui_panel_interior', path: 'ui/wood/nine_path_panel_interior.png' },
  { key: 'ui_bg', path: 'ui/wood/nine_path_bg.png' },
  { key: 'ui_bg2', path: 'ui/wood/nine_path_bg_2.png' },
  { key: 'ui_focus', path: 'ui/wood/nine_path_focus.png' },
  { key: 'ui_btn', path: 'ui/wood/button_normal.png' },
  { key: 'ui_btn_hover', path: 'ui/wood/button_hover.png' },
  { key: 'ui_btn_pressed', path: 'ui/wood/button_pressed.png' },
  { key: 'ui_btn_disabled', path: 'ui/wood/button_disabled.png' },
  { key: 'ui_cell', path: 'ui/wood/inventory_cell.png' },
  { key: 'ui_checked', path: 'ui/wood/checked.png' },
  { key: 'ui_unchecked', path: 'ui/wood/unchecked.png' },
  { key: 'ui_arrow_left', path: 'ui/wood/arrow_left.png' },
  { key: 'ui_arrow_right', path: 'ui/wood/arrow_right.png' },
  { key: 'ui_slider_grab', path: 'ui/wood/h_slidder_grabber.png' },
  { key: 'ui_slider_progress', path: 'ui/wood/slider_progress.png' },
  { key: 'ui_IconHeart', path: 'ui/IconHeart.png' },
  { key: 'ui_DialogBox', path: 'ui/DialogBox.png' },
  { key: 'ui_Arrow', path: 'ui/Arrow.png' },
  { key: 'ui_emote1', path: 'ui/emote1.png' },
];
const uiSheets: SheetAsset[] = [{ key: 'ui_Heart', path: 'ui/Heart.png', frameWidth: 16, frameHeight: 16 }];

// ------------------------------------------------------------------ effects

const fxSheets: SheetAsset[] = [
  { key: 'fx_CutX', path: 'effects/CutX.png', frameWidth: 32, frameHeight: 32 },
  { key: 'fx_SlashCurved', path: 'effects/SlashCurved.png', frameWidth: 32, frameHeight: 32 },
  // Per-rank techniques. Frame sizes below were measured from each sheet (transparent-column
  // analysis + visual check), so no frame bleeds into its neighbour.
  { key: 'fx_Cut', path: 'effects/Cut.png', frameWidth: 32, frameHeight: 32 },                     // 4 frames
  { key: 'fx_CutDouble', path: 'effects/CutDouble.png', frameWidth: 32, frameHeight: 32 },         // 5 frames
  { key: 'fx_SlashDoubleCurved', path: 'effects/SlashDoubleCurved.png', frameWidth: 32, frameHeight: 32 }, // 4
  { key: 'fx_CircularSlash', path: 'effects/CircularSlash.png', frameWidth: 32, frameHeight: 32 }, // 4 frames
  { key: 'fx_SlashQuick', path: 'effects/SlashQuick.png', frameWidth: 26, frameHeight: 32 },       // 5 frames
  { key: 'fx_SlashBig', path: 'effects/SlashBig.png', frameWidth: 66, frameHeight: 50 },           // 6 frames
  { key: 'fx_SlashHeavy', path: 'effects/SlashHeavy.png', frameWidth: 57, frameHeight: 42 },       // 4 frames
  { key: 'fx_SlashArc', path: 'effects/SlashArc.png', frameWidth: 38, frameHeight: 34 },           // 6 frames
  { key: 'fx_SlashCircular', path: 'effects/SlashCircular.png', frameWidth: 63, frameHeight: 55 }, // 6 frames
  { key: 'fx_Flam', path: 'effects/Flam.png', frameWidth: 25, frameHeight: 30 },                   // 8 frames
  { key: 'fx_Thunder', path: 'effects/Thunder.png', frameWidth: 20, frameHeight: 28 },             // 8 frames
  { key: 'fx_Spirit', path: 'effects/Spirit.png', frameWidth: 32, frameHeight: 32 },               // 5 frames
  { key: 'fx_ShurikenSpin', path: 'effects/ShurikenSpin.png', frameWidth: 16, frameHeight: 16 },   // 2 frames
  { key: 'fx_Explosion', path: 'effects/Explosion.png', frameWidth: 40, frameHeight: 40 },
  { key: 'fx_Smoke', path: 'effects/Smoke.png', frameWidth: 32, frameHeight: 32 },
  { key: 'fx_Aura', path: 'effects/Aura.png', frameWidth: 25, frameHeight: 24 },
  { key: 'fx_Shield', path: 'effects/ShieldBlue.png', frameWidth: 24, frameHeight: 26 },
  { key: 'fx_Leaf', path: 'effects/Leaf.png', frameWidth: 8, frameHeight: 7 },
  { key: 'fx_Spark', path: 'effects/Spark.png', frameWidth: 10, frameHeight: 8 },
  { key: 'fx_Bamboo', path: 'effects/BambooParticle.png', frameWidth: 16, frameHeight: 15 },
  { key: 'fx_Snow', path: 'effects/Snow.png', frameWidth: 8, frameHeight: 8 },
];

/**
 * Frame rates for the effect sheets. PreloadScene registers each as `anim_<key>`, which is the
 * naming convention CombatVFX relies on. Rates are tuned so a technique reads in 150-300ms.
 */
export const FX_ANIMS: Record<string, { frameRate: number; repeat?: number }> = {
  fx_Cut: { frameRate: 26 },
  fx_CutDouble: { frameRate: 26 },
  fx_CutX: { frameRate: 24 },
  fx_SlashCurved: { frameRate: 24 },
  fx_SlashDoubleCurved: { frameRate: 24 },
  fx_CircularSlash: { frameRate: 24 },
  fx_SlashQuick: { frameRate: 30 },
  fx_SlashBig: { frameRate: 24 },
  fx_SlashHeavy: { frameRate: 20 },
  fx_SlashArc: { frameRate: 26 },
  fx_SlashCircular: { frameRate: 22 },
  fx_Flam: { frameRate: 28 },
  fx_Thunder: { frameRate: 30 },
  fx_Spirit: { frameRate: 18 },
  fx_ShurikenSpin: { frameRate: 20, repeat: -1 },
  fx_Explosion: { frameRate: 16 },
  fx_Smoke: { frameRate: 16 },
  fx_Aura: { frameRate: 10, repeat: -1 },
  fx_Shield: { frameRate: 8, repeat: -1 },
};

// ------------------------------------------------------------------ maps / backgrounds

const mapImages: ImageAsset[] = [
  { key: 'map_nature', path: 'maps/TilesetNature.png' },
  { key: 'map_field', path: 'maps/TilesetField.png' },
  { key: 'map_house', path: 'maps/TilesetHouse.png' },
  { key: 'map_floor', path: 'maps/TilesetFloor.png' },
  { key: 'map_desert', path: 'maps/TilesetDesert.png' },
  { key: 'map_dungeon', path: 'maps/TilesetDungeon.png' },
  { key: 'map_relief', path: 'maps/TilesetRelief.png' },
];
const mapSheets: SheetAsset[] = [{ key: 'map_flag', path: 'maps/FlagRed.png', frameWidth: 16, frameHeight: 16 }];

/**
 * Named sub-rectangles cut from tilesets and registered as frames (PreloadScene.registerDecorFrames).
 * Coordinates are in source pixels. Adjust here if a crop looks off - nothing else references them.
 */
export interface DecorFrame { texture: string; name: string; x: number; y: number; w: number; h: number }
export const DECOR_FRAMES: DecorFrame[] = [
  { texture: 'map_nature', name: 'tree_a', x: 0, y: 0, w: 32, h: 32 },
  { texture: 'map_nature', name: 'tree_b', x: 32, y: 0, w: 32, h: 32 },
  { texture: 'map_nature', name: 'tree_c', x: 64, y: 0, w: 32, h: 32 },
  { texture: 'map_nature', name: 'tree_tall_a', x: 0, y: 32, w: 48, h: 48 },
  { texture: 'map_nature', name: 'tree_tall_b', x: 48, y: 32, w: 48, h: 48 },
  { texture: 'map_nature', name: 'tree_tall_c', x: 96, y: 32, w: 48, h: 48 },
  { texture: 'map_nature', name: 'tree_snow', x: 144, y: 32, w: 48, h: 48 },
  { texture: 'map_nature', name: 'tree_pink', x: 192, y: 32, w: 48, h: 48 },
  { texture: 'map_nature', name: 'rock_a', x: 193, y: 83, w: 61, h: 44 },
  { texture: 'map_nature', name: 'rock_b', x: 257, y: 83, w: 61, h: 44 },
  { texture: 'map_nature', name: 'bush_a', x: 1, y: 134, w: 30, h: 23 },
  { texture: 'map_nature', name: 'bush_b', x: 33, y: 134, w: 30, h: 23 },
  { texture: 'map_house', name: 'house_a', x: 0, y: 0, w: 63, h: 63 },
  { texture: 'map_house', name: 'house_b', x: 63, y: 0, w: 63, h: 63 },
  { texture: 'map_house', name: 'torii', x: 7, y: 82, w: 34, h: 29 },
  { texture: 'map_house', name: 'statue', x: 466, y: 64, w: 45, h: 63 },
  { texture: 'map_house', name: 'igloo', x: 0, y: 176, w: 48, h: 46 },
  { texture: 'map_house', name: 'temple', x: 385, y: 226, w: 78, h: 78 },
  { texture: 'map_house', name: 'shrine_a', x: 0, y: 241, w: 80, h: 63 },
];

// ------------------------------------------------------------------ audio

const MUSIC_KEYS = ['title', 'village', 'worldmap', 'battle', 'boss', 'forest'];
const music: AudioAsset[] = MUSIC_KEYS.map((k) => ({ key: `music_${k}`, paths: [`audio/music/${k}.ogg`, `audio/music/${k}.m4a`] }));

export const SFX_KEYS = [
  'button', 'cancel', 'move', 'merge', 'attack', 'crit', 'enemyHit', 'playerHit', 'coin', 'heal', 'explosion', 'alert', 'magic', 'poison',
  'powerup', 'levelup', 'victory', 'defeat',
  // Game-feel pass: layered combat + roguelite stingers (mixed via SFX_MIX in data/juice.ts).
  'tileSlide', 'impact', 'slashHeavy', 'launch', 'enemyDeath', 'waveClear', 'bossAlert', 'bossDefeat', 'upgradePick', 'goldReward', 'sparkle',
  // Per-archetype technique sounds.
  'fire', 'energy', 'stealth',
] as const;
export type SfxKey = (typeof SFX_KEYS)[number];
const sfx: AudioAsset[] = SFX_KEYS.map((k) => ({ key: `sfx_${k}`, paths: [`audio/sfx/${k}.wav`] }));

// ------------------------------------------------------------------ export

export const IMAGES: ImageAsset[] = [...characterImages, ...enemyFaces, ...bossFaces, ...itemImages, ...uiImages, ...mapImages];
export const SPRITESHEETS: SheetAsset[] = [...characterSheets, ...enemySheets, ...bossSheets, ...itemSheets, ...uiSheets, ...fxSheets, ...mapSheets];
export const AUDIO: AudioAsset[] = [...music, ...sfx];

/** Web font shipped with the pack; loaded via FontFace before the title scene. */
export const FONT_FAMILY = 'NinjaFont';
/** Pixel font for headings (its space glyph is very narrow - see ui/theme.ts heading()). */
export const TITLE_FONT = `${FONT_FAMILY}, "Segoe UI", Roboto, Arial, sans-serif`;
/** Body/UI font: a bold system sans for legibility at small sizes. */
export const BODY_FONT = '"Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
export const FONT_PATH = 'ui/NormalFont.ttf';
