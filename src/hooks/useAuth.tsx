import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  loading: true,
  authError: null,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fallbackTimer = window.setTimeout(() => {
      if (!isMounted) return;
      setAuthError("Autentikasi terlalu lama merespons. Silakan muat ulang halaman.");
      setLoading(false);
    }, 10000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimer);
        setAuthError(null);
        setSession(session);
        setLoading(false);
      }
    );

    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimer);
        if (error) setAuthError(error.message);
        setSession(session);
        setLoading(false);
      })
      .catch((error) => {
        if (!isMounted) return;
        window.clearTimeout(fallbackTimer);
        setAuthError(error instanceof Error ? error.message : "Gagal memuat sesi autentikasi.");
        setLoading(false);
      });

    return () => {
      isMounted = false;
      window.clearTimeout(fallbackTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);