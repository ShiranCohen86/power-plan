import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateApiKey, validateApiKey } from '../../api/settings.api.js';

export default function ApiKeyPrompt() {
  const navigate = useNavigate();

  const [apiKeyInput,      setApiKeyInput]      = useState('');
  const [isBusy,           setIsBusy]           = useState(false);
  const [isValidating,     setIsValidating]     = useState(false);
  const [error,            setError]            = useState('');
  const [validationResult, setValidationResult] = useState(null);

  async function handleValidate() {
    if (!apiKeyInput.trim()) return;
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await validateApiKey(apiKeyInput.trim());
      setValidationResult(res);
    } catch {
      setValidationResult({ valid: false, error: 'שגיאת רשת' });
    } finally {
      setIsValidating(false);
    }
  }

  async function handleSave() {
    if (!apiKeyInput.trim()) return;
    setIsBusy(true);
    setError('');
    try {
      await updateApiKey(apiKeyInput.trim());
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(e.message || 'שגיאה בשמירת המפתח');
      setIsBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card" style={{ maxWidth: 440 }}>
        <div style={{ marginBottom: 4 }}>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>ברוך הבא! 👋</h2>
          <p className="muted" style={{ margin: '6px 0 0', fontSize: 13 }}>
            כדי לבנות אפליקציות עם AI, נא להזין את מפתח ה-API של Anthropic.
          </p>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

        <div className="form-group">
          <label style={{ fontSize: 13 }}>מפתח Anthropic API</label>
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => { setApiKeyInput(e.target.value); setValidationResult(null); }}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
            spellCheck={false}
            dir="ltr"
            style={{ fontSize: 13 }}
          />
        </div>

        {error && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--danger)' }}>{error}</p>
        )}
        {validationResult && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: validationResult.valid ? 'var(--text-success)' : 'var(--danger)' }}>
            {validationResult.valid ? '✓ המפתח תקין' : `✗ ${validationResult.error}`}
          </p>
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            className="btn btn--secondary"
            style={{ fontSize: 13 }}
            onClick={handleValidate}
            disabled={isValidating || !apiKeyInput.trim()}
          >
            {isValidating ? 'בודק...' : '🔍 בדוק'}
          </button>
          <button
            style={{ fontSize: 13, flex: 1 }}
            onClick={handleSave}
            disabled={isBusy || !apiKeyInput.trim()}
          >
            {isBusy ? 'שומר...' : 'שמור והמשך'}
          </button>
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 12, textDecoration: 'underline' }}
            onClick={() => navigate('/dashboard', { replace: true })}
          >
            דלג בינתיים — אוסיף מאוחר יותר בהגדרות
          </button>
        </p>
      </div>
    </div>
  );
}
