import { Link } from "react-router-dom";

export default function Sidebar() {
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
    <aside className="sidebar">
      <nav>
        <h3>Journal</h3>
        <ul>
          <li><Link to="/">Home</Link></li>
        </ul>
        <button onClick={handleLogout} className="logout-button">
          Log Out
        </button>
      </nav>
    </aside>
  );
}
