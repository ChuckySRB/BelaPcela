import type { Entity, FamilyArchive } from '../domain/model';
import type Dexie from 'dexie';
import { validateArchive, DomainError } from '../domain/validation';
import { collectionKeys, DATA_SCHEMA_VERSION, createFamilyDatabase } from './database';
import type { MediaFileInput, StoredMediaFile } from './mediaFiles';
import type { ImportPlan, TransferSnapshot } from '../services/archiveTransfer';
import { createEmptyArchive } from '../domain/archive';

interface ArchiveMetadata { id: string; name: string; schemaVersion: number; revision: number; createdAt: string; updatedAt: string }
type StoredEntity = Entity & { archiveId: string; order: number };
export interface ArchiveSnapshot { archive: FamilyArchive; revision: number }
export class ConflictError extends DomainError {
  constructor() { super('Збирка је промењена у другом прозору. Освежите приказ па покушајте поново. Ваш унос је остао у обрасцу.'); }
}

export class ArchiveRepository {
  constructor(readonly db: Dexie = createFamilyDatabase()) {}
  private tables(): string[] { return ['archives', ...collectionKeys, 'mediaFiles', 'preferences']; }
  private async activeMetadata(): Promise<ArchiveMetadata | undefined> {
    const active = await this.db.table('preferences').get('activeArchive');
    return active ? this.db.table<ArchiveMetadata>('archives').get(active.value) : this.db.table<ArchiveMetadata>('archives').toCollection().first();
  }
  async listArchives(): Promise<{ id: string; name: string }[]> {
    return (await this.db.table<ArchiveMetadata>('archives').toArray()).map(({ id, name }) => ({ id, name }));
  }
  async transferSnapshot(): Promise<TransferSnapshot> {
    return this.db.transaction('r', this.tables(), async () => {
      const metadata = await this.activeMetadata();
      if (!metadata) throw new DomainError('Збирка није доступна.');
      const { archive } = await this.read(metadata);
      const stored = await this.db.table<StoredMediaFile>('mediaFiles').bulkGet(archive.media.map(item => [archive.id, item.id]));
      return { archive, files: stored.flatMap(file => file ? [{ id: file.id, original: file.original }] : []) };
    });
  }
  async selectArchive(id: string, expected: ArchiveSnapshot): Promise<ArchiveSnapshot> {
    return this.db.transaction('rw', this.tables(), async () => {
      const current = await this.activeMetadata();
      if (!current || current.id !== expected.archive.id || current.revision !== expected.revision) throw new ConflictError();
      const target = await this.db.table<ArchiveMetadata>('archives').get(id);
      if (!target) throw new DomainError('Збирка није пронађена.');
      const snapshot = await this.read(target);
      await this.db.table('preferences').put({ key: 'activeArchive', value: id }); return snapshot;
    });
  }
  async createArchive(name: string, expected: ArchiveSnapshot): Promise<ArchiveSnapshot> {
    return this.importArchive({ archive: createEmptyArchive(name), files: [], kind: 'full', warnings: [] }, 'new', expected);
  }
  async importArchive(plan: ImportPlan, mode: 'new' | 'replace', expected: ArchiveSnapshot): Promise<ArchiveSnapshot> {
    const archive = validateArchive({ ...plan.archive, id: mode === 'new' ? crypto.randomUUID() : expected.archive.id });
    const fileIds = new Set(plan.files.map(file => file.id));
    if (fileIds.size !== plan.files.length || plan.files.some(file => !archive.media.some(item => item.id === file.id)) || plan.kind === 'full' && archive.media.some(item => !fileIds.has(item.id)) || plan.kind === 'data-only' && plan.files.length) throw new DomainError('Датотеке увоза нису потпуне.');
    return this.db.transaction('rw', this.tables(), async () => {
      const current = await this.activeMetadata();
      if (!current || current.id !== expected.archive.id || current.revision !== expected.revision) throw new ConflictError();
      if (mode === 'replace') for (const key of [...collectionKeys, 'mediaFiles']) await this.db.table(key).where('archiveId').equals(current.id).delete();
      await this.writeCollections(archive);
      if (plan.files.length) await this.db.table<StoredMediaFile>('mediaFiles').bulkAdd(plan.files.map(file => ({ ...file, archiveId: archive.id })));
      const now = new Date().toISOString(); const revision = mode === 'replace' ? current.revision + 1 : 0;
      await this.db.table('archives').put({ id: archive.id, name: archive.name, schemaVersion: DATA_SCHEMA_VERSION, revision, createdAt: mode === 'replace' ? current.createdAt : now, updatedAt: now });
      await this.db.table('preferences').put({ key: 'activeArchive', value: archive.id });
      return { archive, revision };
    });
  }
  async getMediaBlob(archiveId: string, id: string, variant: 'original' | 'thumbnail'): Promise<Blob | undefined> {
    const file = await this.db.table<StoredMediaFile>('mediaFiles').get([archiveId, id]);
    return variant === 'thumbnail' ? file?.thumbnail || file?.original : file?.original;
  }

