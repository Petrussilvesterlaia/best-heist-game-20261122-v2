// tuning.js — every number that shapes how Velvet Vault plays, in one place.
// Distances are pixels, times are seconds, money is whole dollars.

export const TILE = 40;              // one map cell, in pixels
export const COLS = 25;              // room width in cells
export const ROWS = 16;              // room height in cells
export const HUD_H = 64;             // height of the heads-up strip above the room
export const VIEW_W = COLS * TILE;   // canvas width  (1000)
export const VIEW_H = ROWS * TILE + HUD_H; // canvas height (704)

export const THIEF_RADIUS = 13;
export const THIEF_WALK = 152;       // px/s on foot
export const THIEF_SNEAK = 84;       // px/s while Shift is held

export const WARDEN_SPEED = 68;      // px/s on patrol
export const WARDEN_RUSH = 82;       // px/s when hurrying to a coin ring
export const WARDEN_PAUSE = 1.35;    // seconds stood at a beat's end
export const WARDEN_STARE = 2.6;     // seconds spent staring at a coin
export const WARDEN_RANGE = 178;     // sight distance
export const WARDEN_HALF = 0.46;     // sight half-angle, radians

export const CAMERA_RANGE = 162;
export const CAMERA_HALF = 0.38;

export const ALARM_MAX = 100;
export const ALARM_DECAY = 17;       // points/s once the light is off you
export const ALARM_GRACE = 0.35;     // seconds of afterglow before decay starts
export const WARDEN_FILL_NEAR = 95;  // points/s at point blank
export const WARDEN_FILL_FAR = 34;   // points/s at the cone's rim
export const CAMERA_FILL_NEAR = 62;
export const CAMERA_FILL_FAR = 26;
export const SNEAK_FILL_SCALE = 0.5; // sneaking halves every fill rate

export const COINS_PER_ROOM = 3;
export const COIN_COST = 25;
export const COIN_HEARING = 245;     // px: wardens inside this radius investigate
export const COIN_LIFE = 6;          // seconds a thrown coin keeps ringing

export const LOOT_VALUES = { cash: 100, gold: 250, jewel: 400 };
export const CATCH_FINE = 150;
export const MAX_STRIKES = 3;
export const GHOST_BONUS = 500;      // a room finished never seen
export const TIME_BONUS_PER_SEC = 2; // dollars per second under par

export const PICKUP_DIST = 24;       // px from a loot centre that collects it
export const FIXED_DT = 1 / 60;      // the simulation's heartbeat
