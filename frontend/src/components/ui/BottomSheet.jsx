import { useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function BottomSheet({ onClose, children }) {
  const { dir } = useLanguage();

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="bsheet-overlay" onClick={onClose}>
      <div className="bsheet" onClick={(e) => e.stopPropagation()} dir={dir}>
        <div className="bsheet__handle" />
        <button className="bsheet__close" onClick={onClose} aria-label="סגור">✕</button>
        {children}
      </div>
    </div>
  );
}
