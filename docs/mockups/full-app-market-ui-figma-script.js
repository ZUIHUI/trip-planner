// Paste into use_figma for file 3RJXKuNurrRgIJntTjNiFd.
// Required skillNames: "figma-use,figma-generate-design"

const createdNodeIds = [];
const frameNames = [];

const hex = (value) => {
  const cleaned = value.replace('#', '');
  const bigint = parseInt(cleaned, 16);
  return {
    r: ((bigint >> 16) & 255) / 255,
    g: ((bigint >> 8) & 255) / 255,
    b: (bigint & 255) / 255
  };
};

const solid = (color, opacity = 1) => ({
  type: 'SOLID',
  color: hex(color),
  opacity
});

const shadow = (opacity = 0.14, y = 16, blur = 34) => [{
  type: 'DROP_SHADOW',
  color: { r: 0.08, g: 0.16, b: 0.13, a: opacity },
  offset: { x: 0, y },
  radius: blur,
  spread: 0,
  visible: true,
  blendMode: 'NORMAL'
}];

const fonts = {};
async function loadFontRole(role, candidates) {
  for (const candidate of candidates) {
    try {
      await figma.loadFontAsync(candidate);
      fonts[role] = candidate;
      return candidate;
    } catch (_) {}
  }
  const fallback = { family: 'Inter', style: 'Regular' };
  await figma.loadFontAsync(fallback);
  fonts[role] = fallback;
  return fallback;
}

