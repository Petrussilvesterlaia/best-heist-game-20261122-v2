// rng.js — a tiny deterministic random source (mulberry32).
// The staged screenshot scenes seed it so a scene is the same picture
// every time it is opened; live play never depends on it.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable integer seed from the ?seed= query value, so seed=1 in the
// screenshot plan always means the same staging.
export function seedFromText(text) {
  const s = String(text ?? '1');
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
