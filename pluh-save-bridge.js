// PluhMath - Universal Save Bridge
// Seamlessly bridges localStorage & IndexedDB between game iframes and the parent cache/cloud engine.

(function(global) {
  'use strict';

  // Game ID normalization and full human-readable titles
  const GAME_INFO = {
    'undertale': { id: 'undertale', title: 'Undertale', prefixes: ['ut', 'undertale', 'file'], hasIndexedDB: true },
    'ut': { id: 'undertale', title: 'Undertale', prefixes: ['ut', 'undertale', 'file'], hasIndexedDB: true },
    'deltarune': { id: 'deltarune', title: 'Deltarune', prefixes: ['dr', 'deltarune', 'file'], hasIndexedDB: true },
    'dr': { id: 'deltarune', title: 'Deltarune', prefixes: ['dr', 'deltarune', 'file'], hasIndexedDB: true },
    'undertale-yellow': { id: 'undertale-yellow', title: 'Undertale Yellow', prefixes: ['uty', 'undertale_yellow', 'file'], hasIndexedDB: true },
    'uty': { id: 'undertale-yellow', title: 'Undertale Yellow', prefixes: ['uty', 'undertale_yellow', 'file'], hasIndexedDB: true },
    'run3': { id: 'run3', title: 'Run 3', prefixes: ['run3', 'run_3', 'player'], hasIndexedDB: false },
    'run-3': { id: 'run3', title: 'Run 3', prefixes: ['run3', 'run_3', 'player'], hasIndexedDB: false },
    'pluhshooter': { id: 'pluhshooter', title: 'PluhShooter.io', prefixes: ['pluhshooter', 'ps_'], hasIndexedDB: false },
    'pluhshooter-io': { id: 'pluhshooter', title: 'PluhShooter.io', prefixes: ['pluhshooter', 'ps_'], hasIndexedDB: false },
    'drift-boss': { id: 'drift-boss', title: 'Drift Boss', prefixes: ['drift', 'c2drift'], hasIndexedDB: false },
    'tiny-fishing': { id: 'tiny-fishing', title: 'Tiny Fishing', prefixes: ['tiny', 'fish'], hasIndexedDB: false },
    'tinyfishing': { id: 'tiny-fishing', title: 'Tiny Fishing', prefixes: ['tiny', 'fish'], hasIndexedDB: false },
    'pluhus': { id: 'pluhus', title: 'PluhUs', prefixes: ['pluhus', 'among'], hasIndexedDB: false },
    'restrictia': { id: 'restrictia', title: 'The Chronicles of Restrictia', prefixes: ['restrictia', 'tcor', 'island_overdrive'], hasIndexedDB: false }
  };

  function normalizeGameId(rawId) {
    if (!rawId) return 'undertale';
    const clean = String(rawId).toLowerCase().trim();
    return GAME_INFO[clean] ? GAME_INFO[clean].id : clean;
  }

  function getGameTitle(rawId) {
    const id = normalizeGameId(rawId);
    return GAME_INFO[id] ? GAME_INFO[id].title : id.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function getCurrentGameId() {
    const bodyAttr = document.body.getAttribute('data-game-id');
    if (bodyAttr) return normalizeGameId(bodyAttr);

    const path = window.location.pathname.toLowerCase();
    for (const key of Object.keys(GAME_INFO)) {
      if (path.includes(key)) return normalizeGameId(key);
    }

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam) return normalizeGameId(idParam);

    return 'undertale';
  }

  // ==========================================================================
  // INDEXEDDB SERIALIZATION HELPERS (GameMaker HTML5 Saves: /_savedata -> FILE_DATA)
  // ==========================================================================

  function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  function base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes.buffer;
  }

  async function serializeValue(val) {
    if (val === null || val === undefined) return val;
    if (val instanceof ArrayBuffer) return { __type: 'ArrayBuffer', data: arrayBufferToBase64(val) };
    if (ArrayBuffer.isView(val)) {
      return { __type: 'TypedArray', ctor: val.constructor.name, data: arrayBufferToBase64(val.buffer) };
    }
    if (val instanceof Blob) {
      const buf = await val.arrayBuffer();
      return { __type: 'Blob', data: arrayBufferToBase64(buf), mime: val.type };
    }
    if (typeof val === 'object') {
      const out = Array.isArray(val) ? [] : {};
      for (const k in val) {
        if (Object.prototype.hasOwnProperty.call(val, k)) {
          out[k] = await serializeValue(val[k]);
        }
      }
      return out;
    }
    return val;
  }

  function deserializeValue(val) {
    if (!val || typeof val !== 'object') return val;
    if (val.__type === 'ArrayBuffer') return base64ToArrayBuffer(val.data);
    if (val.__type === 'TypedArray') {
      const buf = base64ToArrayBuffer(val.data);
      const ctor = global[val.ctor] || Uint8Array;
      return new ctor(buf);
    }
    if (val.__type === 'Blob') {
      const buf = base64ToArrayBuffer(val.data);
      return new Blob([buf], { type: val.mime || 'application/octet-stream' });
    }
    if (Array.isArray(val)) return val.map(deserializeValue);
    const out = {};
    for (const k in val) {
      if (Object.prototype.hasOwnProperty.call(val, k)) {
        out[k] = deserializeValue(val[k]);
      }
    }
    return out;
  }

  // Read all records from an IndexedDB database
  function readIndexedDBDatabase(dbName = '/_savedata', storeName = 'FILE_DATA', win = window) {
    return new Promise((resolve) => {
      if (!win.indexedDB) return resolve(null);
      try {
        const req = win.indexedDB.open(dbName);
        req.onerror = () => resolve(null);
        req.onsuccess = async () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            return resolve(null);
          }
          try {
            const tx = db.transaction([storeName], 'readonly');
            const store = tx.objectStore(storeName);
            const data = {};
            const cursorReq = store.openCursor();
            cursorReq.onsuccess = async (e) => {
              const cursor = e.target.result;
              if (cursor) {
                data[cursor.primaryKey] = await serializeValue(cursor.value);
                cursor.continue();
              } else {
                db.close();
                resolve(data);
              }
            };
            cursorReq.onerror = () => { db.close(); resolve(null); };
          } catch (e) {
            db.close();
            resolve(null);
          }
        };
      } catch (e) {
        resolve(null);
      }
    });
  }

  // Write records back into an IndexedDB database
  function writeIndexedDBDatabase(records, dbName = '/_savedata', storeName = 'FILE_DATA', win = window) {
    return new Promise((resolve) => {
      if (!win.indexedDB || !records || typeof records !== 'object') return resolve(false);
      try {
        const req = win.indexedDB.open(dbName);
        req.onerror = () => resolve(false);
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            db.close();
            // Upgrade to create store if missing
            const version = db.version + 1;
            const upReq = win.indexedDB.open(dbName, version);
            upReq.onupgradeneeded = (evt) => {
              const uDb = evt.target.result;
              if (!uDb.objectStoreNames.contains(storeName)) {
                uDb.createObjectStore(storeName);
              }
            };
            upReq.onsuccess = () => {
              const uDb = upReq.result;
              commitRecords(uDb);
            };
            upReq.onerror = () => resolve(false);
            return;
          }
          commitRecords(db);
        };

        function commitRecords(db) {
          try {
            const tx = db.transaction([storeName], 'readwrite');
            const store = tx.objectStore(storeName);
            for (const [k, v] of Object.entries(records)) {
              store.put(deserializeValue(v), k);
            }
            tx.oncomplete = () => { db.close(); resolve(true); };
            tx.onerror = () => { db.close(); resolve(false); };
          } catch (e) {
            db.close();
            resolve(false);
          }
        }
      } catch (e) {
        resolve(false);
      }
    });
  }

  // ==========================================================================
  // COMPLETE LOCAL/CACHE EXTRACTION
  // ==========================================================================

  async function extractAllSaveDataForGame(targetGameId) {
    const gameId = normalizeGameId(targetGameId || getCurrentGameId());
    const info = GAME_INFO[gameId] || { prefixes: [gameId], hasIndexedDB: true };
    const result = {
      gameId: gameId,
      gameTitle: getGameTitle(gameId),
      localStorage: {},
      indexedDB: null
    };

    // 1. Scan Parent Window localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      const match = info.prefixes.some(p => k.toLowerCase().startsWith(p.toLowerCase()) || k.toLowerCase().includes(gameId));
      if (match) {
        result.localStorage[k] = localStorage.getItem(k);
      }
    }

    // 2. Scan Iframe localStorage if available
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        const frameStorage = iframe.contentWindow.localStorage;
        if (frameStorage) {
          for (let i = 0; i < frameStorage.length; i++) {
            const k = frameStorage.key(i);
            if (!k) continue;
            const match = info.prefixes.some(p => k.toLowerCase().startsWith(p.toLowerCase()) || k.toLowerCase().includes(gameId)) || frameStorage.length < 25;
            if (match) {
              const val = frameStorage.getItem(k);
              result.localStorage[k] = val;
              // Mirror into parent cache
              localStorage.setItem(k, val);
            }
          }
        }
      } catch (e) {
        // Cross-origin restriction fallback
      }

      // 3. Scan Iframe IndexedDB
      if (info.hasIndexedDB) {
        try {
          const frameIDB = await readIndexedDBDatabase('/_savedata', 'FILE_DATA', iframe.contentWindow);
          if (frameIDB && Object.keys(frameIDB).length > 0) {
            result.indexedDB = frameIDB;
          }
        } catch (e) {}
      }
    }

    // 4. Also check Parent Window IndexedDB
    if (!result.indexedDB && info.hasIndexedDB) {
      const parentIDB = await readIndexedDBDatabase('/_savedata', 'FILE_DATA', window);
      if (parentIDB && Object.keys(parentIDB).length > 0) {
        result.indexedDB = parentIDB;
      }
    }

    // Cache copy in localStorage for offline fast restoration
    try {
      localStorage.setItem(`pluhmath_cache_${gameId}`, JSON.stringify(result));
    } catch (e) {}

    return result;
  }

  // ==========================================================================
  // COMPLETE RESTORATION (localStorage + IndexedDB + Iframe Injection)
  // ==========================================================================

  async function restoreAllSaveDataForGame(targetGameId, saveData) {
    const gameId = normalizeGameId(targetGameId || (saveData && saveData.gameId) || getCurrentGameId());
    if (!saveData || typeof saveData !== 'object') return false;

    const localItems = saveData.localStorage || (saveData.data && saveData.data.localStorage) || saveData.data || saveData;
    const idbItems = saveData.indexedDB || (saveData.data && saveData.data.indexedDB);

    // 1. Write to Parent Window localStorage
    let count = 0;
    if (localItems && typeof localItems === 'object') {
      for (const [k, v] of Object.entries(localItems)) {
        if (!k.startsWith('__bridge_') && typeof v !== 'object') {
          localStorage.setItem(k, String(v));
          count++;
        }
      }
    }

    // 2. Write to Iframe localStorage
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        const frameStorage = iframe.contentWindow.localStorage;
        if (frameStorage && localItems && typeof localItems === 'object') {
          for (const [k, v] of Object.entries(localItems)) {
            if (!k.startsWith('__bridge_') && typeof v !== 'object') {
              frameStorage.setItem(k, String(v));
            }
          }
        }
      } catch (e) {}

      // 3. Write to Iframe IndexedDB
      if (idbItems && Object.keys(idbItems).length > 0) {
        try {
          await writeIndexedDBDatabase(idbItems, '/_savedata', 'FILE_DATA', iframe.contentWindow);
        } catch (e) {}
      }

      // 4. Notify iframe via postMessage
      try {
        iframe.contentWindow.postMessage({
          type: 'initialSaveDataResponse',
          messageId: 'bridge_restore_' + Date.now(),
          allLocalStorageData: localItems
        }, '*');
      } catch (e) {}
    }

    // 5. Also write to Parent Window IndexedDB
    if (idbItems && Object.keys(idbItems).length > 0) {
      await writeIndexedDBDatabase(idbItems, '/_savedata', 'FILE_DATA', window);
    }

    console.debug(`[PluhSaveBridge] Successfully restored save state for ${getGameTitle(gameId)}.`);
    return true;
  }

  // ==========================================================================
  // CONTINUOUS LIVE MONITORING (Flushes save updates in real time)
  // ==========================================================================

  let lastDispatchedSnapshot = '';

  async function checkAndBroadcastChanges() {
    const gameId = getCurrentGameId();
    try {
      const data = await extractAllSaveDataForGame(gameId);
      const snapshot = JSON.stringify(data.localStorage) + (data.indexedDB ? JSON.stringify(Object.keys(data.indexedDB)) : '');
      if (snapshot !== lastDispatchedSnapshot && (Object.keys(data.localStorage).length > 0 || data.indexedDB)) {
        lastDispatchedSnapshot = snapshot;

        window.dispatchEvent(new CustomEvent('pluhmath-save-changed', {
          detail: data
        }));

        // Broadcast to parent if inside an iframe
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'saveDataChanged',
            gameId: gameId,
            allLocalStorageData: data.localStorage,
            indexedDBData: data.indexedDB
          }, '*');
        }
      }
    } catch (e) {}
  }

  // Poll for silent saves (checkpoint touched, level complete)
  setInterval(checkAndBroadcastChanges, 3000);

  // Hook into iframe postMessages
  window.addEventListener('message', async (e) => {
    if (!e.data || typeof e.data !== 'object') return;

    if (e.data.type === 'saveDataChanged') {
      const gId = normalizeGameId(e.data.gameId || getCurrentGameId());
      if (e.data.allLocalStorageData) {
        for (const [k, v] of Object.entries(e.data.allLocalStorageData)) {
          if (!k.startsWith('__bridge_')) {
            localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
          }
        }
      }
    }

    if (e.data.type === 'getInitialSaveData') {
      const gId = normalizeGameId(e.data.gameId || getCurrentGameId());
      const state = await extractAllSaveDataForGame(gId);
      if (e.source && typeof e.source.postMessage === 'function') {
        e.source.postMessage({
          type: 'initialSaveDataResponse',
          messageId: e.data.messageId,
          allLocalStorageData: state.localStorage
        }, '*');
      }
    }
  });

  // Global exports
  global.PluhSaveBridge = {
    normalizeGameId,
    getGameTitle,
    getCurrentGameId,
    extractAllSaveDataForGame,
    restoreAllSaveDataForGame,
    readIndexedDBDatabase,
    writeIndexedDBDatabase
  };

})(window);
