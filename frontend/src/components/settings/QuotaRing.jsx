/**
 * Sprint 113: SVG ring chart showing quota usage %.
 */
export default function QuotaRing({ used = 0, total = 1, label = 'used', size = 80 }) {
  const pct  = Math.min(100, total > 0 ? (used / total) * 100 : 0);
  const r    = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 80 ? '#f87171' : pct >= 60 ? '#fbbf24' : '#22c55e';
  const cx   = size / 2;

  return (
    <div className="quota-ring" role="img" aria-label={`${Math.round(pct)}% ${label}`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--surface-4)" strokeWidth="8" />
        <circle
          cx={cx} cy={cx} r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <div className="quota-ring__center">
        <span className="quota-ring__pct" style={{ color }}>{Math.round(pct)}%</span>
        <span className="quota-ring__label">{label}</span>
      </div>
    </div>
  );
}
