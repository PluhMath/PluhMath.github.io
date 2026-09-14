// PluhMath - CrimX Account System & Cloud Save Synchronization Engine
// Integrates with official CrimX DoorAuth & Profile API (https://crimx.crimsonflame.net)

import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut, 
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup, 
  updateProfile 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CRIMX_CLIENT_ID = 'cf_client_843fbbf7d0caba';
const DOORAUTH_ORIGIN = window.location.origin.includes('localhost') ? window.location.origin : 'https://crimsonflame.net';

const CRIMX_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBSSJKDrFJ1_qlliZqgw34CY2TSaKOxxxM",
  authDomain: "plumath.firebaseapp.com",
  projectId: "plumath",
  storageBucket: "plumath.firebasestorage.app",
  messagingSenderId: "406321213530",
  appId: "1:406321213530:web:92d27a69d34d147393a863"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(CRIMX_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

let currentCrimXUser = null;
let cloudSavesCache = {};

// Clean full game titles (Never abbreviations like UT or DT)
const GAME_TITLES = {
  'undertale': 'Undertale',
  'ut': 'Undertale',
  'deltarune': 'Deltarune',
  'dr': 'Deltarune',
  'run3': 'Run 3',
  'run-3': 'Run 3',
  'pluhshooter': 'PluhShooter.io',
  'pluhshooter-io': 'PluhShooter.io',
  'pluhus': 'PluhUs',
  'geometry-dash': 'Geometry Dash Subzero',
  'drift-boss': 'Drift Boss',
  'undertale-yellow': 'Undertale Yellow',
  'uty': 'Undertale Yellow',
  'tiny-fishing': 'Tiny Fishing',
  'tinyfishing': 'Tiny Fishing',
  'restrictia': 'The Chronicles of Restrictia'
};

// ============================================================================
// PROFILE API INTEGRATION (https://crimx.crimsonflame.net/api/user/profile)
// ============================================================================

export async function fetchCrimXUserProfile(uid, idToken = '') {
  if (!uid) return null;
  try {
    const headers = { 'Accept': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const res = await fetch(`https://crimx.crimsonflame.net/api/user/profile?uid=${encodeURIComponent(uid)}`, {
      method: 'GET',
      headers: headers
    });
    if (res.ok) {
      const profile = await res.json();
      console.debug('[CrimX Profile API] Successfully fetched profile for:', uid, profile);
      return profile;
    }
  } catch (err) {
    console.debug('[CrimX Profile API] Fetch non-critical fallback:', err);
  }

  // Fallback to Firestore profile document
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const d = userDoc.data();
      return {
        uid: uid,
        username: d.username || d.displayName || 'Player',
        displayName: d.displayName || d.username || 'Player',
        email: d.email || '',
        avatarUrl: d.avatarUrl || d.photoURL || d.pfp || '',
        bannerUrl: d.bannerUrl || '',
        statusBio: d.statusBio || d.bio || '',
        badges: d.badges || ['DoorAuth Verified']
      };
    }
  } catch (e) {
    console.debug('[CrimX Profile] Firestore read error:', e);
  }
  return null;
}
window.fetchCrimXUserProfile = fetchCrimXUserProfile;

// ============================================================================
// DOORAUTH INTEGRATION (Standardized & Locked)
// ============================================================================

export function triggerCrimXDoorAuth(customOrigin) {
  const origin = customOrigin || (window.location.origin.includes('localhost') ? window.location.origin : 'https://crimsonflame.net');
  const popupW = 480;
  const popupH = 620;
  const left = Math.max(0, (window.screen.width - popupW) / 2);
  const top = Math.max(0, (window.screen.height - popupH) / 2);

  const authPopup = window.open(
    origin + '/auth/action?type=authorize&client_id=' + encodeURIComponent(CRIMX_CLIENT_ID) + '&app_name=PluhMath&response_type=code&scope=identity,profile',
    'CrimXDoorAuth',
    'width=' + popupW + ',height=' + popupH + ',top=' + top + ',left=' + left + ',status=no,toolbar=no,menubar=no'
  );

  window.addEventListener('message', function onDoorAuthMsg(event) {
    if (event.data && event.data.type === 'CRIMX_AUTH_SUCCESS') {
      window.removeEventListener('message', onDoorAuthMsg);
      console.log('[DoorAuth] Authenticated user:', event.data.user);
      if (typeof window.onCrimXSignIn === 'function') {
        window.onCrimXSignIn(event.data);
      }
    }
  });
}
window.triggerCrimXDoorAuth = triggerCrimXDoorAuth;

window.onCrimXSignIn = async function(data) {
  const u = (data && data.user) ? data.user : {};
  const uid = u.uid || u.id || ('usr_' + Date.now());
  const token = data.id_token || data.access_token || data.token || '';

  currentCrimXUser = {
    uid: uid,
    username: u.username || u.displayName || u.name || 'CrimX Player',
    displayName: u.displayName || u.name || u.username || 'CrimX Player',
    email: u.email || '',
    avatarUrl: u.avatarUrl || u.photoURL || u.pfp || 'https://crimsonflame.net/assets/crimx-logo.png',
    photoURL: u.avatarUrl || u.photoURL || u.pfp || 'https://crimsonflame.net/assets/crimx-logo.png',
    bannerUrl: u.bannerUrl || '',
    statusBio: u.statusBio || '',
    badges: u.badges || ['DoorAuth Verified'],
    doorAuth: true,
    token: token
  };

  localStorage.setItem('crimx_doorauth_session', JSON.stringify(currentCrimXUser));
  updateCrimXUI(currentCrimXUser);
  closeCrimXModal();
  showToast(`Signed into CrimX as ${currentCrimXUser.displayName}!`, 'success');

  // Fetch full rich social profile from CrimX Profile API
  fetchCrimXUserProfile(uid, token).then(richProfile => {
    if (richProfile) {
      currentCrimXUser = { 
        ...currentCrimXUser, 
        ...richProfile,
        displayName: richProfile.displayName || currentCrimXUser.displayName,
        avatarUrl: richProfile.avatarUrl || currentCrimXUser.avatarUrl,
        photoURL: richProfile.avatarUrl || currentCrimXUser.photoURL
      };
      localStorage.setItem('crimx_doorauth_session', JSON.stringify(currentCrimXUser));
      updateCrimXUI(currentCrimXUser);
      populateProfileCard(currentCrimXUser);
    }
  });

  loadCloudSavesList().then(() => {
    autoRestoreCloudSaves();
    autoSyncLocalToCloud();
  });
};

