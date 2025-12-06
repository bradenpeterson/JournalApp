import { parseISO, formatDate, localISODate } from "../utils/dateHelpers";

export default function DateNavigator({ selectedDate, onDateChange }) {
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


