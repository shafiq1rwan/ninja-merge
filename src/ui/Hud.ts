import Phaser from 'phaser';
import { GAME_WIDTH, SCENES } from '../config/gameConfig';
import { progression } from '../systems/ProgressionSystem';
import { save } from '../systems/SaveSystem';
import { iconButton } from './Button';
import { flatPanel } from './Panel';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from './theme';

/** Title bar with optional back button. Returns the title text. */
export function drawHeader(scene: Phaser.Scene, title: string, onBack?: () => void, subtitle?: string): Phaser.GameObjects.Text {
  flatPanel(scene, GAME_WIDTH / 2, 56, GAME_WIDTH - 24, 96, 0x1a1008, 0.6, 14).setDepth(DEPTH.hud);
  const t = scene.add.text(GAME_WIDTH / 2, subtitle ? 40 : 56, heading(title), titleStyle(44, { color: TEXT.gold })).setOrigin(0.5).setDepth(DEPTH.hud + 1);
  if (subtitle) scene.add.text(GAME_WIDTH / 2, 80, subtitle, textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.hud + 1);
  if (onBack) iconButton(scene, 62, 56, '<', onBack).setDepth(DEPTH.hud + 1);
  return t;
}

/** Player summary strip: level, HP, attack, gold. Call `refresh()` after changes. */
export class PlayerStrip extends Phaser.GameObjects.Container {
  private levelText: Phaser.GameObjects.Text;
  private statsText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, y: number) {
    super(scene, 0, y);
    this.setDepth(DEPTH.hud);
    const w = GAME_WIDTH - 24;
    this.add(flatPanel(scene, GAME_WIDTH / 2, 0, w, 76, 0x1a1008, 0.6, 14));
    this.levelText = scene.add.text(32, 0, '', textStyle(26, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5);
    this.statsText = scene.add.text(GAME_WIDTH / 2, 0, '', textStyle(24, { color: TEXT.muted })).setOrigin(0.5);
    const coin = scene.add.image(GAME_WIDTH - 40, 0, 'item_GoldCoin').setScale(4).setOrigin(1, 0.5);
    this.goldText = scene.add.text(GAME_WIDTH - 78, 0, '', textStyle(28, { color: TEXT.gold, align: 'right' })).setOrigin(1, 0.5);
    this.add([this.levelText, this.statsText, coin, this.goldText]);
    scene.add.existing(this);
    this.refresh();
  }

  refresh(): void {
    const p = save.data.player;
    const s = progression.computeStats();
    this.levelText.setText(`Lv ${p.level}`);
    this.statsText.setText(`HP ${s.maxHp}   ATK x${s.attackMult.toFixed(2)}   DEF ${s.defense}   CRIT ${Math.round(s.critChance * 100)}%`);
    this.goldText.setText(`${p.gold}`);
  }
}

/** Fade out then switch scene. */
export function goTo(scene: Phaser.Scene, key: string, data?: object, duration = 160): void {
  const cam = scene.cameras.main;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
  cam.fadeOut(duration, 0, 0, 0);
}

export function fadeIn(scene: Phaser.Scene, duration = 200): void {
  scene.cameras.main.fadeIn(duration, 0, 0, 0);
}

export const VILLAGE = SCENES.VILLAGE;
