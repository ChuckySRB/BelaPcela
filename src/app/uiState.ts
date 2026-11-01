import type { GraphMode } from '../graph/types';

export type InspectorTarget = { kind: 'person'; id: string } | { kind: 'family'; id: string } | null;
export interface UiState {
  selectedPersonId: string | null;
  focusPersonId: string;
  mode: GraphMode;
  collapsedBranches: readonly string[];
  inspector: InspectorTarget;
}
export const initialUiState: UiState = {
  selectedPersonId: 'nikola', focusPersonId: 'nikola', mode: 'whole', collapsedBranches: [],
  inspector: { kind: 'person', id: 'nikola' },
};
export type UiAction =
  | { type: 'select'; personId: string }
  | { type: 'focus'; personId: string }
  | { type: 'mode'; mode: GraphMode }
  | { type: 'inspect-family'; groupId: string }
  | { type: 'reconcile'; personIds: string[] }
  | { type: 'toggle-branch'; groupId: string }
  | { type: 'expand-all' }
  | { type: 'close-inspector' };

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'toggle-branch': return { ...state, collapsedBranches: state.collapsedBranches.includes(action.groupId)
      ? state.collapsedBranches.filter(id => id !== action.groupId) : [...state.collapsedBranches, action.groupId] };
    case 'expand-all': return { ...state, collapsedBranches: [] };
    case 'reconcile': {
      const exists = (id: string | null) => !!id && action.personIds.includes(id);
      const focusPersonId = exists(state.focusPersonId) ? state.focusPersonId : action.personIds[0] || '';
      const selectedPersonId = exists(state.selectedPersonId) ? state.selectedPersonId : focusPersonId || null;
      const inspector = state.inspector?.kind === 'person' && !exists(state.inspector.id)
        ? selectedPersonId ? { kind: 'person' as const, id: selectedPersonId } : null : state.inspector;
      if (focusPersonId === state.focusPersonId && selectedPersonId === state.selectedPersonId && inspector === state.inspector) return state;
      return { ...state, focusPersonId, selectedPersonId, inspector };
    }
    case 'select': return { ...state, selectedPersonId: action.personId, inspector: { kind: 'person', id: action.personId } };
    case 'focus': return { ...state, focusPersonId: action.personId, mode: 'focused' };
    case 'mode': return { ...state, mode: action.mode };
    case 'inspect-family': return { ...state, inspector: { kind: 'family', id: action.groupId } };
    case 'close-inspector': return { ...state, inspector: null };
  }
}
