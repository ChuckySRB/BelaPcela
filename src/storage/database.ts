import Dexie from 'dexie';

export const collectionKeys = ['people', 'parentChildRelationships', 'partnerships', 'kinshipAssertions', 'events', 'places', 'media', 'sources'] as const;
export const DATA_SCHEMA_VERSION = 3;
export const archiveStores = { archives: 'id', ...Object.fromEntries(collectionKeys.map(key => [key, '[archiveId+id], archiveId'])) };

/** Additive v2 profile fields stay optional; the upgrade preserves every canonical record. */
export function createFamilyDatabase(name = 'BelaPcela'): Dexie {
    const db = new Dexie(name);
    db.version(1).stores(archiveStores);
    db.version(2).stores(archiveStores).upgrade(async transaction => {
      await transaction.table('archives').toCollection().modify(metadata => {
        if (metadata.schemaVersion === 1) {
          metadata.schemaVersion = 2;
          metadata.revision += 1;
          metadata.updatedAt = new Date().toISOString();
        }
      });
    });
    db.version(3).stores({ ...archiveStores, mediaFiles: '[archiveId+id], archiveId' }).upgrade(async transaction => {
      const metadata = await transaction.table('archives').toArray();
      const ids = new Set(metadata.filter(record => record.schemaVersion === 2).map(record => record.id));
      await transaction.table('events').toCollection().modify(event => {
        if (ids.has(event.archiveId) && !event.participants && event.personId) {
          event.participants = [{ personId: event.personId, role: 'subject' }]; delete event.personId;
        }
      });
      await transaction.table('archives').toCollection().modify(record => {
        if (ids.has(record.id)) { record.schemaVersion = 3; record.revision += 1; record.updatedAt = new Date().toISOString(); }
      });
    });
    db.on('versionchange', () => db.close());
    return db;
}
