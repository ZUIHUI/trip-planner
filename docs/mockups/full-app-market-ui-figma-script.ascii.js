// ASCII-safe one-shot Figma replay script.
// Paste into use_figma for file 3RJXKuNurrRgIJntTjNiFd.
// Required skillNames: "figma-use,figma-generate-design"

const createdNodeIds = [];
const screenIds = [];

function hex(value) {
  const clean = value.replace('#', '');
  const num = parseInt(clean, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255
  };
}

function solid(color, opacity = 1) {
  return { type: 'SOLID', color: hex(color), opacity };
}

function shadow(opacity = 0.12, y = 16, blur = 32) {
  return [{
    type: 'DROP_SHADOW',
    color: { r: 0.07, g: 0.14, b: 0.12, a: opacity },
    offset: { x: 0, y },
    radius: blur,
    spread: 0,
    visible: true,
    blendMode: 'NORMAL'
  }];
}

const fonts = {};

async function loadRole(role, candidates) {
  for (const font of candidates) {
    try {
      await figma.loadFontAsync(font);
      fonts[role] = font;
      return font;
    } catch (_) {}
  }

  const fallback = { family: 'Arial', style: 'Regular' };
  await figma.loadFontAsync(fallback);
  fonts[role] = fallback;
  return fallback;
}

