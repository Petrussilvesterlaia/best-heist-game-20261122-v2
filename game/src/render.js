// Velvet Vault — the painting.
//
// Everything the player sees, drawn from the world state and nothing else.
// Marble floor and brass trim for the Aurum Trust; display cases that read
// as cover at a glance; Warden cones in amber that flare red the moment they
// hold Wren; camera cones in steel blue; loot that glitters; and a HUD whose
// alarm meter is the loudest thing on the screen, because it is the thing
// that gets you caught.

import {
  ALARM_MAX, CANVAS_H, CANVAS_W, COLS, GUARD_CONE_HALF, GUARD_CONE_RANGE,
  CAMERA_CONE_HALF, CAMERA_CONE_RANGE, HUD_H, MAX_STRIKES, ROWS,
  SCREEN_CAUGHT, SCREEN_CLEAR, SCREEN_OVER, SCREEN_PAUSED, SCREEN_TITLE,
  SCREEN_WIN, TILE, WORLD_H, WORLD_W,
} from './config.js';
import { conePolygon } from './vision.js';

const INK = '#0b0e17';
const FLOOR_A = '#232838';
const FLOOR_B = '#1d2231';
const WALL = '#3d4a6b';
const WALL_TOP = '#5a6c99';
const GOLD = '#f5c542';
const BRASS = '#c9a227';
const TEAL = '#2dd4bf';
const RED = '#ff5347';
const PAPER = '#eef1f8';
const MUTE = '#9aa5bd';

