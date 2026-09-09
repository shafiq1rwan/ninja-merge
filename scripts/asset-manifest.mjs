/**
 * Maps files from the raw "Ninja Adventure - Asset Pack" (Pixel-Boy, CC0) into public/assets/.
 *
 * Each entry: [sourcePathInsidePack, destinationPathInsidePublicAssets]
 * Nothing here is modified - files are copied byte-for-byte.
 * Runtime code never references these paths directly; see src/data/assets.ts.
 */

const CHAR = 'Actor/Character';
const MON = 'Actor/Monster';
const BOSS = 'Actor/Boss';

/** Ninja forms used for the 11 merge-tile ranks + the hero avatar. */
export const characterFolders = [
  'NinjaGray', 'NinjaGreen', 'NinjaBlue', 'NinjaRed', 'NinjaYellow', 'Samurai',
  'NinjaMasked', 'NinjaDark', 'NinjaThunder', 'NinjaFire', 'NinjaMageBlack',
  'Master', // rank 8 tile (Ninja Master)
];

/** Monsters (16x16, 4 columns = facing direction, 4 rows = frames). [folder, sheetFile] */
export const monsterSheets = [
  ['Slime', 'Slime.png'], ['Slime2', 'Slime2.png'], ['Skull', 'SpriteSheet.png'], ['BlueBat', 'SpriteSheet.png'],
  ['YellowsBat', 'SpriteSheet.png'], ['Mushroom', 'mushroom.png'], ['Snake', 'Snake.png'], ['Spirit', 'SpriteSheet.png'],
  ['Bamboo', 'SpriteSheet.png'], ['KappaGreen', 'SpriteSheet.png'], ['Racoon', 'SpriteSheet.png'], ['Mole', 'Mole.png'],
  ['Larva', 'Larva.png'], ['Eye', 'Eye.png'], ['Cyclope', 'SpriteSheet.png'], ['Beast', 'Beast.png'],
  ['Flam', 'SpriteSheet.png'], ['Lizard', 'Lizard.png'], ['SpiderRed', 'SpriteSheet.png'], ['Owl', 'Owl.png'],
  ['Bear', 'SpriteSheet.png'], ['Mouse', 'SpriteSheet.png'], ['Reptile', 'Reptile.png'],
];

/** Humanoid enemies taken from the Character set (same 16x16 layout via SeparateAnim). */
export const humanoidEnemies = ['Skeleton', 'SkeletonDemon', 'DemonRed', 'SamuraiRed', 'SorcererBlack', 'NinjaDark', 'Master'];

/** Bosses: [folder, files[]] */
export const bossSheets = [
  ['GiantBamboo', ['Idle.png', 'Hit.png', 'Attack.png', 'Faceset.png']],
  ['GiantSlime', ['Idle.png', 'Hit.png', 'Jump.png', 'Faceset.png']],
  ['GiantRacoon', ['Idle.png', 'Attack.png', 'Faceset.png']],
  ['TenguRed', ['Idle.png', 'Hit.png', 'Attack.png', 'Faceset.png']],
  ['GiantSpirit', ['Idle.png', 'Hit.png', 'Faceset.png']],
  ['DemonCyclop', ['Idle.png', 'Hit.png', 'Walk.png', 'Faceset.png']],
];

const entries = [];

for (const c of characterFolders) {
  entries.push([`${CHAR}/${c}/SeparateAnim/Idle.png`, `characters/${c}/Idle.png`, true]); // optional: not every ninja has an Idle sheet
  entries.push([`${CHAR}/${c}/SeparateAnim/Attack.png`, `characters/${c}/Attack.png`]);
  entries.push([`${CHAR}/${c}/SeparateAnim/Walk.png`, `characters/${c}/Walk.png`]);
  entries.push([`${CHAR}/${c}/SeparateAnim/Dead.png`, `characters/${c}/Dead.png`]);
  entries.push([`${CHAR}/${c}/Faceset.png`, `characters/${c}/Faceset.png`]);
}
for (const [folder, sheet] of monsterSheets) {
  entries.push([`${MON}/${folder}/${sheet}`, `enemies/${folder}.png`]);
  entries.push([`${MON}/${folder}/Faceset.png`, `enemies/${folder}_face.png`]);
}
for (const h of humanoidEnemies) {
  entries.push([`${CHAR}/${h}/SeparateAnim/Walk.png`, `enemies/${h}.png`]);
  entries.push([`${CHAR}/${h}/Faceset.png`, `enemies/${h}_face.png`]);
}
for (const [folder, files] of bossSheets) {
  for (const f of files) entries.push([`${BOSS}/${folder}/${f}`, `bosses/${folder}/${f}`]);
}

