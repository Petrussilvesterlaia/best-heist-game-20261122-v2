// Velvet Vault — the boot.
//
// Find the canvas, wire the world, the renderer, the input and the sound
// together, and run the night: three rooms of the Aurum Trust, one fixed
// clock tick at a time. It also stages the ?shot= scenes the screenshots are
// taken from: play the scene, paint it twice, then raise __shotReady.

import {
  BEST_KEY, HUD_H, SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED,
  SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, STEP, WORLD_H, WORLD_W,
} from './config.js';
import {
  createWorld, EVENT_CAUGHT, EVENT_CLEAR, EVENT_COIN, EVENT_LOOT,
  EVENT_SEEN, EVENT_STAR,
} from './world.js';
import { createRenderer } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART } from './input.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = createRenderer(canvas);
const world = createWorld();
const sound = createSound();

function readBest() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // A private window keeps no best; the night still counts.
  }
}

let best = readBest();
let screen = SCREEN_TITLE;

/** A fresh night: no score, no strikes, the lobby set and waiting. */
function startNight() {
  world.state.score = 0;
  world.state.strikes = 0;
  world.state.totalTime = 0;
  world.state.over = false;
  world.state.won = false;
  world.loadLevel(0);
  screen = SCREEN_PLAY;
}

/** After a room settles, bank the best score the night has reached. */
function bankBest() {
  if (world.state.score > best) {
    best = world.state.score;
    saveBest(best);
  }
}

/** Turn one frame of input into world steps and screen changes, sounds included. */
function playStep(input) {
  const dir = input.direction();
  const coinRaw = input.takeCoin();
  let coinAt = null;
  if (coinRaw) {
    coinAt = {
      x: Math.min(Math.max(coinRaw.x, 8), WORLD_W - 8),
      y: Math.min(Math.max(coinRaw.y - HUD_H, 8), WORLD_H - 8),
    };
  }
  const events = world.step(STEP, { dx: dir.dx, dy: dir.dy, sneak: input.sneak(), coinAt });
  if (events & EVENT_COIN) sound.coin();
  if (events & EVENT_LOOT) sound.loot();
  if (events & EVENT_STAR) sound.star();
  if (events & EVENT_SEEN) sound.seen();
  if (events & EVENT_CAUGHT) {
    sound.caught();
    world.caught();
    bankBest();
    screen = world.state.over ? SCREEN_OVER : SCREEN_CAUGHT;
  } else if (events & EVENT_CLEAR) {
    sound.clear();
    world.finishLevel();
    bankBest();
    screen = world.state.won ? SCREEN_WIN : SCREEN_CLEAR;
  }
}

/** The live game: keyboard, mouse, screens, and a fixed-step clock that cannot spiral. */
function runGame() {
  const input = createInput(canvas);
  let last = performance.now();
  let backlog = 0;

  function frame(now) {
    requestAnimationFrame(frame);
    backlog = Math.min(backlog + (now - last) / 1000, 0.25);
    last = now;
    const actions = input.takeActions();
    // A click that pressed a menu button also aimed a coin; off the play
    // screen it is drained, so starting a room never begins with a throw
    // nobody meant.
    if (screen !== SCREEN_PLAY) input.takeCoin();
    while (backlog >= STEP) {
      backlog -= STEP;
      if (screen === SCREEN_PLAY) {
        if (actions & ACTION_PAUSE) {
          screen = SCREEN_PAUSED;
          break;
        }
        if (actions & ACTION_RESTART) {
          world.state.score = world.state.scoreAtLoad;
          world.loadLevel(world.state.levelIndex);
          break;
        }
        playStep(input);
      } else if (screen === SCREEN_TITLE) {
        // Behind the title the night goes on: Wardens patrol and cameras sweep, unseen.
        world.step(STEP, { dx: 0, dy: 0, sneak: false, coinAt: null });
        if (actions & ACTION_CONFIRM) {
          sound.unlock();
          sound.click();
          startNight();
        }
        break;
      } else if (screen === SCREEN_PAUSED) {
        if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) screen = SCREEN_PLAY;
        break;
      } else if (screen === SCREEN_CAUGHT) {
        if (actions & ACTION_CONFIRM) screen = SCREEN_PLAY;
        break;
      } else if (screen === SCREEN_CLEAR) {
        if (actions & ACTION_CONFIRM) {
          world.loadLevel(world.state.levelIndex + 1);
          screen = SCREEN_PLAY;
        }
        break;
      } else if (screen === SCREEN_WIN || screen === SCREEN_OVER) {
        if (actions & ACTION_CONFIRM) startNight();
        break;
      }
    }
    renderer.draw(world.state, screen, best);
    statusEl.textContent = `Velvet Vault — room ${world.state.levelIndex + 1} of 3, score $${world.state.score}, alarm ${Math.round(world.state.alarm)} of 100.`;
  }
  requestAnimationFrame(frame);
}

// A staged screenshot wins over the live game: set the scene, paint it
// twice (the second paint is the frame the screenshot keeps), and say so.
const shot = params.get('shot');
if (shot) {
  screen = stageShot(shot, world);
  renderer.draw(world.state, screen, best);
  renderer.draw(world.state, screen, best);
  window.__shotReady = true;
} else {
  runGame();
}
