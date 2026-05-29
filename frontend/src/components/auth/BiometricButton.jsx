import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { loginWithBiometric, selectAuthStatus } from '../../store/slices/authSlice.js';

export default function BiometricButton({ email }) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const status = useSelector(selectAuthStatus);
  const [available, setAvailable] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('pp-biometric') !== '1') return;
    if (!window.PublicKeyCredential) return;
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      .then((ok) => setAvailable(ok))
      .catch(() => {});
  }, []);

  if (!available) return null;

  return (
    <button
      type="button"
      className="btn-biometric"
      disabled={!email || status === 'loading'}
      onClick={() => dispatch(loginWithBiometric(email))}
    >
      🔐 {t('auth.biometric')}
    </button>
  );
}
