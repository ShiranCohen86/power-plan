import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, signupUser, clearAuthError, loginWithGoogle,
  selectAuthError, selectAuthStatus, selectCurrentUser,
} from '../store/slices/authSlice.js';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice.js';
import ApiKeyPrompt from '../components/auth/ApiKeyPrompt.jsx';
import GoogleButton from '../components/auth/GoogleButton.jsx';
import BiometricButton from '../components/auth/BiometricButton.jsx';

export default function Login() {
  const { t }           = useTranslation();
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const authError       = useSelector(selectAuthError);
  const authStatus      = useSelector(selectAuthStatus);
  const currentUser     = useSelector(selectCurrentUser);
  const lang            = useSelector(selectLanguage);

  const [isRegister,       setIsRegister]       = useState(false);
  const [nameInput,        setNameInput]        = useState('');
  const [emailInput,       setEmailInput]       = useState('');
  const [passInput,        setPassInput]        = useState('');
  const [localError,       setLocalError]       = useState('');
  const [showApiKeyPrompt, setShowApiKeyPrompt] = useState(false);
  const justRegisteredRef = useRef(false);

  useEffect(() => {
    if (searchParams.get('register') === '1') setIsRegister(true);
  }, [searchParams]);

  useEffect(() => {
    if (!currentUser) return;
    if (justRegisteredRef.current) {
      justRegisteredRef.current = false;
      setShowApiKeyPrompt(true);
    } else {
      navigate(searchParams.get('redirect') || '/dashboard', { replace: true });
    }
  }, [currentUser, navigate, searchParams]);

  useEffect(() => { if (authError) dispatch(clearAuthError()); }, [emailInput, passInput]); // eslint-disable-line

  const isLoading = authStatus === 'loading';
  const error     = localError || authError;

  async function handleSubmit(e) {
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
  }

  async function handleGoogleSuccess(idToken) {
    setLocalError('');
    await dispatch(loginWithGoogle(idToken));
  }

  function switchMode(toRegister) {
    setIsRegister(toRegister);
    setLocalError('');
    dispatch(clearAuthError());
  }

  if (showApiKeyPrompt) return <ApiKeyPrompt />;

  return (
    <div className="login-page">
      <button
        type="button"
        className="login-page__lang"
        onClick={() => dispatch(toggleLanguage())}
      >
        {lang === 'he' ? 'EN' : 'עב'}
      </button>

      <div className="login-brand">
        <span className="login-brand__icon">⚡</span>
        <span className="login-brand__name">{t('app.name')}</span>
        <span className="login-brand__tagline">{t('app.tagline')}</span>
      </div>

      <div className="login-card">
        <h2 className="login-card__title">
          {isRegister ? t('auth.register') : t('auth.signIn')}
        </h2>

        <GoogleButton
          onSuccess={handleGoogleSuccess}
          onError={() => setLocalError('Google sign-in failed')}
        />

        <div className="login-divider">
          <span>{t('auth.orEmail')}</span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {isRegister && (
            <div className="form-group">
              <label>{t('auth.fullName')}</label>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                type="text" required autoComplete="name" spellCheck={false}
                placeholder="ישראל ישראלי"
              />
            </div>
          )}

          <div className="form-group">
            <label>{t('auth.email')}</label>
            <input
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              type="email" required autoComplete="email" spellCheck={false}
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
            <div className="badge danger login-error">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn--primary login-submit" disabled={isLoading}>
            {isLoading ? t('common.loading') : (isRegister ? t('auth.signUp') : t('auth.signIn'))}
          </button>
        </form>

        {!isRegister && <BiometricButton email={emailInput} />}

        <p className="login-switch">
          {isRegister ? (
            <>{t('auth.hasAccount')}{' '}
              <button type="button" className="btn-link" onClick={() => switchMode(false)}>
                {t('auth.signIn2')}
              </button>
            </>
          ) : (
            <>{t('auth.noAccount')}{' '}
              <button type="button" className="btn-link" onClick={() => switchMode(true)}>
                {t('auth.signUp')}
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
