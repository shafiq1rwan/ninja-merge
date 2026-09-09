/**
 * Battle-stage art metadata. Every sprite used by the battle backdrop is a named, verified crop
 * out of one tileset (coordinates checked pixel-by-pixel against the source sheets), so nothing
 * bleeds from a neighbouring tile and no sheet is ever shown whole.
 *
 * Sheets (all 16px grid, from the Ninja Adventure pack):
 *  - map_nature  TilesetNature.png  384x336  trees / bamboo / rocks
 *  - map_field   TilesetField.png    80x240  5 coloured 3x3 ground auto-tiles (48x48 blocks)
 *  - map_floor   TilesetFloor.png   352x417  dirt / sand / snow floors
 *  - map_relief  TilesetRelief.png  320x192  cliff / stone walls
 *  - map_dungeon TilesetDungeon.png 192x64   dungeon props
 */
import type { RegionDef } from '../types';
import type { DecorFrame } from './assets';
import { BOARD } from './balance';

/** Board metrics. Imported by the tile/board views so the layout has a single source of truth. */
export const TILE_SIZE = 140;
export const BOARD_GAP = 12;
/** Full pixel size of the 4x4 board including its outer gaps. */
export const BOARD_PIXEL_SIZE = BOARD.size * TILE_SIZE + (BOARD.size + 1) * BOARD_GAP;

