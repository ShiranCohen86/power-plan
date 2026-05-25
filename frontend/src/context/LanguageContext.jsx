import { createContext, useContext, useMemo, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectLanguage, selectDirection, setLanguage, toggleLanguage } from '../store/slices/uiSlice.js';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const dispatch          = useDispatch();
  const currentLanguage   = useSelector(selectLanguage);
  const currentDirection  = useSelector(selectDirection);

  useEffect(() => {
    document.documentElement.setAttribute('dir',  currentDirection);
    document.documentElement.setAttribute('lang', currentLanguage);
  }, [currentLanguage, currentDirection]);

  const contextValue = useMemo(
    () => ({
      lang:    currentLanguage,
      dir:     currentDirection,
      setLang: (lng) => dispatch(setLanguage(lng)),
      toggle:  () => dispatch(toggleLanguage()),
    }),
    [dispatch, currentLanguage, currentDirection],
  );

  return <LanguageContext.Provider value={contextValue}>{children}</LanguageContext.Provider>;
}

export function useLanguage() { return useContext(LanguageContext); }
