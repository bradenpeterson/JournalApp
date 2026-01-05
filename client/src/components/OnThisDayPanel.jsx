import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEntriesByMonthDay } from "../api/entries";

function EntryCard({ entry }) {
  const navigate = useNavigate();

  const preview = entry.content && entry.content.length > 140
    ? entry.content.slice(0, 140) + "…"
    : entry.content || "(No content)";

  return (
    <div
      className="on-this-day-entry"
      onClick={() => navigate(`/entries/${entry.id}/edit`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/entries/${entry.id}/edit`); }}
    >
      <div className="on-this-day-entry-inner">
        {entry.image && (
          <img src={entry.image} alt="entry" className="on-this-day-thumb" />
        )}
        <div className="on-this-day-body">
          <h4 className="on-this-day-title">{entry.title || "(No title)"}</h4>
          <p className="on-this-day-preview">{preview}</p>
          <p className="on-this-day-meta">{(function formatISOtoMDY(dateStr){
            if(!dateStr) return '';
            const [y,m,d] = dateStr.split('-');
            return `${String(m).padStart(2,'0')}/${String(d).padStart(2,'0')}/${y}`;
          })(entry.date)}</p>
        </div>
      </div>
    </div>
  );
}

export default function OnThisDayPanel({ selectedDate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!selectedDate) return;

    setLoading(true);
    setError(null);

    // Extract month and day from selectedDate (format: "2025-11-29")
    const [, month, day] = selectedDate.split("-");
    const monthDay = `${month}-${day}`;

    getEntriesByMonthDay(monthDay)
      .then(data => {
        // Filter out today's entry (we already show it in CurrentEntryPanel)
        const pastYears = data.filter(e => e.date !== selectedDate);
        setEntries(pastYears);
      })
      .catch(err => {
        console.error("Failed to load on-this-day entries", err);
        setError("Failed to load entries");
      })
      .finally(() => setLoading(false));
  }, [selectedDate]);

  return (
    <div className="panel on-this-day-panel">
      <h3>On This Day</h3>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && entries.length === 0 && !error && (
        <p>No entries from this day in previous years</p>
      )}

      <div>
        {entries.map(entry => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}

