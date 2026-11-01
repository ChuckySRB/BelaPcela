/** Canonical records are independent of React Flow and visual family junctions. */
export interface Entity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Person extends Entity {
  name?: string;
  nickname?: string;
  biography?: string;
  occupation?: string;
  preferredMediaId?: string;
  maidenName?: string;
  aliases?: string[];
  occupations?: Occupation[];
  contacts?: Contact[];
  facts?: PersonFact[];
  identityNote?: string;
}
export interface Occupation { id: string; title: string; fromYear?: number; toYear?: number }
export interface Contact { id: string; kind: 'email' | 'phone' | 'website' | 'social' | 'other'; label?: string; value: string }
export interface PersonFact { id: string; label: string; value: string }

export type ParentageKind = 'biological' | 'adoptive' | 'other';
export interface ParentChildRelationship extends Entity {
  parentId: string;
  childId: string;
  kind: ParentageKind;
}

export interface Partnership extends Entity {
  personIds: [string, string];
  kind: 'married' | 'partners' | 'unspecified';
  fromYear?: number;
}

export interface KinshipAssertion extends Entity {
  personIds: [string, string];
  label: string;
}

export interface Place extends Entity { name: string }
export interface LifeEvent extends Entity {
  type: 'birth' | 'death';
  personId: string;
  date?: { year: number; approximate?: boolean };
  placeId?: string;
}
export interface Media extends Entity { src: string; alt: string }
export interface Source extends Entity { title?: string; citation?: string }

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
  sources?: Source[];
}
