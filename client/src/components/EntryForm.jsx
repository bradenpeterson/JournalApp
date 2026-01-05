import React, { useEffect, useState, useRef } from 'react';
import { listTags, createTag } from '../api/tag';

export default function EntryForm({ title, content, setTitle, setContent, onCancel, onSave, loading, tags, setTags }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    // Only show suggestions when the user has typed a query
    if (!query || !query.trim()) {
      setSuggestions([]);
      return () => { mounted = false };
    }

    setLoadingSuggestions(true);
    listTags(1, 50).then(res => {
      const items = res.results || res;
      if (!mounted) return;
      const arr = Array.isArray(items) ? items : [];
      setSuggestions(arr.filter(t => t.name.toLowerCase().includes(query.toLowerCase())).slice(0,5));
    }).catch(() => {
      if (mounted) setSuggestions([]);
    }).finally(() => { if (mounted) setLoadingSuggestions(false); });

    return () => { mounted = false };
  }, [query]);

  async function handleAddSuggestion(tag) {
    if (!tag) return;
    if ((tags || []).some(t => t.id === tag.id || t.name === tag.name)) return;
    setTags(prev => [tag, ...(prev || [])]);
    setQuery('');
  }

  async function handleCreateTag(e) {
    e.preventDefault();
    const name = query.trim();
    if (!name) return;
    try {
      const created = await createTag({ name });
      setTags(prev => [created, ...(prev || [])]);
      setQuery('');
    } catch (err) {
      console.error('Failed to create tag', err);
      // ignore UI error for now
    }
  }

  function handleRemoveTag(tag) {
    setTags(prev => (prev || []).filter(t => t.id !== tag.id || t.name !== tag.name));
  }

  // autosize textarea whenever `content` changes
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    // preserve current scroll position to avoid jumping as we resize
    const prevScrollY = window.scrollY || window.pageYOffset;
    // reset height to let scrollHeight shrink when content is removed
    el.style.height = 'auto';
    // set to scrollHeight so the textarea expands to fit content
    el.style.height = `${el.scrollHeight}px`;
    // restore scroll after browser layout so viewport doesn't jump
    requestAnimationFrame(() => {
      window.scrollTo(0, prevScrollY);
    });
  }, [content]);

  return (
    <form onSubmit={onSave} className="entry-editor-form">
      <div className="entry-tags-editor">
        <div className="tag-chips">
          {(tags || []).map(t => (
            <span key={t.id || t.name} className="tag-chip">
              {t.name}
              <button type="button" className="tag-remove" onClick={() => handleRemoveTag(t)}>×</button>
            </span>
          ))}
        </div>

        <div className="tag-input-row">
          <input
            type="text"
            placeholder="Add or create tag"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="tag-input"
          />
          <button className="create-tag-button" onClick={handleCreateTag} disabled={!query.trim()}>Create</button>
        </div>

        {loadingSuggestions ? (
          <div className="muted-text">Loading...</div>
        ) : (
          <div className="tag-suggestions">
            {suggestions.map(s => (
              <div key={s.id || s.name} className="tag-suggestion" onClick={() => handleAddSuggestion(s)}>{s.name}</div>
            ))}
          </div>
        )}
      </div>

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
        ref={textareaRef}
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

// autosize handled inside the component via the effect above

