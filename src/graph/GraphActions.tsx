import { createContext, useContext } from 'react';
import type { FamilyArchive, RelationshipRef } from '../domain/model';

export interface GraphActions {
  archive: FamilyArchive;
  selectPerson: (id: string) => void;
  focusPerson: (id: string) => void;
  openProfile: (id: string) => void;
  addRelative: (id: string) => void;
  inspectFamily: (id: string) => void;
  toggleBranch: (id: string) => void;
  inspectRelationship?: (ref: RelationshipRef) => void;
}
export const GraphActionsContext = createContext<GraphActions | null>(null);
export function useGraphActions() {
  const actions = useContext(GraphActionsContext);
  if (!actions) throw new Error('Graph actions provider is missing.');
  return actions;
}
