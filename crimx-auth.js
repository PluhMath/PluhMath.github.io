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
  apiKey: "AIzaSyDLrhT0-eMnObUNOQk8CPvQRHNMogUmYro",
  authDomain: "plumath.firebaseapp.com",
  projectId: "plumath",
  storageBucket: "plumath.firebasestorage.app",
  messagingSenderId: "581717942669",
  appId: "1:581717942669:web:c6679f57bbc75ff8699dc4",
  measurementId: "G-LZL13MLW1G"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(CRIMX_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
const microsoftProvider = new OAuthProvider('microsoft.com');

let currentCrimXUser = null;
let cloudSavesCache = {};

// CrimX Central Ecosystem Config (for linking API cross-sync)
const CRIMX_CENTRAL_CONFIG = {
  apiKey: "AIzaSyBSSJKDrFJ1_qlliZqgw34CY2TSaKOxxxM",
  authDomain: "crimsonflame-8169e.firebaseapp.com",
  projectId: "crimsonflame-8169e",
  storageBucket: "crimsonflame-8169e.firebasestorage.app",
  messagingSenderId: "406321213530",
  appId: "1:406321213530:web:92d27a69d34d147393a863"
};

let crimxCentralDb = null;
try {
  const centralApp = initializeApp(CRIMX_CENTRAL_CONFIG, 'crimx-central');
  crimxCentralDb = getFirestore(centralApp);
} catch (e) {
  try {
    const existing = getApp('crimx-central');
    if (existing) crimxCentralDb = getFirestore(existing);
  } catch (err) {}
}

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

function getCurrentPageGameId() {
  const bodyAttr = document.body.getAttribute('data-game-id');
  if (bodyAttr) return bodyAttr.toLowerCase().trim();
  const path = window.location.pathname.toLowerCase();
  for (const id of Object.keys(GAME_TITLES)) {
    if (path.includes(id)) return id;
  }
  const idParam = new URLSearchParams(window.location.search).get('id');
  if (idParam) return idParam.toLowerCase().trim();
  const titleEl = document.getElementById('game-title-el');
  if (titleEl && titleEl.textContent && !titleEl.textContent.includes('Loading')) {
    const text = titleEl.textContent.toLowerCase();
    for (const [id, title] of Object.entries(GAME_TITLES)) {
      if (text.includes(title.toLowerCase())) return id;
    }
  }
  return null;
}

function getCurrentPageGameTitle() {
  const gameId = getCurrentPageGameId();
  if (gameId && GAME_TITLES[gameId]) {
    return GAME_TITLES[gameId];
  }
  const titleEl = document.getElementById('game-title-el');
  if (titleEl && titleEl.textContent && !titleEl.textContent.includes('Loading')) {
    return titleEl.textContent.trim();
  }
  if (gameId) {
    return gameId.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  }
  return null;
}

// ============================================================================
// PROFILE API INTEGRATION (https://crimx.crimsonflame.net/api/user/profile)
// ============================================================================

export async function fetchCrimXUserProfile(uid, idToken = '') {
  if (!uid) return null;
  // 1. Read directly from PluhMath Firestore users collection
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      const d = userDoc.data();
      return {
        uid: uid,
        username: d.username || d.displayName || 'Player',
        displayName: d.displayName || d.username || 'Player',
        email: d.email || '',
        avatarUrl: d.avatarUrl || d.photoURL || d.pfp || 'https://crimsonflame.net/assets/crimx-logo.png',
        bannerUrl: d.bannerUrl || '',
        statusBio: d.statusBio || d.bio || '',
        badges: d.badges || ['Verified Player']
      };
    }
  } catch (e) {
    console.debug('[PluhMath Profile] Firestore read error:', e);
  }

  // 2. Fallback to API if available
  try {
    const headers = { 'Accept': 'application/json' };
    if (idToken) headers['Authorization'] = `Bearer ${idToken}`;

    const res = await fetch(`https://crimx.crimsonflame.net/api/user/profile?uid=${encodeURIComponent(uid)}`, {
      method: 'GET',
      headers: headers
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {}

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
    badges: u.badges || ['Verified Player'],
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
    autoSyncLocalToCloud();
  });

  // Start Dynamic Rich Presence via CrimX Linking
  startGamePresence(uid);
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
      loadCloudSavesList();
      startGamePresence(currentCrimXUser.uid);
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
// DYNAMIC RICH GAME PRESENCE & CRIMX LINKING ENGINE
// Automatically syncs 'Playing [Game Title]' or 'Browsing PluhMath' to account
// status across CrimX, DoorAuth, PluhMath Cloud, and connected friends list.
// ============================================================================
let gamePresenceHeartbeat = null;

async function startGamePresence(uid) {
  if (!uid) return;
  const gameTitle = getCurrentPageGameTitle();
  const isPlaying = Boolean(gameTitle);
  const statusText = isPlaying ? `Playing ${gameTitle}` : 'Browsing PluhMath';
  const gameId = getCurrentPageGameId() || '';

  const currentGame = isPlaying ? {
    title: gameTitle,
    details: `Playing ${gameTitle} on PluhMath`,
    gameId: gameId,
    clientId: CRIMX_CLIENT_ID,
    startedAt: Date.now()
  } : null;

  const presencePayload = {
    online: true,
    statusText: statusText,
    currentGame: currentGame,
    lastActive: serverTimestamp()
  };

  // 1. Update PluhMath's Firestore database
  try {
    await setDoc(doc(db, 'users', uid), presencePayload, { merge: true });
    await setDoc(doc(db, 'users', uid, 'connected_apps', 'pluhmath'), {
      clientId: CRIMX_CLIENT_ID,
      appName: 'PluhMath',
      name: 'PluhMath',
      statusText: statusText,
      currentGame: isPlaying ? gameTitle : null,
      lastActive: serverTimestamp()
    }, { merge: true });
    console.debug(`[CrimX Linking] Account status synced: ${statusText}`);
  } catch (err) {
    console.warn('[CrimX Linking] Presence update error in PluhMath DB:', err);
  }

  // 2. Sync to CrimX Central Firestore if reachable
  if (crimxCentralDb) {
    try {
      await setDoc(doc(crimxCentralDb, 'users', uid), presencePayload, { merge: true });
      await setDoc(doc(crimxCentralDb, 'users', uid, 'connected_apps', CRIMX_CLIENT_ID), {
        clientId: CRIMX_CLIENT_ID,
        appName: 'PluhMath',
        name: 'PluhMath',
        statusText: statusText,
        lastActive: serverTimestamp()
      }, { merge: true });
    } catch (centralErr) {
      console.debug('[CrimX Linking] CrimX central status note:', centralErr.message);
    }
  }

  // 3. Broadcast to CrimX window / parent tab if linked
  const broadcastPayload = {
    type: 'CRIMX_PRESENCE_UPDATE',
    statusText: statusText,
    currentGame: currentGame,
    appName: 'PluhMath',
    clientId: CRIMX_CLIENT_ID,
    uid: uid
  };
  if (window.opener && typeof window.opener.postMessage === 'function') {
    try { window.opener.postMessage(broadcastPayload, '*'); } catch (e) {}
  }
  if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
    try { window.parent.postMessage(broadcastPayload, '*'); } catch (e) {}
  }

  // 4. Update memory & UI
  if (currentCrimXUser) {
    currentCrimXUser.statusText = statusText;
    currentCrimXUser.currentGame = currentGame;
    if (currentCrimXUser.doorAuth) {
      localStorage.setItem('crimx_doorauth_session', JSON.stringify(currentCrimXUser));
    }
    updateCrimXUI(currentCrimXUser);
    populateProfileCard(currentCrimXUser);
  }

  // 5. Heartbeat every 45 seconds to keep presence alive
  if (gamePresenceHeartbeat) clearInterval(gamePresenceHeartbeat);
  gamePresenceHeartbeat = setInterval(async () => {
    if (currentCrimXUser && currentCrimXUser.uid && document.visibilityState === 'visible') {
      const heartbeatPayload = {
        online: true,
        statusText: statusText,
        lastActive: serverTimestamp()
      };
      try {
        await setDoc(doc(db, 'users', currentCrimXUser.uid), heartbeatPayload, { merge: true });
      } catch (e) {}
      if (crimxCentralDb) {
        try {
          await setDoc(doc(crimxCentralDb, 'users', currentCrimXUser.uid), heartbeatPayload, { merge: true });
        } catch (e) {}
      }
    }
  }, 45000);
}

