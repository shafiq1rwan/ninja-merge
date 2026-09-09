# Ninja Merge RPG

A relaxed tactical puzzle RPG for browsers. Swipe to slide and merge ninja tiles 2048-style; every merge is an attack on the monster in front of you. Defeat enemies, earn XP and gold, train your ninja, find equipment and fight your way across a node-based world map from the Bamboo Forest to the Demon Castle.

Built with **Phaser 4 + TypeScript + Vite**. No backend, no accounts - progress lives in `localStorage`. Deploys as a static site to GitHub Pages.

> Art, music and sound: [Ninja Adventure Asset Pack](https://pixel-boy.itch.io/ninja-adventure-asset-pack) by Pixel-Boy & AAA (CC0). See [Asset credits](#asset-credits).

## Screenshots

_Placeholder - add screenshots to `docs/screenshots/` and link them here._

| Title | Battle | World map |
| --- | --- | --- |
| `docs/screenshots/title.png` | `docs/screenshots/battle.png` | `docs/screenshots/worldmap.png` |

## How it plays

- **The board** is a 4x4 grid. Swipe (or press an arrow key) and every tile slides that way. Two ninjas of the same rank merge into the next rank. A tile can only merge once per move (`1 1 1 1` becomes `2 2`, never `3`).
- **Ranks are ninja forms**, not numbers: Novice -> Apprentice -> Ninja -> Veteran Ninja -> Elite Ninja -> Samurai -> Ninja Master -> Shadow Master -> Legendary Ninja -> Shinobi Lord -> Dragon Shinobi. Each tile shows a small rank badge.
- **Every merge damages the enemy.** Bigger merges hit harder (damage table in `src/data/balance.ts`). Several merges in one swipe trigger a **COMBO** multiplier; there is a chance of a **CRITICAL** hit.
- **Enemies attack on a counter** ("Enemy attack in: 2"). Different enemies attack at different speeds, so you can plan combos around it.
- **Special tiles**: a **Potion** heals you and a **Bomb** clears the surrounding cells (and damages the enemy). Push one against the board edge, or tap it, to activate. They never merge with ninjas.
- **Stuck board?** Instead of game over you lose 25% max HP and your weakest ninjas are cleared so the battle continues.
- **Dungeon runs (roguelite)**: the world map is a compact dungeon-select carousel. Pick a dungeon and a difficulty, then fight 10 waves back to back: normal waves, two **elite** waves, a **blessing** choice (run-only buff) after waves 3, 6 and 8, and the **boss** on wave 10. HP carries between waves and a run can be left and resumed later. Clearing a dungeon unlocks the next one and its Hard mode (then Nightmare). Falling ends the run but you keep every coin, XP point and item earned.
- **Bosses** end each dungeon and bring one mechanic each: Board Lock, Poison, Shield, Curse (blocked spawns) and Rage.
- **Progression**: XP levels up your ninja (more HP and attack, a skill point every 3 levels). Gold buys permanent training (Attack, Vitality, Critical, Defense) and equipment (Weapon / Armor / Accessory, Common to Legendary). Bag holds 20 items.
- **Defeat is gentle**: you keep every level, coin and item. Retry or head back to the village.

## Controls

### Desktop

| Action | Keys |
| --- | --- |
| Move / merge | Arrow keys or `W` `A` `S` `D` |
| Activate potion / bomb | Click the tile (or push it to the edge) |
| Choose dungeon | Left / Right arrows, Enter to start |
| Menus | Mouse |

### Mobile / touch

| Action | Gesture |
| --- | --- |
| Move / merge | Swipe up / down / left / right anywhere on the screen (short minimum distance prevents accidental moves; the move fires as soon as the threshold is passed) |
| Choose dungeon | Swipe left / right on the dungeon-select screen, or tap the arrows |
| Activate potion / bomb | Tap the tile |
| Menus | Tap - all buttons are at least 44 CSS px tall |

Portrait is the recommended orientation. Landscape still works (the portrait canvas is letter-boxed and centred); you are never forced to rotate.

### Debug keys (development builds only)

Only active with `npm run dev`; compiled out of production builds.

| Key | Effect |
| --- | --- |
| `1`-`9`, `0` | Spawn a ninja of rank 1-9 / 10 |
| `P` / `O` / `L` | Spawn potion / bomb / locked tile |
| `B` | Jump to the region boss |
| `G` | +1000 gold |
| `H` | Full heal |
| `K` | 50 damage to the enemy |
| `X` | Instant defeat (tests the defeat flow) |

## Installation

Requires Node.js 20.19+ (22 recommended) and npm.

```bash
git clone <your-repo-url>
cd ninja-merge-rpg
npm install
```

The curated game assets are committed under `public/assets/`, so the game runs straight away.

### Re-importing assets from the original pack (optional)

The raw asset pack is not committed (see `.gitignore`). To refresh or add assets:

1. Download the pack from https://pixel-boy.itch.io/ninja-adventure-asset-pack and unzip it next to `package.json` as `Ninja Adventure - Asset Pack/` (or anywhere, and pass the path).
2. Edit the mapping in `scripts/asset-manifest.mjs` if you want different sprites.
3. Run:

```bash
npm run import-assets            # or: node scripts/import-assets.mjs "path/to/Ninja Adventure - Asset Pack"
npm run convert-audio            # optional: needs ffmpeg; makes .m4a copies of the music for iOS Safari
```

Music ships as `.ogg` **and** `.m4a`; Phaser picks the first format the browser can decode (Safari cannot play OGG). Sound effects are `.wav`, which every browser supports.

## Development

```bash
npm run dev          # Vite dev server with hot reload (http://localhost:5173, also reachable on your LAN for phone testing)
npm test             # Vitest unit tests (merge algorithm, combat math, save migration)
npm run typecheck    # tsc --noEmit
```

## Build

```bash
npm run build        # type-checks, then builds to dist/
npm run preview      # serves dist/ locally
```

`vite.config.ts` uses `base: './'` and the game loads sprites/audio via `import.meta.env.BASE_URL`, so the build works from **any** URL path - the domain root, `https://<user>.github.io/<repo>/`, or a nested folder. Nothing assumes the domain root.

## GitHub Pages deployment

The workflow in `.github/workflows/deploy.yml` builds and deploys automatically on every push to `main` (it also runs the tests first).

One-time setup in your repository:

1. Push the project to GitHub.
2. Open **Settings -> Pages**.
3. Under **Build and deployment -> Source**, choose **GitHub Actions**.
4. Push to `main` (or run the workflow manually from the **Actions** tab).

The site will be published at `https://<user>.github.io/<repo>/`. No server runtime is required; `dist/` is plain static files. `public/.nojekyll` is included so Pages serves every file as-is.

## Project structure

```
.
├── index.html                  Page shell, viewport/safe-area meta, DOM import overlay
├── vite.config.ts              base: './' for sub-directory hosting; Vitest config
├── scripts/
│   ├── asset-manifest.mjs      Source -> destination map for the asset pack
│   ├── import-assets.mjs       Copies the curated subset into public/assets
│   └── convert-audio.mjs       ogg -> m4a music conversion (ffmpeg)
├── public/assets/              CC0 art & audio (characters, enemies, bosses, items, ui, effects, maps, audio)
├── src/
│   ├── main.ts                 Phaser game config (720x1280 portrait, FIT scaling, pixelArt)
│   ├── style.css               Page chrome, pixelated canvas, safe-area padding, no page scroll
│   ├── config/gameConfig.ts    Title, resolution, scene keys, save key
│   ├── types.ts                Shared domain types (no Phaser)
│   ├── data/
│   │   ├── assets.ts           Central asset registry (keys, paths, frame sizes, decor crops)
│   │   ├── balance.ts          All tunable numbers: spawn odds, damage table, combos, crit, scaling, XP, costs
│   │   ├── ranks.ts            The 11 ninja forms
│   │   ├── enemies.ts          Enemy archetypes
│   │   ├── bosses.ts           Region bosses + abilities
│   │   ├── stages.ts           Dungeons/regions (enemy roster + boss each)
│   │   ├── battleAssets.ts     Verified tileset crops, per-dungeon environments, battle layout
│   │   ├── items.ts            Equipment definitions, rarities, shop catalogue
│   │   └── progression.ts      XP curve, upgrade definitions, cost formula
│   ├── systems/
│   │   ├── BoardSystem.ts      Pure 2048 logic: grid state, moves, merges, specials, spawning, blocked check
│   │   ├── CombatSystem.ts     Damage, combos, crits, enemy counter, boss abilities, rewards
│   │   ├── SaveSystem.ts       Versioned localStorage save with migrations, export/import/reset
│   │   ├── ProgressionSystem.ts  Level/XP/gold/upgrades/stage unlocks, derived player stats
│   │   ├── EquipmentSystem.ts  Slots, bag, buy/sell/equip
│   │   ├── RunSystem.ts        Dungeon runs: waves, elites, blessings, difficulty, resume
│   │   ├── AudioSystem.ts      Music/SFX with volume settings and mobile autoplay unlock
│   │   ├── InputSystem.ts      Keyboard + swipe + tap
│   │   └── Rng.ts              Seeded PRNG (deterministic tests)
│   ├── entities/
│   │   ├── MergeTile.ts        Tile view
│   │   ├── BoardView.ts        Renders/animates the board from BoardSystem state
│   │   ├── Enemy.ts            Enemy view: sprite, HP bar, counter, reactions
│   │   └── Player.ts           Battle HUD for the player
│   ├── scenes/                 Boot, Preload, Title, Village, WorldMap (dungeon select), WaveIntro, Battle, RunUpgrade, Results, Equipment, Upgrade, Shop, Settings
│   ├── ui/                     Button, Panel, HealthBar, Modal, Toast, Slider, Toggle, FloatingText, Background, theme, motion
│   └── debug/DebugKeys.ts      Dev-only cheats
├── tests/                      Vitest specs
└── .github/workflows/deploy.yml  GitHub Pages CI/CD
```

Design rule: **the logical board (`board[row][col]`) is the source of truth**. `BoardView` animates `MoveResult`s and then re-syncs to the state; sprite positions are never read back into game logic.

## Save system

Progress is stored in `localStorage` under the key `ninja-merge-rpg:save` as JSON:

```jsonc
{
  "saveVersion": 1,
  "player": { "level", "xp", "gold", "skillPoints", "upgrades": { "attack", "vitality", "crit", "defense" } },
  "equipped": { "weapon", "armor", "accessory" },
  "inventory": ["item ids..."],
  "unlockedStages": [], "completedStages": [],
  "run": { "active": null | { "dungeonId", "difficulty", "wave", "hp", "buffs", ... }, "dungeons": { "<id>": { "bestWave", "cleared", "clearedDifficulties" } } },
  "settings": { "musicVolume", "sfxVolume", "musicMuted", "sfxMuted", "screenShake", "damageNumbers", "reducedMotion" },
  "stats": { "battlesWon", "battlesLost", "bossesDefeated", "totalMerges", "totalDamage", "goldEarned", "highestRank", "highestCombo", ... }
}
```

- **Autosave** happens after battle victory (and defeat, for statistics), purchases, equipment changes, upgrades and stage unlocks.
- **Versioning/migrations**: `SaveSystem.parse` runs the `MIGRATIONS` chain until the data reaches `SAVE_VERSION` (currently 2), then deep-merges it over the defaults so missing fields never break older saves. Version 1 saves (individual stages) are migrated into dungeon progress automatically. To change the format, bump `SAVE_VERSION` and add a `MIGRATIONS[oldVersion]` function.
- **Export / Import / Reset** live in Settings. Export copies the JSON to the clipboard and downloads a `.json` file; Import opens a paste box; Reset wipes progress but keeps your settings.

## Balancing

Every number that matters is in `src/data/balance.ts`: spawn probabilities (90% rank 1 / 10% rank 2), special tile odds, the damage table, combo multipliers (1.15x / 1.30x / 1.50x), crit chance and multiplier, enemy scaling per stage level, XP curve, upgrade values and costs, shop economy and animation timings.

## Accessibility

- Nothing important is colour-only: HP bars carry numbers, the enemy counter is text, statuses are labelled.
- Reduced Motion setting shortens animations, removes screen shake, drifting particles and large scale pops.
- Screen shake and damage numbers can be toggled independently.
- Music and SFX can be muted or adjusted separately; audio only starts after the first tap (mobile autoplay rules).

## Asset credits

- **Ninja Adventure Asset Pack** by **Pixel-Boy** and **AAA** - https://pixel-boy.itch.io/ninja-adventure-asset-pack - released under **CC0 1.0** (public domain). Attribution is not required, but we are very grateful for it. All characters, monsters, bosses, items, UI theme, effects, tilesets, music and sound effects in this game come from that pack, unmodified except for copying/renaming and the `.m4a` music transcodes.
- Game code, design and balancing: this repository (MIT).

## License

- Code: [MIT](LICENSE).
- Art/audio under `public/assets/`: CC0 1.0 by Pixel-Boy & AAA. We do not claim ownership of the artwork.
