// keys.js — keyboard and mouse, translated into the simulation's input
// shape: a movement vector, a sneak flag, and coin throws at the pointer.
// boot.js owns the screen flow, so confirm/pause/restart presses are
// reported through callbacks instead of being baked in here.

export function createInput(canvas, hooks) {
  const held = new Set();
  const input = { mx: 0, my: 0, sneak: false, throwAt: null };
  let pointer = { x: 0, y: 0 };

  function recompute() {
    input.mx = (held.has('right') ? 1 : 0) - (held.has('left') ? 1 : 0);
    input.my = (held.has('down') ? 1 : 0) - (held.has('up') ? 1 : 0);
    input.sneak = held.has('sneak');
  }

  const KEYMAP = {
    KeyW: 'up', ArrowUp: 'up',
    KeyS: 'down', ArrowDown: 'down',
    KeyA: 'left', ArrowLeft: 'left',
    KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'sneak', ShiftRight: 'sneak',
  };

  window.addEventListener('keydown', (e) => {
    if (KEYMAP[e.code]) {
      held.add(KEYMAP[e.code]);
      recompute();
      e.preventDefault();
      return;
    }
    if (e.code === 'Enter') hooks.onConfirm();
    else if (e.code === 'KeyP' || e.code === 'Escape') hooks.onPause();
    else if (e.code === 'KeyR') hooks.onRestart();
    else if (e.code === 'KeyQ') input.throwAt = { ...pointer };
  });
  window.addEventListener('keyup', (e) => {
    if (KEYMAP[e.code]) {
      held.delete(KEYMAP[e.code]);
      recompute();
    }
  });

  function canvasPoint(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  }
  canvas.addEventListener('mousemove', (e) => {
    pointer = canvasPoint(e);
  });
  canvas.addEventListener('mousedown', (e) => {
    pointer = canvasPoint(e);
    // A click means "confirm" on the menu screens and "throw a coin"
    // during play; boot.js tells us which world we are in.
    if (hooks.isPlaying()) input.throwAt = { ...pointer };
    else hooks.onConfirm();
  });

  // boot.js reads the pending throw once per step and clears it.
  input.takeThrow = () => {
    const t = input.throwAt;
    input.throwAt = null;
    return t;
  };
  return input;
}
