"use client";

import { createContext, useContext, useState, useCallback } from "react";

interface MobileNavContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
}

const MobileNavContext = createContext<MobileNavContextValue>({
  open: false,
  setOpen: () => {},
  toggle: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  return <MobileNavContext.Provider value={{ open, setOpen, toggle }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
