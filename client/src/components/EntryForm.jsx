import React from 'react';

export default function EntryForm({ title, content, setTitle, setContent, onCancel, onSave, loading }) {
  return (
    <form onSubmit={onSave} className="entry-editor-form">
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

      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={loading} className="save-entry-button">
          {loading ? "Saving..." : "Save Entry"}
        </button>
        <button type="button" onClick={onCancel} className="cancel-entry-button">Cancel</button>
      </div>
    </form>
  );
}
