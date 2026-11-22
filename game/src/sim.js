// sim.js — the whole heist as a pure simulation: no DOM, no canvas, no
// clock of its own. boot.js feeds it input and fixed steps; the test suite
// feeds it scripted input and checks the rules. Given the same inputs it
// always plays out the same way.

import {
  TILE, THIEF_RADIUS, THIEF_WALK, THIEF_SNEAK,
  WARDEN_SPEED, WARDEN_RUSH, WARDEN_PAUSE, WARDEN_STARE,
  WARDEN_RANGE, WARDEN_HALF, CAMERA_RANGE, CAMERA_HALF,
  ALARM_MAX, ALARM_DECAY, ALARM_GRACE,
  WARDEN_FILL_NEAR, WARDEN_FILL_FAR, CAMERA_FILL_NEAR, CAMERA_FILL_FAR,
  SNEAK_FILL_SCALE, COINS_PER_ROOM, COIN_COST, COIN_HEARING, COIN_LIFE,
  LOOT_VALUES, CATCH_FINE, MAX_STRIKES, GHOST_BONUS, TIME_BONUS_PER_SEC,
  PICKUP_DIST,
} from './tuning.js';
import { ROOMS, parseRoom, isSolid } from './rooms.js';
import { seenCloseness } from './sight.js';

export function tileCenter(tx, ty) {
  return { x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE };
}

function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * Math.min(1, t);
}

// Does a circle at (x, y) overlap any solid tile?
export function circleHitsSolid(grid, x, y, r) {
  const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
  const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      if (!isSolid(grid, tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      if (Math.hypot(x - cx, y - cy) < r) return true;
    }
  }
  return false;
}

export function createGame() {
  const state = {
    phase: 'title', // title | playing | caught | roomclear | nightover | complete
    roomIndex: 0,
    room: null,
    thief: { x: 0, y: 0, facing: Math.PI / 2 },
    wardens: [],
    cameras: [],
    alarm: 0,
    grace: 0,
    fillRate: 0,
    seenNow: false,
    seenEver: false,
    coinsLeft: COINS_PER_ROOM,
    coins: [],
    taken: new Set(),
    hasStar: false,
    banked: 0,
    roomGain: 0,
    strikes: 0,
    roomTime: 0,
    phaseTimer: 0,
    message: '',
    messageTimer: 0,
    clearInfo: null,
    events: [],
  };
  loadRoom(state, 0);
  return state;
}

function loadRoom(state, index) {
  const room = parseRoom(ROOMS[index]);
  state.room = room;
  const start = tileCenter(room.start.tx, room.start.ty);
  state.thief.x = start.x;
  state.thief.y = start.y;
  state.thief.facing = Math.PI / 2;
  state.wardens = room.wardens.map((def) => {
    const pts = def.path.map(([tx, ty]) => tileCenter(tx, ty));
    const first = pts[0];
    const second = pts[1] ?? pts[0];
    return {
      x: first.x, y: first.y,
      pts, seg: pts.length > 1 ? 1 : 0, dir: 1,
      mode: 'walk', timer: 0,
      facing: Math.atan2(second.y - first.y, second.x - first.x),
      gazeBase: 0, coin: null,
    };
  });
  state.cameras = room.cameras.map((def) => {
    const c = tileCenter(def.tile[0], def.tile[1]);
    return { x: c.x, y: c.y, def, angle: def.base };
  });
  state.alarm = 0;
  state.grace = 0;
  state.fillRate = 0;
  state.seenNow = false;
  state.seenEver = false;
  state.coinsLeft = COINS_PER_ROOM;
  state.coins = [];
  state.taken = new Set();
  state.hasStar = false;
  state.roomGain = 0;
  state.roomTime = 0;
  state.message = '';
  state.messageTimer = 0;
}

export function startNight(state) {
  state.banked = 0;
  state.strikes = 0;
  state.roomIndex = 0;
  state.clearInfo = null;
  loadRoom(state, 0);
  state.phase = 'playing';
}

// Load a room fresh and play it, keeping the night's banked score and
// strikes. Used by the R restart key and by the staged screenshot scenes.
export function jumpToRoom(state, index) {
  state.roomIndex = index;
  loadRoom(state, index);
  state.phase = 'playing';
}

// The one button every non-playing screen answers to.
export function confirm(state) {
  if (state.phase === 'title') startNight(state);
  else if (state.phase === 'roomclear') {
    state.roomIndex += 1;
    loadRoom(state, state.roomIndex);
    state.phase = 'playing';
  } else if (state.phase === 'nightover' || state.phase === 'complete') {
    state.phase = 'title';
    state.roomIndex = 0;
    loadRoom(state, 0);
  }
}

