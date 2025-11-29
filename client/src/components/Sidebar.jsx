export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>
        <h3>Journal</h3>
        <ul>
          <li><a href="/">Home</a></li>
          <li><a href="/entries/new">New Entry</a></li>
        </ul>
      </nav>
    </aside>
  );
}