await loadFontRole('regular', [
  { family: 'Inter', style: 'Regular' },
  { family: 'Arial', style: 'Regular' }
]);
await loadFontRole('medium', [
  { family: 'Inter', style: 'Medium' },
  { family: 'Inter', style: 'Regular' },
  { family: 'Arial', style: 'Regular' }
]);
await loadFontRole('bold', [
  { family: 'Inter', style: 'Bold' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Arial', style: 'Bold' },
  { family: 'Arial', style: 'Regular' }
]);
await loadFontRole('black', [
  { family: 'Inter', style: 'Extra Bold' },
  { family: 'Inter', style: 'Bold' },
  { family: 'Inter', style: 'Semi Bold' },
  { family: 'Arial', style: 'Bold' }
]);

function track(node) {
  createdNodeIds.push(node.id);
  return node;
}

function makeFrame(name, x, y, width, height, fills = [solid('#ffffff')]) {
  const node = track(figma.createFrame());
  node.name = name;
  node.resize(width, height);
  node.x = x;
  node.y = y;
  node.fills = fills;
  node.strokes = [solid('#dce8e1')];
  node.strokeWeight = 1;
  node.cornerRadius = 8;
  node.clipsContent = false;
  return node;
}

function makeText(parent, text, x, y, width, size = 14, role = 'medium', color = '#13201b', lineHeight = null) {
  const node = track(figma.createText());
  node.fontName = fonts[role] || fonts.medium || fonts.regular;
  node.characters = text;
  node.fontSize = size;
  node.lineHeight = lineHeight || { value: Math.round(size * 1.35), unit: 'PIXELS' };
  node.letterSpacing = { value: 0, unit: 'PIXELS' };
  node.fills = [solid(color)];
  node.textAutoResize = 'HEIGHT';
  node.resize(width, Math.max(size * 1.35, 18));
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function makeRect(parent, name, x, y, width, height, color, radius = 8, effects = []) {
  const node = track(figma.createRectangle());
  node.name = name;
  node.resize(width, height);
  node.fills = [solid(color)];
  node.strokes = [];
  node.cornerRadius = radius;
  node.effects = effects;
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function makeLine(parent, name, x, y, width, color = '#dce8e1') {
  const node = track(figma.createLine());
  node.name = name;
  node.resize(width, 0);
  node.strokes = [solid(color)];
  node.strokeWeight = 1;
  parent.appendChild(node);
  node.x = x;
  node.y = y;
  return node;
}

function pill(parent, text, x, y, color = '#e8f5ef', textColor = '#116a62') {
  const width = Math.max(54, text.length * 7 + 22);
  makeRect(parent, `pill / ${text}`, x, y, width, 26, color, 13);
  makeText(parent, text, x + 11, y + 6, width - 22, 10, 'bold', textColor, { value: 13, unit: 'PIXELS' });
  return width;
}

function card(parent, title, body, x, y, width, height = 86) {
  makeRect(parent, `card / ${title}`, x, y, width, height, '#ffffff', 8, shadow(0.07, 8, 18));
  makeText(parent, title, x + 12, y + 11, width - 24, 13, 'black', '#13201b');
  makeText(parent, body, x + 12, y + 34, width - 24, 11, 'medium', '#65736d', { value: 16, unit: 'PIXELS' });
}

function miniMap(parent, x, y, width, height) {
  makeRect(parent, 'map background', x, y, width, height, '#edf6f1', 8);
  for (let i = 0; i < 4; i += 1) {
    makeLine(parent, `map road h ${i}`, x + 12, y + 30 + i * 38, width - 24, '#d3e6df');
    const vertical = makeRect(parent, `map road v ${i}`, x + 36 + i * 62, y + 14, 2, height - 28, '#d3e6df', 1);
    vertical.opacity = 0.8;
  }
  const route = makeRect(parent, 'route path', x + 46, y + 58, width - 92, 5, '#116a62', 3);
  route.rotation = -15;
  const routeTwo = makeRect(parent, 'route path bend', x + 110, y + 116, width - 160, 5, '#3674c9', 3);
  routeTwo.rotation = 24;
  const pinSpecs = [
    ['1', '#116a62', 58, 54],
    ['2', '#3674c9', width - 92, 42],
    ['3', '#e2a044', width - 74, height - 76],
    ['4', '#d96363', 88, height - 62]
  ];
  for (const [label, color, px, py] of pinSpecs) {
    makeRect(parent, `map pin ${label}`, x + px, y + py, 26, 26, color, 13, shadow(0.16, 7, 12));
    makeText(parent, label, x + px + 9, y + py + 6, 10, 10, 'black', '#ffffff', { value: 12, unit: 'PIXELS' });
  }
}

function phoneFrame(name, x, y, variant, blocks) {
  const phone = makeFrame(name, x, y, 360, 760, [solid('#fbfdfc')]);
  phone.cornerRadius = 28;
  phone.effects = shadow(0.14, 18, 42);
  frameNames.push(name);
  makeRect(phone, 'speaker', 137, 10, 86, 5, '#cddbd5', 4);
  makeText(phone, '9:41', 22, 30, 60, 11, 'black', '#475b52');
  makeText(phone, variant, 258, 30, 78, 11, 'black', '#475b52');
  makeText(phone, blocks.eyebrow, 20, 62, 220, 11, 'bold', '#65736d');
  makeText(phone, blocks.title, 20, 80, 230, 21, 'black', '#13201b', { value: 26, unit: 'PIXELS' });
  makeRect(phone, 'top action', 304, 66, 36, 36, '#ffffff', 8, shadow(0.06, 6, 16));
  makeText(phone, blocks.icon, 315, 75, 14, 16, 'black', '#116a62');

  let yPos = 126;
  if (blocks.map) {
    miniMap(phone, 20, yPos, 320, blocks.mapHeight || 210);
    yPos += (blocks.mapHeight || 210) + 12;
  }

  if (blocks.pills) {
    let px = 20;
    let py = yPos;
    for (const item of blocks.pills) {
      const width = pill(phone, item[0], px, py, item[1] || '#ffffff', item[2] || '#40524b');
      px += width + 6;
      if (px > 260) {
        px = 20;
        py += 32;
      }
    }
    yPos = py + 38;
  }

  for (const item of blocks.cards || []) {
    card(phone, item.title, item.body, 20, yPos, 320, item.height || 78);
    yPos += (item.height || 78) + 10;
  }

  for (const item of blocks.events || []) {
    makeRect(phone, `event / ${item.title}`, 20, yPos, 320, 60, '#ffffff', 8, shadow(0.05, 6, 14));
    makeText(phone, item.time, 32, yPos + 15, 42, 11, 'black', '#116a62');
    makeText(phone, item.title, 82, yPos + 11, 180, 13, 'black', '#13201b');
    makeText(phone, item.meta, 82, yPos + 33, 180, 10, 'medium', '#65736d');
    pill(phone, item.tag, 268, yPos + 17, item.tagColor || '#e8f5ef', item.tagText || '#116a62');
    yPos += 69;
  }

  const navY = 684;
  makeRect(phone, 'bottom nav', 20, navY, 320, 54, '#ffffff', 8);
  const nav = ['旅途', '行程', '想去', '更多'];
  nav.forEach((label, index) => {
    const active = label === blocks.activeNav;
    if (active) makeRect(phone, `nav active / ${label}`, 27 + index * 78, navY + 7, 70, 40, '#e8f5ef', 8);
    makeText(phone, label, 44 + index * 78, navY + 22, 40, 10, 'black', active ? '#116a62' : '#65736d');
  });
  return phone;
}

function moduleFrame(name, x, y, icon, cards) {
  const f = makeFrame(name, x, y, 300, 300, [solid('#ffffff')]);
  f.effects = shadow(0.08, 8, 20);
  frameNames.push(name);
  makeRect(f, 'icon chip', 18, 18, 38, 38, '#e8f5ef', 8);
  makeText(f, icon, 31, 28, 18, 14, 'black', '#116a62');
  makeText(f, name.replace('Full App Coverage v3 / ', ''), 68, 20, 200, 17, 'black', '#13201b');
  let yPos = 72;
  for (const item of cards) {
    card(f, item.title, item.body, 18, yPos, 264, 70);
    yPos += 82;
  }
  return f;
}

let targetPage = figma.root.children.find((page) => page.name === 'Full App Mockups');
if (!targetPage) {
  targetPage = figma.createPage();
  targetPage.name = 'Full App Mockups';
}
await figma.setCurrentPageAsync(targetPage);

let maxX = 0;
for (const child of targetPage.children) {
  maxX = Math.max(maxX, child.x + child.width);
}
const startX = maxX + 220;
const startY = 0;

const board = makeFrame('Full App Coverage v3 / board', startX, startY, 2700, 2240, [solid('#f7faf8')]);
board.strokes = [];
board.clipsContent = false;
frameNames.push(board.name);
makeText(board, 'Trip Planner market-inspired full app mockup v3', 56, 48, 1260, 44, 'black', '#13201b', { value: 52, unit: 'PIXELS' });
makeText(board, 'Map-first flow inspired by Wanderlog, all-trip-details structure inspired by Tripsy, and journey map/status storytelling inspired by Polarsteps. Covers every major route, tab, panel, modal and system state currently present in the React app.', 58, 108, 1120, 17, 'medium', '#65736d', { value: 26, unit: 'PIXELS' });
pill(board, 'Figma MCP quota blocked: replay script prepared', 58, 172, '#fff3d8', '#8a5a16');
pill(board, 'Editable frames', 385, 172, '#e8f5ef', '#116a62');
pill(board, 'Mobile first', 525, 172, '#e9f0fb', '#3674c9');

const phones = [
  ['Full App Coverage v3 / Login / welcome auth', 'Auth', { eyebrow: 'Welcome back', title: '開始你的下一段旅行', icon: '✈', map: true, mapHeight: 150, cards: [{ title: 'Google 登入', body: '主 CTA 清楚；Email 驗證收合為備援。' }, { title: '記住裝置', body: '登入狀態與安裝提示放在同一個安全上下文。' }], activeNav: '旅途' }],
  ['Full App Coverage v3 / Trip Home / create join', 'Trips', { eyebrow: 'Dashboard', title: '旅程首頁', icon: '+', pills: [['新增旅程', '#e8f5ef', '#116a62'], ['加入邀請'], ['進行中 1']], cards: [{ title: '繼續上次旅程', body: '東京冬日散步 / Day 3 / 36 stops' }, { title: '建立或加入', body: '新增旅程、邀請碼、搜尋與篩選都在首頁完成。' }], events: [{ time: 'Owner', title: '東京冬日散步', meta: '8 days / 36 stops', tag: '開啟' }, { time: 'Edit', title: '瀨戶內週末', meta: '3 days / 14 stops', tag: '開啟' }], activeNav: '更多' }],
  ['Full App Coverage v3 / Today / map first', 'GPS', { eyebrow: 'Day 3 / today', title: '今日旅途', icon: '⌖', map: true, cards: [{ title: '下一站：清水寺', body: '步行 14 分鐘；13:20 前抵達最佳。' }], pills: [['導航', '#e8f5ef', '#116a62'], ['AI 幫我排'], ['航班提醒']], events: [{ time: '10:00', title: '錦市場早餐', meta: '已完成 / 旅伴 2 人', tag: '照片' }, { time: '13:30', title: '清水寺', meta: '門票提醒 / 熱門時段', tag: '下一站', tagColor: '#e8f5ef' }, { time: '17:40', title: '祇園晚餐', meta: '預約碼已存', tag: '地圖' }], activeNav: '旅途' }],
  ['Full App Coverage v3 / Itinerary / day timeline', 'Day 3', { eyebrow: 'Timeline', title: '行程編排', icon: '+', pills: [['Day 1'], ['Day 2'], ['Day 3', '#e8f5ef', '#116a62'], ['Day 4']], cards: [{ title: 'Day metadata', body: '日期、標題、天氣與交通摘要可快速編輯。' }], events: [{ time: '09:10', title: '飯店出發', meta: '從住宿開始', tag: '移動' }, { time: '10:00', title: '伏見稻荷', meta: '建議停留 90 分鐘', tag: '拖曳' }, { time: '12:30', title: '午餐候補', meta: '從想去清單加入', tag: '候補' }, { time: '15:10', title: '咖啡休息', meta: '路線中段緩衝', tag: '編輯' }], activeNav: '行程' }],
  ['Full App Coverage v3 / Ideas / place pool', '18 ideas', { eyebrow: 'Place pool', title: '想去清單', icon: '★', pills: [['全部', '#e8f5ef', '#116a62'], ['餐廳'], ['景點'], ['雨天備案']], cards: [{ title: '搜尋或貼上地點', body: '支援地址、Google Maps 地點與旅伴投票。' }], events: [{ time: '4票', title: '嵐山竹林', meta: '建議 Day 4', tag: '加入' }, { time: '2票', title: '小川咖啡', meta: '離住宿 8 分鐘', tag: '投票' }, { time: '備案', title: '京都塔夜景', meta: '雨天與夜景', tag: '收藏' }], activeNav: '想去' }],
  ['Full App Coverage v3 / More / hub', 'Modules', { eyebrow: 'Hub', title: '更多功能', icon: '☰', cards: [{ title: '主要模組', body: '總覽、資訊、旅遊手冊、行前、行李。' }, { title: '財務與購物', body: '記帳、購物清單與分類。' }, { title: '旅伴與裝置', body: '邀請、權限、推播、GPS、設定。' }], activeNav: '更多' }]
];

phones.forEach((item, index) => {
  const x = 56 + index * 410;
  phoneFrame(item[0], x, 250, item[1], item[2]);
});

const moduleY = 1060;
const modules = [
  ['Full App Coverage v3 / Summary / overview', '▦', [{ title: 'Readiness', body: '航班、住宿、行前、費用、行李狀態整合。' }, { title: 'Next step', body: '下一個行程與快速操作。' }, { title: 'Budget', body: '預算進度與剩餘金額。' }]],
  ['Full App Coverage v3 / Logistics / stay flights', '✈', [{ title: '住宿', body: '飯店名稱、地址、check-in/out。' }, { title: '去回程航班', body: '航班時間、航廈、查詢狀態。' }]],
  ['Full App Coverage v3 / PreTrip / checklist', '✓', [{ title: '出國前待辦', body: '護照、保險、網卡、票券。' }, { title: '共同編輯', body: '旅伴完成狀態同步。' }]],
  ['Full App Coverage v3 / Packing / categories', '▣', [{ title: '行李分類', body: '衣物、文件、藥品、電子。' }, { title: '完成度', body: '26 / 34 packed。' }]],
  ['Full App Coverage v3 / Expenses / budget', '$', [{ title: '預算', body: 'NT$28,000 / 45,000。' }, { title: '多幣別', body: 'JPY 匯率與分類統計。' }]],
  ['Full App Coverage v3 / Shopping / list', '□', [{ title: '購物清單', body: '分類、數量、完成狀態。' }, { title: '快速新增', body: '固定底部新增按鈕。' }]],
  ['Full App Coverage v3 / Companions / share', '☷', [{ title: '邀請碼', body: 'Owner / editor / view 權限。' }, { title: 'Presence', body: '在線旅伴與正在編輯位置。' }]],
  ['Full App Coverage v3 / Settings / bottom sheet', '⚙', [{ title: '外觀', body: 'Theme + interface size。' }, { title: 'Trip controls', body: '封面、匯率、GPS、旅伴。' }]],
  ['Full App Coverage v3 / Event / detail editor', '+', [{ title: 'Event form', body: '時間、地點、備註、上一站導航。' }, { title: 'View mode', body: '唯讀與編輯模式分離。' }]],
  ['Full App Coverage v3 / Handbook / PDF modal', 'PDF', [{ title: '旅遊手冊', body: '生成、保存、匯出 PDF。' }, { title: 'Cover', body: '使用旅程封面與每日摘要。' }]],
  ['Full App Coverage v3 / AI / day plan', '✦', [{ title: 'User idea', body: '慢一點、少排隊、雨天備案。' }, { title: 'Apply', body: '加入想去或排進 Day timeline。' }]],
  ['Full App Coverage v3 / Install + GPS + sync states', '!', [{ title: 'System states', body: '安裝提示、推播、GPS、同步衝突。' }, { title: 'Read-only', body: '清楚提示權限與不可編輯狀態。' }]]
];

modules.forEach((item, index) => {
  const col = index % 6;
  const row = Math.floor(index / 6);
  moduleFrame(item[0], 56 + col * 430, moduleY + row * 340, item[1], item[2]);
});

const desktop = makeFrame('Full App Coverage v3 / Desktop / command center v3', 56, 1810, 1540, 720, [solid('#fbfdfc')]);
desktop.effects = shadow(0.14, 18, 42);
frameNames.push(desktop.name);
makeText(desktop, 'Desktop command center', 28, 26, 520, 28, 'black', '#13201b', { value: 34, unit: 'PIXELS' });
makeText(desktop, 'Left navigation, center route map, right operational stack.', 30, 66, 620, 15, 'medium', '#65736d');

makeRect(desktop, 'desktop rail', 28, 106, 190, 560, '#ffffff', 8);
['旅途', '總覽', '行程', '想去', '資訊', '行前', '記帳', '旅伴'].forEach((label, index) => {
  const active = index === 0;
  if (active) makeRect(desktop, `rail active / ${label}`, 42, 124 + index * 58, 162, 44, '#e8f5ef', 8);
  makeText(desktop, label, 72, 137 + index * 58, 90, 13, 'black', active ? '#116a62' : '#65736d');
});

miniMap(desktop, 240, 106, 820, 560);
makeRect(desktop, 'desktop side panel', 1084, 106, 420, 560, '#ffffff', 8);
card(desktop, 'Next step', '13:30 清水寺，從目前位置步行 14 分鐘。', 1104, 130, 380, 84);
card(desktop, 'Today timeline', '錦市場 -> 清水寺 -> 祇園晚餐，含交通緩衝。', 1104, 228, 380, 94);
card(desktop, 'Budget', 'NT$28,000 used / 62% of trip budget.', 1104, 336, 380, 78);
card(desktop, 'AI companion', '可直接把推薦加入想去或排進 Day 3。', 1104, 428, 380, 86);
pill(desktop, '3 online', 1104, 536, '#e8f5ef', '#116a62');
pill(desktop, 'Saved', 1205, 536, '#e9f0fb', '#3674c9');
pill(desktop, 'GPS', 1282, 536, '#fff3d8', '#8a5a16');

const overlay = makeFrame('Full App Coverage v3 / Overlay states', 1640, 1810, 980, 720, [solid('#ffffff')]);
overlay.effects = shadow(0.12, 16, 36);
frameNames.push(overlay.name);
makeText(overlay, 'Overlay states', 28, 28, 420, 28, 'black', '#13201b');
const overlayCards = [
  ['Settings', 'Theme, interface size, rate, cover image, GPS.'],
  ['Event editor', 'Title, time, location, notes and save state.'],
  ['Handbook PDF', 'Generate, saved handbook, export PDF.'],
  ['AI day plan', 'Prompt, recommendations, apply to ideas or itinerary.'],
  ['Install prompt', 'PWA prompt and notification card.'],
  ['Sync conflict', 'Remote/local resolution and read-only state.']
];
overlayCards.forEach((item, index) => {
  const col = index % 2;
  const row = Math.floor(index / 2);
  card(overlay, item[0], item[1], 28 + col * 462, 88 + row * 178, 430, 130);
});

figma.viewport.scrollAndZoomIntoView([board]);

return {
  success: true,
  createdNodeIds,
  rootNodeId: board.id,
  frameNames,
  message: 'Created market-inspired full app mockup coverage frames.'
};
