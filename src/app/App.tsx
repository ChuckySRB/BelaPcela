import { lazy, Suspense, useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { Archive, ArrowDownToLine, CalendarDays, ChevronRight, GitBranch, Info, MapPin, Redo2, Search, Settings2, Undo2, Users, ShieldCheck, Leaf, Sun, Moon } from 'lucide-react';
import { BrandMark } from '../components/BrandMark';
import { HexBadge } from '../components/HexBadge';
import { personLabel } from '../domain/people';
import { TreeWorkspace } from '../features/tree/TreeWorkspace';
import { PersonProfilePage } from '../features/tree/PersonDetails';
import { GlobalSearchDialog } from '../features/people/GlobalSearchDialog';
import { AboutDialog } from '../features/settings/AboutDialog';
import { EmptyCollection } from '../features/tree/EmptyCollection';
import { PersonEditorDialog } from '../features/people/PersonEditorDialog';
import { RelativeEditorDialog } from '../features/people/RelativeEditorDialog';
import { useArchive, type ArchiveStore } from './useArchive';
import type { ArchiveCommand } from '../services/commands';
import { initialUiState, uiReducer } from './uiState';
import { useTheme } from './useTheme';
import { CatalogContext, type CatalogActions } from './CatalogContext';
import { EventsPage } from '../features/events/EventsPage';
import { EventEditor } from '../features/events/EventEditor';
import { PlacesPage } from '../features/places/PlacesPage';
import { PlaceEditor } from '../features/places/PlaceEditor';
import { MediaContext } from '../features/media/MediaContext';
import { MediaPage } from '../features/media/MediaPage';
import { MediaEditor, MediaUploadDialog } from '../features/media/MediaEditors';
import type { MediaLink, RelationshipRef } from '../domain/model';
import { OfflineStatus } from './OfflineStatus';
const ArchiveBackupDialog = lazy(() => import('../features/settings/ArchiveBackupDialog').then(module => ({ default: module.ArchiveBackupDialog })));
const SettingsPage = lazy(() => import('../features/settings/SettingsPage'));
const RelationshipDialog = lazy(() => import('../features/relationships/RelationshipDialog').then(module => ({ default: module.RelationshipDialog })));

type DialogState = { kind: 'relationship'; target: RelationshipRef; mode: 'view' | 'edit' | 'delete' } | { kind: 'backup' } | { kind: 'search' } | { kind: 'relative'; personId: string } | { kind: 'edit'; personId?: string } | { kind: 'event'; id?: string; personId?: string } | { kind: 'place'; id?: string } | { kind: 'upload'; links: MediaLink[] } | { kind: 'media'; id: string } | { kind: 'about' } | null;
const readRoute = () => window.location.hash.slice(1) || '/tree';
const navigate = (path: string) => { window.location.hash = path; };
const navigation = [
  { label: 'Стабло', icon: GitBranch }, { label: 'Особе', icon: Users },
  { label: 'Места', icon: MapPin }, { label: 'Догађаји', icon: CalendarDays },
  { label: 'Архив', icon: Archive }, { label: 'Подешавања', icon: Settings2 },
];

export function App() {
  const store = useArchive();
  if (!store.archive) return <main className="storage-loading"><BrandMark /><h1>БелаПчела</h1><p role={store.error ? 'alert' : 'status'}>{store.error || 'Отварамо вашу локалну збирку…'}</p>{store.error && <button className="button button--primary" onClick={() => void store.reload()}>Покушај поново</button>}</main>;
  return <ArchiveApp key={`${store.archive.id}:${store.session}`} store={store} />;
}

function ArchiveApp({ store }: { store: ArchiveStore }) {
  const { theme, toggleTheme } = useTheme();
  const archive = store.archive!;
  const [uiState, dispatch] = useReducer(uiReducer, initialUiState, state => ({
    ...state, inspector: window.matchMedia('(max-width: 850px)').matches ? null : state.inspector,
  }));
  // Resolve removed selections in the same render as undo, avoiding a one-frame inspector collapse.
  const ui = useMemo(() => uiReducer(uiState, { type: 'reconcile', personIds: archive.people.map(person => person.id) }), [uiState, archive.people]);
  const [route, setRoute] = useState(readRoute);
  const [dialog, setDialog] = useState<DialogState>(null);
  const selectPerson = useCallback((id: string) => dispatch({ type: 'select', personId: id }), []);
  const focusPerson = useCallback((id: string) => dispatch({ type: 'focus', personId: id }), []);
  const openProfile = useCallback((id: string) => { dispatch({ type: 'select', personId: id }); navigate(`/person/${id}`); }, []);
  const addRelative = useCallback((personId: string) => setDialog({ kind: 'relative', personId }), []);
  const editPerson = useCallback((personId: string) => setDialog({ kind: 'edit', personId }), []);
  const editRelationship = useCallback((target: RelationshipRef) => setDialog({ kind: 'relationship', target, mode: 'edit' }), []);
  const deleteRelationship = useCallback((target: RelationshipRef) => setDialog({ kind: 'relationship', target, mode: 'delete' }), []);
  const inspectRelationship = useCallback((target: RelationshipRef) => setDialog({ kind: 'relationship', target, mode: 'view' }), []);
  const actions = useMemo(() => ({ selectPerson, focusPerson, openProfile, addRelative, editPerson, editRelationship, deleteRelationship, inspectRelationship }), [selectPerson, focusPerson, openProfile, addRelative, editPerson, editRelationship, deleteRelationship, inspectRelationship]);
  const catalogActions = useMemo<CatalogActions>(() => ({ editPlace: id => setDialog({ kind: 'place', id }), editEvent: (id, personId) => setDialog({ kind: 'event', id, personId }), editMedia: id => setDialog({ kind: 'media', id }), uploadMedia: (links = []) => setDialog({ kind: 'upload', links }) }), []);
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
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (store.status === 'saving') return;
        if (event.shiftKey && store.canRedo) void store.redo().catch(() => undefined);
        else if (!event.shiftKey && store.canUndo) void store.undo().catch(() => undefined);
        return;
      }
      if (event.key === 'Escape' && route === '/tree') dispatch({ type: 'close-inspector' });
      if (event.key.toLowerCase() === 'f' && !event.ctrlKey && !event.metaKey && !event.altKey && ui.selectedPersonId && route === '/tree') {
        event.preventDefault(); focusPerson(ui.selectedPersonId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialog, ui.selectedPersonId, focusPerson, route, store]);

  const profileId = route.startsWith('/person/') ? route.slice('/person/'.length) : null;
  const profile = archive.people.find(person => person.id === profileId);
  const placesRoute = route === '/places' || route.startsWith('/place/');
  const eventsRoute = route === '/events' || route.startsWith('/event/');
  const mediaRoute = route === '/media' || route.startsWith('/media/');
  const settingsRoute = route === '/settings';
  const treeActive = !profile && !placesRoute && !eventsRoute && !mediaRoute && !settingsRoute;
  const routeId = (prefix: string) => { try { return route.startsWith(prefix) ? decodeURIComponent(route.slice(prefix.length)) : undefined; } catch { return '__invalid__'; } };
  useEffect(() => {
    document.title = `${profile ? personLabel(profile) : settingsRoute ? 'Подешавања' : placesRoute ? 'Места' : eventsRoute ? 'Догађаји' : mediaRoute ? 'Архив' : 'Породични музеј'} · БелаПчела`;
  }, [profile?.id, profile?.name, settingsRoute, placesRoute, eventsRoute, mediaRoute]);
  useEffect(() => {
    if (profile) document.querySelector<HTMLElement>('.profile-page h1')?.focus();
  }, [profile?.id]);
  useEffect(() => {
    if (treeActive || profile) return;
    const frame = requestAnimationFrame(() => document.querySelector<HTMLElement>('.catalog-page h1')?.focus());
    return () => cancelAnimationFrame(frame);
  }, [route, treeActive, profile]);
  const backToTree = () => {
    navigate('/tree');
    requestAnimationFrame(() => document.getElementById('tree-title')?.focus());
  };
  const saveCommand = async (command: ArchiveCommand) => {
    const result = await store.execute(command);
    if (result.personId && command.type !== 'setPortrait') selectPerson(result.personId);
    if (command.type === 'createPerson') dispatch({ type: 'mode', mode: 'whole' });
    if (command.type === 'savePlace' && !command.placeId && result.recordId) navigate(`/place/${encodeURIComponent(result.recordId)}`);
    if (command.type === 'saveEvent' && !command.eventId && result.recordId) navigate(`/event/${encodeURIComponent(result.recordId)}`);
    setDialog(null);
    if (command.type === 'updateRelationship' || command.type === 'deleteRelationship') requestAnimationFrame(() => {
      if (document.activeElement === document.body) document.querySelector<HTMLElement>(profile ? '.profile-page h1' : '#tree-title')?.focus();
    });
  };
  return <MediaContext.Provider value={store.loadMedia}><CatalogContext.Provider value={catalogActions}><div className="app-shell">
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.querySelector<HTMLElement>(profile ? '.profile-page h1' : treeActive ? '#tree-title' : '.catalog-page h1')?.focus(); }}>Пређи на садржај</a>
    <header className="topbar">
      <a className="brand" href="#/tree" aria-label="БелаПчела · почетна"><BrandMark /><span><strong>БелаПчела</strong><small>ПОРОДИЧНИ МУЗЕЈ</small></span></a>
      <div className="archive-breadcrumb"><span />{archive.name}<ChevronRight size={14} /><span className="demo-label">Локално</span></div>
      <button className="global-search" aria-label="Претражи породичну збирку" onClick={() => setDialog({ kind: 'search' })}><Search size={18} /><span>Пронађите особу…</span><kbd>Ctrl K</kbd></button>
      <div className={`local-status ${store.error ? 'has-error' : ''}`} role="status" title={store.error || 'Подаци се чувају само у овом прегледачу'}><ShieldCheck size={17} /><span>{store.status === 'saving' ? 'Чување…' : store.status === 'error' ? 'Није сачувано' : 'Сачувано локално'}</span></div>
      <div className="history-actions" aria-label="Историја измена"><button className="icon-button" disabled={!store.canUndo || store.status === 'saving'} aria-label="Поништи" title={`Поништи (Ctrl+Z)${store.undoLabel ? ` · ${store.undoLabel}` : ''}`} onClick={() => void store.undo().catch(() => undefined)}><Undo2 size={17} /></button><button className="icon-button" disabled={!store.canRedo || store.status === 'saving'} aria-label="Понови" title={`Понови (Ctrl+Shift+Z)${store.redoLabel ? ` · ${store.redoLabel}` : ''}`} onClick={() => void store.redo().catch(() => undefined)}><Redo2 size={17} /></button></div>
      <button className="backup-button" aria-label="Резервна копија" title="Резервна копија и увоз" onClick={() => setDialog({ kind: 'backup' })}><ArrowDownToLine size={17} /><span>Резервна копија</span></button>
      <button className="icon-button theme-toggle" aria-label={theme === 'light' ? 'Укључи тамну тему' : 'Укључи светлу тему'} title={theme === 'light' ? 'Тамна тема' : 'Светла тема'} onClick={toggleTheme}>{theme === 'light' ? <Moon size={19} /> : <Sun size={19} />}</button>
      <button className="icon-button topbar-settings" aria-label="Отвори подешавања" onClick={() => navigate('/settings')}><Settings2 size={19} /></button>
    </header>
    <nav className="main-nav" aria-label="Главна навигација">
      <div className="nav-primary">{navigation.map(({ label, icon: Icon }, index) => { const active = index === 0 ? treeActive : index === 2 ? placesRoute : index === 3 ? eventsRoute : index === 4 ? mediaRoute : index === 5 ? settingsRoute : false; return <button key={label} aria-label={label} className={`nav-item ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined} title={label}
        onClick={() => { if (index === 0) navigate('/tree'); else if (index === 1) setDialog({ kind: 'search' }); else if (index === 2) navigate('/places'); else if (index === 3) navigate('/events'); else if (index === 4) navigate('/media'); else navigate('/settings'); }}>
        {active ? <HexBadge label={label} variant="forest"><Icon size={20} /></HexBadge> : <span className="nav-icon"><Icon size={21} strokeWidth={1.5} /></span>}<span>{label}</span>
      </button>; })}</div>
      <div className="nav-bottom"><Leaf className="nav-leaf" size={24} strokeWidth={1} /><button className="nav-item" title="О БелаПчели" onClick={() => setDialog({ kind: 'about' })}><span className="nav-icon"><Info size={20} /></span><span>О збирци</span></button></div>
    </nav>
    <div className="app-content">
      <div className="demo-banner"><span className="demo-banner-dot" /><span>{archive.id === 'demo-petronic' ? 'Почетни пример' : 'Локална збирка'}</span><span className="banner-description">{archive.id === 'demo-petronic' ? 'Измишљена породица Петронић' : 'Чува се у овом прегледачу'}</span>{archive.id === 'demo-petronic' && <button className="text-button" onClick={() => navigate('/settings')}>Нова збирка</button>}<button className="text-button backup-reminder" onClick={() => setDialog({ kind: 'backup' })}>Направи резервну копију</button></div>
      <OfflineStatus />
      {store.error && <div className="storage-error" role="alert"><span>{store.error}</span><button className="text-button" onClick={() => void store.reload()}>Освежи из локалне збирке</button></div>}
      <div className="route-workspace" hidden={!treeActive}>{archive.people.length ? <TreeWorkspace archive={archive} ui={ui} dispatch={dispatch} actions={actions} active={treeActive} /> : <EmptyCollection onCreate={() => setDialog({ kind: 'edit' })} onBackup={() => setDialog({ kind: 'backup' })} />}</div>
      {profile && <PersonProfilePage key={profile.id} person={profile} archive={archive} actions={actions} onBack={backToTree} onSave={saveCommand} onReload={store.reload} />}
      {placesRoute && <PlacesPage key={route} archive={archive} placeId={routeId('/place/')} />}
      {eventsRoute && <EventsPage key={route} archive={archive} eventId={routeId('/event/')} />}
      {mediaRoute && <MediaPage key={route} archive={archive} mediaId={routeId('/media/')} onSave={saveCommand} />}
      {settingsRoute && <Suspense fallback={<p role="status">Отварамо подешавања…</p>}><SettingsPage store={store} onBackup={() => setDialog({ kind: 'backup' })} onAbout={() => setDialog({ kind: 'about' })} /></Suspense>}
      {profileId && !profile && <p role="alert" className="route-error">Особа није пронађена. <a href="#/tree">Назад на стабло</a></p>}
    </div>
    {dialog?.kind === 'search' && <GlobalSearchDialog archive={archive} onCreate={() => setDialog({ kind: 'edit' })} onClose={() => setDialog(null)} onSelect={id => { selectPerson(id); setDialog(null); navigate('/tree'); }} />}
    {dialog?.kind === 'edit' && <PersonEditorDialog archive={archive} person={archive.people.find(person => person.id === dialog.personId)} onClose={() => setDialog(null)} onSave={saveCommand} onReload={store.reload} />}
    {dialog?.kind === 'relative' && <RelativeEditorDialog anchorId={dialog.personId} archive={archive} onClose={() => setDialog(null)} onSave={saveCommand} onReload={store.reload} />}
    {dialog?.kind === 'place' && <PlaceEditor place={archive.places.find(place => place.id === dialog.id)} archive={archive} onClose={() => setDialog(null)} onSave={saveCommand} onReload={store.reload} />}
    {dialog?.kind === 'event' && <EventEditor event={archive.events.find(event => event.id === dialog.id)} personId={dialog.personId} archive={archive} onClose={() => setDialog(null)} onSave={saveCommand} onReload={store.reload} />}
    {dialog?.kind === 'upload' && <MediaUploadDialog links={dialog.links} archive={archive} onClose={() => setDialog(null)} onUpload={async (files, links) => { await store.uploadFiles(files, links); setDialog(null); }} />}
    {dialog?.kind === 'media' && archive.media.some(item => item.id === dialog.id) && <MediaEditor media={archive.media.find(item => item.id === dialog.id)!} archive={archive} onClose={() => setDialog(null)} onSave={saveCommand} onReload={store.reload} />}
    {dialog?.kind === 'about' && <AboutDialog onClose={() => setDialog(null)} onSettings={() => { setDialog(null); navigate('/settings'); }} onBackup={() => setDialog({ kind: 'backup' })} />}
    {dialog?.kind === 'relationship' && <Suspense fallback={<div className="canvas-notice" role="status">Отварамо породичну везу…</div>}><RelationshipDialog key={`${dialog.target.type}:${dialog.target.id}:${dialog.mode}`} target={dialog.target} initialMode={dialog.mode} archive={archive} onClose={() => setDialog(null)} onSave={saveCommand} onReload={store.reload} /></Suspense>}
    {dialog?.kind === 'backup' && <Suspense fallback={<div className="canvas-notice" role="status">Отварамо резервне копије…</div>}><ArchiveBackupDialog store={store} onClose={() => setDialog(null)} /></Suspense>}
  </div></CatalogContext.Provider></MediaContext.Provider>;
}
