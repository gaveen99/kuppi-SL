'use client';

import { openDB, type IDBPDatabase } from 'idb';

const DB_NAME = 'kuppi-offline';
const DB_VERSION = 1;
const STORE_SAVED_MATERIALS = 'savedMaterials';
const CACHE_NAME = 'kuppi-saved-materials-v1';

export interface SavedMaterialRecord {
  materialId: string;
  courseId: string;
  moduleId: string;
  title: string;
  originalFileName: string;
  mimeType: string;
  sizeBytes: number;
  fileUrl: string;
  savedAt: number;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB not available'));
  }
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(STORE_SAVED_MATERIALS)) {
          const store = database.createObjectStore(STORE_SAVED_MATERIALS, {
            keyPath: 'materialId',
          });
          store.createIndex('courseId', 'courseId', { unique: false });
          store.createIndex('savedAt', 'savedAt', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export async function isOfflineSupported(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (typeof indexedDB === 'undefined') return false;
  if (typeof caches === 'undefined') return false;
  try {
    await getDb();
    return true;
  } catch {
    return false;
  }
}

export async function saveMaterialOffline(
  record: Omit<SavedMaterialRecord, 'savedAt'>
): Promise<void> {
  const cache = await caches.open(CACHE_NAME);
  const response = await fetch(record.fileUrl, { credentials: 'same-origin' });
  if (!response.ok) {
    throw new Error(`Failed to fetch material: ${response.status}`);
  }
  await cache.put(record.fileUrl, response.clone());

  const db = await getDb();
  const full: SavedMaterialRecord = { ...record, savedAt: Date.now() };
  await db.put(STORE_SAVED_MATERIALS, full);
}

export async function removeSavedMaterial(materialId: string): Promise<void> {
  const db = await getDb();
  const record = (await db.get(STORE_SAVED_MATERIALS, materialId)) as
    | SavedMaterialRecord
    | undefined;
  if (record) {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(record.fileUrl);
  }
  await db.delete(STORE_SAVED_MATERIALS, materialId);
}

export async function isMaterialSaved(materialId: string): Promise<boolean> {
  try {
    const db = await getDb();
    const record = await db.get(STORE_SAVED_MATERIALS, materialId);
    return Boolean(record);
  } catch {
    return false;
  }
}

export async function listSavedMaterials(): Promise<SavedMaterialRecord[]> {
  try {
    const db = await getDb();
    const records = (await db.getAll(
      STORE_SAVED_MATERIALS
    )) as SavedMaterialRecord[];
    return records.sort((a, b) => b.savedAt - a.savedAt);
  } catch {
    return [];
  }
}

export async function getStorageUsageRatio(): Promise<number | null> {
  if (
    typeof navigator === 'undefined' ||
    !navigator.storage ||
    typeof navigator.storage.estimate !== 'function'
  ) {
    return null;
  }
  try {
    const estimate = await navigator.storage.estimate();
    if (!estimate.quota || !estimate.usage) return null;
    return estimate.usage / estimate.quota;
  } catch {
    return null;
  }
}

export async function getOfflineFileBlob(
  fileUrl: string
): Promise<Blob | null> {
  if (typeof caches === 'undefined') return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(fileUrl);
    if (!response) return null;
    return await response.blob();
  } catch {
    return null;
  }
}