// Items
entries.push(
  ['Items/Potion/LifePot.png', 'items/LifePot.png'],
  ['Items/Potion/Heart.png', 'items/Heart.png'],
  ['Items/Projectile/Bomb.png', 'items/Bomb.png'],
  ['Items/Projectile/Shuriken.png', 'items/Shuriken.png'],
  ['Items/Scroll/Scroll.png', 'items/Scroll.png'],
  ['Items/Treasure/GoldCoin.png', 'items/GoldCoin.png'],
  ['Items/Treasure/Coin2.png', 'items/CoinAnim.png'],
  ['Items/Treasure/LittleTreasureChest.png', 'items/LittleTreasureChest.png'],
  ['Items/Object/MoneyBag.png', 'items/MoneyBag.png'],
  ['Items/Weapons/Katana/Sprite.png', 'items/weapons/Katana.png'],
  ['Items/Weapons/Sword/Sprite.png', 'items/weapons/Sword.png'],
  ['Items/Weapons/BigSword/Sprite.png', 'items/weapons/BigSword.png'],
  ['Items/Weapons/Sai/Sprite.png', 'items/weapons/Sai.png'],
  ['Ui/Skill Icon/Items & Weapon/Armor.png', 'items/icons/Armor.png'],
  ['Ui/Skill Icon/Items & Weapon/Amulet.png', 'items/icons/Amulet.png'],
  ['Ui/Skill Icon/Items & Weapon/Ring.png', 'items/icons/Ring.png'],
  ['Ui/Skill Icon/Items & Weapon/Scroll.png', 'items/icons/Scroll.png'],
  ['Ui/Skill Icon/Items & Weapon/Money.png', 'items/icons/Money.png'],
  ['Ui/Skill Icon/Items & Weapon/Shuriken.png', 'items/icons/Shuriken.png'],
  ['Ui/Skill Icon/Items & Weapon/Kunai.png', 'items/icons/Kunai.png'],
  ['Ui/Skill Icon/Items & Weapon/Guard.png', 'items/icons/Guard.png'],
  ['Ui/Skill Icon/Items & Weapon/Helmet.png', 'items/icons/Helmet.png'],
  ['Ui/Skill Icon/Job & Action/Potion.png', 'items/icons/Potion.png'],
  ['Ui/Skill Icon/Job & Action/Punch.png', 'items/icons/Punch.png'],
  ['Ui/Skill Icon/Job & Action/Repair.png', 'items/icons/Repair.png'],
  ['Ui/Skill Icon/Job & Action/Interact.png', 'items/icons/Interact.png'],
  ['Ui/Skill Icon/Spell/AttackUpgrade.png', 'items/icons/AttackUpgrade.png'],
  ['Ui/Skill Icon/Spell/Counter.png', 'items/icons/Counter.png'],
);

// UI (Theme Wood)
for (const f of [
  'nine_path_panel.png', 'nine_path_panel_2.png', 'nine_path_panel_3.png', 'nine_path_panel_interior.png',
  'nine_path_bg.png', 'nine_path_bg_2.png', 'nine_path_focus.png',
  'button_normal.png', 'button_hover.png', 'button_pressed.png', 'button_disabled.png',
  'inventory_cell.png', 'checked.png', 'unchecked.png', 'arrow_left.png', 'arrow_right.png',
  'h_slidder_grabber.png', 'slider_progress.png', 'tab_selected.png', 'tab_unselected.png',
]) entries.push([`Ui/Theme/Theme Wood/${f}`, `ui/wood/${f}`]);
entries.push(
  ['Ui/Receptacle/IconHeart.png', 'ui/IconHeart.png'],
  ['Ui/Receptacle/Heart.png', 'ui/Heart.png'],
  ['Ui/Dialog/DialogBox.png', 'ui/DialogBox.png'],
  ['Ui/Arrow.png', 'ui/Arrow.png'],
  ['Ui/Font/NormalFont.ttf', 'ui/NormalFont.ttf'],
  ['Ui/Emote/emote1.png', 'ui/emote1.png'],
);

// Effects
entries.push(
  ['FX/Attack/CutX/SpriteSheet.png', 'effects/CutX.png'],
  ['FX/Attack/SlashCurved/SpriteSheet.png', 'effects/SlashCurved.png'],
  // Per-rank attack techniques (frame sizes verified against each sheet; see data/assets.ts).
  ['FX/Attack/Cut/SpriteSheet.png', 'effects/Cut.png'],
  ['FX/Attack/CutDouble/SpriteSheet.png', 'effects/CutDouble.png'],
  ['FX/Attack/SlashDoubleCurved/SpriteSheet.png', 'effects/SlashDoubleCurved.png'],
  ['FX/Attack/CircularSlash/SpriteSheet.png', 'effects/CircularSlash.png'],
  ['FX/Slash/SpriteSheetSlash01.png', 'effects/SlashQuick.png'],
  ['FX/Slash/SpriteSheetSlash02.png', 'effects/SlashBig.png'],
  ['FX/Slash/SpriteSheetSlash03.png', 'effects/SlashHeavy.png'],
  ['FX/Slash/SpriteSheetArc.png', 'effects/SlashArc.png'],
  ['FX/Slash/SpriteSheetCircular.png', 'effects/SlashCircular.png'],
  ['FX/Elemental/Flam/SpriteSheet.png', 'effects/Flam.png'],
  ['FX/Elemental/Thunder/SpriteSheet.png', 'effects/Thunder.png'],
  ['FX/Magic/Spirit/SpriteSheet.png', 'effects/Spirit.png'],
  ['FX/Projectile/Shuriken.png', 'effects/ShurikenSpin.png'],
  ['FX/Elemental/Explosion/SpriteSheet.png', 'effects/Explosion.png'],
  ['FX/Smoke/Smoke/SpriteSheet.png', 'effects/Smoke.png'],
  ['FX/Magic/Aura/SpriteSheet.png', 'effects/Aura.png'],
  ['FX/Magic/Shield/SpriteSheetBlue.png', 'effects/ShieldBlue.png'],
  ['FX/Particle/Leaf.png', 'effects/Leaf.png'],
  ['FX/Particle/Spark.png', 'effects/Spark.png'],
  ['FX/Particle/Bamboo.png', 'effects/BambooParticle.png'],
  ['FX/Particle/Snow.png', 'effects/Snow.png'],
);