// Restore DoorAuth session from storage on init
try {
  const cached = localStorage.getItem('crimx_doorauth_session');
  if (cached) {
    currentCrimXUser = JSON.parse(cached);
    // Background refresh profile from API
    if (currentCrimXUser.uid) {
      fetchCrimXUserProfile(currentCrimXUser.uid, currentCrimXUser.token).then(p => {
        if (p) {
          currentCrimXUser = { 
            ...currentCrimXUser, 
            ...p,
            displayName: p.displayName || currentCrimXUser.displayName,
            avatarUrl: p.avatarUrl || currentCrimXUser.avatarUrl,
            photoURL: p.avatarUrl || currentCrimXUser.photoURL
          };
          localStorage.setItem('crimx_doorauth_session', JSON.stringify(currentCrimXUser));
          updateCrimXUI(currentCrimXUser);
          populateProfileCard(currentCrimXUser);
        }
      });
      loadCloudSavesList().then(() => autoRestoreCloudSaves());
    }
  }
} catch (e) {}

// Firebase Auth listener
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentCrimXUser = {
      uid: user.uid,
      displayName: user.displayName || user.email.split('@')[0] || 'CrimX Player',
      email: user.email || '',
      avatarUrl: user.photoURL || 'https://crimsonflame.net/assets/crimx-logo.png',
      photoURL: user.photoURL || 'https://crimsonflame.net/assets/crimx-logo.png',
      badges: ['CrimX Verified']
    };
    localStorage.removeItem('crimx_doorauth_session');
    updateCrimXUI(currentCrimXUser);
    showToast(`Signed into CrimX as ${currentCrimXUser.displayName}`, 'success');

    fetchCrimXUserProfile(user.uid).then(p => {
      if (p) {
        currentCrimXUser = { ...currentCrimXUser, ...p };
        updateCrimXUI(currentCrimXUser);
        populateProfileCard(currentCrimXUser);
      }
    });

    await loadCloudSavesList();
    await autoRestoreCloudSaves();
    autoSyncLocalToCloud();

    // Start Dynamic Rich Game Presence across the CrimX ecosystem!
    startGamePresence(user.uid);
  } else if (!currentCrimXUser || !currentCrimXUser.doorAuth) {
    stopGamePresence();
    currentCrimXUser = null;
    updateCrimXUI(null);
    cloudSavesCache = {};
  }
});

// ============================================================================
// DYNAMIC RICH GAME PRESENCE ENGINE (CrimX Presence Integration)
// Broadcasts 'Playing [GameTitle]' to friends list on CrimX with auto-cleanup
// ============================================================================
let gamePresenceHeartbeat = null;

async function startGamePresence(uid) {
  if (!uid) return;
  const gameId = getCurrentPageGameId();
  const gameTitle = (gameId && GAME_TITLES[gameId]) ? GAME_TITLES[gameId] : 'PluhMath';

  const presencePayload = {
    online: true,
    currentGame: {
      title: gameTitle,
      details: 'In Game',
      clientId: CRIMX_CLIENT_ID,
      startedAt: Date.now()
    },
    lastActive: serverTimestamp()
  };

  try {
    await setDoc(doc(db, 'users', uid), presencePayload, { merge: true });
    console.debug(`[CrimX Presence] Dynamic Rich Presence active: Playing ${gameTitle}`);
  } catch (err) {
    console.warn('[CrimX Presence] Initial presence update error:', err);
  }

  // Heartbeat every 45 seconds
  if (gamePresenceHeartbeat) clearInterval(gamePresenceHeartbeat);
  gamePresenceHeartbeat = setInterval(async () => {
    if (currentCrimXUser && currentCrimXUser.uid && document.visibilityState === 'visible') {
      try {
        await setDoc(doc(db, 'users', currentCrimXUser.uid), {
          online: true,
          lastActive: serverTimestamp()
        }, { merge: true });
      } catch (e) {}
    }
  }, 45000);
}

async function stopGamePresence() {
  if (gamePresenceHeartbeat) {
    clearInterval(gamePresenceHeartbeat);
    gamePresenceHeartbeat = null;
  }
  if (currentCrimXUser && currentCrimXUser.uid) {
    try {
      await setDoc(doc(db, 'users', currentCrimXUser.uid), {
        currentGame: null,
        lastActive: serverTimestamp()
      }, { merge: true });
    } catch (e) {}
  }
}

window.addEventListener('beforeunload', () => {
  stopGamePresence();
});

