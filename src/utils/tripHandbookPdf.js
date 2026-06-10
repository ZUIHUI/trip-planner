import { normalizeCoverImageUrl } from './coverImage';
import { cleanHandbookText, formatHandbookMoney } from './tripHandbook';

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1754;
const PDF_WIDTH = 595.28;
const PDF_HEIGHT = 841.89;
const MARGIN = 86;
const CARD_RADIUS = 22;
const FONT_FAMILY = '"Microsoft JhengHei", "PingFang TC", "Noto Sans TC", Arial, sans-serif';
const COLORS = {
  ink: '#0f172a',
  muted: '#64748b',
  soft: '#f8fafc',
  line: '#cbd5e1',
  sky: '#0284c7',
  skySoft: '#e0f2fe',
  teal: '#0f766e',
  rose: '#be185d',
  amber: '#b45309',
  white: '#ffffff'
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const makeCanvas = () => {
  const canvas = document.createElement('canvas');
  canvas.width = PAGE_WIDTH;
  canvas.height = PAGE_HEIGHT;
  return canvas;
};

const setFont = (ctx, size, weight = 700) => {
  ctx.font = `${weight} ${size}px ${FONT_FAMILY}`;
};

const roundRect = (ctx, x, y, width, height, radius = CARD_RADIUS) => {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

const fillRoundedRect = (ctx, x, y, width, height, fillStyle, radius = CARD_RADIUS) => {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  ctx.restore();
};

const strokeRoundedRect = (ctx, x, y, width, height, strokeStyle = COLORS.line, radius = CARD_RADIUS) => {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
};

const preparePage = (ctx) => {
  ctx.fillStyle = COLORS.white;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.fillStyle = COLORS.soft;
  ctx.fillRect(0, 0, PAGE_WIDTH, PAGE_HEIGHT);
  ctx.fillStyle = COLORS.white;
  fillRoundedRect(ctx, 38, 38, PAGE_WIDTH - 76, PAGE_HEIGHT - 76, COLORS.white, 30);
};

const measureLines = (ctx, text, maxWidth, maxLines = 99) => {
  const normalized = cleanHandbookText(text, 2000);
  if (!normalized) return [];

  const lines = [];
  let line = '';

  normalized.split('\n').forEach((paragraph) => {
    Array.from(paragraph).forEach((char) => {
      const next = `${line}${char}`;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = char;
      } else {
        line = next;
      }

      if (lines.length >= maxLines) {
        line = '';
      }
    });

    if (line && lines.length < maxLines) {
      lines.push(line);
      line = '';
    }
  });

  if (lines.length > maxLines) {
    return lines.slice(0, maxLines);
  }

  if (lines.length === maxLines && normalized.length > lines.join('').length) {
    const last = lines[maxLines - 1] || '';
    lines[maxLines - 1] = `${last.slice(0, Math.max(0, last.length - 1))}...`;
  }

  return lines;
};

const drawText = (ctx, text, x, y, maxWidth, {
  size = 34,
  weight = 700,
  color = COLORS.ink,
  lineHeight = Math.round(size * 1.45),
  maxLines = 99
} = {}) => {
  setFont(ctx, size, weight);
  ctx.fillStyle = color;
  ctx.textBaseline = 'top';
  const lines = measureLines(ctx, text, maxWidth, maxLines);
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + (index * lineHeight));
  });
  return y + (lines.length * lineHeight);
};

const drawPill = (ctx, text, x, y, color = COLORS.sky) => {
  const safeText = cleanHandbookText(text, 80);
  if (!safeText) return 0;

  setFont(ctx, 24, 900);
  const width = Math.min(ctx.measureText(safeText).width + 42, PAGE_WIDTH - (MARGIN * 2));
  fillRoundedRect(ctx, x, y, width, 48, COLORS.skySoft, 24);
  ctx.fillStyle = color;
  ctx.textBaseline = 'middle';
  ctx.fillText(safeText, x + 21, y + 24);
  return width;
};

const drawSectionTitle = (ctx, title, x, y, color = COLORS.sky) => {
  fillRoundedRect(ctx, x, y + 4, 44, 44, COLORS.skySoft, 12);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x + 22, y + 26, 9, 0, Math.PI * 2);
  ctx.fill();
  return drawText(ctx, title, x + 62, y, PAGE_WIDTH - x - MARGIN - 62, {
    size: 38,
    weight: 900,
    lineHeight: 48,
    maxLines: 2
  }) + 10;
};

