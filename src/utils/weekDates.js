// Week-date helpers for the weekly schedule.
// A "week" runs Sunday → Saturday. We store the Sunday as an ISO date
// string (YYYY-MM-DD) and derive the human-readable title from it.

/** Parse an ISO date (YYYY-MM-DD) into a local Date at midnight. */
function parseISO(iso) {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Format a Date as ISO YYYY-MM-DD (local). */
export function toISODate(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** The Sunday of the current week (or the upcoming Sunday if today is Sat). */
export function getUpcomingSunday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dow = today.getDay(); // 0 = Sunday
  // Snap back to this week's Sunday
  today.setDate(today.getDate() - dow);
  return toISODate(today);
}

/** Add `days` days to an ISO date, returning a new ISO date. */
export function addDaysISO(iso, days) {
  const d = parseISO(iso) ?? new Date();
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/**
 * Human-readable week title from the Sunday ISO date:
 * "ראשון 8.6 – שבת 14.6"
 */
export function formatWeekTitle(weekStartISO) {
  const start = parseISO(weekStartISO);
  if (!start) return '';
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const fmt = (d) => `${d.getDate()}.${d.getMonth() + 1}`;
  return `${fmt(start)} – ${fmt(end)}`;
}
