// Ember & Thyme — Rush Hour Kitchen: every tuning number, colour, recipe and
// station in one place. The playfield is a fixed 1280x720 logical area; the
// renderer scales it to the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How long one shift (one game) lasts, in seconds. */
export const SHIFT_SECONDS = 150;

/** The chef's walking speed, in logical pixels per second. */
export const CHEF_SPEED = 300;

/** How close the chef must stand to a station to use it. */
export const REACH = 78;

/** The floor the chef may walk on: stations sit on the walls around it. */
export const FLOOR = { x: 24, y: 196, width: 1232, height: 500 };

export const INGREDIENTS = {
  bun: { name: 'Bun', colour: '#e8b25c', dark: '#b97f2e', needs: 'none' },
  patty: { name: 'Patty', colour: '#a05a3c', dark: '#6e3520', needs: 'grill' },
  lettuce: { name: 'Lettuce', colour: '#7ec850', dark: '#4a8c2c', needs: 'chop' },
  tomato: { name: 'Tomato', colour: '#e84a3a', dark: '#a92a1e', needs: 'chop' },
  cheese: { name: 'Cheese', colour: '#f7c948', dark: '#c8931a', needs: 'chop' },
  onion: { name: 'Onion', colour: '#c9a0dc', dark: '#8a5fa8', needs: 'chop' },
};

/** Cooked and chopped forms, and what each raw item becomes. */
export const PREPPED = {
  pattyCooked: { name: 'Grilled Patty', colour: '#7a4028', dark: '#4e2413', from: 'patty' },
  pattyBurnt: { name: 'Burnt Patty', colour: '#2b2b2b', dark: '#111111', from: 'patty' },
  lettuceChopped: { name: 'Chopped Lettuce', colour: '#8fd45f', dark: '#4a8c2c', from: 'lettuce' },
  tomatoChopped: { name: 'Chopped Tomato', colour: '#f0604e', dark: '#a92a1e', from: 'tomato' },
  cheeseChopped: { name: 'Cheese Slice', colour: '#ffd94d', dark: '#c8931a', from: 'cheese' },
  onionChopped: { name: 'Onion Rings', colour: '#d8b4e8', dark: '#8a5fa8', from: 'onion' },
};

/** Which choppable raw item each chopped form comes from, for the board. */
export const CHOPS_TO = {
  lettuce: 'lettuceChopped',
  tomato: 'tomatoChopped',
  cheese: 'cheeseChopped',
  onion: 'onionChopped',
};

export const CHOPS_NEEDED = 3;
export const GRILL_SECONDS = 6;
export const GRILL_BURN_AFTER = 5;
export const PLATE_MAX = 5;

/** The menu: every dish the order board can ask for. */
export const RECIPES = [
  {
    id: 'ember-classic',
    name: 'Ember Classic',
    items: ['bun', 'pattyCooked', 'lettuceChopped', 'tomatoChopped'],
    price: 14,
  },
  {
    id: 'cheesy-melt',
    name: 'Cheesy Melt',
    items: ['bun', 'pattyCooked', 'cheeseChopped'],
    price: 12,
  },
  {
    id: 'garden-bowl',
    name: 'Garden Bowl',
    items: ['lettuceChopped', 'tomatoChopped', 'onionChopped'],
    price: 10,
  },
  {
    id: 'double-ember',
    name: 'Double Ember',
    items: ['bun', 'pattyCooked', 'pattyCooked', 'cheeseChopped', 'lettuceChopped'],
    price: 20,
  },
  {
    id: 'sunny-stack',
    name: 'Sunny Stack',
    items: ['bun', 'pattyCooked', 'tomatoChopped', 'onionChopped'],
    price: 13,
  },
];

/** Order flow: patience and spawn pacing, tightening as the shift wears on. */
export const ORDERS = {
  maxActive: 3,
  firstPatience: 58,
  patienceFloor: 34,
  patiencePerSecond: 0.12,
  firstSpawnGap: 12,
  spawnGapFloor: 7,
  spawnGapPerSecond: 0.03,
  tipPerSecondLeft: 0.15,
};

/** Stations, laid out as rectangles with the spot the chef stands to use them. */
export const STATIONS = {
  bins: [
    { id: 'bin-bun', item: 'bun', x: 60, y: 196, width: 150, height: 62 },
    { id: 'bin-patty', item: 'patty', x: 226, y: 196, width: 150, height: 62 },
    { id: 'bin-lettuce', item: 'lettuce', x: 392, y: 196, width: 150, height: 62 },
    { id: 'bin-tomato', item: 'tomato', x: 558, y: 196, width: 150, height: 62 },
    { id: 'bin-cheese', item: 'cheese', x: 724, y: 196, width: 150, height: 62 },
    { id: 'bin-onion', item: 'onion', x: 890, y: 196, width: 150, height: 62 },
  ],
  board: { id: 'board', x: 60, y: 330, width: 240, height: 130 },
  grill: { id: 'grill', x: 470, y: 330, width: 340, height: 130 },
  assembly: { id: 'assembly', x: 960, y: 330, width: 260, height: 130 },
  window: { id: 'window', x: 960, y: 540, width: 260, height: 120 },
  trash: { id: 'trash', x: 60, y: 540, width: 150, height: 120 },
};

/** Where the chef stands to reach each station (the interact point). */
export function stationPoint(station) {
  return { x: station.x + station.width / 2, y: station.y + station.height + 26 };
}

export const PALETTE = {
  wall: '#3a2a1e',
  wallTop: '#4a3626',
  floor: '#8a5a34',
  floorDark: '#7a4e2c',
  floorLight: '#96683d',
  tile: '#a9713f',
  header: '#241812',
  headerEdge: '#4a2f1d',
  text: '#fff6e8',
  muted: '#d8b98f',
  gold: '#f7c948',
  green: '#7ec850',
  red: '#e84a3a',
  steel: '#9aa5ad',
  steelDark: '#6b757d',
  wood: '#b07a45',
  woodDark: '#8a5a2e',
  paper: '#fff3d6',
  paperEdge: '#d9b96a',
  awning: '#c0392b',
  awningLight: '#e74c3c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift is kept between visits (this browser only). */
export const BEST_KEY = 'ember-and-thyme.best';
