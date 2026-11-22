// paint.js — everything the player sees, drawn on one canvas: the HUD strip
// (score, coins, strikes, and the ALARM meter over it all), the room with
// its raycast sight cones, and the screens between rooms.

import { TILE, HUD_H, VIEW_W, VIEW_H, ALARM_MAX } from './tuning.js';
import { tileCenter, totalScore, watchersOf } from './sim.js';
import { conePolygon } from './sight.js';

const INK = '#e8e4d8';
const DIM = '#9a94a8';

function tileRect(ctx, tx, ty) {
  return [tx * TILE, HUD_H + ty * TILE, TILE, TILE];
}

function drawFloorAndWalls(ctx, room) {
  for (let ty = 0; ty < room.grid.length; ty++) {
    for (let tx = 0; tx < room.grid[ty].length; tx++) {
      const ch = room.grid[ty][tx];
      const [x, y] = tileRect(ctx, tx, ty);
      if (ch === '#') {
        ctx.fillStyle = '#2b2f45';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#3a4060';
        ctx.fillRect(x, y, TILE, 5);
        ctx.fillStyle = '#1d2033';
        ctx.fillRect(x, y + TILE - 4, TILE, 4);
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? '#4a4356' : '#443e50';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      }
      if (ch === 'D') {
        // A display case / desk: brass frame, glass top — cover you can hide behind.
        ctx.fillStyle = '#6d5a2e';
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = 'rgba(150,210,235,0.55)';
        ctx.fillRect(x + 6, y + 6, TILE - 12, TILE - 12);
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.fillRect(x + 8, y + 8, TILE - 20, 5);
      }
    }
  }
}

function drawExit(ctx, state) {
  const { tx, ty } = state.room.exit;
  const [x, y] = tileRect(ctx, tx, ty);
  const open = state.hasStar;
  ctx.fillStyle = open ? '#1f7a4d' : '#5d2436';
  ctx.fillRect(x + 4, y + 2, TILE - 8, TILE - 2);
  ctx.strokeStyle = open ? '#7be0a8' : '#c8556e';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 4, y + 2, TILE - 8, TILE - 2);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 9px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', x + TILE / 2, y + TILE / 2 + 3);
  ctx.lineWidth = 1;
}

function drawLootItem(ctx, kind, cx, cy, t) {
  if (kind === 'cash') {
    ctx.fillStyle = '#2e8b57';
    ctx.fillRect(cx - 10, cy - 6, 20, 12);
    ctx.fillStyle = '#57c785';
    ctx.fillRect(cx - 10, cy - 2, 20, 3);
    ctx.fillStyle = '#eafff2';
    ctx.font = 'bold 9px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', cx, cy + 3);
  } else if (kind === 'gold') {
    ctx.fillStyle = '#d9a521';
    ctx.fillRect(cx - 11, cy + 1, 10, 6);
    ctx.fillRect(cx + 1, cy + 1, 10, 6);
    ctx.fillRect(cx - 5, cy - 6, 10, 6);
    ctx.fillStyle = '#f4cd5a';
    ctx.fillRect(cx - 5, cy - 6, 10, 2);
  } else if (kind === 'jewel') {
    ctx.fillStyle = '#39c2d7';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 8, cy);
    ctx.lineTo(cx, cy + 10);
    ctx.lineTo(cx - 8, cy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 4, cy - 1);
    ctx.lineTo(cx - 4, cy - 1);
    ctx.closePath();
    ctx.fill();
  }
}

function drawStar(ctx, cx, cy, t) {
  const pulse = 1 + Math.sin(t * 3.2) * 0.08;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);
  ctx.shadowColor = '#ffd94d';
  ctx.shadowBlur = 16;
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 13 : 5.5;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = Math.cos(a) * r;
    const py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawCones(ctx, state) {
  for (const w of watchersOf(state)) {
    const poly = conePolygon(state.room.grid, w.x, w.y, w.facing, w.half, w.range);
    ctx.beginPath();
    poly.forEach((p, i) => {
      const y = p.y + HUD_H;
      if (i === 0) ctx.moveTo(p.x, y);
      else ctx.lineTo(p.x, y);
    });
    ctx.closePath();
    ctx.fillStyle = w.kind === 'warden' ? 'rgba(255,176,32,0.26)' : 'rgba(84,164,255,0.24)';
    ctx.fill();
  }
}

