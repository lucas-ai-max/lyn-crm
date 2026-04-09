import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import * as authService from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import type { Profile } from '@/services/supabase';

// Migration: rename old storage key
if (typeof window !== 'undefined') {
  const oldProfile = window.localStorage.getItem('vincit.auth.profile');
  if (oldProfile) {
    window.localStorage.setItem('lyn.auth.profile', oldProfile);
    window.localStorage.removeItem('vincit.auth.profile');
  }
}

const PROFILE_STORAGE_KEY = 'lyn.auth.profile';

const getStoredProfile = (): Profile | null => {
  if (typeof window === 'undefined') return null;
  const stored = window.localStorage.getItem(PROFILE_STORAGE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as Profile;
  } catch (error) {
    console.error('Erro ao ler perfil armazenado', error);
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
    return null;
  }
};

const persistProfile = (value: Profile | null) => {
  if (typeof window === 'undefined') return;
  if (value) {
    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(value));
  } else {
    window.localStorage.removeItem(PROFILE_STORAGE_KEY);
  }
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  companyId: string | null;
  loading: boolean;
  hasProfile: boolean | null;
  getCompanyId: () => string | null;
  signUp: (email: string, password: string, userData?: { first_name?: string; last_name?: string; company_name?: string }) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  createProfile: (profileData: {
    first_name: string;
    last_name: string;
    company_name: string;
  }) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(() => getStoredProfile());
  const [companyId, setCompanyId] = useState<string | null>(() => getStoredProfile()?.company_id ?? null);
  const [hasProfile, setHasProfile] = useState<boolean | null>(() => {
    const storedProfile = getStoredProfile();
    return storedProfile ? true : null;
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  const checkProfile = async (userId: string) => {
    const { profile: profileData, error } = await authService.checkUserProfile(userId);

    if (error) {
      console.error('Erro ao carregar perfil do usuário', error);
      return null;
    }

    if (profileData) {
      setProfile(profileData as Profile);
      setCompanyId(profileData.company_id ?? null);
      setHasProfile(true);
      persistProfile(profileData as Profile);
    } else {
      setProfile(null);
      setCompanyId(null);
      setHasProfile(false);
      persistProfile(null);
    }

    return profileData ?? null;
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            checkProfile(session.user!.id);
          }, 0);
        } else {
          setProfile(null);
          setCompanyId(null);
          setHasProfile(null);
          persistProfile(null);
        }

        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        checkProfile(session.user.id);
      } else {
        setProfile(null);
        setCompanyId(null);
        setHasProfile(null);
        persistProfile(null);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: { first_name?: string; last_name?: string; company_name?: string }) => {
    try {
      setLoading(true);
      const { data, error } = await authService.signUp(email, password, userData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: error.message === "User already registered"
            ? "Este e-mail já está cadastrado"
            : "Erro ao criar conta. Tente novamente.",
        });
        return { error };
      }

      toast({
        title: "Conta criada com sucesso!",
        description: "Verifique seu e-mail para confirmar o cadastro.",
      });

      // Redirecionar para dashboard
      setTimeout(() => navigate('/dashboard'), 1500);

      return { error: null };
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "Ocorreu um erro inesperado.",
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await authService.signIn(email, password);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: error.message === "Invalid login credentials"
            ? "E-mail ou senha inválidos"
            : error.message === "Email not confirmed"
              ? "Por favor, confirme seu e-mail antes de fazer login"
              : "Erro ao fazer login. Tente novamente.",
        });
        return { error };
      }

      // Verificar se usuário tem profile
      if (data.user) {
        const profileData = await checkProfile(data.user.id);

        if (!profileData) {
          toast({
            title: "Perfil incompleto",
            description: "Alguns recursos podem solicitar mais dados posteriormente.",
          });
        }
      }

      toast({
        title: "Login realizado com sucesso!",
        description: "Você será redirecionado em instantes.",
      });

      // Redirecionar para dashboard
      setTimeout(() => navigate('/dashboard'), 1500);

      return { error: null };
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Ocorreu um erro inesperado.",
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      await authService.signOut();
      setProfile(null);
      setCompanyId(null);
      setHasProfile(null);
      persistProfile(null);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      navigate('/login');
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao sair",
        description: "Ocorreu um erro inesperado.",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProfile = async (profileData: {
    first_name: string;
    last_name: string;
    company_name: string;
  }) => {
    if (!user) {
      return { error: { message: "Usuário não autenticado" } };
    }

    try {
      setLoading(true);
      const { data, error } = await authService.createProfile(user.id, profileData);

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao criar perfil",
          description: "Não foi possível criar seu perfil. Tente novamente.",
        });
        return { error };
      }

      if (data) {
        setProfile(data as Profile);
        setCompanyId((data as Profile).company_id ?? null);
        setHasProfile(true);
        persistProfile(data as Profile);
      }

      toast({
        title: "Perfil criado com sucesso!",
        description: "Você será redirecionado para o dashboard.",
      });

      setTimeout(() => navigate('/dashboard'), 1500);

      return { error: null };
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Erro ao criar perfil",
        description: "Ocorreu um erro inesperado.",
      });
      return { error: err };
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await checkProfile(user.id);
    } else {
      setProfile(null);
      setCompanyId(null);
      setHasProfile(null);
      persistProfile(null);
    }
  };

  const getCompanyId = () => companyId;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      companyId,
      loading,
      hasProfile,
      getCompanyId,
      signUp,
      signIn,
      signOut,
      createProfile,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
