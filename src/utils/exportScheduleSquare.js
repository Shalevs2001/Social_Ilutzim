/**
 * Renders the weekly schedule into a SQUARE canvas (e.g. 2160×2160) suitable for
 * a WhatsApp group profile picture. Pure Canvas 2D — chosen over DOM-capture
 * libraries because of their RTL text issues (see CLAUDE.md).
 *
 * Layout mirrors the on-screen view: a right-hand column of shift names + their
 * standard hours, then 7 day columns (RTL: ראשון on the right, שבת on the left).
 * Day cells show only employee names; a deviation from the standard hours and the
 * דגימות / כוננות flags appear as prominent in-cell tags.
 */

import { DAYS, DAY_KEYS } from '../constants';
import { buildScheduleView } from './scheduleViewModel';

// Global multiplier for every text size. Bumped so the schedule stays readable
// when shrunk to a small profile picture.
const FONT_SCALE = 2;

const C = {
  headerBg:    '#1a2e4a',
  headerText:  '#ffffff',
  rowOdd:      '#ffffff',
  rowEven:     '#f3f6fa',
  border:      '#d7deea',
  name:        '#1a2e4a',
  muted:       '#aab4c4',
  shiftHours:  '#aebacc',
  deviation:   '#c2410c',
  deviationBg: '#fff4ec',
  tagBg:       '#1a2e4a',
  tagText:     '#ffffff',
};

const F = (s) => `${s}, Arial, "Arial Hebrew", sans-serif`;

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

/** Largest font (≤ base) for which `text` fits within `maxW`. */
function fitFont(ctx, text, base, maxW, weight = 'bold', family = 'Arial') {
  let fs = base;
  const min = Math.max(8, base * 0.5);
  ctx.font = F(`${weight} ${fs}px ${family}`);
  while (fs > min && ctx.measureText(text).width > maxW) {
    fs -= Math.max(1, Math.round(base * 0.05));
    ctx.font = F(`${weight} ${fs}px ${family}`);
  }
  return fs;
}

