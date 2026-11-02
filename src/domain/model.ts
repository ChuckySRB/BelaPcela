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

export type RelationshipType = 'parentChild' | 'partnership' | 'kinship';
export interface RelationshipRef { type: RelationshipType; id: string }
export type RelationshipRecord =
  | { type: 'parentChild'; record: ParentChildRelationship }
  | { type: 'partnership'; record: Partnership }
  | { type: 'kinship'; record: KinshipAssertion };

export interface Place extends Entity {
  name: string;
  alternativeNames?: string[];
  coordinates?: { latitude: number; longitude: number };
  address?: string;
  kind?: 'settlement' | 'region' | 'country' | 'building' | 'cemetery' | 'other';
  parentPlaceId?: string;
  description?: string;
}
export interface GenealogyDate {
  year: number; month?: number; day?: number; approximate?: boolean;
  endYear?: number; endMonth?: number; endDay?: number;
}
export type EventType = 'birth' | 'death' | 'marriage' | 'residence' | 'migration' | 'work' | 'burial' | 'other';
export interface EventParticipant { personId: string; role: string }
export interface LifeEvent extends Entity {
  type: EventType;
  title?: string;
  participants: EventParticipant[];
  date?: GenealogyDate;
  placeId?: string;
  description?: string;
  sourceIds?: string[];
}
export type MediaLink = { entityType: 'person' | 'event' | 'place' | 'source'; entityId: string };
export interface Media extends Entity {
  alt: string;
  /** Older local references are retained; newly imported media always uses mediaFiles Blobs. */
  src?: string;
  title?: string;
  originalFilename?: string;
  mimeType?: string;
  size?: number;
  tags?: string[];
  links?: MediaLink[];
}
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
