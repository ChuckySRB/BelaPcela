import { Plus, X, Check } from 'lucide-react';
import type { Contact, Person } from '../../domain/model';
import { contactLabels } from '../../domain/profile';

export interface ProfileCollectionsDraft {
  aliases: { id: string; value: string }[];
  occupations: { id: string; title: string; fromYear: string; toYear: string }[];
  contacts: Contact[];
  facts: { id: string; label: string; value: string }[];
}
export function collectionDraft(person?: Person): ProfileCollectionsDraft {
  return {
    aliases: (person?.aliases || []).map(value => ({ id: crypto.randomUUID(), value })),
    occupations: (person?.occupations || []).map(item => ({ ...item, fromYear: String(item.fromYear ?? ''), toYear: String(item.toYear ?? '') })),
    contacts: structuredClone(person?.contacts || []), facts: structuredClone(person?.facts || []),
  };
}
export function collectionChanges(draft: ProfileCollectionsDraft) {
  return {
    aliases: draft.aliases.map(item => item.value.trim()).filter(Boolean),
    occupations: draft.occupations.filter(item => item.title.trim() || item.fromYear || item.toYear).map(item => ({ id: item.id, title: item.title.trim(), ...(item.fromYear !== '' ? { fromYear: Number(item.fromYear) } : {}), ...(item.toYear !== '' ? { toYear: Number(item.toYear) } : {}) })),
    contacts: draft.contacts.filter(item => item.value.trim() || item.label?.trim()).map(item => ({ ...item, value: item.value.trim(), label: item.label?.trim() || undefined })),
    facts: draft.facts.filter(item => item.label.trim() || item.value.trim()).map(item => ({ ...item, label: item.label.trim(), value: item.value.trim() })),
  };
}

