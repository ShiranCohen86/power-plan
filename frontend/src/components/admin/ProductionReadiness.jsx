import { useEffect, useState } from 'react';
import { getReadiness, getSystemHealth } from '../../api/admin.api';

export default function ProductionReadiness() {
  const [readiness, setReadiness] = useState(null);
  const [health,    setHealth]    = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([getReadiness(), getSystemHealth()])
      .then(([r, h]) => { setReadiness(r); setHealth(h); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading system status…</p>;

  return (
    <section className="prod-readiness">
      <h2 className="prod-readiness__title">System Status</h2>

      {health && (
        <div className={`prod-readiness__health prod-readiness__health--${health.status}`}>
          <span className="prod-readiness__health-dot" />
          <strong>System: {health.status}</strong>
          {' · '}DB: {health.db.connected ? '✅ connected' : '❌ disconnected'}
          {' · '}
          Running phases: {health.pipeline.running}
          {health.pipeline.stuck > 0 && <span style={{ color: 'var(--danger)' }}>{' · '}⚠️ {health.pipeline.stuck} stuck</span>}
          {' · '}Uptime: {Math.floor(health.process.uptimeSec / 60)}m
          {' · '}Heap: {health.process.memHeapMB}MB
        </div>
      )}

      {readiness && (
        <>
          <div className="prod-readiness__score">
            <span className={`prod-readiness__score-value ${readiness.ready ? 'prod-readiness__score-value--ok' : 'prod-readiness__score-value--warn'}`}>
              {readiness.score}%
            </span>
            <span className="prod-readiness__score-label">
              {readiness.ready ? '✅ Production ready' : '⚠️ Not ready for production'}
            </span>
          </div>

          <table className="prod-readiness__table">
            <tbody>
              {readiness.checks.map((c) => (
                <tr key={c.id} className={`prod-readiness__row${c.ok ? ' prod-readiness__row--ok' : c.optional ? ' prod-readiness__row--optional' : ' prod-readiness__row--fail'}`}>
                  <td className="prod-readiness__status">{c.ok ? '✅' : c.optional ? '⚪' : '❌'}</td>
                  <td className="prod-readiness__name">{c.name}</td>
                  <td className="prod-readiness__optional">{c.optional ? 'optional' : 'required'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
