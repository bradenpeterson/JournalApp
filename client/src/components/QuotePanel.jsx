import QUOTES from "../data/quotes";

function pickQuoteForDate(dateString) {
  const s = dateString || new Date().toISOString().slice(0, 10);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) | 0;
  }
  const idx = Math.abs(hash) % QUOTES.length;
  return QUOTES[idx];
}

export default function QuotePanel({ selectedDate }) {
  const dateStr = selectedDate ? selectedDate.slice(0, 10) : new Date().toISOString().slice(0, 10);
  const quote = pickQuoteForDate(dateStr);

  return (
    <div className="panel quote-panel">
      <h3>Quote of the Day</h3>
      <blockquote className="quote-text">{quote}</blockquote>
    </div>
  );
}
