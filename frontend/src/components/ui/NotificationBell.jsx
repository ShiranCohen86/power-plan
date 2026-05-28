import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectNotifications, selectUnreadCount,
  fetchNotifications, doMarkRead, doMarkAllRead,
} from '../../store/slices/notificationsSlice';

const TYPE_ICON = {
  deployment_success: '🎉',
  quota_exhausted:    '⚠️',
  phase_failed:       '❌',
  pipeline_complete:  '✅',
  info:               'ℹ️',
};

function timeAgo(dateStr) {
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)   return 'עכשיו';
  if (secs < 3600) return `לפני ${Math.floor(secs / 60)} דק'`;
  if (secs < 86400) return `לפני ${Math.floor(secs / 3600)} ש'`;
  return `לפני ${Math.floor(secs / 86400)} ימים`;
}

export default function NotificationBell() {
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const notifications  = useSelector(selectNotifications);
  const unreadCount    = useSelector(selectUnreadCount);
  const [open, setOpen] = useState(false);
  const panelRef        = useRef();

  // Load on mount
  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleClick(notif) {
    if (!notif.read) dispatch(doMarkRead(notif._id));
    if (notif.url) {
      // External URL (live app) → new tab; internal → navigate
      if (notif.url.startsWith('http')) {
        window.open(notif.url, '_blank', 'noreferrer');
      } else {
        navigate(notif.url);
      }
    }
  }

  return (
    <div className="notif-bell-wrap" ref={panelRef}>
      <button
        className="notif-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label="התראות"
      >
        🔔
        {unreadCount > 0 && (
          <span className="notif-bell-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="notif-panel">
          <div className="notif-panel__header">
            <span className="notif-panel__title">התראות</span>
            <div className="notif-panel__actions">
              {unreadCount > 0 && (
                <button
                  className="notif-panel__mark-all"
                  onClick={() => dispatch(doMarkAllRead())}
                >
                  סמן הכל כנקרא
                </button>
              )}
              <button className="notif-panel__close" onClick={() => setOpen(false)} aria-label="סגור">✕</button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="notif-panel__empty">אין התראות</div>
          ) : (
            <ul className="notif-list">
              {notifications.map((n) => (
                <li
                  key={n._id}
                  className={`notif-item${n.read ? '' : ' notif-item--unread'}`}
                  onClick={() => handleClick(n)}
                >
                  <span className="notif-item__icon">{TYPE_ICON[n.type] || 'ℹ️'}</span>
                  <div className="notif-item__body">
                    <div className="notif-item__title">{n.title}</div>
                    {n.message && <div className="notif-item__msg">{n.message}</div>}
                    <div className="notif-item__time">{timeAgo(n.createdAt)}</div>
                  </div>
                  {!n.read && <span className="notif-item__dot" />}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