  async initialize(seed: FamilyArchive): Promise<ArchiveSnapshot> {
    return this.db.transaction('rw', this.tables(), async () => {
      const metadata = await this.activeMetadata();
      if (metadata) return this.read(metadata);
      const archive = this.stamp(validateArchive(seed));
      const now = new Date().toISOString();
      const initial: ArchiveMetadata = { id: archive.id, name: archive.name, schemaVersion: DATA_SCHEMA_VERSION, revision: 0, createdAt: now, updatedAt: now };
      await this.writeCollections(archive);
      await this.db.table('archives').add(initial);
      return { archive, revision: 0 };
    });
  }

  async load(): Promise<ArchiveSnapshot> {
    return this.db.transaction('r', this.tables(), async () => {
      const metadata = await this.activeMetadata();
      if (!metadata) throw new DomainError('Породична збирка није пронађена.');
      return this.read(metadata);
    });
  }

  private async read(metadata: ArchiveMetadata): Promise<ArchiveSnapshot> {
    if (metadata.schemaVersion !== DATA_SCHEMA_VERSION) throw new DomainError('Ова верзија збирке захтева новију верзију апликације. Подаци нису промењени.');
    const collections = await Promise.all(collectionKeys.map(async key => [key,
      (await this.db.table<StoredEntity>(key).where('archiveId').equals(metadata.id).toArray())
        .sort((a, b) => a.order - b.order).map(({ archiveId: _archiveId, order: _order, ...record }) => record),
    ]));
    return { archive: validateArchive({ id: metadata.id, name: metadata.name, ...Object.fromEntries(collections) }), revision: metadata.revision };
  }

  private stamp(archive: FamilyArchive, previous?: FamilyArchive): FamilyArchive {
    const now = new Date().toISOString();
    const stamped = { ...archive };
    for (const key of collectionKeys) {
      const old = new Map(previous?.[key]?.map(record => [record.id, record]));
      Object.assign(stamped, { [key]: (archive[key] || []).map(record => {
        const before = old.get(record.id);
        return before && JSON.stringify(before) === JSON.stringify(record) ? before : { ...record, createdAt: before?.createdAt || record.createdAt || now, updatedAt: now };
      }) });
    }
    return validateArchive(stamped);
  }

  private async writeCollections(archive: FamilyArchive, previous?: FamilyArchive) {
    for (const key of collectionKeys) {
      const table = this.db.table<StoredEntity, [string, string]>(key);
      const next = archive[key] || [];
      const before = previous?.[key] || [];
      const old = new Map(before.map(record => [record.id, record]));
      const oldOrder = new Map(before.map((record, index) => [record.id, index]));
      const ids = new Set(next.map(record => record.id));
      const removed = before.filter(record => !ids.has(record.id));
      if (removed.length) await table.bulkDelete(removed.map(record => [archive.id, record.id]));
      const changed = next.map((record, order) => ({ ...record, archiveId: archive.id, order }))
        .filter(({ archiveId: _archiveId, order, ...record }) => oldOrder.get(record.id) !== order || JSON.stringify(old.get(record.id)) !== JSON.stringify(record));
      if (changed.length) await table.bulkPut(changed);
    }
  }

  async commit(expectedRevision: number, transform: (archive: FamilyArchive) => FamilyArchive, files: MediaFileInput[] = [], expectedArchiveId?: string): Promise<{ before: ArchiveSnapshot; after: ArchiveSnapshot }> {
    return this.db.transaction('rw', this.tables(), async () => {
      const metadata = await this.activeMetadata();
      if (!metadata) throw new DomainError('Породична збирка није пронађена.');
      if (metadata.revision !== expectedRevision || expectedArchiveId && metadata.id !== expectedArchiveId) throw new ConflictError();
      const before = await this.read(metadata);
      const after = this.stamp(validateArchive(transform(before.archive)), before.archive);
      if (after.id !== before.archive.id) throw new DomainError('Ова команда не може да промени збирку.');
      const fileIds = new Set<string>();
      for (const file of files) {
        const item = after.media.find(item => item.id === file.id);
        if (fileIds.has(file.id) || !item || !item.mimeType || item.mimeType !== file.original.type || item.size !== file.original.size) throw new DomainError('Датотека и њен опис се не подударају.');
        fileIds.add(file.id);
        await this.db.table<StoredMediaFile>('mediaFiles').add({ ...file, archiveId: after.id });
      }
      const existingMedia = new Set(before.archive.media.map(item => item.id));
      for (const item of after.media) {
        if (item.size && !fileIds.has(item.id) && !existingMedia.has(item.id) && !await this.db.table('mediaFiles').where('[archiveId+id]').equals([after.id, item.id]).count()) throw new DomainError('Оригинална датотека није доступна. Опис није сачуван без датотеке.');
      }
      if (JSON.stringify(after) === JSON.stringify(before.archive)) return { before, after: before };
      await this.writeCollections(after, before.archive);
      const revision = metadata.revision + 1;
      await this.db.table('archives').put({ ...metadata, name: after.name, revision, updatedAt: new Date().toISOString() });
      return { before, after: { archive: after, revision } };
    });
  }
}