function updateCrimXUI(user) {
  const container = document.getElementById('crimx-auth-slot');
  if (!container) return;

  if (user) {
    const name = user.displayName || user.username || user.email.split('@')[0] || 'CrimX Player';
    const pfp = user.avatarUrl || user.photoURL || user.pfp || 'https://crimsonflame.net/assets/crimx-logo.png';
    container.innerHTML = `
      <div id="crimx-auth-widget" style="display: inline-block;">
        <button type="button" class="cm-btn cm-btn-crimx-user" onclick="openCrimXModal()" title="CrimX Profile & Cloud Saves (${escapeHtml(name)})">
          <img src="${pfp}" alt="${escapeHtml(name)}" class="cm-crimx-avatar" onerror="this.src='https://crimsonflame.net/assets/crimx-logo.png'">
          <span class="cm-crimx-name">${escapeHtml(name)}</span>
          <span class="cm-cloud-badge" title="Cloud Save Active">☁️ Active</span>
        </button>
      </div>
    `;
  } else {
    // Official CrimX DoorAuth Sign-In Widget (Standardized & Locked) + GitHub Pages Mirror
    container.innerHTML = `
      <div id="crimx-auth-widget" style="display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <button type="button" id="crimx-signin-btn" class="crimx-signin-btn" onclick="triggerCrimXDoorAuth('https://crimsonflame.net')" title="Sign in with CrimX via crimsonflame.net">
          <img src="https://crimsonflame.net/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame-official.github.io/assets/crimx-logo.png'">
          <span id="crimx-signin-label">Sign in with CrimX</span>
        </button>
        <button type="button" id="crimx-signin-gh-btn" class="crimx-signin-btn crimx-signin-gh-btn" onclick="triggerCrimXDoorAuth('https://crimsonflame-official.github.io')" title="Sign in with CrimX via crimsonflame-official.github.io">
          <img src="https://crimsonflame-official.github.io/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame.net/assets/crimx-logo.png'">
          <span id="crimx-signin-gh-label">Sign in with CrimX (GH Mirror)</span>
        </button>
      </div>
    `;
  }
}

function populateProfileCard(user) {
  if (!user) return;
  const nameEl = document.getElementById('crimx-prof-name');
  const handleEl = document.getElementById('crimx-prof-handle');
  const emailEl = document.getElementById('crimx-prof-email');
  const pfpEl = document.getElementById('crimx-prof-pfp');
  const bannerEl = document.getElementById('crimx-prof-banner');
  const bioEl = document.getElementById('crimx-prof-bio');
  const badgesEl = document.getElementById('crimx-prof-badges');

  const name = user.displayName || user.username || 'Player';
  const handle = user.username ? `@${user.username}` : `@${name}`;
  const pfp = user.avatarUrl || user.photoURL || user.pfp || 'https://crimsonflame.net/assets/crimx-logo.png';
  const email = user.email || '';
  const banner = user.bannerUrl || '';
  const bio = user.statusBio || user.bio || '';
  const badges = user.badges && user.badges.length ? user.badges : ['DoorAuth Verified'];

  if (nameEl) nameEl.textContent = name;
  if (handleEl) handleEl.textContent = handle;
  if (emailEl) emailEl.textContent = email;
  if (pfpEl) {
    pfpEl.src = pfp;
    pfpEl.onerror = () => { pfpEl.src = 'https://crimsonflame.net/assets/crimx-logo.png'; };
  }
  if (bannerEl) {
    if (banner) {
      bannerEl.style.backgroundImage = `url('${banner}')`;
      bannerEl.style.backgroundSize = 'cover';
      bannerEl.style.backgroundPosition = 'center';
    } else {
      bannerEl.style.backgroundImage = 'linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%)';
    }
  }
  if (bioEl) {
    if (bio) {
      bioEl.style.display = 'block';
      bioEl.textContent = `"${bio}"`;
    } else {
      bioEl.style.display = 'none';
    }
  }
  if (badgesEl) {
    badgesEl.innerHTML = badges.map(b => {
      let bClass = 'crimx-badge-default';
      const bl = String(b).toLowerCase();
      if (bl.includes('founder')) bClass = 'crimx-badge-founder';
      else if (bl.includes('developer') || bl.includes('dev')) bClass = 'crimx-badge-developer';
      else if (bl.includes('doorauth') || bl.includes('verified')) bClass = 'crimx-badge-verified';
      return `<span class="crimx-badge-pill ${bClass}">🛡️ ${escapeHtml(b)}</span>`;
    }).join('');
  }
}

// ============================================================================
// CLOUD SAVE SYSTEM (Cross-device, survives cache clears)
// ============================================================================