async function stopGamePresence() {
  if (gamePresenceHeartbeat) {
    clearInterval(gamePresenceHeartbeat);
    gamePresenceHeartbeat = null;
  }
  if (currentCrimXUser && currentCrimXUser.uid) {
    const offlinePayload = {
      online: false,
      statusText: 'Offline',
      currentGame: null,
      lastActive: serverTimestamp()
    };
    try {
      await setDoc(doc(db, 'users', currentCrimXUser.uid), offlinePayload, { merge: true });
    } catch (e) {}
    if (crimxCentralDb) {
      try {
        await setDoc(doc(crimxCentralDb, 'users', currentCrimXUser.uid), offlinePayload, { merge: true });
      } catch (e) {}
    }
  }
}

window.addEventListener('beforeunload', () => {
  stopGamePresence();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && currentCrimXUser && currentCrimXUser.uid) {
    startGamePresence(currentCrimXUser.uid);
  }
});

window.updateCrimXStatus = function(customStatus) {
  if (!currentCrimXUser || !currentCrimXUser.uid) return;
  const statusText = customStatus || (getCurrentPageGameTitle() ? `Playing ${getCurrentPageGameTitle()}` : 'Browsing PluhMath');
  setDoc(doc(db, 'users', currentCrimXUser.uid), {
    statusText: statusText,
    lastActive: serverTimestamp()
  }, { merge: true }).catch(() => {});
  if (crimxCentralDb) {
    setDoc(doc(crimxCentralDb, 'users', currentCrimXUser.uid), {
      statusText: statusText,
      lastActive: serverTimestamp()
    }, { merge: true }).catch(() => {});
  }
  currentCrimXUser.statusText = statusText;
  updateCrimXUI(currentCrimXUser);
  populateProfileCard(currentCrimXUser);
};

