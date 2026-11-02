import { Pencil, Trash2 } from 'lucide-react';
import type { RelationshipRef } from '../../domain/model';
export function RelationshipButtons({ relationship, description, edit, remove }: { relationship: RelationshipRef; description: string; edit?: (ref: RelationshipRef) => void; remove?: (ref: RelationshipRef) => void }) {
  if (!edit && !remove) return null;
  return <div className="relationship-actions">{edit && <button type="button" className="icon-button" aria-label={`Измени везу: ${description}`} title="Измени везу" onClick={() => edit(relationship)}><Pencil size={16} /></button>}{remove && <button type="button" className="icon-button relationship-delete" aria-label={`Обриши везу: ${description}`} title="Обриши везу" onClick={() => remove(relationship)}><Trash2 size={16} /></button>}</div>;
}
