import { useState } from 'react';
import toast from 'react-hot-toast';
import { enableShare, disableShare, regenerateShareToken } from '../../api/projects.api';

export default function ShareModal({ project, onClose }) {
  const [shareEnabled, setShareEnabled]   = useState(project.shareEnabled || false);
  const [shareToken,   setShareToken]     = useState(project.shareToken   || null);
  const [loading,      setLoading]        = useState(false);

  const shareUrl = shareToken
    ? `${window.location.origin}/share/${shareToken}`
    : null;

  async function handleEnable() {
    setLoading(true);
    try {
      const res = await enableShare(project._id);
      setShareEnabled(res.shareEnabled);
      setShareToken(res.shareToken);
      toast.success('Share link enabled');
    } catch { toast.error('Failed to enable share'); }
    finally { setLoading(false); }
  }

  async function handleDisable() {
    setLoading(true);
    try {
      await disableShare(project._id);
      setShareEnabled(false);
      toast.success('Share link disabled');
    } catch { toast.error('Failed to disable share'); }
    finally { setLoading(false); }
  }

  async function handleRegenerate() {
    if (!window.confirm('Regenerate share link? The old link will stop working.')) return;
    setLoading(true);
    try {
      const res = await regenerateShareToken(project._id);
      setShareToken(res.shareToken);
      toast.success('Share link regenerated');
    } catch { toast.error('Failed to regenerate link'); }
    finally { setLoading(false); }
  }

  function copyLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl).then(() => toast.success('Copied!')).catch(() => toast.error('Could not copy'));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Share project">
        <div className="modal-header">
          <h2 className="modal-title">Share Project</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="share-modal__body">
          <p className="share-modal__desc">
            Share a read-only link to your project. Anyone with the link can view phases and documents.
          </p>

          {shareEnabled && shareUrl ? (
            <div className="share-modal__link-row">
              <input className="share-modal__link-input" value={shareUrl} readOnly onClick={(e) => e.target.select()} />
              <button className="btn btn--sm" onClick={copyLink}>Copy</button>
            </div>
          ) : (
            <p className="share-modal__disabled-hint">Share link is currently disabled.</p>
          )}

          <div className="share-modal__actions">
            {!shareEnabled ? (
              <button className="btn" onClick={handleEnable} disabled={loading}>Enable sharing</button>
            ) : (
              <>
                <button className="btn btn--danger" onClick={handleDisable} disabled={loading}>Disable sharing</button>
                <button className="btn btn--ghost" onClick={handleRegenerate} disabled={loading}>Regenerate link</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
