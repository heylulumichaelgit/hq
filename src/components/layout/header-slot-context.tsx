"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

type HeaderSlotContextValue = {
  slot: ReactNode;
  setSlot: (node: ReactNode) => void;
};

const HeaderSlotContext = createContext<HeaderSlotContextValue>({
  slot: null,
  setSlot: () => {},
});

export function HeaderSlotProvider({ children }: { children: ReactNode }) {
  const [slot, setSlotState] = useState<ReactNode>(null);
  const setSlot = useCallback((node: ReactNode) => setSlotState(node), []);
  return (
    <HeaderSlotContext.Provider value={{ slot, setSlot }}>
      {children}
    </HeaderSlotContext.Provider>
  );
}

export function useHeaderSlot() {
  return useContext(HeaderSlotContext);
}
