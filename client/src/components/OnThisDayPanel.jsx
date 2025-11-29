import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEntriesByMonthDay } from "../api/Entries";

function EntryCard({ entry }) {
  const navigate = useNavigate();

  const preview = entry.content && entry.content.length > 100 
    ? entry.content.slice(0, 100) + "…" 
    : entry.content || "(No content)";

  return (
    <div 
      className="on-this-day-entry"
      onClick={() => navigate(`/entries/${entry.id}`)}
      style={{ cursor: "pointer", padding: "8px", border: "1px solid #ddd", borderRadius: "4px", marginBottom: "8px" }}
    >
      <div style={{ display: "flex", gap: "8px" }}>
        {entry.image && (
          <img 
            src={entry.image} 
            alt="entry" 
            style={{ width: "60px", height: "60px", objectFit: "cover", borderRadius: "4px" }}
          />
        )}
        <div style={{ flex: 1 }}>
          <h4 style={{ margin: "0 0 4px 0" }}>{entry.title || "(No title)"}</h4>
          <p style={{ margin: 0, fontSize: "0.9em", color: "#666" }}>{preview}</p>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85em", color: "#999" }}>{entry.date}</p>
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

