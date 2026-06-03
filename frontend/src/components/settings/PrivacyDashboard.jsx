import { useEffect, useState } from 'react';
import { getPrivacySummary, exportMyData, exportMyDataZip } from '../../api/settings.api';

export default function PrivacyDashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    getPrivacySummary().then(setSummary).catch(() => {});
  }, []);

  if (!summary) return <p>Loading privacy summary…</p>;

  const { account, data, controls } = summary;

  return (
    <section className="privacy-dashboard">
      <h3 className="privacy-dashboard__title">Your Privacy</h3>

      <div className="privacy-section">
        <h4>Account</h4>
        <ul className="privacy-list">
          <li><strong>Name:</strong> {account.name}</li>
          <li><strong>Email:</strong> {account.email}</li>
          <li><strong>Member since:</strong> {new Date(account.createdAt).toLocaleDateString()}</li>
          <li><strong>Auth methods:</strong> {account.authMethods?.join(', ')}</li>
          <li><strong>Active sessions:</strong> {account.sessionsCount}</li>
        </ul>
      </div>

      <div className="privacy-section">
        <h4>Data We Store</h4>
        <ul className="privacy-list">
          <li><strong>Projects:</strong> {data.projects}</li>
          <li><strong>Notifications:</strong> {data.notifications}</li>
          <li><strong>Audit log entries:</strong> {data.auditLogEntries}</li>
          <li><strong>Generated files:</strong> {data.generatedFiles}</li>
          <li><strong>Data retention:</strong> {controls.dataRetentionDays} days after deletion</li>
        </ul>
      </div>

      <div className="privacy-section">
        <h4>Your Controls</h4>
        <div className="privacy-controls">
          {controls.canExportData && (
            <>
              <a href={exportMyData()} download="my-data-export.json" className="btn btn--sm">
                📄 Download JSON
              </a>
              <a href={exportMyDataZip()} download="my-account-export.zip" className="btn btn--sm btn--secondary">
                🗜️ Download ZIP
              </a>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
