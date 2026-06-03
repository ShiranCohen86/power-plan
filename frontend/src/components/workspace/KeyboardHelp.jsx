export default function KeyboardHelp({ onClose }) {
  const shortcuts = [
    { keys: 'Ctrl + Enter', desc: 'אשר שלב' },
    { keys: 'Ctrl + F',     desc: 'חפש במסמך' },
    { keys: '?',            desc: 'הצג קיצורי מקלדת' },
    { keys: 'Esc',          desc: 'סגור חיפוש / overlay' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px 28px', maxWidth: 360, width: '90%' }}
        onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <strong style={{ fontSize: 15 }}>⌨️ קיצורי מקלדת</strong>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <tbody>
            {shortcuts.map((s) => (
              <tr key={s.keys}>
                <td style={{ padding: '6px 0', fontFamily: 'monospace', background: 'var(--surface-3)', borderRadius: 4, paddingInline: 8, whiteSpace: 'nowrap', color: 'var(--text)' }}>
                  {s.keys}
                </td>
                <td style={{ padding: '6px 12px', color: 'var(--text-muted)' }}>{s.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
