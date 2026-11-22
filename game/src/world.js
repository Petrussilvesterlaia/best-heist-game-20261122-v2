// Velvet Vault — the world as numbers.
//
// Wren, the Wardens on their beats, the sweeping cameras, the loot, the
// alarm, and the rules that move them all. This file never touches the page,
// so a test can play it headlessly and the renderer only paints what is here.
//
// One step takes the thief's input ({dx, dy, sneak, coinAt}) and returns the
// events that happened in it, as a bitmask the boot turns into sounds and
// screen changes.

import {
  ALARM_DECAY, ALARM_GRACE, ALARM_MAX, CAMERA_CONE_HALF, CAMERA_CONE_RANGE,
  CAMERA_SPOT_FAR, CAMERA_SPOT_NEAR, CAUGHT_PENALTY, COIN_COST, COIN_DISTRACT,
  COIN_HEAR, GHOST_BONUS, GUARD_CONE_HALF, GUARD_CONE_RANGE, GUARD_PAUSE,
  GUARD_RADIUS, GUARD_SPOT_FAR, GUARD_SPOT_NEAR, GUARD_SPEED, MAX_STRIKES,
  THIEF_RADIUS, THIEF_SNEAK_SPEED, THIEF_SPEED, TILE, TIME_BONUS_PER_SECOND,
} from './config.js';
import { LEVELS, isSolid, parseLevel } from './levels.js';
import { angleDifference, distance, seenAmount } from './vision.js';

export const EVENT_LOOT = 1;
export const EVENT_STAR = 2;
export const EVENT_SEEN = 4;
export const EVENT_CAUGHT = 8;
export const EVENT_CLEAR = 16;
export const EVENT_COIN = 32;

/**
 * How far a body of `radius` at (x, y) may slide along one axis before a
 * solid tile stops it. The body's four corners are probed, nudged in by a
 * pixel so that hugging a wall is allowed.
 */
function slideAxis(level, x, y, radius, delta, axis) {
  if (delta === 0) return axis === 'x' ? x : y;
  const nx = axis === 'x' ? x + delta : x;
  const ny = axis === 'y' ? y + delta : y;
  const corners = [
    [nx - radius + 1, ny - radius + 1],
    [nx + radius - 1, ny - radius + 1],
    [nx - radius + 1, ny + radius - 1],
    [nx + radius - 1, ny + radius - 1],
  ];
  for (const [px, py] of corners) {
    if (isSolid(level, px, py)) return axis === 'x' ? x : y;
  }
  return axis === 'x' ? nx : ny;
}

/** Move a body by (dx, dy), sliding along walls: the x axis first, then y. */
export function moveBody(level, body, dx, dy) {
  body.x = slideAxis(level, body.x, body.y, body.radius, dx, 'x');
  body.y = slideAxis(level, body.x, body.y, body.radius, dy, 'y');
}

/** A Warden at the start of his beat: on his first waypoint, facing along it. */
function makeGuard(spec) {
  const [first, second] = spec.waypoints;
  return {
    x: first.x,
    y: first.y,
    radius: GUARD_RADIUS,
    waypoints: spec.waypoints,
    target: 1 % spec.waypoints.length,
    wait: 0,
    facing: Math.atan2(second.y - first.y, second.x - first.x),
    scanBase: 0,
    investigate: null,
    seeing: 0,
  };
}

/** A camera on its mount: its lens angle swings around `base` as the clock runs. */
function makeCamera(spec) {
  return { ...spec, angle: spec.base, seeing: 0 };
}

/**
 * The whole game state and the verbs that change it. `loadLevel(n)` sets a
 * room up; `step(dt, input)` plays one fixed step and returns the events in
 * it; `caught()` and `finishLevel()` settle what a catch or a clear means
 * for the score.
 */
