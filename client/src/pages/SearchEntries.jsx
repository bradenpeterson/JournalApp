import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { listEntries } from "../api/entries";
import { listTags } from "../api/tag";
import { formatDate } from "../utils/dateHelpers";
import Sidebar from "../components/Sidebar";

const MOOD_OPTIONS = [
  { value: '1', label: 'Very sad' },
  { value: '2', label: 'Sad' },
  { value: '3', label: 'Neutral' },
  { value: '4', label: 'Happy' },
  { value: '5', label: 'Very happy' },
];

export default function SearchEntries() {
  const [entries, setEntries] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sidebarOpen');
    return saved !== null ? JSON.parse(saved) : true;
  });
  
  // Filter states
  const [keyword, setKeyword] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedMood, setSelectedMood] = useState("");
  const [allTags, setAllTags] = useState([]);
  
  const navigate = useNavigate();
  const observer = useRef();

  useEffect(() => {
    localStorage.setItem('sidebarOpen', JSON.stringify(sidebarOpen));
  }, [sidebarOpen]);

  // Fetch all tags for filter dropdown
  useEffect(() => {
    async function fetchTags() {
      try {
        const data = await listTags();
        setAllTags(data.results || data || []);
      } catch (err) {
        console.error("Failed to fetch tags:", err);
      }
    }
    fetchTags();
  }, []);

  const lastEntryRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => prev + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  useEffect(() => {
    async function fetchEntries() {
      setLoading(true);
      try {
        const params = { page };
        if (keyword) params.search = keyword;
        if (startDate) params.start_date = startDate;
        if (endDate) params.end_date = endDate;
        if (selectedTags.length) params.tags = selectedTags.join(',');
        if (selectedMood) params.mood = selectedMood;

        const data = await listEntries(params);
        setEntries(prev => page === 1 ? (data.results || []) : [...prev, ...(data.results || [])]);
        setHasMore(!!data.next);
      } catch (err) {
        console.error("Failed to fetch entries:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, [page, keyword, startDate, endDate, selectedTags, selectedMood]);

  const handleClearFilters = () => {
    setKeyword("");
    setStartDate("");
    setEndDate("");
    setSelectedTags([]);
    setSelectedMood("");
    setEntries([]);
    setPage(1);
    setHasMore(true);
  };

  const toggleTag = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  function getPreview(content, maxLen = 200) {
    if (!content) return "";
    if (content.length <= maxLen) return content;
    return content.slice(0, maxLen) + "…";
  }

  const activeFilterCount = 
    (keyword ? 1 : 0) +
    (startDate ? 1 : 0) +
    (endDate ? 1 : 0) +
    (selectedTags.length > 0 ? 1 : 0) +
    (selectedMood ? 1 : 0);

  return (
    <div className="dashboard-container">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`main-area ${sidebarOpen ? '' : 'main-area-expanded'}`}>
        <div className="search-container">
          <h1 className="search-title">Search Entries</h1>
          
          <div className="search-filters">
            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="keyword-search">Keyword</label>
                <input
                  id="keyword-search"
                  type="text"
                  placeholder="Search title or content..."
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="start-date">Start Date</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="end-date">End Date</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label>Tags</label>
                <div className="tag-filter-list">
                  {allTags.map(tag => (
                    <button
                      key={tag.id}
                      className={`tag-filter-chip ${selectedTags.includes(tag.id) ? 'selected' : ''}`}
                      onClick={() => toggleTag(tag.id)}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="filter-row">
              <div className="filter-group">
                <label htmlFor="mood-filter">Mood</label>
                <select
                  id="mood-filter"
                  value={selectedMood}
                  onChange={(e) => setSelectedMood(e.target.value)}
                >
                  <option value="">All moods</option>
                  {MOOD_OPTIONS.map(mood => (
                    <option key={mood.value} value={mood.value}>{mood.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="filter-actions">
                <button className="clear-filters-button" onClick={handleClearFilters}>
                  Clear Filters ({activeFilterCount})
                </button>
              </div>
            )}
          </div>

          <div className="search-results">
            {entries.length === 0 && !loading ? (
              <p className="search-empty-state">
                No entries found.
              </p>
            ) : (
              <div className="search-results-list">
                {entries.map((entry, index) => {
                  const isLast = index === entries.length - 1;
                  return (
                    <div
                      key={entry.id}
                      ref={isLast ? lastEntryRef : null}
                      className="search-entry-card"
                      onClick={() => navigate(`/entries/${entry.id}/edit`)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/entries/${entry.id}/edit`);
                        }
                      }}
                    >
                      <div className="search-entry-header">
                        <h3 className="search-entry-title">{entry.title || "Untitled"}</h3>
                        <span className="search-entry-date">{formatDate(entry.date)}</span>
                      </div>
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="search-entry-tags">
                          {entry.tags.map(tag => (
                            <span key={tag.id} className="tag-badge">{tag.name}</span>
                          ))}
                        </div>
                      )}
                      <p className="search-entry-preview">{getPreview(entry.content)}</p>
                      <div className="search-entry-meta">
                        <span>{entry.word_count || 0} words</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {loading && <p className="search-loading">Loading...</p>}
            {!hasMore && entries.length > 0 && <p className="search-end">No more entries</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
