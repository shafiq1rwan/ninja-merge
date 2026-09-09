import Phaser from 'phaser';
import { charFaceKey, HERO_CHARACTER } from '../data/assets';
import { rankName } from '../data/ranks';
import { audio } from '../systems/AudioSystem';
import { Button } from '../ui/Button';
import { HealthBar } from '../ui/HealthBar';
import { motion } from '../ui/motion';
import { Panel } from '../ui/Panel';
import { COLORS, DEPTH, TEXT, textStyle } from '../ui/theme';

/**
 * Bottom battle HUD card: hero portrait, HP bar, level + XP bar, gold, board rank, status, pause.
 * Everything is laid out inside the panel bounds. (Battle *state* lives in CombatSystem.)
 */
export class PlayerHud extends Phaser.GameObjects.Container {
  private portrait: Phaser.GameObjects.Image;
  private hpBar: HealthBar;
  private xpBar: HealthBar;
  private levelText: Phaser.GameObjects.Text;
  private goldText: Phaser.GameObjects.Text;
  private rankText: Phaser.GameObjects.Text;
  private statusText: Phaser.GameObjects.Text;
  private portraitX: number;
  private portraitY: number;
  private hpX: number;
  private hpY: number;

  constructor(scene: Phaser.Scene, top: number, height: number, onPause: () => void) {
    super(scene, 0, 0);
    this.setDepth(DEPTH.hud);
    const width = 720 - 48;
    const cx = 360;
    const cy = top + height / 2;
    const left = cx - width / 2 + 16;
    const right = cx + width / 2 - 16;
    this.add(new Panel(scene, cx, cy, width, height, 'ui_panel'));

    // Portrait
    const faceSize = 76;
    this.portraitX = left + faceSize / 2;
    this.portraitY = cy;
    const faceKey = charFaceKey(HERO_CHARACTER);
    this.add(scene.add.rectangle(this.portraitX, cy, faceSize + 6, faceSize + 6, COLORS.ink, 0.8).setStrokeStyle(3, COLORS.woodLight));
    this.portrait = scene.add.image(this.portraitX, cy, scene.textures.exists(faceKey) ? faceKey : 'ui_emote1').setScale(2);
    this.add(this.portrait);

    // Pause button (rightmost, inside the card)
    const pauseSize = 84;
    const pause = new Button(scene, right - pauseSize / 2, cy, 'II', onPause, { width: pauseSize, height: Math.min(pauseSize, height - 24), fontSize: 26 });
    this.add(pause);

    // Middle column
    const colX = left + faceSize + 18;
    const colRight = right - pauseSize - 18;
    const rowA = top + 32;
    const rowB = top + height - 30;

    const hpW = 290;
    this.hpX = colX + hpW / 2;
    this.hpY = rowA;
    this.hpBar = new HealthBar(scene, this.hpX, rowA, { width: hpW, height: 30, fillColor: COLORS.green, lowColor: COLORS.red, label: 'HP', fontSize: 18 });
    this.add(this.hpBar);

    this.levelText = scene.add.text(colX, rowB, 'Lv 1', textStyle(20, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5);
    this.add(this.levelText);
    const xpW = hpW - 62;
    this.xpBar = new HealthBar(scene, colX + 62 + xpW / 2, rowB, { width: xpW, height: 20, fillColor: COLORS.blue, lowColor: COLORS.blue, label: 'XP', fontSize: 14 });
    this.add(this.xpBar);

    // Right column: gold + status / rank
    const goldX = colX + hpW + 24;
    const coin = scene.add.image(goldX + 10, rowA, 'item_GoldCoin').setScale(3);
    this.goldText = scene.add.text(goldX + 30, rowA, '0', textStyle(22, { color: TEXT.gold, align: 'left' })).setOrigin(0, 0.5);
    this.add([coin, this.goldText]);
    this.rankText = scene.add.text(goldX, rowB, 'Rank: -', textStyle(16, { color: TEXT.muted, align: 'left', wordWrapWidth: Math.max(60, colRight - goldX) })).setOrigin(0, 0.5);
    this.add(this.rankText);
    this.statusText = scene.add.text(colRight, rowA, '', textStyle(16, { color: TEXT.purple, align: 'right' })).setOrigin(1, 0.5);
    this.add(this.statusText);

    scene.add.existing(this);
  }

  setHp(hp: number, max: number, animate = true): void {
    if (animate) this.hpBar.set(hp, max);
    else this.hpBar.reset(hp, max);
  }

  setXp(level: number, xp: number, needed: number): void {
    this.levelText.setText(`Lv ${level}`);
    this.xpBar.set(xp, needed, false);
  }

  setGold(gold: number): void {
    this.goldText.setText(`${gold}`);
  }

  setHighestRank(rank: number): void {
    this.rankText.setText(rank > 0 ? `Rank: ${rankName(rank)}` : 'Rank: -');
  }

  setStatus(text: string): void {
    this.statusText.setText(text);
  }

  /** Portrait flash + shake when the player is hit. */
  hitReaction(): void {
    audio.play('playerHit');
    motion.flashSprite(this.scene, this.portrait, 0xff6b5b, 120);
    motion.shake(this.scene, 0.004, 140);
    this.scene.tweens.killTweensOf(this.portrait);
    this.portrait.setPosition(this.portraitX, this.portraitY);
    this.scene.tweens.add({ targets: this.portrait, x: this.portraitX + 6, duration: 40, yoyo: true, repeat: 2 });
  }

  healReaction(): void {
    motion.flashSprite(this.scene, this.portrait, 0x8fe3c8, 140);
  }

  /** Where player-side floating numbers spawn: on the HP bar, rising within the HUD card. */
  get hpBarPoint(): { x: number; y: number } {
    return { x: this.hpX, y: this.hpY + 14 };
  }
}
