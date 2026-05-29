import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, signupUser, clearAuthError,
  selectAuthError, selectAuthStatus, selectCurrentUser,
} from '../store/slices/authSlice.js';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice.js';
import { updateApiKey, validateApiKey } from '../api/settings.api.js';

export default function Login() {
  const { t }           = useTranslation();
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const authError       = useSelector(selectAuthError);
  const authStatus      = useSelector(selectAuthStatus);
  const currentUser     = useSelector(selectCurrentUser);
  const currentLanguage = useSelector(selectLanguage);

  const [isRegister, setIsRegister]       = useState(false);
  const [nameInput,  setNameInput]        = useState('');
  const [emailInput, setEmailInput]       = useState('');
  const [passInput,  setPassInput]        = useState('');
  const [localError, setLocalError]       = useState('');
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const [apiKeyInput, setApiKeyInput]     = useState('');
  const [apiKeyBusy, setApiKeyBusy]       = useState(false);
  const [apiKeyErr, setApiKeyErr]         = useState('');
  const [apiKeyValid, setApiKeyValid]     = useState(null);
  const [apiKeyValidating, setApiKeyValidating] = useState(false);
  const justRegisteredRef = useRef(false);

  useEffect(() => {
    if (currentUser) {
      if (justRegisteredRef.current) {
        justRegisteredRef.current = false;
        setShowApiKeyPrompt(true);
      } else {
        const redirect = searchParams.get('redirect');
        navigate(redirect || '/dashboard', { replace: true });
      }
    }
  }, [currentUser, navigate, searchParams]);

  // Clear Redux error when inputs change
  useEffect(() => { if (authError) dispatch(clearAuthError()); }, [emailInput, passInput]); // eslint-disable-line

  const isLoading = authStatus === 'loading';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (isRegister) {
      if (!nameInput.trim()) { setLocalError('נא להזין שם מלא'); return; }
      justRegisteredRef.current = true;
      const result = await dispatch(signupUser({ name: nameInput.trim(), email: emailInput, password: passInput }));
      if (result.error) { justRegisteredRef.current = false; setLocalError(result.payload || 'שגיאה בהרשמה'); }
    } else {
      await dispatch(loginUser({ email: emailInput, password: passInput }));
    }
  };

  const switchMode = (toRegister) => {
    setIsRegister(toRegister);
    setLocalError('');
    dispatch(clearAuthError());
  };

  const error = localError || authError;

  async function handleApiKeyValidate() {
    if (!apiKeyInput.trim()) return;
    setApiKeyValidating(true); setApiKeyValid(null);
    try {
      const res = await validateApiKey(apiKeyInput.trim());
      setApiKeyValid(res);
    } catch { setApiKeyValid({ valid: false, error: 'שגיאת רשת' }); }
    finally { setApiKeyValidating(false); }
  }

  async function handleApiKeySave() {
    if (!apiKeyInput.trim()) return;
    setApiKeyBusy(true); setApiKeyErr('');
    try {
      await updateApiKey(apiKeyInput.trim());
      navigate('/dashboard', { replace: true });
    } catch (e) {
      setApiKeyErr(e.message || 'שגיאה בשמירת המפתח');
      setApiKeyBusy(false);
    }
  }

  if (showApiKeyPrompt) {
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
              onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyValid(null); }}
              placeholder="sk-ant-api03-..."
              autoComplete="off"
              spellCheck={false}
              dir="ltr"
              style={{ fontSize: 13 }}
            />
          </div>

          {apiKeyErr && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: 'var(--danger)' }}>{apiKeyErr}</p>
          )}
          {apiKeyValid && (
            <p style={{ margin: '0 0 8px', fontSize: 12, color: apiKeyValid.valid ? 'var(--text-success)' : 'var(--danger)' }}>
              {apiKeyValid.valid ? '✓ המפתח תקין' : `✗ ${apiKeyValid.error}`}
            </p>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              className="btn btn--secondary"
              style={{ fontSize: 13 }}
              onClick={handleApiKeyValidate}
              disabled={apiKeyValidating || !apiKeyInput.trim()}
            >
              {apiKeyValidating ? 'בודק...' : '🔍 בדוק'}
            </button>
            <button
              style={{ fontSize: 13, flex: 1 }}
              onClick={handleApiKeySave}
              disabled={apiKeyBusy || !apiKeyInput.trim()}
            >
              {apiKeyBusy ? 'שומר...' : 'שמור והמשך'}
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

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={handleSubmit} noValidate>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{t('app.name')}</h2>
            <p className="muted" style={{ margin: '4px 0 0', fontSize: 13 }}>
              {isRegister ? t('auth.register') : t('app.tagline')}
            </p>
          </div>
          <button type="button" className="btn-ghost" onClick={() => dispatch(toggleLanguage())} style={{ fontSize: 13 }}>
            {currentLanguage === 'he' ? 'EN' : 'עב'}
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border)', margin: '16px 0' }} />

        {/* Name field (register only) */}
        {isRegister && (
          <div className="form-group">
            <label>{t('auth.fullName')}</label>
            <input
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              type="text" required autoComplete="off" spellCheck={false}
              placeholder="ישראל ישראלי"
            />
          </div>
        )}

        <div className="form-group">
          <label>{t('auth.email')}</label>
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            type="email" required autoComplete="off" spellCheck={false}
            placeholder="you@example.com"
          />
        </div>

        <div className="form-group">
          <label>{t('auth.password')}</label>
          <input
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            type="password" required
            autoComplete="off" spellCheck={false}
            placeholder={isRegister ? 'לפחות 6 תווים' : '••••••••'}
          />
        </div>

        {error && (
          <div className="badge danger" style={{ marginBottom: 8, width: '100%', justifyContent: 'center' }}>
            {error}
          </div>
        )}

        <button type="submit" disabled={isLoading} style={{ width: '100%', marginTop: 4 }}>
          {isLoading ? t('common.loading') : (isRegister ? t('auth.signUp') : t('auth.signIn'))}
        </button>

        <p style={{ fontSize: 13, marginTop: 14, textAlign: 'center', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <>{t('auth.hasAccount')}{' '}
              <button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '0 4px', textDecoration: 'underline' }} onClick={() => switchMode(false)}>
                {t('auth.signIn2')}
              </button>
            </>
          ) : (
            <>{t('auth.noAccount')}{' '}
              <button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '0 4px', textDecoration: 'underline' }} onClick={() => switchMode(true)}>
                {t('auth.signUp')}
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