export function exportScheduleSquareCanvas(data, size = 2160) {
  const rows = buildScheduleView(data);

  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Orange → red gradient base (brand look)
  const bg = ctx.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0,    '#ff8a2b');
  bg.addColorStop(0.55, '#f04e12');
  bg.addColorStop(1,    '#cf1400');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // ── Font sizes (all scaled by FONT_SCALE) ──────────────────────────────────
  const px        = (m) => Math.round(size * m * FONT_SCALE);
  const titleFont = px(0.026);
  const dateFont  = px(0.02);
  const dayFont   = px(0.0205);
  const labelFont = px(0.021);
  const hoursFont = px(0.0155);
  const emptyFont = px(0.018);

  const PAD    = Math.round(size * 0.02);
  const title  = (data?.scheduleDate || '').trim();
  const gap    = Math.round(size * 0.012);
  const titleH = title
    ? Math.round(titleFont * 1.0 + dateFont * 1.2 + gap * 2)
    : Math.round(titleFont * 1.7 + gap);

  // ── Title bar ──────────────────────────────────────────────────────────────
  const barH = titleH - gap;
  ctx.fillStyle = C.headerBg;
  roundedRect(ctx, PAD, PAD, size - PAD * 2, barH, Math.round(size * 0.012));
  ctx.fill();

  ctx.fillStyle = C.headerText;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  ctx.textBaseline = 'middle';
  const barCY = PAD + barH / 2;
  if (title) {
    ctx.font = F(`bold ${titleFont}px Arial`);
    ctx.fillText('סידור משמרות', size / 2, barCY - dateFont * 0.6);
    ctx.font = F(`${dateFont}px Arial`);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(title, size / 2, barCY + titleFont * 0.6);
  } else {
    ctx.font = F(`bold ${titleFont}px Arial`);
    ctx.fillText('סידור משמרות', size / 2, barCY);
  }
  ctx.textBaseline = 'alphabetic';

  // ── Grid geometry ──────────────────────────────────────────────────────────
  const gridX = PAD;
  const gridY = PAD + titleH;
  const gridW = size - PAD * 2;
  const gridH = size - PAD - gridY;

  const nDays     = DAY_KEYS.length;            // 7
  const dayColW   = gridW / (nDays + 1.35);     // shift column is a bit wider
  const shiftColW = gridW - dayColW * nDays;

  const nRows   = Math.max(rows.length, 1);
  const unit    = gridH / (nRows + 0.85);       // header row ≈ 0.85 of a data row
  const headerH = unit * 0.85;
  const rowH    = unit;

  const shiftColX = gridX + gridW - shiftColW;
  const dayColX   = (i) => gridX + gridW - shiftColW - (i + 1) * dayColW; // i: 0=ראשון

  // ── Header row ───────────────────────────────────────────────────────────
  ctx.fillStyle = C.headerBg;
  ctx.fillRect(shiftColX, gridY, shiftColW, headerH);
  ctx.textBaseline = 'middle';
  for (let i = 0; i < nDays; i++) {
    ctx.fillStyle = C.headerBg;
    ctx.fillRect(dayColX(i), gridY, dayColW, headerH);
    ctx.fillStyle = C.headerText;
    ctx.font      = F(`bold ${dayFont}px Arial`);
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.fillText(DAYS[i], dayColX(i) + dayColW / 2, gridY + headerH / 2);
  }
  ctx.textBaseline = 'alphabetic';

  // ── Data rows ────────────────────────────────────────────────────────────
  const nameFont = Math.round(Math.min(rowH * 0.5, size * 0.022 * FONT_SCALE));
  const tagFont  = Math.round(Math.min(rowH * 0.4, size * 0.017 * FONT_SCALE));

  rows.forEach((row, r) => {
    const y = gridY + headerH + r * rowH;

    // shift column cell (right)
    ctx.fillStyle = C.headerBg;
    ctx.fillRect(shiftColX, y, shiftColW, rowH);
    ctx.fillStyle = C.headerText;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';
    const cx = shiftColX + shiftColW / 2;
    const shiftInnerW = shiftColW - Math.round(size * 0.025);
    if (row.hours) {
      const lf = fitFont(ctx, row.label, labelFont, shiftInnerW, 'bold', 'Arial');
      ctx.font = F(`bold ${lf}px Arial`);
      ctx.fillText(row.label, cx, y + rowH / 2 - hoursFont * 0.85);
      const hf = fitFont(ctx, row.hours, hoursFont, shiftInnerW, 'normal', '"Courier New", monospace');
      ctx.font = F(`${hf}px "Courier New", monospace`);
      ctx.fillStyle = C.shiftHours;
      ctx.direction = 'ltr';
      ctx.fillText(row.hours, cx, y + rowH / 2 + labelFont * 0.8);
    } else {
      const lf = fitFont(ctx, row.label, labelFont, shiftInnerW, 'bold', 'Arial');
      ctx.font = F(`bold ${lf}px Arial`);
      ctx.fillText(row.label, cx, y + rowH / 2);
    }
    ctx.textBaseline = 'alphabetic';

    // day cells
    row.days.forEach((entries, i) => {
      const x = dayColX(i);
      ctx.fillStyle = r % 2 === 0 ? C.rowOdd : C.rowEven;
      ctx.fillRect(x, y, dayColW, rowH);

      if (entries.length === 0) {
        ctx.fillStyle = C.muted;
        ctx.font      = F(`${emptyFont}px Arial`);
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.textBaseline = 'middle';
        ctx.fillText('—', x + dayColW / 2, y + rowH / 2);
        ctx.textBaseline = 'alphabetic';
        return;
      }

      // flatten entries into drawable lines
      const lines = []; // { text, kind: 'name'|'tag'|'dev'|'label' }
      entries.forEach((e) => {
        if (e.customLabel) lines.push({ text: e.customLabel, kind: 'label' });
        e.names.forEach((n) => lines.push({ text: n, kind: 'name' }));
        e.tags.forEach((t) => lines.push({ text: t, kind: 'tag' }));
        if (e.deviation) lines.push({ text: e.deviation, kind: 'dev' });
      });

      const innerW   = dayColW - Math.round(size * 0.01);
      const nameH    = Math.round(nameFont * 1.18);
      const labelH   = Math.round(tagFont * 1.15);
      const chipH    = Math.round(tagFont * 1.55);
      const chipGapY = Math.round(tagFont * 0.35);

      // measured per-line heights for vertical centering
      const measured = lines.map((ln) => {
        if (ln.kind === 'name') return nameH;
        if (ln.kind === 'label') return labelH;
        return chipH + chipGapY;
      });
      const blockH = measured.reduce((s, h) => s + h, 0);

      let ly = y + Math.max(rowH * 0.06, (rowH - blockH) / 2);
      const ccx = x + dayColW / 2;
      ctx.textBaseline = 'top';

      lines.forEach((ln, li) => {
        if (ln.kind === 'name') {
          const fsz = fitFont(ctx, ln.text, nameFont, innerW, 'bold', 'Arial');
          ctx.fillStyle = C.name;
          ctx.font      = F(`bold ${fsz}px Arial`);
          ctx.textAlign = 'center';
          ctx.direction = 'rtl';
          ctx.fillText(ln.text, ccx, ly + (nameH - fsz) / 2);
        } else if (ln.kind === 'label') {
          const fsz = fitFont(ctx, ln.text, tagFont, innerW, 'normal', 'Arial');
          ctx.fillStyle = C.muted;
          ctx.font      = F(`${fsz}px Arial`);
          ctx.textAlign = 'center';
          ctx.direction = 'rtl';
          ctx.fillText(ln.text, ccx, ly);
        } else {
          // tag (navy chip) or deviation (orange chip)
          const isDev = ln.kind === 'dev';
          const tf    = fitFont(ctx, ln.text, tagFont, innerW - Math.round(tagFont * 0.8), 'bold', 'Arial');
          ctx.font = F(`bold ${tf}px Arial`);
          ctx.direction = isDev ? 'ltr' : 'rtl';
          const tw    = ctx.measureText(ln.text).width;
          const padX  = Math.round(tf * 0.5);
          const chipW = Math.min(tw + padX * 2, innerW);
          const chipX = ccx - chipW / 2;
          ctx.fillStyle = isDev ? C.deviationBg : C.tagBg;
          roundedRect(ctx, chipX, ly, chipW, chipH, Math.round(tagFont * 0.4));
          ctx.fill();
          ctx.fillStyle = isDev ? C.deviation : C.tagText;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(ln.text, ccx, ly + chipH / 2);
          ctx.textBaseline = 'top';
        }
        ly += measured[li];
      });
      ctx.textBaseline = 'alphabetic';
    });
  });

  // ── Grid lines ───────────────────────────────────────────────────────────
  ctx.strokeStyle = C.border;
  ctx.lineWidth   = Math.max(1, Math.round(size * 0.0012));

  const xs = [gridX, gridX + gridW, shiftColX];
  for (let i = 0; i < nDays; i++) xs.push(dayColX(i));
  [...new Set(xs)].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + headerH + rows.length * rowH);
    ctx.stroke();
  });

  const ys = [gridY, gridY + headerH];
  for (let r = 1; r <= rows.length; r++) ys.push(gridY + headerH + r * rowH);
  [...new Set(ys)].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridW, y);
    ctx.stroke();
  });

  return canvas;
}

/** Generate the square PNG and trigger a download. */
export function downloadScheduleSquare(data, size = 2160) {
  const canvas = exportScheduleSquareCanvas(data, size);
  const safeDate = (data?.scheduleDate || 'schedule').replace(/[^\w֐-׿-]+/g, '_');
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `סידור_${safeDate}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, 'image/png');
}
