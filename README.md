# best-heist-game-20261122

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Petrussilvesterlaia/best-heist-game-20261122-v2/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Petrussilvesterlaia/best-heist-game-20261122-v2/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

Velvet Vault — a top-down stealth heist game for a desktop browser. You are **Wren**, a cat-burglar working one night at the **Aurum Trust**, a marble-and-brass private bank. Three rooms stand between you and the **Meridian Star**: the Lobby, the Gallery of Glass, and the Vault itself. Slip past the **Wardens** and their sweeping cameras, fill your bag, take the Star, and reach the EXIT door — unseen, if you can.

Everything is drawn on a canvas and sounded with small WebAudio bleeps; there are no image, font, or sound files and no network requests. Open `game/index.html` in a desktop browser, or run `node serve.ts` and visit http://localhost:8080.

Bounty: https://make.fun/bounty/best-heist-game-20261122-0559

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

---

Entered on [make.fun](https://make.fun/?ref=dr95t7s8&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards

## How to play

| Input | What it does |
| --- | --- |
| WASD or arrow keys | Walk (the room scrolls nowhere — the whole heist fits one screen) |
| Shift (hold) | Sneak: slower, and watchers fill the alarm at half rate |
| Mouse click, or Q | Throw a coin toward the pointer (−$25): Wardens in earshot leave their beat to stare at it |
| P or Esc | Pause |
| R | Restart the room (its takings roll back) |
| Enter or click | Confirm: start, next room, try again |

**The rules of the night**

- Wardens see in amber cones; cameras sweep in blue cones. Stand in either and the **ALARM** meter in the HUD climbs — faster the closer you are to the watcher. Leave the light and the meter drains. A full meter is a catch: a strike, a $150 fine, the room's takings rolled back, and the room reset. Three strikes end the night.
- The EXIT door only opens once the **Meridian Star** is in your bag. Everything else — cash stacks ($100), gold bars ($250), jewels ($400) — is optional money on the way.
- Score is loot + a time bonus for beating each room's par + a **$500 Ghost bonus** for finishing a room never seen. Your best night is kept between visits.
- Display cases and desks are cover: they block sight exactly the way they block you. Every room has more than one route — through the cones' rhythm, behind the cases, or past a well-thrown coin.

## Dossier

**Concept.** A complete heist readable in a single frame: the room Wren is crossing, the Wardens mid-patrol with their vision cones, the cameras mid-sweep, the loot on its plinths, the EXIT door, and the alarm meter over it all. Tension comes from one honest question — *how long can I stand in this light?* — asked by a meter that fills by proximity, so a bold dash and a patient sneak are both real strategies with real prices.

**Mechanics.**

- *Vision, simulated and drawn from the same shape.* A watcher's cone is raycast against the room's walls and cases; the polygon that catches Wren is the polygon on the screen, so what you see is exactly what sees you. No unfair catches.
- *An alarm with a memory.* Being seen fills the meter at a rate scaled by closeness (34–95 points/second for a Warden, 26–62 for a camera, halved while sneaking); the strongest watcher wins. A short grace, then it decays at 17/second.
- *Patrols with habits.* Wardens walk waypoint beats, pause at the ends, and sweep their gaze while paused — a beat can be learned, timed, and slipped. Cameras sweep on a sine, each on its own phase.
- *Coins as a tool with a cost.* Three a room, $25 a throw, from score you have already banked. A ringing coin pulls every Warden within earshot off his beat to investigate and stare — bought time, at a price, in exactly the direction you choose.
- *Strikes and rollback.* A catch costs a strike and a fine, and the room's takings roll back to what you had when you entered it — a room can never be farmed by failing it.

**Levels.**

1. **The Lobby** (par 75s) — two Wardens, one camera, the Star in the strongroom corner. Learn the cones, the cases, and the coin.
2. **Gallery of Glass** (par 95s) — three Wardens, two cameras, cases down the middle. The first room where the direct line is never the safe line.
3. **The Vault** (par 115s) — four Wardens, three cameras, the Star in a glass case in the vault chamber, watched from two sides. The whole night's lessons at once.

**Controls.** As the table above: WASD/arrows to move, Shift to sneak, click or Q to throw a coin at the pointer, P/Esc to pause, R to restart a room, Enter/click to confirm.

**Construction.** Plain ES modules under `game/src/`, one job each: `config.js` (every tuning number), `levels.js` (the three rooms as tile maps), `vision.js` (sight and cones), `world.js` (the whole simulation, DOM-free and testable in Node), `input.js`, `sound.js`, `render.js`, `shots.js` (the staged `?shot=` scenes the screenshots are taken from), and `main.js` (the boot and the screen flow). `main.ts` at the root copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored builder. Screenshots are staged by playing the real rules forward — see `shots.json`.

## Running the build

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This produces `out/game/`, `out/screenshots/`, and `out/dossier.json`.