export function ProfileCollectionsEditor({ draft, setDraft, primaryName, primaryOccupation, setPrimaryName, setPrimaryOccupation, active, setActive }: {
  draft: ProfileCollectionsDraft; setDraft: (draft: ProfileCollectionsDraft) => void;
  primaryName: string; primaryOccupation: string; setPrimaryName: (value: string) => void; setPrimaryOccupation: (value: string) => void;
  active: (keyof ProfileCollectionsDraft)[]; setActive: (keys: (keyof ProfileCollectionsDraft)[]) => void;
}) {
  const update = <K extends keyof ProfileCollectionsDraft>(key: K, value: ProfileCollectionsDraft[K]) => setDraft({ ...draft, [key]: value });
  const newId = () => crypto.randomUUID();
  const promoteName = (value: string) => {
    if (!value.trim()) return;
    if (primaryName.trim() && !draft.aliases.some(item => item.value.trim() === primaryName.trim())) update('aliases', [...draft.aliases, { id: newId(), value: primaryName }]);
    setPrimaryName(value);
  };
  const promoteOccupation = (value: string) => {
    if (!value.trim()) return;
    if (primaryOccupation.trim() && !draft.occupations.some(item => item.title.trim() === primaryOccupation.trim())) update('occupations', [...draft.occupations, { id: newId(), title: primaryOccupation, fromYear: '', toYear: '' }]);
    setPrimaryOccupation(value);
  };
  return <>
    {active.includes('aliases') && <section className="repeatable-fields" aria-label="Алтернативна имена"><h3>Алтернативна имена</h3>{draft.aliases.map((item, index) => <div className="collection-row" key={item.id}><label className="editor-field">Име {index + 1}<input maxLength={200} value={item.value} onChange={event => update('aliases', draft.aliases.map(row => row.id === item.id ? { ...row, value: event.target.value } : row))} /></label><button type="button" className="icon-button" aria-label={`Користи име ${index + 1} за приказ`} title="Користи као приказано име; претходно се задржава" onClick={() => promoteName(item.value)}><Check size={16} /></button><button type="button" className="icon-button" aria-label={`Уклони алтернативно име ${index + 1}`} onClick={() => update('aliases', draft.aliases.filter(row => row.id !== item.id))}><X size={16} /></button></div>)}<button type="button" className="text-button" onClick={() => update('aliases', [...draft.aliases, { id: newId(), value: '' }])}><Plus size={15} />Додај име</button></section>}
    {active.includes('occupations') && <section className="repeatable-fields" aria-label="Занимања кроз време"><h3>Занимања кроз време</h3>{draft.occupations.map((item, index) => <div className="collection-item" key={item.id}><div className="collection-row"><label className="editor-field">Занимање {index + 1}<input maxLength={200} value={item.title} onChange={event => update('occupations', draft.occupations.map(row => row.id === item.id ? { ...row, title: event.target.value } : row))} /></label><button type="button" className="icon-button" aria-label={`Користи занимање ${index + 1} за приказ`} title="Користи као главно занимање" onClick={() => promoteOccupation(item.title)}><Check size={16} /></button><button type="button" className="icon-button" aria-label={`Уклони занимање ${index + 1}`} onClick={() => update('occupations', draft.occupations.filter(row => row.id !== item.id))}><X size={16} /></button></div><div className="year-pair">{(['fromYear', 'toYear'] as const).map(key => <label className="editor-field" key={key}>{key === 'fromYear' ? 'Од године' : 'До године'}<input type="number" min={-9999} max={9999} step={1} value={item[key]} onChange={event => update('occupations', draft.occupations.map(row => row.id === item.id ? { ...row, [key]: event.target.value } : row))} /></label>)}</div></div>)}<button type="button" className="text-button" onClick={() => update('occupations', [...draft.occupations, { id: newId(), title: '', fromYear: '', toYear: '' }])}><Plus size={15} />Додај занимање</button></section>}
    {active.includes('contacts') && <section className="repeatable-fields" aria-label="Контакти и линкови"><h3>Контакти и линкови</h3>{draft.contacts.map((item, index) => <div className="collection-item" key={item.id}><div className="collection-row"><label className="editor-field">Врста контакта {index + 1}<select value={item.kind} onChange={event => update('contacts', draft.contacts.map(row => row.id === item.id ? { ...row, kind: event.target.value as Contact['kind'] } : row))}>{Object.entries(contactLabels).map(([key, value]) => <option key={key} value={key}>{value}</option>)}</select></label><button type="button" className="icon-button" aria-label={`Уклони контакт ${index + 1}`} onClick={() => update('contacts', draft.contacts.filter(row => row.id !== item.id))}><X size={16} /></button></div><label className="editor-field">Контакт {index + 1}<input maxLength={500} value={item.value} onChange={event => update('contacts', draft.contacts.map(row => row.id === item.id ? { ...row, value: event.target.value } : row))} /></label><label className="editor-field">Ознака контакта {index + 1} (необавезно)<input maxLength={200} value={item.label || ''} onChange={event => update('contacts', draft.contacts.map(row => row.id === item.id ? { ...row, label: event.target.value } : row))} /></label></div>)}<button type="button" className="text-button" onClick={() => update('contacts', [...draft.contacts, { id: newId(), kind: 'email', value: '' }])}><Plus size={15} />Додај контакт</button></section>}
    {active.includes('facts') && <section className="repeatable-fields" aria-label="Додатни подаци"><h3>Додатни подаци</h3>{draft.facts.map((item, index) => <div className="collection-item" key={item.id}><div className="collection-row"><label className="editor-field">Назив податка {index + 1}<input maxLength={200} value={item.label} onChange={event => update('facts', draft.facts.map(row => row.id === item.id ? { ...row, label: event.target.value } : row))} /></label><button type="button" className="icon-button" aria-label={`Уклони податак ${index + 1}`} onClick={() => update('facts', draft.facts.filter(row => row.id !== item.id))}><X size={16} /></button></div><label className="editor-field">Вредност податка {index + 1}<input maxLength={1000} value={item.value} onChange={event => update('facts', draft.facts.map(row => row.id === item.id ? { ...row, value: event.target.value } : row))} /></label></div>)}<button type="button" className="text-button" onClick={() => update('facts', [...draft.facts, { id: newId(), label: '', value: '' }])}><Plus size={15} />Додај још један податак</button></section>}
    <details className="add-field-menu"><summary><Plus size={16} />Додај одељак</summary><div>{([['aliases', 'Алтернативна имена'], ['occupations', 'Занимања кроз време'], ['contacts', 'Контакти и линкови'], ['facts', 'Додатни подаци']] as const).filter(([key]) => !active.includes(key)).map(([key, label]) => <button type="button" key={key} onClick={() => setActive([...active, key])}>{label}</button>)}</div></details>
  </>;
}
