import React, { useEffect, useState } from 'react';
import { getEntriesByDate } from '../api/entries';
import { getMoodByDate, createMood, patchMood, deleteMood } from '../api/moods';

const FACES = [
  { value: '1', label: 'Very sad' },
  { value: '2', label: 'Sad' },
  { value: '3', label: 'Neutral' },
  { value: '4', label: 'Happy' },
  { value: '5', label: 'Very happy' },
];

function FaceSVG({ variant = 3 }) {
  // variant: 1..5 mapping to expressive mouth shapes
  const mouthPaths = {
    1: 'M14 30 Q24 20 34 30', // very sad (frown)
    2: 'M14 30 Q24 22 34 30', // sad
    3: 'M14 30 L34 30', // neutral
    4: 'M14 28 Q24 36 34 28', // happy
    5: 'M12 26 Q24 40 36 26', // very happy (big smile)
  };

  const path = mouthPaths[variant] || mouthPaths[3];

  return (
    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <circle cx="24" cy="24" r="20" fill="rgba(255,255,255,0.02)" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="18" r="2" fill="currentColor" />
      <circle cx="31" cy="18" r="2" fill="currentColor" />
      <path d={path} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function MoodPanel({ selectedDate }) {
  const [moodObj, setMoodObj] = useState(null);
  const [mood, setMood] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [justSaved, setJustSaved] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    // load dedicated mood if available, otherwise fall back to entries for legacy data
    getMoodByDate(selectedDate)
      .then((m) => {
        if (!mounted) return;
        if (m) {
          setMoodObj(m);
          setMood(m.mood || '');
          setLoading(false);
          return;
        }
        // fallback to entries (existing legacy data)
        return getEntriesByDate(selectedDate).then((res) => {
          const entries = Array.isArray(res) ? res : (res.results || []);
          const e = entries && entries.length ? entries[0] : null;
          if (!mounted) return;
          setMoodObj(null);
          setMood(e?.mood || '');
        });
      })
      .catch((err) => {
        console.error('Failed to load mood', err);
        if (mounted) setError('Failed to load mood');
      })
      .finally(() => { if (mounted) setLoading(false); });

    return () => { mounted = false; };
  }, [selectedDate]);

  const saveMood = async (value) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      if (moodObj && moodObj.id) {
        const updated = await patchMood(moodObj.id, { mood: value });
        setMoodObj(updated);
        setMood(updated.mood || '');
      } else {
        const created = await createMood({ date: selectedDate, mood: value });
        setMoodObj(created);
        setMood(created.mood || '');
      }
      // trigger a brief save animation on the selected face
      setJustSaved(value);
      setTimeout(() => setJustSaved(null), 800);
    } catch (err) {
      console.error('Failed to save mood', err);
      // If the request helper returned structured error info, show it.
      if (err && err.data) {
        try {
          const d = err.data;
          // Prefer non_field_errors or field-specific messages
          const msg = d.non_field_errors || d.detail || d.title || d.mood || JSON.stringify(d);
          setError(Array.isArray(msg) ? msg.join(' ') : String(msg));
        } catch (e) {
          setError('Failed to save mood');
        }
      } else {
        setError('Failed to save mood');
      }
    } finally {
      setLoading(false);
    }
  };

  const clearMood = async () => {
    if (!moodObj || !moodObj.id) return;
    setLoading(true);
    setError(null);
    try {
      await deleteMood(moodObj.id);
      setMoodObj(null);
      setMood('');
    } catch (err) {
      console.error('Failed to clear mood', err);
      if (err && err.data) {
        setError(JSON.stringify(err.data));
      } else {
        setError('Failed to clear mood');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel mood-panel">
      <h3>Mood</h3>
      <div className="mood-row" role="radiogroup" aria-label="Daily mood">
        {FACES.map((f, idx) => (
          <button
            key={f.value}
            className={`mood-face ${mood === f.value ? 'selected' : ''} ${justSaved === f.value ? 'saved' : ''}`}
            onClick={() => saveMood(f.value)}
            disabled={loading}
            title={f.label}
            aria-pressed={mood === f.value}
            aria-label={f.label}
          >
            <FaceSVG variant={idx + 1} />
          </button>
        ))}
      </div>

      {error && <div className="error-text" style={{ marginTop: 8 }}>{error}</div>}

      {mood && (
        <button
          className="clear-mood"
          onClick={clearMood}
          disabled={loading}
          aria-label="Clear mood"
          title="Clear mood"
        >
          Clear
        </button>
      )}
    </div>
  );
}