function getOfflineSaveQueue() {
  try {
    const raw = localStorage.getItem('pluh_pending_cloud_uploads');
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function queueOfflineSave(gameId, payload) {
  try {
    const queue = getOfflineSaveQueue();
    queue[gameId] = payload;
    localStorage.setItem('pluh_pending_cloud_uploads', JSON.stringify(queue));
  } catch (e) {}
}

async function flushPendingCloudUploads() {
  if (!navigator.onLine || !currentCrimXUser) return;
  const queue = getOfflineSaveQueue();
  const gameIds = Object.keys(queue);
  if (gameIds.length === 0) return;

  console.debug('[PluhCloud] Connection restored, uploading pending saves:', gameIds);
  let uploaded = 0;
  for (const gId of gameIds) {
    const payload = queue[gId];
    try {
      const appRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath');
      await setDoc(appRef, {
        appName: 'PluhMath',
        appId: 'pluhmath',
        clientId: CRIMX_CLIENT_ID,
        lastActive: serverTimestamp(),
        updatedAtIso: new Date().toISOString()
      }, { merge: true });

      const saveRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves', gId);
      await setDoc(saveRef, { ...payload, lastUpdated: serverTimestamp() }, { merge: true });
      delete queue[gId];
      uploaded++;
    } catch (err) {
      console.warn('[PluhCloud] Error flushing save for', gId, err);
      break;
    }
  }

  localStorage.setItem('pluh_pending_cloud_uploads', JSON.stringify(queue));
  if (uploaded > 0) {
    showToast(`Internet connection restored. ${uploaded} save${uploaded === 1 ? '' : 's'} successfully backed up!`, 'success');
  }
}

window.addEventListener('online', flushPendingCloudUploads);

/**
 * Save game state to cloud under users/{uid}/connected_apps/pluhmath/saves/{gameId}
 */
export async function saveGameToCloud(gameId, data, gameTitle = '', indexedDBData = null) {
  const cleanGameId = String(gameId).toLowerCase().trim();
  const title = gameTitle || GAME_TITLES[cleanGameId] || cleanGameId;

  // 1. Always persist to local cache immediately
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data)) {
      if (!k.startsWith('__bridge_') && typeof v !== 'object') {
        localStorage.setItem(k, String(v));
      }
    }
  }

  // 2. Offline check
  if (!navigator.onLine) {
    showToast('Error: Unable to save. Saving when internet connection is restored', 'error');
    queueOfflineSave(cleanGameId, {
      gameId: cleanGameId,
      gameTitle: title,
      data: data,
      indexedDB: indexedDBData,
      itemCount: typeof data === 'object' ? Object.keys(data).length : 1,
      updatedAtIso: new Date().toISOString()
    });
    return false;
  }

  if (!currentCrimXUser) {
    console.debug('[CrimX] No user signed in. Saved to local cache only.');
    return false;
  }

  try {
    const payload = {
      gameId: cleanGameId,
      gameTitle: title,
      data: data,
      indexedDB: indexedDBData,
      itemCount: typeof data === 'object' ? Object.keys(data).length : 1,
      lastUpdated: serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    };

    const appRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath');
    await setDoc(appRef, {
      appName: 'PluhMath',
      appId: 'pluhmath',
      clientId: CRIMX_CLIENT_ID,
      lastActive: serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    }, { merge: true });

    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves', cleanGameId);
    await setDoc(saveRef, payload, { merge: true });

    cloudSavesCache[cleanGameId] = payload;
    showToast(`☁️ Cloud Save synced for ${title}!`, 'success');
    return true;
  } catch (err) {
    console.error('[CrimX Cloud Save] Failed to save to cloud:', err);
    showToast('Error: Unable to save. Saving when internet connection is restored', 'error');
    queueOfflineSave(cleanGameId, {
      gameId: cleanGameId,
      gameTitle: title,
      data: data,
      indexedDB: indexedDBData,
      itemCount: typeof data === 'object' ? Object.keys(data).length : 1,
      updatedAtIso: new Date().toISOString()
    });
    return false;
  }
}

/**
 * Retrieve game state from cloud
 */
export async function loadGameFromCloud(gameId) {
  if (!currentCrimXUser) return null;
  const cleanGameId = String(gameId).toLowerCase().trim();

  try {
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves', cleanGameId);
    let snap = await getDoc(saveRef);

    // Fallback: check legacy path if present
    if (!snap.exists()) {
      const legacyRef = doc(db, 'users', currentCrimXUser.uid, 'game_saves', cleanGameId);
      const legacySnap = await getDoc(legacyRef);
      if (legacySnap.exists()) {
        snap = legacySnap;
        await saveGameToCloud(cleanGameId, legacySnap.data().data, legacySnap.data().gameTitle);
      }
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      cloudSavesCache[cleanGameId] = data;
      return data;
    }
    return null;
  } catch (err) {
    console.error('[CrimX Cloud Save] Failed to fetch cloud save:', err);
    return null;
  }
}

/**
 * Fetch all cloud saves for the current user
 */
export async function loadCloudSavesList() {
  if (!currentCrimXUser) return [];

  try {
    const savesColl = collection(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves');
    const snap = await getDocs(savesColl);
    const list = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      list.push(d);
      cloudSavesCache[d.gameId] = d;
    });

    if (list.length === 0) {
      try {
        const legacyColl = collection(db, 'users', currentCrimXUser.uid, 'game_saves');
        const legSnap = await getDocs(legacyColl);
        legSnap.forEach(docSnap => {
          const d = docSnap.data();
          list.push(d);
          cloudSavesCache[d.gameId] = d;
        });
      } catch (e) {}
    }

    return list;
  } catch (err) {
    console.error('[CrimX Cloud Save] Failed to list saves:', err);
    return [];
  }
}

/**
 * Delete a cloud save
 */
export async function deleteGameCloudSave(gameId) {
  if (!currentCrimXUser) return;
  const cleanGameId = String(gameId).toLowerCase().trim();
  try {
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves', cleanGameId);
    await deleteDoc(saveRef);
    try {
      await deleteDoc(doc(db, 'users', currentCrimXUser.uid, 'game_saves', cleanGameId));
    } catch (e) {}
    delete cloudSavesCache[cleanGameId];
    showToast(`Deleted cloud save for ${GAME_TITLES[cleanGameId] || cleanGameId}`, 'info');
    renderCloudSavesListInModal();
  } catch (err) {
    console.error('[CrimX Cloud Save] Delete failed:', err);
  }
}

// ============================================================================
// AUTOMATIC CLOUD SAVE RESTORATION (ZERO MANUAL EFFORT)
// Saves restore automatically into localStorage and game iframes on load and login.
// ============================================================================

function getCurrentPageGameId() {
  const bodyAttr = document.body.getAttribute('data-game-id');
  if (bodyAttr) return bodyAttr.toLowerCase().trim();
  const path = window.location.pathname.toLowerCase();
  for (const id of Object.keys(GAME_TITLES)) {
    if (path.includes(id)) return id;
  }
  const idParam = new URLSearchParams(window.location.search).get('id');
  if (idParam) return idParam.toLowerCase().trim();
  return null;
}