/** Named crops registered on the loaded tileset textures by PreloadScene. */
export const BATTLE_FRAMES: DecorFrame[] = [
  // Nature: big trees, 64x48 each (row y=32), trunk base 2px above the frame bottom.
  { texture: 'map_nature', name: 'bt_pine_dark', x: 0, y: 32, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_tree_green', x: 64, y: 32, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_tree_white', x: 128, y: 32, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_tree_pink', x: 192, y: 32, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_tree_green2', x: 256, y: 32, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_tree_olive', x: 320, y: 32, w: 64, h: 48 },
  // Nature: row y=80
  { texture: 'map_nature', name: 'bt_dead_trees', x: 0, y: 80, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_snow_pine_a', x: 64, y: 80, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_snow_pine_b', x: 128, y: 80, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_rocks_brown', x: 192, y: 80, w: 64, h: 48 },
  { texture: 'map_nature', name: 'bt_rocks_grey', x: 256, y: 80, w: 64, h: 48 },
  // Nature: bamboo stalk 16x48 and small pieces
  { texture: 'map_nature', name: 'bt_bamboo', x: 176, y: 128, w: 16, h: 48 },
  { texture: 'map_nature', name: 'bt_bamboo_bush', x: 160, y: 128, w: 16, h: 16 },
  { texture: 'map_nature', name: 'bt_rock_brown_s', x: 208, y: 128, w: 32, h: 32 },
  { texture: 'map_nature', name: 'bt_rock_grey_s', x: 256, y: 128, w: 32, h: 32 },
  { texture: 'map_nature', name: 'bt_grass_tuft', x: 32, y: 160, w: 16, h: 16 },
  // Field ground blocks: top-middle edge tile and bottom fringe tile of each 3x3 block.
  { texture: 'map_field', name: 'bt_ground_sand_top', x: 16, y: 0, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_sand_bottom', x: 16, y: 32, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_grass_top', x: 16, y: 48, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_grass_bottom', x: 16, y: 80, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_dark_top', x: 16, y: 96, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_dark_bottom', x: 16, y: 128, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_snow_top', x: 16, y: 192, w: 16, h: 16 },
  { texture: 'map_field', name: 'bt_ground_snow_bottom', x: 16, y: 224, w: 16, h: 16 },
  // Floor: plain dark dirt (no edge decoration)
  { texture: 'map_floor', name: 'bt_dirt_dark', x: 272, y: 256, w: 16, h: 16 },
  // Relief: green stone wall, centre tile and top edge
  { texture: 'map_relief', name: 'bt_wall_stone', x: 80, y: 16, w: 16, h: 16 },
  { texture: 'map_relief', name: 'bt_wall_stone_top', x: 80, y: 0, w: 16, h: 16 },
  // Dungeon props
  { texture: 'map_dungeon', name: 'bt_brazier', x: 112, y: 32, w: 16, h: 16 },
  { texture: 'map_dungeon', name: 'bt_lamp_post', x: 64, y: 48, w: 16, h: 16 },
];

export interface Placement {
  frame: string;
  /** Centre x in logical pixels; the sprite's bottom sits on the ground line. */
  x: number;
  scale: number;
  /** Optional vertical nudge (positive = lower). */
  dy?: number;
}

export interface BattleEnvironment {
  /** Far background: either a vertical gradient (sky) or a tiled wall. */
  skyTop: number;
  skyBottom: number;
  wall?: { frame: string; topFrame?: string; tint?: number };
  /** Far silhouettes - drawn tinted and translucent behind the midground. */
  farTint: number;
  farAlpha: number;
  far: Placement[];
  /** Midground props standing on the ground line. */
  mid: Placement[];
  /** Ground strip: top edge row, then a fringe row hanging below (optional). */
  groundTop: string;
  groundBottom?: string;
  groundTint?: number;
  /** Colour filling everything below the ground strip (behind board + HUD). */
  base: number;
}

const GROUND_SCALE = 4;

/**
 * Vertical layout (720x1280): enemy scene ~ top 30%, status ~10%, board ~45%, HUD ~15%.
 * The enemy never overlaps the board; decoration never enters the UI area.
 */
export const BATTLE_LAYOUT = {
  width: 720,
  titleBarY: 32,
  groundY: 300, // top edge (far rim) of the ground platform
  groundScale: GROUND_SCALE,
  /** How far below the rim things stand, so feet are on the platform surface rather than on its edge. */
  propSink: 30,
  farSink: 12,
  enemyX: 360,
  enemyFeetY: 332,
  /** Max enemy sprite height so even bosses fit between the title bar and the ground. */
  enemyMaxHeight: 210,
  comboY: 350,
  status: { top: 398, height: 110 },
  board: { x: 50, y: 524, size: BOARD_PIXEL_SIZE },
  /**
   * Shared box for the stacked panels (stage title, enemy status card, player HUD). Matching the
   * board's left and right edges is what makes the screen read as one column instead of three
   * differently inset strips.
   */
  panel: { x: 50 + BOARD_PIXEL_SIZE / 2, width: BOARD_PIXEL_SIZE },
  hud: { top: 1154, height: 114 },
} as const;

const W = BATTLE_LAYOUT.width;

export const ENVIRONMENTS: Record<RegionDef['theme'], BattleEnvironment> = {
  forest: {
    skyTop: 0x0c2418,
    skyBottom: 0x2f6a3b,
    farTint: 0x143a24,
    farAlpha: 0.7,
    far: [
      { frame: 'bt_tree_green', x: 40, scale: 3, dy: 4 },
      { frame: 'bt_tree_green2', x: 200, scale: 3, dy: 8 },
      { frame: 'bt_tree_green', x: 360, scale: 3, dy: 10 },
      { frame: 'bt_tree_green2', x: 520, scale: 3, dy: 8 },
      { frame: 'bt_tree_green', x: 680, scale: 3, dy: 4 },
    ],
    mid: [
      { frame: 'bt_bamboo', x: 48, scale: 4 },
      { frame: 'bt_bamboo', x: 104, scale: 4, dy: 6 },
      { frame: 'bt_bamboo_bush', x: 76, scale: 4 },
      { frame: 'bt_bamboo', x: 616, scale: 4, dy: 6 },
      { frame: 'bt_bamboo', x: 672, scale: 4 },
      { frame: 'bt_bamboo_bush', x: 644, scale: 4 },
    ],
    groundTop: 'bt_ground_grass_top',
    groundBottom: 'bt_ground_grass_bottom',
    base: 0x15201a,
  },
  cave: {
    skyTop: 0x0a0810,
    skyBottom: 0x1a1626,
    wall: { frame: 'bt_wall_stone', topFrame: 'bt_wall_stone_top', tint: 0x6a6f8a },
    farTint: 0x0d0b14,
    farAlpha: 0.75,
    far: [
      { frame: 'bt_rocks_grey', x: 130, scale: 3, dy: 6 },
      { frame: 'bt_rocks_grey', x: 590, scale: 3, dy: 6 },
    ],
    mid: [
      { frame: 'bt_rocks_grey', x: 90, scale: 3 },
      { frame: 'bt_rock_grey_s', x: 640, scale: 3 },
    ],
    groundTop: 'bt_dirt_dark',
    groundBottom: 'bt_dirt_dark',
    groundTint: 0x9a8fa8,
    base: 0x120f18,
  },
  mountain: {
    skyTop: 0x16202e,
    skyBottom: 0x5b6f8a,
    farTint: 0x263243,
    farAlpha: 0.75,
    far: [
      { frame: 'bt_pine_dark', x: 90, scale: 3 },
      { frame: 'bt_pine_dark', x: 300, scale: 3, dy: 10 },
      { frame: 'bt_pine_dark', x: 470, scale: 3, dy: 12 },
      { frame: 'bt_pine_dark', x: 650, scale: 3 },
    ],
    mid: [
      { frame: 'bt_rocks_grey', x: 96, scale: 3 },
      { frame: 'bt_rock_grey_s', x: 630, scale: 3 },
    ],
    groundTop: 'bt_ground_dark_top',
    groundBottom: 'bt_ground_dark_bottom',
    base: 0x161b22,
  },
  desert: {
    skyTop: 0x3a1a0c,
    skyBottom: 0xc7863f,
    farTint: 0x6a3a1e,
    farAlpha: 0.6,
    far: [
      { frame: 'bt_rocks_brown', x: 120, scale: 3, dy: 6 },
      { frame: 'bt_dead_trees', x: 560, scale: 3, dy: 4 },
    ],
    mid: [
      { frame: 'bt_dead_trees', x: 96, scale: 3 },
      { frame: 'bt_rock_brown_s', x: 640, scale: 3 },
    ],
    groundTop: 'bt_ground_sand_top',
    groundBottom: 'bt_ground_sand_bottom',
    base: 0x1e1410,
  },
  snow: {
    skyTop: 0x0f1a2a,
    skyBottom: 0x7d9bb8,
    farTint: 0x3a4a60,
    farAlpha: 0.65,
    far: [
      { frame: 'bt_snow_pine_a', x: 60, scale: 3, dy: 6 },
      { frame: 'bt_snow_pine_b', x: 250, scale: 3, dy: 10 },
      { frame: 'bt_snow_pine_a', x: 480, scale: 3, dy: 10 },
      { frame: 'bt_snow_pine_b', x: 660, scale: 3, dy: 6 },
    ],
    mid: [
      { frame: 'bt_snow_pine_a', x: 80, scale: 3 },
      { frame: 'bt_snow_pine_b', x: 640, scale: 3 },
    ],
    groundTop: 'bt_ground_snow_top',
    groundBottom: 'bt_ground_snow_bottom',
    base: 0x121a24,
  },
  castle: {
    skyTop: 0x0a0508,
    skyBottom: 0x2a0d18,
    wall: { frame: 'bt_wall_stone', topFrame: 'bt_wall_stone_top', tint: 0x5a3a48 },
    farTint: 0x000000,
    farAlpha: 0,
    far: [],
    mid: [
      { frame: 'bt_brazier', x: 120, scale: 4 },
      { frame: 'bt_brazier', x: 600, scale: 4 },
    ],
    groundTop: 'bt_dirt_dark',
    groundBottom: 'bt_dirt_dark',
    groundTint: 0x7a5060,
    base: 0x120810,
  },
};

/** Number of 16px tiles needed to cover the stage width at the ground scale. */
export const GROUND_TILE_COUNT = Math.ceil(W / (16 * GROUND_SCALE));
