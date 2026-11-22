// Velvet Vault — hands.
//
// The keyboard walks Wren (WASD or the arrow keys), Shift makes her sneak,
// and the mouse aims a thrown coin (a click, or Q, tosses one toward the
// pointer). Space and Enter confirm, P or Esc pauses, R restarts a room.
// The input only reports; the world decides what any of it means.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;

const MOVE_KEYS = {
  KeyW: [0, -1], ArrowUp: [0, -1],
  KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0],
  KeyD: [1, 0], ArrowRight: [1, 0],
};

/**
 * Watch a canvas for keys and the pointer. Returns the three things the loop
 * asks each frame: direction() (the held movement keys as a vector),
 * sneak() (Shift held), and takeActions() / takeCoin() (one-shot events
 * since the last frame, consumed by reading).
 */
export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let coinAt = null;
  const pointer = { x: 0, y: 0 };

  function toWorld(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * canvas.width,
      y: ((event.clientY - rect.top) / rect.height) * canvas.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (MOVE_KEYS[event.code] || event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      held.add(event.code);
      event.preventDefault();
    }
    if (event.repeat) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      actions |= ACTION_PAUSE;
    } else if (event.code === 'KeyR') {
      actions |= ACTION_RESTART;
    } else if (event.code === 'KeyQ') {
      coinAt = { ...pointer };
    }
  });
  window.addEventListener('keyup', (event) => held.delete(event.code));
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointermove', (event) => Object.assign(pointer, toWorld(event)));
  canvas.addEventListener('pointerdown', (event) => {
    Object.assign(pointer, toWorld(event));
    actions |= ACTION_CONFIRM;
    coinAt = { ...pointer };
  });

  return {
    direction() {
      let dx = 0;
      let dy = 0;
      for (const code of held) {
        const move = MOVE_KEYS[code];
        if (move) {
          dx += move[0];
          dy += move[1];
        }
      }
      return { dx, dy };
    },
    sneak() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    pointer() {
      return { ...pointer };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeCoin() {
      const taken = coinAt;
      coinAt = null;
      return taken;
    },
  };
}
