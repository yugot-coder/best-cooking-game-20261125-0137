# Ember & Thyme — Rush Hour Kitchen

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/yugot-coder/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/yugot-coder/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Ember & Thyme is a rush-hour cooking game: orders land on the board with a patience timer, and you cook them before the tables walk out. Grab buns and patties from the crates, chop lettuce, tomato, cheese and onion on the board, grill the patties (ding means ready — leave one too long and it burns), build each dish on the plate at the assembly counter, and ring the bell at the serving window. Five original recipes, a 150-second shift, combo bonuses for fast serves, and a rush that tightens as the clock runs down. All art is drawn procedurally in canvas and all sound is synthesized in WebAudio — no network, no assets to download.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. Move with WASD or the arrow keys (or click the floor to walk there), press E to interact with the nearest station, P to pause, M to mute, R to start a new shift.

## How it is built

- `game/index.html` — the page: canvas, status line for screen readers.
- `game/src/config.js` — canvas geometry, recipes, station layout, tuning and palette.
- `game/src/world.js` — the rules and state: chef, stations, orders, grill, scoring.
- `game/src/render.js` — one frame: header, order board, kitchen, chef, overlays.
- `game/src/input.js` — keyboard and pointer input, click-to-walk.
- `game/src/audio.js` — WebAudio sound effects, no audio files.
- `game/src/random.js` — seeded randomness, so screenshot scenes repeat.
- `game/src/shots.js` — deterministic demo states for the screenshots (autopilot cooks the orders).
- `game/src/main.js` — bootstrap and frame loop.
- `main.ts` — the make.fun hand-in program: copies `game/` and `screenshots/` to the output and writes `dossier.json`.

Screenshots in `screenshots/` are real renders of the game's own code (`?shot=start|play|rush|end`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=sunny-stork-42&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
