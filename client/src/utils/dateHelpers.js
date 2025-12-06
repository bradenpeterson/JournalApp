/**
 * Parse YYYY-MM-DD date string as local date (avoid UTC parsing)
 */
export function parseISO(dateStr) {
  const [y, m, d] = (dateStr || '').split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/**
 * Convert Date to YYYY-MM-DD string (local timezone)
 */
export function localISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Format date string as "Month Day, Year"
 */
export function formatDate(dateStr) {
  const date = parseISO(dateStr);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}
