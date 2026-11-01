import { createContext, useContext } from 'react';
import type { MediaLink } from '../domain/model';

export interface CatalogActions {
  editPlace: (id?: string) => void;
  editEvent: (id?: string, personId?: string) => void;
  editMedia: (id: string) => void;
  uploadMedia: (links?: MediaLink[]) => void;
}
export const CatalogContext = createContext<CatalogActions | null>(null);
export const useCatalogActions = () => useContext(CatalogContext);
export const recordHref = (kind: 'person' | 'place' | 'event' | 'media', id: string) => `#/${kind}/${encodeURIComponent(id)}`;
