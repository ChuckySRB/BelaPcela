import type { ParentageKind } from '../domain/model';

export type GraphMode = 'whole' | 'focused';
export interface GraphViewState {
  mode: GraphMode;
  focusPersonId: string;
  /** Reserved presentation state; branch controls arrive in milestone 3. */
  collapsedBranches: readonly string[];
}
export interface FamilyGroup {
  id: string;
  parentIds: string[];
  childIds: string[];
  partnershipIds: string[];
  relationshipIds: string[];
}
export interface VisualNode {
  id: string;
  kind: 'person' | 'family';
  personId?: string;
  group?: FamilyGroup;
  width: number;
  height: number;
}
export interface VisualEdge {
  id: string;
  source: string;
  target: string;
  groupId?: string;
  relationshipIds: string[];
  kind: ParentageKind | 'connection' | 'assertion';
  label?: string;
}
export interface GraphProjection {
  nodes: VisualNode[];
  edges: VisualEdge[];
  groups: FamilyGroup[];
  visiblePersonIds: string[];
  disconnectedPersonIds: string[];
}
export interface PositionedNode extends VisualNode { x: number; y: number }
export interface LayoutService {
  layout(projection: GraphProjection): Promise<PositionedNode[]>;
}

export const PORTRAIT_SIZE = { width: 180, height: 216 };
export const HUB_SIZE = { width: 44, height: 44 };
