import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Archive, ArrowDownToLine, CalendarDays, ChevronRight, GitBranch, Info, MapPin, Redo2, Search, Settings2, Undo2, Users, ShieldCheck, Leaf } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { HexBadge } from '../components/HexBadge';
import { demoArchive } from '../domain/fixtures';
import { personLabel } from '../domain/people';
import { TreeWorkspace } from '../features/tree/TreeWorkspace';
import { PersonProfilePage } from '../features/tree/PersonDetails';
import { ComingSoonDialog, GlobalSearchDialog, RelativeAddDialog } from '../features/tree/PrototypeDialogs';
import { initialUiState, uiReducer } from './uiState';

type DialogState = { kind: 'search' } | { kind: 'relative'; personId: string } | { kind: 'soon'; title: string } | null;
const readRoute = () => window.location.hash.slice(1) || '/tree';
const navigate = (path: string) => { window.location.hash = path; };
const navigation = [
  { label: 'Стабло', icon: GitBranch }, { label: 'Особе', icon: Users },
  { label: 'Места', icon: MapPin }, { label: 'Догађаји', icon: CalendarDays },
  { label: 'Архив', icon: Archive },
];

export function App() {
  const archive = demoArchive;
  const [ui, dispatch] = useReducer(uiReducer, initialUiState, state => ({
    ...state, inspector: window.matchMedia('(max-width: 850px)').matches ? null : state.inspector,
  }));
  const [route, setRoute] = useState(readRoute);
  const [dialog, setDialog] = useState<DialogState>(null);
  const showUnavailable = useCallback((title: string) => setDialog({ kind: 'soon', title }), []);
  const selectPerson = useCallback((id: string) => dispatch({ type: 'select', personId: id }), []);
  const focusPerson = useCallback((id: string) => dispatch({ type: 'focus', personId: id }), []);
  const openProfile = useCallback((id: string) => { dispatch({ type: 'select', personId: id }); navigate(`/person/${id}`); }, []);
  const addRelative = useCallback((personId: string) => setDialog({ kind: 'relative', personId }), []);
  const actions = useMemo(() => ({ selectPerson, focusPerson, openProfile, addRelative, showUnavailable }), [selectPerson, focusPerson, openProfile, addRelative, showUnavailable]);
  useEffect(() => {
    const listener = () => setRoute(readRoute());
    window.addEventListener('hashchange', listener);
    return () => window.removeEventListener('hashchange', listener);
  }, []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const typing = event.target instanceof Element && !!event.target.closest('input, textarea, select, [contenteditable="true"]');
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault(); if (!dialog) setDialog({ kind: 'search' }); return;
      }
      if (dialog || typing) return;
      if (event.key === 'Escape') dispatch({ type: 'close-inspector' });
      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey && ui.selectedPersonId && route === '/tree') {
        event.preventDefault(); focusPerson(ui.selectedPersonId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, ui.selectedPersonId, focusPerson, route]);

  const profileId = route.startsWith('/person/') ? route.slice('/person/'.length) : null;
  const profile = archive.people.find(person => person.id === profileId);
  useEffect(() => {
    document.title = profile ? `${personLabel(profile)} · BelaPčela` : 'BelaPčela · Породични музеј';
    if (profile) document.querySelector<HTMLElement>('.profile-page h1')?.focus();
  }, [profile]);
  const backToTree = () => {
    navigate('/tree');
    requestAnimationFrame(() => document.getElementById('tree-title')?.focus());
  };
  return <div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.querySelector<HTMLElement>(profile ? '.profile-page h1' : '#tree-title')?.focus(); }}>Пређи на садржај</a>
    <header className="topbar">
      <a className="brand" href="#/tree" aria-label="BelaPčela · почетна"><BrandMark /><span><strong>BelaPčela</strong><small>ПОРОДИЧНИ МУЗЕЈ</small></span></a>
      <div className="archive-breadcrumb"><span />{archive.name}<ChevronRight size={14} /><span className="demo-label">Демо</span></div>
      <button className="global-search" aria-label="Претражи породичну збирку" onClick={() => setDialog({ kind: 'search' })}><Search size={18} /><span>Пронађите особу…</span><kbd>Ctrl K</kbd></button>
      <div className="local-status" title="Пробна збирка · измене се још не чувају"><ShieldCheck size={17} /><span>Локални демо</span></div>
      <div className="history-actions" aria-label="Историја измена"><button className="icon-button" disabled aria-label="Поништи — нема измена у прототипу" title="Поништи · у припреми"><Undo2 size={17} /></button><button className="icon-button" disabled aria-label="Понови — нема измена у прототипу" title="Понови · у припреми"><Redo2 size={17} /></button></div>
      <button className="backup-button" aria-label="Резервна копија" title="Резервна копија · у припреми" onClick={() => showUnavailable('Резервна копија')}><ArrowDownToLine size={17} /><span>Резервна копија</span></button>
      <button className="icon-button topbar-settings" aria-label="Подешавања — у припреми" onClick={() => showUnavailable('Подешавања')}><Settings2 size={19} /></button>
    </header>
    <nav className="main-nav" aria-label="Главна навигација">
      <div className="nav-primary">{navigation.map(({ label, icon: Icon }, index) => <button key={label} aria-label={label} className={`nav-item ${index === 0 ? 'is-active' : ''}`} aria-current={index === 0 && !profile ? 'page' : undefined} title={index > 1 ? `${label} · у припреми` : label}
        onClick={() => { if (index === 0) navigate('/tree'); else if (index === 1) setDialog({ kind: 'search' }); else showUnavailable(label); }}>
        {index === 0 ? <HexBadge label="Стабло" variant="forest"><Icon size={20} /></HexBadge> : <span className="nav-icon"><Icon size={21} strokeWidth={1.5} /></span>}<span>{label}</span>
      </button>)}</div>
      <div className="nav-bottom"><Leaf className="nav-leaf" size={24} strokeWidth={1} /><button className="nav-item" title="О прототипу" onClick={() => showUnavailable('О збирци')}><span className="nav-icon"><Info size={20} /></span><span>О збирци</span></button></div>
    </nav>
    <div className="app-content">
      <div className="demo-banner"><span className="demo-banner-dot" /><span>Пробна збирка</span><span className="banner-description">Измишљени подаци · преглед без чувања измена</span><span className="milestone-label">ПРВА ПОГЛАВЉА · 01</span></div>
      <div className="route-workspace" hidden={!!profile}><TreeWorkspace archive={archive} ui={ui} dispatch={dispatch} actions={actions} /></div>
      {profile && <PersonProfilePage person={profile} archive={archive} actions={actions} onBack={backToTree} />}
      {profileId && !profile && <p role="alert" className="route-error">Особа није пронађена. <a href="#/tree">Назад на стабло</a></p>}
    </div>
    {dialog?.kind === 'search' && <GlobalSearchDialog archive={archive} onClose={() => setDialog(null)} onSelect={id => { selectPerson(id); setDialog(null); navigate('/tree'); }} />}
    {dialog?.kind === 'relative' && <RelativeAddDialog name={personLabel(archive.people.find(person => person.id === dialog.personId)!)} onClose={() => setDialog(null)} />}
    {dialog?.kind === 'soon' && <ComingSoonDialog title={dialog.title} onClose={() => setDialog(null)} />}
  </div>;
}
