import Phaser from 'phaser';
import { JUICE } from '../data/juice';
import { effects } from '../settings/EffectsSettings';

/**
 * Camera-level impact: very short hit-stop and restrained shake.
 *
 * Hit-stop freezes tween/timer time for a few dozen milliseconds so an impact registers physically.
 * The restore runs on a real-time timer (not scene time, which is what we just froze) and is also
 * forced on scene shutdown, so a restarted scene can never begin frozen.
 */
export class CameraEffects {
  private scene: Phaser.Scene;
  private stops = 0;
  private timers = new Set<number>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.release());
    scene.events.once(Phaser.Scenes.Events.DESTROY, () => this.release());
  }

  /** Freeze scene time briefly. Safe to call while tweens are awaited. */
  hitStop(ms: number): void {
    const d = effects.hitStop(ms);
    if (d <= 0) return;
    this.stops++;
    this.scene.tweens.timeScale = 0;
    this.scene.time.timeScale = 0;
    const id = window.setTimeout(() => {
      this.timers.delete(id);
      this.stops = Math.max(0, this.stops - 1);
      if (this.stops === 0) this.resume();
    }, d);
    this.timers.add(id);
  }

  shake(intensity: number, duration = 120): void {
    if (!effects.shakeEnabled) return;
    this.scene.cameras.main.shake(Math.min(duration, JUICE.shake.maxMs), effects.level === 'low' ? intensity * 0.5 : intensity);
  }

  /** Tiny downward nudge of the whole view - used for player damage. */
  bump(px = 6, duration = 110): void {
    if (effects.reduced) return;
    const cam = this.scene.cameras.main;
    const amount = effects.level === 'low' ? px * 0.5 : px;
    this.scene.tweens.add({
      targets: cam,
      scrollY: cam.scrollY - amount,
      duration: duration * 0.4,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => cam.setScroll(cam.scrollX, 0),
    });
  }

  /** Short zoom punch for a boss kill. */
  zoomPunch(amount = 1.03, duration = 260): void {
    if (effects.reduced) return;
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({
      targets: cam,
      zoom: amount,
      duration: duration * 0.35,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => cam.setZoom(1),
    });
  }

  private resume(): void {
    // Restore unconditionally when the scene still exists: leaving timeScale at 0 would freeze the
    // whole battle loop, which is far worse than a redundant assignment.
    if (!this.scene?.sys) return;
    this.scene.tweens.timeScale = 1;
    this.scene.time.timeScale = 1;
  }

  private release(): void {
    for (const id of this.timers) window.clearTimeout(id);
    this.timers.clear();
    this.stops = 0;
    if (!this.scene?.sys) return;
    this.scene.tweens.timeScale = 1;
    this.scene.time.timeScale = 1;
    this.scene.cameras.main?.setZoom(1);
  }
}
