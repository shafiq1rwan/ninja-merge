# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Ninja Merge RPG: a 2048-style merge board fused with a lightweight RPG (battles, XP, gold, upgrades, equipment, world map). Phaser 4 + TypeScript + Vite, static site deployed to GitHub Pages via `.github/workflows/deploy.yml`. No backend; saves live in `localStorage`.

## Commands

```bash
npm run dev            # Vite dev server on :5173 (host: true, so phones on the LAN can connect)
npm run build          # tsc --noEmit && vite build  -> dist/
npm run preview        # serve dist/
npm test               # vitest run (tests/**/*.test.ts, node environment)
npx vitest run tests/BoardSystem.test.ts          # one file
npx vitest run -t "merges columns"                # tests matching a name
npm run typecheck      # tsc --noEmit
npm run import-assets  # copy curated files from "./Ninja Adventure - Asset Pack" into public/assets (manifest: scripts/asset-manifest.mjs)
npm run convert-audio  # ogg -> m4a music for iOS Safari; needs ffmpeg on PATH or FFMPEG=<path>
```

No linter is configured. `npm run build` fails on type errors, so run `npm run typecheck` before declaring work done.

## Architecture

Logical resolution is 720x1280 portrait, `Scale.FIT` + `CENTER_BOTH`, `pixelArt: true`. Do not add CSS centring to `#game-container` (Phaser centres the canvas itself; doing both offsets it).

### Layering

- `src/data/*` - pure data and constants. **Every tunable number lives in `data/balance.ts`** (spawn odds, damage table, combo/crit, enemy scaling, XP curve, upgrade costs, animation timings). Enemies, bosses, stages, items, ranks are declarative records. `data/assets.ts` is the single texture/audio key registry: keys, paths, frame sizes, decor crop rectangles, fonts. Never hardcode an asset path in a scene.
- `src/systems/*` - game logic with **no Phaser dependency** except `AudioSystem` and `InputSystem`: `BoardSystem` (grid + move/merge/spawn), `CombatSystem` (damage, enemy counter, boss abilities, rewards), `SaveSystem`, `ProgressionSystem`, `EquipmentSystem`, `Rng` (seeded). These are what the Vitest suite tests; keep them Phaser-free so tests stay runnable in Node.
- `src/entities/*` - Phaser views: `TileView`, `BoardView`, `EnemyView`, `PlayerHud`.
- `src/scenes/*` - one class per screen; `src/ui/*` - reusable widgets (`Card`, `Button`, `Panel`, `Modal`, `HealthBar`, `Slider`, `Toggle`, `Toast`, `FloatingText`, `Background`) plus `theme.ts` and `motion.ts`.
- Singletons: `save`, `progression`, `equipment`, `audio` are module-level instances imported directly; scenes never construct them.

### Board is the source of truth

`BoardSystem.board[row][col]` holds `Tile` objects with stable ids. `BoardSystem.move(dir)` returns a `MoveResult` (moves, merges, activations, expired, spawned); `BoardView.animateMove(result)` animates it and then calls `sync()` to reconcile views with the logical grid. Never read sprite positions back into logic, and after any logical change made outside `move()` (bomb tap, boss lock, penalty clear, debug spawn) call `boardView.sync()`.

`compute()` is a pure dry-run used by both `move()` and `simulate()` (which powers `hasValidMove()` / `isBlocked()`). Blocked tiles split a line into independently compressed segments. Potions/bombs activate when they end a move in the leading cell of their line (pushed against the edge) or via `activateAt()` (tap). Tap activation does not spawn a tile or advance the enemy counter.

### Battle sequencing

`BattleScene.onMove` resolves all logic first (`board.move` -> `combat.resolvePlayerMove` -> `combat.enemyTick`) then plays animations, using `await` over `tweenAsync`/`delay` from `ui/async.ts`. `busy` gates input until the sequence finishes; `ended`/`paused` flags block it entirely. Rewards, stage completion and `save.persist()` all happen inside `victory()` before switching to `ResultsScene`.

### Save format

`SaveSystem.parse` runs `MIGRATIONS[fromVersion]` in sequence up to `SAVE_VERSION`, then deep-merges over `defaultSave()`. To change the save shape: bump `SAVE_VERSION`, add a migration entry, and extend `defaultSave()`. Autosave points: victory/defeat, purchase, equip/unequip/sell, upgrade, stage unlock.

