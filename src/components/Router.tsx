import { createContext, useContext, ReactNode } from 'react';

interface RouterContextType {
  qrCodeId?: string;
}

const RouterContext = createContext<RouterContextType>({});

export function useParams() {
  return useContext(RouterContext);
}

export function Router({ children }: { children: ReactNode }) {
  const path = window.location.pathname;
  const qrCodeId = path.startsWith('/verify/') ? path.split('/verify/')[1] : undefined;

  return (
    <RouterContext.Provider value={{ qrCodeId }}>
      {children}
    </RouterContext.Provider>
  );
}
