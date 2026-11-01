import Dexie from 'dexie';

export const collectionKeys = ['people', 'parentChildRelationships', 'partnerships', 'kinshipAssertions', 'events', 'places', 'media', 'sources'] as const;
export const DATA_SCHEMA_VERSION = 1;

/** Version 1 is the first persisted schema. Future changes add .version(n).upgrade(...). */
export function createFamilyDatabase(name = 'BelaPcela'): Dexie {
    const db = new Dexie(name);
    db.version(1).stores({
      archives: 'id',
      ...Object.fromEntries(collectionKeys.map(key => [key, '[archiveId+id], archiveId'])),
    });
    db.on('versionchange', () => db.close());
    return db;
}
