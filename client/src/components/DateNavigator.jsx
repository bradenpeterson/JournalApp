import { useState } from "react";

export default function DateNavigator({ selectedDate, onDateChange }) {
  // Helper to format date nicely
  function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function changeDate(days) {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    const iso = date.toISOString().slice(0, 10);
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
