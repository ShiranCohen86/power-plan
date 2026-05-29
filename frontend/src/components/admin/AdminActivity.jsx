import { useTranslation } from 'react-i18next';

const PAGE_SIZE = 20;

export default function AdminActivity({ activity, activityPage, activityTotal, onPageChange }) {
  const { t } = useTranslation();
  if (!activity.length) return null;

  const totalPages = Math.ceil(activityTotal / PAGE_SIZE);

  return (
    <section className="admin-section">
      <h2 className="admin-section__title">
        {t('admin.recentActivity')}
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginRight: 8 }}>({activityTotal} סה"כ)</span>
      </h2>

      <div className="admin-activity">
        {activity.map((log, i) => (
          <div key={i} className="admin-activity-row">
            <span className="admin-activity-agent">{log.agentName}</span>
            <span className="admin-activity-event">{log.event}</span>
            <span className="admin-activity-time">{new Date(log.timestamp).toLocaleTimeString('he-IL')}</span>
          </div>
        ))}
      </div>

      {activityTotal > PAGE_SIZE && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, justifyContent: 'center' }}>
          <button
            className="btn btn--secondary"
            style={{ fontSize: 12, padding: '4px 12px' }}
            disabled={activityPage <= 1}
            onClick={() => onPageChange(activityPage - 1)}
          >
            ← הקודם
          </button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            עמוד {activityPage} / {totalPages}
          </span>
          <button
            className="btn btn--secondary"
            style={{ fontSize: 12, padding: '4px 12px' }}
            disabled={activityPage >= totalPages}
            onClick={() => onPageChange(activityPage + 1)}
          >
            הבא →
          </button>
        </div>
      )}
    </section>
  );
}
