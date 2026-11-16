import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { previewSource } from '@/data/demo';
import { loadProfessorWorkspace, loadStudentWorkspace } from '@/data/remote/academic';
import type {
  AcademicProfile,
  ClassDetails,
  ClassSession,
  HistoryEntry,
  StudentSubject,
  UserRole,
  WeeklySample,
} from '@/domain';
import { areaPaths, type AcademicArea, type AcademicPaths } from '@/navigation/area-paths';
import { useAuth } from '@/state/auth-session';

type CatalogStatus = 'loading' | 'ready' | 'error';

type CatalogValue = {
  mode: AcademicArea;
  status: CatalogStatus;
  error: string | null;
  profile: AcademicProfile | null;
  classes: ClassSession[];
  subjects: StudentSubject[];
  history: HistoryEntry[];
  weekly: WeeklySample[];
  getClass: (id: string) => ClassDetails | null;
  getSubject: (id: string) => StudentSubject | null;
  reload: (silent?: boolean) => void;
  paths: AcademicPaths;
};

const CatalogContext = createContext<CatalogValue | null>(null);

export function useCatalog(): CatalogValue {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('A área acadêmica ainda não está disponível.');
  return value;
}

export function DemoCatalogProvider({ role, children }: { role: UserRole; children: ReactNode }) {
  const value = useMemo<CatalogValue>(() => {
    const profile = previewSource.getProfile(role);
    const classes = role === 'professor' ? previewSource.listClasses() : [];
    const subjects = role === 'aluno' ? previewSource.listSubjects() : [];
    const details = new Map<string, ClassDetails>();
    classes.forEach((item) => {
      const full = previewSource.getClass(item.id);
      if (full) details.set(item.id, full);
    });
    return {
      mode: 'demo',
      status: 'ready',
      error: null,
      profile,
      classes,
      subjects,
      history: role === 'aluno' ? previewSource.listHistory() : [],
      weekly: role === 'professor' ? previewSource.weeklySample() : [],
      getClass: (id) => details.get(id) ?? null,
      getSubject: (id) => previewSource.getSubject(id),
      reload: () => undefined,
      paths: areaPaths('demo'),
    };
  }, [role]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function LiveCatalogProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [status, setStatus] = useState<CatalogStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [classes, setClasses] = useState<ClassSession[]>([]);
  const [classDetails, setClassDetails] = useState<Record<string, ClassDetails>>({});
  const [subjects, setSubjects] = useState<StudentSubject[]>([]);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [weekly, setWeekly] = useState<WeeklySample[]>([]);
  const [reloadToken, setReloadToken] = useState(0);
  const silentReload = useRef(false);

  const hasData = useRef(false);

  const reload = useCallback((silent = false) => {
    silentReload.current = silent;
    setReloadToken((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!profile) {
      hasData.current = false;
      setClasses([]);
      setClassDetails({});
      setSubjects([]);
      setHistory([]);
      setWeekly([]);
      setStatus('loading');
      setError(null);
      return undefined;
    }
    let active = true;
    const silent = silentReload.current;
    silentReload.current = false;
    if (!silent) {
      setStatus('loading');
      setError(null);
    }

    const load = profile.role === 'professor' ? loadProfessorWorkspace() : loadStudentWorkspace(profile.id);
    load
      .then((workspace) => {
        if (!active) return;
        if ('classes' in workspace) {
          setClasses(workspace.classes);
          setClassDetails(workspace.classDetails);
          setWeekly(workspace.weekly);
          setSubjects([]);
          setHistory([]);
        } else {
          setSubjects(workspace.subjects);
          setHistory(workspace.history);
          setClasses([]);
          setClassDetails({});
          setWeekly([]);
        }
        setStatus('ready');
        hasData.current = true;
      })
      .catch((loadError: unknown) => {
        if (!active) return;
        if (silent && hasData.current) return;
        hasData.current = false;
        setStatus('error');
        setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os dados acadêmicos.');
      });

    return () => {
      active = false;
    };
  }, [profile, reloadToken]);

  const value = useMemo<CatalogValue>(
    () => ({
      mode: 'live',
      status,
      error,
      profile,
      classes,
      subjects,
      history,
      weekly,
      getClass: (id) => classDetails[id] ?? null,
      getSubject: (id) => subjects.find((subject) => subject.id === id) ?? null,
      reload,
      paths: areaPaths('live'),
    }),
    [classDetails, classes, error, history, profile, reload, status, subjects, weekly],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
