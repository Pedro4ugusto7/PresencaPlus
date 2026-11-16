import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { connectionMessages } from '@/content/messages';
import { sessionStorage } from '@/data/remote/session-storage';

let client: SupabaseClient | null = null;

function candidateKey(): string {
  const publishable = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (publishable) return publishable;
  return process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? '';
}

function jwtRole(key: string): string | null {
  const parts = key.split('.');
  if (parts.length !== 3 || !parts[0]?.startsWith('eyJ')) return null;
  try {
    const normalized = parts[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const payload = JSON.parse(globalThis.atob(padded)) as { role?: unknown };
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}

function acceptedPublicKey(key: string): boolean {
  if (key.startsWith('sb_publishable_')) return true;
  if (key.startsWith('sb_secret_')) return false;
  return jwtRole(key) === 'anon';
}

export function supabaseSetupIssue(): string | null {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = candidateKey();
  if (!url.startsWith('https://') || key.length === 0) return connectionMessages.unconfigured;
  if (!acceptedPublicKey(key)) return connectionMessages.rejectedKey;
  return null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseSetupIssue() === null;
}

export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  client = createClient(url, candidateKey(), {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    },
  });
  return client;
}
