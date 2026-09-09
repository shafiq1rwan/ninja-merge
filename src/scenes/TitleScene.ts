import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { charFaceKey } from '../data/assets';
import { RANKS } from '../data/ranks';
import { audio } from '../systems/AudioSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { fadeIn, goTo } from '../ui/Hud';
import { motion } from '../ui/motion';
import { Panel } from '../ui/Panel';
import { DEPTH, heading, TEXT, textStyle, titleStyle } from '../ui/theme';

/**
 * Title screen. The first tap doubles as the user gesture that unlocks audio on mobile browsers.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.TITLE);
  }

  create(): void {
    drawBackground(this, 'title', { decorY: GAME_HEIGHT - 260, decorCount: 5, particles: 10 });
    fadeIn(this);

    const cx = GAME_WIDTH / 2;
    new Panel(this, cx, 330, 640, 300, 'ui_panel').setDepth(DEPTH.content);
    this.add.text(cx, 260, 'NINJA', titleStyle(96, { color: TEXT.red, strokeThickness: 10 })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    this.add.text(cx, 350, heading('MERGE RPG'), titleStyle(64, { color: TEXT.gold, strokeThickness: 8 })).setOrigin(0.5).setDepth(DEPTH.content + 1);
    this.add.text(cx, 420, 'Swipe. Merge. Strike.', textStyle(26, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content + 1);

    // Parade of ninja forms
    const faces = RANKS.slice(1);
    const spacing = 58;
    const startX = cx - ((faces.length - 1) * spacing) / 2;
    faces.forEach((r, i) => {
      const key = charFaceKey(r.character);
      if (!this.textures.exists(key)) return;
      const img = this.add.image(startX + i * spacing, 560, key).setScale(1.4).setDepth(DEPTH.content);
      if (!motion.reduced) {
        this.tweens.add({ targets: img, y: 552, duration: 700 + i * 40, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: i * 60 });
      }
    });

    const hasSave = save.data.completedStages.length > 0 || save.data.player.gold > 0 || save.data.player.level > 1;
    const prompt = this.add.text(cx, 720, hasSave ? 'Tap to Continue' : 'Tap to Start', textStyle(40, { color: TEXT.light })).setOrigin(0.5).setDepth(DEPTH.content);
    if (!motion.reduced) this.tweens.add({ targets: prompt, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    if (hasSave) {
      this.add.text(cx, 780, `Level ${save.data.player.level} ninja  -  ${save.data.player.gold} gold`, textStyle(24, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content);
    }
    this.add.text(cx, GAME_HEIGHT - 60, `${GAME_TITLE} v${GAME_VERSION}\nArt & music: Ninja Adventure Asset Pack by Pixel-Boy (CC0)`, textStyle(18, { color: TEXT.muted }))
      .setOrigin(0.5).setDepth(DEPTH.content);

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      audio.play('button');
      audio.playMusic('music_village');
      goTo(this, SCENES.VILLAGE);
    };
    this.input.once(Phaser.Input.Events.POINTER_DOWN, start);
    this.input.keyboard?.once('keydown', start);
    audio.playMusic('music_title'); // will queue until unlocked on mobile
  }
}
