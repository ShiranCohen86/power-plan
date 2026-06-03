import { useEffect, useState } from 'react';
import { getDashboardStats } from '../../api/settings.api';

export default function DashboardStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { label: 'Total',    value: stats.total,  color: '#a78bfa' },
    { label: 'Live',     value: stats.live,   color: '#22c55e' },
    { label: 'Active',   value: stats.active, color: '#60a5fa' },
    { label: 'Failed',   value: stats.failed, color: '#f87171' },
  ];

  return (
    <div className="dashboard-stats">
      {items.map(({ label, value, color }) => (
        <div key={label} className="dashboard-stats__item">
          <span className="dashboard-stats__value" style={{ color }}>{value}</span>
          <span className="dashboard-stats__label">{label}</span>
        </div>
      ))}
    </div>
  );
}
