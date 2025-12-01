import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { createEntry, getEntry, updateEntry, deleteEntry } from "../api/entries";

// Helpers to parse/format YYYY-MM-DD as a local date (avoid UTC parsing)
function parseISO(dateStr) {
    const [y, m, d] = (dateStr || '').split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
}

function localISODate(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

// Utility to format date like "December 12, 2025"
function formatDate(dateStr) {
    const date = parseISO(dateStr);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function EntryEditor() {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { id } = useParams();

    const defaultDateFromParams = params.get("date");
    const [entryDate, setEntryDate] = useState(defaultDateFromParams || localISODate());

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [entry, setEntry] = useState(null);
    const [isEditing, setIsEditing] = useState(!id);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleBack = () => navigate("/"); // go back to dashboard

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (id) {
                // update existing entry
                const updated = await updateEntry(id, { title, content, date: entryDate });
                setEntry(updated);
                setIsEditing(false);
            } else {
                const created = await createEntry({ title, content, date: entryDate });
                // After creating an entry for a (possibly) previous day, navigate
                // back to the dashboard with that date selected.
                navigate(`/?date=${entryDate}`);
            }
        } catch (err) {
            console.error("Failed to create entry", err);
            setError("Failed to save entry.");
        } finally {
            setLoading(false);
        }
    };

    // If editing an existing entry (id present), load it
    useEffect(() => {
        let cancelled = false;
        async function load() {
            if (!id) return;
            setLoading(true);
            try {
                const data = await getEntry(id);
                if (cancelled) return;
                setEntry(data);
                setTitle(data.title || "");
                setContent(data.content || "");
                if (data.date) setEntryDate(data.date);
                // When editing an existing entry, default to read-only
                setIsEditing(false);
            } catch (err) {
                console.error('Failed to load entry for edit', err);
                setError('Failed to load entry');
            } finally {
                if (!cancelled) setLoading(false);
            }
        }
        load();
        return () => { cancelled = true };
    }, [id]);

    return (
        <div className="entry-editor-container">
            <header className="entry-editor-header">
                <button onClick={handleBack} className="back-button">← Back</button>
                <div className="entry-date">{formatDate(entryDate)}</div>
            </header>

            {id && !isEditing ? (
                <div className="entry-readonly">
                    <div className="entry-actions">
                        <button onClick={() => setIsEditing(true)} className="edit-entry-button">Edit</button>
                        <button onClick={async () => {
                            if (!window.confirm('Delete this entry? This cannot be undone.')) return;
                            try {
                                await deleteEntry(id);
                                navigate(`/?date=${entryDate}`);
                            } catch (err) {
                                console.error('Failed to delete entry', err);
                                setError('Failed to delete entry');
                            }
                        }} className="delete-entry-button">Delete</button>
                    </div>

                    <h2>{entry?.title || '(No title)'}</h2>
                    <div className="entry-meta">
                        {entry?.mood && <div className="entry-mood">Mood: {entry.mood}</div>}
                        {entry?.tags && entry.tags.length > 0 && (
                            <div className="entry-tags">
                                {entry.tags.map(t => (
                                    <span key={t.id || t.name} className="tag-chip">{t.name}</span>
                                ))}
                            </div>
                        )}
                    </div>

                    {entry?.image && (
                        <div className="entry-image"><img src={entry.image} alt="entry" style={{ maxWidth: '100%', borderRadius: 6 }} /></div>
                    )}

                    <div className="entry-content"><pre style={{ whiteSpace: 'pre-wrap' }}>{entry?.content || ''}</pre></div>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="entry-editor-form">
                    <input
                        type="text"
                        placeholder="Entry Title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="entry-title-input"
                    />

                    <textarea
                        placeholder="Write your entry here..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="entry-content-textarea"
                    />

                    {error && <p className="error-text">{error}</p>}

                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button type="submit" disabled={loading} className="save-entry-button">
                            {loading ? "Saving..." : "Save Entry"}
                        </button>
                        <button type="button" onClick={() => {
                            if (id) {
                                // cancel editing -> go back to read-only view
                                setIsEditing(false);
                                // restore title/content from loaded entry
                                setTitle(entry?.title || '');
                                setContent(entry?.content || '');
                            } else {
                                // cancel new entry -> back to dashboard
                                navigate('/');
                            }
                        }} className="cancel-entry-button">Cancel</button>
                    </div>
                </form>
            )}
        </div>
    );
}
