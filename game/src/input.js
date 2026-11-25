// Keyboard and pointer input. Held keys give a steering direction; one-shot presses
// (interact, pause, mute) are queued as bit flags and taken once by the loop, so a
// press between two frames is never lost and never counted twice. A mouse click sets
// a walk target on the floor (the chef strolls there) and, when the click lands on a
// station the chef can already reach, interacts at once.
import { FIELD } from './config.js';

export const ACTION_INTERACT = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_RESTART = 8;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const INTERACT = new Set(['KeyE', 'Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RESTART = new Set(['KeyR']);

export function createInput(canvas, toLogical) {
  let left = false;
  let right = false;
  let up = false;
  let down = false;
  let actions = 0;
  let walkTarget = null;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (UP.has(event.code)) up = true;
    else if (DOWN.has(event.code)) down = true;
    else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RESTART.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RESTART;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
    else if (UP.has(event.code)) up = false;
    else if (DOWN.has(event.code)) down = false;
  });
  // A key released while the tab is hidden never sends keyup: let go of everything.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
    up = false;
    down = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event.clientX, event.clientY);
    walkTarget = { x: point.x, y: point.y };
    actions |= ACTION_INTERACT;
  });

  return {
    /** Steering from held keys, or toward the clicked walk target; {x, y} in -1..1. */
    move(chef) {
      const keys = { x: (right ? 1 : 0) - (left ? 1 : 0), y: (down ? 1 : 0) - (up ? 1 : 0) };
      if (keys.x !== 0 || keys.y !== 0) {
        walkTarget = null;
        return keys;
      }
      if (walkTarget !== null) {
        const dx = walkTarget.x - chef.x;
        const dy = walkTarget.y - chef.y;
        if (Math.hypot(dx, dy) < 12) {
          walkTarget = null;
          return { x: 0, y: 0 };
        }
        return { x: dx, y: dy };
      }
      return { x: 0, y: 0 };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    clearWalk() {
      walkTarget = null;
    },
  };
}

/** The canvas is letterboxed into the window; this maps a client point to logical coordinates. */
export function createScaler(canvas) {
  function scale() {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (FIELD.width / rect.width) * 1,
      y: (FIELD.height / rect.height) * 1,
      rect,
    };
  }
  return function toLogical(clientX, clientY) {
    const s = scale();
    return {
      x: ((clientX - s.rect.left) / s.rect.width) * FIELD.width,
      y: ((clientY - s.rect.top) / s.rect.height) * FIELD.height,
    };
  };
}
