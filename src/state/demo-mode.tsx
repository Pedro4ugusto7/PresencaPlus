import { createContext, useContext, type ReactNode } from 'react';

const DemoModeContext = createContext(false);

/**
 * Envolve apenas o grupo de rotas /demo.
 * Remova o provider e o grupo de rotas quando a autenticação real existir.
 */
export function DemoModeProvider({ children }: { children: ReactNode }) {
  return <DemoModeContext.Provider value={true}>{children}</DemoModeContext.Provider>;
}

export function useDemoMode(): boolean {
  return useContext(DemoModeContext);
}