function isMatchingGame(id1, id2) {
  if (!id1 || !id2) return false;
  const a = id1.toLowerCase().replace(/[^a-z0-9]/g, '');
  const b = id2.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (a === b) return true;
  if ((a === 'ut' || a === 'undertale') && (b === 'ut' || b === 'undertale')) return true;
  if ((a === 'dr' || a === 'deltarune') && (b === 'dr' || b === 'deltarune')) return true;
  if ((a === 'uty' || a === 'undertaleyellow') && (b === 'uty' || b === 'undertaleyellow')) return true;
  return false;
}

function injectRestoredSaveToGame(gameId, data) {
  const iframe = document.getElementById('game-iframe');
  if (!iframe || !iframe.contentWindow) return;

  try {
    iframe.contentWindow.postMessage({
      type: 'initialSaveDataResponse',
      messageId: 'auto_restore_' + Date.now(),
      allLocalStorageData: data
    }, '*');
    iframe.contentWindow.postMessage({
      type: 'saveDataChanged',
      gameId: gameId,
      allLocalStorageData: data
    }, '*');

    // Reload iframe smoothly if it started before cloud data arrived
    if (!iframe.dataset.cloudRestored) {
      iframe.dataset.cloudRestored = 'true';
      const curSrc = iframe.src;
      iframe.src = 'about:blank';
      setTimeout(() => { iframe.src = curSrc; }, 80);
    }
  } catch (e) {
    console.debug('[CrimX Auto-Restore] Iframe injection warning:', e);
  }
}

/**
 * Automatically restores all cloud saves into browser localStorage and active game iframes.
 * Completely automatic: no need to click 'Restore' manually!
 */
export async function autoRestoreCloudSaves() {
  if (!currentCrimXUser) return;

  try {
    const savesList = await loadCloudSavesList();
    if (!savesList || savesList.length === 0) return;

    const pageGame = getCurrentPageGameId();
    let restoredCount = 0;

    for (const saveDoc of savesList) {
      const gameId = saveDoc.gameId;
      const data = saveDoc.data;
      if (!data || typeof data !== 'object') continue;

      let gameRestored = false;

      // Automatically populate each key into localStorage
      for (const [k, v] of Object.entries(data)) {
        if (!k.startsWith('__bridge_')) {
          const strVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
          const currentLocal = localStorage.getItem(k);
          if (currentLocal === null || currentLocal === undefined || currentLocal === '') {
            localStorage.setItem(k, strVal);
            gameRestored = true;
          } else if (currentLocal !== strVal) {
            localStorage.setItem(k, strVal);
            gameRestored = true;
          }
        }
      }

      if (gameRestored) {
        restoredCount++;
        console.log(`[CrimX Auto-Restore] ✓ Automatically restored ${saveDoc.gameTitle || gameId}`);

        // If user is playing this game right now, inject into the live game iframe!
        if (pageGame && (pageGame === gameId || isMatchingGame(pageGame, gameId))) {
          injectRestoredSaveToGame(gameId, data);
        }
      }
    }

    if (restoredCount > 0) {
      showToast(`☁️ Automatically restored your save data from CrimX Cloud!`, 'success');
    }
  } catch (err) {
    console.error('[CrimX Auto-Restore] Error during auto-restore:', err);
  }
}

// ============================================================================
// IFRAME POSTMESSAGE BRIDGE (Direct hook for Undertale & Deltarune savesync.js)
// ============================================================================

window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  // 1. Game iframe notifies parent that save data changed (Undertale / Deltarune)
  if (data.type === 'saveDataChanged') {
    const gameId = (data.gameId || 'ut').toLowerCase();
    const savePayload = data.allLocalStorageData || {};
    console.debug('[CrimX Bridge] Received saveDataChanged from game:', gameId, savePayload);

    // Save locally
    for (const [k, v] of Object.entries(savePayload)) {
      if (!k.startsWith('__bridge_')) {
        localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }

    if (currentCrimXUser) {
      await saveGameToCloud(gameId, savePayload);
    } else {
      console.debug('[CrimX Bridge] Save changed locally. Sign in with CrimX DoorAuth to backup to cloud.');
    }
  }

  // 2. Game iframe requests initial save data on startup
  if (data.type === 'getInitialSaveData') {
    const gameId = (data.gameId || 'ut').toLowerCase();
    const messageId = data.messageId;
    console.debug('[CrimX Bridge] Game requested initial save data:', gameId, messageId);

    let saveToReturn = null;
    if (currentCrimXUser) {
      const cloudSave = await loadGameFromCloud(gameId);
      if (cloudSave && cloudSave.data) {
        saveToReturn = cloudSave.data;
        // Automatically write cloud save keys into localStorage so they survive offline play
        for (const [k, v] of Object.entries(saveToReturn)) {
          if (!k.startsWith('__bridge_')) {
            localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
          }
        }
        showToast(`☁️ Automatically restored ${GAME_TITLES[gameId] || gameId} save from cloud!`, 'success');
      }
    }

    // Fallback: If no cloud save found or not signed in, check existing localStorage
    if (!saveToReturn) {
      saveToReturn = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(gameId) || k.startsWith('ut') || k.startsWith('dr') || k.startsWith('file'))) {
          saveToReturn[k] = localStorage.getItem(k);
        }
      }
    }

    // Send response back to iframe
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({
        type: 'initialSaveDataResponse',
        messageId: messageId,
        allLocalStorageData: saveToReturn || {}
      }, '*');
      console.debug('[CrimX Bridge] Dispatched initialSaveDataResponse to iframe:', saveToReturn ? 'Data Transferred' : 'Empty');
    }
  }
});

