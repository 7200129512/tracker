import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zcoldagsacuaceohddal.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create Supabase client for authentication
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, any>;
}

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

// Sign up with email and password
export const signUp = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email || '',
        user_metadata: data.user.user_metadata,
      } : null,
      error: null,
    };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Sign up failed' };
  }
};

// Sign in with email and password
export const signIn = async (email: string, password: string): Promise<AuthResponse> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { user: null, error: error.message };
    }

    return {
      user: data.user ? {
        id: data.user.id,
        email: data.user.email || '',
        user_metadata: data.user.user_metadata,
      } : null,
      error: null,
    };
  } catch (err) {
    return { user: null, error: err instanceof Error ? err.message : 'Sign in failed' };
  }
};

// Sign out
export const signOut = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error: error ? error.message : null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Sign out failed' };
  }
};

// Get current user
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error || !data.user) {
      return null;
    }

    return {
      id: data.user.id,
      email: data.user.email || '',
      user_metadata: data.user.user_metadata,
    };
  } catch (err) {
    return null;
  }
};

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: AuthUser | null) => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        user_metadata: session.user.user_metadata,
      });
    } else {
      callback(null);
    }
  });

  return subscription;
};
