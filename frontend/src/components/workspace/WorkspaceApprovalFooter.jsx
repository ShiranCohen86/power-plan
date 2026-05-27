import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { PLANNING_PHASES } from '../../utils/phaseConfig';

const MAX_REFINES = 2;

export default function WorkspaceApprovalFooter({ phaseIndex, canApprove, refineCount, onApprove, onRefineSubmit }) {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const [refineOpen, setRefineOpen] = useState(false);
  const [feedback, setFeedback]     = useState('');
  const [busy, setBusy]             = useState(false);

  const phase     = PLANNING_PHASES.find((p) => p.index === phaseIndex);
  const canRefine = refineCount < MAX_REFINES;
  const phaseName = phase ? (lang === 'he' ? phase.nameHe : phase.name) : `Phase ${phaseIndex + 1}`;

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
            placeholder={t('workspace.approval.placeholder')}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            autoFocus
          />
          <div className="workspace-approval-footer__refine-actions">
            <button className="btn btn--secondary" style={{ fontSize: 13 }} onClick={() => setRefineOpen(false)}>{t('common.cancel')}</button>
            <button
              className="btn btn--primary"
              style={{ fontSize: 13 }}
              disabled={busy || !feedback.trim()}
              onClick={handleRefine}
            >
              {busy ? t('workspace.approval.sending') : t('workspace.approval.sendRefine')}
            </button>
          </div>
        </div>
      )}

      <div className="workspace-approval-footer__bar">
        <div className="workspace-approval-footer__info">
          <span className="workspace-approval-footer__label">
            {phase?.icon || '💛'} {t('workspace.approval.phaseCompleted', { name: phaseName })}
          </span>
          {refineCount > 0 && (
            <span className="workspace-approval-footer__refine-count">
              {t('workspace.approval.refinesDone', { count: refineCount, max: MAX_REFINES })}
            </span>
          )}
          {!canApprove && (
            <span className="workspace-approval-footer__hint">{t('workspace.approval.scrollHint')}</span>
          )}
        </div>

        <div className="workspace-approval-footer__actions">
          {!refineOpen && canRefine && (
            <button
              className="btn btn--secondary"
              style={{ fontSize: 13 }}
              onClick={() => setRefineOpen(true)}
            >
              {t('workspace.approval.requestChange', { count: MAX_REFINES - refineCount })}
            </button>
          )}
          <button
            className={`btn btn--primary workspace-approval-footer__approve${canApprove ? ' workspace-approval-footer__approve--unlocked' : ''}`}
            style={{ fontSize: 13 }}
            onClick={onApprove}
            disabled={!canApprove}
            title={!canApprove ? t('workspace.approval.scrollHint') : ''}
          >
            {t('workspace.approval.approve')}
          </button>
        </div>
      </div>
    </div>
  );
}
