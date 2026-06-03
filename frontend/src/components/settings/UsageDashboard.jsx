import { useEffect, useState } from 'react';
import { getUsage } from '../../api/settings.api';

const BAR_MAX_WIDTH = 200;

function UsageBar({ tokens, maxTokens }) {
  const pct = maxTokens > 0 ? Math.min(100, (tokens / maxTokens) * 100) : 0;
  const color = pct >= 80 ? '#f87171' : pct >= 60 ? '#fbbf24' : '#22c55e';
  return (
    <div className="usage-bar" aria-label={`${Math.round(pct)}% used`}>
      <div className="usage-bar__fill" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export default function UsageDashboard() {
  const [usage,   setUsage]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsage().then((d) => { setUsage(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="usage-dashboard__loading">Loading usage…</div>;
  if (!usage)  return null;

  const maxTokens = usage.month || 1;

  return (
    <section className="usage-dashboard">
      <h3 className="usage-dashboard__title">Token Usage</h3>

      <div className="usage-stats-grid">
        {[
          { label: 'Today',    value: usage.today   },
          { label: 'This Week',value: usage.week    },
          { label: 'This Month',value: usage.month  },
          { label: 'All Time', value: usage.allTime },
        ].map(({ label, value }) => (
          <div key={label} className="usage-stat-card">
            <span className="usage-stat-card__value">{value?.toLocaleString()}</span>
            <span className="usage-stat-card__label">{label}</span>
          </div>
        ))}
      </div>

      {usage.usdAllTime != null && (
        <p className="usage-dashboard__cost">
          Estimated cost (all time): <strong>${usage.usdAllTime.toFixed(4)}</strong>
        </p>
      )}

      {usage.daily?.length > 0 && (
        <div className="usage-daily-chart">
          <h4 className="usage-daily-chart__title">Daily (last 7 days)</h4>
          <div className="usage-daily-chart__bars">
            {usage.daily.map((d) => {
              const h = Math.round((d.tokens / (Math.max(...usage.daily.map((x) => x.tokens)) || 1)) * 80);
              return (
                <div key={d.date} className="usage-daily-bar" title={`${d.date}: ${d.tokens} tokens`}>
                  <div className="usage-daily-bar__fill" style={{ height: `${h}px` }} />
                  <span className="usage-daily-bar__label">{d.date.slice(5)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {usage.byProject?.length > 0 && (
        <div className="usage-by-project">
          <h4 className="usage-by-project__title">By Project</h4>
          <ul className="usage-by-project__list">
            {usage.byProject.slice(0, 10).map((p) => (
              <li key={p.projectId} className="usage-project-row">
                <span className="usage-project-row__title">{p.title}</span>
                <UsageBar tokens={p.tokens} maxTokens={usage.allTime} />
                <span className="usage-project-row__tokens">{p.tokens.toLocaleString()}</span>
                <span className="usage-project-row__usd">${p.usd.toFixed(4)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
