import type { IconVersion, ContentBlobRecord } from '../types';

const DB_NAME = 'sprite-lab-db';
const DB_VERSION = 2;
const STORE_ICONS = 'icons';
const STORE_CONTENT_BLOBS = 'content_blobs';
const STORE_ICON_VERSIONS = 'icon_versions';

interface IconBlobRecord {
  id: string;
  blob: Blob;
  dataUrl?: string;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = req.result;
      const oldVersion = (event as IDBVersionChangeEvent).oldVersion || 0;

      if (!db.objectStoreNames.contains(STORE_ICONS)) {
        db.createObjectStore(STORE_ICONS, { keyPath: 'id' });
      }

      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains(STORE_CONTENT_BLOBS)) {
          db.createObjectStore(STORE_CONTENT_BLOBS, { keyPath: 'hash' });
        }
        if (!db.objectStoreNames.contains(STORE_ICON_VERSIONS)) {
          const versionStore = db.createObjectStore(STORE_ICON_VERSIONS, { keyPath: 'id' });
          versionStore.createIndex('iconId', 'iconId', { unique: false });
          versionStore.createIndex('iconId_version', ['iconId', 'version'], { unique: true });
        }
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  return dbPromise;
}

export async function saveIconBlob(id: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICONS, 'readwrite');
    const store = tx.objectStore(STORE_ICONS);
    const req = store.put({ id, blob });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveIconDataUrl(id: string, dataUrl: string): Promise<void> {
  const blob = await dataUrlToBlob(dataUrl);
  return saveIconBlob(id, blob);
}

export async function getIconBlob(id: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICONS, 'readonly');
    const store = tx.objectStore(STORE_ICONS);
    const req = store.get(id);
    req.onsuccess = () => {
      const record = req.result as IconBlobRecord | undefined;
      const raw = record?.blob;
      if (!raw) resolve(null);
      else if (raw instanceof Blob) resolve(raw);
      else resolve(new Blob([(raw as any).buffer ?? raw], { type: (raw as any).type || 'image/png' }));
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getIconDataUrl(id: string): Promise<string | null> {
  const blob = await getIconBlob(id);
  if (!blob) return null;
  return blobToDataUrl(blob);
}

export async function deleteIconBlob(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICONS, 'readwrite');
    const store = tx.objectStore(STORE_ICONS);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function deleteIconBulk(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICONS, 'readwrite');
    const store = tx.objectStore(STORE_ICONS);
    ids.forEach((id) => store.delete(id));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      const arr = dataUrl.split(',');
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/png';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      resolve(new Blob([u8arr], { type: mime }));
    } catch (e) {
      reject(e);
    }
  });
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function fileToBlob(file: File): Blob {
  return file.slice(0, file.size, file.type);
}

export async function saveContentBlob(hash: string, blob: Blob): Promise<boolean> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTENT_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_CONTENT_BLOBS);
    const getReq = store.get(hash);
    getReq.onsuccess = () => {
      const existing = getReq.result as ContentBlobRecord | undefined;
      if (existing) {
        existing.refCount += 1;
        store.put(existing);
        resolve(false);
      } else {
        store.put({ hash, blob, refCount: 1, createdAt: Date.now() });
        resolve(true);
      }
    };
    getReq.onerror = () => reject(getReq.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getContentBlob(hash: string): Promise<Blob | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTENT_BLOBS, 'readonly');
    const store = tx.objectStore(STORE_CONTENT_BLOBS);
    const req = store.get(hash);
    req.onsuccess = () => {
      const record = req.result as ContentBlobRecord | undefined;
      resolve(record?.blob || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getContentBlobDataUrl(hash: string): Promise<string | null> {
  const blob = await getContentBlob(hash);
  if (!blob) return null;
  return blobToDataUrl(blob);
}

export async function releaseContentBlob(hash: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_CONTENT_BLOBS, 'readwrite');
    const store = tx.objectStore(STORE_CONTENT_BLOBS);
    const getReq = store.get(hash);
    getReq.onsuccess = () => {
      const existing = getReq.result as ContentBlobRecord | undefined;
      if (existing) {
        existing.refCount -= 1;
        if (existing.refCount <= 0) {
          store.delete(hash);
        } else {
          store.put(existing);
        }
      }
      resolve();
    };
    getReq.onerror = () => reject(getReq.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveIconVersion(version: IconVersion): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICON_VERSIONS, 'readwrite');
    const store = tx.objectStore(STORE_ICON_VERSIONS);
    const req = store.put(version);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getIconVersions(iconId: string): Promise<IconVersion[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICON_VERSIONS, 'readonly');
    const store = tx.objectStore(STORE_ICON_VERSIONS);
    const index = store.index('iconId');
    const req = index.getAll(iconId);
    req.onsuccess = () => {
      const versions = req.result as IconVersion[];
      versions.sort((a, b) => b.version - a.version);
      resolve(versions);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getIconVersion(id: string): Promise<IconVersion | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ICON_VERSIONS, 'readonly');
    const store = tx.objectStore(STORE_ICON_VERSIONS);
    const req = store.get(id);
    req.onsuccess = () => {
      resolve((req.result as IconVersion) || null);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getLatestVersion(iconId: string): Promise<IconVersion | null> {
  const versions = await getIconVersions(iconId);
  return versions[0] || null;
}

export async function getNextVersionNumber(iconId: string): Promise<number> {
  const latest = await getLatestVersion(iconId);
  return (latest?.version || 0) + 1;
}

export async function deleteIconVersions(iconId: string): Promise<void> {
  const versions = await getIconVersions(iconId);
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_ICON_VERSIONS, STORE_CONTENT_BLOBS], 'readwrite');
    const versionStore = tx.objectStore(STORE_ICON_VERSIONS);
    const blobStore = tx.objectStore(STORE_CONTENT_BLOBS);

    versions.forEach((v) => {
      versionStore.delete(v.id);
      const getReq = blobStore.get(v.contentHash);
      getReq.onsuccess = () => {
        const existing = getReq.result as ContentBlobRecord | undefined;
        if (existing) {
          existing.refCount -= 1;
          if (existing.refCount <= 0) {
            blobStore.delete(v.contentHash);
          } else {
            blobStore.put(existing);
          }
        }
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
