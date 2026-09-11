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
  authDomain: "crimsonflame-8169e.firebaseapp.com",
  projectId: "crimsonflame-8169e",
  storageBucket: "crimsonflame-8169e.firebasestorage.app",
  messagingSenderId: "406321213530",
  appId: "1:406321213530:web:92d27a69d34d147393a863"
};

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(CRIMX_FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

let currentCrimXUser = null;
let cloudSavesCache = {};

// Known game mappings for nice titles
const GAME_TITLES = {
  'ut': 'Undertale',
  'undertale': 'Undertale',
  'dr': 'Deltarune',
  'deltarune': 'Deltarune',
  'run3': 'Run 3',
  'pluhshooter': 'PluhShooter.io',
  'pluhus': 'PluhUs',
  'geometry-dash': 'Geometry Dash Subzero',
  'drift-boss': 'Drift Boss'
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
    origin + '/auth/action?type=authorize&client_id=' + encodeURIComponent(CRIMX_CLIENT_ID) + '&response_type=code&scope=identity,profile',
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

  loadCloudSavesList();
  autoSyncLocalToCloud();
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
  } else if (!currentCrimXUser || !currentCrimXUser.doorAuth) {
    currentCrimXUser = null;
    updateCrimXUI(null);
    cloudSavesCache = {};
  }
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

/**
 * Save game state to Firestore under users/{uid}/game_saves/{gameId}
 */
export async function saveGameToCloud(gameId, data, gameTitle = '') {
  if (!currentCrimXUser) {
    console.debug('[CrimX] No user signed in. Cloud save skipped (local only).');
    return false;
  }

  const cleanGameId = String(gameId).toLowerCase().trim();
  const title = gameTitle || GAME_TITLES[cleanGameId] || cleanGameId;

  try {
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'game_saves', cleanGameId);
    const payload = {
      gameId: cleanGameId,
      gameTitle: title,
      data: data,
      itemCount: typeof data === 'object' ? Object.keys(data).length : 1,
      lastUpdated: serverTimestamp(),
      updatedAtIso: new Date().toISOString()
    };

    await setDoc(saveRef, payload, { merge: true });
    cloudSavesCache[cleanGameId] = payload;
    showToast(`☁️ Cloud Save synced for ${title}!`, 'success');
    console.debug(`[CrimX Cloud Save] Successfully saved ${cleanGameId} to cloud.`);
    return true;
  } catch (err) {
    console.error('[CrimX Cloud Save] Failed to save to Firestore:', err);
    showToast(`Failed to backup ${title} to cloud`, 'error');
    return false;
  }
}

/**
 * Retrieve game state from Firestore
 */
export async function loadGameFromCloud(gameId) {
  if (!currentCrimXUser) return null;
  const cleanGameId = String(gameId).toLowerCase().trim();

  try {
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'game_saves', cleanGameId);
    const snap = await getDoc(saveRef);
    if (snap.exists()) {
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
    const savesColl = collection(db, 'users', currentCrimXUser.uid, 'game_saves');
    const snap = await getDocs(savesColl);
    const list = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      list.push(d);
      cloudSavesCache[d.gameId] = d;
    });
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
    const saveRef = doc(db, 'users', currentCrimXUser.uid, 'game_saves', cleanGameId);
    await deleteDoc(saveRef);
    delete cloudSavesCache[cleanGameId];
    showToast(`Deleted cloud save for ${GAME_TITLES[cleanGameId] || cleanGameId}`, 'info');
    renderCloudSavesListInModal();
  } catch (err) {
    console.error('[CrimX Cloud Save] Delete failed:', err);
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
        showToast(`Restoring ${GAME_TITLES[gameId] || gameId} progress from CrimX Cloud...`, 'info');
      }
    }

    // Send response back to iframe
    if (event.source && typeof event.source.postMessage === 'function') {
      event.source.postMessage({
        type: 'initialSaveDataResponse',
        messageId: messageId,
        allLocalStorageData: saveToReturn || {}
      }, '*');
      console.debug('[CrimX Bridge] Dispatched initialSaveDataResponse to iframe:', saveToReturn ? 'Cloud Data Found' : 'Empty');
    }
  }
});

