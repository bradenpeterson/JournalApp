import { useParams } from 'react-router-dom';

export default function EntryDetail() {
  const { id } = useParams();
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Entry {id}</h1>
      <p>Entry detail page coming soon.</p>
    </div>
  );
}