const drawCard = (ctx, x, y, width, height, title, bodyLines = [], color = COLORS.sky) => {
  fillRoundedRect(ctx, x, y, width, height, COLORS.white, 20);
  strokeRoundedRect(ctx, x, y, width, height, '#dbeafe', 20);
  drawText(ctx, title, x + 28, y + 24, width - 56, {
    size: 28,
    weight: 900,
    color,
    lineHeight: 38,
    maxLines: 2
  });
  let nextY = y + 76;
  bodyLines.filter(Boolean).slice(0, 7).forEach((line) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + 34, nextY + 15, 5, 0, Math.PI * 2);
    ctx.fill();
    nextY = drawText(ctx, line, x + 52, nextY, width - 80, {
      size: 23,
      weight: 650,
      color: COLORS.ink,
      lineHeight: 34,
      maxLines: 2
    }) + 6;
  });
};

const loadImage = (url) => new Promise((resolve) => {
  const normalized = normalizeCoverImageUrl(url);
  if (!normalized) {
    resolve(null);
    return;
  }

  const image = new Image();
  if (!normalized.startsWith('data:')) {
    image.crossOrigin = 'anonymous';
  }
  image.onload = () => resolve(image);
  image.onerror = () => resolve(null);
  image.src = normalized;
});

const drawImageCover = (ctx, image, x, y, width, height) => {
  const imageRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = imageRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = imageRatio > targetRatio ? image.height : image.width / targetRatio;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;

  ctx.save();
  roundRect(ctx, x, y, width, height, 28);
  ctx.clip();
  ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  ctx.restore();
};

const drawFallbackVisual = (ctx, x, y, width, height) => {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, '#bae6fd');
  gradient.addColorStop(0.52, '#ccfbf1');
  gradient.addColorStop(1, '#fce7f3');
  fillRoundedRect(ctx, x, y, width, height, gradient, 28);

  ctx.save();
  ctx.strokeStyle = 'rgba(15, 118, 110, 0.54)';
  ctx.lineWidth = 12;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + 110, y + height - 130);
  ctx.bezierCurveTo(x + 240, y + 130, x + width - 260, y + height - 60, x + width - 110, y + 120);
  ctx.stroke();

  [0.18, 0.48, 0.78].forEach((ratio, index) => {
    const px = x + (width * ratio);
    const py = y + (index % 2 ? height * 0.62 : height * 0.34);
    ctx.fillStyle = [COLORS.sky, COLORS.teal, COLORS.rose][index];
    ctx.beginPath();
    ctx.arc(px, py, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.white;
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
};

const renderCoverPage = ({ handbook, coverImage }) => {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  preparePage(ctx);

  const visualX = MARGIN;
  const visualY = 94;
  const visualW = PAGE_WIDTH - (MARGIN * 2);
  const visualH = 690;

  if (coverImage) {
    drawImageCover(ctx, coverImage, visualX, visualY, visualW, visualH);
  } else {
    drawFallbackVisual(ctx, visualX, visualY, visualW, visualH);
  }

  let y = visualY + visualH + 62;
  drawPill(ctx, handbook.cover.dateText || 'Travel Handbook', MARGIN, y, COLORS.teal);
  y += 82;
  y = drawText(ctx, handbook.cover.title, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), {
    size: 72,
    weight: 900,
    lineHeight: 86,
    maxLines: 3
  }) + 18;
  if (handbook.cover.subtitle) {
    y = drawText(ctx, handbook.cover.subtitle, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), {
      size: 36,
      weight: 800,
      color: COLORS.sky,
      lineHeight: 48,
      maxLines: 2
    }) + 24;
  }
  drawText(ctx, handbook.cover.intro, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), {
    size: 28,
    weight: 650,
    color: COLORS.muted,
    lineHeight: 44,
    maxLines: 5
  });

  return canvas;
};

const renderOverviewPage = (handbook) => {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  preparePage(ctx);

  let y = 110;
  y = drawSectionTitle(ctx, '旅程摘要', MARGIN, y);
  fillRoundedRect(ctx, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 260, '#f0f9ff', 22);
  y = drawText(ctx, handbook.overview.summary || '目前旅程資料已整理成每日行程、交通住宿、清單與費用摘要。', MARGIN + 34, y + 34, PAGE_WIDTH - (MARGIN * 2) - 68, {
    size: 32,
    weight: 750,
    lineHeight: 50,
    maxLines: 4
  }) + 46;

  const cardW = (PAGE_WIDTH - (MARGIN * 2) - 26) / 2;
  drawCard(ctx, MARGIN, y, cardW, 520, '亮點', handbook.overview.highlights, COLORS.sky);
  drawCard(ctx, MARGIN + cardW + 26, y, cardW, 520, '出發前確認', handbook.manualChecks, COLORS.amber);
  y += 590;

  drawCard(ctx, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 330, '手冊說明', [
    '這份 PDF 由目前旅程資料產生，已留存在旅程中。',
    'AI 只整理既有內容，不查詢即時營業時間、票價、天氣或交通時間。',
    '出發前請再確認訂位、票券、交通與店家公告。'
  ], COLORS.teal);

  return canvas;
};