function drawThief(ctx, state) {
  const { x, y, facing } = state.thief;
  const cy = y + HUD_H;
  if (state.seenNow) {
    ctx.strokeStyle = 'rgba(255,64,64,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, cy, 18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.fillStyle = '#191624';
  ctx.beginPath();
  ctx.arc(x, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#2e2a45';
  ctx.beginPath();
  ctx.arc(x, cy - 2, 8, 0, Math.PI * 2);
  ctx.fill();
  // The way she faces: a pale mask slit.
  ctx.fillStyle = '#e8e4d8';
  ctx.beginPath();
  ctx.arc(x + Math.cos(facing) * 5, cy - 2 + Math.sin(facing) * 5, 3, 0, Math.PI * 2);
  ctx.fill();
  // Her bag, fuller once the Star is in it.
  ctx.fillStyle = state.hasStar ? '#ffd94d' : '#6d5a2e';
  ctx.fillRect(x - 13, cy + 5, 7, 8);
}

function drawWardens(ctx, state) {
  for (const w of state.wardens) {
    const cy = w.y + HUD_H;
    ctx.fillStyle = '#27355e';
    ctx.beginPath();
    ctx.arc(w.x, cy, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3f5aa8';
    ctx.beginPath();
    ctx.arc(w.x, cy - 2, 8, 0, Math.PI * 2);
    ctx.fill();
    // Cap brim toward the gaze.
    ctx.strokeStyle = '#d9d4c5';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(w.x, cy - 2);
    ctx.lineTo(w.x + Math.cos(w.facing) * 13, cy - 2 + Math.sin(w.facing) * 13);
    ctx.stroke();
    ctx.lineWidth = 1;
    if (w.mode === 'go' || w.mode === 'stare') {
      ctx.fillStyle = '#ffdf5e';
      ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', w.x, cy - 18);
    }
  }
  for (const cam of state.cameras) {
    const cy = cam.y + HUD_H;
    ctx.fillStyle = '#14161f';
    ctx.fillRect(cam.x - 8, cy - 8, 16, 16);
    ctx.strokeStyle = '#54a4ff';
    ctx.strokeRect(cam.x - 8, cy - 8, 16, 16);
    ctx.fillStyle = '#54a4ff';
    ctx.beginPath();
    ctx.arc(cam.x + Math.cos(cam.angle) * 5, cy + Math.sin(cam.angle) * 5, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCoins(ctx, state) {
  for (const coin of state.coins) {
    const cy = coin.y + HUD_H;
    const ring = (6 - coin.t) * 9;
    ctx.strokeStyle = 'rgba(255,217,77,0.55)';
    ctx.beginPath();
    ctx.arc(coin.x, cy, 4 + (ring % 22), 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(coin.x, cy, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHud(ctx, state, best) {
  ctx.fillStyle = '#14121f';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = '#2c2842';
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText(`VELVET VAULT — ${state.room.name}`, 14, 26);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = DIM;
  const mins = Math.floor(state.roomTime / 60);
  const secs = Math.floor(state.roomTime % 60).toString().padStart(2, '0');
  ctx.fillText(`par ${state.room.par}s · time ${mins}:${secs}`, 14, 46);

  ctx.fillStyle = INK;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.fillText(`$${totalScore(state)}`, 330, 26);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = DIM;
  ctx.fillText(`coins ${state.coinsLeft} · strikes ${'✕'.repeat(state.strikes)}${'·'.repeat(3 - state.strikes)}`, 330, 46);
  ctx.fillStyle = state.hasStar ? '#ffd94d' : DIM;
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText(state.hasStar ? '★ STAR IN BAG' : '☆ star still out there', 470, 26);
  if (best > 0) {
    ctx.fillStyle = '#ffd94d';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`best night $${best}`, 470, 46);
  }

  // The ALARM meter: the loudest thing on the screen, on purpose.
  const bx = 660, by = 14, bw = 320, bh = 20;
  ctx.fillStyle = DIM;
  ctx.font = 'bold 12px system-ui, sans-serif';
  ctx.fillText('ALARM', bx, by - 2 + 12);
  ctx.fillStyle = '#262238';
  ctx.fillRect(bx + 58, by, bw - 58, bh);
  const frac = state.alarm / ALARM_MAX;
  const grad = ctx.createLinearGradient(bx + 58, 0, bx + bw, 0);
  grad.addColorStop(0, '#57c785');
  grad.addColorStop(0.55, '#ffb020');
  grad.addColorStop(1, '#ff4040');
  ctx.fillStyle = grad;
  if (frac > 0) ctx.fillRect(bx + 58, by, (bw - 58) * frac, bh);
  ctx.strokeStyle = state.alarm > 70 && Math.floor(performance.now() / 250) % 2 === 0 ? '#ff4040' : '#55506e';
  ctx.strokeRect(bx + 58, by, bw - 58, bh);
  if (state.seenNow) {
    ctx.fillStyle = '#ff5e5e';
    ctx.font = 'bold 12px system-ui, sans-serif';
    ctx.fillText('SEEN!', bx + 58, by + bh + 16);
  }
}

function panel(ctx, title, lines) {
  ctx.fillStyle = 'rgba(6,7,14,0.74)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#1b1830';
  ctx.fillRect(VIEW_W / 2 - 320, VIEW_H / 2 - 130, 640, 260);
  ctx.strokeStyle = '#6d5a2e';
  ctx.lineWidth = 2;
  ctx.strokeRect(VIEW_W / 2 - 320, VIEW_H / 2 - 130, 640, 260);
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd94d';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 78);
  ctx.fillStyle = INK;
  ctx.font = '15px system-ui, sans-serif';
  lines.forEach((line, i) => ctx.fillText(line, VIEW_W / 2, VIEW_H / 2 - 34 + i * 24));
  ctx.fillStyle = DIM;
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Enter or click to continue', VIEW_W / 2, VIEW_H / 2 + 108);
  ctx.textAlign = 'left';
}

export function drawScene(ctx, state, opts = {}) {
  const t = state.roomTime;
  ctx.fillStyle = '#14121f';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFloorAndWalls(ctx, state.room);
  drawExit(ctx, state);
  for (const item of state.room.loot) {
    if (state.taken.has(item.id)) continue;
    const c = tileCenter(item.tx, item.ty);
    drawLootItem(ctx, item.kind, c.x, c.y + HUD_H, t);
  }
  if (!state.hasStar) {
    const s = tileCenter(state.room.star.tx, state.room.star.ty);
    drawStar(ctx, s.x, s.y + HUD_H, t);
  }
  drawCones(ctx, state);
  drawCoins(ctx, state);
  drawWardens(ctx, state);
  drawThief(ctx, state);
  drawHud(ctx, state, opts.best ?? 0);

  if (state.message && state.messageTimer > 0 && state.phase === 'playing') {
    ctx.textAlign = 'center';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(10,9,18,0.75)';
    const w = ctx.measureText(state.message).width + 28;
    ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 44, w, 28);
    ctx.fillStyle = '#ffd94d';
    ctx.fillText(state.message, VIEW_W / 2, VIEW_H - 25);
    ctx.textAlign = 'left';
  }

  if (state.phase === 'title') {
    panel(ctx, 'VELVET VAULT', [
      'One night at the Aurum Trust. Three rooms. One Meridian Star.',
      'WASD / arrows to walk · Shift to sneak · click or Q to throw a coin ($25)',
      'Wardens see in amber, cameras in blue. Fill the ALARM and you are caught:',
      'a strike, a $150 fine, and the room starts over. Three strikes end the night.',
      'The EXIT opens only once the Star is in your bag.',
    ]);
  } else if (state.phase === 'caught') {
    ctx.fillStyle = 'rgba(160,10,20,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    panel(ctx, 'CAUGHT!', [
      `Strike ${state.strikes} of 3 — the fine is $150.`,
      'This room’s takings roll back to what you brought in.',
    ]);
  } else if (state.phase === 'roomclear') {
    const c = state.clearInfo;
    panel(ctx, `${c.room} — CLEAN`, [
      `Room takings banked: $${c.roomTotal}`,
      `Time bonus: $${c.timeBonus}${c.ghost ? ` · Ghost bonus (never seen): $${c.ghost}` : ''}`,
      `Night total so far: $${state.banked}`,
    ]);
  } else if (state.phase === 'nightover') {
    panel(ctx, 'THE NIGHT IS OVER', [
      'Three strikes. The Wardens walk Wren out into the street.',
      `She keeps what she banked: $${state.banked}`,
    ]);
  } else if (state.phase === 'complete') {
    panel(ctx, 'A CLEAN GETAWAY', [
      'The Meridian Star is gone, and so is Wren.',
      `Final haul: $${state.banked}`,
      opts.best ? `Best night on this machine: $${opts.best}` : '',
    ]);
  } else if (opts.paused) {
    panel(ctx, 'PAUSED', ['The night holds its breath.']);
  }
}
