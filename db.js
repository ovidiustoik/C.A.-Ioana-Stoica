'use strict';
/* Stocare locală (IndexedDB). Datele nu părăsesc dispozitivul. */
const DB_NAME = 'cabinet-stoica';
const DB_VERSION = 1;
const STORES = ['tasks', 'cases', 'clients', 'events', 'docs', 'files', 'links', 'anaf', 'ledger', 'settings'];

let _db = null;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const s of STORES) {
        if (!db.objectStoreNames.contains(s)) db.createObjectStore(s, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => { _db = req.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = _db.transaction(store, mode);
    const req = fn(t.objectStore(store));
    let out;
    if (req) req.onsuccess = () => { out = req.result; };
    t.oncomplete = () => resolve(out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const DB = {
  all: store => tx(store, 'readonly', s => s.getAll()),
  get: (store, id) => tx(store, 'readonly', s => s.get(id)),
  put: (store, obj) => tx(store, 'readwrite', s => s.put(obj)).then(() => obj),
  del: (store, id) => tx(store, 'readwrite', s => s.delete(id)),
  clear: store => tx(store, 'readwrite', s => s.clear()),
};
