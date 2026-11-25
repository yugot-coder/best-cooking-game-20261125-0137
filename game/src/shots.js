// The screenshot scenes behind ?shot=start|play|rush|end. Each one plays the real
// rules forward from a fresh world for a fixed number of seconds, steered by a
// simple autopilot that works the oldest order on the board — fetch, chop, grill,
// plate, serve — so the frame is what a short game really looks like and the same
// seed always gives the same frame.
import { FIELD, STEP, STATIONS, stationPoint } from './config.js';
import { EVENT_OVER, isPlate } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 5;
const END_LIMIT_SECONDS = 400;

const SILENT = {
  pickup() {},
  place() {},
  chop() {},
  sizzle() {},
  ready() {},
  serve() {},
  fail() {},
  tick() {},
  expired() {},
};

const CHOPPED_FROM = {
  lettuceChopped: 'lettuce',
  tomatoChopped: 'tomato',
  cheeseChopped: 'cheese',
  onionChopped: 'onion',
};

function binFor(item) {
  return STATIONS.bins.find((bin) => bin.item === item);
}

/** The recipe items still missing, given what the plate (and the chef's hands) hold. */
function remainingFor(recipe, have) {
  const remaining = [...recipe];
  for (const held of have) {
    const index = remaining.indexOf(held);
    if (index >= 0) remaining.splice(index, 1);
  }
  return remaining;
}

/** The task list that cooks the oldest order on the board, start to serve. */
function planForOrder(state) {
  const order = state.orders[0];
  if (!order) return [];
  const chef = state.chef;
  const tasks = [];

  // A carried plate that matches some order goes straight out the window;
  // a carried plate that matches nothing is tossed before anything else.
  if (isPlate(chef.carrying)) {
    const matches = state.orders.some(
      (o) => o.recipe.items.length === chef.carrying.items.length
        && remainingFor(o.recipe.items, chef.carrying.items).length === 0,
    );
    if (matches) {
      tasks.push({ station: STATIONS.window, kind: 'serve' });
      return tasks;
    }
    tasks.push({ station: STATIONS.trash, kind: 'trash' });
    return tasks;
  }

  // A plate holding food this order cannot use is emptied first; anything in
  // hand goes in the trash first, since taking the plate needs empty hands.
  const plateFits = remainingFor(order.recipe.items, state.plate.items).length
    === order.recipe.items.length - state.plate.items.length;
  const plateCleared = state.plate.items.length > 0 && !plateFits;
  if (plateCleared) {
    if (chef.carrying !== null) tasks.push({ station: STATIONS.trash, kind: 'trash' });
    tasks.push({ station: STATIONS.assembly, kind: 'takePlate' });
    tasks.push({ station: STATIONS.trash, kind: 'trash' });
  }
  const plateHave = plateCleared ? [] : [...state.plate.items];

  // The ingredient in hand stays only when this order still needs it.
  let carryingUseful = false;
  if (chef.carrying !== null && !plateCleared) {
    if (remainingFor(order.recipe.items, plateHave).includes(chef.carrying)) {
      carryingUseful = true;
    } else {
      tasks.push({ station: STATIONS.trash, kind: 'trash' });
    }
  }

  // Clear a board left mid-chop by an earlier plan, so the new one never stalls.
  if (state.board.item !== null) {
    tasks.push({ station: STATIONS.board, kind: 'chop' });
    tasks.push({ station: STATIONS.board, kind: 'take' });
    tasks.push({ station: STATIONS.trash, kind: 'trash' });
  }
  // Clear a burnt patty the same way.
  if (state.grill.some((slot) => slot.state === 'burnt')) {
    tasks.push({ station: STATIONS.grill, kind: 'take' });
    tasks.push({ station: STATIONS.trash, kind: 'trash' });
  }

  // The carried ingredient goes on the plate first.
  const have = [...plateHave];
  if (carryingUseful) {
    have.push(chef.carrying);
    tasks.push({ station: STATIONS.assembly, kind: 'add' });
  }

  const remaining = remainingFor(order.recipe.items, have);
  for (const item of remaining) {
    if (item === 'bun') {
      tasks.push({ station: binFor('bun'), kind: 'take' });
    } else if (item === 'pattyCooked') {
      tasks.push({ station: binFor('patty'), kind: 'take' });
      tasks.push({ station: STATIONS.grill, kind: 'grill' });
      tasks.push({ station: STATIONS.grill, kind: 'waitCooked' });
      tasks.push({ station: STATIONS.grill, kind: 'take' });
    } else if (CHOPPED_FROM[item]) {
      const raw = CHOPPED_FROM[item];
      tasks.push({ station: binFor(raw), kind: 'take' });
      tasks.push({ station: STATIONS.board, kind: 'place' });
      tasks.push({ station: STATIONS.board, kind: 'chop' });
      tasks.push({ station: STATIONS.board, kind: 'take' });
    }
    tasks.push({ station: STATIONS.assembly, kind: 'add' });
  }
  tasks.push({ station: STATIONS.assembly, kind: 'takePlate' });
  tasks.push({ station: STATIONS.window, kind: 'serve' });
  return tasks;
}