// Auto-sync any known local keys to cloud for all games
function autoSyncLocalToCloud() {
  if (!currentCrimXUser) return;

  // Undertale / Deltarune prefix keys in localStorage
  const utKeys = {};
  const drKeys = {};
  const utyKeys = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('ut') && !key.startsWith('uty')) utKeys[key] = localStorage.getItem(key);
    if (key.startsWith('dr')) drKeys[key] = localStorage.getItem(key);
    if (key.startsWith('uty') || key.includes('yellow')) utyKeys[key] = localStorage.getItem(key);
  }

  if (Object.keys(utKeys).length > 0 && !cloudSavesCache['ut']) {
    saveGameToCloud('ut', utKeys, 'Undertale');
  }
  if (Object.keys(drKeys).length > 0 && !cloudSavesCache['dr']) {
    saveGameToCloud('dr', drKeys, 'Deltarune');
  }
  if (Object.keys(utyKeys).length > 0 && !cloudSavesCache['undertale-yellow']) {
    saveGameToCloud('undertale-yellow', utyKeys, 'Undertale Yellow');
  }
}

// ============================================================================
// MODAL & UI CONTROLS
// ============================================================================

window.openCrimXModal = function() {
  ensureCrimXModal();
  const modal = document.getElementById('crimx-auth-modal');
  if (modal) {
    modal.classList.add('active');
    if (currentCrimXUser) {
      populateProfileCard(currentCrimXUser);
      switchTab('profile');
      renderCloudSavesListInModal();

      if (currentCrimXUser.uid) {
        fetchCrimXUserProfile(currentCrimXUser.uid, currentCrimXUser.token).then(p => {
          if (p) {
            currentCrimXUser = { 
              ...currentCrimXUser, 
              ...p,
              displayName: p.displayName || currentCrimXUser.displayName,
              avatarUrl: p.avatarUrl || currentCrimXUser.avatarUrl,
              photoURL: p.avatarUrl || currentCrimXUser.photoURL
            };
            localStorage.setItem('crimx_doorauth_session', JSON.stringify(currentCrimXUser));
            updateCrimXUI(currentCrimXUser);
            populateProfileCard(currentCrimXUser);
          }
        });
      }
    } else {
      switchTab('login');
    }
  }
};

window.closeCrimXModal = function() {
  const modal = document.getElementById('crimx-auth-modal');
  if (modal) modal.classList.remove('active');
};

function switchTab(tabId) {
  document.querySelectorAll('.crimx-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabId);
  });
  document.querySelectorAll('.crimx-tab-pane').forEach(pane => {
    pane.classList.toggle('active', pane.id === `crimx-tab-${tabId}`);
  });
}

async function renderCloudSavesListInModal() {
  const container = document.getElementById('crimx-cloud-saves-list');
  if (!container) return;

  container.innerHTML = `<div style="text-align:center; padding:1rem; color:var(--text-dim);">Loading cloud saves...</div>`;
  const saves = await loadCloudSavesList();

  if (!saves || saves.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-dim); background:rgba(255,255,255,0.02); border-radius:var(--radius-sm); border:1px dashed var(--border-subtle);">
        <p style="margin-bottom:0.4rem; color:#fff; font-weight:600;">No Cloud Saves Found</p>
        <p style="font-size:0.82rem; margin:0;">Play Undertale, Deltarune, or any game while signed in. Your saves automatically backup to the cloud!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; gap:0.5rem; margin-bottom:1rem; flex-wrap:wrap; padding:0.6rem 0.8rem; background:rgba(255,255,255,0.03); border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">
      <div>
        <div style="font-weight:700; color:#fff; font-size:0.92rem;">Active Cloud Backups</div>
        <div style="font-size:0.75rem; color:var(--text-dim); margin-top:2px;">Dedicated saves per game • Protected against cache clearing</div>
      </div>
      <div style="display:flex; gap:0.5rem;">
        <button class="cm-btn cm-btn-yellow" style="font-size:0.8rem; padding:0.4rem 0.8rem; font-weight:700;" onclick="restoreAllCloudSaves()" title="Restore all game saves at once">
          📥 Restore All
        </button>
        <button class="cm-btn cm-btn-blue" style="font-size:0.8rem; padding:0.4rem 0.8rem;" onclick="crimxForceBackupAll()" title="Backup all current local saves">
          ☁️ Backup All
        </button>
      </div>
    </div>
  ` + saves.map(s => {
    const title = s.gameTitle || GAME_TITLES[s.gameId] || s.gameId;
    const dateStr = s.updatedAtIso ? new Date(s.updatedAtIso).toLocaleString() : 'Recently';
    const items = s.itemCount ? `${s.itemCount} files` : 'Save Data';

    return `
      <div class="crimx-save-item">
        <div class="crimx-save-meta">
          <div class="crimx-save-title">🎮 ${escapeHtml(title)}</div>
          <div class="crimx-save-sub">Synced: ${dateStr} • ${items}</div>
        </div>
        <div class="crimx-save-actions">
          <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.65rem; font-size:0.78rem;" onclick="restoreSaveToBrowser('${s.gameId}')" title="Restore this save to this browser">
            📥 Restore
          </button>
          <button class="cm-btn cm-btn-panic" style="padding:0.35rem 0.65rem; font-size:0.78rem;" onclick="deleteGameCloudSave('${s.gameId}')" title="Delete cloud backup">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.restoreAllCloudSaves = async function() {
  if (!currentCrimXUser) {
    showToast('Please sign in to restore cloud saves.', 'error');
    return;
  }
  showToast('Restoring all game saves from cloud...', 'info');
  const saves = await loadCloudSavesList();
  if (!saves || saves.length === 0) {
    showToast('No cloud saves found on your account.', 'info');
    return;
  }

  let count = 0;
  for (const s of saves) {
    const gId = s.gameId;
    if (window.PluhSaveBridge) {
      await window.PluhSaveBridge.restoreAllSaveDataForGame(gId, s);
    } else {
      if (s.data && typeof s.data === 'object') {
        Object.keys(s.data).forEach(k => localStorage.setItem(k, s.data[k]));
      }
    }
    count++;
  }

  showToast(`✓ Restored all saves for ${count} game${count === 1 ? '' : 's'}!`, 'success');

  const iframe = document.getElementById('game-iframe');
  if (iframe) {
    const cur = iframe.src;
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = cur; }, 80);
  }
  renderCloudSavesListInModal();
};

