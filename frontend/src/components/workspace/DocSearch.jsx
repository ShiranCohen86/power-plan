import { useState, useRef, useEffect } from 'react';

export default function DocSearch({ content, onClose }) {
  const [query, setQuery]       = useState('');
  const [current, setCurrent]   = useState(0);
  const [matches, setMatches]   = useState([]);
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    if (!query.trim() || !content) { setMatches([]); setCurrent(0); return; }
    const q   = query.toLowerCase();
    const hits = [];
    let idx   = 0;
    const src  = content.toLowerCase();
    while ((idx = src.indexOf(q, idx)) !== -1) {
      hits.push(idx);
      idx++;
    }
    setMatches(hits);
    setCurrent(0);
  }, [query, content]);

  function navigate(dir) {
    if (!matches.length) return;
    setCurrent((c) => (c + dir + matches.length) % matches.length);
  }

  useEffect(() => {
    if (!matches.length) return;
    const pos = matches[current];
    // Highlight by scrolling the workspace-main div to the match position
    const el = document.querySelector('.workspace-main');
    if (!el) return;
    const textNodes = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) textNodes.push(node);
    let count = 0;
    for (const n of textNodes) {
      if (count + n.length > pos) {
        const range = document.createRange();
        range.setStart(n, pos - count);
        range.setEnd(n, Math.min(pos - count + query.length, n.length));
        range.startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
      count += n.length;
    }
  }, [current, matches]);

  return (
    <div style={{ position: 'absolute', top: 8, insetInlineEnd: 8, zIndex: 100, display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 8px', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') navigate(e.shiftKey ? -1 : 1);
          if (e.key === 'Escape') onClose();
        }}
        placeholder="חיפוש במסמך..."
        style={{ fontSize: 13, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', width: 160 }}
        dir="rtl"
      />
      {matches.length > 0 && (
        <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
          {current + 1}/{matches.length}
        </span>
      )}
      <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>▲</button>
      <button onClick={() => navigate(1)}  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 12 }}>▼</button>
      <button onClick={onClose}            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 14 }}>✕</button>
    </div>
  );
}
