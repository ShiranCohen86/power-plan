import { createContext, useContext, useState } from 'react';

const AppMenuCtx = createContext({ openMenu: () => {}, menuOpen: false, closeMenu: () => {} });

export const useAppMenu = () => useContext(AppMenuCtx);

export function AppMenuProvider({ children }) {
  const [open, setOpen] = useState(false);
  return (
    <AppMenuCtx.Provider value={{ openMenu: () => setOpen(true), menuOpen: open, closeMenu: () => setOpen(false) }}>
      {children}
    </AppMenuCtx.Provider>
  );
}