/** A deterministic scatter for the floor's speckle, so every frame agrees. */
function specklePoints(count) {
  const points = [];
  let seed = 1234567;
  const next = () => {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    return seed / 2147483648;
  };
  for (let i = 0; i < count; i += 1) {
    points.push({ x: next() * WORLD_W, y: next() * WORLD_H, r: next() * 1.6 + 0.4 });
  }
  return points;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

/** A five-pointed star path centred on (x, y), for the Meridian Star and the title. */
function starPath(ctx, x, y, outer, inner, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rotation + (i * Math.PI) / 5 - Math.PI / 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** The renderer: draw(state, screen, best) paints one whole frame. */
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const speckles = specklePoints(260);

  function drawFloor() {
    for (let ty = 0; ty < ROWS; ty += 1) {
      for (let tx = 0; tx < COLS; tx += 1) {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
        ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (const p of speckles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    // The vault's brass inlay: a border line just inside the walls.
    ctx.strokeStyle = 'rgba(201,162,39,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(TILE + 5, TILE + 5, WORLD_W - 2 * TILE - 10, WORLD_H - 2 * TILE - 10);
  }

  function drawExit(state) {
    const { x, y } = state.level.exit;
    const open = state.hasStar;
    ctx.fillStyle = open ? '#123c2a' : '#2a2f3d';
    roundRect(ctx, x - 17, y - 19, 34, 38, 5);
    ctx.fill();
    ctx.strokeStyle = open ? '#3ddc84' : '#5b657d';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.fillStyle = open ? '#3ddc84' : '#77839c';
    ctx.font = '700 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x, y + 3);
    if (open) {
      ctx.fillStyle = 'rgba(61,220,132,0.16)';
      ctx.beginPath();
      ctx.arc(x, y, 26 + Math.sin(state.levelTime * 5) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawLootPiece(state, piece) {
    const bob = Math.sin(state.levelTime * 3 + piece.x * 0.05) * 1.5;
    const { x, y } = piece;
    ctx.save();
    ctx.translate(x, y + bob);
    if (piece.kind === 'S') {
      ctx.shadowColor = GOLD;
      ctx.shadowBlur = 18;
      ctx.fillStyle = GOLD;
      starPath(ctx, 0, 0, 15, 6.5, state.levelTime * 0.8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#fff3c4';
      starPath(ctx, 0, 0, 7, 3, state.levelTime * 0.8);
      ctx.fill();
    } else if (piece.kind === 'c') {
      ctx.fillStyle = '#2f9e5f';
      roundRect(ctx, -11, -7, 22, 14, 3);
      ctx.fill();
      ctx.strokeStyle = '#bff0d2';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#eafff2';
      ctx.font = '700 11px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', 0, 4);
    } else if (piece.kind === 'g') {
      ctx.fillStyle = '#e3a008';
      ctx.beginPath();
      ctx.moveTo(-12, 5);
      ctx.lineTo(-8, -6);
      ctx.lineTo(8, -6);
      ctx.lineTo(12, 5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd34d';
      ctx.fillRect(-8, -6, 16, 4);
    } else {
      ctx.fillStyle = '#39c2d7';
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(9, 0);
      ctx.lineTo(0, 11);
      ctx.lineTo(-9, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c9f4fb';
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 6);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCone(state, x, y, facing, half, range, seeing, camera) {
    const points = conePolygon(state.level, x, y, facing, half, range);
    const gradient = ctx.createRadialGradient(x, y, 8, x, y, range);
    if (seeing) {
      gradient.addColorStop(0, 'rgba(255,70,50,0.42)');
      gradient.addColorStop(1, 'rgba(255,70,50,0.10)');
    } else if (camera) {
      gradient.addColorStop(0, 'rgba(96,165,250,0.30)');
      gradient.addColorStop(1, 'rgba(96,165,250,0.05)');
    } else {
      gradient.addColorStop(0, 'rgba(255,205,66,0.30)');
      gradient.addColorStop(1, 'rgba(255,205,66,0.05)');
    }
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (const p of points) ctx.lineTo(p.x, p.y);
    ctx.closePath();
    ctx.fill();
  }

  function drawWalls(state) {
    const { grid } = state.level;
    for (let ty = 0; ty < grid.length; ty += 1) {
      for (let tx = 0; tx < grid[ty].length; tx += 1) {
        const ch = grid[ty][tx];
        const x = tx * TILE;
        const y = ty * TILE;
        if (ch === '#') {
          ctx.fillStyle = 'rgba(0,0,0,0.35)';
          ctx.fillRect(x + 3, y + 5, TILE, TILE);
          ctx.fillStyle = WALL;
          ctx.fillRect(x, y, TILE, TILE);
          ctx.fillStyle = WALL_TOP;
          ctx.fillRect(x, y, TILE, 7);
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(x, y + TILE - 4, TILE, 4);
        } else if (ch === '=') {
          // A display case: brass base, glass top — cover you can hide behind.
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          roundRect(ctx, x + 4, y + 8, TILE - 4, TILE - 4, 6);
          ctx.fill();
          ctx.fillStyle = '#6b5320';
          roundRect(ctx, x + 2, y + 3, TILE - 4, TILE - 6, 6);
          ctx.fill();
          ctx.fillStyle = 'rgba(160,220,255,0.5)';
          roundRect(ctx, x + 7, y + 8, TILE - 14, TILE - 16, 4);
          ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.35)';
          ctx.fillRect(x + 10, y + 11, TILE - 24, 4);
        }
      }
    }
  }

  function drawGuard(state, guard) {
    const { x, y } = guard;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 13, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // Uniform body, then head, then the cap with its brim toward where he looks.
    ctx.fillStyle = '#31456e';
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8b98d';
    ctx.beginPath();
    ctx.arc(x, y - 2, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1d2a47';
    ctx.beginPath();
    ctx.arc(x, y - 3, 8, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + Math.cos(guard.facing) * 4 - 2, y - 4 + Math.sin(guard.facing) * 4, 12, 4);
    ctx.fillStyle = GOLD;
    ctx.fillRect(x - 8, y + 7, 16, 3);
    if (guard.seeing > 0) {
      ctx.font = '900 22px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = RED;
      ctx.fillText('!', x, y - 22);
    } else if (guard.investigate) {
      ctx.font = '900 18px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd34d';
      ctx.fillText('?', x, y - 22);
    }
  }

  function drawCamera(state, camera) {
    const { x, y } = camera;
    ctx.fillStyle = '#141a29';
    roundRect(ctx, x - 9, y - 9, 18, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#5a6c99';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0a0d14';
    ctx.beginPath();
    ctx.arc(x + Math.cos(camera.angle) * 3, y + Math.sin(camera.angle) * 3, 5, 0, Math.PI * 2);
    ctx.fill();
    const blink = Math.sin(state.levelTime * 4 + camera.phase) > 0;
    ctx.fillStyle = camera.seeing > 0 ? RED : blink ? '#ff8a7a' : '#571f1a';
    ctx.beginPath();
    ctx.arc(x + 6, y - 6, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawThief(state) {
    const thief = state.thief;
    const bob = thief.moving ? Math.sin(state.levelTime * 14) * 1.6 : 0;
    const { x } = thief;
    const y = thief.y + bob;
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(x, thief.y + 13, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // The loot bag rides her back once the Star is in it.
    if (state.hasStar) {
      const bx = x - Math.cos(thief.facing) * 12;
      const by = y - Math.sin(thief.facing) * 12;
      ctx.fillStyle = '#8a6d2f';
      ctx.beginPath();
      ctx.arc(bx, by, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GOLD;
      ctx.font = '700 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', bx, by + 3.5);
    }
    // Hooded body in deep teal, face toward the way she moves, crimson scarf.
    ctx.fillStyle = '#0f3d3a';
    ctx.beginPath();
    ctx.arc(x, y, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#134f4a';
    ctx.beginPath();
    ctx.arc(x, y - 2, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0c8a0';
    ctx.beginPath();
    ctx.arc(x + Math.cos(thief.facing) * 4, y - 1 + Math.sin(thief.facing) * 4, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c22f3d';
    ctx.beginPath();
    ctx.moveTo(x - 7, y + 7);
    ctx.lineTo(x + 7, y + 7);
    ctx.lineTo(x, y + 13);
    ctx.closePath();
    ctx.fill();
    if (thief.sneak) {
      ctx.strokeStyle = 'rgba(45,212,191,0.55)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(x, thief.y, 17, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCoin(state) {
    if (!state.coin) return;
    const { x, y } = state.coin;
    const spin = Math.abs(Math.sin(state.levelTime * 6));
    ctx.fillStyle = GOLD;
    ctx.beginPath();
    ctx.ellipse(x, y, 4 + spin * 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(245,197,66,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, 15 + Math.sin(state.levelTime * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawHud(state, best) {
    ctx.fillStyle = '#0d1019';
    ctx.fillRect(0, 0, CANVAS_W, HUD_H);
    ctx.fillStyle = BRASS;
    ctx.fillRect(0, HUD_H - 3, CANVAS_W, 3);
    ctx.textAlign = 'left';

    // The alarm meter: labelled, wide, coloured by how close the night is to over.
    ctx.fillStyle = MUTE;
    ctx.font = '700 13px system-ui, sans-serif';
    ctx.fillText('ALARM', 18, 26);
    const barX = 18;
    const barY = 34;
    const barW = 300;
    const barH = 20;
    ctx.fillStyle = '#1a2030';
    roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.fill();
    const frac = state.alarm / ALARM_MAX;
    if (frac > 0) {
      const hue = frac < 0.45 ? '#3ddc84' : frac < 0.75 ? '#ffb02e' : RED;
      ctx.fillStyle = hue;
      roundRect(ctx, barX, barY, Math.max(10, barW * frac), barH, 6);
      ctx.fill();
    }
    ctx.strokeStyle = state.seenNow ? RED : '#3a4358';
    ctx.lineWidth = state.seenNow ? 2.5 : 1.5;
    roundRect(ctx, barX, barY, barW, barH, 6);
    ctx.stroke();
    if (state.seenNow) {
      ctx.fillStyle = RED;
      ctx.font = '800 13px system-ui, sans-serif';
      ctx.fillText('SPOTTED!', barX + barW + 12, 49);
    }

    // Score and the night's running numbers.
    ctx.fillStyle = PAPER;
    ctx.font = '700 21px system-ui, sans-serif';
    ctx.fillText(`$${state.score.toLocaleString('en-US')}`, 420, 50);
    ctx.fillStyle = MUTE;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('SCORE', 420, 24);
    ctx.fillStyle = PAPER;
    ctx.font = '700 17px system-ui, sans-serif';
    ctx.fillText(state.level ? `${state.levelIndex + 1} · ${state.level.name.toUpperCase()}` : '', 560, 32);
    ctx.fillStyle = MUTE;
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText(`TIME ${formatTime(state.totalTime)}`, 560, 54);
    ctx.fillText(`BEST $${best.toLocaleString('en-US')}`, 700, 54);

    // Coins left to throw, and strikes left before the night ends.
    ctx.fillStyle = MUTE;
    ctx.font = '600 12px system-ui, sans-serif';
    ctx.fillText('COINS', 838, 24);
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < state.coinsLeft ? GOLD : '#2a3040';
      ctx.beginPath();
      ctx.arc(848 + i * 20, 45, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = MUTE;
    ctx.fillText('STRIKES', 922, 24);
    ctx.font = '700 15px system-ui, sans-serif';
    for (let i = 0; i < MAX_STRIKES; i += 1) {
      ctx.fillStyle = i < state.strikes ? RED : '#2a3040';
      ctx.fillText('✕', 926 + i * 18, 52);
    }
    if (!state.seenEver && state.levelTime > 1) {
      ctx.fillStyle = TEAL;
      ctx.font = '800 12px system-ui, sans-serif';
      ctx.fillText('GHOST', 700, 32);
    }
  }

  function panel(lines, accent) {
    ctx.fillStyle = 'rgba(5,7,13,0.78)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    const w = 640;
    const h = 64 + lines.length * 34;
    const x = (CANVAS_W - w) / 2;
    const y = (CANVAS_H - h) / 2;
    ctx.fillStyle = '#11182a';
    roundRect(ctx, x, y, w, h, 14);
    ctx.fill();
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.textAlign = 'center';
    lines.forEach((line, i) => {
      ctx.fillStyle = line.color || PAPER;
      ctx.font = `${line.bold ? '800' : '500'} ${line.size || 19}px system-ui, sans-serif`;
      ctx.fillText(line.text, CANVAS_W / 2, y + 52 + i * 34);
    });
  }

  function drawOverlay(state, screen, best) {
    if (screen === SCREEN_TITLE) {
      panel([
        { text: 'VELVET VAULT', size: 44, bold: true, color: GOLD },
        { text: 'Wren, cat-burglar, vs. the Wardens of the Aurum Trust', size: 17, color: MUTE },
        { text: 'Slip in, take the Meridian Star, and reach the EXIT door.', size: 18 },
        { text: 'Amber cones are Warden eyes, blue cones are cameras —', size: 17 },
        { text: 'stand in one and the ALARM meter climbs. Full meter: caught.', size: 17 },
        { text: 'Move WASD / arrows · Shift sneaks · Click or Q throws a coin (−$25)', size: 16, color: TEAL },
        { text: 'Coins pull Wardens away. Finish unseen for the +$500 Ghost bonus.', size: 16, color: TEAL },
        { text: 'Click or press Enter to begin the night', size: 19, bold: true },
      ], BRASS);
    } else if (screen === SCREEN_PAUSED) {
      panel([
        { text: 'PAUSED', size: 34, bold: true, color: GOLD },
        { text: 'Press P or Enter to slip back in', size: 17, color: MUTE },
      ], BRASS);
    } else if (screen === SCREEN_CAUGHT) {
      panel([
        { text: 'CAUGHT!', size: 40, bold: true, color: RED },
        { text: `Strike ${state.strikes} of ${MAX_STRIKES} — the room resets and the fine is $150.`, size: 18 },
        { text: 'The Star goes back in its case. So does everything else.', size: 16, color: MUTE },
        { text: 'Press Enter to try the room again', size: 18, bold: true },
      ], RED);
    } else if (screen === SCREEN_CLEAR && state.lastClear) {
      const c = state.lastClear;
      panel([
        { text: 'CLEAN GETAWAY', size: 36, bold: true, color: '#3ddc84' },
        { text: `${c.levelName} — cleared in ${formatTime(c.seconds)}`, size: 18, color: MUTE },
        { text: `Loot taken  $${c.loot.toLocaleString('en-US')}`, size: 19 },
        { text: `Time bonus  $${c.timeBonus.toLocaleString('en-US')}`, size: 19 },
        { text: c.ghostBonus > 0 ? `Ghost bonus  $${c.ghostBonus.toLocaleString('en-US')} — never seen` : 'Ghost bonus  $0 — you were seen', size: 19 },
        { text: `Score  $${state.score.toLocaleString('en-US')}`, size: 21, bold: true, color: GOLD },
        { text: 'Press Enter for the next room', size: 18, bold: true },
      ], '#3ddc84');
    } else if (screen === SCREEN_WIN) {
      panel([
        { text: 'THE NIGHT IS YOURS', size: 38, bold: true, color: GOLD },
        { text: 'All three rooms of the Aurum Trust, emptied.', size: 18 },
        { text: `Final score  $${state.score.toLocaleString('en-US')}`, size: 22, bold: true },
        { text: `Total time ${formatTime(state.totalTime)} · Strikes ${state.strikes}`, size: 17, color: MUTE },
        { text: `Best  $${best.toLocaleString('en-US')}`, size: 17, color: MUTE },
        { text: 'Press Enter to work another night', size: 18, bold: true },
      ], BRASS);
    } else if (screen === SCREEN_OVER) {
      panel([
        { text: 'THREE STRIKES', size: 38, bold: true, color: RED },
        { text: 'The Wardens keep the Meridian Star tonight.', size: 18 },
        { text: `Final score  $${state.score.toLocaleString('en-US')}`, size: 21, bold: true },
        { text: 'Press Enter to plan a quieter night', size: 18, bold: true },
      ], RED);
    }
  }

  function draw(state, screen, best) {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    drawHud(state, best);
    ctx.save();
    ctx.translate(0, HUD_H);
    drawFloor();
    drawExit(state);
    for (const piece of state.level.loot) if (!piece.taken) drawLootPiece(state, piece);
    for (const camera of state.cameras) drawCone(state, camera.x, camera.y, camera.angle, CAMERA_CONE_HALF, CAMERA_CONE_RANGE, camera.seeing > 0, true);
    for (const guard of state.guards) drawCone(state, guard.x, guard.y, guard.facing, GUARD_CONE_HALF, GUARD_CONE_RANGE, guard.seeing > 0, false);
    drawWalls(state);
    drawCoin(state);
    for (const camera of state.cameras) drawCamera(state, camera);
    for (const guard of state.guards) drawGuard(state, guard);
    drawThief(state);
    // A red edge creeps in as the alarm climbs: the room itself starts to feel watched.
    if (state.alarm > 45) {
      ctx.strokeStyle = `rgba(255,60,45,${0.25 + (state.alarm / ALARM_MAX) * 0.55})`;
      ctx.lineWidth = 10;
      ctx.strokeRect(5, 5, WORLD_W - 10, WORLD_H - 10);
    }
    ctx.restore();
    drawOverlay(state, screen, best);
  }

  return { draw };
}
