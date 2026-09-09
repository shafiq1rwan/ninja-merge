/**
 * Game-feel configuration. Every timing, intensity and particle count for the juice pass lives here,
 * separate from gameplay balance (data/balance.ts) - changing these can never change damage or progression.
 *
 * Guiding numbers: merge -> enemy impact lands in ~250-450ms, tile slides in 80-130ms, hit-stop stays
 * under 90ms, and screen shake is reserved for criticals, bombs and bosses.
 */
export const JUICE = {
  tile: {
    /** Slide duration for a full move (80-130ms). */
    slideMs: 100,
    /** Tiny settle squash after a slide - not a dramatic bounce. */
    settleMs: 46,
    settleScale: 0.95,
    spawnMs: 110,
    /** Rank thresholds for permanent tile treatments. */
    detailRank: 4,
    sparkleRank: 7,
    auraRank: 10,
  },
  merge: {
    /** Step 1: brief compression before the upgraded tile appears. */
    squash: 0.9,
    squashMs: 42,
    /** Step 3: pop of the new tile (stronger for high ranks). */
    pop: 1.14,
    popHigh: 1.18,
    popMs: 140,
    /** How long after a merge the board is "visually safe" so the attack can start. */
    safeMs: 40,
    /** Pixel burst counts. */
    burstNormal: 6,
    burstHigh: 12,
    /** Rank at which a merge counts as "high" (stronger pop, more particles). */
    highRank: 6,
    /** First time this rank (or better) is forged in a run, announce it. */
    announceRank: 8,
    /** Merge SFX pitch escalation within a single swipe (cents). */
    pitchStep: 110,
    maxPitch: 400,
  },
  attack: {
    /** Merge completes -> ninja winds up -> slash appears -> enemy is hit. Total ~150ms. */
    windupMs: 35,
    slashMs: 70,
    impactMs: 45,
  },
  /** Frame-freeze on impact, in ms. Never long enough to feel like input lag. */
  hitStop: {
    normal: 26,
    strong: 42,
    crit: 55,
    kill: 75,
    boss: 85,
  },
  recoil: {
    px: 5,
    critPx: 8,
    ms: 84,
  },
  damage: {
    lifeMs: 560,
    rise: 40,
    size: 34,
    critSize: 44,
    /** Horizontal spread so multiple numbers never stack on top of each other. */
    jitter: 30,
    staggerMs: 55,
  },
  shake: {
    crit: 0.0025,
    bomb: 0.004,
    playerHit: 0.002,
    bossAttack: 0.005,
    bossDeath: 0.008,
    maxMs: 140,
  },
  combo: { showMs: 900 },
  banner: {
    waveMs: 620,
    eliteMs: 820,
    bossMs: 1500,
    clearedMs: 640,
    announceMs: 850,
  },
  reward: {
    coins: 5,
    arcMs: 460,
    counterMs: 320,
  },
  /** Ambient background motion per effects level (particles alive at once). */
  ambient: { normal: 4, low: 0 },
  upgrade: {
    revealStaggerMs: 80,
    pickMs: 400,
  },
  /** Gold / XP counters tween instead of snapping. */
  numberTweenMs: 300,
  /** Staggered destruction (bomb chains, board clears). */
  stagger: {
    bombRingMs: 45,
    clearMs: 26,
    clearMaxMs: 440,
  },
} as const;

/**
 * Per-sound base volume so layered feedback (slide + merge + slash + impact) stays balanced and the
 * impact carries the weight. Applied centrally in AudioSystem.play.
 */
export const SFX_MIX: Record<string, number> = {
  tileSlide: 0.25,
  move: 0.3,
  merge: 0.55,
  attack: 0.5,
  slashHeavy: 0.6,
  launch: 0.5,
  impact: 0.9,
  enemyHit: 0.7,
  crit: 1,
  playerHit: 0.8,
  enemyDeath: 0.7,
  explosion: 0.8,
  heal: 0.6,
  coin: 0.5,
  goldReward: 0.6,
  sparkle: 0.5,
  magic: 0.6,
  poison: 0.5,
  alert: 0.7,
  bossAlert: 0.9,
  waveClear: 0.7,
  bossDefeat: 0.9,
  upgradePick: 0.7,
  powerup: 0.7,
  levelup: 0.8,
  victory: 0.8,
  defeat: 0.8,
  button: 0.6,
  cancel: 0.5,
};
