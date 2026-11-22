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
      reportSource: null,
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
  const [reportSource, setReportSource] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
  const silentReload = useRef(false);
  const hasData = useRef(false);
  const loadedAt = useRef(Date.now());
  const signatureRef = useRef('');
  const reload = useCallback(argument => {
    const options = typeof argument === 'boolean' ? { silent: argument } : argument ?? {};
    if (!options.force && options.minAgeMs && Date.now() - loadedAt.current < options.minAgeMs) return;
    silentReload.current = Boolean(options.silent);
    setReloadToken(current => current + 1);
  }, []);
  useEffect(() => {
    if (!profile) {
      hasData.current = false;
      signatureRef.current = '';
      setClasses([]);
      setClassDetails({});
      setSubjects([]);
      setHistory([]);
      setWeekly([]);
      setReportSource(null);
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
      const nextSignature = JSON.stringify(workspace.classDetails ?? workspace.subjects ?? workspace);
      if (silent && nextSignature === signatureRef.current) {
        loadedAt.current = Date.now();
        setStatus('ready');
        return;
      }
      signatureRef.current = nextSignature;
      loadedAt.current = Date.now();
      if ('classes' in workspace) {
        setClasses(workspace.classes);
        setClassDetails(workspace.classDetails);
        setWeekly(workspace.weekly);
        setReportSource(workspace.reportSource ?? null);
        setSubjects([]);
        setHistory([]);
      } else {
        setSubjects(workspace.subjects);
        setHistory(workspace.history);
        setClasses([]);
        setClassDetails({});
        setWeekly([]);
        setReportSource(null);
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
    reportSource,
    getClass: id => classDetails[id] ?? null,
    getSubject: id => subjects.find(subject => subject.id === id) ?? null,
    reload,
    paths: areaPaths('live')
  }), [classDetails, classes, error, history, profile, reload, reportSource, status, subjects, weekly]);
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}
