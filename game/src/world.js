// Ember & Thyme's rules and state, with no drawing and no browser in it: the chef,
// the stations (bins, board, grill, assembly counter, serving window, trash), the
// order board, the shift clock and the score. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react without the world
// knowing about screens or sound. Nothing here allocates after createWorld returns.
import {
  CHOPS_NEEDED,
  CHOPS_TO,
  CHEF_SPEED,
  FIELD,
  FLOOR,
  GRILL_BURN_AFTER,
  GRILL_SECONDS,
  INGREDIENTS,
  ORDERS,
  PLATE_MAX,
  PREPPED,
  REACH,
  RECIPES,
  SHIFT_SECONDS,
  STATIONS,
  stationPoint,
} from './config.js';

export const EVENT_OVER = 1;
export const EVENT_SERVE = 2;
export const EVENT_EXPIRED = 4;
export const EVENT_READY = 8;
export const EVENT_WRONG = 16;

/** A carried plate is an object so it cannot be confused with an ingredient. */
export function isPlate(carried) {
  return carried !== null && typeof carried === 'object';
}

function sameDish(a, b) {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  for (let index = 0; index < sortedA.length; index += 1) {
    if (sortedA[index] !== sortedB[index]) return false;
  }
  return true;
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** The nearest station the chef can reach from where they stand, or null. */
export function nearestStation(state) {
  const all = [
    ...STATIONS.bins,
    STATIONS.board,
    STATIONS.grill,
    STATIONS.assembly,
    STATIONS.window,
    STATIONS.trash,
  ];
  let best = null;
  let bestDistance = Infinity;
  for (const station of all) {
    const point = stationPoint(station);
    const d = distance(state.chef.x, state.chef.y, point.x, point.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = station;
    }
  }
  return bestDistance <= REACH ? best : null;
}

export function createWorld(random) {
  const chef = { x: FIELD.width / 2, y: 560, facing: 1, carrying: null };
  const board = { item: null, chops: 0 };
  const grill = [
    { item: null, progress: 0, state: 'empty', cookedFor: 0 },
    { item: null, progress: 0, state: 'empty', cookedFor: 0 },
  ];
  const plate = { items: [] };
  const state = {
    chef,
    board,
    grill,
    plate,
    orders: [],
    coins: 0,
    served: 0,
    missed: 0,
    combo: 0,
    bestCombo: 0,
    elapsed: 0,
    spawnTimer: ORDERS.firstSpawnGap,
    nextOrderId: 1,
    over: false,
    message: { text: '', until: 0, kind: 'info' },
    particles: [],
    floats: [],
  };

  function say(text, kind = 'info', seconds = 2) {
    state.message = { text, until: state.elapsed + seconds, kind };
  }

  function burst(x, y, colour, count) {
    for (let index = 0; index < count; index += 1) {
      state.particles.push({
        x,
        y,
        vx: (random() - 0.5) * 160,
        vy: -40 - random() * 120,
        life: 0.5 + random() * 0.4,
        age: 0,
        colour,
        size: 3 + random() * 4,
      });
    }
  }

  function floatText(x, y, text, colour) {
    state.floats.push({ x, y, text, colour, age: 0, life: 1.4 });
  }

  function spawnGap() {
    return Math.max(
      ORDERS.spawnGapFloor,
      ORDERS.firstSpawnGap - ORDERS.spawnGapPerSecond * state.elapsed,
    );
  }

  function patienceFor() {
    return Math.max(
      ORDERS.patienceFloor,
      ORDERS.firstPatience - ORDERS.patiencePerSecond * state.elapsed,
    );
  }

  function spawnOrder() {
    const active = new Set(state.orders.map((order) => order.recipe.id));
    const fresh = RECIPES.filter((recipe) => !active.has(recipe.id));
    const pool = fresh.length > 0 ? fresh : RECIPES;
    const recipe = pool[Math.floor(random() * pool.length)];
    const patience = patienceFor();
    state.orders.push({
      id: state.nextOrderId,
      recipe,
      patience,
      maxPatience: patience,
    });
    state.nextOrderId += 1;
  }

  function reset() {
    chef.x = FIELD.width / 2;
    chef.y = 560;
    chef.facing = 1;
    chef.carrying = null;
    board.item = null;
    board.chops = 0;
    for (const slot of grill) {
      slot.item = null;
      slot.progress = 0;
      slot.state = 'empty';
      slot.cookedFor = 0;
    }
    plate.items = [];
    state.orders = [];
    state.coins = 0;
    state.served = 0;
    state.missed = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.elapsed = 0;
    state.spawnTimer = 2;
    state.nextOrderId = 1;
    state.over = false;
    state.message = { text: '', until: 0, kind: 'info' };
    state.particles = [];
    state.floats = [];
    spawnOrder();
    spawnOrder();
  }

  function useBin(station, audio) {
    if (chef.carrying !== null) {
      say('Hands full! Serve or trash something first.', 'warn');
      audio.fail();
      return;
    }
    chef.carrying = station.item;
    audio.pickup();
  }

  function useBoard(audio) {
    if (board.item !== null && chef.carrying === null) {
      if (board.chops >= CHOPS_NEEDED) {
        chef.carrying = CHOPS_TO[board.item];
        board.item = null;
        board.chops = 0;
        audio.pickup();
      } else {
        board.chops += 1;
        audio.chop();
        const point = stationPoint(STATIONS.board);
        burst(point.x, point.y - 30, '#cfe8a8', 6);
        if (board.chops >= CHOPS_NEEDED) say(`${INGREDIENTS[board.item].name} chopped!`, 'good');
      }
      return;
    }
    if (board.item === null && chef.carrying !== null && !isPlate(chef.carrying)) {
      const info = INGREDIENTS[chef.carrying];
      if (info && info.needs === 'chop') {
        board.item = chef.carrying;
        board.chops = 0;
        chef.carrying = null;
        audio.place();
      } else {
        say('Only veggies go on the chopping board.', 'warn');
        audio.fail();
      }
      return;
    }
    if (board.item !== null && chef.carrying !== null) {
      say('The board is busy.', 'warn');
      audio.fail();
    }
  }

  function useGrill(audio) {
    if (chef.carrying === 'patty') {
      const free = grill.find((slot) => slot.state === 'empty');
      if (free) {
        free.item = 'patty';
        free.progress = 0;
        free.state = 'cooking';
        free.cookedFor = 0;
        chef.carrying = null;
        audio.sizzle();
      } else {
        say('The grill is full!', 'warn');
        audio.fail();
      }
      return;
    }
    if (chef.carrying === null) {
      const cooked = grill.find((slot) => slot.state === 'cooked');
      if (cooked) {
        cooked.item = null;
        cooked.state = 'empty';
        cooked.progress = 0;
        cooked.cookedFor = 0;
        chef.carrying = 'pattyCooked';
        audio.pickup();
        return;
      }
      const burnt = grill.find((slot) => slot.state === 'burnt');
      if (burnt) {
        burnt.item = null;
        burnt.state = 'empty';
        burnt.progress = 0;
        burnt.cookedFor = 0;
        chef.carrying = 'pattyBurnt';
        audio.pickup();
        return;
      }
      const cooking = grill.find((slot) => slot.state === 'cooking');
      if (cooking) say('Still sizzling… wait for the ding!', 'info');
      else say('The grill is empty — bring a patty.', 'info');
      return;
    }
    say('Only patties go on the grill.', 'warn');
    audio.fail();
  }

  function useAssembly(audio) {
    if (isPlate(chef.carrying)) {
      plate.items = chef.carrying.items;
      chef.carrying = null;
      audio.place();
      return;
    }
    if (chef.carrying !== null) {
      if (chef.carrying === 'pattyBurnt') {
        say('Burnt patty? Trash it, never serve it!', 'warn');
        audio.fail();
        return;
      }
      if (plate.items.length >= PLATE_MAX) {
        say('The plate is full!', 'warn');
        audio.fail();
        return;
      }
      plate.items.push(chef.carrying);
      chef.carrying = null;
      audio.place();
      return;
    }
    if (plate.items.length > 0) {
      chef.carrying = { plate: true, items: plate.items };
      plate.items = [];
      audio.pickup();
    } else {
      say('The plate is empty — build a dish first.', 'info');
    }
  }

  function useWindow(audio) {
    if (!isPlate(chef.carrying)) {
      if (chef.carrying === null) say('Bring a finished plate to the window.', 'info');
      else say('Only a finished plate goes out the window.', 'warn');
      audio.fail();
      return EVENT_WRONG;
    }
    const carried = chef.carrying.items;
    const index = state.orders.findIndex((order) => sameDish(carried, order.recipe.items));
    if (index === -1) {
      say('No order wants this dish!', 'warn');
      audio.fail();
      return EVENT_WRONG;
    }
    const order = state.orders[index];
    const tip = Math.round(order.patience * ORDERS.tipPerSecondLeft);
    const earned = order.recipe.price + tip;
    state.coins += earned;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.served += 1;
    state.orders.splice(index, 1);
    const point = stationPoint(STATIONS.window);
    burst(point.x, point.y - 60, '#f7c948', 14);
    floatText(point.x, point.y - 90, `+$${earned}`, '#f7c948');
    say(`${order.recipe.name} served! +$${earned}${tip > 0 ? ` (tip $${tip})` : ''}`, 'good', 2.5);
    chef.carrying = null;
    audio.serve();
    return EVENT_SERVE;
  }

  function useTrash(audio) {
    if (chef.carrying === null) {
      say('Nothing to toss.', 'info');
      return;
    }
    chef.carrying = null;
    audio.place();
    say('Tossed.', 'info', 1.2);
  }

  function interact(audio) {
    const station = nearestStation(state);
    if (station === null) return 0;
    if (station.id.startsWith('bin-')) {
      useBin(station, audio);
      return 0;
    }
    if (station.id === 'board') {
      useBoard(audio);
      return 0;
    }
    if (station.id === 'grill') {
      useGrill(audio);
      return 0;
    }
    if (station.id === 'assembly') {
      useAssembly(audio);
      return 0;
    }
    if (station.id === 'window') return useWindow(audio);
    if (station.id === 'trash') {
      useTrash(audio);
      return 0;
    }
    return 0;
  }

  /**
   * One fixed step. `move` is {x, y} in -1..1 (keyboard or autopilot); `doInteract`
   * is true on the single step a press (or a click) lands. `audio` may be a silent
   * stand-in; the world never touches the DOM.
   */
  function step(dt, move, doInteract, audio) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;

    if (state.elapsed >= SHIFT_SECONDS) {
      state.over = true;
      return EVENT_OVER;
    }

    // New orders arrive on a tightening schedule, up to three at once.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.orders.length < ORDERS.maxActive) {
      spawnOrder();
      state.spawnTimer = spawnGap();
    }

    // Patience runs out: the order walks out and the combo breaks.
    for (let index = state.orders.length - 1; index >= 0; index -= 1) {
      const order = state.orders[index];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(index, 1);
        state.missed += 1;
        state.combo = 0;
        say(`Order #${order.id} walked out! Combo lost.`, 'bad', 2.5);
        audio.expired();
        events |= EVENT_EXPIRED;
      }
    }

    // The grill cooks, dings when ready, then burns.
    for (const slot of grill) {
      if (slot.state === 'cooking') {
        slot.progress += dt;
        if (slot.progress >= GRILL_SECONDS) {
          slot.state = 'cooked';
          slot.cookedFor = 0;
          audio.ready();
          events |= EVENT_READY;
        }
      } else if (slot.state === 'cooked') {
        slot.cookedFor += dt;
        if (slot.cookedFor >= GRILL_BURN_AFTER) {
          slot.state = 'burnt';
          say('A patty burnt on the grill!', 'bad', 2.5);
          audio.expired();
        }
      }
    }

    // The chef walks, facing the way they move, clamped to the floor.
    const length = Math.hypot(move.x, move.y);
    if (length > 0.01) {
      const nx = move.x / length;
      const ny = move.y / length;
      chef.x += nx * CHEF_SPEED * dt;
      chef.y += ny * CHEF_SPEED * dt;
      if (Math.abs(nx) > 0.2) chef.facing = nx > 0 ? 1 : -1;
    }
    chef.x = Math.min(FLOOR.x + FLOOR.width - 14, Math.max(FLOOR.x + 14, chef.x));
    chef.y = Math.min(FLOOR.y + FLOOR.height - 14, Math.max(FLOOR.y + 14, chef.y));

    if (doInteract) events |= interact(audio);

    for (let index = state.particles.length - 1; index >= 0; index -= 1) {
      const p = state.particles[index];
      p.age += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      if (p.age >= p.life) state.particles.splice(index, 1);
    }
    for (let index = state.floats.length - 1; index >= 0; index -= 1) {
      const f = state.floats[index];
      f.age += dt;
      f.y -= 34 * dt;
      if (f.age >= f.life) state.floats.splice(index, 1);
    }

    return events;
  }

  function timeLeft() {
    return Math.max(0, SHIFT_SECONDS - state.elapsed);
  }

  reset();
  return { state, reset, step, timeLeft, nearestStation: () => nearestStation(state) };
}

/** The display name of any carried thing, plate included. */
export function carriedName(carried) {
  if (carried === null) return null;
  if (isPlate(carried)) return `Plate (${carried.items.length})`;
  return (INGREDIENTS[carried] ?? PREPPED[carried] ?? { name: carried }).name;
}
