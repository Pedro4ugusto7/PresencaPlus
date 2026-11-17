import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { previewSource } from '@/data/demo';
import { loadProfessorWorkspace, loadStudentWorkspace } from '@/data/remote/academic';
import { areaPaths } from '@/navigation/area-paths';
import { useAuth } from '@/state/auth-session';
const CatalogContext = createContext(null);
export function useCatalog() {
  const value = useContext(CatalogContext);
  if (!value) throw new Error('A área acadêmica ainda não está disponível.');
  return value;
}
export function DemoCatalogProvider({
  role,
  children
}) {
  const value = useMemo(() => {
    const profile = previewSource.getProfile(role);
    const classes = role === 'professor' ? previewSource.listClasses() : [];
    const subjects = role === 'aluno' ? previewSource.listSubjects() : [];
    const details = new Map();
    classes.forEach(item => {
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
      getClass: id => details.get(id) ?? null,
      getSubject: id => previewSource.getSubject(id),
      reload: () => undefined,
      paths: areaPaths('demo')
    };
  }, [role]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
export function LiveCatalogProvider({
  children
}) {
  const {
    profile
  } = useAuth();
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [classDetails, setClassDetails] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [history, setHistory] = useState([]);
  const [weekly, setWeekly] = useState([]);
  const [reloadToken, setReloadToken] = useState(0);
  const silentReload = useRef(false);
  const hasData = useRef(false);
  const reload = useCallback((silent = false) => {
    silentReload.current = silent;
    setReloadToken(current => current + 1);
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
    load.then(workspace => {
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
    }).catch(loadError => {
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
  const value = useMemo(() => ({
    mode: 'live',
    status,
    error,
    profile,
    classes,
    subjects,
    history,
    weekly,
    getClass: id => classDetails[id] ?? null,
    getSubject: id => subjects.find(subject => subject.id === id) ?? null,
    reload,
    paths: areaPaths('live')
  }), [classDetails, classes, error, history, profile, reload, status, subjects, weekly]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
