import Phaser from 'phaser';
import { ANIM } from '../data/balance';
import type { Direction } from '../types';

export interface InputCallbacks {
  onMove: (dir: Direction) => void;
  /** Tap (no swipe) at a world position. */
  onTap?: (x: number, y: number) => void;
}

/**
 * Unified keyboard + swipe input for the battle board.
 * - Arrow keys and WASD.
 * - Swipe: fires as soon as the pointer travels past the threshold (feels immediate), once per gesture.
 * - Tap: pointer up without exceeding the threshold.
 */
export class InputSystem {
  private scene: Phaser.Scene;
  private cb: InputCallbacks;
  private enabled = true;
  private swipeConsumed = false;
  private downX = 0;
  private downY = 0;
  private pointerDown = false;
  private keyHandler: (e: KeyboardEvent) => void;
  private threshold: number;

  constructor(scene: Phaser.Scene, cb: InputCallbacks, threshold = ANIM.swipeThresholdPx) {
    this.scene = scene;
    this.cb = cb;
    this.threshold = threshold;

    this.keyHandler = (e: KeyboardEvent) => {
      if (!this.enabled) return;
      const dir = InputSystem.keyToDirection(e.key);
      if (!dir) return;
      e.preventDefault();
      if (e.repeat) return;
      this.cb.onMove(dir);
    };
    // Listen on window so arrow keys never scroll the page and focus does not matter.
    window.addEventListener('keydown', this.keyHandler, { passive: false });

    scene.input.on(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    scene.input.on(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    scene.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    scene.events.once(Phaser.Scenes.Events.DESTROY, this.destroy, this);
  }

  static keyToDirection(key: string): Direction | null {
    switch (key) {
      case 'ArrowUp': case 'w': case 'W': return 'up';
      case 'ArrowDown': case 's': case 'S': return 'down';
      case 'ArrowLeft': case 'a': case 'A': return 'left';
      case 'ArrowRight': case 'd': case 'D': return 'right';
      default: return null;
    }
  }

  setEnabled(v: boolean): void {
    this.enabled = v;
    if (!v) this.pointerDown = false;
  }

  private onDown(p: Phaser.Input.Pointer): void {
    if (!this.enabled) return;
    this.pointerDown = true;
    this.swipeConsumed = false;
    this.downX = p.x;
    this.downY = p.y;
  }

  private onMove(p: Phaser.Input.Pointer): void {
    if (!this.enabled || !this.pointerDown || this.swipeConsumed || !p.isDown) return;
    const dx = p.x - this.downX;
    const dy = p.y - this.downY;
    const dir = this.resolveSwipe(dx, dy);
    if (dir) {
      this.swipeConsumed = true;
      this.cb.onMove(dir);
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    if (!this.enabled) return;
    if (this.swipeConsumed) return;
    const dx = p.x - this.downX;
    const dy = p.y - this.downY;
    const dir = this.resolveSwipe(dx, dy);
    if (dir) {
      this.cb.onMove(dir);
    } else if (Math.abs(dx) < 16 && Math.abs(dy) < 16) {
      this.cb.onTap?.(p.x, p.y);
    }
  }

  private resolveSwipe(dx: number, dy: number): Direction | null {
    const ax = Math.abs(dx);
    const ay = Math.abs(dy);
    if (Math.max(ax, ay) < this.threshold) return null;
    // Require a dominant axis so diagonal-ish drags are not misread.
    if (ax > ay * 1.2) return dx > 0 ? 'right' : 'left';
    if (ay > ax * 1.2) return dy > 0 ? 'down' : 'up';
    return null;
  }

  destroy(): void {
    window.removeEventListener('keydown', this.keyHandler);
    this.scene.input.off(Phaser.Input.Events.POINTER_DOWN, this.onDown, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_MOVE, this.onMove, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP, this.onUp, this);
    this.scene.input.off(Phaser.Input.Events.POINTER_UP_OUTSIDE, this.onUp, this);
  }
}
