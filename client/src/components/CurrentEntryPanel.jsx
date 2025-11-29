import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEntriesByDate } from "../api/Entries";

export default function CurrentEntryPanel({ selectedDate }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    async function loadEntry() {
      if (!selectedDate) return;

      setLoading(true);
      setError(null);

      try {
        const data = await getEntriesByDate(selectedDate);
        if (cancelled) return;

        const firstEntry =
          Array.isArray(data) && data.length > 0 ? data[0] : null;

        setEntry(firstEntry);
      } catch (err) {
        if (!cancelled) {
          console.error(err);
          setError("Failed to load entry.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEntry();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function handleClickPanel() {
    if (entry && entry.id) {
      // Go to full entry page
      navigate(`/entries/${entry.id}`);
    } else {
      // No entry yet for this date → go to "new entry" page with date prefilled
      navigate(`/entries/new?date=${selectedDate}`);
    }
  }

  function handleAddTagClick(e) {
    e.stopPropagation(); // don't trigger the panel click
    if (entry && entry.id) {
      navigate(`/entries/${entry.id}#tags`);
    } else {
      navigate(`/entries/new?date=${selectedDate}#tags`);
    }
  }

  // Helper: get a short preview of the content
  function getPreviewText(entry) {
    if (!entry || !entry.content) return "";
    const maxLen = 150;
    if (entry.content.length <= maxLen) return entry.content;
    return entry.content.slice(0, maxLen) + "…";
  }

  const tags = entry?.tags || []; 

  return (
    <div
      className="panel current-entry-panel"
      onClick={handleClickPanel}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClickPanel();
      }}
    >
      <div className="current-entry-header">
        <h2>Current Entry</h2>
        <span className="current-entry-date">
          {selectedDate || "No date selected"}
        </span>
      </div>

      <div className="current-entry-body">
        {loading ? (
          <p className="muted-text">Loading...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : entry ? (
          <>
            <h3 className="current-entry-title">
              {entry.title || "(No title)"}
            </h3>
            <p className="current-entry-preview">
              {getPreviewText(entry) || "No content yet. Click to edit."}
            </p>
          </>
        ) : (
          <p className="muted-text">
            No entry for this day yet. Click to start writing.
          </p>
        )}
      </div>

      <div
        className="current-entry-footer"
        onClick={(e) => e.stopPropagation()} // so clicking tags row doesn’t navigate
      >
        <div className="tag-list">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span key={tag.id || tag.name} className="tag-chip">
                {tag.name}
              </span>
            ))
          ) : (
            <span className="muted-text small-text">No tags yet</span>
          )}
        </div>
        <button
          type="button"
          className="add-tag-button"
          onClick={handleAddTagClick}
        >
          + Add tag
        </button>
      </div>
    </div>
  );
}
