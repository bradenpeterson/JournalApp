import React from 'react';

export default function EntryView({ entry, onEdit, onDelete }) {
  return (
    <div className="entry-readonly">
      
      <h2>{entry?.title || '(No title)'}</h2>
      <div className="entry-meta">
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
  );
}