export function createWorld() {
  const state = {
    levelIndex: 0,
    level: null,
    thief: { x: 0, y: 0, radius: THIEF_RADIUS, facing: -Math.PI / 2, moving: false, sneak: false },
    guards: [],
    cameras: [],
    alarm: 0,
    sinceSeen: 99,
    seenNow: false,
    seenEver: false,
    hasStar: false,
    lootTaken: 0,
    coinsLeft: 0,
    coin: null,
    score: 0,
    scoreAtLoad: 0,
    strikes: 0,
    levelTime: 0,
    totalTime: 0,
    lastClear: null,
    over: false,
    won: false,
  };

  function loadLevel(index) {
    const level = parseLevel(LEVELS[index], index);
    state.levelIndex = index;
    state.level = level;
    state.thief.x = level.start.x;
    state.thief.y = level.start.y;
    state.thief.facing = -Math.PI / 2;
    state.guards = level.guards.map(makeGuard);
    state.cameras = level.cameras.map(makeCamera);
    state.alarm = 0;
    state.sinceSeen = 99;
    state.seenNow = false;
    state.seenEver = false;
    state.hasStar = false;
    state.lootTaken = 0;
    state.coinsLeft = level.coins;
    state.coin = null;
    state.levelTime = 0;
    state.lastClear = null;
    // What the score was when this room was set up: a catch or a restart
    // rolls the room's takings back to it, so a room can never be farmed by
    // failing it on purpose.
    state.scoreAtLoad = state.score;
  }

  /** Send a Warden to look at a noise: he leaves his beat, stares, then returns. */
  function distract(guard, x, y) {
    guard.investigate = { x, y, stare: COIN_DISTRACT };
    guard.wait = 0;
  }

  function stepGuard(guard, dt) {
    if (guard.investigate) {
      const goal = guard.investigate;
      const d = distance(guard.x, guard.y, goal.x, goal.y);
      const reach = Math.min(d, GUARD_SPEED * 1.25 * dt);
      const nx = d > 0 ? guard.x + ((goal.x - guard.x) / d) * reach : guard.x;
      const ny = d > 0 ? guard.y + ((goal.y - guard.y) / d) * reach : guard.y;
      // A coin can land anywhere, even somewhere a Warden cannot stand: if
      // the way is blocked he stops at the wall and stares from there
      // instead of walking through it.
      if (d > 26 && !isSolid(state.level, nx, ny)) {
        guard.x = nx;
        guard.y = ny;
        guard.facing = Math.atan2(goal.y - guard.y, goal.x - guard.x);
      } else {
        guard.facing += Math.sin(state.levelTime * 2.4 + guard.waypoints[0].x) * dt * 0.9;
        goal.stare -= dt;
        if (goal.stare <= 0) guard.investigate = null;
      }
      return;
    }
    if (guard.wait > 0) {
      guard.wait -= dt;
      // At the end of a beat a Warden scans: his cone sweeps a little either
      // side of the way he came — the moment a patient thief waits for.
      guard.facing = guard.scanBase + Math.sin(state.levelTime * 1.7 + guard.waypoints[0].y) * 0.5;
      return;
    }
    const goal = guard.waypoints[guard.target];
    const d = distance(guard.x, guard.y, goal.x, goal.y);
    if (d < 4) {
      guard.target = (guard.target + 1) % guard.waypoints.length;
      guard.wait = GUARD_PAUSE;
      guard.scanBase = guard.facing;
      return;
    }
    const stepLen = Math.min(d, GUARD_SPEED * dt);
    const nx = guard.x + ((goal.x - guard.x) / d) * stepLen;
    const ny = guard.y + ((goal.y - guard.y) / d) * stepLen;
    if (!isSolid(state.level, nx, ny)) {
      guard.x = nx;
      guard.y = ny;
    } else {
      guard.target = (guard.target + 1) % guard.waypoints.length;
    }
    guard.facing = Math.atan2(goal.y - guard.y, goal.x - guard.x);
  }

  function step(dt, input) {
    let events = 0;
    const level = state.level;
    const thief = state.thief;
    state.levelTime += dt;
    state.totalTime += dt;

    // Wren moves: the input direction, normalised, at walk or sneak speed.
    const mag = Math.hypot(input.dx, input.dy);
    thief.moving = mag > 0;
    thief.sneak = !!input.sneak;
    if (mag > 0) {
      const speed = thief.sneak ? THIEF_SNEAK_SPEED : THIEF_SPEED;
      moveBody(level, thief, (input.dx / mag) * speed * dt, (input.dy / mag) * speed * dt);
      thief.facing = Math.atan2(input.dy, input.dx);
    }

    // A thrown coin lands and rings: Wardens close enough turn to look at it.
    if (input.coinAt && state.coinsLeft > 0 && !state.coin) {
      state.coinsLeft -= 1;
      state.score = Math.max(0, state.score - COIN_COST);
      state.coin = { x: input.coinAt.x, y: input.coinAt.y, t: COIN_DISTRACT + 1.2 };
      for (const guard of state.guards) {
        if (distance(guard.x, guard.y, state.coin.x, state.coin.y) <= COIN_HEAR) {
          distract(guard, state.coin.x, state.coin.y);
        }
      }
      events |= EVENT_COIN;
    }
    if (state.coin) {
      state.coin.t -= dt;
      if (state.coin.t <= 0) state.coin = null;
    }

    for (const guard of state.guards) stepGuard(guard, dt);
    for (const camera of state.cameras) {
      camera.angle = camera.base + Math.sin(state.levelTime * camera.speed + camera.phase) * camera.sweep;
    }

    // Being seen: the strongest watcher sets the pace, sneaking halves it.
    let worst = 0;
    let anySeen = false;
    for (const guard of state.guards) {
      guard.seeing = seenAmount(level, guard.x, guard.y, guard.facing, GUARD_CONE_HALF, GUARD_CONE_RANGE, thief.x, thief.y);
      if (guard.seeing > 0) {
        anySeen = true;
        worst = Math.max(worst, GUARD_SPOT_FAR + (GUARD_SPOT_NEAR - GUARD_SPOT_FAR) * guard.seeing);
      }
    }
    for (const camera of state.cameras) {
      camera.seeing = seenAmount(level, camera.x, camera.y, camera.angle, CAMERA_CONE_HALF, CAMERA_CONE_RANGE, thief.x, thief.y);
      if (camera.seeing > 0) {
        anySeen = true;
        worst = Math.max(worst, CAMERA_SPOT_FAR + (CAMERA_SPOT_NEAR - CAMERA_SPOT_FAR) * camera.seeing);
      }
    }
    if (anySeen) {
      if (!state.seenNow) events |= EVENT_SEEN;
      state.seenNow = true;
      state.seenEver = true;
      state.sinceSeen = 0;
      state.alarm += worst * (thief.sneak ? 0.5 : 1) * dt;
    } else {
      state.seenNow = false;
      state.sinceSeen += dt;
      if (state.sinceSeen > ALARM_GRACE) state.alarm -= ALARM_DECAY * dt;
    }
    state.alarm = Math.max(0, Math.min(ALARM_MAX, state.alarm));
    if (state.alarm >= ALARM_MAX) {
      events |= EVENT_CAUGHT;
      return events;
    }

    // Loot is taken by walking over it; the Star is the piece the exit asks for.
    for (const piece of level.loot) {
      if (piece.taken) continue;
      if (distance(thief.x, thief.y, piece.x, piece.y) < THIEF_RADIUS + 13) {
        piece.taken = true;
        state.lootTaken += piece.value;
        state.score += piece.value;
        events |= EVENT_LOOT;
        if (piece.kind === 'S') {
          state.hasStar = true;
          events |= EVENT_STAR;
        }
      }
    }

    // The exit door opens only with the Star in the bag.
    if (state.hasStar) {
      const tx = Math.floor(thief.x / TILE);
      const ty = Math.floor(thief.y / TILE);
      if (tx === level.exit.tx && ty === level.exit.ty) events |= EVENT_CLEAR;
    }
    return events;
  }

  /** Caught: a strike, the room's takings rolled back plus a fine, room reset. */
  function caught() {
    state.strikes += 1;
    state.score = Math.max(0, state.scoreAtLoad - CAUGHT_PENALTY);
    if (state.strikes >= MAX_STRIKES) {
      state.over = true;
      return;
    }
    loadLevel(state.levelIndex);
  }

  /** A room cleared: time and ghost bonuses settle, and takings are banked. */
  function finishLevel() {
    const timeBonus = Math.max(0, Math.round((state.level.par - state.levelTime) * TIME_BONUS_PER_SECOND));
    const ghostBonus = state.seenEver ? 0 : GHOST_BONUS;
    state.score += timeBonus + ghostBonus;
    state.lastClear = {
      loot: state.lootTaken,
      timeBonus,
      ghostBonus,
      seconds: state.levelTime,
      levelName: state.level.name,
    };
    if (state.levelIndex + 1 >= LEVELS.length) state.won = true;
    return state.lastClear;
  }

  loadLevel(0);
  return { state, loadLevel, step, caught, finishLevel };
}
