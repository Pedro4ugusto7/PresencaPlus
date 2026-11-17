import { createContext, useContext } from 'react';
const DemoModeContext = createContext(false);

/**
 * Envolve apenas o grupo de rotas /demo.
 * Remova o provider e o grupo de rotas quando a autenticação real existir.
 */
export function DemoModeProvider({
  children
}) {
  return <DemoModeContext.Provider value={true}>{children}</DemoModeContext.Provider>;
}
export function useDemoMode() {
  return useContext(DemoModeContext);
}
