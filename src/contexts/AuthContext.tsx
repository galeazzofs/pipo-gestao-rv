import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { isDevModeEnabled } from '@/hooks/useDevMode';

// Detectar se estamos no preview do Lovable (desenvolvimento) E com dev mode ativo
const IS_DEV_MODE = import.meta.env.DEV && isDevModeEnabled();

interface Profile {
  id: string;
  email: string;
  nome: string;
  nivel: 'CN1' | 'CN2' | 'CN3';
}

// Usuário mock para desenvolvimento
const DEV_USER = {
  id: 'dev-user-id',
  email: 'dev@piposaude.com.br',
  aud: 'authenticated',
  role: 'authenticated',
} as User;

const DEV_PROFILE: Profile = {
  id: 'dev-user-id',
  email: 'dev@piposaude.com.br',
  nome: 'Modo Dev (Admin)',
  nivel: 'CN1',
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // Se estiver em modo desenvolvimento, simular usuário admin
  if (IS_DEV_MODE) {
    return (
      <AuthContext.Provider
        value={{
          user: DEV_USER,
          session: null,
          profile: DEV_PROFILE,
          isAdmin: true,
          loading: false,
          signInWithPassword: async () => ({ error: null }),
          signOut: async () => {},
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile:', error);
      return null;
    }

    return data as Profile | null;
  };

  const checkAdminRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();

    if (error) {
      console.error('Error checking admin role:', error);
      return false;
    }

    return !!data;
  };


  useEffect(() => {
    let isMounted = true;

    const loadUserData = async (currentUser: User) => {
      try {
        const [userProfile, adminStatus] = await Promise.all([
          fetchProfile(currentUser.id),
          checkAdminRole(currentUser.id),
        ]);
        if (isMounted) {
          setProfile(userProfile);
          setIsAdmin(adminStatus);
        }
      } catch (err) {
        console.error('Erro ao carregar perfil/role:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    const clearUserData = () => {
      if (isMounted) {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    };

    // Get initial session first
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return;
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        loadUserData(initialSession.user);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Erro ao buscar sessão:', err);
      if (isMounted) setLoading(false);
    });

    // Then set up auth state listener for subsequent changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          loadUserData(newSession.user);
        } else {
          clearUserData();
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin,
        loading,
        signInWithPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
