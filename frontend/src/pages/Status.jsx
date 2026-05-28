import { useState, useEffect } from 'react';
import { safeRequest } from '../api/request';

const CHECK = [
  { key: 'api',    label: 'API Server',    url: '/health' },
  { key: 'db',     label: 'Database',      url: '/health/db' },
  { key: 'claude', label: 'Claude AI',     url: '/health/claude' },
];

function StatusDot({ ok }) {
  return (
    <span style={{
      display: 'inline-block', width: 10, height: 10, borderRadius: '50%',
      background: ok === null ? '#64748b' : ok ? '#22c55e' : '#ef4444',
      marginLeft: 8,
    }} />
  );
}

export default function Status() {
  const [checks, setChecks] = useState(() => CHECK.reduce((acc, c) => ({ ...acc, [c.key]: null }), {}));
  const [lastChecked, setLastChecked] = useState(null);

  async function runChecks() {
    const results = {};
    await Promise.all(CHECK.map(async (c) => {
      try {
        const data = await safeRequest({ method: 'get', url: c.url });
        results[c.key] = data.ok !== false;
      } catch {
        results[c.key] = false;
      }
    }));
    setChecks(results);
    setLastChecked(new Date());
  }

  useEffect(() => { runChecks(); }, []);

  const allOk = Object.values(checks).every((v) => v === true);

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        ⚡ Power Plan — System Status
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 32 }}>
        {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : 'Checking...'}
      </p>

      <div style={{ background: '#111118', borderRadius: 12, border: '1px solid #1e1e2e', overflow: 'hidden' }}>
        {CHECK.map((c, i) => (
          <div key={c.key} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 20px', borderBottom: i < CHECK.length - 1 ? '1px solid #1e1e2e' : 'none',
          }}>
            <span style={{ fontSize: 14, color: '#e2e8f0' }}>{c.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
              <span style={{ color: checks[c.key] === null ? '#64748b' : checks[c.key] ? '#22c55e' : '#ef4444' }}>
                {checks[c.key] === null ? 'Checking' : checks[c.key] ? 'Operational' : 'Down'}
              </span>
              <StatusDot ok={checks[c.key]} />
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', padding: '8px 20px', borderRadius: 8,
          background: allOk ? 'rgba(34,197,94,.12)' : 'rgba(239,68,68,.12)',
          color: allOk ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600,
        }}>
          {allOk ? 'All Systems Operational' : 'Service Degradation Detected'}
        </div>
      </div>

      <div style={{ marginTop: 20, textAlign: 'center' }}>
        <button
          onClick={runChecks}
          style={{ background: 'none', border: '1px solid #1e1e2e', borderRadius: 8, padding: '8px 16px', color: '#94a3b8', cursor: 'pointer', fontSize: 13 }}
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
