/**
 * Draws the weekly schedule onto an off-screen Canvas and returns it.
 * Layout: single row of 7 columns, RTL.
 */

import { DAY_KEYS, SHIFT_TYPES } from '../constants';

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];

const SLOT_COLORS = {
  morning:         { bg: '#fffbeb', border: '#d97706' },
  short_morning:   { bg: '#fef9c3', border: '#ca8a04' },
  middle:          { bg: '#fffbeb', border: '#d97706' },
  evening:         { bg: '#fffbeb', border: '#d97706' },
  samples:         { bg: '#fff7ed', border: '#ea580c' },
  weekend_morning: { bg: '#fffbeb', border: '#d97706' },
  weekend_evening: { bg: '#fffbeb', border: '#d97706' },
  weekend_middle:  { bg: '#fffbeb', border: '#d97706' },
  custom:          { bg: '#faf5ff', border: '#9333ea' },
  reshem_bet:      { bg: '#f0f9ff', border: '#0284c7' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,       y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x,     y,     x + r,   y,         r);
  ctx.closePath();
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

/** Strip HTML tags produced by the rich-text notes editor. */
function stripHtml(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function clearShadow(ctx) {
  ctx.shadowColor   = 'transparent';
  ctx.shadowBlur    = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const SCALE    = 2;
const PAD      = 16;
const COL_W    = 90;
const GAP      = 7;

const HEADER_H  = 38;
const SLOT_P    = 6;
const SLOT_GAP  = 5;

const H_LABEL     = 14;
const H_TIME      = 15;
const H_CHIP      = 24;
const H_CHIP_GAP  = 3;
const H_BADGE     = 17;
const H_BADGE_GAP = 3;
const H_NOTE_LINE = 13;

// ── Height estimator ──────────────────────────────────────────────────────────

function estimateSlotHeight(slot) {
  let h = SLOT_P + H_LABEL + 3 + H_TIME + 4;
  if (slot.reshemBetMark) h += H_BADGE + H_BADGE_GAP;
  if (slot.konenutMark)   h += H_BADGE + H_BADGE_GAP;
  if (slot.employee)        h += H_CHIP + H_CHIP_GAP;
  if (slot.employee2)       h += H_CHIP + H_CHIP_GAP;
  if (slot.manualEmployee)  h += H_CHIP + H_CHIP_GAP;
  if (slot.note) {
    const approxLines = Math.max(1, Math.ceil(slot.note.length / 22));
    h += approxLines * (H_NOTE_LINE + 2) + 10;
  }
  return h + SLOT_P;
}

function colContentHeight(dayKey, schedule) {
  const all = [...(schedule[dayKey].adHocShifts ?? []), ...(schedule[dayKey].slots ?? [])];
  return HEADER_H + GAP + all.reduce((s, sl) => s + estimateSlotHeight(sl) + SLOT_GAP, 0);
}

// ── Main export function ──────────────────────────────────────────────────────

const TITLE_H  = 52;
const FOOTER_H = 80;

export function exportScheduleCanvas(schedule, employees, shiftTimes, scheduleDate = '', scheduleNotesRaw = '') {
  const scheduleNotes = stripHtml(scheduleNotesRaw);
  const totalW  = PAD * 2 + 7 * COL_W + 6 * GAP;
  const maxH    = Math.max(...DAY_KEYS.map((k) => colContentHeight(k, schedule)));
  const totalH  = PAD + TITLE_H + GAP + maxH + GAP + FOOTER_H + PAD;

  const canvas = document.createElement('canvas');
  canvas.width  = totalW * SCALE;
  canvas.height = totalH * SCALE;
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // ── Background ─────────────────────────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, totalH);
  bgGrad.addColorStop(0, '#edf2f8');
  bgGrad.addColorStop(1, '#e2eaf4');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, totalW, totalH);

  const F = (s) => `${s}, Arial, "Arial Hebrew", sans-serif`;
  const gridTop = PAD + TITLE_H + GAP;

  // ── Header ─────────────────────────────────────────────────────────────────
  ctx.shadowColor   = 'rgba(0,20,60,0.18)';
  ctx.shadowBlur    = 12;
  ctx.shadowOffsetY = 5;
  const hdrGrad = ctx.createLinearGradient(PAD, PAD, PAD, PAD + TITLE_H);
  hdrGrad.addColorStop(0, '#1e3a5f');
  hdrGrad.addColorStop(1, '#152d4a');
  ctx.fillStyle = hdrGrad;
  roundedRect(ctx, PAD, PAD, totalW - PAD * 2, TITLE_H, 10);
  ctx.fill();
  clearShadow(ctx);

  // Teal accent stripe at bottom of header
  ctx.save();
  roundedRect(ctx, PAD, PAD, totalW - PAD * 2, TITLE_H, 10);
  ctx.clip();
  const tealGrad = ctx.createLinearGradient(PAD, 0, PAD + totalW - PAD * 2, 0);
  tealGrad.addColorStop(0,   '#0ea5c9');
  tealGrad.addColorStop(0.5, '#38bcd4');
  tealGrad.addColorStop(1,   '#0ea5c9');
  ctx.fillStyle = tealGrad;
  ctx.fillRect(PAD, PAD + TITLE_H - 4, totalW - PAD * 2, 4);
  ctx.restore();

  // "סידור" on the right
  ctx.fillStyle  = '#ffffff';
  ctx.font       = F('bold 21px Arial');
  ctx.textAlign  = 'right';
  ctx.direction  = 'rtl';
  ctx.fillText('סידור', totalW - PAD - 14, PAD + TITLE_H / 2 + 7);

  // Date centred — slightly muted
  if (scheduleDate) {
    ctx.fillStyle  = 'rgba(255,255,255,0.82)';
    ctx.font       = F('16px Arial');
    ctx.textAlign  = 'center';
    ctx.fillText(scheduleDate, totalW / 2, PAD + TITLE_H / 2 + 6);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  const footerY = gridTop + maxH + GAP;

  ctx.shadowColor   = 'rgba(0,20,60,0.08)';
  ctx.shadowBlur    = 8;
  ctx.shadowOffsetY = -3;
  ctx.fillStyle   = '#ffffff';
  roundedRect(ctx, PAD, footerY, totalW - PAD * 2, FOOTER_H, 10);
  ctx.fill();
  clearShadow(ctx);

  ctx.strokeStyle = '#dde4ed';
  ctx.lineWidth   = 1;
  roundedRect(ctx, PAD, footerY, totalW - PAD * 2, FOOTER_H, 10);
  ctx.stroke();

  ctx.fillStyle  = '#9ca3af';
  ctx.font       = F('bold 11px Arial');
  ctx.textAlign  = 'right';
  ctx.direction  = 'rtl';
  ctx.fillText('הערות:', totalW - PAD - 12, footerY + 18);

  if (scheduleNotes) {
    ctx.fillStyle  = '#1f2937';
    ctx.font       = F('13px Arial');
    ctx.textAlign  = 'right';
    const noteLines = wrapText(ctx, scheduleNotes, totalW - PAD * 2 - 24);
    noteLines.forEach((ln, li) => {
      ctx.fillText(ln, totalW - PAD - 12, footerY + 34 + li * 16);
    });
  }

  // ── Day columns ─────────────────────────────────────────────────────────────
  DAY_KEYS.forEach((dayKey, i) => {
    const isWeekend = dayKey === 'fri' || dayKey === 'sat';
    const day       = schedule[dayKey];
    const colX      = PAD + (6 - i) * (COL_W + GAP);
    const rowTop    = gridTop;

    // Day header — gradient fill + shadow
    ctx.shadowColor   = 'rgba(0,20,60,0.18)';
    ctx.shadowBlur    = 7;
    ctx.shadowOffsetY = 4;
    const dayGrad = ctx.createLinearGradient(colX, rowTop, colX, rowTop + HEADER_H);
    dayGrad.addColorStop(0, isWeekend ? '#92400e' : '#1e3a5f');
    dayGrad.addColorStop(1, isWeekend ? '#78350f' : '#152d4a');
    ctx.fillStyle = dayGrad;
    roundedRect(ctx, colX, rowTop, COL_W, HEADER_H, 9);
    ctx.fill();
    clearShadow(ctx);

    ctx.fillStyle  = '#ffffff';
    ctx.font       = F('bold 20px Arial');
    ctx.textAlign  = 'center';
    ctx.direction  = 'rtl';
    ctx.fillText(DAYS_HE[i], colX + COL_W / 2, rowTop + HEADER_H - 11);

    // ── Slots ──────────────────────────────────────────────────────────────
    let slotY = rowTop + HEADER_H + GAP;
    const allSlots = [...(day.adHocShifts ?? []), ...(day.slots ?? [])];

    allSlots.forEach((slot) => {
      const slotH  = estimateSlotHeight(slot);
      const colors = SLOT_COLORS[slot.type] ?? SLOT_COLORS.morning;
      const emp    = employees.find((e) => e.id === slot.employee)  ?? null;
      const emp2   = employees.find((e) => e.id === slot.employee2) ?? null;
      const label  = slot.label ?? (SHIFT_TYPES[slot.type]?.label ?? slot.type);
      const time   = slot.time  ?? shiftTimes?.[slot.type] ?? SHIFT_TYPES[slot.type]?.time ?? '';

      // Card shadow
      ctx.shadowColor   = 'rgba(0,30,70,0.10)';
      ctx.shadowBlur    = 8;
      ctx.shadowOffsetY = 3;

      // White card fill
      ctx.fillStyle = '#ffffff';
      roundedRect(ctx, colX, slotY, COL_W, slotH, 8);
      ctx.fill();
      clearShadow(ctx);

      // Thin colored border around the whole card
      ctx.strokeStyle = colors.border;
      ctx.lineWidth   = 1.5;
      roundedRect(ctx, colX, slotY, COL_W, slotH, 8);
      ctx.stroke();

      const rX  = colX + COL_W - SLOT_P;
      const lX  = colX + SLOT_P;
      const iW  = COL_W - SLOT_P * 2;
      let curY  = slotY + SLOT_P;

      // Shift label — colored with the accent color
      ctx.fillStyle  = colors.border;
      ctx.font       = F('bold 15px Arial');
      ctx.textAlign  = 'center';
      ctx.direction  = 'rtl';
      ctx.fillText(label, colX + COL_W / 2, curY + H_LABEL - 2);
      curY += H_LABEL + 3;

      // Time — monospace, medium gray
      if (time) {
        ctx.fillStyle  = '#6b7280';
        ctx.font       = 'bold 13px "Courier New", Courier, monospace';
        ctx.textAlign  = 'center';
        ctx.direction  = 'ltr';
        ctx.fillText(time, colX + COL_W / 2, curY + H_TIME - 5);
      }
      curY += H_TIME + 4;

      // Badges
      const drawBadge = (text, bg, fg, stroke) => {
        ctx.fillStyle   = bg;
        roundedRect(ctx, lX, curY, iW, H_BADGE, 5);
        ctx.fill();
        ctx.strokeStyle = stroke;
        ctx.lineWidth   = 1;
        roundedRect(ctx, lX, curY, iW, H_BADGE, 5);
        ctx.stroke();
        ctx.fillStyle  = fg;
        ctx.font       = F('bold 12px Arial');
        ctx.textAlign  = 'center';
        ctx.direction  = 'rtl';
        ctx.fillText(text, colX + COL_W / 2, curY + H_BADGE - 6);
        curY += H_BADGE + H_BADGE_GAP;
      };

      if (slot.reshemBetMark) drawBadge('גיבוי רשת ב׳', '#e0f2fe', '#0369a1', '#7dd3fc');
      if (slot.konenutMark)   drawBadge('כוננות',        '#fce7f3', '#9d174d', '#f9a8d4');

      // Employee chips — warm gradient
      const drawChip = (name) => {
        const chipGrad = ctx.createLinearGradient(lX, curY, lX, curY + H_CHIP);
        chipGrad.addColorStop(0, '#fff7ed');
        chipGrad.addColorStop(1, '#ffedd5');
        ctx.fillStyle   = chipGrad;
        roundedRect(ctx, lX, curY, iW, H_CHIP, 6);
        ctx.fill();
        ctx.strokeStyle = '#fb923c';
        ctx.lineWidth   = 1.5;
        roundedRect(ctx, lX, curY, iW, H_CHIP, 6);
        ctx.stroke();
        ctx.fillStyle  = '#9a3412';
        ctx.font       = F('bold 17px Arial');
        ctx.textAlign  = 'center';
        ctx.direction  = 'rtl';
        ctx.fillText(name, colX + COL_W / 2, curY + H_CHIP - 7);
        curY += H_CHIP + H_CHIP_GAP;
      };

      if (emp)                 drawChip(emp.name);
      if (emp2)                drawChip(emp2.name);
      if (slot.manualEmployee) drawChip(slot.manualEmployee);

      // Note — with subtle background
      if (slot.note) {
        curY += 4;
        ctx.font      = F('bold 13px Arial');
        ctx.direction = 'rtl';
        const lines   = wrapText(ctx, slot.note, iW - 6);
        const noteH   = lines.length * (H_NOTE_LINE + 2) + 8;

        ctx.fillStyle = 'rgba(0,0,0,0.055)';
        roundedRect(ctx, lX, curY, iW, noteH, 5);
        ctx.fill();

        ctx.fillStyle  = '#374151';
        ctx.textAlign  = 'right';
        lines.forEach((ln, li) => {
          ctx.fillText(ln, rX - 3, curY + H_NOTE_LINE + li * (H_NOTE_LINE + 2));
        });
      }

      slotY += slotH + SLOT_GAP;
    });
  });

  return canvas;
}
