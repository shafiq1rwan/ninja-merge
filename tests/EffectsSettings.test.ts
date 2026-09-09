import { beforeEach, describe, expect, it } from 'vitest';
import { JUICE } from '../src/data/juice';
import { effects } from '../src/settings/EffectsSettings';
import { defaultSave, save } from '../src/systems/SaveSystem';

/**
 * The juice budget is data, so it is worth pinning: Reduced Motion and Effects: Low must remove
 * decoration without ever removing information, and must never make anything slower.
 */
describe('EffectsSettings', () => {
  beforeEach(() => {
    save.data = defaultSave();
  });

  it('defaults to full effects', () => {
    expect(effects.level).toBe('normal');
    expect(effects.low).toBe(false);
    expect(effects.particles(10)).toBe(10);
    expect(effects.hitStop(JUICE.hitStop.crit)).toBe(JUICE.hitStop.crit);
    expect(effects.ambientCount).toBe(JUICE.ambient.normal);
  });

  it('Effects: Low trims particles and ambient motion but keeps timing and hit-stop', () => {
    save.data.settings.effectsLevel = 'low';
    expect(effects.low).toBe(true);
    expect(effects.particles(10)).toBe(4);
    expect(effects.ambientCount).toBe(JUICE.ambient.low);
    expect(effects.tileFlourishes).toBe(false);
    // Feel-critical timings are untouched by the particle budget.
    expect(effects.ms(200)).toBe(200);
    expect(effects.hitStop(40)).toBe(40);
  });

  it('Reduced Motion removes shake, particles and pops, and only shortens durations', () => {
    save.data.settings.reducedMotion = true;
    expect(effects.reduced).toBe(true);
    expect(effects.shakeEnabled).toBe(false);
    expect(effects.particles(10)).toBe(0);
    expect(effects.hitStop(60)).toBe(0);
    expect(effects.ambientCount).toBe(0);
    expect(effects.ms(200)).toBeLessThan(200);
    expect(effects.pop(1.2)).toBeLessThan(1.2);
    expect(effects.px(10)).toBeLessThan(10);
  });

  it('never disables the readouts that carry information', () => {
    save.data.settings.reducedMotion = true;
    save.data.settings.effectsLevel = 'low';
    // Damage numbers are their own explicit setting, not part of the effects budget.
    expect(effects.damageNumbers).toBe(true);
  });

  it('screen shake follows its own toggle', () => {
    save.data.settings.screenShake = false;
    expect(effects.shakeEnabled).toBe(false);
    save.data.settings.screenShake = true;
    expect(effects.shakeEnabled).toBe(true);
  });
});
