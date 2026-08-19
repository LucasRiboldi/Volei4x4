import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from '@/lib/supabase';

type EstadoAuth = {
  sessao: Session | null;
  /** true ate sabermos se existe sessao salva no aparelho. */
  carregando: boolean;
};

const AuthContext = createContext<EstadoAuth>({ sessao: null, carregando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;

    // Sessao salva de uma abertura anterior.
    void supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });

    // Cobre entrada, saida e renovacao de token vindos de qualquer lugar.
    const { data } = supabase.auth.onAuthStateChange((_evento, nova) => {
      if (ativo) setSessao(nova);
    });

    return () => {
      ativo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ sessao, carregando }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