// Maps / backgrounds
entries.push(
  ['Backgrounds/Tilesets/TilesetNature.png', 'maps/TilesetNature.png'],
  ['Backgrounds/Tilesets/TilesetField.png', 'maps/TilesetField.png'],
  ['Backgrounds/Tilesets/TilesetHouse.png', 'maps/TilesetHouse.png'],
  ['Backgrounds/Tilesets/TilesetFloor.png', 'maps/TilesetFloor.png'],
  ['Backgrounds/Tilesets/TilesetDesert.png', 'maps/TilesetDesert.png'],
  ['Backgrounds/Tilesets/TilesetDungeon.png', 'maps/TilesetDungeon.png'],
  ['Backgrounds/Tilesets/TilesetRelief.png', 'maps/TilesetRelief.png'],
  ['Backgrounds/Animated/Flag/FlagRed16x16.png', 'maps/FlagRed.png'],
);

// Audio - music (ogg; converted to m4a by scripts/convert-audio.mjs for Safari/iOS)
export const musicFiles = {
  title: '1 - Adventure Begin.ogg',
  village: '36 - Village.ogg',
  worldmap: '35 - Adventure.ogg',
  battle: '17 - Fight.ogg',
  boss: '28 - Tension.ogg',
  forest: '37 - Dark Forest.ogg',
};
for (const [key, f] of Object.entries(musicFiles)) entries.push([`Audio/Musics/${f}`, `audio/music/${key}.ogg`]);

// Audio - sfx (wav, universal)
export const sfxFiles = {
  button: 'Sounds/Menu/Accept.wav',
  cancel: 'Sounds/Menu/Cancel.wav',
  move: 'Sounds/Whoosh & Slash/Whoosh.wav',
  merge: 'Sounds/Bonus/Bonus.wav',
  attack: 'Sounds/Whoosh & Slash/Slash.wav',
  crit: 'Sounds/Hit & Impact/Impact5.wav',
  enemyHit: 'Sounds/Hit & Impact/Hit1.wav',
  playerHit: 'Sounds/Hit & Impact/Hit3.wav',
  coin: 'Sounds/Bonus/Coin.wav',
  heal: 'Sounds/Magic & Skill/Heal.wav',
  explosion: 'Sounds/Elemental/Explosion.wav',
  alert: 'Sounds/Alert/Alert.wav',
  magic: 'Sounds/Magic & Skill/Magic1.wav',
  poison: 'Sounds/Magic & Skill/Strange.wav',
  powerup: 'Sounds/Bonus/PowerUp1.wav',
  levelup: 'Jingles/LevelUp1.wav',
  victory: 'Jingles/Success1.wav',
  defeat: 'Jingles/GameOver.wav',
  // Game-feel pass: separate layers so movement, merge, swing and impact are distinct sounds.
  tileSlide: 'Sounds/Menu/Move3.wav',
  impact: 'Sounds/Hit & Impact/Impact2.wav',
  slashHeavy: 'Sounds/Whoosh & Slash/Slash3.wav',
  launch: 'Sounds/Whoosh & Slash/Launch.wav',
  enemyDeath: 'Sounds/Magic & Skill/Spirit.wav',
  waveClear: 'Jingles/Success2.wav',
  bossAlert: 'Sounds/Alert/Alert4.wav',
  bossDefeat: 'Jingles/Success4.wav',
  upgradePick: 'Sounds/Bonus/PowerUp2.wav',
  goldReward: 'Sounds/Bonus/Gold1.wav',
  sparkle: 'Sounds/Bonus/Bonus3.wav',
  // Archetype techniques.
  fire: 'Sounds/Elemental/Fire2.wav',
  energy: 'Sounds/Magic & Skill/Magic4.wav',
  stealth: 'Sounds/Whoosh & Slash/Whoosh2.wav',
};
for (const [key, f] of Object.entries(sfxFiles)) entries.push([`Audio/${f}`, `audio/sfx/${key}.wav`]);

export default entries;
