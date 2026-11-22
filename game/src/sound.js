// Velvet Vault — ears.
//
// A pocketful of WebAudio bleeps, every one synthesised on the spot, no
// sound files: a coin's ring, the soft tick of loot going into the bag, the
// rising whine while a cone holds Wren, the flat sting of being caught, and
// the little arpeggio of a clean getaway. The audio context only opens after
// a first click or keypress, as browsers require.

/** One oscillator note: frequency, seconds, shape, loudness, and a slide if it bends. */
function note(context, destination, { freq, dur, type = 'square', gain = 0.05, slideTo = null, at = 0 }) {
  const start = context.currentTime + at;
  const osc = context.createOscillator();
  const amp = context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, start + dur);
  amp.gain.setValueAtTime(gain, start);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(amp).connect(destination);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

/** The sound board: call unlock() on the first gesture, then the named bleeps as events land. */
export function createSound() {
  let context = null;
  let master = null;

  function unlock() {
    if (context) {
      if (context.state === 'suspended') context.resume();
      return;
    }
    try {
      context = new (window.AudioContext || window.webkitAudioContext)();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
    } catch {
      context = null;
    }
  }

  function play(spec) {
    if (!context || !master) return;
    note(context, master, spec);
  }

  return {
    unlock,
    coin() {
      play({ freq: 1560, dur: 0.09, type: 'sine', gain: 0.08 });
      play({ freq: 2090, dur: 0.14, type: 'sine', gain: 0.06, at: 0.07 });
    },
    loot() {
      play({ freq: 880, dur: 0.07, type: 'triangle', gain: 0.07 });
      play({ freq: 1320, dur: 0.1, type: 'triangle', gain: 0.06, at: 0.05 });
    },
    star() {
      play({ freq: 660, dur: 0.1, type: 'triangle', gain: 0.08 });
      play({ freq: 990, dur: 0.1, type: 'triangle', gain: 0.08, at: 0.08 });
      play({ freq: 1480, dur: 0.18, type: 'triangle', gain: 0.08, at: 0.16 });
    },
    seen() {
      play({ freq: 220, dur: 0.16, type: 'sawtooth', gain: 0.05, slideTo: 440 });
    },
    caught() {
      play({ freq: 392, dur: 0.16, type: 'square', gain: 0.07 });
      play({ freq: 311, dur: 0.16, type: 'square', gain: 0.07, at: 0.14 });
      play({ freq: 233, dur: 0.3, type: 'square', gain: 0.07, at: 0.28 });
    },
    clear() {
      play({ freq: 523, dur: 0.11, type: 'triangle', gain: 0.08 });
      play({ freq: 659, dur: 0.11, type: 'triangle', gain: 0.08, at: 0.1 });
      play({ freq: 784, dur: 0.11, type: 'triangle', gain: 0.08, at: 0.2 });
      play({ freq: 1046, dur: 0.24, type: 'triangle', gain: 0.08, at: 0.3 });
    },
    click() {
      play({ freq: 1200, dur: 0.04, type: 'sine', gain: 0.04 });
    },
  };
}
