import { GoogleLogin } from '@react-oauth/google';
import { useSelector } from 'react-redux';
import { selectLanguage } from '../../store/slices/uiSlice.js';

export default function GoogleButton({ onSuccess, onError }) {
  const lang = useSelector(selectLanguage);

  return (
    <div className="google-btn-wrap">
      <GoogleLogin
        onSuccess={(resp) => onSuccess(resp.credential)}
        onError={onError ?? (() => {})}
        theme="outline"
        size="large"
        text="continue_with"
        width={340}
        shape="rectangular"
        locale={lang === 'he' ? 'he' : 'en'}
      />
    </div>
  );
}