await loadRole('regular', [
  { family: 'Inter', style: 'Regular' },
  { family: 'Arial', style: 'Regular' }
]);
await loadRole('medium', [
  { family: 'Inter', style: 'Medium' },
  { family: 'Inter', style: 'Regular' },
  { family: 'Arial', style: 'Regular' }
]);
await loadRole('bold', [
  { family: 'Inter', style: 'Bold' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Arial', style: 'Bold' }
]);
await loadRole('black', [
  { family: 'Inter', style: 'Extra Bold' },
  { family: 'Inter', style: 'Bold' },
  { family: 'Arial', style: 'Bold' }
]);

function track(node) {
  createdNodeIds.push(node.id);
  return node;
}

function makeFrame(parent, name, x, y, w, h, fill = '#ffffff', radius = 8) {
  const node = track(figma.createFrame());
  node.name = name;
  node.resize(w, h);
  node.fills = [solid(fill)];
  node.strokes = [solid('#dce8e1')];
  node.strokeWeight = 1;
  node.cornerRadius = radius;
  node.clipsContent = false;
  if (parent) parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function makeRect(parent, name, x, y, w, h, fill = '#ffffff', radius = 8, effects = []) {
  const node = track(figma.createRectangle());
  node.name = name;
  node.resize(w, h);
  node.fills = [solid(fill)];
  node.strokes = [];
  node.cornerRadius = radius;
  node.effects = effects;
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function makeText(parent, value, x, y, w, size = 12, role = 'medium', color = '#13201b') {
  const node = track(figma.createText());
  node.fontName = fonts[role] || fonts.medium || fonts.regular;
  node.characters = value;
  node.fontSize = size;
  node.lineHeight = { value: Math.round(size * 1.35), unit: 'PIXELS' };
  node.letterSpacing = { value: 0, unit: 'PIXELS' };
  node.fills = [solid(color)];
  node.textAutoResize = 'HEIGHT';
  node.resize(w, Math.max(18, size * 1.4));
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function pill(parent, label, x, y, active = false) {
  const w = Math.max(56, label.length * 6 + 22);
  makeRect(parent, `pill / ${label}`, x, y, w, 24, active ? '#e8f5ef' : '#ffffff', 12);
  makeText(parent, label, x + 11, y + 6, w - 22, 9, 'bold', active ? '#116a62' : '#65736d');
  return w;
}

function card(parent, title, body, x, y, w, h = 72) {
  makeRect(parent, `card / ${title}`, x, y, w, h, '#ffffff', 8, shadow(0.06, 8, 18));
  makeText(parent, title, x + 12, y + 10, w - 24, 12, 'black', '#13201b');
  makeText(parent, body, x + 12, y + 30, w - 24, 10, 'medium', '#65736d');
}

function map(parent, x, y, w, h) {
  makeRect(parent, 'map bg', x, y, w, h, '#edf6f1', 8);
  for (let i = 0; i < 4; i += 1) {
    makeRect(parent, `road h ${i}`, x + 12, y + 25 + i * 36, w - 24, 2, '#d3e6df', 1);
    makeRect(parent, `road v ${i}`, x + 32 + i * 62, y + 12, 2, h - 24, '#d3e6df', 1);
  }

  const routeA = makeRect(parent, 'route primary', x + 46, y + 62, w - 94, 5, '#116a62', 3);
  routeA.rotation = -14;
  const routeB = makeRect(parent, 'route secondary', x + 105, y + 116, w - 150, 5, '#3674c9', 3);
  routeB.rotation = 22;

  const pins = [
    ['1', '#116a62', 54, 48],
    ['2', '#3674c9', w - 90, 40],
    ['3', '#e2a044', w - 72, h - 72],
    ['4', '#d96363', 82, h - 62]
  ];

  for (const item of pins) {
    makeRect(parent, `pin ${item[0]}`, x + item[2], y + item[3], 24, 24, item[1], 12, shadow(0.14, 6, 12));
    makeText(parent, item[0], x + item[2] + 8, y + item[3] + 6, 10, 9, 'black', '#ffffff');
  }
}

function row(parent, time, title, meta, x, y, w, tag = '') {
  makeRect(parent, `row / ${title}`, x, y, w, 54, '#ffffff', 8, shadow(0.04, 5, 12));
  makeText(parent, time, x + 10, y + 13, 42, 10, 'black', '#116a62');
  makeText(parent, title, x + 58, y + 9, w - 120, 12, 'black', '#13201b');
  makeText(parent, meta, x + 58, y + 29, w - 120, 9, 'medium', '#65736d');
  if (tag) pill(parent, tag, x + w - 66, y + 15, tag === 'Next' || tag === 'Add');
}

function screen(board, name, x, y, spec) {
  const node = makeFrame(board, name, x, y, 310, 620, '#fbfdfc', 24);
  node.effects = shadow(0.12, 14, 34);
  screenIds.push(node.id);

  makeText(node, spec.badge, 18, 22, 100, 10, 'black', '#65736d');
  makeText(node, spec.title, 18, 46, 210, 20, 'black', '#13201b');
  makeRect(node, 'top action', 256, 35, 36, 36, '#ffffff', 8, shadow(0.05, 5, 12));
  makeText(node, spec.action || '+', 268, 45, 16, 13, 'black', '#116a62');

  let cursorY = 92;
  if (spec.map) {
    map(node, 18, cursorY, 274, 150);
    cursorY += 164;
  }

  if (spec.pills) {
    let cursorX = 18;
    let pillY = cursorY;
    for (const p of spec.pills) {
      const used = pill(node, p[0], cursorX, pillY, Boolean(p[1]));
      cursorX += used + 6;
      if (cursorX > 210) {
        cursorX = 18;
        pillY += 30;
      }
    }
    cursorY = pillY + 34;
  }

  for (const c of spec.cards || []) {
    card(node, c[0], c[1], 18, cursorY, 274, c[2] || 72);
    cursorY += (c[2] || 72) + 10;
  }

  for (const r of spec.rows || []) {
    row(node, r[0], r[1], r[2], 18, cursorY, 274, r[3] || '');
    cursorY += 62;
  }

  makeRect(node, 'bottom nav', 18, 556, 274, 44, '#ffffff', 8);
  ['Today', 'Plan', 'Ideas', 'More'].forEach((label, index) => {
    const active = label === spec.nav;
    if (active) makeRect(node, `active nav / ${label}`, 24 + index * 66, 562, 58, 32, '#e8f5ef', 8);
    makeText(node, label, 36 + index * 66, 572, 40, 9, 'black', active ? '#116a62' : '#65736d');
  });

  return node;
}

let page = figma.root.children.find((p) => p.name === 'Full App Mockups');
if (!page) {
  page = figma.createPage();
  page.name = 'Full App Mockups';
}
await figma.setCurrentPageAsync(page);

let maxX = 0;
for (const child of page.children) {
  maxX = Math.max(maxX, child.x + child.width);
}

const board = makeFrame(null, 'Full App Coverage v3 / board', maxX + 220, 0, 2360, 3000, '#f7faf8', 8);
board.strokes = [];
board.clipsContent = false;

makeText(board, 'Trip Planner full app UI mockup v3', 52, 44, 980, 42, 'black', '#13201b');
makeText(
  board,
  'Market-inspired coverage board: map-first travel surface, all trip details in one workspace, group collaboration, AI day planning, and operational states.',
  54,
  104,
  1050,
  16,
  'medium',
  '#65736d'
);
pill(board, 'Wanderlog: map + itinerary', 54, 156, true);
pill(board, 'Tripsy: all details', 236, 156, false);
pill(board, 'Polarsteps: journey map', 370, 156, false);

const specs = [
  ['Login / auth', { badge: 'AUTH', title: 'Welcome + secure sign in', action: 'GO', map: true, cards: [['Google sign in', 'Primary login with email-code fallback.'], ['Remember device', 'Install prompt and status messages stay visible.']], nav: 'Today' }],
  ['Trip Home / create join', { badge: 'TRIPS', title: 'Trip dashboard', action: '+', pills: [['Create', true], ['Join'], ['Filters']], cards: [['Continue trip', 'Open the last active trip immediately.'], ['Invite code', 'Join shared trips with role badges.']], rows: [['Owner', 'Tokyo winter walk', '8 days / 36 stops', 'Open'], ['Edit', 'Setouchi weekend', '3 days / 14 stops', 'Open']], nav: 'More' }],
  ['Today / map first', { badge: 'DAY 3', title: 'Today map first', action: 'GPS', map: true, pills: [['Navigate', true], ['AI plan'], ['Flight alert']], cards: [['Next stop', 'Kiyomizu temple, 14 min walk.']], rows: [['10:00', 'Nishiki breakfast', 'Done / 2 companions', 'Photo'], ['13:30', 'Kiyomizu temple', 'Ticket reminder / popular time', 'Next'], ['17:40', 'Gion dinner', 'Reservation saved', 'Map']], nav: 'Today' }],
  ['Itinerary / timeline', { badge: 'PLAN', title: 'Day timeline editor', action: '+', pills: [['Day 1'], ['Day 2'], ['Day 3', true], ['Day 4']], cards: [['Day metadata', 'Date, title, weather and route summary.']], rows: [['09:10', 'Leave hotel', 'Start from accommodation', 'Move'], ['10:00', 'Fushimi Inari', '90 min stay suggested', 'Drag'], ['12:30', 'Lunch option', 'Imported from ideas', 'Edit']], nav: 'Plan' }],
  ['Ideas / place pool', { badge: 'IDEAS', title: 'Saved places + votes', action: '*', pills: [['All', true], ['Food'], ['Sights'], ['Rainy']], cards: [['Add place', 'Search, paste map link, vote and classify.']], rows: [['4v', 'Arashiyama bamboo', 'Suggested Day 4', 'Add'], ['2v', 'Ogawa coffee', '8 min from hotel', 'Vote'], ['Alt', 'Kyoto Tower night', 'Rainy-day backup', 'Save']], nav: 'Ideas' }],
  ['More / hub', { badge: 'HUB', title: 'All modules hub', action: '...', cards: [['Planning modules', 'Summary, logistics, handbook, pre-trip, packing.'], ['Money + shopping', 'Expenses, currency and shopping categories.'], ['Companions + device', 'Share, settings, install, notifications, GPS.']], nav: 'More' }],
  ['Summary / overview', { badge: 'OVERVIEW', title: 'Trip readiness', action: 'OK', cards: [['Readiness rail', 'Flights, stay, checklist, budget, packing.'], ['Next action', 'Go to next event, maps or handbook.'], ['Budget snapshot', 'Used 62 percent of target.']], nav: 'More' }],
  ['Logistics / stay flights', { badge: 'INFO', title: 'Stay + flight details', action: 'FL', cards: [['Accommodation', 'Hotel address, check-in and map shortcut.'], ['Outbound flight', 'Flight code, time, terminal and lookup.'], ['Inbound flight', 'Return flight and delay status.']], nav: 'More' }],
  ['PreTrip / checklist', { badge: 'TODO', title: 'Before departure', action: 'CK', cards: [['Passport + insurance', 'Owner assigns prep items.'], ['Realtime checklist', 'Companions can check items together.']], rows: [['Done', 'Passport valid', 'Synced', 'OK'], ['Todo', 'SIM pickup', 'Airport counter', 'Due']], nav: 'More' }],
  ['Packing / categories', { badge: 'BAG', title: 'Packing list', action: 'PK', cards: [['Categories', 'Clothes, documents, medicine, devices.'], ['Progress', '26 of 34 items packed.']], rows: [['Bag', 'Rain jacket', 'Shared item', 'Pack'], ['Doc', 'Passport copy', 'Important', 'Done']], nav: 'More' }],
  ['Expenses / budget', { badge: 'MONEY', title: 'Budget tracker', action: '$', cards: [['Trip budget', 'NT$28,000 of NT$45,000 used.'], ['Multi-currency', 'JPY exchange-rate controls in settings.']], rows: [['Food', 'Nishiki breakfast', 'JPY 3200', 'Split'], ['Transit', 'ICOCA top-up', 'JPY 5000', 'Log']], nav: 'More' }],
  ['Shopping / list', { badge: 'SHOP', title: 'Shopping categories', action: '+', cards: [['Fixed add action', 'Bottom action opens quick add.'], ['Categories', 'Gifts, drugstore, duty-free, requests.']], rows: [['Gift', 'Matcha cookies', 'Qty 6', 'Buy'], ['Drug', 'Eye drops', 'Qty 3', 'Done']], nav: 'More' }],
  ['Companions / sharing', { badge: 'GROUP', title: 'Invite + permissions', action: 'SH', cards: [['Invite code', 'Owner, editor and view-only roles.'], ['Presence', 'Who is online and where they are editing.']], rows: [['Owner', 'Mina', 'Online in itinerary', 'Live'], ['View', 'Family link', 'Read-only', 'Share']], nav: 'More' }],
  ['Settings / sheet', { badge: 'SETTINGS', title: 'Preference sheet', action: 'X', cards: [['Theme + size', 'Light/dark and interface density.'], ['Trip controls', 'Cover image, exchange rate, travelers, GPS.'], ['Version', 'Status and validation messages.']], nav: 'More' }],
  ['Event / modal', { badge: 'MODAL', title: 'Event detail editor', action: 'SV', cards: [['Event fields', 'Title, time, location, notes and tags.'], ['Map actions', 'Previous location and Google Maps shortcut.'], ['Read-only mode', 'View mode separates from edit affordance.']], nav: 'Plan' }],
  ['Handbook / PDF', { badge: 'PDF', title: 'Trip handbook modal', action: 'PDF', cards: [['Generate', 'AI handbook from trip title and cover.'], ['Export', 'Saved handbook and PDF export state.']], rows: [['Day 1', 'Arrival overview', 'Food and transit notes', 'Ready'], ['Day 2', 'Walking plan', 'Map + reservations', 'Ready']], nav: 'More' }],
  ['AI / day plan', { badge: 'AI', title: 'Companion planner', action: 'AI', cards: [['Prompt', 'Slow pace, fewer queues, rainy backup.'], ['Recommendations', 'Apply as place idea or event.']], rows: [['AI', 'Kyoto Tower night', 'Good rainy backup', 'Add'], ['AI', 'Ogawa coffee', 'Route rest stop', 'Plan']], nav: 'Today' }],
  ['System states', { badge: 'STATE', title: 'Install GPS sync', action: '!', cards: [['Install prompt', 'PWA install and notification card.'], ['GPS status', 'Locating, accuracy and error state.'], ['Sync conflict', 'Remote/local resolution and read-only banner.']], nav: 'More' }]
];

specs.forEach((entry, index) => {
  const col = index % 6;
  const rowIndex = Math.floor(index / 6);
  screen(board, `Full App Coverage v3 / ${entry[0]}`, 54 + col * 374, 230 + rowIndex * 690, entry[1]);
});

const desktop = makeFrame(board, 'Full App Coverage v3 / Desktop command center', 54, 2250, 1540, 660, '#fbfdfc', 8);
desktop.effects = shadow(0.12, 16, 34);
makeText(desktop, 'Desktop command center', 26, 24, 600, 28, 'black');
makeText(desktop, 'Left nav, center route map, right operation stack.', 28, 62, 600, 14, 'medium', '#65736d');
makeRect(desktop, 'left nav', 26, 100, 190, 520, '#ffffff', 8);
['Today', 'Summary', 'Itinerary', 'Ideas', 'Logistics', 'PreTrip', 'Packing', 'Expenses', 'Shopping', 'Companions'].forEach((label, index) => {
  if (index === 0) makeRect(desktop, `nav active / ${label}`, 42, 116 + index * 48, 158, 36, '#e8f5ef', 8);
  makeText(desktop, label, 60, 126 + index * 48, 120, 11, 'bold', index === 0 ? '#116a62' : '#65736d');
});
map(desktop, 242, 100, 780, 520);
makeRect(desktop, 'right stack', 1048, 100, 450, 520, '#ffffff', 8);
card(desktop, 'Next step', '13:30 Kiyomizu temple, 14 min walk.', 1070, 124, 406, 76);
card(desktop, 'Today timeline', 'Nishiki -> Kiyomizu -> Gion dinner.', 1070, 214, 406, 82);
card(desktop, 'Budget', 'NT$28,000 used, 62 percent of target.', 1070, 310, 406, 76);
card(desktop, 'AI companion', 'Apply ideas into itinerary or place pool.', 1070, 400, 406, 84);

const overlay = makeFrame(board, 'Full App Coverage v3 / Overlay states matrix', 1640, 2250, 650, 660, '#ffffff', 8);
overlay.effects = shadow(0.12, 16, 34);
makeText(overlay, 'Overlay states matrix', 26, 24, 460, 26, 'black');
[
  ['Settings sheet', 'theme, size, rate, GPS'],
  ['Event modal', 'detail, edit, read-only'],
  ['Handbook modal', 'generate and export PDF'],
  ['AI panel', 'prompt, cards, apply actions'],
  ['Install prompt', 'PWA and notification'],
  ['Conflict banner', 'resolve local or remote']
].forEach((item, index) => {
  card(overlay, item[0], item[1], 26 + (index % 2) * 300, 82 + Math.floor(index / 2) * 150, 276, 110);
});

figma.viewport.scrollAndZoomIntoView([board]);

return {
  success: true,
  rootNodeId: board.id,
  createdNodeIds,
  screenIds,
  screenCount: specs.length + 2,
  message: 'Full app Figma mockup board created.'
};