const renderDayPage = (day) => {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  preparePage(ctx);

  let y = 110;
  drawPill(ctx, `Day ${day.day}${day.date ? ` · ${day.date}` : ''}`, MARGIN, y, COLORS.sky);
  y += 78;
  y = drawText(ctx, day.title, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), {
    size: 54,
    weight: 900,
    lineHeight: 66,
    maxLines: 2
  }) + 24;

  if (day.intro) {
    fillRoundedRect(ctx, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 150, '#f0fdfa', 20);
    drawText(ctx, day.intro, MARGIN + 30, y + 28, PAGE_WIDTH - (MARGIN * 2) - 60, {
      size: 26,
      weight: 700,
      color: COLORS.teal,
      lineHeight: 38,
      maxLines: 3
    });
    y += 190;
  }

  y = drawSectionTitle(ctx, '今日行程', MARGIN, y, COLORS.teal);
  const schedule = asArray(day.schedule);
  if (!schedule.length) {
    drawCard(ctx, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 220, '尚未安排明確行程', ['可以回到旅程中補上時間、地點與備註。'], COLORS.muted);
    y += 260;
  } else {
    schedule.slice(0, 12).forEach((event, index) => {
      const rowH = 98;
      fillRoundedRect(ctx, MARGIN + 112, y + 8, PAGE_WIDTH - (MARGIN * 2) - 112, rowH, COLORS.white, 18);
      strokeRoundedRect(ctx, MARGIN + 112, y + 8, PAGE_WIDTH - (MARGIN * 2) - 112, rowH, '#e2e8f0', 18);

      ctx.strokeStyle = index === schedule.length - 1 ? 'transparent' : '#bae6fd';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(MARGIN + 52, y + 58);
      ctx.lineTo(MARGIN + 52, y + 128);
      ctx.stroke();

      fillRoundedRect(ctx, MARGIN, y + 22, 104, 52, index % 2 ? '#ccfbf1' : '#e0f2fe', 26);
      drawText(ctx, event.time || '未定', MARGIN + 14, y + 34, 78, {
        size: 20,
        weight: 900,
        color: COLORS.ink,
        lineHeight: 24,
        maxLines: 1
      });

      drawText(ctx, event.title || '未命名行程', MARGIN + 142, y + 20, PAGE_WIDTH - (MARGIN * 2) - 170, {
        size: 27,
        weight: 900,
        lineHeight: 34,
        maxLines: 1
      });
      const detail = [event.location, event.note].filter(Boolean).join(' · ');
      drawText(ctx, detail, MARGIN + 142, y + 58, PAGE_WIDTH - (MARGIN * 2) - 170, {
        size: 21,
        weight: 650,
        color: COLORS.muted,
        lineHeight: 30,
        maxLines: 2
      });
      y += 120;
    });
  }

  if (day.notes?.length) {
    drawCard(ctx, MARGIN, Math.min(y + 30, PAGE_HEIGHT - 360), PAGE_WIDTH - (MARGIN * 2), 260, '本日提醒', day.notes, COLORS.amber);
  }

  return canvas;
};

const renderLogisticsPage = (handbook) => {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  preparePage(ctx);

  let y = 110;
  y = drawSectionTitle(ctx, '交通與住宿', MARGIN, y);
  const accommodation = handbook.logistics.accommodation || {};
  const cardW = (PAGE_WIDTH - (MARGIN * 2) - 26) / 2;
  drawCard(ctx, MARGIN, y, cardW, 430, '住宿', [
    accommodation.name || '尚未填住宿',
    accommodation.address,
    accommodation.note
  ], COLORS.teal);
  drawCard(ctx, MARGIN + cardW + 26, y, cardW, 430, '航班', asArray(handbook.logistics.flights).flatMap((flight) => [
    [flight.label, flight.code].filter(Boolean).join(' '),
    [flight.date, flight.route, flight.time].filter(Boolean).join(' · '),
    flight.note
  ]), COLORS.sky);
  y += 500;
  drawCard(ctx, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 340, '交通提醒', handbook.logistics.notes, COLORS.amber);

  return canvas;
};

