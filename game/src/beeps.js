// beeps.js — the night's small sounds, synthesised with WebAudio.
// No audio files: a pickup is two sine notes, a coin is a bright ring,
// the alarm is a rising saw, and a catch is a falling sting.

export function createSound() {
  let ctx = null;
  function ac() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, at, dur, type = 'sine', gain = 0.08, slideTo = null) {
    const acx = ac();
    if (!acx) return;
    const t0 = acx.currentTime + at;
    const osc = acx.createOscillator();
    const amp = acx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    amp.gain.setValueAtTime(gain, t0);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(acx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  const sounds = {
    pickup() { tone(880, 0, 0.07); tone(1318, 0.06, 0.09); },
    star() { tone(659, 0, 0.09); tone(880, 0.08, 0.09); tone(1318, 0.16, 0.16); },
    coin() { tone(2093, 0, 0.12, 'triangle', 0.06); tone(2637, 0.05, 0.14, 'triangle', 0.05); },
    locked() { tone(196, 0, 0.1, 'square', 0.05); },
    tick() { tone(1568, 0, 0.03, 'square', 0.03); },
    caught() { tone(392, 0, 0.32, 'sawtooth', 0.09, 98); },
    clear() { tone(523, 0, 0.1); tone(659, 0.09, 0.1); tone(784, 0.18, 0.1); tone(1046, 0.27, 0.2); },
    click() { tone(1046, 0, 0.04, 'triangle', 0.05); },
  };

  return {
    play(name) {
      try {
        sounds[name]?.();
      } catch {
        /* sound is garnish; never let it break the heist */
      }
    },
  };
}
