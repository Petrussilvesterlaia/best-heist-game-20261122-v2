// sight.js — who can see what. One honest rule drives both the picture and
// the simulation: a watcher's cone is raycast against the room's solid
// tiles, and the polygon that is drawn is the polygon that catches Wren.

import { TILE } from './tuning.js';
import { isSolid } from './rooms.js';

// March a ray from (ox, oy) along `angle` until it enters a solid tile or
// runs out of range; return the distance it travelled.
export function rayDistance(grid, ox, oy, angle, range) {
  const step = 3;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  // Start a little past the watcher's own tile: a camera sits inside a
  // wall tile and must not blind itself with its own mounting.
  let d = TILE * 0.55;
  while (d < range) {
    const x = ox + dx * d;
    const y = oy + dy * d;
    if (isSolid(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return d;
    d += step;
  }
  return range;
}

// The visible fan of a watcher as a polygon: the watcher's position plus
// one point per ray across the cone.
export function conePolygon(grid, ox, oy, facing, halfAngle, range, rays = 30) {
  const pts = [{ x: ox, y: oy }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - halfAngle + (2 * halfAngle * i) / rays;
    const d = rayDistance(grid, ox, oy, a, range);
    pts.push({ x: ox + Math.cos(a) * d, y: oy + Math.sin(a) * d });
  }
  return pts;
}

// Could a watcher at (ox, oy) looking along `facing` see the point (px, py)?
// Returns 0 when unseen, else the closeness 0..1 (1 = point blank), which
// the alarm uses to scale how fast being seen turns into being caught.
export function seenCloseness(grid, ox, oy, facing, halfAngle, range, px, py) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return 0;
  let diff = Math.atan2(dy, dx) - facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > halfAngle) return 0;
  // Walk the segment; any solid tile on the way (past the watcher's own
  // mounting tile) hides the point.
  const steps = Math.max(2, Math.ceil(dist / 4));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (t * dist < TILE * 0.55) continue;
    const x = ox + dx * t;
    const y = oy + dy * t;
    if (isSolid(grid, Math.floor(x / TILE), Math.floor(y / TILE))) return 0;
  }
  return 1 - dist / range;
}

// Point-in-polygon for the drawn cone, used by the renderer to tint the
// floor Wren stands on when she is lit. Even-odd ray casting.
export function pointInPolygon(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
