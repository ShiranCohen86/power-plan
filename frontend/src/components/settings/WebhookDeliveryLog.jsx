import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getWebhookDeliveries, testWebhook } from '../../api/settings.api';

const STATUS_EMOJI = { true: '✅', false: '❌' };

export default function WebhookDeliveryLog() {
  const [logs,    setLogs]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    getWebhookDeliveries()
      .then(setLogs)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleTest() {
    setTesting(true);
    try {
      const result = await testWebhook();
      if (result.success) toast.success('Test webhook delivered successfully');
      else toast.error(`Webhook test failed: ${result.error || result.statusCode}`);
      getWebhookDeliveries().then(setLogs).catch(() => {});
    } catch { toast.error('Could not send test webhook'); }
    finally { setTesting(false); }
  }

  if (loading) return <p>Loading delivery log…</p>;

  return (
    <div className="webhook-delivery-log">
      <div className="webhook-delivery-log__header">
        <h4>Delivery History</h4>
        <button className="btn btn--sm" onClick={handleTest} disabled={testing}>
          {testing ? 'Sending…' : 'Send test event'}
        </button>
      </div>

      {!logs.length ? (
        <p className="webhook-delivery-log__empty">No deliveries yet.</p>
      ) : (
        <table className="delivery-table">
          <thead>
            <tr>
              <th>Status</th><th>Event</th><th>Code</th><th>Attempt</th><th>Duration</th><th>Time</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className={`delivery-row delivery-row--${log.success ? 'ok' : 'fail'}`}>
                <td>{STATUS_EMOJI[log.success]}</td>
                <td className="delivery-row__event">{log.event}</td>
                <td>{log.statusCode || '—'}</td>
                <td>{log.attempt}</td>
                <td>{log.duration ? `${log.duration}ms` : '—'}</td>
                <td>{new Date(log.createdAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
