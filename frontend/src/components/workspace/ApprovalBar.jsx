import { useTranslation } from 'react-i18next';

export default function ApprovalBar({
  phaseIndex, refineCount, refineOpen, refineFeedback,
  onApprove, onRefineOpen, onRefineClose, onRefineFeedbackChange, onRefineSubmit,
}) {
  const { t } = useTranslation();
  const maxRefines   = 2;
  const canRefine    = refineCount < maxRefines;

  return (
    <div className="approval-bar">
      <div className="approval-bar__info">
        <span className="approval-bar__label">{t('workspace.approval.awaitingPhase', { num: phaseIndex + 1 })}</span>
        {refineCount > 0 && (
          <span className="approval-bar__refine-count">
            {t('workspace.approval.refinesDone', { count: refineCount, max: maxRefines })}
          </span>
        )}
      </div>

      {refineOpen ? (
        <div className="approval-bar__refine">
          <textarea
            className="form-input"
            rows={3}
            placeholder={t('workspace.approval.placeholder')}
            value={refineFeedback}
            onChange={(e) => onRefineFeedbackChange(e.target.value)}
            autoFocus
          />
          <div className="approval-bar__refine-actions">
            <button className="btn btn--secondary" onClick={onRefineClose}>{t('common.cancel')}</button>
            <button
              className="btn btn--primary"
              disabled={!refineFeedback.trim()}
              onClick={onRefineSubmit}
            >
              {t('workspace.approval.sendRefine')}
            </button>
          </div>
        </div>
      ) : (
        <div className="approval-bar__actions">
          {canRefine && (
            <button className="btn btn--secondary" onClick={onRefineOpen}>
              {t('workspace.approval.requestChange', { count: maxRefines - refineCount })}
            </button>
          )}
          <button className="btn btn--primary" onClick={onApprove}>
            {t('workspace.approval.approve')}
          </button>
        </div>
      )}
    </div>
  );
}
