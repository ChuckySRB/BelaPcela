import Dexie from 'dexie';

export const collectionKeys = ['people', 'parentChildRelationships', 'partnerships', 'kinshipAssertions', 'events', 'places', 'media', 'sources'] as const;
export const DATA_SCHEMA_VERSION = 2;
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
    db.on('versionchange', () => db.close());
    return db;
}
