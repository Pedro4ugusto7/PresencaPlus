import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { connectionMessages } from '@/content/messages';
import { getSupabase, isSupabaseConfigured, supabaseSetupIssue } from '@/data/remote/client';
import { toAcademicProfile } from '@/data/remote/academic';
import type { RecoveryInput } from '@/data/remote/recovery';
import type { AcademicProfile, UserRole } from '@/domain';

export type AuthStatus = 'loading' | 'signedOut' | 'ready' | 'needsProfile' | 'profileError';

export type AuthResult = { ok: true; role: UserRole } | { ok: false; message: string };
export type ActionResult = { ok: true } | { ok: false; message: string };

type AuthContextValue = {
  status: AuthStatus;
  configured: boolean;
  setupIssue: string | null;
  profile: AcademicProfile | null;
  accountMessage: string | null;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string, redirectTo: string) => Promise<ActionResult>;
  establishRecovery: (input: RecoveryInput) => Promise<ActionResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  reloadProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function mapAuthFailure(error: { message?: string } | null, fallback: string): string {
  const message = (error?.message ?? '').toLowerCase();
  if (!error) return fallback;
  if (message.includes('invalid login') || message.includes('invalid credentials')) {
    return 'E-mail ou senha incorretos.';
  }
  if (message.includes('email not confirmed')) {
    return 'Confirme o e-mail antes de entrar.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('failed to fetch')) {
    return connectionMessages.offline;
  }
  if (message.includes('expired') || message.includes('invalid')) {
    return 'O link não é válido ou expirou. Peça um novo e-mail.';
  }
  return fallback;
}

async function readProfile(userId: string, email: string): Promise<AcademicProfile | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, institution, course, identifier')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(mapAuthFailure(error, connectionMessages.profileLoad));
  if (!data || (data.role !== 'professor' && data.role !== 'aluno')) return null;
  return toAcademicProfile(data, email);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionReady, setSessionReady] = useState(!configured);
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [profileState, setProfileState] = useState<'idle' | 'loading' | 'ready' | 'missing' | 'error'>('idle');
  const [profileMessage, setProfileMessage] = useState<string>(connectionMessages.profileLoad);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return undefined;

    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setSessionReady(true);
    }).catch(() => {
      if (!active) return;
      setSession(null);
      setSessionReady(true);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!sessionReady) return undefined;
    if (!session?.user) {
      setProfile(null);
      setProfileState('idle');
      return undefined;
    }

    let active = true;
    setProfileState('loading');
    readProfile(session.user.id, session.user.email ?? '')
      .then((next) => {
        if (!active) return;
        setProfile(next);
        setProfileState(next ? 'ready' : 'missing');
      })
      .catch((error: unknown) => {
        if (!active) return;
        setProfile(null);
        setProfileMessage(error instanceof Error ? error.message : connectionMessages.profileLoad);
        setProfileState('error');
      });

    return () => {
      active = false;
    };
  }, [session, sessionReady, reloadToken]);

  const status: AuthStatus = !sessionReady || (session != null && profileState === 'loading')
    ? 'loading'
    : !session
      ? 'signedOut'
      : profileState === 'missing'
        ? 'needsProfile'
        : profileState === 'error'
          ? 'profileError'
          : profile
            ? 'ready'
            : 'loading';

  const value = useMemo<AuthContextValue>(() => {
    return {
      status,
      configured,
      setupIssue: supabaseSetupIssue(),
      profile,
      accountMessage:
        status === 'needsProfile'
          ? connectionMessages.needsProfile
          : status === 'profileError'
            ? profileMessage
            : null,
      async signIn(email, password) {
        const supabase = getSupabase();
        if (!supabase) return { ok: false, message: supabaseSetupIssue() ?? connectionMessages.unconfigured };
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          });
          if (error || !data.user) return { ok: false, message: mapAuthFailure(error, connectionMessages.authFailed) };
          const next = await readProfile(data.user.id, data.user.email ?? email);
          if (!next) return { ok: false, message: connectionMessages.needsProfile };
          setSession(data.session);
          setProfile(next);
          setProfileState('ready');
          return { ok: true, role: next.role };
        } catch (loadError) {
          const message = loadError instanceof Error ? loadError.message : '';
          const known = new Set<string>([
            ...Object.values(connectionMessages),
            'E-mail ou senha incorretos.',
            'Confirme o e-mail antes de entrar.',
            'O link não é válido ou expirou. Peça um novo e-mail.',
          ]);
          return { ok: false, message: known.has(message) ? message : connectionMessages.offline };
        }
      },
      async signOut() {
        const supabase = getSupabase();
        try {
          if (supabase) await supabase.auth.signOut();
        } catch {
          // A sessão local é encerrada mesmo se o servidor não responder.
        } finally {
          setSession(null);
          setProfile(null);
          setProfileState('idle');
        }
      },
      async requestPasswordReset(email, redirectTo) {
        const supabase = getSupabase();
        if (!supabase) return { ok: false, message: connectionMessages.unconfigured };
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
        if (error) return { ok: false, message: mapAuthFailure(error, connectionMessages.recoveryFailed) };
        return { ok: true };
      },
      async establishRecovery(input) {
        const supabase = getSupabase();
        if (!supabase) return { ok: false, message: connectionMessages.unconfigured };
        if (input.error) return { ok: false, message: 'O link não é válido ou expirou. Peça um novo e-mail.' };
        if (input.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(input.code);
          if (error) return { ok: false, message: mapAuthFailure(error, connectionMessages.recoveryFailed) };
          return { ok: true };
        }
        if (input.tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ token_hash: input.tokenHash, type: 'recovery' });
          if (error) return { ok: false, message: mapAuthFailure(error, connectionMessages.recoveryFailed) };
          return { ok: true };
        }
        if (input.accessToken && input.refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: input.accessToken,
            refresh_token: input.refreshToken,
          });
          if (error) return { ok: false, message: mapAuthFailure(error, connectionMessages.recoveryFailed) };
          return { ok: true };
        }
        return { ok: false, message: 'Abra o link de recuperação neste aparelho.' };
      },
      async updatePassword(password) {
        const supabase = getSupabase();
        if (!supabase) return { ok: false, message: connectionMessages.unconfigured };
        const { data, error } = await supabase.auth.updateUser({ password });
        if (error || !data.user) {
          return { ok: false, message: 'A senha não foi aceita. Tente uma senha mais longa.' };
        }
        try {
          const next = await readProfile(data.user.id, data.user.email ?? '');
          if (!next) return { ok: false, message: connectionMessages.needsProfile };
          setProfile(next);
          setProfileState('ready');
          return { ok: true, role: next.role };
        } catch (loadError) {
          return {
            ok: false,
            message: loadError instanceof Error ? loadError.message : connectionMessages.profileLoad,
          };
        }
      },
      async reloadProfile() {
        setReloadToken((current) => current + 1);
      },
    };
  }, [configured, profile, profileMessage, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('A sessão ainda não está disponível.');
  return value;
}
