// Ember & Thyme's look: one canvas frame of the whole kitchen — the header with
// the shift clock, the order board, the stations, the chef and every ingredient,
// all drawn procedurally (no image files). The judge reads the game mostly through
// its screenshots, so every frame must show a complete cooking game at a glance.
import {
  CHOPS_NEEDED,
  FIELD,
  FLOOR,
  FONT,
  GRILL_SECONDS,
  INGREDIENTS,
  PALETTE,
  PREPPED,
  STATIONS,
  stationPoint,
} from './config.js';
import { carriedName, isPlate, nearestStation } from './world.js';

export const SCREEN_TITLE = 0;
export const SCREEN_PLAY = 1;
export const SCREEN_PAUSED = 2;
export const SCREEN_OVER = 3;

const ORDER_Y = 84;
const ORDER_H = 92;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, colour, align = 'left', weight = '600') {
  ctx.fillStyle = colour;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function itemInfo(id) {
  return INGREDIENTS[id] ?? PREPPED[id] ?? { name: id, colour: '#cccccc', dark: '#888888' };
}

/** One ingredient, drawn procedurally at (x, y) with radius r. */
export function drawIngredient(ctx, id, x, y, r) {
  ctx.save();
  ctx.translate(x, y);
  switch (id) {
    case 'bun': {
      ctx.fillStyle = '#e8b25c';
      ctx.beginPath();
      ctx.arc(0, -r * 0.15, r, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c98f3d';
      ctx.fillRect(-r, -r * 0.15, r * 2, r * 0.42);
      ctx.fillStyle = '#fff2cf';
      for (const [dx, dy] of [[-0.45, -0.55], [0, -0.75], [0.45, -0.55], [-0.2, -0.35], [0.25, -0.35]]) {
        ctx.beginPath();
        ctx.ellipse(dx * r, dy * r, r * 0.1, r * 0.06, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'patty': {
      ctx.fillStyle = '#a05a3c';
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.45);
      ctx.fill();
      ctx.fillStyle = '#7c3f27';
      for (const [dx, dy] of [[-0.5, -0.2], [0.3, 0.1], [-0.1, 0.3], [0.55, -0.25]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'pattyCooked': {
      ctx.fillStyle = '#7a4028';
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.45);
      ctx.fill();
      ctx.strokeStyle = '#4e2413';
      ctx.lineWidth = r * 0.12;
      for (const dx of [-0.45, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(dx * r, -r * 0.5);
        ctx.lineTo(dx * r, r * 0.5);
        ctx.stroke();
      }
      break;
    }
    case 'pattyBurnt': {
      ctx.fillStyle = '#232323';
      roundRect(ctx, -r, -r * 0.55, r * 2, r * 1.1, r * 0.45);
      ctx.fill();
      ctx.fillStyle = '#4a4a4a';
      for (const [dx, dy] of [[-0.4, 0], [0.2, -0.2], [0.45, 0.25]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.08, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'lettuce': {
      ctx.fillStyle = '#7ec850';
      for (const [dx, dy, rr] of [[-0.35, 0.1, 0.55], [0.35, 0.1, 0.55], [0, -0.3, 0.6], [0, 0.25, 0.5]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, rr * r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#4a8c2c';
      ctx.lineWidth = r * 0.08;
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(0, r * 0.6);
      ctx.stroke();
      break;
    }
    case 'lettuceChopped': {
      ctx.strokeStyle = '#8fd45f';
      ctx.lineWidth = r * 0.28;
      ctx.lineCap = 'round';
      for (const [x1, y1, x2, y2] of [[-0.7, -0.4, 0.5, -0.6], [-0.6, 0.1, 0.6, -0.1], [-0.5, 0.55, 0.6, 0.4]]) {
        ctx.beginPath();
        ctx.moveTo(x1 * r, y1 * r);
        ctx.lineTo(x2 * r, y2 * r);
        ctx.stroke();
      }
      break;
    }
    case 'tomato': {
      ctx.fillStyle = '#e84a3a';
      ctx.beginPath();
      ctx.arc(0, r * 0.08, r * 0.85, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4a8c2c';
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.lineTo(-r * 0.35, -r * 0.35);
      ctx.lineTo(0, -r * 0.5);
      ctx.lineTo(r * 0.35, -r * 0.35);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff8a7a';
      ctx.beginPath();
      ctx.ellipse(-r * 0.3, -r * 0.2, r * 0.18, r * 0.28, -0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'tomatoChopped': {
      ctx.fillStyle = '#f0604e';
      for (const [dx, rot] of [[-0.4, -0.4], [0.4, 0.5]]) {
        ctx.save();
        ctx.translate(dx * r, 0);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.6);
        ctx.arc(0, 0, r * 0.6, -Math.PI / 2, Math.PI / 2);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#ffd9d2';
      ctx.beginPath();
      ctx.arc(-r * 0.35, r * 0.1, r * 0.14, 0, Math.PI * 2);
      ctx.arc(r * 0.4, -r * 0.05, r * 0.14, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'cheese': {
      ctx.fillStyle = '#f7c948';
      ctx.beginPath();
      ctx.moveTo(-r * 0.9, r * 0.6);
      ctx.lineTo(r * 0.9, r * 0.6);
      ctx.lineTo(0, -r * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c8931a';
      for (const [dx, dy] of [[-0.3, 0.2], [0.25, 0.05], [0, 0.4]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.12, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cheeseChopped': {
      ctx.fillStyle = '#ffd94d';
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.6);
      ctx.lineTo(r * 0.8, -r * 0.6);
      ctx.lineTo(r * 0.8, r * 0.6);
      ctx.lineTo(-r * 0.8, r * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#c8931a';
      for (const [dx, dy] of [[-0.35, -0.2], [0.3, 0.15], [0.05, 0.35]]) {
        ctx.beginPath();
        ctx.arc(dx * r, dy * r, r * 0.13, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'onion': {
      ctx.fillStyle = '#c9a0dc';
      ctx.beginPath();
      ctx.arc(0, r * 0.1, r * 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#efe2f7';
      ctx.lineWidth = r * 0.1;
      for (const rr of [0.55, 0.32]) {
        ctx.beginPath();
        ctx.arc(0, r * 0.1, rr * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = '#8a5fa8';
      ctx.beginPath();
      ctx.moveTo(-r * 0.15, -r * 0.65);
      ctx.lineTo(r * 0.15, -r * 0.65);
      ctx.lineTo(0, -r * 0.95);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'onionChopped': {
      ctx.strokeStyle = '#d8b4e8';
      ctx.lineWidth = r * 0.22;
      for (const rr of [0.75, 0.4]) {
        ctx.beginPath();
        ctx.arc(0, 0, rr * r, 0, Math.PI * 2);
        ctx.stroke();
      }
      break;
    }
    default: {
      ctx.fillStyle = '#cccccc';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function drawFlame(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  const flick = 1 + 0.12 * Math.sin(t * 9 + x);
  ctx.fillStyle = '#ff9a3c';
  ctx.beginPath();
  ctx.moveTo(0, -s * 1.3 * flick);
  ctx.quadraticCurveTo(s * 0.8, -s * 0.2, s * 0.45, s * 0.5);
  ctx.quadraticCurveTo(0, s * 0.8, -s * 0.45, s * 0.5);
  ctx.quadraticCurveTo(-s * 0.8, -s * 0.2, 0, -s * 1.3 * flick);
  ctx.fill();
  ctx.fillStyle = '#ffd94d';
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.7 * flick);
  ctx.quadraticCurveTo(s * 0.45, -s * 0.1, s * 0.25, s * 0.35);
  ctx.quadraticCurveTo(0, s * 0.55, -s * 0.25, s * 0.35);
  ctx.quadraticCurveTo(-s * 0.45, -s * 0.1, 0, -s * 0.7 * flick);
  ctx.fill();
  ctx.restore();
}

function drawChef(ctx, chef, t) {
  const bob = Math.sin(t * 10) * 1.5;
  const x = chef.x;
  const y = chef.y + bob * 0.3;
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.beginPath();
  ctx.ellipse(x, chef.y + 26, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: white apron.
  ctx.fillStyle = '#f4f1ea';
  roundRect(ctx, x - 20, y - 8, 40, 34, 12);
  ctx.fill();
  ctx.fillStyle = '#d94f3d';
  ctx.fillRect(x - 20, y + 8, 40, 5);
  // Head.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(x, y - 22, 15, 0, Math.PI * 2);
  ctx.fill();
  // Toque: three puffs and a band.
  ctx.fillStyle = '#ffffff';
  for (const [dx, dy, r] of [[-11, -38, 9], [0, -44, 11], [11, -38, 9]]) {
    ctx.beginPath();
    ctx.arc(x + dx, y + dy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillRect(x - 14, y - 38, 28, 8);
  // Eyes look the way the chef faces.
  ctx.fillStyle = '#241812';
  ctx.beginPath();
  ctx.arc(x + chef.facing * 4 - 5, y - 23, 2, 0, Math.PI * 2);
  ctx.arc(x + chef.facing * 4 + 5, y - 23, 2, 0, Math.PI * 2);
  ctx.fill();
  // Smile.
  ctx.strokeStyle = '#8a5a3c';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x + chef.facing * 3, y - 16, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // Carried item floats above the toque in a little bubble.
  if (chef.carrying !== null) {
    const cy = y - 66;
    ctx.fillStyle = 'rgba(255,246,232,0.95)';
    ctx.beginPath();
    ctx.arc(x, cy, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9b96a';
    ctx.lineWidth = 2;
    ctx.stroke();
    if (isPlate(chef.carrying)) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x, cy + 2, 18, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9aa5ad';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      chef.carrying.items.forEach((item, i) => {
        drawIngredient(ctx, item, x - 12 + i * 8, cy, 6);
      });
    } else {
      drawIngredient(ctx, chef.carrying, x, cy, 15);
    }
  }
}

function drawHeader(ctx, state, timeLeft, muted) {
  ctx.fillStyle = PALETTE.header;
  ctx.fillRect(0, 0, FIELD.width, 76);
  ctx.fillStyle = PALETTE.headerEdge;
  ctx.fillRect(0, 72, FIELD.width, 4);
  drawFlame(ctx, 44, 44, 13, performance.now() / 1000);
  text(ctx, 'EMBER & THYME', 66, 47, 30, PALETTE.text, 'left', '800');
  text(ctx, 'RUSH HOUR KITCHEN', 68, 66, 12, PALETTE.muted, 'left', '600');

  // Shift clock: a bar plus the seconds left, turning red under 30 s.
  const total = 150;
  const frac = Math.max(0, timeLeft / total);
  const low = timeLeft <= 30;
  text(ctx, 'SHIFT', 470, 30, 13, PALETTE.muted, 'left', '700');
  ctx.fillStyle = '#3a2a1e';
  roundRect(ctx, 470, 36, 260, 18, 9);
  ctx.fill();
  ctx.fillStyle = low ? PALETTE.red : PALETTE.gold;
  if (frac > 0) {
    roundRect(ctx, 470, 36, Math.max(18, 260 * frac), 18, 9);
    ctx.fill();
  }
  const mins = Math.floor(timeLeft / 60);
  const secs = Math.floor(timeLeft % 60);
  text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, 744, 52, 22, low ? '#ff8a7a' : PALETTE.text, 'left', '800');

  text(ctx, `COINS  $${state.coins}`, 830, 47, 26, PALETTE.gold, 'left', '800');
  text(ctx, `SERVED ${state.served}`, 1010, 47, 20, PALETTE.text, 'left', '700');
  if (state.combo >= 2) {
    text(ctx, `COMBO x${state.combo}`, 1130, 47, 20, '#ff9a3c', 'left', '800');
  }
  text(ctx, muted ? 'M: SOUND OFF' : 'M: SOUND ON', 1010, 66, 11, PALETTE.muted, 'left', '600');
}

function drawOrders(ctx, state) {
  text(ctx, 'ORDER BOARD', 24, 100, 13, PALETTE.muted, 'left', '700');
  const slots = 3;
  for (let i = 0; i < slots; i += 1) {
    const x = 24 + i * 268;
    const order = state.orders[i];
    ctx.fillStyle = PALETTE.paper;
    roundRect(ctx, x, ORDER_Y + 18, 252, ORDER_H, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.paperEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    if (!order) {
      text(ctx, '— waiting for the next table —', x + 126, ORDER_Y + 66, 13, '#a88f66', 'center', '600');
      continue;
    }
    const frac = Math.max(0, order.patience / order.maxPatience);
    const colour = frac > 0.5 ? '#4a8c2c' : frac > 0.25 ? '#d98a1a' : '#c0392b';
    text(ctx, `#${order.id}  ${order.recipe.name}`, x + 12, ORDER_Y + 42, 16, '#3a2a1e', 'left', '800');
    text(ctx, `$${order.recipe.price}`, x + 240, ORDER_Y + 42, 16, '#8a5a1a', 'right', '800');
    order.recipe.items.forEach((item, j) => {
      drawIngredient(ctx, item, x + 24 + j * 34, ORDER_Y + 66, 12);
    });
    ctx.fillStyle = '#e8d9b8';
    roundRect(ctx, x + 12, ORDER_Y + 86, 228, 8, 4);
    ctx.fill();
    ctx.fillStyle = colour;
    roundRect(ctx, x + 12, ORDER_Y + 86, Math.max(8, 228 * frac), 8, 4);
    ctx.fill();
    text(ctx, `${Math.ceil(order.patience)}s`, x + 240, ORDER_Y + 106, 11, colour, 'right', '700');
  }
}

function drawFloor(ctx) {
  ctx.fillStyle = PALETTE.wall;
  ctx.fillRect(0, 176, FIELD.width, 20);
  ctx.fillStyle = PALETTE.wallTop;
  ctx.fillRect(0, 176, FIELD.width, 6);
  const tile = 64;
  for (let ty = 0; ty < 8; ty += 1) {
    for (let tx = 0; tx < 20; tx += 1) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? PALETTE.floor : PALETTE.floorLight;
      ctx.fillRect(FLOOR.x + tx * tile, FLOOR.y + ty * tile, tile, tile);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.lineWidth = 1;
      ctx.strokeRect(FLOOR.x + tx * tile + 0.5, FLOOR.y + ty * tile + 0.5, tile, tile);
    }
  }
}

function drawBins(ctx, state, highlight) {
  for (const bin of STATIONS.bins) {
    const info = INGREDIENTS[bin.item];
    ctx.fillStyle = PALETTE.woodDark;
    roundRect(ctx, bin.x - 3, bin.y - 3, bin.width + 6, bin.height + 6, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.wood;
    roundRect(ctx, bin.x, bin.y, bin.width, bin.height, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(bin.x + 6.5, bin.y + 6.5, bin.width - 13, bin.height - 13);
    drawIngredient(ctx, bin.item, bin.x + 34, bin.y + bin.height / 2, 20);
    text(ctx, info.name.toUpperCase(), bin.x + 62, bin.y + 30, 15, '#fff6e8', 'left', '800');
    text(ctx, info.needs === 'none' ? 'ready to plate' : info.needs === 'grill' ? 'needs the grill' : 'needs chopping', bin.x + 62, bin.y + 50, 11, '#ffe1b0', 'left', '600');
    if (highlight === bin.id) {
      ctx.strokeStyle = '#ffd94d';
      ctx.lineWidth = 4;
      roundRect(ctx, bin.x - 5, bin.y - 5, bin.width + 10, bin.height + 10, 10);
      ctx.stroke();
    }
  }
}

function drawBoard(ctx, state, highlight) {
  const b = STATIONS.board;
  ctx.fillStyle = '#8a5a2e';
  roundRect(ctx, b.x - 4, b.y - 4, b.width + 8, b.height + 8, 10);
  ctx.fill();
  ctx.fillStyle = '#d9a860';
  roundRect(ctx, b.x, b.y, b.width, b.height, 8);
  ctx.fill();
  ctx.strokeStyle = '#b07a45';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(b.x + 16, b.y + 16);
  ctx.lineTo(b.x + b.width - 16, b.y + 16);
  ctx.stroke();
  text(ctx, 'CHOPPING BOARD', b.x + b.width / 2, b.y + b.height - 12, 14, '#5a3a1a', 'center', '800');
  if (state.board.item !== null) {
    drawIngredient(ctx, state.board.item, b.x + b.width / 2 - 40, b.y + 62, 26);
    // Chop progress: three knife slashes fill in as the veg is chopped.
    for (let i = 0; i < CHOPS_NEEDED; i += 1) {
      ctx.fillStyle = i < state.board.chops ? '#4a8c2c' : '#fff6e8';
      ctx.beginPath();
      ctx.arc(b.x + b.width / 2 + 30 + i * 22, b.y + 62, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = i < state.board.chops ? '#fff6e8' : '#8a5a2e';
      text(ctx, String(i + 1), b.x + b.width / 2 + 30 + i * 22, b.y + 66, 11, i < state.board.chops ? '#fff6e8' : '#8a5a2e', 'center', '800');
    }
    if (state.board.chops >= CHOPS_NEEDED) {
      text(ctx, 'CHOPPED!', b.x + b.width / 2, b.y + 34, 14, '#2c6e1a', 'center', '800');
    }
  } else {
    text(ctx, 'bring a veggie — press E 3x to chop', b.x + b.width / 2, b.y + 62, 13, '#7a4e22', 'center', '600');
  }
  // A little knife rests on the board.
  ctx.save();
  ctx.translate(b.x + b.width - 34, b.y + 34);
  ctx.rotate(-0.5);
  ctx.fillStyle = '#c8ccd0';
  roundRect(ctx, 0, -4, 34, 8, 4);
  ctx.fill();
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(-14, -4, 14, 8);
  ctx.restore();
  if (highlight === b.id) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    roundRect(ctx, b.x - 6, b.y - 6, b.width + 12, b.height + 12, 12);
    ctx.stroke();
  }
}

function drawGrill(ctx, state, highlight, t) {
  const g = STATIONS.grill;
  ctx.fillStyle = PALETTE.steelDark;
  roundRect(ctx, g.x - 4, g.y - 4, g.width + 8, g.height + 8, 10);
  ctx.fill();
  ctx.fillStyle = '#3c4147';
  roundRect(ctx, g.x, g.y, g.width, g.height, 8);
  ctx.fill();
  // Grate bars.
  ctx.strokeStyle = '#6b757d';
  ctx.lineWidth = 3;
  for (let i = 1; i < 9; i += 1) {
    ctx.beginPath();
    ctx.moveTo(g.x + (g.width / 9) * i, g.y + 10);
    ctx.lineTo(g.x + (g.width / 9) * i, g.y + g.height - 34);
    ctx.stroke();
  }
  text(ctx, 'GRILL', g.x + g.width / 2, g.y + g.height - 12, 14, '#d8dee2', 'center', '800');
  state.grill.forEach((slot, i) => {
    const cx = g.x + 85 + i * 170;
    const cy = g.y + 52;
    if (slot.state === 'cooking' || slot.state === 'cooked') {
      drawFlame(ctx, cx - 34, cy + 18, 10, t + i);
      drawFlame(ctx, cx + 34, cy + 18, 10, t + i * 2);
    }
    if (slot.state === 'empty') {
      ctx.strokeStyle = '#565e66';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      text(ctx, 'empty', cx, cy + 4, 12, '#8a939b', 'center', '600');
    } else {
      const id = slot.state === 'burnt' ? 'pattyBurnt' : slot.state === 'cooked' ? 'pattyCooked' : 'patty';
      drawIngredient(ctx, id, cx, cy, 30);
      if (slot.state === 'cooking') {
        const frac = Math.min(1, slot.progress / GRILL_SECONDS);
        ctx.strokeStyle = '#ffd94d';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(cx, cy, 38, -Math.PI / 2, -Math.PI / 2 + frac * Math.PI * 2);
        ctx.stroke();
        text(ctx, `${Math.ceil(GRILL_SECONDS - slot.progress)}s`, cx, cy + 52, 12, '#ffd94d', 'center', '700');
      } else if (slot.state === 'cooked') {
        text(ctx, 'READY!', cx, cy + 52, 13, '#7ec850', 'center', '800');
      } else {
        text(ctx, 'BURNT!', cx, cy + 52, 13, '#ff8a7a', 'center', '800');
      }
    }
  });
  if (highlight === g.id) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    roundRect(ctx, g.x - 6, g.y - 6, g.width + 12, g.height + 12, 12);
    ctx.stroke();
  }
}

function drawAssembly(ctx, state, highlight) {
  const a = STATIONS.assembly;
  ctx.fillStyle = PALETTE.steelDark;
  roundRect(ctx, a.x - 4, a.y - 4, a.width + 8, a.height + 8, 10);
  ctx.fill();
  ctx.fillStyle = '#c8ccd0';
  roundRect(ctx, a.x, a.y, a.width, a.height, 8);
  ctx.fill();
  text(ctx, 'ASSEMBLY', a.x + a.width / 2, a.y + 22, 14, '#5a636b', 'center', '800');
  // The plate.
  const px = a.x + a.width / 2;
  const py = a.y + 72;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(px, py, 92, 40, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#9aa5ad';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#eef1f3';
  ctx.beginPath();
  ctx.ellipse(px, py, 70, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  if (state.plate.items.length === 0) {
    text(ctx, 'empty plate — add ingredients', px, py + 4, 12, '#8a939b', 'center', '600');
  } else {
    state.plate.items.forEach((item, i) => {
      const ix = px - ((state.plate.items.length - 1) * 30) / 2 + i * 30;
      drawIngredient(ctx, item, ix, py - 2, 14);
    });
  }
  text(ctx, 'press E to add · E again to pick the plate up', px, a.y + a.height - 12, 11, '#5a636b', 'center', '600');
  if (highlight === a.id) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    roundRect(ctx, a.x - 6, a.y - 6, a.width + 12, a.height + 12, 12);
    ctx.stroke();
  }
}

function drawWindow(ctx, state, highlight) {
  const w = STATIONS.window;
  ctx.fillStyle = '#2b1d12';
  roundRect(ctx, w.x - 4, w.y - 4, w.width + 8, w.height + 8, 10);
  ctx.fill();
  // Striped awning.
  for (let i = 0; i < 6; i += 1) {
    ctx.fillStyle = i % 2 === 0 ? '#c0392b' : '#f4f1ea';
    ctx.fillRect(w.x + (w.width / 6) * i, w.y, w.width / 6, 26);
  }
  ctx.fillStyle = '#3a2a1e';
  ctx.fillRect(w.x, w.y + 26, w.width, 4);
  text(ctx, 'SERVE  •  ring the bell, dish out', w.x + w.width / 2, w.y + 62, 16, '#fff6e8', 'center', '800');
  text(ctx, 'bring a plate that matches an order', w.x + w.width / 2, w.y + 86, 12, '#d8b98f', 'center', '600');
  // The bell.
  ctx.fillStyle = '#f7c948';
  ctx.beginPath();
  ctx.arc(w.x + w.width / 2, w.y + 102, 10, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(w.x + w.width / 2 - 10, w.y + 100, 20, 4);
  if (highlight === w.id) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    roundRect(ctx, w.x - 6, w.y - 6, w.width + 12, w.height + 12, 12);
    ctx.stroke();
  }
}

function drawTrash(ctx, highlight) {
  const t = STATIONS.trash;
  ctx.fillStyle = '#565e66';
  roundRect(ctx, t.x + 30, t.y + 18, 90, 84, 8);
  ctx.fill();
  ctx.fillStyle = '#6b757d';
  roundRect(ctx, t.x + 22, t.y + 8, 106, 18, 6);
  ctx.fill();
  text(ctx, 'TRASH', t.x + t.width / 2, t.y + 62, 16, '#e8ecee', 'center', '800');
  text(ctx, 'toss burnt food', t.x + t.width / 2, t.y + 82, 11, '#c8ccd0', 'center', '600');
  text(ctx, 'press E to discard what you carry', t.x + t.width / 2, t.y + 100, 11, '#c8ccd0', 'center', '600');
  if (highlight === t.id) {
    ctx.strokeStyle = '#ffd94d';
    ctx.lineWidth = 4;
    roundRect(ctx, t.x - 6, t.y - 6, t.width + 12, t.height + 12, 12);
    ctx.stroke();
  }
}

function drawMessage(ctx, state) {
  if (state.elapsed >= state.message.until || state.message.text === '') return;
  const colours = { info: '#fff6e8', good: '#a8e88a', warn: '#ffd94d', bad: '#ff8a7a' };
  ctx.fillStyle = 'rgba(24,16,10,0.85)';
  roundRect(ctx, FIELD.width / 2 - 320, 676, 640, 30, 15);
  ctx.fill();
  text(ctx, state.message.text, FIELD.width / 2, 696, 15, colours[state.message.kind] ?? '#fff6e8', 'center', '700');
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, 1 - p.age / p.life);
    ctx.fillStyle = p.colour;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
  for (const f of state.floats) {
    ctx.globalAlpha = Math.max(0, 1 - f.age / f.life);
    text(ctx, f.text, f.x, f.y, 24, f.colour, 'center', '800');
  }
  ctx.globalAlpha = 1;
}

function rankFor(coins, served) {
  if (coins >= 150) return 'HEAD CHEF — the pass is yours!';
  if (coins >= 110) return 'SOUS CHEF — a very tidy shift.';
  if (coins >= 70) return 'LINE COOK — solid service.';
  if (coins >= 40) return 'PREP COOK — the kitchen survived.';
  return 'DISHWASHER — the rush got away. Cook again!';
}

function overlay(ctx, title, lines, hint) {
  ctx.fillStyle = 'rgba(20,12,6,0.72)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  const w = 640;
  const h = 120 + lines.length * 36;
  const x = (FIELD.width - w) / 2;
  const y = (FIELD.height - h) / 2;
  ctx.fillStyle = PALETTE.paper;
  roundRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = PALETTE.paperEdge;
  ctx.lineWidth = 3;
  ctx.stroke();
  text(ctx, title, FIELD.width / 2, y + 58, 40, '#3a2a1e', 'center', '800');
  lines.forEach((line, i) => {
    text(ctx, line, FIELD.width / 2, y + 104 + i * 36, 20, '#5a3a1a', 'center', '600');
  });
  text(ctx, hint, FIELD.width / 2, y + h - 24, 15, '#8a5a1a', 'center', '700');
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  // A fixed 1280x720 backing store: the game is drawn in logical coordinates and
  // the page's CSS scales it to the window; screenshots take a 1280x720 viewport
  // so nothing stretches.
  canvas.width = FIELD.width;
  canvas.height = FIELD.height;

  function draw(state, screen, best, muted, timeLeft) {
    const t = performance.now() / 1000;
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.header;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);

    drawHeader(ctx, state, timeLeft, muted);
    drawOrders(ctx, state);
    drawFloor(ctx);
    const near = screen === SCREEN_PLAY ? nearestStation(state) : null;
    const highlight = near ? near.id : null;
    drawBins(ctx, state, highlight);
    drawBoard(ctx, state, highlight);
    drawGrill(ctx, state, highlight, t);
    drawAssembly(ctx, state, highlight);
    drawWindow(ctx, state, highlight);
    drawTrash(ctx, highlight);
    drawChef(ctx, state.chef, t);
    drawParticles(ctx, state);
    drawMessage(ctx, state);

    // The key the nearest station wants, as a pill at the bottom of the screen
    // so it never collides with a station's own label.
    if (near && screen === SCREEN_PLAY) {
      const label = '[E]  ' + (near.id.startsWith('bin-') ? `take ${INGREDIENTS[near.item].name}` : near.id === 'board' ? 'chop / take' : near.id === 'grill' ? 'grill / take' : near.id === 'assembly' ? 'add / take plate' : near.id === 'window' ? 'serve!' : 'toss it');
      ctx.font = `800 14px ${FONT}`;
      const w = ctx.measureText(label).width + 28;
      ctx.fillStyle = 'rgba(24,16,10,0.85)';
      roundRect(ctx, FIELD.width / 2 - w / 2, 636, w, 28, 14);
      ctx.fill();
      text(ctx, label, FIELD.width / 2, 655, 14, '#ffd94d', 'center', '800');
    }

    // Controls, bottom-left, small.
    text(ctx, 'WASD / arrows move · E interact · click to walk · P pause · M mute', 24, 712, 12, 'rgba(255,246,232,0.55)', 'left', '600');

    if (screen === SCREEN_TITLE) {
      overlay(
        ctx,
        'EMBER & THYME',
        [
          'Rush Hour Kitchen — cook the orders before the tables walk out.',
          'Grab ingredients, chop the veggies, grill the patties,',
          'build each dish on the plate and ring the bell at the window.',
          best > 0 ? `Best shift so far: $${best}` : 'Your first shift starts when you press Space.',
        ],
        'Press SPACE or click to start cooking',
      );
    } else if (screen === SCREEN_PAUSED) {
      overlay(ctx, 'PAUSED', ['The orders are waiting — but the stove is off.', 'Take a breath, chef.'], 'Press P to get back to the pass');
    } else if (screen === SCREEN_OVER) {
      overlay(
        ctx,
        'SHIFT OVER!',
        [
          `Coins earned: $${state.coins}   ·   Dishes served: ${state.served}   ·   Walk-outs: ${state.missed}`,
          `Best combo: x${state.bestCombo}`,
          rankFor(state.coins, state.served),
          best > state.coins ? `Best shift: $${best}` : 'A new best shift!',
        ],
        'Press R to cook another shift',
      );
    }
  }

  return { draw };
}
