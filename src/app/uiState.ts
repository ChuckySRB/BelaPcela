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
  | { type: 'close-inspector' };

export function uiReducer(state: UiState, action: UiAction): UiState {
  switch (action.type) {
    case 'select': return { ...state, selectedPersonId: action.personId, inspector: { kind: 'person', id: action.personId } };
    case 'focus': return { ...state, focusPersonId: action.personId, mode: 'focused' };
    case 'mode': return { ...state, mode: action.mode };
    case 'inspect-family': return { ...state, inspector: { kind: 'family', id: action.groupId } };
    case 'close-inspector': return { ...state, inspector: null };
  }
}
