import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import {
  loginUser, signupUser, clearAuthError, loginWithGoogle,
  selectAuthError, selectAuthStatus, selectCurrentUser,
} from '../store/slices/authSlice.js';
import { toggleLanguage, selectLanguage } from '../store/slices/uiSlice.js';
import ApiKeyPrompt from '../components/auth/ApiKeyPrompt.jsx';
import { BIOMETRIC_STORAGE_KEY } from '../config/constants.js';
import GoogleButton from '../components/auth/GoogleButton.jsx';
import BiometricButton from '../components/auth/BiometricButton.jsx';
import BiometricEnrollPrompt from '../components/auth/BiometricEnrollPrompt.jsx';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export default function Login() {
  const { t }           = useTranslation();
  const dispatch        = useDispatch();
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  const authError       = useSelector(selectAuthError);
  const authStatus      = useSelector(selectAuthStatus);
  const currentUser     = useSelector(selectCurrentUser);
  const lang            = useSelector(selectLanguage);

  const [isRegister,          setIsRegister]          = useState(false);
  const [nameInput,           setNameInput]           = useState('');
  const [emailInput,          setEmailInput]          = useState('');
  const [passInput,           setPassInput]           = useState('');
  const [showPassword,        setShowPassword]        = useState(false);
  const [emailBlurError,      setEmailBlurError]      = useState('');
  const [localError,          setLocalError]          = useState('');
  const [showApiKeyPrompt,    setShowApiKeyPrompt]    = useState(false);
  const [showBiometricEnroll, setShowBiometricEnroll] = useState(false);
  const [platformAvailable,   setPlatformAvailable]   = useState(false);
  const [googleReady,         setGoogleReady]         = useState(!!import.meta.env.VITE_GOOGLE_CLIENT_ID);
  const justRegisteredRef  = useRef(false);
  const afterBiometricRef  = useRef(null);

  useEffect(() => {
    if (searchParams.get('register') === '1') setIsRegister(true);
  }, [searchParams]);

  useEffect(() => {
    if (!window.PublicKeyCredential) return;
    (async () => {
      try {
        const ok = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setPlatformAvailable(ok);
      } catch { /* feature detection — failure is non-fatal */ }
    })();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const proceed = () => {
      if (justRegisteredRef.current) {
        justRegisteredRef.current = false;
        setShowApiKeyPrompt(true);
      } else {
        navigate(searchParams.get('redirect') || '/dashboard', { replace: true });
      }
    };

    const isMobile = navigator.maxTouchPoints > 0;
    const shouldOfferBiometric =
      isMobile && platformAvailable && localStorage.getItem(BIOMETRIC_STORAGE_KEY) !== '1';

    if (shouldOfferBiometric) {
      afterBiometricRef.current = proceed;
      setShowBiometricEnroll(true);
    } else {
      proceed();
    }
  }, [currentUser, navigate, searchParams, platformAvailable]);

  // intentional: clear auth error whenever the user edits email or password
  useEffect(() => { if (authError) dispatch(clearAuthError()); }, [emailInput, passInput]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleEmailBlur(e) {
    const val = e.target.value.trim();
    if (val && !val.includes('@')) setEmailBlurError('כתובת אימייל לא תקינה');
    else setEmailBlurError('');
  }

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

  const loginHeader = (
    <header className="login-header">
      <Link to="/" className="login-header__brand">
        <span className="login-header__icon">⚡</span>
        <span className="login-header__name">{t('app.name')}</span>
      </Link>
      <button
        type="button"
        className="login-page__lang"
        onClick={() => dispatch(toggleLanguage())}
      >
        {lang === 'he' ? 'EN' : 'עב'}
      </button>
    </header>
  );

  if (showBiometricEnroll) return (
    <div className="login-page">
      {loginHeader}
      <div className="login-body">
        <BiometricEnrollPrompt onDone={() => {
          setShowBiometricEnroll(false);
          afterBiometricRef.current?.();
        }} />
      </div>
    </div>
  );

  if (showApiKeyPrompt) return <ApiKeyPrompt />;

  return (
    <div className="login-page">
      {loginHeader}

      <div className="login-body">
        <div className="login-card">
        <h2 className="login-card__title">
          {isRegister ? t('auth.register') : t('auth.signIn')}
        </h2>

        {googleReady && (
          <>
            <GoogleButton
              onSuccess={handleGoogleSuccess}
              onError={() => setGoogleReady(false)}
            />
            <div className="login-divider">
              <span>{t('auth.orEmail')}</span>
            </div>
          </>
        )}

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
            <label htmlFor="login-email">{t('auth.email')}</label>
            <input
              id="login-email"
              value={emailInput}
              onChange={(e) => { setEmailInput(e.target.value); setEmailBlurError(''); }}
              onBlur={handleEmailBlur}
              type="email" required autoComplete="email" spellCheck={false}
              placeholder="you@example.com"
              aria-describedby={emailBlurError ? 'email-error' : undefined}
              aria-invalid={!!emailBlurError}
            />
            {emailBlurError && (
              <span id="email-error" role="alert" className="login-field-error">{emailBlurError}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="login-password">{t('auth.password')}</label>
            <div className="login-password-wrap">
              <input
                id="login-password"
                value={passInput}
                onChange={(e) => setPassInput(e.target.value)}
                type={showPassword ? 'text' : 'password'} required
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                placeholder={isRegister ? 'לפחות 6 תווים' : '••••••••'}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'הסתר סיסמה' : 'הצג סיסמה'}
                tabIndex={0}
              >
                {showPassword
                  ? <VisibilityOff style={{ fontSize: 18 }} />
                  : <Visibility style={{ fontSize: 18 }} />}
              </button>
            </div>
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
    </div>
  );
}