### Dungeon runs (roguelite loop)

The World Map is a dungeon carousel (`scenes/WorldMapScene.ts`, previews from `entities/DungeonPreview.ts` reusing the verified `BATTLE_FRAMES`). Selecting a dungeon starts a run in `systems/RunSystem.ts`: `RUN.waves` waves generated from the region's five enemies + boss (`waveDef`), elites and upgrade breaks on the waves listed in `data/balance.ts`, difficulty = level offset only. The run (wave, carried HP, blessings, totals) lives in `save.data.run.active` so it can be resumed; `save.data.run.dungeons` holds best wave / cleared / cleared difficulties. Flow: WorldMap -> WaveIntro(intro) -> Battle{run:true} -> WaveIntro(wave) | RunUpgrade -> ... -> Results(runComplete|runFailed) -> WorldMap. The map never appears between waves. `BattleScene` in run mode builds a synthetic `StageDef` from the wave, applies `runSystem.stats()` on top of `progression.computeStats()`, carries HP in via `combat.player.hp`, and on a boss win calls `progression.completeStage` for every region stage - that legacy stage data is still what unlocks the next dungeon (`progression.isRegionUnlocked`). Combat, board, progression and equipment code are untouched by runs; do not reach into them from RunSystem.

### Battle stage composition

The battle backdrop is `entities/BattleBackdrop.ts` driven entirely by `data/battleAssets.ts`: `BATTLE_FRAMES` (named, pixel-verified crops out of the tilesets - never show a whole sheet or guess a crop), `ENVIRONMENTS` (one coherent environment per region theme: sky or wall, far silhouettes, 2-6 midground props, ground tiles, base colour) and `BATTLE_LAYOUT` (ground line, enemy feet, status card, board and HUD rectangles). Layer order is fixed: background, ground, enemy, status card, board, HUD; props only ever stand on the ground line at the sides, never behind the enemy or inside the UI area. `EnemyView` is the sprite only (integer scale clamped by `enemyMaxHeight`); its name/HP/counter live in `EnemyStatusCard`, and everything player-side sits inside `PlayerHud`'s panel. To add scenery, add a verified crop to `BATTLE_FRAMES` and a placement to the theme - do not add decoration that competes with the board.

### Screen layout conventions

Menu-style screens are built from `ui/Card.ts`: a vertical flow layout (`title`, `text`, `button`, `buttonRow`, `object`, `custom`, `divider`) that sizes a flat `Panel` to fit and keeps buttons *inside* the card. Anchor with `top` for stacked cards (chain via `card.bottom + gap`) or `centerY` for dialogs like Results. Panels and buttons are drawn with Graphics (no nine-slice art): `Button` variants are `primary` (gold, the one recommended action), `secondary` (wood) and `danger` (red). Scene headers come from `drawHeader` and the level/stats/gold strip from `PlayerStrip` in `ui/Hud.ts`.

### Text and fonts

The pack's pixel font (`NinjaFont`) has a near-zero-width space glyph. Use `titleStyle()` + `heading()` (pads spaces) only for headings and floating numbers; use `textStyle()` (bold system font) for all body/UI text.

### Debug

`src/debug/DebugKeys.ts` is installed only behind `if (IS_DEV)` (`import.meta.env.DEV`), so it is tree-shaken from production. `window.game` is likewise dev-only. Keys are listed in the README.

## Assets

`public/assets/` holds the curated CC0 copies and is committed; the raw `Ninja Adventure - Asset Pack/` folder is gitignored and is only the import source. Monster sheets are 16x16 with 4 columns = facing direction, 4 rows = frames (facing-down walk = frames `[0,4,8,12]`); boss sheets are horizontal strips with per-boss frame sizes declared in `data/assets.ts`. Tileset decor is cut by named rectangles in `DECOR_FRAMES` and registered in `PreloadScene`.

## Verifying in a browser

There is no Playwright dependency in the repo. For headless checks on this machine, Playwright with `channel: 'msedge'` works (Chrome is not installed); drive the game through `window.game.scene` in dev builds.
