import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getEntry, deleteEntry } from "../api/entries";

// Parse YYYY-MM-DD into a local Date
function parseISO(dateStr) {
  const [y, m, d] = (dateStr || "").split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function formatDate(dateStr) {
  const date = parseISO(dateStr);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function EntryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await getEntry(id);
        if (cancelled) return;
        setEntry(data);
      } catch (err) {
        console.error('Failed to load entry', err);
        if (!cancelled) setError('Failed to load entry');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true };
  }, [id]);

  const handleEdit = () => {
    navigate(`/entries/${id}/edit`);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this entry? This cannot be undone.')) return;
    try {
      await deleteEntry(id);
      navigate('/');
    } catch (err) {
      console.error('Failed to delete entry', err);
      setError('Failed to delete entry');
    }
  };

  if (loading) return <div className="panel entry-detail-panel"><p>Loading...</p></div>;
  if (error) return <div className="panel entry-detail-panel"><p className="error-text">{error}</p></div>;
  if (!entry) return <div className="panel entry-detail-panel"><p>Entry not found.</p></div>;

  return (
    <div className="panel entry-detail-panel">
      <div className="entry-detail-header">
        <h2>{entry.title || '(No title)'}</h2>
        <div className="entry-detail-actions">
          <button onClick={handleEdit} className="edit-entry-button">Edit</button>
          <button onClick={handleDelete} className="delete-entry-button">Delete</button>
        </div>
      </div>

      <div className="entry-meta">
        <div className="entry-date">{formatDate(entry.date)}</div>
        {entry.mood && <div className="entry-mood">Mood: {entry.mood}</div>}
        {entry.tags && entry.tags.length > 0 && (
          <div className="entry-tags">
            {entry.tags.map(t => (
              <span key={t.id || t.name} className="tag-chip">{t.name}</span>
            ))}
          </div>
        )}
      </div>

      {entry.image && (
        <div className="entry-image">
          <img src={entry.image} alt="entry" style={{ maxWidth: '100%', borderRadius: 6 }} />
        </div>
      )}

      <div className="entry-content">
        <pre style={{ whiteSpace: 'pre-wrap' }}>{entry.content || ''}</pre>
      </div>
    </div>
  );
}
