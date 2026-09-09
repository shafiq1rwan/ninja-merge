import Phaser from 'phaser';
import { MIN_TOUCH } from '../config/gameConfig';
import { COLORS, TEXT, textStyle } from './theme';

/** Horizontal slider (0..1) with a large drag handle and a percentage readout. */
export class Slider extends Phaser.GameObjects.Container {
  private track: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private knob: Phaser.GameObjects.Rectangle;
  private readout: Phaser.GameObjects.Text;
  private value: number;
  private trackWidth: number;
  private onChange: (v: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, value: number, onChange: (v: number) => void) {
    super(scene, x, y);
    this.trackWidth = width;
    this.value = Phaser.Math.Clamp(value, 0, 1);
    this.onChange = onChange;

    this.track = scene.add.rectangle(0, 0, width, 20, COLORS.ink, 0.9).setStrokeStyle(3, COLORS.woodLight);
    this.fill = scene.add.rectangle(-width / 2, 0, width * this.value, 14, COLORS.gold).setOrigin(0, 0.5);
    this.knob = scene.add.rectangle(this.knobX(), 0, 40, 56, COLORS.parchment).setStrokeStyle(4, COLORS.woodDark);
    this.readout = scene.add.text(width / 2 + 24, 0, this.pct(), textStyle(28, { color: TEXT.light })).setOrigin(0, 0.5);
    this.add([this.track, this.fill, this.knob, this.readout]);

    // Big invisible hit zone so the whole row is draggable.
    const zone = scene.add.rectangle(0, 0, width + 60, MIN_TOUCH, 0xffffff, 0).setInteractive({ draggable: true, useHandCursor: true });
    this.add(zone);
    const update = (pointer: Phaser.Input.Pointer) => {
      const local = pointer.x - this.getWorldX();
      this.setValue(Phaser.Math.Clamp((local + width / 2) / width, 0, 1), true);
    };
    zone.on(Phaser.Input.Events.POINTER_DOWN, update);
    zone.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer) => update(pointer));
    scene.add.existing(this);
  }

  private getWorldX(): number {
    const m = this.getWorldTransformMatrix();
    return m.tx;
  }

  private knobX(): number {
    return -this.trackWidth / 2 + this.trackWidth * this.value;
  }

  private pct(): string {
    return `${Math.round(this.value * 100)}%`;
  }

  setValue(v: number, emit = false): void {
    this.value = Phaser.Math.Clamp(v, 0, 1);
    this.fill.width = this.trackWidth * this.value;
    this.knob.setX(this.knobX());
    this.readout.setText(this.pct());
    if (emit) this.onChange(this.value);
  }
}
