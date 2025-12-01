import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createEntry } from "../api/entries";

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

    const defaultDate = params.get("date") || localISODate();

    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleBack = () => navigate("/"); // go back to dashboard

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            await createEntry({ title, content, date: defaultDate });
            navigate("/"); // redirect to dashboard after creation
        } catch (err) {
            console.error("Failed to create entry", err);
            setError("Failed to save entry.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="entry-editor-container">
            <header className="entry-editor-header">
                <button onClick={handleBack} className="back-button">← Back</button>
                <div className="entry-date">{formatDate(defaultDate)}</div>
            </header>

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

                <button type="submit" disabled={loading} className="save-entry-button">
                    {loading ? "Saving..." : "Save Entry"}
                </button>
            </form>
        </div>
    );
}
