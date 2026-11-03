import { useEffect, useState } from 'react';
import type { ArchiveStore } from '../../app/useArchive';

export default function SettingsPage({ store, onBackup }: { store: ArchiveStore; onBackup: () => void }) {
  const [collections, setCollections] = useState<{ id: string; name: string }[]>([]); const [selected, setSelected] = useState(store.archive!.id);
  const [name, setName] = useState(store.archive!.name); const [message, setMessage] = useState(''); const [error, setError] = useState(''); const [storage, setStorage] = useState('');
  const [newName, setNewName] = useState('');
  const busy = store.status === 'saving';
  useEffect(() => { setName(store.archive!.name); }, [store.archive?.name]);
  useEffect(() => { setSelected(store.archive!.id); }, [store.archive?.id]);
  useEffect(() => {
    let cancelled = false;
    void store.listArchives().then(value => { if (!cancelled) setCollections(value); }).catch(() => { if (!cancelled) setError('Списак збирки није доступан.'); });
    void navigator.storage?.estimate?.().then(value => setStorage(`За овај сајт се користи око ${((value.usage || 0) / 1024 / 1024).toFixed(1)} MB.`)).catch(() => undefined);
    return () => { cancelled = true; };
  }, [store.archive?.id, store.archive?.name]);
  let lastBackup = ''; try { const value = localStorage.getItem(`belapcela-backup-${store.archive!.id}`); if (value) lastBackup = new Date(value).toLocaleString('sr'); } catch { /* Optional preference. */ }
  return <main className="catalog-page settings-page"><header className="catalog-heading"><div><span className="eyebrow">ВАША ЛОКАЛНА ЗБИРКА</span><h1 tabIndex={-1}>Подешавања</h1></div></header>
    <div className="settings-grid"><section className="settings-section"><h2>Породична збирка</h2><form className="editor-form" onSubmit={event => { event.preventDefault(); setError(''); void store.execute({ type: 'renameArchive', name }).then(() => setMessage('Назив је сачуван.')).catch(cause => setError((cause as Error).message)); }}><label className="editor-field">Назив збирке<input required maxLength={200} value={name} onChange={event => setName(event.target.value)} /></label><button className="button" disabled={store.status === 'saving' || !name.trim() || name === store.archive!.name}>Сачувај назив</button></form>
      {collections.length > 1 && <div className="collection-switch"><label className="editor-field">Сачуване збирке<select value={selected} onChange={event => setSelected(event.target.value)}>{collections.map(collection => <option key={collection.id} value={collection.id}>{collection.name} · {collection.id.slice(0, 8)}</option>)}</select></label><button className="button" disabled={selected === store.archive!.id || store.status === 'saving'} onClick={() => { setError(''); void store.selectArchive(selected).then(() => { window.location.hash = '/tree'; }).catch(cause => setError((cause as Error).message)); }}>Отвори изабрану збирку</button></div>}
    </section><section className="settings-section"><h2>Нова породична збирка</h2><p>Почните од празног стабла. Постојеће збирке, укључујући почетни пример, остају сачуване и можете их поново отворити.</p><form className="editor-form" onSubmit={event => {
      event.preventDefault(); if (busy) return; setError(''); setMessage('');
      void store.createArchive(newName).then(() => { window.location.hash = '/tree'; }).catch(cause => setError((cause as Error).message));
    }}><label className="editor-field">Назив нове збирке<input required maxLength={200} value={newName} disabled={busy} onChange={event => setNewName(event.target.value)} placeholder="Породица…" /></label><button className="button button--primary" disabled={busy || !newName.trim()}>Направи празну збирку</button></form></section>
    <section className="settings-section"><h2>Резервне копије</h2><p>Потпуна ZIP копија садржи и оригиналне датотеке. JSON је само са подацима. Увоз увек приказује преглед пре потврде.</p><button className="button button--primary" onClick={onBackup}>Резервна копија и увоз</button>{lastBackup && <p className="prototype-note">Последње припремљено ZIP преузимање: {lastBackup}. Проверите да је датотека сачувана.</p>}</section>
    <section className="settings-section"><h2>Чување и приватност</h2><p>Подаци остају у овом профилу прегледача, на истој адреси сајта. Нема налога, сервера за породичне податке, аналитике или отпремања датотека.</p><p>Брисање података сајта или профила може обрисати све збирке. Трајније чување умањује могућност аутоматског уклањања података, али не замењује резервне копије.</p>{storage && <p>{storage}</p>}<button className="button" onClick={() => { if (!navigator.storage?.persist) { setMessage('Овај прегледач нема захтев за трајније чување.'); return; } void navigator.storage.persist().then(granted => setMessage(granted ? 'Прегледач је одобрио трајније чување. Наставите да правите ZIP копије.' : 'Трајније чување није одобрено. ZIP копије остају доступне.')).catch(() => setError('Захтев за трајније чување није успео.')); }}>Затражи трајније чување</button></section>
    <section className="settings-section"><h2>Рад без интернета</h2><p>Продукцијска верзија после првог успешног учитавања чува апликацију и локалне фонтове за рад без интернета. Статус припреме приказан је испод траке збирке.</p><p>Инсталирајте БелаПчела преко менија прегледача „Инсталирај апликацију” или „Додај на почетни екран”, ако је опција доступна. Потребни су HTTPS или localhost и подршка прегледача.</p><p>Локална координатна мрежа ради без интернет подлоге. Развојна верзија не инсталира сервисни радник.</p></section></div>
    {message && <p role="status">{message}</p>}{error && <p className="form-error" role="alert">{error}</p>}
  </main>;
}
