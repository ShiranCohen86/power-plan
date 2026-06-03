import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import * as adminApi from '../../api/admin.api';

export default function AdminUsers() {
  const { t } = useTranslation();
  const [users, setUsers]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [page,  setPage]      = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);

  async function load(pg = 1, q = search) {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({ page: pg, limit: 20, search: q });
      setUsers(res.users || []);
      setTotal(res.total || 0);
      setPage(pg);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(1, ''); }, []);

  async function toggleActive(user) {
    await adminApi.updateUser(user._id, { isActive: !user.isActive });
    setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, isActive: !u.isActive } : u));
  }

  async function changeRole(user, role) {
    await adminApi.updateUser(user._id, { role });
    setUsers((prev) => prev.map((u) => u._id === user._id ? { ...u, role } : u));
  }

  return (
    <section className="admin-section">
      <h2 className="admin-section__title">👤 User Management ({total})</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input type="search" value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(1, search)}
          placeholder="Search by name or email..."
          style={{ flex: 1, minWidth: 200, fontSize: 13, padding: '6px 10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)' }} />
        <button className="btn btn--secondary" onClick={() => load(1, search)} style={{ fontSize: 12 }}>Search</button>
      </div>

      {loading ? <div className="pwa-spinner" style={{ margin: '20px auto' }} /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {users.map((u) => (
            <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{u.email}</div>
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {u.projectCount} projects
              </span>
              <select value={u.role} onChange={(e) => changeRole(u, e.target.value)}
                style={{ fontSize: 12, background: 'var(--surface-3)', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--text)', padding: '2px 6px' }}>
                <option value="client">client</option>
                <option value="admin">admin</option>
              </select>
              <button
                onClick={() => toggleActive(u)}
                className={`btn ${u.isActive ? 'btn--secondary' : 'btn--primary'}`}
                style={{ fontSize: 11, padding: '3px 10px' }}>
                {u.isActive ? 'Deactivate' : 'Activate'}
              </button>
            </div>
          ))}
        </div>
      )}

      {total > 20 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'center' }}>
          <button className="btn btn--secondary" onClick={() => load(page - 1)} disabled={page <= 1} style={{ fontSize: 12 }}>← Prev</button>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Page {page}</span>
          <button className="btn btn--secondary" onClick={() => load(page + 1)} disabled={users.length < 20} style={{ fontSize: 12 }}>Next →</button>
        </div>
      )}
    </section>
  );
}
