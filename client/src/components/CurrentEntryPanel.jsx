import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getEntriesByDate } from "../api/entries";
import TagPicker from './TagPicker';

export default function CurrentEntryPanel({ selectedDate, tagRefreshKey }) {
  // Accept a refresh key so parent can force reloading tags after changes
  // (e.g., when TagPicker modifies tags for the current entry).
  // Keep backward compatible signature.
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const navigate = useNavigate();

  async function fetchEntry() {
    if (!selectedDate) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getEntriesByDate(selectedDate);
      const firstEntry = Array.isArray(data) && data.length > 0 ? data[0] : null;
      setEntry(firstEntry);
    } catch (err) {
      console.error(err);
      setError("Failed to load entry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await fetchEntry();
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedDate, tagRefreshKey]);

  function handleClickPanel() {
    if (entry && entry.id) {
      // Entry exists — open it in the editor so the user can view and edit it
      navigate(`/entries/${entry.id}/edit`);
    } else {
      // No entry yet for this date → go to "new entry" page with date prefilled
      navigate(`/entries/new?date=${selectedDate}`);
    }
  }

  function handleAddTagClick(e) {
    e.stopPropagation(); // don't trigger the panel click
    setTagPickerOpen((o) => !o);
  }

  // Helper: get a short preview of the content
  function getPreviewText(entry) {
    if (!entry || !entry.content) return "";
    const maxLen = 300;
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
      style={{ position: 'relative' }}
    >
      <div className="current-entry-header">
        <h3>Current Entry</h3>
      </div>

      <div className="current-entry-body">
        {loading ? (
          <p className="muted-text">Loading...</p>
        ) : error ? (
          <p className="error-text">{error}</p>
        ) : entry ? (
          <>
            <h4 className="current-entry-title">{entry.title || "(No title)"}</h4>
            <p className="current-entry-preview">{getPreviewText(entry) || "No content yet. Click to edit."}</p>
          </>
        ) : (
          <p className="muted-text">No entry for this day yet. Click to start writing.</p>
        )}
      </div>

      <div className="current-entry-footer">
        <div className="tag-list">
          {tags.length > 0 ? (
            tags.map((tag) => (
              <span key={tag.id || tag.name} className="tag-chip" onClick={(e) => e.stopPropagation()}>
                {tag.name}
              </span>
            ))
          ) : (
            <span></span>
          )}
        </div>
        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
          <button type="button" className="add-tag-button" onClick={handleAddTagClick}>
            + Add tag
          </button>
          {tagPickerOpen && (
            <div style={{ position: 'absolute', right: 0, bottom: '110%', zIndex: 40 }} onClick={(e) => e.stopPropagation()}>
              <TagPicker selectedDate={selectedDate} onApplied={() => { fetchEntry(); setTagPickerOpen(false); }} onClose={() => setTagPickerOpen(false)} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
