/**
 * Sprint 129: Shows avatars of users currently viewing the workspace.
 */
export default function PresenceIndicators({ viewers = [] }) {
  if (!viewers.length) return null;

  const MAX_SHOW = 4;
  const visible  = viewers.slice(0, MAX_SHOW);
  const overflow = viewers.length - MAX_SHOW;

  return (
    <div className="presence-indicators" role="status" aria-label={`${viewers.length} viewer(s) here`}>
      {visible.map((v, i) => (
        <div key={v.userId + i} className="presence-avatar" title={v.name} aria-hidden="true">
          {v.name?.[0]?.toUpperCase() || '?'}
        </div>
      ))}
      {overflow > 0 && (
        <div className="presence-avatar presence-avatar--overflow" title={`${overflow} more`}>
          +{overflow}
        </div>
      )}
    </div>
  );
}