window.restoreSaveToBrowser = async function(gameId) {
  const save = cloudSavesCache[gameId] || await loadGameFromCloud(gameId);
  if (!save) {
    showToast('No save data available to restore.', 'error');
    return;
  }

  if (window.PluhSaveBridge) {
    await window.PluhSaveBridge.restoreAllSaveDataForGame(gameId, save);
  } else {
    const data = save.data;
    if (data && typeof data === 'object') {
      Object.keys(data).forEach(k => localStorage.setItem(k, data[k]));
    }
  }

  showToast(`✓ Restored save for ${save.gameTitle || GAME_TITLES[gameId] || gameId}! Reloading game...`, 'success');
  const iframe = document.getElementById('game-iframe');
  if (iframe) {
    const cur = iframe.src;
    iframe.src = 'about:blank';
    setTimeout(() => { iframe.src = cur; }, 80);
  }
};

window.crimxForceBackupAll = async function() {
  showToast('Scanning local save files to backup...', 'info');
  autoSyncLocalToCloud();
  await renderCloudSavesListInModal();
  showToast('All local game files synced to Cloud!', 'success');
};

let currentAuthSubTab = 'login';
window.switchAuthSubTab = function(mode) {
  currentAuthSubTab = mode;
  const loginBtn = document.getElementById('auth-tab-login-btn');
  const signupBtn = document.getElementById('auth-tab-signup-btn');
  const nameWrap = document.getElementById('crimx-signup-name-wrap');
  const submitBtn = document.getElementById('crimx-submit-btn');

  if (loginBtn && signupBtn) {
    if (mode === 'signup') {
      signupBtn.className = 'cm-btn cm-btn-yellow';
      loginBtn.className = 'cm-btn cm-btn-blue';
      if (nameWrap) nameWrap.style.display = 'block';
      if (submitBtn) submitBtn.textContent = 'Create PluhMath Account';
    } else {
      loginBtn.className = 'cm-btn cm-btn-yellow';
      signupBtn.className = 'cm-btn cm-btn-blue';
      if (nameWrap) nameWrap.style.display = 'none';
      if (submitBtn) submitBtn.textContent = 'Sign In with Email';
    }
  }
};

