import Phaser from 'phaser';
import { MIN_TOUCH } from '../config/gameConfig';
import { audio } from '../systems/AudioSystem';
import { TEXT, textStyle } from './theme';

/** Labelled checkbox row using the wooden checked/unchecked art. States are also spelled out as ON/OFF text. */
export class Toggle extends Phaser.GameObjects.Container {
  private box: Phaser.GameObjects.Image;
  private stateText: Phaser.GameObjects.Text;
  private value: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, label: string, value: boolean, onChange: (v: boolean) => void) {
    super(scene, x, y);
    this.value = value;
    const text = scene.add.text(-width / 2, 0, label, textStyle(30, { color: TEXT.light, align: 'left' })).setOrigin(0, 0.5);
    this.stateText = scene.add.text(width / 2 - 84, 0, value ? 'ON' : 'OFF', textStyle(26, { color: value ? TEXT.green : TEXT.muted })).setOrigin(1, 0.5);
    this.box = scene.add.image(width / 2 - 34, 0, value ? 'ui_checked' : 'ui_unchecked').setScale(4);
    const zone = scene.add.rectangle(0, 0, width, MIN_TOUCH, 0xffffff, 0).setInteractive({ useHandCursor: true });
    zone.on(Phaser.Input.Events.POINTER_UP, () => {
      this.value = !this.value;
      this.refresh();
      audio.play('button');
      onChange(this.value);
    });
    this.add([text, this.stateText, this.box, zone]);
    scene.add.existing(this);
  }

  private refresh(): void {
    this.box.setTexture(this.value ? 'ui_checked' : 'ui_unchecked');
    this.stateText.setText(this.value ? 'ON' : 'OFF').setColor(this.value ? TEXT.green : TEXT.muted);
  }
}