const renderListsPage = (handbook) => {
  const canvas = makeCanvas();
  const ctx = canvas.getContext('2d');
  preparePage(ctx);

  let y = 110;
  y = drawSectionTitle(ctx, '清單與花費', MARGIN, y);
  const cardW = (PAGE_WIDTH - (MARGIN * 2) - 40) / 3;
  drawCard(ctx, MARGIN, y, cardW, 520, '行前', handbook.lists.preTrip, COLORS.sky);
  drawCard(ctx, MARGIN + cardW + 20, y, cardW, 520, '行李', handbook.lists.packing, COLORS.teal);
  drawCard(ctx, MARGIN + ((cardW + 20) * 2), y, cardW, 520, '購物', handbook.lists.shopping, COLORS.rose);
  y += 590;
  drawCard(ctx, MARGIN, y, PAGE_WIDTH - (MARGIN * 2), 360, '費用摘要', [
    handbook.expenses.summary || '目前尚未建立費用摘要。',
    ...asArray(handbook.expenses.totals).map(formatHandbookMoney)
  ], COLORS.amber);

  return canvas;
};

const dataUrlToBytes = (dataUrl) => {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const encodeAscii = (text) => new TextEncoder().encode(text);

const concatBytes = (chunks) => {
  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.length;
  });
  return output;
};

const buildPdfFromJpegs = (images) => {
  const chunks = [];
  const offsets = [0];
  let length = 0;
  const append = (chunk) => {
    chunks.push(chunk);
    length += chunk.length;
  };
  const appendText = (text) => append(encodeAscii(text));
  const objectCount = 2 + (images.length * 3);
  const kids = images.map((_, index) => `${3 + (index * 3)} 0 R`).join(' ');

  appendText('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  const addObject = (number, bodyChunks) => {
    offsets[number] = length;
    appendText(`${number} 0 obj\n`);
    bodyChunks.forEach(append);
    appendText('\nendobj\n');
  };

  addObject(1, [encodeAscii('<< /Type /Catalog /Pages 2 0 R >>')]);
  addObject(2, [encodeAscii(`<< /Type /Pages /Kids [${kids}] /Count ${images.length} >>`)]);

  images.forEach((image, index) => {
    const pageObj = 3 + (index * 3);
    const imageObj = pageObj + 1;
    const contentObj = pageObj + 2;
    const imageBytes = dataUrlToBytes(image.dataUrl);
    const content = `q ${PDF_WIDTH} 0 0 ${PDF_HEIGHT} 0 0 cm /Im1 Do Q`;
    const contentBytes = encodeAscii(content);

    addObject(pageObj, [encodeAscii(`<< /Type /Page /Parent 2 0 R /Resources << /ProcSet [/PDF /ImageC] /XObject << /Im1 ${imageObj} 0 R >> >> /MediaBox [0 0 ${PDF_WIDTH} ${PDF_HEIGHT}] /Contents ${contentObj} 0 R >>`)]);
    addObject(imageObj, [
      encodeAscii(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`),
      imageBytes,
      encodeAscii('\nendstream')
    ]);
    addObject(contentObj, [
      encodeAscii(`<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      encodeAscii('\nendstream')
    ]);
  });

  const xrefOffset = length;
  appendText(`xref\n0 ${objectCount + 1}\n`);
  appendText('0000000000 65535 f \n');
  for (let number = 1; number <= objectCount; number += 1) {
    appendText(`${String(offsets[number]).padStart(10, '0')} 00000 n \n`);
  }
  appendText(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob([concatBytes(chunks)], { type: 'application/pdf' });
};

const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2500);
};

const sanitizeFilename = (value) => cleanHandbookText(value, 80)
  .replace(/[\\/:*?"<>|]+/g, '-')
  .replace(/\s+/g, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '') || 'travel-handbook';

const renderCanvases = (handbook, coverImage) => [
  renderCoverPage({ handbook, coverImage }),
  renderOverviewPage(handbook),
  ...asArray(handbook.days).map(renderDayPage),
  renderLogisticsPage(handbook),
  renderListsPage(handbook)
];

const canvasesToJpegs = (canvases) => canvases.map((canvas) => ({
  width: canvas.width,
  height: canvas.height,
  dataUrl: canvas.toDataURL('image/jpeg', 0.92)
}));

export const exportTripHandbookPdf = async ({
  handbook,
  coverImage = '',
  filename = ''
} = {}) => {
  if (!handbook) {
    throw new Error('缺少旅遊手冊內容。');
  }

  const cover = await loadImage(coverImage);
  let images = [];

  try {
    images = canvasesToJpegs(renderCanvases(handbook, cover));
  } catch (error) {
    images = canvasesToJpegs(renderCanvases(handbook, null));
  }

  const pdfBlob = buildPdfFromJpegs(images);
  const safeFilename = `${sanitizeFilename(filename || handbook.cover?.title)}.pdf`;
  downloadBlob(pdfBlob, safeFilename);

  return { pageCount: images.length, filename: safeFilename };
};