function updateCrimXUI(user) {
  const container = document.getElementById('crimx-auth-slot');
  if (!container) return;

  if (user) {
    const name = user.displayName || user.username || user.email.split('@')[0] || 'CrimX Player';
    const pfp = user.avatarUrl || user.photoURL || user.pfp || 'https://crimsonflame.net/assets/crimx-logo.png';
    const statusText = user.statusText || (getCurrentPageGameTitle() ? `Playing ${getCurrentPageGameTitle()}` : 'Browsing PluhMath');
    container.innerHTML = `
      <div id="crimx-auth-widget" style="display: inline-block;">
        <button type="button" class="cm-btn cm-btn-crimx-user" onclick="openCrimXModal()" title="CrimX Profile & Cloud Saves (${escapeHtml(name)} • ${escapeHtml(statusText)})">
          <img src="${pfp}" alt="${escapeHtml(name)}" class="cm-crimx-avatar" onerror="this.src='https://crimsonflame.net/assets/crimx-logo.png'">
          <span class="cm-crimx-name">${escapeHtml(name)}</span>
          <span class="cm-cloud-badge" title="${escapeHtml(statusText)}">🟢 ${escapeHtml(statusText)}</span>
        </button>
      </div>
    `;
  } else {
    // Single clean Sign In button that opens the comprehensive sign in menu
    container.innerHTML = `
      <div id="crimx-auth-widget" style="display: inline-block;">
        <button type="button" id="crimx-signin-btn" class="cm-btn cm-btn-yellow cm-btn-signin" onclick="openCrimXModal()" title="Sign in to your PluhMath account">
          <span style="font-size: 0.95rem;">👤</span>
          <span id="crimx-signin-label">Sign In</span>
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
  const statusEl = document.getElementById('crimx-prof-status-text');

  const name = user.displayName || user.username || 'Player';
  const handle = user.username ? `@${user.username}` : `@${name}`;
  const pfp = user.avatarUrl || user.photoURL || user.pfp || 'https://crimsonflame.net/assets/crimx-logo.png';
  const email = user.email || '';
  const banner = user.bannerUrl || '';
  const bio = user.statusBio || user.bio || '';
  const badges = user.badges && user.badges.length ? user.badges : ['Verified Player'];
  const statusText = user.statusText || (getCurrentPageGameTitle() ? `Playing ${getCurrentPageGameTitle()}` : 'Browsing PluhMath');

  if (nameEl) nameEl.textContent = name;
  if (handleEl) handleEl.textContent = handle;
  if (emailEl) emailEl.textContent = email;
  if (statusEl) statusEl.textContent = statusText;
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
    showToast('Offline: Save stored in browser. Will sync to cloud when connected.', 'info');
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

  if (!currentCrimXUser || !currentCrimXUser.uid) {
    console.debug('[PluhMath Cloud Save] No user signed in. Saved to browser storage.');
    return false;
  }

  try {
    // 3. Sanitize data so Firestore never receives undefined or unsupported objects
    const sanitizedData = {};
    if (data && typeof data === 'object') {
      for (const [k, v] of Object.entries(data)) {
        if (v !== undefined && v !== null) {
          sanitizedData[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
        }
      }
    }

    const payload = {
      gameId: cleanGameId,
      gameTitle: title,
      data: sanitizedData,
      itemCount: Object.keys(sanitizedData).length,
      lastUpdated: serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    };

    if (indexedDBData && typeof indexedDBData === 'object') {
      try {
        const idbString = JSON.stringify(indexedDBData);
        if (idbString && idbString.length < 800000) {
          payload.indexedDB = JSON.parse(idbString);
        }
      } catch (e) {}
    }

    // Save directly to PluhMath's Firestore: users/{uid}/saves/{cleanGameId}
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'saves', cleanGameId);
    await setDoc(saveRef, payload, { merge: true });

    // Update user profile active state in PluhMath Firestore
    try {
      await setDoc(doc(db, 'users', currentCrimXUser.uid), {
        lastActive: serverTimestamp(),
        lastActiveGame: cleanGameId
      }, { merge: true });
    } catch (e) {}

    cloudSavesCache[cleanGameId] = payload;
    showToast(`☁️ Cloud Save synced for ${title}!`, 'success');
    return true;
  } catch (err) {
    console.error('[PluhMath Cloud Save] Failed to save to Firestore:', err);
    if (err.code === 'permission-denied') {
      showToast('Cloud save permission denied. Verify Firestore rules in Firebase Console.', 'error');
    } else {
      const msg = err.message ? err.message.replace(/^Firebase:\s*/, '') : 'Saved to browser storage';
      showToast(`Cloud save error: ${msg}`, 'error');
    }
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
 * Retrieve game state from PluhMath Firestore
 */
export async function loadGameFromCloud(gameId) {
  if (!currentCrimXUser || !currentCrimXUser.uid) return null;
  const cleanGameId = String(gameId).toLowerCase().trim();

  try {
    // 1. Direct PluhMath Firestore path: users/{uid}/saves/{cleanGameId}
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'saves', cleanGameId);
    let snap = await getDoc(saveRef);

    // 2. Legacy fallback check
    if (!snap.exists()) {
      try {
        const legacyRef = doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves', cleanGameId);
        const legacySnap = await getDoc(legacyRef);
        if (legacySnap.exists()) {
          snap = legacySnap;
        }
      } catch (e) {}
    }

    if (snap && snap.exists()) {
      const data = snap.data();
      cloudSavesCache[cleanGameId] = data;
      return data;
    }
    return null;
  } catch (err) {
    console.error('[PluhMath Cloud Save] Failed to fetch cloud save:', err);
    return null;
  }
}

/**
 * Fetch all cloud saves for the current user from PluhMath Firestore
 */
export async function loadCloudSavesList() {
  if (!currentCrimXUser || !currentCrimXUser.uid) return [];

  try {
    // 1. Direct PluhMath Firestore collection: users/{uid}/saves
    const savesColl = collection(db, 'users', currentCrimXUser.uid, 'saves');
    const snap = await getDocs(savesColl);
    const list = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      list.push(d);
      cloudSavesCache[d.gameId] = d;
    });

    // 2. Fallback check for legacy paths if empty
    if (list.length === 0) {
      try {
        const legacyColl = collection(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves');
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
    console.error('[PluhMath Cloud Save] Failed to list saves:', err);
    return [];
  }
}

/**
 * Delete a cloud save from PluhMath Firestore
 */
export async function deleteGameCloudSave(gameId) {
  if (!currentCrimXUser || !currentCrimXUser.uid) return;
  const cleanGameId = String(gameId).toLowerCase().trim();
  try {
    await deleteDoc(doc(db, 'users', currentCrimXUser.uid, 'saves', cleanGameId));
    try {
      await deleteDoc(doc(db, 'users', currentCrimXUser.uid, 'connected_apps', 'pluhmath', 'saves', cleanGameId));
    } catch (e) {}
    delete cloudSavesCache[cleanGameId];
    showToast(`Deleted cloud save for ${GAME_TITLES[cleanGameId] || cleanGameId}`, 'info');
    renderCloudSavesListInModal();
  } catch (err) {
    console.error('[PluhMath Cloud Save] Delete failed:', err);
  }
}

// ============================================================================
// AUTOMATIC CLOUD SAVE RESTORATION (ZERO MANUAL EFFORT)
// Saves restore automatically into localStorage and game iframes on load and login.
// ============================================================================

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

/**
 * Auto-restore feature removed per user requirement:
 * The cloud save system strictly UPLOADS / backs up game saves,
 * and NEVER modifies, overwrites, or edits local save files.
 */
export async function autoRestoreCloudSaves() {
  return;
}

// ============================================================================
// UNIVERSAL MULTI-GAME SAVE ENGINE & POSTMESSAGE BRIDGE
// Supports Run 3, Drift Boss, Tiny Fishing, Geometry Dash, Undertale,
// Deltarune, Undertale Yellow, PluhShooter, PluhUs, Restrictia, and custom games.
// ============================================================================

const SUPPORTED_GAMES_SAVES = [
  {
    id: 'run3',
    title: 'Run 3',
    icon: '🏃‍♂️',
    match: (k) => {
      const l = k.toLowerCase();
      return l.includes('run3') || l.includes('run_3') || l.startsWith('openfl') || l.includes('lastusername') || l.includes('run3_backup') || l.startsWith('so:');
    }
  },
  {
    id: 'drift-boss',
    title: 'Drift Boss',
    icon: '🏎️',
    match: (k) => {
      const l = k.toLowerCase();
      return l.includes('drift') || l.startsWith('c2drift') || l.startsWith('c2_') || l.includes('driftboss');
    }
  },
  {
    id: 'tiny-fishing',
    title: 'Tiny Fishing',
    icon: '🎣',
    match: (k) => {
      const l = k.toLowerCase();
      return l.includes('fish') || l.includes('tiny') || l.startsWith('tf_') || l.includes('upgrade');
    }
  },
  {
    id: 'geometry-dash',
    title: 'Geometry Dash Subzero',
    icon: '🔺',
    match: (k) => {
      const l = k.toLowerCase();
      return l.startsWith('gd_') || l.includes('geometry') || l.includes('subzero');
    }
  },
  {
    id: 'undertale',
    title: 'Undertale',
    icon: '❤️',
    match: (k) => k.startsWith('ut') || k.startsWith('undertale') || (k.startsWith('file') && !k.startsWith('file_dr'))
  },
  {
    id: 'deltarune',
    title: 'Deltarune',
    icon: '🔷',
    match: (k) => k.startsWith('dr') || k.startsWith('deltarune') || k.includes('true_ch')
  },
  {
    id: 'undertale-yellow',
    title: 'Undertale Yellow',
    icon: '🤠',
    match: (k) => k.startsWith('uty') || k.includes('yellow')
  },
  {
    id: 'pluhshooter',
    title: 'PluhShooter.io',
    icon: '🔫',
    match: (k) => {
      const l = k.toLowerCase();
      return l.includes('pluhshooter') || l.startsWith('ps_');
    }
  },
  {
    id: 'pluhus',
    title: 'PluhUs',
    icon: '🚀',
    match: (k) => {
      const l = k.toLowerCase();
      return l.includes('pluhus') || l.includes('among');
    }
  },
  {
    id: 'restrictia',
    title: 'The Chronicles of Restrictia',
    icon: '⚔️',
    match: (k) => {
      const l = k.toLowerCase();
      return l.includes('restrictia') || l.includes('tcor') || l.includes('island_overdrive');
    }
  }
];

const GAME_ICONS = {
  'undertale': '❤️',
  'ut': '❤️',
  'deltarune': '🔷',
  'dr': '🔷',
  'undertale-yellow': '🤠',
  'uty': '🤠',
  'run3': '🏃‍♂️',
  'run-3': '🏃‍♂️',
  'drift-boss': '🏎️',
  'driftboss': '🏎️',
  'tiny-fishing': '🎣',
  'tinyfishing': '🎣',
  'geometry-dash': '🔺',
  'gd': '🔺',
  'pluhshooter': '🔫',
  'pluhshooter-io': '🔫',
  'pluhus': '🚀',
  'restrictia': '⚔️'
};

// 1. Hook PostMessage bridge from games
window.addEventListener('message', async (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  // Game iframe notifies parent that save data changed
  if (data.type === 'saveDataChanged') {
    const rawGameId = data.gameId || getCurrentPageGameId() || 'ut';
    const gameId = rawGameId.toLowerCase();
    const savePayload = data.allLocalStorageData || {};
    console.debug('[CrimX Bridge] Received saveDataChanged from game:', gameId, savePayload);

    // Save locally
    for (const [k, v] of Object.entries(savePayload)) {
      if (!k.startsWith('__bridge_')) {
        localStorage.setItem(k, typeof v === 'object' ? JSON.stringify(v) : String(v));
      }
    }

    if (currentCrimXUser) {
      await saveGameToCloud(gameId, savePayload, GAME_TITLES[gameId] || gameId);
    }
  }

  // Game iframe requests initial save data on startup
  if (data.type === 'getInitialSaveData') {
    const rawGameId = data.gameId || getCurrentPageGameId() || 'ut';
    const gameId = rawGameId.toLowerCase();
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
        showToast(`☁️ Restored ${GAME_TITLES[gameId] || gameId} save from cloud!`, 'success');
      }
    }

    // Fallback: If no cloud save found or not signed in, check existing localStorage
    if (!saveToReturn) {
      saveToReturn = {};
      const gameMatcher = SUPPORTED_GAMES_SAVES.find(g => g.id === gameId || isMatchingGame(g.id, gameId));
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith(gameId) || (gameMatcher && gameMatcher.match(k)) || k.startsWith('file'))) {
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

// 2. Hook PluhSaveBridge events for continuous saves across Run 3, Drift Boss, Tiny Fishing, etc.
window.addEventListener('pluhmath-save-changed', async (event) => {
  if (!currentCrimXUser || !currentCrimXUser.uid) return;
  const detail = event.detail;
  if (!detail || !detail.gameId) return;
  const gameId = detail.gameId;
  const localData = detail.localStorage || detail.data || {};
  const idbData = detail.indexedDB || null;
  const title = detail.gameTitle || GAME_TITLES[gameId] || gameId;

  if (Object.keys(localData).length > 0 || idbData) {
    console.debug(`[PluhCloud] Auto-syncing live progress for ${title}...`);
    await saveGameToCloud(gameId, localData, title, idbData);
  }
});

// 3. Hook .PMS file imports to immediately backup to cloud
window.addEventListener('pluhmath-pms-restored', async (event) => {
  if (!currentCrimXUser || !currentCrimXUser.uid) return;
  const detail = event.detail;
  if (!detail || !detail.gameId) return;
  const gameId = detail.gameId;
  const data = detail.data || {};
  const title = GAME_TITLES[gameId] || gameId;
  await saveGameToCloud(gameId, data, title);
});

// 4. Auto-sync all known local saves to cloud for ALL games
export async function autoSyncLocalToCloud() {
  if (!currentCrimXUser || !currentCrimXUser.uid) return;

  // Check active game iframe first (captures Run 3, Drift Boss, Tiny Fishing if in frame)
  const activeGame = getCurrentPageGameId();
  if (activeGame) {
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        const frameStorage = iframe.contentWindow.localStorage;
        if (frameStorage && frameStorage.length > 0) {
          const framePayload = {};
          for (let i = 0; i < frameStorage.length; i++) {
            const k = frameStorage.key(i);
            if (k && !k.startsWith('__bridge_')) {
              const val = frameStorage.getItem(k);
              framePayload[k] = val;
              localStorage.setItem(k, val);
            }
          }
          if (Object.keys(framePayload).length > 0) {
            await saveGameToCloud(activeGame, framePayload, GAME_TITLES[activeGame] || activeGame);
          }
        }
      } catch (e) {}
    }
  }

  // Scan parent window localStorage for all supported games
  for (const gameConfig of SUPPORTED_GAMES_SAVES) {
    const gameKeys = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (gameConfig.match(key)) {
        gameKeys[key] = localStorage.getItem(key);
      }
    }

    if (Object.keys(gameKeys).length > 0) {
      await saveGameToCloud(gameConfig.id, gameKeys, gameConfig.title);
    }
  }
}

// 5. Manual instant Cloud Sync function for active game
window.syncActiveGameToCloud = async function() {
  const activeGame = getCurrentPageGameId();
  if (!activeGame) {
    showToast('Not currently on a game page. Syncing all local saves...', 'info');
    await autoSyncLocalToCloud();
    return;
  }

  const title = GAME_TITLES[activeGame] || activeGame;
  const iframe = document.getElementById('game-iframe');
  const payload = {};

  if (iframe && iframe.contentWindow) {
    try {
      const frameStorage = iframe.contentWindow.localStorage;
      if (frameStorage) {
        for (let i = 0; i < frameStorage.length; i++) {
          const k = frameStorage.key(i);
          if (k && !k.startsWith('__bridge_')) {
            payload[k] = frameStorage.getItem(k);
            localStorage.setItem(k, payload[k]);
          }
        }
      }
    } catch (e) {}
  }

  const cfg = SUPPORTED_GAMES_SAVES.find(g => g.id === activeGame || isMatchingGame(g.id, activeGame));
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && ((cfg && cfg.match(k)) || k.startsWith(activeGame))) {
      payload[k] = localStorage.getItem(k);
    }
  }

  if (Object.keys(payload).length > 0) {
    await saveGameToCloud(activeGame, payload, title);
    showToast(`☁️ ${title} progress successfully synced to Cloud!`, 'success');
  } else {
    showToast(`No local save data found for ${title} yet. Play a bit first!`, 'info');
  }
};

// 6. Periodic background autosave for active game every 15s
setInterval(async () => {
  if (!currentCrimXUser || !currentCrimXUser.uid) return;
  const activeGame = getCurrentPageGameId();
  if (!activeGame) return;

  const iframe = document.getElementById('game-iframe');
  if (iframe && iframe.contentWindow) {
    try {
      const frameStorage = iframe.contentWindow.localStorage;
      if (frameStorage && frameStorage.length > 0) {
        const frameData = {};
        for (let i = 0; i < frameStorage.length; i++) {
          const k = frameStorage.key(i);
          if (k && !k.startsWith('__bridge_')) {
            frameData[k] = frameStorage.getItem(k);
          }
        }
        if (Object.keys(frameData).length > 0) {
          await saveGameToCloud(activeGame, frameData, GAME_TITLES[activeGame] || activeGame);
        }
      }
    } catch (e) {}
  }
}, 15000);

// 7. Flush active game save on unload
window.addEventListener('beforeunload', () => {
  const activeGame = getCurrentPageGameId();
  if (activeGame && currentCrimXUser) {
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        const frameStorage = iframe.contentWindow.localStorage;
        if (frameStorage) {
          for (let i = 0; i < frameStorage.length; i++) {
            const k = frameStorage.key(i);
            if (!k.startsWith('__bridge_')) {
              localStorage.setItem(k, frameStorage.getItem(k));
            }
          }
        }
      } catch (e) {}
    }
  }
});

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
  const curGame = getCurrentPageGameId();
  const curGameTitle = curGame ? (GAME_TITLES[curGame] || curGame) : null;

  if (!saves || saves.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:1.5rem; color:var(--text-dim); background:rgba(255,255,255,0.02); border-radius:var(--radius-sm); border:1px dashed var(--border-subtle);">
        <p style="margin-bottom:0.4rem; color:#fff; font-weight:600;">No Cloud Saves Found</p>
        <p style="font-size:0.82rem; margin:0 0 1rem 0;">Play Run 3, Drift Boss, Tiny Fishing, Undertale, or any game while signed in. Your saves automatically backup to the cloud!</p>
        ${curGameTitle ? `
          <button class="cm-btn cm-btn-yellow" style="font-size:0.82rem; padding:0.5rem 1rem; margin:0 auto;" onclick="syncActiveGameToCloud()">
            ⚡ Backup ${escapeHtml(curGameTitle)} Now
          </button>
        ` : ''}
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
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
        ${curGameTitle ? `
          <button class="cm-btn cm-btn-yellow" style="font-size:0.8rem; padding:0.4rem 0.8rem; font-weight:700;" onclick="syncActiveGameToCloud()" title="Backup current game progress">
            ⚡ Backup ${escapeHtml(curGameTitle)}
          </button>
        ` : ''}
        <button class="cm-btn cm-btn-blue" style="font-size:0.8rem; padding:0.4rem 0.8rem;" onclick="crimxForceBackupAll()" title="Backup all local game saves">
          ☁️ Backup All
        </button>
      </div>
    </div>
  ` + saves.map(s => {
    const title = s.gameTitle || GAME_TITLES[s.gameId] || s.gameId;
    const icon = GAME_ICONS[s.gameId] || '🎮';
    const dateStr = s.updatedAtIso ? new Date(s.updatedAtIso).toLocaleString() : 'Recently';
    const items = s.itemCount ? `${s.itemCount} items` : 'Save Data';

    return `
      <div class="crimx-save-item">
        <div class="crimx-save-meta">
          <div class="crimx-save-title">${icon} ${escapeHtml(title)}</div>
          <div class="crimx-save-sub">Synced: ${dateStr} • ${items}</div>
        </div>
        <div class="crimx-save-actions">
          <button class="cm-btn cm-btn-panic" style="padding:0.35rem 0.65rem; font-size:0.78rem;" onclick="deleteGameCloudSave('${s.gameId}')" title="Delete cloud backup">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

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

        <div style="display:flex; flex-direction:column; gap:0.5rem;">
          <button type="button" class="crimx-signin-btn" style="width:100%; justify-content:center;" onclick="triggerCrimXDoorAuth('https://crimsonflame.net')" title="Sign in with CrimX via crimsonflame.net">
            <img src="https://crimsonflame.net/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame-official.github.io/assets/crimx-logo.png'">
            <span>Sign in with CrimX</span>
          </button>
          <button type="button" class="crimx-signin-btn crimx-signin-gh-btn" style="width:100%; justify-content:center;" onclick="triggerCrimXDoorAuth('https://crimsonflame-official.github.io')" title="Sign in with CrimX via crimsonflame-official.github.io mirror">
            <img src="https://crimsonflame-official.github.io/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame.net/assets/crimx-logo.png'">
            <span>Sign in with CrimX (GH Mirror)</span>
          </button>
        </div>
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
                <div id="crimx-prof-status-pill" class="crimx-prof-status-pill" style="display:inline-flex; align-items:center; gap:0.4rem; margin-top:0.4rem; padding:0.25rem 0.65rem; border-radius:999px; background:rgba(0,255,204,0.1); border:1px solid rgba(0,255,204,0.3); font-size:0.75rem; color:#00ffcc; font-weight:600; width:fit-content;">
                  <span style="width:7px; height:7px; border-radius:50%; background:#00ffcc; box-shadow:0 0 6px #00ffcc; display:inline-block;"></span>
                  <span id="crimx-prof-status-text">Browsing PluhMath</span>
                </div>
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
      const name = displayName || email.split('@')[0] || 'Player';
      if (userCred.user) {
        await updateProfile(userCred.user, { displayName: name });
        try {
          await setDoc(doc(db, 'users', userCred.user.uid), {
            uid: userCred.user.uid,
            username: name,
            displayName: name,
            email: email,
            avatarUrl: 'https://crimsonflame.net/assets/crimx-logo.png',
            badges: ['Verified Player'],
            createdAt: serverTimestamp(),
            lastActive: serverTimestamp()
          }, { merge: true });
        } catch (e) {
          console.warn('[PluhMath Profile] Profile save non-critical:', e);
        }
      }
      showToast('Account created successfully!', 'success');
    } else {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      if (userCred.user) {
        try {
          await setDoc(doc(db, 'users', userCred.user.uid), {
            lastActive: serverTimestamp()
          }, { merge: true });
        } catch (e) {}
      }
      showToast('Signed in successfully!', 'success');
    }
    closeCrimXModal();
  } catch (err) {
    showToast(err.message.replace('Firebase: ', ''), 'error');
  }
};

window.handleCrimXGoogleLogin = async function() {
  try {
    if (window.location.protocol === 'file:') {
      showToast('OAuth sign-in requires running on http/https (e.g. GitHub Pages or a web server), not file://', 'error');
      return;
    }
    await signInWithPopup(auth, googleProvider);
    closeCrimXModal();
  } catch (err) {
    console.error("Google Auth Error:", err);
    const msg = err.message ? err.message.replace(/^Firebase:\s*/, '').replace(/\s*\([a-z0-9\/-]+\)\.?$/i, '') : 'Sign in failed';
    showToast(msg, 'error');
  }
};

window.handleCrimXMicrosoftLogin = async function() {
  try {
    if (window.location.protocol === 'file:') {
      showToast('OAuth sign-in requires running on http/https (e.g. GitHub Pages or a web server), not file://', 'error');
      return;
    }
    await signInWithPopup(auth, microsoftProvider);
    closeCrimXModal();
  } catch (err) {
    console.error("Microsoft Auth Error:", err);
    const msg = err.message ? err.message.replace(/^Firebase:\s*/, '').replace(/\s*\([a-z0-9\/-]+\)\.?$/i, '') : 'Sign in failed';
    showToast(msg, 'error');
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

// Expose PluhAuth ecosystem bindings for PluhCommunity & Community Games
window.PluhAuth = {
  db,
  auth,
  getCurrentUser: () => currentCrimXUser,
  showToast,
  escapeHtml
};

export { db, auth, currentCrimXUser, showToast, escapeHtml };


