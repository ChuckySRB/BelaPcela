/** Canonical records are independent of React Flow and visual family junctions. */
export interface Person {
  id: string;
  name?: string;
  nickname?: string;
  biography?: string;
  occupation?: string;
  preferredMediaId?: string;
}

export type ParentageKind = 'biological' | 'adoptive' | 'other';
export interface ParentChildRelationship {
  id: string;
  parentId: string;
  childId: string;
  kind: ParentageKind;
}

export interface Partnership {
  id: string;
  personIds: [string, string];
  kind: 'married' | 'partners' | 'unspecified';
  fromYear?: number;
}

export interface KinshipAssertion {
  id: string;
  personIds: [string, string];
  label: string;
}

export interface Place { id: string; name: string }
export interface LifeEvent {
  id: string;
  type: 'birth' | 'death';
  personId: string;
  date?: { year: number; approximate?: boolean };
  placeId?: string;
}
export interface Media { id: string; src: string; alt: string }

export interface FamilyArchive {
  id: string;
  name: string;
  people: Person[];
  parentChildRelationships: ParentChildRelationship[];
  partnerships: Partnership[];
  kinshipAssertions: KinshipAssertion[];
  events: LifeEvent[];
  places: Place[];
  media: Media[];
}
