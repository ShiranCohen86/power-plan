import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { listApiKeys, createApiKey, revokeApiKey } from '../../api/settings.api';

export default function ApiKeysSection() {
  const [keys,     setKeys]     = useState([]);
  const [name,     setName]     = useState('');
  const [newKey,   setNewKey]   = useState(null);
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    listApiKeys().then(setKeys).catch(() => {});
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const key = await createApiKey(name.trim());
      setKeys((prev) => [...prev, { _id: key.id, name: key.name, prefix: key.prefix }]);
      setNewKey(key.key); // show raw key once
      setName('');
    } catch (err) { toast.error(err.message || 'Failed to create key'); }
    finally { setLoading(false); }
  }

  async function handleRevoke(id) {
    if (!window.confirm('Revoke this API key?')) return;
    try {
      await revokeApiKey(id);
      setKeys((prev) => prev.filter((k) => k._id !== id));
      toast.success('API key revoked');
    } catch { toast.error('Failed to revoke key'); }
  }

  return (
    <section className="api-keys-section">
      <h3 className="api-keys-section__title">Public API Keys</h3>
      <p className="api-keys-section__desc">
        Use API keys to access your projects via the Power Plan REST API.
      </p>

      {newKey && (
        <div className="api-keys-section__new-key-banner" role="alert">
          <strong>Copy this key now — it won't be shown again:</strong>
          <code className="api-keys-section__raw-key">{newKey}</code>
          <button className="btn btn--sm" onClick={() => { navigator.clipboard.writeText(newKey).then(() => toast.success('Copied!')); }}>Copy</button>
          <button className="api-keys-section__dismiss" onClick={() => setNewKey(null)}>Dismiss</button>
        </div>
      )}

      <form className="api-keys-section__form" onSubmit={handleCreate}>
        <input
          className="api-keys-section__input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name (e.g. My CLI)"
          maxLength={64}
        />
        <button className="btn" type="submit" disabled={loading || !name.trim()}>
          Create key
        </button>
      </form>

      {keys.length > 0 && (
        <table className="api-keys-table">
          <thead><tr><th>Name</th><th>Prefix</th><th>Last used</th><th></th></tr></thead>
          <tbody>
            {keys.map((k) => (
              <tr key={k._id}>
                <td>{k.name}</td>
                <td><code>{k.prefix}…</code></td>
                <td>{k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}</td>
                <td><button className="btn btn--sm btn--danger" onClick={() => handleRevoke(k._id)}>Revoke</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
