import { useEffect } from 'react';

export default function BottomSheet({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="bsheet-overlay" onClick={onClose}>
      <div className="bsheet" onClick={(e) => e.stopPropagation()} dir="rtl">
        <div className="bsheet__handle" />
        <button className="bsheet__close" onClick={onClose} aria-label="סגור">✕</button>
        {children}
      </div>
    </div>
  );
}
