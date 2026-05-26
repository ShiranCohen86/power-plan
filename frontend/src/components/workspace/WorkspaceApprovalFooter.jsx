import { useState } from 'react';
import { PLANNING_PHASES } from '../../utils/phaseConfig';

const MAX_REFINES = 2;

export default function WorkspaceApprovalFooter({ phaseIndex, canApprove, refineCount, onApprove, onRefineSubmit }) {
  const [refineOpen, setRefineOpen] = useState(false);
  const [feedback, setFeedback]     = useState('');
  const [busy, setBusy]             = useState(false);

  const phase     = PLANNING_PHASES.find((p) => p.index === phaseIndex);
  const canRefine = refineCount < MAX_REFINES;

  async function handleRefine() {
    if (!feedback.trim()) return;
    setBusy(true);
    try {
      await onRefineSubmit(feedback);
      setFeedback('');
      setRefineOpen(false);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="workspace-approval-footer">
      {refineOpen && (
        <div className="workspace-approval-footer__refine">
          <textarea
            className="form-input"
            rows={3}
            placeholder="מה תרצה לשנות או להוסיף?"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            autoFocus
            dir="rtl"
          />
          <div className="workspace-approval-footer__refine-actions">
            <button className="btn btn--secondary" style={{ fontSize: 13 }} onClick={() => setRefineOpen(false)}>ביטול</button>
            <button
              className="btn btn--primary"
              style={{ fontSize: 13 }}
              disabled={busy || !feedback.trim()}
              onClick={handleRefine}
            >
              {busy ? 'שולח...' : 'שלח תיקון'}
            </button>
          </div>
        </div>
      )}

      <div className="workspace-approval-footer__bar">
        <div className="workspace-approval-footer__info">
          <span className="workspace-approval-footer__label">
            {phase?.icon || '💛'} {phase?.nameHe || `שלב ${phaseIndex + 1}`} הושלם
          </span>
          {refineCount > 0 && (
            <span className="workspace-approval-footer__refine-count">
              {refineCount}/{MAX_REFINES} תיקונים
            </span>
          )}
          {!canApprove && (
            <span className="workspace-approval-footer__hint">↓ גלול עד הסוף לקריאת המסמך</span>
          )}
        </div>

        <div className="workspace-approval-footer__actions">
          {!refineOpen && canRefine && (
            <button
              className="btn btn--secondary"
              style={{ fontSize: 13 }}
              onClick={() => setRefineOpen(true)}
            >
              💬 בקש שינוי ({MAX_REFINES - refineCount} נותרו)
            </button>
          )}
          <button
            className={`btn btn--primary workspace-approval-footer__approve${canApprove ? ' workspace-approval-footer__approve--unlocked' : ''}`}
            style={{ fontSize: 13 }}
            onClick={onApprove}
            disabled={!canApprove}
            title={!canApprove ? 'גלול עד הסוף לקריאת המסמך' : ''}
          >
            ✅ אשר והמשך
          </button>
        </div>
      </div>
    </div>
  );
}