// Auto-sync any known local keys to cloud for all games
function autoSyncLocalToCloud() {
  if (!currentCrimXUser) return;

  // Undertale / Deltarune prefix keys in localStorage
  const utKeys = {};
  const drKeys = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (key.startsWith('ut')) utKeys[key] = localStorage.getItem(key);
    if (key.startsWith('dr')) drKeys[key] = localStorage.getItem(key);
  }

  if (Object.keys(utKeys).length > 0 && !cloudSavesCache['ut']) {
    saveGameToCloud('ut', utKeys, 'Undertale');
  }
  if (Object.keys(drKeys).length > 0 && !cloudSavesCache['dr']) {
    saveGameToCloud('dr', drKeys, 'Deltarune');
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
        <p style="font-size:0.82rem; margin:0;">Play Undertale, Deltarune, or any game while signed in. Your saves automatically upload to CrimX Cloud!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = saves.map(s => {
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

window.restoreSaveToBrowser = async function(gameId) {
  const save = cloudSavesCache[gameId] || await loadGameFromCloud(gameId);
  if (!save || !save.data) {
    showToast('No save data available to restore.', 'error');
    return;
  }

  const data = save.data;
  let count = 0;
  if (typeof data === 'object') {
    Object.keys(data).forEach(k => {
      localStorage.setItem(k, data[k]);
      count++;
    });
  }

  showToast(`✓ Restored ${count} save files for ${save.gameTitle || gameId}! Reloading game...`, 'success');
  window.dispatchEvent(new CustomEvent('crimx-save-restored', { detail: { gameId, data } }));
};

window.crimxForceBackupAll = async function() {
  showToast('Scanning local save files to backup...', 'info');
  autoSyncLocalToCloud();
  await renderCloudSavesListInModal();
  showToast('All local game files synced to CrimX Cloud!', 'success');
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
          <img src="https://crimsonflame.net/assets/crimx-logo.png" alt="CrimX" style="width:22px; height:22px; object-fit:contain;">
          <span>CrimX Account & Cloud Save</span>
        </div>
        <button class="cm-modal-close" onclick="closeCrimXModal()">✕</button>
      </div>

      <!-- Tab Navigation -->
      <div class="crimx-tabs">
        <button class="crimx-tab-btn active" data-tab="login" onclick="switchCrimXTab('login')">DoorAuth Sign In</button>
        <button class="crimx-tab-btn" data-tab="cloud" onclick="switchCrimXTab('cloud')">☁️ Cloud Saves</button>
        <button class="crimx-tab-btn" data-tab="profile" onclick="switchCrimXTab('profile')">Profile</button>
      </div>

      <!-- TAB: Sign In -->
      <div class="crimx-tab-pane active" id="crimx-tab-login">
        <p style="font-size:0.85rem; color:var(--text-dim); margin-bottom:1rem; line-height:1.5;">
          Sign in via official CrimX DoorAuth to securely sync your game progress to the cloud so you never lose saves when clearing browser cache.
        </p>

        <!-- Official CrimX DoorAuth Buttons -->
        <div style="margin-bottom: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem;">
          <button type="button" class="crimx-signin-btn" style="width: 100%; justify-content: center;" onclick="triggerCrimXDoorAuth('https://crimsonflame.net')">
            <img src="https://crimsonflame.net/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame-official.github.io/assets/crimx-logo.png'">
            <span>Sign in with CrimX (crimsonflame.net)</span>
          </button>
          <button type="button" class="crimx-signin-btn crimx-signin-gh-btn" style="width: 100%; justify-content: center;" onclick="triggerCrimXDoorAuth('https://crimsonflame-official.github.io')">
            <img src="https://crimsonflame-official.github.io/assets/crimx-logo.png" alt="CrimX" class="crimx-btn-logo" onerror="this.src='https://crimsonflame.net/assets/crimx-logo.png'">
            <span>Sign in with CrimX (crimsonflame-official.github.io)</span>
          </button>
        </div>

        <div style="display:flex; align-items:center; gap:0.5rem; margin:1rem 0; color:var(--text-dim); font-size:0.78rem;">
          <div style="flex:1; height:1px; background:var(--border-subtle);"></div>
          <span>OR DIRECT EMAIL LOGIN</span>
          <div style="flex:1; height:1px; background:var(--border-subtle);"></div>
        </div>

        <form id="crimx-login-form" onsubmit="handleCrimXLogin(event)">
          <div class="cm-input-group" style="margin-bottom:0.75rem;">
            <label style="font-size:0.78rem; color:var(--text-dim); font-weight:600;">EMAIL</label>
            <input type="email" id="crimx-login-email" class="cm-url-input" required placeholder="player@crimsonflame.net">
          </div>
          <div class="cm-input-group" style="margin-bottom:1.25rem;">
            <label style="font-size:0.78rem; color:var(--text-dim); font-weight:600;">PASSWORD</label>
            <input type="password" id="crimx-login-password" class="cm-url-input" required placeholder="••••••••">
          </div>
          <button type="submit" class="cm-btn cm-btn-yellow" style="width:100%; justify-content:center; padding:0.75rem;">
            Sign in with Email
          </button>
        </form>

        <div style="display:flex; align-items:center; gap:0.5rem; margin:1rem 0; color:var(--text-dim); font-size:0.78rem;">
          <div style="flex:1; height:1px; background:var(--border-subtle);"></div>
          <span>OR</span>
          <div style="flex:1; height:1px; background:var(--border-subtle);"></div>
        </div>

        <button type="button" class="cm-btn cm-btn-blue" style="width:100%; justify-content:center; padding:0.65rem;" onclick="handleCrimXGoogleLogin()">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style="width:16px; height:16px;">
          Continue with Google
        </button>
      </div>

      <!-- TAB: Cloud Saves -->
      <div class="crimx-tab-pane" id="crimx-tab-cloud">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <div>
            <span style="font-weight:600; color:#fff; font-size:0.95rem;">Active Cloud Backups</span>
            <p style="font-size:0.78rem; color:var(--text-dim); margin:0.2rem 0 0 0;">Stored in Firestore • Never lost on cache clear</p>
          </div>
          <button class="cm-btn cm-btn-blue" style="font-size:0.78rem; padding:0.4rem 0.75rem;" onclick="crimxForceBackupAll()">
            ☁️ Backup Now
          </button>
        </div>

        <div id="crimx-cloud-saves-list" class="crimx-saves-container"></div>
      </div>

      <!-- TAB: Profile -->
      <div class="crimx-tab-pane" id="crimx-tab-profile">
        <div id="crimx-profile-details">
          <!-- Rich Profile Card with Custom Banner & Badges -->
          <div class="crimx-prof-card">
            <div id="crimx-prof-banner" class="crimx-prof-banner"></div>
            <div class="crimx-prof-body">
              <div class="crimx-prof-avatar-wrap">
                <img id="crimx-prof-pfp" src="https://crimsonflame.net/assets/crimx-logo.png" class="crimx-prof-pfp" alt="Avatar">
                <div id="crimx-prof-badges" class="crimx-prof-badges">
                  <span class="crimx-badge-pill crimx-badge-verified">🛡️ DoorAuth Verified</span>
                </div>
              </div>
              <div class="crimx-prof-name-group">
                <div id="crimx-prof-name" class="crimx-prof-name">Player</div>
                <div id="crimx-prof-handle" class="crimx-prof-handle">@player</div>
                <div id="crimx-prof-email" class="crimx-prof-email">player@crimsonflame.net</div>
              </div>
              <div id="crimx-prof-bio" class="crimx-prof-bio" style="display:none;"></div>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:0.5rem;">
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

window.handleCrimXLogin = async function(e) {
  e.preventDefault();
  const email = document.getElementById('crimx-login-email').value.trim();
  const password = document.getElementById('crimx-login-password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
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

window.handleCrimXLogout = async function() {
  try {
    localStorage.removeItem('crimx_doorauth_session');
    await signOut(auth);
    currentCrimXUser = null;
    updateCrimXUI(null);
    showToast('Signed out of CrimX.', 'info');
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
