// staging.js — the four screenshot scenes. Each one builds a real game
// state, plays the real rules forward for a couple of seconds so the
// wardens and cameras are honestly mid-beat, then poses Wren and sets the
// alarm where the scene needs it. Nothing is drawn here that the game
// itself would not draw; boot.js renders the state and flags
// window.__shotReady for the screenshot harness.

import { FIXED_DT } from './tuning.js';
import { createGame, startNight, jumpToRoom, step, tileCenter } from './sim.js';
import { seedFromText } from './rng.js';

const IDLE = { mx: 0, my: 0, sneak: false, throwAt: null };

function preRoll(state, seconds) {
  const steps = Math.round(seconds / FIXED_DT);
  for (let i = 0; i < steps; i++) step(state, IDLE, FIXED_DT);
}

function placeThief(state, tx, ty) {
  const c = tileCenter(tx, ty);
  state.thief.x = c.x;
  state.thief.y = c.y;
}

// The cover: the Lobby, mid-crossing. Wren is in the middle chamber with
// two cash stacks already in her bag and the alarm a third full.
function stageCover(state) {
  preRoll(state, 2.4);
  state.taken.add(1);
  state.taken.add(3);
  state.roomGain = 200;
  placeThief(state, 11, 5);
  state.thief.facing = -0.5;
  state.alarm = 34;
  state.seenNow = true;
}

// The Vault room: Wren inside the chamber, the Meridian Star in its case
// above her, both vault cameras sweeping past.
function stageVault(state) {
  jumpToRoom(state, 2);
  preRoll(state, 1.8);
  placeThief(state, 11, 5);
  state.thief.facing = -Math.PI / 2;
  state.alarm = 12;
}

// Spotted: the Lobby warden mid-patrol walks his beat on row 3; the scene
// waits for him to head east, then puts Wren in his light, alarm near full.
function stageSpotted(state) {
  for (let i = 0; i < 60 * 20; i++) {
    step(state, IDLE, FIXED_DT);
    const w = state.wardens[0];
    if (w.mode === 'walk' && w.x > 320 && w.x < 370 && Math.abs(w.facing) < 0.4) {
      state.thief.x = w.x + 78;
      state.thief.y = w.y;
      state.thief.facing = Math.PI;
      break;
    }
  }
  state.alarm = 86;
  state.seenNow = true;
}

// Getaway: everything but the jewel case is hers, the Star is in the bag,
// and Wren is one step from the open EXIT.
function stageGetaway(state) {
  preRoll(state, 1.2);
  for (const id of [0, 1, 2, 3, 4]) state.taken.add(id);
  state.roomGain = 800;
  state.hasStar = true;
  state.coinsLeft = 1;
  placeThief(state, 2, 1);
  state.thief.facing = Math.PI;
  state.alarm = 18;
}

const SCENES = {
  cover: stageCover,
  vault: stageVault,
  spotted: stageSpotted,
  getaway: stageGetaway,
};

export function stageShot(name, seedText) {
  const state = createGame();
  startNight(state);
  // The seed is accepted for the plan's sake; the simulation is fully
  // deterministic, so a named scene is the same picture on every visit.
  void seedFromText(seedText);
  (SCENES[name] ?? stageCover)(state);
  return state;
}
