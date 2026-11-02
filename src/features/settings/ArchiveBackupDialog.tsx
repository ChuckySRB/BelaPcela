import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { Modal } from '../../components/Modal';
import type { ArchiveStore } from '../../app/useArchive';
import { downloadArchive, exportDataJSON, exportFullZIP, preflightImport, type ImportPlan } from '../../services/archiveTransfer';

export function ArchiveBackupDialog({ store, onClose }: { store: ArchiveStore; onClose: () => void }) {
  const [busy, setBusy] = useState(''); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [plan, setPlan] = useState<ImportPlan | null>(null); const [mode, setMode] = useState<'new' | 'replace'>('new'); const [confirmed, setConfirmed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const archive = store.archive!;
  async function backup(full: boolean) {
    setBusy('Припремамо резервну копију…'); setError(''); setMessage('');
    try {
      const snapshot = full ? await store.transferSnapshot() : { archive, files: [] };
      const blob = full ? await exportFullZIP(snapshot) : exportDataJSON(snapshot.archive);
      downloadArchive(blob, `BelaPcela-${new Date().toISOString().slice(0, 10)}.${full ? 'zip' : 'json'}`);
      setMessage(`${full ? 'ZIP' : 'JSON'} преузимање је покренуто. Проверите датотеку у фасцикли преузимања.`);
      if (full) try { localStorage.setItem(`belapcela-backup-${snapshot.archive.id}`, new Date().toISOString()); } catch { /* Optional preference. */ }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Копија није направљена. Покушајте поново.'); }
    finally { setBusy(''); }
  }
  async function inspect(file?: File) {
    setPlan(null); setConfirmed(false); setError(''); setMessage(''); if (!file) return;
    setBusy('Проверавамо формат, везе и оригиналне датотеке…');
    try { setPlan(await preflightImport(file)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Увоз није исправан.'); }
    finally { setBusy(''); if (fileInput.current) fileInput.current.value = ''; }
  }
  async function install() {
    if (!plan || !confirmed) return;
    setBusy('Чувамо прегледану збирку…'); setError('');
    try { await store.importArchive(plan, mode); window.location.hash = '/tree'; onClose(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Увоз није сачуван. Постојећа збирка није промењена.'); setBusy(''); }
  }
  return <Modal title="Резервна копија и увоз" wide onClose={() => { if (!busy) onClose(); }}>
    <p className="dialog-intro">Збирка се чува само у овом прегледачу. Брисање података сајта или профила може је обрисати. Чувајте ZIP копије и на другом уређају.</p>
    <fieldset disabled={!!busy || store.status === 'saving'} className="transfer-controls">
      <section className="transfer-section"><h3>Преузмите копију</h3><p>ZIP садржи породичне податке и све оригиналне фотографије и датотеке.</p><button data-autofocus className="button button--primary" onClick={() => void backup(true)}><Download size={17} />Направи ZIP резервну копију</button>
        <p>JSON садржи само податке и описе. Фотографије, документи и други оригинали нису укључени.</p><button className="button" onClick={() => void backup(false)}>Преузми JSON — само подаци</button></section>
      <section className="transfer-section"><h3>Отворите постојећу копију</h3><p>ZIP до 250 MB или JSON до 10 MB. Прво следи преглед; избор датотеке не мења збирку.</p><label className="editor-field">ZIP или JSON за увоз<input ref={fileInput} type="file" accept=".zip,.json,application/zip,application/json" onChange={event => void inspect(event.target.files?.[0])} /></label></section>
      {plan && <section className="import-review" aria-labelledby="import-review-title"><h3 id="import-review-title">Преглед увоза: {plan.archive.name}</h3><dl className="import-counts"><div><dt>Особе</dt><dd>{plan.archive.people.length}</dd></div><div><dt>Догађаји</dt><dd>{plan.archive.events.length}</dd></div><div><dt>Места</dt><dd>{plan.archive.places.length}</dd></div><div><dt>Оригиналне датотеке</dt><dd>{plan.files.length}</dd></div></dl>
        {plan.migratedFrom && <p>Подаци верзије {plan.migratedFrom} су проверени и прилагођени текућем формату. Изворна копија остаје иста.</p>}
        {plan.kind === 'data-only' && <p className="backup-warning">Ово је JSON само са подацима. Оригиналне датотеке нису укључене.</p>}{plan.warnings.map(warning => <p className="backup-warning" key={warning}>{warning}</p>)}
        <label className="editor-field">Начин увоза<select value={mode} onChange={event => { setMode(event.target.value as typeof mode); setConfirmed(false); }}><option value="new">Отвори као нову збирку</option><option value="replace">Замени текућу збирку</option></select></label>
        <p>{mode === 'new' ? 'Текућа збирка остаје сачувана. Збирке можете мењати у Подешавањима.' : `Сви подаци и датотеке збирке „${archive.name}” биће замењени. Прво преузмите ZIP копију. Увоз не можете поништити дугметом Поништи.`}</p>
        <label className="checkbox-field"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{mode === 'new' ? 'Прегледао/ла сам податке и желим да отворим нову збирку.' : 'Разумем и потврђујем замену свих података и датотека текуће збирке.'}</label>
        <button className="button button--primary" disabled={!confirmed} onClick={() => void install()}><Upload size={17} />Потврди увоз</button>
      </section>}
    </fieldset>
    {busy && <p role="status">{busy}</p>}{message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </Modal>;
}
