import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabase';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isGuest?: boolean;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  signInWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  signUpWithEmail: (
    email: string,
    pass: string,
    name: string,
  ) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  signInAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_USER_KEY = 'lafija_auth_user_v1';
const LEGACY_AUTH_KEY = 'betpulse_auth_user_v1';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved =
      localStorage.getItem(AUTH_USER_KEY) ||
      localStorage.getItem(LEGACY_AUTH_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    // Default demo tipster profile
    return {
      id: 'usr-demo-1',
      email: 'tipster@lafija.pro',
      name: 'Bruno Tipster',
      avatarUrl: '',
      isGuest: false,
    };
  });

  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Sync Supabase Auth listener if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'Apostador',
          avatarUrl: session.user.user_metadata?.avatar_url || '',
          isGuest: false,
        };
        setUser(profile);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        localStorage.removeItem(LEGACY_AUTH_KEY);
      }
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const profile: UserProfile = {
          id: session.user.id,
          email: session.user.email || '',
          name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0] ||
            'Apostador',
          avatarUrl: session.user.user_metadata?.avatar_url || '',
          isGuest: false,
        };
        setUser(profile);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
        localStorage.removeItem(LEGACY_AUTH_KEY);
      } else {
        setUser((prevUser) => {
          if (!prevUser?.isGuest) {
            localStorage.removeItem(AUTH_USER_KEY);
            localStorage.removeItem(LEGACY_AUTH_KEY);
            return null;
          }
          return prevUser;
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  const signInWithEmail = async (
    email: string,
    pass: string,
  ): Promise<{ error?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password: pass,
        });
        if (error) throw error;
      } else {
        // Fallback local auth simulation
        const profile: UserProfile = {
          id: `usr-${Date.now()}`,
          email,
          name: email.split('@')[0],
          isGuest: false,
        };
        setUser(profile);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      }
      closeAuthModal();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Error al iniciar sesión' };
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string,
    pass: string,
    name: string,
  ): Promise<{ error?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.signUp({
          email,
          password: pass,
          options: {
            data: { full_name: name },
          },
        });
        if (error) throw error;
      } else {
        // Fallback local simulation
        const profile: UserProfile = {
          id: `usr-${Date.now()}`,
          email,
          name: name || email.split('@')[0],
          isGuest: false,
        };
        setUser(profile);
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
      }
      closeAuthModal();
      return {};
    } catch (err: any) {
      return { error: err.message || 'Error al registrarse' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(LEGACY_AUTH_KEY);
  };

  const signInAsGuest = () => {
    const profile: UserProfile = {
      id: 'usr-guest',
      email: 'invitado@lafija.app',
      name: 'Modo Invitado',
      isGuest: true,
    };
    setUser(profile);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(profile));
    localStorage.removeItem(LEGACY_AUTH_KEY);
    closeAuthModal();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        signInAsGuest,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
