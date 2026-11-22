// boot.js — wires the simulation to the page: the fixed-step loop, the
// screen flow, sound cues, the best-night record, and the staged
// screenshot mode (?shot=<scene>&seed=1) that sets window.__shotReady.

import { FIXED_DT, VIEW_W, VIEW_H, HUD_H } from './tuning.js';
import { createGame, confirm, jumpToRoom, step } from './sim.js';
import { createInput } from './keys.js';
import { createSound } from './beeps.js';
import { drawScene } from './paint.js';
import { stageShot } from './staging.js';

const canvas = document.getElementById('stage');
canvas.width = VIEW_W;
canvas.height = VIEW_H;
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

if (shotName) {
  // Screenshot mode: stage the scene, draw it once, and say so.
  const state = stageShot(shotName, params.get('seed') ?? '1');
  window.__heist = state;
  requestAnimationFrame(() => {
    drawScene(ctx, state, {});
    window.__shotReady = true;
  });
} else {
  const sound = createSound();
  const state = createGame();
  window.__heist = state;

  const BEST_KEY = 'velvet-vault-best';
  let best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
  let paused = false;

  const input = createInput(canvas, {
    isPlaying: () => state.phase === 'playing' && !paused,
    onConfirm: () => {
      if (state.phase !== 'playing' && state.phase !== 'caught') {
        confirm(state);
        sound.play('click');
      }
    },
    onPause: () => {
      if (state.phase === 'playing') paused = !paused;
    },
    onRestart: () => {
      if (state.phase === 'playing') jumpToRoom(state, state.roomIndex);
    },
  });

  let last = performance.now();
  let acc = 0;
  let tickClock = 0;
  let wasPhase = state.phase;

  function frame(now) {
    requestAnimationFrame(frame);
    let elapsed = (now - last) / 1000;
    last = now;
    if (elapsed > 0.25) elapsed = 0.25;
    if (!paused) {
      acc += elapsed;
      while (acc >= FIXED_DT) {
        acc -= FIXED_DT;
        const throwAt = input.takeThrow();
        step(state, {
          mx: input.mx,
          my: input.my,
          sneak: input.sneak,
          throwAt: throwAt ? { x: throwAt.x, y: throwAt.y - HUD_H } : null,
        }, FIXED_DT);
        for (const ev of state.events) sound.play(ev);
        if (state.seenNow) {
          tickClock += FIXED_DT;
          if (tickClock > 0.25) {
            tickClock = 0;
            sound.play('tick');
          }
        } else {
          tickClock = 0;
        }
      }
    }
    if (state.phase !== wasPhase) {
      if ((state.phase === 'complete' || state.phase === 'nightover') && state.banked > best) {
        best = state.banked;
        localStorage.setItem(BEST_KEY, String(best));
      }
      wasPhase = state.phase;
    }
    drawScene(ctx, state, { paused, best });
  }
  requestAnimationFrame(frame);
}
