import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { User } from '../types';

const rawSupabaseUrl = import.meta.env.NEXT_PUBLIC_SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey =
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const supabaseUrl = rawSupabaseUrl?.trim();
const supabaseAnonKey = rawSupabaseAnonKey?.trim();

const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;

function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      `Supabase no está configurado. URL detectada: ${Boolean(supabaseUrl)}. KEY detectada: ${Boolean(
        supabaseAnonKey
      )}. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY y reinicia pnpm dev.`
    );
  }

  return supabase;
}

export async function getCurrentUser(): Promise<User | null> {
  const client = getSupabaseClient();
  const { data } = await client.auth.getUser();
  const currentUser = data.user;
  if (!currentUser?.email) return null;

  return { id: currentUser.id, email: currentUser.email };
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user?.email) {
    throw new Error(error?.message ?? 'No se pudo iniciar sesión');
  }

  return { id: data.user.id, email: data.user.email };
}

export async function signUpWithPassword(email: string, password: string): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.signUp({ email, password });
  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();
  if (error) throw new Error(error.message);
}

export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const client = getSupabaseClient();
  const {
    data: { subscription }
  } = client.auth.onAuthStateChange((_event, session) => {
    if (!session?.user?.email) {
      callback(null);
      return;
    }
    callback({ id: session.user.id, email: session.user.email });
  });

  return () => subscription.unsubscribe();
}
