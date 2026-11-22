import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { connectionMessages } from '@/content/messages';
import { getSupabase, isSupabaseConfigured, supabaseSetupIssue } from '@/data/remote/client';
import { toAcademicProfile } from '@/data/remote/academic';
import { profilePhaseForSession } from '@/state/session-phase';
const AuthContext = createContext(null);
function mapAuthFailure(error, fallback) {
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
async function readProfile(userId, email) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const {
    data,
    error
  } = await supabase.from('profiles').select('id, role, full_name, institution, course, identifier').eq('id', userId).maybeSingle();
  if (error) throw new Error(mapAuthFailure(error, connectionMessages.profileLoad));
  if (!data || data.role !== 'professor' && data.role !== 'aluno') return null;
  return toAcademicProfile(data, email);
}
export function AuthProvider({
  children
}) {
  const configured = isSupabaseConfigured();
  const [session, setSession] = useState(null);
  const [sessionReady, setSessionReady] = useState(!configured);
  const [profile, setProfile] = useState(null);
  const [profileState, setProfileState] = useState('idle');
  const [profileMessage, setProfileMessage] = useState(connectionMessages.profileLoad);
  const [entryMessage, setEntryMessage] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const loadedUserId = useRef(null);
  async function endSession() {
    loadedUserId.current = null;
    const supabase = getSupabase();
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // A sessão local é encerrada mesmo se o servidor não responder.
    }
    setSession(null);
    setProfile(null);
    setProfileState('idle');
  }
  async function refuseStudentAccess() {
    await endSession();
    setEntryMessage(connectionMessages.studentAppBlocked);
  }
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({
      data
    }) => {
      if (!active) return;
      setSession(data.session);
      setSessionReady(true);
    }).catch(() => {
      if (!active) return;
      setSession(null);
      setSessionReady(true);
    });
    const {
      data
    } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionReady(true);
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const sessionUserId = session?.user?.id ?? null;
  const sessionEmail = session?.user?.email ?? '';
  useEffect(() => {
    if (!sessionReady) return undefined;
    const phase = profilePhaseForSession({
      phase: loadedUserId.current && loadedUserId.current === sessionUserId ? 'ready' : 'idle',
      userId: loadedUserId.current
    }, sessionUserId);
    if (phase === 'clear') {
      loadedUserId.current = null;
      setProfile(null);
      setProfileState('idle');
      return undefined;
    }
    if (phase === 'load') setProfileState('loading');
    let active = true;
    readProfile(sessionUserId, sessionEmail).then(next => {
      if (!active) return;
      if (next?.role === 'aluno') {
        setProfile(null);
        setProfileState('idle');
        void refuseStudentAccess();
        return;
      }
      if (!next && phase === 'refresh') return;
      loadedUserId.current = next?.id ?? null;
      setProfile(next);
      setProfileState(next ? 'ready' : 'missing');
    }).catch(error => {
      if (!active) return;
      if (phase === 'refresh') return;
      setProfile(null);
      setProfileMessage(error instanceof Error ? error.message : connectionMessages.profileLoad);
      setProfileState('error');
    });
    return () => {
      active = false;
    };
  }, [sessionEmail, sessionReady, sessionUserId, reloadToken]);
  const status = !sessionReady || session != null && profileState === 'loading' ? 'loading' : !session ? 'signedOut' : profileState === 'missing' ? 'needsProfile' : profileState === 'error' ? 'profileError' : profile ? 'ready' : 'loading';
  const value = useMemo(() => {
    return {
      status,
      configured,
      setupIssue: supabaseSetupIssue(),
      profile,
      accountMessage: entryMessage ?? (status === 'needsProfile' ? connectionMessages.needsProfile : status === 'profileError' ? profileMessage : null),
      async signIn(email, password) {
        const supabase = getSupabase();
        if (!supabase) return {
          ok: false,
          message: supabaseSetupIssue() ?? connectionMessages.unconfigured
        };
        try {
          const {
            data,
            error
          } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password
          });
          if (error || !data.user) return {
            ok: false,
            message: mapAuthFailure(error, connectionMessages.authFailed)
          };
          const next = await readProfile(data.user.id, data.user.email ?? email);
          if (!next) return {
            ok: false,
            message: connectionMessages.needsProfile
          };
          if (next.role !== 'professor') {
            await refuseStudentAccess();
            return {
              ok: false,
              message: connectionMessages.studentAppBlocked
            };
          }
          setEntryMessage(null);
          loadedUserId.current = next.id;
          setSession(data.session);
          setProfile(next);
          setProfileState('ready');
          return {
            ok: true,
            role: next.role
          };
        } catch (loadError) {
          const message = loadError instanceof Error ? loadError.message : '';
          const known = new Set([...Object.values(connectionMessages), 'E-mail ou senha incorretos.', 'Confirme o e-mail antes de entrar.', 'O link não é válido ou expirou. Peça um novo e-mail.']);
          return {
            ok: false,
            message: known.has(message) ? message : connectionMessages.offline
          };
        }
      },
      async signOut() {
        setEntryMessage(null);
        await endSession();
      },
      async requestPasswordReset(email, redirectTo) {
        const supabase = getSupabase();
        if (!supabase) return {
          ok: false,
          message: connectionMessages.unconfigured
        };
        const {
          error
        } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
          redirectTo
        });
        if (error) return {
          ok: false,
          message: mapAuthFailure(error, connectionMessages.recoveryFailed)
        };
        return {
          ok: true
        };
      },
      async establishRecovery(input) {
        const supabase = getSupabase();
        if (!supabase) return {
          ok: false,
          message: connectionMessages.unconfigured
        };
        if (input.error) return {
          ok: false,
          message: 'O link não é válido ou expirou. Peça um novo e-mail.'
        };
        if (input.code) {
          const {
            error
          } = await supabase.auth.exchangeCodeForSession(input.code);
          if (error) return {
            ok: false,
            message: mapAuthFailure(error, connectionMessages.recoveryFailed)
          };
          return {
            ok: true
          };
        }
        if (input.tokenHash) {
          const {
            error
          } = await supabase.auth.verifyOtp({
            token_hash: input.tokenHash,
            type: 'recovery'
          });
          if (error) return {
            ok: false,
            message: mapAuthFailure(error, connectionMessages.recoveryFailed)
          };
          return {
            ok: true
          };
        }
        if (input.accessToken && input.refreshToken) {
          const {
            error
          } = await supabase.auth.setSession({
            access_token: input.accessToken,
            refresh_token: input.refreshToken
          });
          if (error) return {
            ok: false,
            message: mapAuthFailure(error, connectionMessages.recoveryFailed)
          };
          return {
            ok: true
          };
        }
        return {
          ok: false,
          message: 'Abra o link de recuperação neste aparelho.'
        };
      },
      async updatePassword(password) {
        const supabase = getSupabase();
        if (!supabase) return {
          ok: false,
          message: connectionMessages.unconfigured
        };
        const {
          data,
          error
        } = await supabase.auth.updateUser({
          password
        });
        if (error || !data.user) {
          return {
            ok: false,
            message: 'A senha não foi aceita. Tente uma senha mais longa.'
          };
        }
        try {
          const next = await readProfile(data.user.id, data.user.email ?? '');
          if (!next) return {
            ok: false,
            message: connectionMessages.needsProfile
          };
          if (next.role !== 'professor') {
            await refuseStudentAccess();
            return {
              ok: false,
              message: connectionMessages.studentAppBlocked
            };
          }
          setEntryMessage(null);
          loadedUserId.current = next.id;
          setProfile(next);
          setProfileState('ready');
          return {
            ok: true,
            role: next.role
          };
        } catch (loadError) {
          return {
            ok: false,
            message: loadError instanceof Error ? loadError.message : connectionMessages.profileLoad
          };
        }
      },
      async reloadProfile() {
        setReloadToken(current => current + 1);
      }
    };
  }, [configured, entryMessage, profile, profileMessage, status]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('A sessão ainda não está disponível.');
  return value;
}
