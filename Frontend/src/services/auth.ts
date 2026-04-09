/**
 * Serviço de Autenticação
 * Gerencia login, logout, signup e sessões
 */

import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
}

/**
 * Realiza signup de novo usuário (sem criar profile ainda)
 */
export const signUp = async (email: string, password: string, userData?: { first_name?: string; last_name?: string; company_name?: string }) => {
  const redirectUrl = `${window.location.origin}/login`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: redirectUrl,
      data: userData,
    },
  });

  return { data, error };
};

/**
 * Cria o profile do usuário e a empresa após confirmação de email
 */
export const createProfile = async (userId: string, profileData: {
  first_name: string;
  last_name: string;
  company_name: string;
}) => {
  // 1. Criar a empresa
  const { data: company, error: companyError } = await supabase
    .from('lyn_company')
    .insert({
      name: profileData.company_name,
      status_type: ['active'],
      funis: ['Padrão']
    })
    .select()
    .single();

  if (companyError) {
    console.error('Erro ao criar empresa:', companyError);
    return { data: null, error: companyError };
  }

  // 2. Criar o profile vinculado à empresa
  const { data: profile, error: profileError } = await supabase
    .from('lyn_profiles')
    .insert({
      id: userId,
      first_name: profileData.first_name,
      last_name: profileData.last_name,
      company_id: company.id,
      role: 'admin' // Primeiro usuário é admin
    })
    .select()
    .single();

  if (profileError) {
    console.error('Erro ao criar profile:', profileError);
    // Idealmente, deveríamos desfazer a criação da empresa aqui (rollback manual)
    return { data: null, error: profileError };
  }

  return { data: profile, error: null };
};

/**
 * Verifica se o usuário já tem profile
 */
export const checkUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('lyn_profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  return { profile: data, error };
};

/**
 * Realiza login
 */
export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  return { data, error };
};

/**
 * Realiza logout
 */
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

/**
 * Obtém sessão atual
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
};

/**
 * Obtém usuário atual
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error };
};

/**
 * Recuperação de senha
 */
export const resetPassword = async (email: string) => {
  const redirectUrl = `${window.location.origin}/reset-password`;

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  });

  return { data, error };
};

/**
 * Atualiza senha
 */
export const updatePassword = async (newPassword: string) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  return { data, error };
};

/**
 * Subscribe to auth changes
 */
export const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
};
