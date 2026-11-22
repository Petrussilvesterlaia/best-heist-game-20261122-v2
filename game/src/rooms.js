// rooms.js — the three rooms of the Aurum Trust, as tile maps plus watcher data.
//
// Map legend:  #  wall            D  desk / display case (solid cover)
//              .  floor            E  exit door          P  Wren's entry point
//              C  cash stack      G  gold bars          J  jewel case
//              S  the Meridian Star
// Wardens patrol between tile waypoints; cameras sit on a tile (usually a
// wall) and sweep around a base angle. Angles are radians, 0 = east,
// positive clockwise (screen y grows downward), so Math.PI / 2 faces south.

export const ROOMS = [
  {
    name: 'The Lobby',
    par: 75,
    map: [
      '#########################',
      '#E....#..........#..S...#',
      '#.....#....C.....#......#',
      '#..D..#..........#..D...#',
      '#..D..#...DD.....#......#',
      '#.....#...DD.....#......#',
      '#.....#..........#......#',
      '#.....######.#####......#',
      '#....................C..#',
      '#....D.....G.....D......#',
      '#....D...........D......#',
      '#.......................#',
      '#..C.....##.##......G...#',
      '#........#...#..........#',
      '#P.......#...#......J...#',
      '#########################',
    ],
    wardens: [
      { path: [[8, 3], [15, 3]] },
      { path: [[19, 9], [19, 13]] },
    ],
    cameras: [
      { tile: [12, 0], base: Math.PI / 2, sweep: 0.55, speed: 0.5, phase: 0 },
    ],
  },
  {
    name: 'Gallery of Glass',
    par: 95,
    map: [
      '#########################',
      '#.......#...S...#.......#',
      '#...C...#.......#...G...#',
      '#.......#...D...#.......#',
      '#..DD...#...D...#..DD...#',
      '#..DD.......D...#..DD...#',
      '#.......#...D...#.......#',
      '#.......#.......#.......#',
      '####.#####.#########.####',
      '#.......#.......#.......#',
      '#...G...#..DD...#...C...#',
      '#.......#..DD...........#',
      '#..DD...#.......#..DD...#',
      '#..DD...#...C...#..DD...#',
      '#P......#.......#......E#',
      '#########################',
    ],
    wardens: [
      { path: [[2, 2], [2, 6]] },
      { path: [[14, 9], [14, 13]] },
      { path: [[22, 2], [22, 6]] },
    ],
    cameras: [
      { tile: [12, 0], base: Math.PI / 2, sweep: 0.5, speed: 0.45, phase: 0 },
      { tile: [20, 15], base: -Math.PI / 2, sweep: 0.5, speed: 0.6, phase: 2 },
    ],
  },
  {
    name: 'The Vault',
    par: 115,
    map: [
      '#########################',
      '#E...C......G.......C...#',
      '#.......................#',
      '#......#########........#',
      '#......#..DSD..#....D...#',
      '#...................D...#',
      '#......#...G...#........#',
      '#......####.####....J...#',
      '#.......................#',
      '#...DD....C....DD.......#',
      '#...DD.........DD...C...#',
      '#.......................#',
      '#..G....##.##......DD...#',
      '#.......#....#.....DD...#',
      '#P......#....#......C...#',
      '#########################',
    ],
    wardens: [
      { path: [[3, 1], [21, 1]] },
      { path: [[2, 9], [2, 13]] },
      { path: [[22, 8], [22, 13]] },
      { path: [[8, 8], [16, 8]] },
    ],
    cameras: [
      { tile: [7, 4], base: 0, sweep: 0.55, speed: 0.5, phase: 0 },
      { tile: [15, 4], base: Math.PI, sweep: 0.55, speed: 0.5, phase: Math.PI },
      { tile: [12, 15], base: -Math.PI / 2, sweep: 0.6, speed: 0.4, phase: 1 },
    ],
  },
];

const LOOT_KINDS = { C: 'cash', G: 'gold', J: 'jewel' };

// Turn a room definition into the working shape the simulation uses:
// a grid of characters, the loot list, and the special tiles' coordinates.
export function parseRoom(def) {
  const grid = def.map.map((row) => row.split(''));
  const loot = [];
  let start = null;
  let exit = null;
  let star = null;
  for (let ty = 0; ty < grid.length; ty++) {
    for (let tx = 0; tx < grid[ty].length; tx++) {
      const ch = grid[ty][tx];
      if (ch === 'P') start = { tx, ty };
      else if (ch === 'E') exit = { tx, ty };
      else if (ch === 'S') star = { tx, ty };
      else if (LOOT_KINDS[ch]) loot.push({ id: loot.length, kind: LOOT_KINDS[ch], tx, ty });
    }
  }
  return { name: def.name, par: def.par, grid, loot, start, exit, star, wardens: def.wardens, cameras: def.cameras };
}

// A tile blocks both walking and sight when it is a wall or a case.
export function isSolid(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[ty].length) return true;
  const ch = grid[ty][tx];
  return ch === '#' || ch === 'D';
}
