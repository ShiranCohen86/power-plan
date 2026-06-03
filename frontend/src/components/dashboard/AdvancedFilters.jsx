import { useState } from 'react';

export default function AdvancedFilters({ onApply, onReset }) {
  const [fromDate,      setFromDate]      = useState('');
  const [toDate,        setToDate]        = useState('');
  const [completionMin, setCompletionMin] = useState('');
  const [completionMax, setCompletionMax] = useState('');
  const [open,          setOpen]          = useState(false);

  const hasFilters = fromDate || toDate || completionMin !== '' || completionMax !== '';

  function handleApply() {
    onApply({ fromDate, toDate, completionMin, completionMax });
    setOpen(false);
  }

  function handleReset() {
    setFromDate(''); setToDate(''); setCompletionMin(''); setCompletionMax('');
    onReset();
    setOpen(false);
  }

  return (
    <div className="advanced-filters">
      <button
        className={`advanced-filters__toggle${hasFilters ? ' advanced-filters__toggle--active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        🔧 {hasFilters ? 'Filters active' : 'Advanced filters'}
      </button>

      {open && (
        <div className="advanced-filters__panel" role="group" aria-label="Advanced filters">
          <div className="advanced-filters__row">
            <label className="advanced-filters__label">Created from</label>
            <input type="date" className="advanced-filters__input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <label className="advanced-filters__label">to</label>
            <input type="date" className="advanced-filters__input" value={toDate}   onChange={(e) => setToDate(e.target.value)} />
          </div>
          <div className="advanced-filters__row">
            <label className="advanced-filters__label">Completion</label>
            <input type="number" className="advanced-filters__input advanced-filters__input--short" min="0" max="100" placeholder="Min%" value={completionMin} onChange={(e) => setCompletionMin(e.target.value)} />
            <span className="advanced-filters__sep">–</span>
            <input type="number" className="advanced-filters__input advanced-filters__input--short" min="0" max="100" placeholder="Max%" value={completionMax} onChange={(e) => setCompletionMax(e.target.value)} />
            <span className="advanced-filters__unit">%</span>
          </div>
          <div className="advanced-filters__actions">
            <button className="btn btn--sm" onClick={handleApply}>Apply</button>
            <button className="btn btn--sm btn--ghost" onClick={handleReset}>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}
