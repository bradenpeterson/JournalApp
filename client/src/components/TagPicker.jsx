import React, { useEffect, useState } from 'react';
import { listTags, createTag } from '../api/tag';
import { getEntriesByDate, patchEntry } from '../api/entries';
import { useNavigate } from 'react-router-dom';

export default function TagPicker({ selectedDate, onApplied, onClose }) {
  const [tags, setTags] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    // Only fetch suggestions when the user types/filter is non-empty.
    if (!filter || !filter.trim()) {
      setTags([]);
      return () => { mounted = false };
    }

    setLoading(true);
    listTags(1, 50)
      .then((res) => {
        const items = res.results || res;
        if (!mounted) return;
        // Find matches client-side and keep up to 5
        const arr = Array.isArray(items) ? items : [];
        const matches = arr.filter(t => t.name.toLowerCase().includes(filter.toLowerCase())).slice(0, 5);
        setTags(matches);
      })
      .catch((err) => {
        console.error('Failed to load tags', err);
        if (mounted) setError('Failed to load tags');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false };
  }, [filter]);

  const filtered = tags.filter(t => t.name.toLowerCase().includes(filter.toLowerCase()));

  async function applyTagToEntry(tag) {
    setLoading(true);
    setError(null);
    try {
      const data = await getEntriesByDate(selectedDate);
      const entries = Array.isArray(data) ? data : (data.results || []);
      const entry = entries && entries.length ? entries[0] : null;
      if (!entry) {
        // No entry for this date — navigate to new entry editor with #tags
        onClose && onClose();
        navigate(`/entries/new?date=${selectedDate}#tags`);
        return;
      }

      const existingIds = (entry.tags || []).map(t => t.id).filter(Boolean);
      if (!existingIds.includes(tag.id)) existingIds.push(tag.id);
      await patchEntry(entry.id, { tags: existingIds });
      onApplied && onApplied();
      onClose && onClose();
    } catch (err) {
      console.error('Failed to apply tag', err);
      setError('Failed to apply tag');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!filter.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const created = await createTag({ name: filter.trim() });
      // add to local list and apply
      setTags(prev => [created, ...prev]);
      await applyTagToEntry(created);
    } catch (err) {
      console.error('Failed to create tag', err);
      setError('Failed to create tag');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="tagpicker-popover">
      <input
        className="tagpicker-input"
        placeholder="Filter or type new tag"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          // Prevent Enter/Space from bubbling to parent panel which would
          // trigger the panel's key handler and navigate away.
          e.stopPropagation();
          if (e.key === 'Enter') {
            // Convenience: create the tag with Enter
            e.preventDefault();
            handleCreate();
          }
        }}
      />
      <div className="tagpicker-list">
        {loading ? <div className="muted-text">Loading...</div> : (
          filtered.length ? filtered.map(t => (
            <div key={t.id} className="tagpicker-item" onClick={() => applyTagToEntry(t)}>{t.name}</div>
          )) : <div className="muted-text">No tags</div>
        )}
      </div>
      <div className="tagpicker-actions">
        <button className="mood-button" onClick={handleCreate} disabled={creating || !filter.trim()}>{creating ? 'Creating...' : 'Create & Add'}</button>
        <button className="cancel-entry-button" onClick={() => onClose && onClose()}>Close</button>
      </div>
      {error && <div className="error-text">{error}</div>}
    </div>
  );
}
