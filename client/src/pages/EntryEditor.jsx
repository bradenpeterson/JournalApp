import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { createEntry, getEntry, updateEntry, deleteEntry } from "../api/entries";
import EntryView from "../components/EntryView";
import EntryForm from "../components/EntryForm";

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
    const [tags, setTags] = useState([]);
    const [entry, setEntry] = useState(null);
    const [isEditing, setIsEditing] = useState(!id);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleBack = () => {
        // If the user is editing an existing entry, cancel the edit and show
        // the read-only view for that entry instead of navigating to a different page.
        if (id && isEditing) {
            // restore fields from the saved `entry` (discard unsaved edits)
            setTitle(entry?.title || '');
            setContent(entry?.content || '');
            setTags(entry?.tags || []);
            setIsEditing(false);
            return;
        }

        // Otherwise, navigate back to the previous page.
        navigate(-1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (id) {
                // update existing entry
                const updated = await updateEntry(id, { title, content, date: entryDate, tags: tags.map(t => t.id).filter(Boolean) });
                setEntry(updated);
                setIsEditing(false);
            } else {
                const created = await createEntry({ title, content, date: entryDate, tags: tags.map(t => t.id).filter(Boolean) });
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

    const handleDelete = async () => {
        if (!window.confirm('Delete this entry? This cannot be undone.')) return;
        try {
            await deleteEntry(id);
            navigate(`/?date=${entryDate}`);
        } catch (err) {
            console.error('Failed to delete entry', err);
            setError('Failed to delete entry');
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
                setTags(data.tags || []);
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

                                {id && !isEditing && (
                                        <div className="entry-editor-actions">
                                                <button onClick={() => setIsEditing(true)} className="edit-entry-button" aria-label="Edit entry" title="Edit entry">
                                                    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                                                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" />
                                                        <path d="M20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                                                    </svg>
                                                </button>
                                                <button onClick={handleDelete} className="delete-entry-button" aria-label="Delete entry" title="Delete entry">
                                                    <svg width="25" height="25" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
                                                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" />
                                                        <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                                                    </svg>
                                                </button>
                                        </div>
                                )}
            </header>

            {id && !isEditing ? (
                <EntryView entry={entry} onEdit={() => setIsEditing(true)} onDelete={handleDelete} />
            ) : (
                <EntryForm title={title} content={content} setTitle={setTitle} setContent={setContent} tags={tags} setTags={setTags} onSave={handleSubmit} onCancel={() => {
                    if (id) {
                        setIsEditing(false);
                        setTitle(entry?.title || '');
                        setContent(entry?.content || '');
                    } else {
                        navigate('/');
                    }
                }} loading={loading} />
            )}
        </div>
    );
}
