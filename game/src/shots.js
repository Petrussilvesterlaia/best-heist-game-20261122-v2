// Velvet Vault — the screenshot scenes behind ?shot=cover|vault|spotted|getaway.
//
// Each one plays the real rules forward from a fresh world: a small pilot
// walks Wren along tile paths (breadth-first over the floor) while the
// Wardens patrol and the cameras sweep, so the frame is a moment a real run
// passes through — and the same scene always lands on the same frame.

import { STEP, TILE, SCREEN_CLEAR, SCREEN_PLAY } from './config.js';
import { isSolid, tileCentre } from './levels.js';
import { EVENT_CLEAR } from './world.js';

/** The tile path from one tile to another over open floor, as [tx, ty] steps. */
function tilePath(level, fromTx, fromTy, toTx, toTy) {
  const key = (x, y) => `${x},${y}`;
  const prev = new Map([[key(fromTx, fromTy), null]]);
  const queue = [[fromTx, fromTy]];
  while (queue.length) {
    const [tx, ty] = queue.shift();
    if (tx === toTx && ty === toTy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = tx + dx;
      const ny = ty + dy;
      if (prev.has(key(nx, ny))) continue;
      const c = tileCentre(nx, ny);
      if (isSolid(level, c.x, c.y)) continue;
      prev.set(key(nx, ny), [tx, ty]);
      queue.push([nx, ny]);
    }
  }
  const path = [];
  let cur = [toTx, toTy];
  while (cur) {
    path.unshift(cur);
    cur = prev.get(key(cur[0], cur[1]));
  }
  return path;
}

/** Walk Wren to a tile, following the floor path, for at most `seconds`. */
function walkTo(world, tx, ty, seconds, sneak = false) {
  const thief = world.state.thief;
  for (let t = 0; t < seconds; t += STEP) {
    const path = tilePath(world.state.level, Math.floor(thief.x / TILE), Math.floor(thief.y / TILE), tx, ty);
    if (path.length < 2) return;
    const next = tileCentre(path[1][0], path[1][1]);
    world.step(STEP, { dx: next.x - thief.x, dy: next.y - thief.y, sneak, coinAt: null });
    if (Math.floor(thief.x / TILE) === tx && Math.floor(thief.y / TILE) === ty) return;
  }
}

/** Let the room breathe with Wren standing still: patrols move, cameras sweep. */
function idle(world, seconds) {
  for (let t = 0; t < seconds; t += STEP) world.step(STEP, { dx: 0, dy: 0, sneak: false, coinAt: null });
}

/**
 * Set `world` to the named scene and return the screen to draw over it. The
 * cover is the first room mid-crossing, with a camera's sweep having just
 * brushed Wren so the alarm meter is awake; the vault is the third room's
 * corridor; spotted is the moment a Warden's cone holds her and the meter is
 * nearly full; getaway is the first room's clear screen.
 */
export function stageShot(name, world) {
  if (name === 'vault') {
    world.loadLevel(2);
    walkTo(world, 11, 5, 14);
    idle(world, 0.4);
    return SCREEN_PLAY;
  }
  if (name === 'spotted') {
    world.loadLevel(1);
    // Stand in front of the gallery's top Warden, wherever his beat has
    // taken him, and let his cone do the rest — the way a careless player
    // gets caught.
    for (let t = 0; t < 12 && world.state.alarm < 82; t += STEP) {
      const guard = world.state.guards[0];
      const tx = guard.x + Math.cos(guard.facing) * 68;
      const ty = guard.y + Math.sin(guard.facing) * 68;
      if (!isSolid(world.state.level, tx, ty)) {
        world.state.thief.x = tx;
        world.state.thief.y = ty;
      }
      world.step(STEP, { dx: 0, dy: 0, sneak: false, coinAt: null });
    }
    return SCREEN_PLAY;
  }
  if (name === 'getaway') {
    world.loadLevel(0);
    idle(world, 24);
    // The short version of a good run: the Star is lifted, the door is
    // reached, the room settles its bonuses — staged by placing Wren, with
    // every rule in between still played.
    const star = world.state.level.loot.find((piece) => piece.kind === 'S');
    world.state.thief.x = star.x;
    world.state.thief.y = star.y;
    world.step(STEP, { dx: 0, dy: 0, sneak: false, coinAt: null });
    world.state.thief.x = world.state.level.exit.x;
    world.state.thief.y = world.state.level.exit.y;
    const events = world.step(STEP, { dx: 0, dy: 0, sneak: false, coinAt: null });
    if (events & EVENT_CLEAR) world.finishLevel();
    return SCREEN_CLEAR;
  }
  // cover: the lobby, crossed on foot to the middle of the top gallery,
  // where Wren waits in the open until the camera's sweep finds her — the
  // meter wakes, the cone is on her, and the frame catches the exact moment
  // the night turns dangerous. The wait is bounded by one full sweep of the
  // camera, so the scene always lands the same way.
  world.loadLevel(0);
  walkTo(world, 12, 3, 14);
  for (let t = 0; t < 14 && world.state.alarm < 26; t += STEP) {
    world.step(STEP, { dx: 0, dy: 0, sneak: false, coinAt: null });
  }
  return SCREEN_PLAY;
}
