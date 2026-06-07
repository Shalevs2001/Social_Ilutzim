/**
 * Renders the weekly schedule into a SQUARE canvas (e.g. 1080×1080) suitable for
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

const C = {
  bg:          '#ffffff',
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

export function exportScheduleSquareCanvas(data, size = 1080) {
  const rows = buildScheduleView(data);

  const canvas = document.createElement('canvas');
  canvas.width  = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = C.bg;
  ctx.fillRect(0, 0, size, size);

  const PAD     = Math.round(size * 0.02);
  const title   = (data?.scheduleDate || '').trim();
  const titleH  = Math.round(size * (title ? 0.085 : 0.05));

  // ── Title bar ────────────────────────────────────────────────────────────
  ctx.fillStyle = C.headerBg;
  roundedRect(ctx, PAD, PAD, size - PAD * 2, titleH - Math.round(size * 0.01), Math.round(size * 0.012));
  ctx.fill();

  ctx.fillStyle = C.headerText;
  ctx.textAlign = 'center';
  ctx.direction = 'rtl';
  const barMidY = PAD + (titleH - Math.round(size * 0.01)) / 2;
  if (title) {
    ctx.font = F(`bold ${Math.round(size * 0.026)}px Arial`);
    ctx.fillText('סידור משמרות', size / 2, barMidY - Math.round(size * 0.012));
    ctx.font = F(`${Math.round(size * 0.02)}px Arial`);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(title, size / 2, barMidY + Math.round(size * 0.018));
  } else {
    ctx.font = F(`bold ${Math.round(size * 0.026)}px Arial`);
    ctx.fillText('סידור משמרות', size / 2, barMidY + Math.round(size * 0.009));
  }

  // ── Grid geometry ────────────────────────────────────────────────────────
  const gridX = PAD;
  const gridY = PAD + titleH;
  const gridW = size - PAD * 2;
  const gridH = size - PAD - gridY;

  const nDays      = DAY_KEYS.length;            // 7
  const dayColW    = gridW / (nDays + 1.35);     // shift column is a bit wider
  const shiftColW  = gridW - dayColW * nDays;

  const nRows      = Math.max(rows.length, 1);
  const unit       = gridH / (nRows + 0.85);     // header row ≈ 0.85 of a data row
  const headerH    = unit * 0.85;
  const rowH       = unit;

  // RTL helper: x of a column. col -1 = shift column (rightmost).
  const shiftColX = gridX + gridW - shiftColW;
  const dayColX   = (i) => gridX + gridW - shiftColW - (i + 1) * dayColW; // i: 0=ראשון

  // ── Header row ───────────────────────────────────────────────────────────
  // top-right corner cell (above the shift labels) — left blank like the mockup
  ctx.fillStyle   = C.headerBg;
  ctx.fillRect(shiftColX, gridY, shiftColW, headerH);
  for (let i = 0; i < nDays; i++) {
    ctx.fillStyle = C.headerBg;
    ctx.fillRect(dayColX(i), gridY, dayColW, headerH);
    ctx.fillStyle = C.headerText;
    ctx.font      = F(`bold ${Math.round(size * 0.0205)}px Arial`);
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    ctx.textBaseline = 'middle';
    ctx.fillText(DAYS[i], dayColX(i) + dayColW / 2, gridY + headerH / 2);
  }
  ctx.textBaseline = 'alphabetic';

  // ── Data rows ────────────────────────────────────────────────────────────
  const nameFont = Math.round(Math.min(rowH * 0.26, size * 0.022));
  const tagFont  = Math.round(Math.min(rowH * 0.2,  size * 0.017));
  const lineGap  = Math.round(nameFont * 1.18);

  rows.forEach((row, r) => {
    const y = gridY + headerH + r * rowH;

    // shift column cell (right)
    ctx.fillStyle = C.headerBg;
    ctx.fillRect(shiftColX, y, shiftColW, rowH);
    ctx.fillStyle = C.headerText;
    ctx.textAlign = 'center';
    ctx.direction = 'rtl';
    const cx = shiftColX + shiftColW / 2;
    if (row.hours) {
      ctx.font = F(`bold ${Math.round(size * 0.021)}px Arial`);
      ctx.fillText(row.label, cx, y + rowH / 2 - Math.round(size * 0.012));
      ctx.font = F(`${Math.round(size * 0.0155)}px "Courier New", monospace`);
      ctx.fillStyle = C.shiftHours;
      ctx.direction = 'ltr';
      // hours can be a long range — keep on one line, it fits the wider column
      ctx.fillText(row.hours, cx, y + rowH / 2 + Math.round(size * 0.018));
    } else {
      ctx.font = F(`bold ${Math.round(size * 0.021)}px Arial`);
      ctx.fillText(row.label, cx, y + rowH / 2 + Math.round(size * 0.007));
    }

    // day cells
    row.days.forEach((entries, i) => {
      const x = dayColX(i);
      ctx.fillStyle = r % 2 === 0 ? C.rowOdd : C.rowEven;
      ctx.fillRect(x, y, dayColW, rowH);

      if (entries.length === 0) {
        ctx.fillStyle = C.muted;
        ctx.font      = F(`${Math.round(size * 0.018)}px Arial`);
        ctx.textAlign = 'center';
        ctx.direction = 'rtl';
        ctx.textBaseline = 'middle';
        ctx.fillText('—', x + dayColW / 2, y + rowH / 2);
        ctx.textBaseline = 'alphabetic';
        return;
      }

      // flatten entries into drawable lines, then vertically center the block
      const lines = []; // { text, kind: 'name'|'tag'|'dev'|'label' }
      entries.forEach((e) => {
        if (e.customLabel) lines.push({ text: e.customLabel, kind: 'label' });
        e.names.forEach((n) => lines.push({ text: n, kind: 'name' }));
        e.tags.forEach((t) => lines.push({ text: t, kind: 'tag' }));
        if (e.deviation) lines.push({ text: e.deviation, kind: 'dev' });
      });

      const blockH = lines.length * lineGap;
      let ly = y + Math.max(rowH * 0.12, (rowH - blockH) / 2) + nameFont * 0.85;
      const ccx = x + dayColW / 2;

      lines.forEach((ln) => {
        if (ln.kind === 'name') {
          ctx.fillStyle = C.name;
          ctx.font      = F(`bold ${nameFont}px Arial`);
          ctx.textAlign = 'center';
          ctx.direction = 'rtl';
          ctx.fillText(ln.text, ccx, ly);
        } else if (ln.kind === 'label') {
          ctx.fillStyle = C.muted;
          ctx.font      = F(`${tagFont}px Arial`);
          ctx.textAlign = 'center';
          ctx.direction = 'rtl';
          ctx.fillText(ln.text, ccx, ly);
        } else {
          // tag (navy chip) or deviation (orange chip)
          const isDev = ln.kind === 'dev';
          ctx.font = F(`bold ${tagFont}px Arial`);
          ctx.direction = isDev ? 'ltr' : 'rtl';
          const tw  = ctx.measureText(ln.text).width;
          const pad = Math.round(tagFont * 0.5);
          const chipW = Math.min(tw + pad * 2, dayColW - 6);
          const chipH = Math.round(tagFont * 1.5);
          const chipX = ccx - chipW / 2;
          const chipY = ly - tagFont;
          ctx.fillStyle = isDev ? C.deviationBg : C.tagBg;
          roundedRect(ctx, chipX, chipY, chipW, chipH, Math.round(tagFont * 0.4));
          ctx.fill();
          ctx.fillStyle = isDev ? C.deviation : C.tagText;
          ctx.textAlign = 'center';
          ctx.fillText(ln.text, ccx, chipY + chipH - tagFont * 0.42);
        }
        ly += lineGap;
      });
    });
  });

  // ── Grid lines ───────────────────────────────────────────────────────────
  ctx.strokeStyle = C.border;
  ctx.lineWidth   = Math.max(1, Math.round(size * 0.0012));

  // vertical column separators
  const xs = [gridX, gridX + gridW, shiftColX];
  for (let i = 0; i < nDays; i++) xs.push(dayColX(i));
  [...new Set(xs)].forEach((x) => {
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + headerH + rows.length * rowH);
    ctx.stroke();
  });

  // horizontal row separators
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
export function downloadScheduleSquare(data, size = 1080) {
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
