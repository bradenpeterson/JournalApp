import { useEffect, useState } from "react";
import { getStats } from "../api/entries";

export default function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    getStats()
      .then(data => setStats(data))
      .catch(err => {
        console.error("Failed to load stats", err);
        setError("Failed to load stats");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="panel stats-panel"><p>Loading...</p></div>;
  if (error) return <div className="panel stats-panel"><p>{error}</p></div>;
  if (!stats) return <div className="panel stats-panel"><p>No stats available</p></div>;

  return (
    <div className="panel stats-panel">
      <h3>Your Stats</h3>
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-label">Day Streak</p>
          <p className="stat-value">{stats.day_streak}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Week Streak</p>
          <p className="stat-value">{stats.week_streak}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Total Entries</p>
          <p className="stat-value">{stats.total_entries}</p>
        </div>

        <div className="stat-card">
          <p className="stat-label">Words Written</p>
          <p className="stat-value">{(stats.total_words ?? 0).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}