export function totalScore(state) {
  return state.banked + state.roomGain;
}

function setMessage(state, text, seconds = 2.2) {
  state.message = text;
  state.messageTimer = seconds;
}

function throwCoin(state, at) {
  if (state.coinsLeft <= 0) {
    setMessage(state, 'No coins left in this room');
    return;
  }
  state.coinsLeft -= 1;
  // The $25 comes out of the night's takings: banked score first, then
  // what this room has gathered, never below zero on either side.
  const fromBank = Math.min(state.banked, COIN_COST);
  state.banked -= fromBank;
  state.roomGain = Math.max(0, state.roomGain - (COIN_COST - fromBank));
  state.coins.push({ x: at.x, y: at.y, t: COIN_LIFE });
  state.events.push('coin');
}

function moveThief(state, input, dt) {
  const grid = state.room.grid;
  let mx = input.mx ?? 0;
  let my = input.my ?? 0;
  const len = Math.hypot(mx, my);
  if (len > 0) {
    mx /= Math.max(1, len);
    my /= Math.max(1, len);
    state.thief.facing = Math.atan2(my, mx);
  }
  const speed = input.sneak ? THIEF_SNEAK : THIEF_WALK;
  const nx = state.thief.x + mx * speed * dt;
  if (!circleHitsSolid(grid, nx, state.thief.y, THIEF_RADIUS)) state.thief.x = nx;
  const ny = state.thief.y + my * speed * dt;
  if (!circleHitsSolid(grid, state.thief.x, ny, THIEF_RADIUS)) state.thief.y = ny;
}

function moveWarden(state, w, dt) {
  // A ringing coin pulls a warden off his beat.
  if (w.mode === 'walk' || w.mode === 'pause') {
    for (const coin of state.coins) {
      if (Math.hypot(coin.x - w.x, coin.y - w.y) <= COIN_HEARING) {
        w.mode = 'go';
        w.coin = coin;
        break;
      }
    }
  }
  if (w.mode === 'go') {
    const target = w.coin;
    if (!target || target.t <= 0) {
      w.mode = 'walk';
      w.coin = null;
    } else {
      const dx = target.x - w.x;
      const dy = target.y - w.y;
      const dist = Math.hypot(dx, dy);
      w.facing = angleLerp(w.facing, Math.atan2(dy, dx), dt * 10);
      if (dist < 4) {
        w.mode = 'stare';
        w.timer = WARDEN_STARE;
      } else {
        w.x += (dx / dist) * WARDEN_RUSH * dt;
        w.y += (dy / dist) * WARDEN_RUSH * dt;
      }
    }
    return;
  }
  if (w.mode === 'stare') {
    w.timer -= dt;
    if (w.timer <= 0) {
      w.mode = 'walk';
      w.coin = null;
    }
    return;
  }
  if (w.mode === 'pause') {
    w.timer -= dt;
    const elapsed = WARDEN_PAUSE - Math.max(0, w.timer);
    w.facing = w.gazeBase + Math.sin(elapsed * 2.4) * 0.55;
    if (w.timer <= 0) {
      let next = w.seg + w.dir;
      if (next < 0 || next >= w.pts.length) {
        w.dir = -w.dir;
        next = w.seg + w.dir;
      }
      w.seg = Math.max(0, next);
      w.mode = 'walk';
    }
    return;
  }
  // mode 'walk': head for the current waypoint.
  const target = w.pts[w.seg];
  const dx = target.x - w.x;
  const dy = target.y - w.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) {
    w.mode = 'pause';
    w.timer = WARDEN_PAUSE;
    w.gazeBase = w.facing;
  } else {
    w.facing = angleLerp(w.facing, Math.atan2(dy, dx), dt * 8);
    w.x += (dx / dist) * WARDEN_SPEED * dt;
    w.y += (dy / dist) * WARDEN_SPEED * dt;
  }
}

