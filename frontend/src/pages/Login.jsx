import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, signupUser, clearAuthError,
  selectAuthError, selectAuthStatus, selectCurrentUser,
} from '../store/slices/authSlice.js';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice.js';

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

  useEffect(() => {
    if (currentUser) {
      const redirect = searchParams.get('redirect');
      navigate(redirect || '/dashboard', { replace: true });
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
      const result = await dispatch(signupUser({ name: nameInput.trim(), email: emailInput, password: passInput }));
      if (result.error) setLocalError(result.payload || 'שגיאה בהרשמה');
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
              type="text" required autoComplete="name"
              placeholder="ישראל ישראלי"
            />
          </div>
        )}

        <div className="form-group">
          <label>{t('auth.email')}</label>
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            type="email" required autoComplete="email"
            placeholder="you@example.com"
          />
        </div>

        <div className="form-group">
          <label>{t('auth.password')}</label>
          <input
            value={passInput}
            onChange={(e) => setPassInput(e.target.value)}
            type="password" required
            autoComplete={isRegister ? 'new-password' : 'current-password'}
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