function ensureCrimXModal() {
  if (document.getElementById('crimx-auth-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'crimx-auth-modal';
  modal.className = 'cm-modal-overlay';
  modal.innerHTML = `
    <div class="cm-modal-card crimx-modal-card">
      <div class="cm-modal-header">
        <div class="cm-modal-title">
          <span style="font-size:1.2rem;">👤</span>
          <span>PluhMath Account & Cloud Save</span>
        </div>
        <button class="cm-modal-close" onclick="closeCrimXModal()">✕</button>
      </div>

      <!-- Tab Navigation -->
      <div class="crimx-tabs">
        <button class="crimx-tab-btn active" data-tab="login" onclick="switchCrimXTab('login')">Account Sign In</button>
        <button class="crimx-tab-btn" data-tab="cloud" onclick="switchCrimXTab('cloud')">☁️ Cloud Saves</button>
        <button class="crimx-tab-btn" data-tab="profile" onclick="switchCrimXTab('profile')">Profile</button>
      </div>

      <!-- TAB: Sign In -->
      <div class="crimx-tab-pane active" id="crimx-tab-login">
        <p style="font-size:0.85rem; color:var(--text-dim); margin-bottom:1rem; line-height:1.5;">
          Sign in or create an account to backup your game saves to the cloud so you never lose progress when clearing browser cache or changing computers.
        </p>

        <!-- Login / Signup Toggle -->
        <div style="display:flex; gap:0.5rem; margin-bottom:1rem;">
          <button type="button" id="auth-tab-login-btn" class="cm-btn cm-btn-yellow" style="flex:1; justify-content:center; font-size:0.82rem; font-weight:700;" onclick="switchAuthSubTab('login')">Sign In</button>
          <button type="button" id="auth-tab-signup-btn" class="cm-btn cm-btn-blue" style="flex:1; justify-content:center; font-size:0.82rem; font-weight:700;" onclick="switchAuthSubTab('signup')">Create Account</button>
        </div>

        <form id="crimx-login-form" onsubmit="handleCrimXEmailAuth(event)">
          <div id="crimx-signup-name-wrap" class="cm-input-group" style="margin-bottom:0.75rem; display:none;">
            <label style="font-size:0.76rem; color:var(--text-dim); font-weight:600;">DISPLAY NAME / USERNAME</label>
            <input type="text" id="crimx-reg-name" class="cm-url-input" placeholder="PlayerOne">
          </div>
          <div class="cm-input-group" style="margin-bottom:0.75rem;">
            <label style="font-size:0.76rem; color:var(--text-dim); font-weight:600;">EMAIL</label>
            <input type="email" id="crimx-login-email" class="cm-url-input" required placeholder="player@example.com">
          </div>
          <div class="cm-input-group" style="margin-bottom:1rem;">
            <label style="font-size:0.76rem; color:var(--text-dim); font-weight:600;">PASSWORD</label>
            <input type="password" id="crimx-login-password" class="cm-url-input" required placeholder="••••••••">
          </div>
          <button type="submit" id="crimx-submit-btn" class="cm-btn cm-btn-yellow" style="width:100%; justify-content:center; padding:0.7rem; font-weight:700;">
            Sign In with Email
          </button>
        </form>

        <div style="display:flex; align-items:center; gap:0.5rem; margin:1rem 0 0.75rem 0; color:var(--text-dim); font-size:0.74rem;">
          <div style="flex:1; height:1px; background:var(--border-subtle);"></div>
          <span>OR SIGN IN WITH</span>
          <div style="flex:1; height:1px; background:var(--border-subtle);"></div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.5rem; margin-bottom:0.75rem;">
          <button type="button" class="cm-btn cm-btn-blue" style="justify-content:center; padding:0.6rem; font-size:0.8rem;" onclick="handleCrimXGoogleLogin()" title="Sign in with Google">
            <svg width="15" height="15" viewBox="0 0 48 48" style="margin-right:6px;"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
            Google
          </button>
          <button type="button" class="cm-btn cm-btn-blue" style="justify-content:center; padding:0.6rem; font-size:0.8rem;" onclick="handleCrimXMicrosoftLogin()" title="Sign in with Microsoft">
            <svg width="15" height="15" viewBox="0 0 21 21" style="margin-right:6px;"><rect x="1" y="1" width="9" height="9" fill="#f25022"/><rect x="11" y="1" width="9" height="9" fill="#7fba00"/><rect x="1" y="11" width="9" height="9" fill="#00a4ef"/><rect x="11" y="11" width="9" height="9" fill="#ffb900"/></svg>
            Microsoft
          </button>
        </div>

        <button type="button" class="crimx-signin-btn" style="width:100%; justify-content:center;" onclick="triggerCrimXDoorAuth('https://crimsonflame.net')">
          <img src="https://crimsonflame.net/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame-official.github.io/assets/crimx-logo.png'">
          <span>Sign in with CrimX</span>
        </button>
      </div>

      <!-- TAB: Cloud Saves -->
      <div class="crimx-tab-pane" id="crimx-tab-cloud">
        <div id="crimx-cloud-saves-list" class="crimx-saves-container"></div>
      </div>

      <!-- TAB: Profile -->
      <div class="crimx-tab-pane" id="crimx-tab-profile">
        <div id="crimx-profile-details">
          <!-- Profile Card -->
          <div class="crimx-prof-card">
            <div id="crimx-prof-banner" class="crimx-prof-banner"></div>
            <div class="crimx-prof-body">
              <div class="crimx-prof-avatar-wrap">
                <img id="crimx-prof-pfp" src="https://crimsonflame.net/assets/crimx-logo.png" class="crimx-prof-pfp" alt="Avatar">
                <div id="crimx-prof-badges" class="crimx-prof-badges">
                  <span class="crimx-badge-pill crimx-badge-verified">🛡️ Active Player</span>
                </div>
              </div>
              <div class="crimx-prof-name-group">
                <div id="crimx-prof-name" class="crimx-prof-name">Player</div>
                <div id="crimx-prof-handle" class="crimx-prof-handle">@player</div>
                <div id="crimx-prof-email" class="crimx-prof-email">player@example.com</div>
              </div>
              <div id="crimx-prof-bio" class="crimx-prof-bio" style="display:none;"></div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:0.5rem; margin-top:1rem;">
            <button class="cm-btn cm-btn-blue" style="justify-content:center; padding:0.65rem;" onclick="switchCrimXTab('cloud')">
              ☁️ Manage Cloud Game Saves
            </button>
            <button class="cm-btn cm-btn-panic" style="justify-content:center; padding:0.65rem;" onclick="handleCrimXLogout()">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeCrimXModal();
  });
}

window.switchCrimXTab = switchTab;

window.handleCrimXEmailAuth = async function(e) {
  e.preventDefault();
  const email = document.getElementById('crimx-login-email').value.trim();
  const password = document.getElementById('crimx-login-password').value;
  const nameInput = document.getElementById('crimx-reg-name');
  const displayName = nameInput ? nameInput.value.trim() : '';

  try {
    if (currentAuthSubTab === 'signup') {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      if (displayName && userCred.user) {
        await updateProfile(userCred.user, { displayName: displayName });
      }
      showToast('Account created successfully!', 'success');
    } else {
      await signInWithEmailAndPassword(auth, email, password);
      showToast('Signed in successfully!', 'success');
    }
    closeCrimXModal();
  } catch (err) {
    showToast(err.message.replace('Firebase: ', ''), 'error');
  }
};

window.handleCrimXGoogleLogin = async function() {
  try {
    await signInWithPopup(auth, googleProvider);
    closeCrimXModal();
  } catch (err) {
    showToast(err.message.replace('Firebase: ', ''), 'error');
  }
};

window.handleCrimXMicrosoftLogin = async function() {
  try {
    await signInWithPopup(auth, microsoftProvider);
    closeCrimXModal();
  } catch (err) {
    showToast(err.message.replace('Firebase: ', ''), 'error');
  }
};

window.handleCrimXLogout = async function() {
  try {
    localStorage.removeItem('crimx_doorauth_session');
    await signOut(auth);
    currentCrimXUser = null;
    updateCrimXUI(null);
    showToast('Signed out.', 'info');
    closeCrimXModal();
  } catch (err) {
    showToast(err.message, 'error');
  }
};

// Toast notification helper
function showToast(message, type = 'info') {
  let toastContainer = document.getElementById('cm-toast-container');
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.id = 'cm-toast-container';
    toastContainer.className = 'cm-toast-container';
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement('div');
  toast.className = `cm-toast cm-toast-${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// Auto ensure modal is in DOM and UI is populated
document.addEventListener('DOMContentLoaded', () => {
  ensureCrimXModal();
  updateCrimXUI(currentCrimXUser);
  if (currentCrimXUser) {
    populateProfileCard(currentCrimXUser);
  }
});

