import { useState, useEffect } from "react";
import { listEntries } from "../api/entries";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarPanel({ selectedDate, onDateChange }) {
  const today = new Date();
  // Initialize month/year from selectedDate so the calendar reflects the
  // currently selected date (helps when leaving the dashboard with a date param).
  function parseISO(dateStr) {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }

  const initial = parseISO(selectedDate) || today;
  const [currentMonth, setCurrentMonth] = useState(initial.getMonth());
  const [currentYear, setCurrentYear] = useState(initial.getFullYear());
  const [entriesByDay, setEntriesByDay] = useState(new Set());

  // Fetch entries for the month
  useEffect(() => {
    async function fetchEntries() {
      try {
        const data = await listEntries({});
        const entries = data.results || data;

        // Filter to this month — parse entry.date as local YYYY-MM-DD to avoid UTC parsing issues
        const monthEntries = entries.filter((entry) => {
          const [y, m, d] = (entry.date || '').split('-').map(Number);
          const dt = new Date(y, (m || 1) - 1, d || 1);
          return dt.getFullYear() === currentYear && dt.getMonth() === currentMonth;
        });

        const daysWithEntries = new Set(monthEntries.map((entry) => {
          // Parse entry.date (YYYY-MM-DD) as local date
          const [y, m, d] = (entry.date || '').split('-').map(Number);
          return new Date(y, m - 1, d).getDate();
        }));
        setEntriesByDay(daysWithEntries);
      } catch (err) {
        console.error("Failed to load calendar entries", err);
      }
    }

    fetchEntries();
  }, [currentMonth, currentYear]);

  // Keep calendar month in sync with selectedDate (so navigating days can
  // move the calendar to the next/previous month automatically).
  useEffect(() => {
    if (!selectedDate) return;
    const d = parseISO(selectedDate);
    if (d.getFullYear() !== currentYear) setCurrentYear(d.getFullYear());
    if (d.getMonth() !== currentMonth) setCurrentMonth(d.getMonth());
  }, [selectedDate]);

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day) => {
    const y = currentYear;
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    onDateChange(dateStr);
  };

  const yearOptions = [];
  for (let y = currentYear - 10; y <= currentYear + 10; y++) yearOptions.push(y);

  return (
    <div className="panel calendar-panel">
      <div className="calendar-header">
        <button onClick={prevMonth}>&lt;</button>
        <h3>{new Date(currentYear, currentMonth).toLocaleString("default", { month: "long" })} {currentYear}</h3>
        <button onClick={nextMonth}>&gt;</button>
        <select
          value={currentYear}
          onChange={(e) => setCurrentYear(parseInt(e.target.value))}
          style={{ marginLeft: "auto" }}
        >
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
      <div className="calendar-grid">
        {DAYS.map((d) => (
          <div key={d} className="calendar-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDayOfMonth }).map((_, i) => (
          <div key={`empty-${i}`} className="calendar-cell empty"></div>
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isoForCell = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
            day
          ).padStart(2, '0')}`;
          const isToday = selectedDate === isoForCell;
          const hasEntry = entriesByDay.has(day);
          return (
            <div
              key={day}
              className={`calendar-cell ${isToday ? "selected" : ""} ${hasEntry ? "has-entry" : ""}`}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
