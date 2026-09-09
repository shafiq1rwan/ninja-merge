import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_TITLE, GAME_VERSION, GAME_WIDTH, SCENES } from '../config/gameConfig';
import { charFaceKey } from '../data/assets';
import { RANKS } from '../data/ranks';
import { audio } from '../systems/AudioSystem';
import { save } from '../systems/SaveSystem';
import { drawBackground } from '../ui/Background';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { fadeIn, goTo } from '../ui/Hud';
import { motion } from '../ui/motion';
import { DEPTH, TEXT, textStyle } from '../ui/theme';

/**
 * Title screen. The first tap doubles as the user gesture that unlocks audio on mobile browsers.
 */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super(SCENES.TITLE);
  }

  create(): void {
    drawBackground(this, 'title', { decorY: GAME_HEIGHT - 250, decorCount: 5, particles: 10 });
    fadeIn(this);
    const cx = GAME_WIDTH / 2;

    // Logo card
    const logo = new Card(this, { width: 620, centerY: 330, padding: 36, gap: 6 });
    logo.title('NINJA', 96, TEXT.red);
    logo.title('MERGE RPG', 58, TEXT.gold);
    logo.spacer(6);
    logo.text('Swipe. Merge. Strike.', 26, { color: TEXT.muted });
    logo.finish();

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
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      audio.play('button');
      audio.playMusic('music_village');
      goTo(this, SCENES.VILLAGE);
    };

    const btn = new Button(this, cx, 700, hasSave ? 'Continue' : 'Start Adventure', start, { width: 460, height: 104, fontSize: 36, variant: 'primary', silent: true });
    btn.setDepth(DEPTH.content);
    if (!motion.reduced) this.tweens.add({ targets: btn, scale: 1.03, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    if (hasSave) {
      this.add.text(cx, 780, `Level ${save.data.player.level} ninja  -  ${save.data.player.gold} gold`, textStyle(24, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content);
    } else {
      this.add.text(cx, 780, 'Tap anywhere to begin', textStyle(22, { color: TEXT.muted })).setOrigin(0.5).setDepth(DEPTH.content);
    }
    this.add.text(cx, GAME_HEIGHT - 52, `${GAME_TITLE} v${GAME_VERSION}\nArt & music: Ninja Adventure Asset Pack by Pixel-Boy (CC0)`, textStyle(18, { color: TEXT.muted }))
      .setOrigin(0.5).setDepth(DEPTH.content);

    // Tapping anywhere also works (and is the audio-unlock gesture).
    this.input.once(Phaser.Input.Events.POINTER_UP, start);
    this.input.keyboard?.once('keydown', start);
    audio.playMusic('music_title'); // queued until audio is unlocked on mobile
  }
}
