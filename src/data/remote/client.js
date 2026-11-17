import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { connectionMessages } from '@/content/messages';
import { sessionStorage } from '@/data/remote/session-storage';
let client = null;
function candidateKey() {
  const publishable = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? '';
  if (publishable) return publishable;
  return process.env.EXPO_PUBLIC_SUPABASE_KEY?.trim() ?? '';
}
function jwtRole(key) {
  const parts = key.split('.');
  if (parts.length !== 3 || !parts[0]?.startsWith('eyJ')) return null;
  try {
    const normalized = parts[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
    const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
    const payload = JSON.parse(globalThis.atob(padded));
    return typeof payload.role === 'string' ? payload.role : null;
  } catch {
    return null;
  }
}
function acceptedPublicKey(key) {
  if (key.startsWith('sb_publishable_')) return true;
  if (key.startsWith('sb_secret_')) return false;
  return jwtRole(key) === 'anon';
}
export function supabaseSetupIssue() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const key = candidateKey();
  if (!url.startsWith('https://') || key.length === 0) return connectionMessages.unconfigured;
  if (!acceptedPublicKey(key)) return connectionMessages.rejectedKey;
  return null;
}
export function isSupabaseConfigured() {
  return supabaseSetupIssue() === null;
}
export function publicApiConfig() {
  if (supabaseSetupIssue()) return null;
  return {
    url: process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '',
    key: candidateKey()
  };
}
export function getSupabase() {
  if (!isSupabaseConfigured()) return null;
  if (client) return client;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim() ?? '';
  client = createClient(url, candidateKey(), {
    auth: {
      storage: sessionStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce'
    }
  });
  return client;
}
