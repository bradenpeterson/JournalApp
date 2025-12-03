export default function DateNavigator({ selectedDate, onDateChange }) {
  // Helper to format date nicely
  // Parse an ISO YYYY-MM-DD string into a local Date object (avoids UTC parsing)
  function parseISO(dateStr) {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  function formatDate(dateStr) {
    const date = parseISO(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  function changeDate(days) {
    const date = parseISO(selectedDate);
    date.setDate(date.getDate() + days);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const iso = `${y}-${m}-${day}`;
    onDateChange(iso);
  }

  return (
    <div className="date-navigator">
      <button
        type="button"
        className="prev-day-btn"
        onClick={() => changeDate(-1)}
      >
        ←
      </button>
      <span className="current-date">{formatDate(selectedDate)}</span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} />
      <button
        type="button"
        className="next-day-btn"
        onClick={() => changeDate(1)}
      >
        →
      </button>
    </div>
  );
}


