import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listEntries } from "../api/entries";
import Sidebar from "../components/Sidebar";

export default function AllEntries() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const navigate = useNavigate();
  const observer = useRef();

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  const lastEntryRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    listEntries({ page })
      .then(data => {
        if (cancelled) return;
        const newEntries = data.results || [];
        setEntries(prev => [...prev, ...newEntries]);
        setHasMore(!!data.next);
      })
      .catch(err => {
        console.error('Failed to load entries', err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page]);

  function formatDate(dateStr) {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function getPreview(content, maxLen = 200) {
    if (!content) return "";
    if (content.length <= maxLen) return content;
    return content.slice(0, maxLen) + "…";
  }

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="main-area">
        <div className="all-entries-container">
          <h1 className="all-entries-title">All Entries</h1>
          <div className="all-entries-list">
            {entries.map((entry, index) => {
              const isLast = index === entries.length - 1;
              return (
                <div
                  key={entry.id}
                  ref={isLast ? lastEntryRef : null}
                  className="all-entry-card"
                  onClick={() => navigate(`/entries/${entry.id}/edit`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter') navigate(`/entries/${entry.id}/edit`); }}
                >
                  <div className="all-entry-header">
                    <h3 className="all-entry-title">{entry.title || "(No title)"}</h3>
                    <span className="all-entry-date">{formatDate(entry.date)}</span>
                  </div>
                  {entry.tags && entry.tags.length > 0 && (
                    <div className="all-entry-tags">
                      {entry.tags.map(tag => (
                        <span key={tag.id || tag.name} className="tag-chip">{tag.name}</span>
                      ))}
                    </div>
                  )}
                  <p className="all-entry-preview">{getPreview(entry.content)}</p>
                  <div className="all-entry-meta">
                    {entry.word_count > 0 && <span>{entry.word_count} words</span>}
                  </div>
                </div>
              );
            })}
          </div>
          {loading && <div className="all-entries-loading">Loading more entries...</div>}
          {!hasMore && entries.length > 0 && <div className="all-entries-end">You've reached the end</div>}
          {!loading && entries.length === 0 && <div className="all-entries-empty">No entries yet. Start writing!</div>}
        </div>
      </div>
    </div>
  );
}