/**
 * The autopilot: one step of steering for the world. It keeps a plan (the tasks
 * that cook the oldest order), walks the chef to the current task's station and
 * presses E there, then moves on. It rebuilds the plan whenever it runs out or
 * the order it was cooking is gone.
 */
export function createAutopilot() {
  let tasks = [];
  let index = 0;
  let cooldown = 0;
  let chopCount = 0;
  let taskAge = 0;
  let lastOrderId = -1;

  function rebuild(state) {
    tasks = planForOrder(state);
    index = 0;
    chopCount = 0;
    taskAge = 0;
    lastOrderId = state.orders.length > 0 ? state.orders[0].id : -1;
  }

  function step(world, dt) {
    const state = world.state;
    if (state.orders.length === 0) {
      tasks = [];
      index = 0;
      return { x: 0, y: 0, interact: false };
    }
    if (index >= tasks.length || state.orders[0].id !== lastOrderId) rebuild(state);
    if (tasks.length === 0) return { x: 0, y: 0, interact: false };

    const task = tasks[index];
    const point = stationPoint(task.station);
    const dx = point.x - state.chef.x;
    const dy = point.y - state.chef.y;
    const dist = Math.hypot(dx, dy);
    taskAge += dt;
    if (cooldown > 0) cooldown -= dt;
    // A task that cannot finish in 25 s is abandoned, never a stall.
    if (taskAge > 25) {
      index += 1;
      taskAge = 0;
      chopCount = 0;
      return { x: 0, y: 0, interact: false };
    }
    if (dist > 46) return { x: dx, y: dy, interact: false };
    if (cooldown > 0) return { x: 0, y: 0, interact: false };

    const chef = state.chef;
    const done = () => {
      index += 1;
      taskAge = 0;
      chopCount = 0;
      cooldown = 0.22;
    };
    const pulse = () => ({ x: 0, y: 0, interact: true });

    switch (task.kind) {
      case 'take': {
        if (chef.carrying !== null) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      case 'place': {
        if (chef.carrying === null || isPlate(chef.carrying)) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        if (state.board.item !== null) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      case 'chop': {
        if (state.board.item === null) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        chopCount += 1;
        if (chopCount >= 3) done();
        else cooldown = 0.22;
        return pulse();
      }
      case 'grill': {
        if (chef.carrying !== 'patty') {
          done();
          return { x: 0, y: 0, interact: false };
        }
        if (!state.grill.some((slot) => slot.state === 'empty')) {
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      case 'waitCooked': {
        if (state.grill.some((slot) => slot.state === 'cooked')) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        if (!state.grill.some((slot) => slot.state === 'cooking')) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        return { x: 0, y: 0, interact: false };
      }
      case 'add': {
        if (chef.carrying === null || isPlate(chef.carrying)) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      case 'takePlate': {
        if (chef.carrying !== null || state.plate.items.length === 0) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      case 'serve': {
        if (!isPlate(chef.carrying)) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      case 'trash': {
        if (chef.carrying === null) {
          done();
          return { x: 0, y: 0, interact: false };
        }
        done();
        return pulse();
      }
      default: {
        done();
        return { x: 0, y: 0, interact: false };
      }
    }
  }

  return { step };
}

/** Run the world forward until `stop` says the scene is ready, or `seconds` cap out. */
function runUntil(world, seconds, stop) {
  const pilot = createAutopilot();
  const steps = Math.floor(seconds / STEP);
  for (let index = 0; index < steps; index += 1) {
    const move = pilot.step(world, STEP);
    const events = world.step(STEP, { x: move.x, y: move.y }, move.interact, SILENT);
    if (events & EVENT_OVER) break;
    if (stop !== null && stop(world.state)) break;
  }
  return world.state.over;
}

/** Run the world forward `seconds` under the autopilot and return the screen to draw. */
function runFor(world, seconds) {
  return runUntil(world, seconds, null);
}

/**
 * Set `world` to the named scene (start, play, rush or end; any other name is start)
 * and return the screen to draw over it and the best shift to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'rush' && name !== 'end') {
    for (let index = 0; index < START_SECONDS / STEP; index += 1) {
      world.step(STEP, { x: 0, y: 0 }, false, SILENT);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    // Stop the moment a dish is visibly mid-assembly on the plate, after the
    // first serve, so the frame shows both progress and a dish being built.
    runUntil(world, 90, (state) => state.served >= 1 && state.plate.items.length >= 2);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'rush') {
    // Mid-rush: at least two dishes served and another one mid-assembly.
    runUntil(world, 135, (state) => state.served >= 2 && state.plate.items.length >= 2);
    return { screen: SCREEN_PLAY, best: 0 };
  }
  const over = runFor(world, END_LIMIT_SECONDS);
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.coins };
}

export { FIELD };