function updateDetection(state, input, dt) {
  const grid = state.room.grid;
  const { x, y } = state.thief;
  let best = 0;
  for (const w of state.wardens) {
    const c = seenCloseness(grid, w.x, w.y, w.facing, WARDEN_HALF, WARDEN_RANGE, x, y);
    if (c > 0) best = Math.max(best, WARDEN_FILL_FAR + (WARDEN_FILL_NEAR - WARDEN_FILL_FAR) * c);
  }
  for (const cam of state.cameras) {
    const c = seenCloseness(grid, cam.x, cam.y, cam.angle, CAMERA_HALF, CAMERA_RANGE, x, y);
    if (c > 0) best = Math.max(best, CAMERA_FILL_FAR + (CAMERA_FILL_NEAR - CAMERA_FILL_FAR) * c);
  }
  if (best > 0 && input.sneak) best *= SNEAK_FILL_SCALE;
  state.fillRate = best;
  state.seenNow = best > 0;
  if (best > 0) {
    state.seenEver = true;
    state.grace = ALARM_GRACE;
    state.alarm = Math.min(ALARM_MAX, state.alarm + best * dt);
    if (state.alarm >= ALARM_MAX) onCaught(state);
  } else {
    state.grace -= dt;
    if (state.grace <= 0) state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
  }
}

function onCaught(state) {
  state.strikes += 1;
  state.banked = Math.max(0, state.banked - CATCH_FINE);
  state.events.push('caught');
  state.phase = 'caught';
  state.phaseTimer = 1.5;
}

function updatePickups(state) {
  const { x, y } = state.thief;
  for (const item of state.room.loot) {
    if (state.taken.has(item.id)) continue;
    const c = tileCenter(item.tx, item.ty);
    if (Math.hypot(c.x - x, c.y - y) < PICKUP_DIST) {
      state.taken.add(item.id);
      state.roomGain += LOOT_VALUES[item.kind];
      state.events.push('pickup');
    }
  }
  if (!state.hasStar) {
    const s = tileCenter(state.room.star.tx, state.room.star.ty);
    if (Math.hypot(s.x - x, s.y - y) < PICKUP_DIST) {
      state.hasStar = true;
      state.events.push('star');
      setMessage(state, 'The Meridian Star is in the bag — GO FOR THE EXIT');
    }
  }
  const ex = state.room.exit;
  if (Math.floor(x / TILE) === ex.tx && Math.floor(y / TILE) === ex.ty) {
    if (state.hasStar) completeRoom(state);
    else if (state.messageTimer <= 0) {
      setMessage(state, 'Locked. The EXIT opens only for the Meridian Star');
      state.events.push('locked');
    }
  }
}

function completeRoom(state) {
  const under = Math.max(0, Math.ceil(state.room.par - state.roomTime));
  const timeBonus = under * TIME_BONUS_PER_SEC;
  const ghost = state.seenEver ? 0 : GHOST_BONUS;
  state.clearInfo = {
    room: state.room.name,
    timeBonus,
    ghost,
    roomTotal: state.roomGain + timeBonus + ghost,
  };
  state.banked += state.roomGain + timeBonus + ghost;
  state.roomGain = 0;
  state.events.push('clear');
  state.phase = state.roomIndex >= ROOMS.length - 1 ? 'complete' : 'roomclear';
}

// One fixed step of the world. `input` is { mx, my, sneak, throwAt }.
export function step(state, input, dt) {
  state.events = [];
  if (state.phase === 'caught') {
    state.phaseTimer -= dt;
    if (state.phaseTimer <= 0) {
      if (state.strikes >= MAX_STRIKES) {
        state.phase = 'nightover';
      } else {
        loadRoom(state, state.roomIndex);
        state.phase = 'playing';
        setMessage(state, 'Caught! The room resets and its takings roll back');
      }
    }
    return state;
  }
  if (state.phase !== 'playing') return state;

  state.roomTime += dt;
  if (state.messageTimer > 0) state.messageTimer -= dt;

  if (input.throwAt) throwCoin(state, input.throwAt);
  moveThief(state, input, dt);
  for (const w of state.wardens) moveWarden(state, w, dt);
  for (const cam of state.cameras) {
    cam.angle = cam.def.base + Math.sin(state.roomTime * cam.def.speed + cam.def.phase) * cam.def.sweep;
  }
  for (const coin of state.coins) coin.t -= dt;
  state.coins = state.coins.filter((c) => c.t > 0);

  updateDetection(state, input, dt);
  if (state.phase === 'playing') updatePickups(state);
  return state;
}

// Every watcher as a sight source, for the renderer and the tests.
export function watchersOf(state) {
  const out = [];
  for (const w of state.wardens) {
    out.push({ kind: 'warden', x: w.x, y: w.y, facing: w.facing, half: WARDEN_HALF, range: WARDEN_RANGE });
  }
  for (const cam of state.cameras) {
    out.push({ kind: 'camera', x: cam.x, y: cam.y, facing: cam.angle, half: CAMERA_HALF, range: CAMERA_RANGE });
  }
  return out;
}
