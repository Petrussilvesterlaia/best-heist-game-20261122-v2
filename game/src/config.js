// Velvet Vault — the numbers the whole night runs on.
//
// One place for every tunable value: the room size, how fast Wren and the
// Wardens move, how the alarm meter fills and drains, what a coin costs,
// what the loot is worth, and the names of the screens the game shows.
// Nothing else in the game hard-codes a number from this file.

/** A floor tile is this many pixels on a side; each room is COLS by ROWS tiles. */
export const TILE = 40;
export const COLS = 25;
export const ROWS = 16;

/** Room size in pixels, plus the HUD strip painted above the room. */
export const WORLD_W = COLS * TILE;
export const WORLD_H = ROWS * TILE;
export const HUD_H = 72;
export const CANVAS_W = WORLD_W;
export const CANVAS_H = WORLD_H + HUD_H;

/** The simulation advances in fixed steps of this many seconds. */
export const STEP = 1 / 60;

/** Wren: her walk speed, her slower sneak, and the radius of her body. */
export const THIEF_SPEED = 158;
export const THIEF_SNEAK_SPEED = 88;
export const THIEF_RADIUS = 13;

/** A Warden's patrol speed, and how long he lingers at each end of his beat. */
export const GUARD_SPEED = 74;
export const GUARD_PAUSE = 0.8;
export const GUARD_RADIUS = 14;

/** Vision cones: half-angle (radians) and reach (pixels) for Wardens and cameras. */
export const GUARD_CONE_HALF = 0.62;
export const GUARD_CONE_RANGE = 178;
export const CAMERA_CONE_HALF = 0.46;
export const CAMERA_CONE_RANGE = 168;

/**
 * The alarm meter runs from 0 to ALARM_MAX. While a watcher holds Wren in its
 * cone the meter climbs at a rate that grows as she gets closer (the NEAR rate
 * at point-blank, the FAR rate at the edge of the cone), halved while she
 * sneaks. Once unseen for longer than the grace, it drains at ALARM_DECAY.
 */
export const ALARM_MAX = 100;
export const ALARM_GRACE = 0.6;
export const ALARM_DECAY = 17;
export const GUARD_SPOT_NEAR = 95;
export const GUARD_SPOT_FAR = 34;
export const CAMERA_SPOT_NEAR = 62;
export const CAMERA_SPOT_FAR = 26;

/** A thrown coin costs this much score and is heard this far away. */
export const COIN_COST = 25;
export const COIN_HEAR = 165;
export const COIN_DISTRACT = 2.6;

/** Scoring: time bonus per second under par, Ghost bonus, catch fine, strikes. */
export const TIME_BONUS_PER_SECOND = 10;
export const GHOST_BONUS = 500;
export const CAUGHT_PENALTY = 150;
export const MAX_STRIKES = 3;

/** The screens the game moves between; render.js paints one of these. */
export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_CLEAR = 'clear';
export const SCREEN_OVER = 'over';
export const SCREEN_WIN = 'win';

/** localStorage key for the best score between visits. */
export const BEST_KEY = 'velvet-vault-best';
