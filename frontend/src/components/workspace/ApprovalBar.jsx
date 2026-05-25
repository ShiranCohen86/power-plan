export default function ApprovalBar({
  phaseIndex, refineCount, refineOpen, refineFeedback,
  onApprove, onRefineOpen, onRefineClose, onRefineFeedbackChange, onRefineSubmit,
}) {
  const maxRefines   = 2;
  const canRefine    = refineCount < maxRefines;

  return (
    <div className="approval-bar">
      <div className="approval-bar__info">
        <span className="approval-bar__label">💛 שלב {phaseIndex + 1} ממתין לאישורך</span>
        {refineCount > 0 && (
          <span className="approval-bar__refine-count">
            {refineCount}/{maxRefines} תיקונים שנעשו
          </span>
        )}
      </div>

      {refineOpen ? (
        <div className="approval-bar__refine">
          <textarea
            className="form-input"
            rows={3}
            placeholder="מה תרצה לשנות או להוסיף?"
            value={refineFeedback}
            onChange={(e) => onRefineFeedbackChange(e.target.value)}
            autoFocus
          />
          <div className="approval-bar__refine-actions">
            <button className="btn btn--secondary" onClick={onRefineClose}>ביטול</button>
            <button
              className="btn btn--primary"
              disabled={!refineFeedback.trim()}
              onClick={onRefineSubmit}
            >
              שלח תיקון
            </button>
          </div>
        </div>
      ) : (
        <div className="approval-bar__actions">
          {canRefine && (
            <button className="btn btn--secondary" onClick={onRefineOpen}>
              💬 בקש שינוי ({maxRefines - refineCount} נותרו)
            </button>
          )}
          <button className="btn btn--primary" onClick={onApprove}>
            ✅ אשר והמשך
          </button>
        </div>
      )}
    </div>
  );
}
