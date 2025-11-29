import { useSearchParams } from 'react-router-dom';

export default function EntryEditor() {
  const [params] = useSearchParams();
  const date = params.get('date');
  return (
    <div style={{ padding: '2rem' }}>
      <h1>New Entry{date && ` for ${date}`}</h1>
      <p>Entry editor page coming soon.</p>
    </div>
  );
}
