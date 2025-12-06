import { Link } from "react-router-dom";

export default function Sidebar({ isOpen, onToggle }) {
  const handleLogout = async () => {
    try {
      await fetch('/api-auth/logout/', {
        method: 'POST',
        credentials: 'include',
      });
      window.location.href = '/registration/sign_in/';
    } catch (err) {
      console.error('Logout failed', err);
    }
  };

  return (
    <>
      <button 
        className={`sidebar-toggle ${isOpen ? '' : 'sidebar-toggle-closed'}`}
        onClick={onToggle} 
        aria-label="Toggle sidebar" 
        title="Toggle sidebar"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          {isOpen ? (
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          ) : (
            <path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
          )}
        </svg>
      </button>
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <nav>
          <h3 className="sidebar-title">Journal</h3>
          <ul>
            <li className="sidebar-link"><Link to="/">Home</Link></li>
            <li className="sidebar-link"><Link to="/search">Search</Link></li>
            <li className="sidebar-link"><Link to="/entries">All Entries</Link></li>
          </ul>
          <button onClick={handleLogout} className="logout-button">
            Log Out
          </button>
        </nav>
      </aside>
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}
    </>
  );
}
