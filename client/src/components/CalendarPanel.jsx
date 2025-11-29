export default function CalendarPanel({ selectedDate, onDateChange }) {
  return (
    <div className="panel calendar-panel">
      <h3>Calendar</h3>
      <p>Calendar coming soon. Selected date: {selectedDate}</p>
      <input type="date" value={selectedDate} onChange={(e) => onDateChange(e.target.value)} />
    </div>
  );
}
