"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type HeaderConfig = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

type HeaderSlotContextValue = {
  header: HeaderConfig | null;
  setHeader: (config: HeaderConfig | null) => void;
};

const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  header: null,
  setHeader: () => {},
});

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<HeaderConfig | null>(null);
  const setHeader = useCallback((config: HeaderConfig | null) => setHeaderState(config), []);

  return (
    <HeaderSlotContext.Provider value={{ header, setHeader }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext);
}
