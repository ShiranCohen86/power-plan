import { useTranslation } from 'react-i18next';

const PHASE_LABELS = {
  idea_understanding: 'Idea Analysis',   product_discovery: 'Product Discovery',
  market_analysis:    'Market Analysis', ux_architecture:   'UX Architecture',
  tech_architecture:  'Tech Architecture', system_design:   'System Design',
  database_design:    'DB Design',        ai_agent_system:  'AI Agent System',
  orchestration:      'Orchestration',    dev_planning:     'Dev Planning',
  qa_strategy:        'QA Strategy',      devops_strategy:  'DevOps Strategy',
};

function StatCard({ label, value, icon }) {
  return (
    <div className="admin-stat">
      <div className="admin-stat__icon">{icon}</div>
      <div className="admin-stat__value">{value ?? '—'}</div>
      <div className="admin-stat__label">{label}</div>
    </div>
  );
}

export default function AdminAnalytics({ analytics }) {
  const { t } = useTranslation();
  if (!analytics) return null;

  const maxTokens = analytics.avgTokensByPhase?.[0]?.avgTokens || 1;

  return (
    <section className="admin-section">
      <h2 className="admin-section__title">📈 Pipeline Analytics</h2>

      <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
        <StatCard icon="✅" label={t('admin.completionRate')} value={`${analytics.completionRate}%`} />
        <StatCard icon="🌐" label={t('admin.liveAppsRate')}   value={analytics.liveProjects} />
        <StatCard icon="❌" label={t('admin.failedProjects')} value={analytics.failedProjects} />
        <StatCard icon="📁" label={t('admin.totalProjects')}  value={analytics.totalProjects} />
      </div>

      {analytics.avgTokensByPhase?.length > 0 && (
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: 'var(--text-muted)' }}>
            {t('admin.avgTokens')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {analytics.avgTokensByPhase.map((p) => {
              const pct = Math.round((p.avgTokens / maxTokens) * 100);
              return (
                <div key={p._id} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 160, color: 'var(--text-muted)', textAlign: 'right', flexShrink: 0 }}>
                    {PHASE_LABELS[p._id] || p._id}
                  </span>
                  <div style={{ flex: 1, background: 'var(--surface-2)', borderRadius: 4, height: 8 }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'var(--brand-primary)' }} />
                  </div>
                  <span style={{ width: 70, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>
                    {Math.round(p.avgTokens).toLocaleString()}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>×{p.count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
