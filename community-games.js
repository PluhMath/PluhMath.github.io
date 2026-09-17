// PluhMath — PluhCommunity Core Engine
// Handles Community Games browsing, creation, ratings, play counters,
// and promotion to the main PluhMath catalogue.

import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// Database reference helper
function getDb() {
  if (window.PluhAuth && window.PluhAuth.db) return window.PluhAuth.db;
  return null;
}

function getCurrentUser() {
  if (window.PluhAuth && window.PluhAuth.getCurrentUser) return window.PluhAuth.getCurrentUser();
  return null;
}

function showToast(msg, type = 'info') {
  if (window.PluhAuth && window.PluhAuth.showToast) {
    window.PluhAuth.showToast(msg, type);
  } else {
    console.log(`[PluhCommunity] ${msg}`);
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[m]);
}

// ============================================================================
// CLOUD DATABASE OPERATIONS
// ============================================================================

/**
 * Fetch community games with optional filters, sorting, and search query.
 */
export async function fetchCommunityGames({ sort = 'trending', category = 'all', queryText = '', promotedOnly = false } = {}) {
  const db = getDb();
  if (!db) return [];

  try {
    const colRef = collection(db, 'community_games');
    const snap = await getDocs(colRef);
    let games = [];

    snap.forEach(d => {
      const data = d.data();
      if (data.status !== 'deleted') {
        games.push({ id: d.id, ...data });
      }
    });

    // Filter by promoted only if requested
    if (promotedOnly) {
      games = games.filter(g => g.promoted === true);
    }

    // Filter by category
    if (category && category !== 'all') {
      games = games.filter(g => (g.category || '').toLowerCase() === category.toLowerCase());
    }

    // Filter by queryText (search title, tags, or @author)
    if (queryText && queryText.trim()) {
      const q = queryText.toLowerCase().trim();
      games = games.filter(g => {
        const title = (g.title || '').toLowerCase();
        const author = (g.authorName || '').toLowerCase();
        const desc = (g.description || '').toLowerCase();
        const tags = Array.isArray(g.tags) ? g.tags.join(' ').toLowerCase() : '';
        return title.includes(q) || author.includes(q) || desc.includes(q) || tags.includes(q);
      });
    }

    // Sort games
    if (sort === 'trending') {
      // Balance stars and views
      games.sort((a, b) => {
        const scoreA = ((a.stars || 0) * 10) + (a.views || 0);
        const scoreB = ((b.stars || 0) * 10) + (b.views || 0);
        return scoreB - scoreA;
      });
    } else if (sort === 'stars') {
      games.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    } else if (sort === 'views') {
      games.sort((a, b) => (b.views || 0) - (a.views || 0));
    } else if (sort === 'newest') {
      games.sort((a, b) => {
        const tA = a.createdAtIso ? new Date(a.createdAtIso).getTime() : 0;
        const tB = b.createdAtIso ? new Date(b.createdAtIso).getTime() : 0;
        return tB - tA;
      });
    } else if (sort === 'promoted') {
      games.sort((a, b) => (b.promoted === true ? 1 : 0) - (a.promoted === true ? 1 : 0));
    }

    return games;
  } catch (err) {
    console.error('[PluhCommunity] Error loading games:', err);
    return [];
  }
}

/**
 * Fetch a single community game by document ID.
 */
export async function fetchCommunityGameById(gameId) {
  const db = getDb();
  if (!db || !gameId) return null;

  try {
    const cleanId = gameId.replace(/^community_/, '');
    const docRef = doc(db, 'community_games', cleanId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    return null;
  } catch (err) {
    console.error('[PluhCommunity] Error loading game by ID:', err);
    return null;
  }
}

/**
 * Publish a new community game to the cloud database.
 */
export async function publishCommunityGame(gameData) {
  const db = getDb();
  const user = getCurrentUser();
  if (!db) throw new Error('Cloud storage unavailable.');
  if (!user || !user.uid) throw new Error('You must be signed in to publish a community game.');

  const cleanTitle = (gameData.title || '').trim();
  if (!cleanTitle) throw new Error('Game title is required.');

  if (gameData.gameSourceType === 'url') {
    const url = (gameData.gameUrl || '').trim();
    if (!url || (!url.startsWith('https://') && !url.startsWith('http://'))) {
      throw new Error('Please provide a valid game link starting with https://');
    }
  } else if (gameData.gameSourceType === 'html') {
    if (!gameData.htmlContent || !gameData.htmlContent.trim()) {
      throw new Error('Please upload an HTML game file or paste valid HTML5 game code.');
    }
  }

  // Generate clean document ID
  const slug = cleanTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 30) || 'game';
  const docId = `${slug}-${Date.now().toString(36)}`;

  const authorName = user.displayName || user.username || user.email?.split('@')[0] || 'Pluher';
  const authorAvatar = user.photoURL || user.avatarUrl || user.pfp || '';

  // Check if author is an approved member of the Creator Program
  let isCreator = false;
  try {
    isCreator = await isUserCreator(user.uid);
  } catch(e) {}

  const docPayload = {
    title: cleanTitle,
    description: (gameData.description || '').trim(),
    category: gameData.category || 'arcade',
    tags: Array.isArray(gameData.tags) ? gameData.tags : (gameData.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    authorUid: user.uid,
    authorName: authorName,
    authorAvatar: authorAvatar,
    isCreatorGame: isCreator, // Flagged true if author is in the Creator Program
    gameSourceType: gameData.gameSourceType || 'url',
    gameUrl: (gameData.gameUrl || '').trim(),
    htmlContent: gameData.htmlContent || '',
    thumbnail: gameData.thumbnail || '',
    icon: gameData.icon || '🎮',
    bgGradient: gameData.bgGradient || 'linear-gradient(135deg, #101626, #1e293b)',
    controls: Array.isArray(gameData.controls) ? gameData.controls : [],
    howToPlay: (gameData.howToPlay || '').trim(),
    stars: 0,
    views: 0,
    promoted: false,
    curatedBy: null,
    curatedByUid: null,
    status: 'published',
    createdAt: serverTimestamp(),
    createdAtIso: new Date().toISOString(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'community_games', docId), docPayload);

  // SELECTIVE OWNER NOTIFICATION:
  // When a Creator Program member publishes a game, send an instant notification to the owner!
  // Normal game makers do NOT trigger notifications.
  if (isCreator) {
    try {
      const notifRef = doc(collection(db, 'owner_notifications'));
      await setDoc(notifRef, {
        type: 'creator_game_drop',
        gameId: docId,
        gameTitle: cleanTitle,
        category: gameData.category || 'arcade',
        authorUid: user.uid,
        authorName: authorName,
        authorAvatar: authorAvatar,
        thumbnail: gameData.thumbnail || '',
        read: false,
        createdAt: serverTimestamp(),
        createdAtIso: new Date().toISOString()
      });
      console.debug('[PluhCommunity] Notification alert created for Creator Program release:', cleanTitle);
    } catch (notifErr) {
      console.warn('[PluhCommunity] Notice dispatch note:', notifErr);
    }
  }

  return { id: docId, ...docPayload };
}

/**
 * Update an existing community game (Author only).
 */
export async function updateCommunityGame(gameId, updatePayload) {
  const db = getDb();
  const user = getCurrentUser();
  if (!db || !user) throw new Error('Unauthorized');

  const cleanId = gameId.replace(/^community_/, '');
  const ref = doc(db, 'community_games', cleanId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Game not found');

  const existing = snap.data();
  if (existing.authorUid !== user.uid) {
    throw new Error('You can only edit games you created.');
  }

  const payload = {
    ...updatePayload,
    updatedAt: serverTimestamp()
  };

  await updateDoc(ref, payload);
  return { id: cleanId, ...existing, ...payload };
}

/**
 * Delete a community game (Author only).
 */
export async function deleteCommunityGame(gameId) {
  const db = getDb();
  const user = getCurrentUser();
  if (!db || !user) throw new Error('Unauthorized');

  const cleanId = gameId.replace(/^community_/, '');
  const ref = doc(db, 'community_games', cleanId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Game not found');

  const existing = snap.data();
  if (existing.authorUid !== user.uid) {
    throw new Error('You can only delete games you created.');
  }

  await deleteDoc(ref);
  return true;
}

/**
 * Toggle Star on a community game.
 */
export async function toggleStarCommunityGame(gameId) {
  const db = getDb();
  const user = getCurrentUser();
  if (!db) return false;

  const cleanId = gameId.replace(/^community_/, '');
  const storageKey = user ? `pluh_starred_${user.uid}` : 'pluh_starred_guest';
  let starredList = [];
  try {
    starredList = JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch (e) {}

  const isStarred = starredList.includes(cleanId);
  const ref = doc(db, 'community_games', cleanId);

  try {
    if (isStarred) {
      starredList = starredList.filter(id => id !== cleanId);
      await updateDoc(ref, { stars: increment(-1) });
    } else {
      starredList.push(cleanId);
      await updateDoc(ref, { stars: increment(1) });
    }
    localStorage.setItem(storageKey, JSON.stringify(starredList));
    return !isStarred;
  } catch (err) {
    console.error('[PluhCommunity] Star error:', err);
    return isStarred;
  }
}

/**
 * Check if the current user has starred a specific game.
 */
export function isGameStarred(gameId) {
  const user = getCurrentUser();
  const cleanId = gameId.replace(/^community_/, '');
  const storageKey = user ? `pluh_starred_${user.uid}` : 'pluh_starred_guest';
  try {
    const list = JSON.parse(localStorage.getItem(storageKey)) || [];
    return list.includes(cleanId);
  } catch (e) {
    return false;
  }
}

/**
 * Increment play count for a community game.
 */
export async function incrementGamePlayCount(gameId) {
  const db = getDb();
  if (!db || !gameId) return;

  try {
    const cleanId = gameId.replace(/^community_/, '');
    const ref = doc(db, 'community_games', cleanId);
    await updateDoc(ref, { views: increment(1) });
  } catch (e) {
    // Non-critical background counter
  }
}

/**
 * Admin / Curator: Toggle promotion to main PluhMath catalogue.
 */
export async function togglePromoteToCatalog(gameId) {
  const db = getDb();
  const user = getCurrentUser();
  if (!db) throw new Error('Database connection required');

  // Verify permission: Curator or Owner
  const hasCuratorRights = user ? (await isUserCurator(user.uid)) : false;
  if (!hasCuratorRights && !isOwner()) {
    throw new Error('Only approved members of the Curator Program and the site owner can promote games to the main catalogue.');
  }

  const cleanId = gameId.replace(/^community_/, '');
  const ref = doc(db, 'community_games', cleanId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Game not found');

  const curPromoted = snap.data().promoted === true;
  const newPromoted = !curPromoted;
  const curatorName = user ? (user.displayName || user.username || 'Curator') : 'Curator';

  await updateDoc(ref, { 
    promoted: newPromoted,
    curatedBy: newPromoted ? curatorName : null,
    curatedByUid: newPromoted ? (user?.uid || null) : null,
    promotedAt: newPromoted ? serverTimestamp() : null
  });

  return newPromoted;
}

// ============================================================================
// CURATOR & CREATOR PROGRAMS ENGINE
// 1. Curator Program: Evaluators who can review & approve/promote games to main catalogue
// 2. Creator Program: Elite game makers whose game drops trigger notifications to owner
// ============================================================================

/**
 * Check if a user is an approved Curator (can approve games to main catalogue)
 */
export async function isUserCurator(uid) {
  if (!uid) return false;
  if (isOwner(uid)) return true;

  const db = getDb();
  if (!db) return false;
  try {
    const docRef = doc(db, 'curator_members', uid);
    const snap = await getDoc(docRef);
    return snap.exists() && snap.data().active === true;
  } catch (e) {
    return false;
  }
}

/**
 * Check if a user is in the Creator Program (top-tier game maker; publishes notify owner)
 */
export async function isUserCreator(uid) {
  if (!uid) return false;
  const db = getDb();
  if (!db) return false;
  try {
    const docRef = doc(db, 'creator_members', uid);
    const snap = await getDoc(docRef);
    return snap.exists() && snap.data().active !== false;
  } catch (e) {
    return false;
  }
}

/**
 * Owner check helper
 */
export function isOwner(uid) {
  try { localStorage.removeItem('pluh_owner_mode'); } catch(e) {}
  const user = getCurrentUser();
  if (!user) return false;
  const role = (user.role || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const displayName = (user.displayName || '').toLowerCase();
  if (role === 'admin' || user.isAdmin === true) return true;
  if (email.includes('allab') || username === 'crimson' || displayName === 'crimson') return true;
  return false;
}

export function setOwnerMode(active) {
  try { localStorage.removeItem('pluh_owner_mode'); } catch(e) {}
}

/**
 * Add a member to Curator Program or Creator Program (Owner only)
 */
export async function addProgramMember(programType, { uid, username, displayName }) {
  const db = getDb();
  if (!db) throw new Error('Database unavailable');
  const cleanUsername = (username || '').replace(/^@/, '').trim();
  if (!cleanUsername) throw new Error('Username required');

  const cleanUid = uid || `user_${cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const colName = programType === 'curator' ? 'curator_members' : 'creator_members';

  await setDoc(doc(db, colName, cleanUid), {
    uid: cleanUid,
    username: cleanUsername,
    displayName: displayName || cleanUsername,
    programType,
    active: true,
    addedAt: serverTimestamp(),
    addedAtIso: new Date().toISOString()
  });

  return true;
}

/**
 * Remove a member from Curator Program or Creator Program (Owner only)
 */
export async function removeProgramMember(programType, uid) {
  const db = getDb();
  if (!db) throw new Error('Database unavailable');
  const colName = programType === 'curator' ? 'curator_members' : 'creator_members';
  await deleteDoc(doc(db, colName, uid));
  return true;
}

/**
 * Fetch members of Curator Program or Creator Program
 */
export async function fetchProgramMembers(programType) {
  const db = getDb();
  if (!db) return [];
  const colName = programType === 'curator' ? 'curator_members' : 'creator_members';
  try {
    const snap = await getDocs(collection(db, colName));
    const members = [];
    snap.forEach(d => {
      members.push({ id: d.id, ...d.data() });
    });
    return members;
  } catch (e) {
    return [];
  }
}

/**
 * Submit an application to join the Curator Program or Creator Program
 */
export async function submitProgramApplication(programType, { reason, favoriteGames, experience }) {
  const user = getCurrentUser();
  const db = getDb();
  if (!user) throw new Error('Please sign in to submit an application.');
  if (!db) throw new Error('Database unavailable.');

  const username = user.username || user.displayName || user.email?.split('@')[0] || 'Pluher';
  const appId = `${programType}_${user.uid}_${Date.now()}`;

  await setDoc(doc(db, 'program_applications', appId), {
    appId,
    uid: user.uid,
    username,
    displayName: user.displayName || username,
    avatar: user.photoURL || user.avatarUrl || '',
    programType, // 'curator' (evaluator) or 'creator' (game maker)
    reason: (reason || '').trim(),
    favoriteGames: (favoriteGames || '').trim(),
    experience: (experience || '').trim(),
    status: 'pending',
    createdAt: serverTimestamp(),
    createdAtIso: new Date().toISOString()
  });

  return true;
}

/**
 * Fetch pending applications (Owner only)
 */
export async function fetchProgramApplications() {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'program_applications'));
    const apps = [];
    snap.forEach(d => {
      apps.push({ id: d.id, ...d.data() });
    });
    return apps.sort((a,b) => (b.createdAtIso || '').localeCompare(a.createdAtIso || ''));
  } catch(e) {
    return [];
  }
}

/**
 * Approve application (Owner only)
 */
export async function approveProgramApplication(app) {
  const db = getDb();
  if (!db) throw new Error('Database unavailable');

  await addProgramMember(app.programType, {
    uid: app.uid,
    username: app.username,
    displayName: app.displayName
  });

  await updateDoc(doc(db, 'program_applications', app.id || app.appId), {
    status: 'approved',
    reviewedAt: serverTimestamp()
  });

  return true;
}

/**
 * Reject application (Owner only)
 */
export async function rejectProgramApplication(appId) {
  const db = getDb();
  if (!db) throw new Error('Database unavailable');
  await updateDoc(doc(db, 'program_applications', appId), {
    status: 'rejected',
    reviewedAt: serverTimestamp()
  });
  return true;
}

// ============================================================================
// OWNER NOTIFICATIONS SYSTEM (SELECTIVE FOR CREATOR PROGRAM RELEASES)
// ============================================================================

/**
 * Fetch notifications for owner (releases from Creator Program members)
 */
export async function fetchOwnerNotifications() {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'owner_notifications'));
    const notifs = [];
    snap.forEach(d => {
      notifs.push({ id: d.id, ...d.data() });
    });
    return notifs.sort((a,b) => (b.createdAtIso || '').localeCompare(a.createdAtIso || ''));
  } catch(e) {
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notifId) {
  const db = getDb();
  if (!db || !notifId) return;
  try {
    await updateDoc(doc(db, 'owner_notifications', notifId), { read: true });
  } catch(e) {}
}

/**
 * Clear all owner notifications
 */
export async function clearAllNotifications() {
  const db = getDb();
  if (!db) return;
  try {
    const snap = await getDocs(collection(db, 'owner_notifications'));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch(e) {}
}

/**
 * Export a community game as a formatted code snippet for games-data.js / games-manifest.json.
 */
export function generateManifestSnippet(game) {
  const cleanCategorySlug = (game.category || 'arcade').toLowerCase();
  const obj = {
    id: `community_${game.id}`,
    slug: `community_${game.id}`,
    url: `game.html?community=${game.id}`,
    title: game.title,
    category: `${(game.category || 'Community').toUpperCase()} • Community`,
    categorySlug: cleanCategorySlug,
    categories: [cleanCategorySlug, 'community'],
    rating: game.stars ? Math.min(5, (4.5 + (game.stars * 0.05))).toFixed(1) : '4.9',
    plays: `${(game.views || 100).toLocaleString()}`,
    tags: Array.isArray(game.tags) ? [...game.tags, 'Community', 'PluhCommunity'] : ['Community'],
    desc: game.description || 'Community creation on PluhMath.',
    howToPlay: game.howToPlay || 'Enjoy this community created game on PluhMath!',
    controls: game.controls || [{ key: 'Mouse / Keyboard', desc: 'Interact' }],
    icon: game.icon || '🌟',
    badge: 'COMMUNITY PICK',
    badgeColor: 'rgba(245, 158, 11, 0.95)',
    thumbnail: game.thumbnail || '',
    bgGradient: game.bgGradient || 'linear-gradient(135deg, #0f172a, #1e1b4b)'
  };

  return JSON.stringify(obj, null, 2);
}

// ============================================================================
// IMAGE COMPRESSION HELPER (RULE 11 COMPLIANT - ZERO URL TYPING)
// Compresses user-uploaded image files client-side into clean DataURLs (max 256KB)
// ============================================================================

export function processImageFile(file, maxWidth = 512, maxHeight = 320, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      return reject(new Error('Please select a valid image file (PNG, JPG, WebP, etc.).'));
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate aspect ratio downscale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image file.'));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// UI RENDERING: GAME CARDS & COMMUNITY GRID
// ============================================================================

export function renderCommunityGameCard(game, options = {}) {
  const isStarred = isGameStarred(game.id);
  const stars = game.stars || 0;
  const views = game.views || 0;
  const author = escapeHtml(game.authorName || 'Pluher');
  const title = escapeHtml(game.title || 'Untitled Game');
  const cat = escapeHtml((game.category || 'Arcade').toUpperCase());
  const isPromoted = game.promoted === true;
  const isCreatorGame = game.isCreatorGame === true;

  const playUrl = `game.html?community=${encodeURIComponent(game.id)}`;
  const authorAvatar = game.authorAvatar 
    ? `<img src="${game.authorAvatar}" class="pm-comm-author-pfp" alt="${author}" onerror="this.style.display='none'">`
    : `<span class="pm-comm-author-icon">👤</span>`;

  return `
    <div class="cm-tile pm-comm-card ${isPromoted ? 'pm-comm-promoted' : ''}" data-game-id="${escapeHtml(game.id)}">
      <div class="cm-tile-thumb-container">
        <div style="position:absolute; top:8px; left:8px; display:flex; gap:4px; z-index:2; flex-wrap:wrap;">
          <span class="cm-tile-badge ${isPromoted ? 'pm-badge-promoted' : 'pm-badge-comm'}">
            ${isPromoted ? '👑 COMMUNITY PICK' : '🌟 COMMUNITY'}
          </span>
          ${isCreatorGame ? `<span class="cm-tile-badge pm-badge-creator" title="Creator Program Release">🚀 CREATOR</span>` : ''}
        </div>

        ${game.thumbnail 
          ? `<img class="cm-tile-thumb" src="${game.thumbnail}" alt="${title}" onerror="this.parentElement.innerHTML='<div class=\\'cm-tile-graphic\\' style=\\'background:${game.bgGradient}\\'>${game.icon || '🎮'}</div>'" />`
          : `<div class="cm-tile-graphic" style="background:${game.bgGradient || 'linear-gradient(135deg, #101626, #1e293b)'}">${game.icon || '🎮'}</div>`
        }

        <a href="${playUrl}" class="cm-tile-play-overlay" title="Play ${title}">
          <div class="cm-play-circle">▶</div>
        </a>
      </div>

      <div class="cm-tile-info">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
          <div class="cm-tile-title" style="flex:1; min-width:0;">
            <a href="${playUrl}" style="color:inherit; text-decoration:none;">${title}</a>
          </div>
          <button type="button" class="pm-comm-star-btn ${isStarred ? 'starred' : ''}" onclick="window.PluhCommunity.handleStarClick('${game.id}', this)" title="Star this creation">
            <span>⭐</span>
            <span class="star-num">${stars}</span>
          </button>
        </div>

        <div class="pm-comm-author-bar">
          <div style="display:flex; align-items:center; gap:6px; min-width:0;">
            ${authorAvatar}
            <span class="pm-comm-author-name">@${author}</span>
            ${isCreatorGame ? `<span style="color:#10b981; font-size:0.7rem;" title="Verified Creator">✓</span>` : ''}
          </div>
          <span class="pm-comm-views">👁️ ${views}</span>
        </div>

        ${game.curatedBy ? `
          <div style="font-size:0.72rem; color:#fbbf24; font-weight:700; margin-top:4px;">
            ⭐ Curated by @${escapeHtml(game.curatedBy)}
          </div>
        ` : ''}

        <div class="cm-tile-meta" style="margin-top:6px;">
          <span>${cat}</span>
          ${isPromoted ? `<span style="color:var(--accent-yellow); font-weight:700;">★ TOP PICK</span>` : `<span>★ 4.9</span>`}
        </div>

        ${Boolean(options.isCurator || isOwner()) ? `
          <div class="pm-comm-admin-bar">
            <button type="button" class="cm-btn cm-btn-yellow" style="padding:4px 8px; font-size:0.72rem; width:100%; font-weight:800;" onclick="window.PluhCommunity.handlePromoteClick('${game.id}', this)">
              ${isPromoted ? '⭐ Remove from Main' : '🌟 Promote to Main'}
            </button>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// ============================================================================
// CREATOR STUDIO: PUBLISHER MODAL
// ============================================================================

export function ensurePublisherModal() {
  if (document.getElementById('pm-community-publisher-modal')) return;

  const modalHtml = `
    <div class="crimx-modal-backdrop cm-modal-overlay" id="pm-community-publisher-modal" style="display:none;">
      <div class="crimx-modal-box cm-modal-card pm-publisher-modal" style="max-width: 680px; max-height: 90vh; overflow-y: auto;">
        
        <div class="crimx-modal-header">
          <div class="crimx-modal-title">
            <span style="font-size:1.4rem;">🚀</span>
            <div>
              <div style="font-size:1.15rem; font-weight:800; font-family:'Outfit', sans-serif;">PluhCommunity Creator Studio</div>
              <div style="font-size:0.75rem; color:var(--text-dim);">Publish your web game to the PluhMath community</div>
            </div>
          </div>
          <button class="crimx-modal-close" onclick="window.PluhCommunity.closePublisherModal()">×</button>
        </div>

        <form id="pm-publish-form" onsubmit="window.PluhCommunity.handleFormSubmit(event)" style="display:flex; flex-direction:column; gap:1.1rem; padding-top:0.5rem;">
          
          <!-- Game Title -->
          <div class="crimx-field">
            <label class="crimx-label">Game Title *</label>
            <input type="text" id="pub-title" class="crimx-input" placeholder="e.g. Space Odyssey, Flappy Pluh..." required maxlength="60">
          </div>

          <!-- Category & Icon -->
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.9rem;">
            <div class="crimx-field">
              <label class="crimx-label">Category *</label>
              <select id="pub-category" class="crimx-input">
                <option value="arcade">Arcade & Casual</option>
                <option value="action">Action & Combat</option>
                <option value="rpg">RPG & Story</option>
                <option value="runner">Runner & Rhythm</option>
                <option value="puzzle">Puzzle & Logic</option>
                <option value="strategy">Strategy & Skill</option>
                <option value="3d">3D & FPS</option>
              </select>
            </div>
            <div class="crimx-field">
              <label class="crimx-label">Emoji Icon</label>
              <select id="pub-icon" class="crimx-input">
                <option value="🎮">🎮 Gamepad</option>
                <option value="👾">👾 Alien Monster</option>
                <option value="🚀">🚀 Rocket</option>
                <option value="⚔️">⚔️ Swords</option>
                <option value="🏎️">🏎️ Racecar</option>
                <option value="🧩">🧩 Puzzle</option>
                <option value="🎲">🎲 Dice</option>
                <option value="⚡">⚡ Lightning</option>
                <option value="🔥">🔥 Flame</option>
                <option value="🌟">🌟 Star</option>
              </select>
            </div>
          </div>

          <!-- Description -->
          <div class="crimx-field">
            <label class="crimx-label">About the Game / Description</label>
            <textarea id="pub-desc" class="crimx-input" rows="2" placeholder="Tell players what makes your game exciting..." maxlength="400"></textarea>
          </div>

          <!-- Thumbnail Image Upload (RULE 11: FILE PICKER, NEVER URL TYPING) -->
          <div class="crimx-field">
            <label class="crimx-label">Game Thumbnail (File Upload)</label>
            <div class="pm-file-dropzone" id="pub-dropzone" onclick="document.getElementById('pub-thumb-file').click()">
              <input type="file" id="pub-thumb-file" accept="image/*" style="display:none;" onchange="window.PluhCommunity.handleThumbnailPicked(event)">
              <div id="pub-thumb-preview-container" style="display:none; margin-bottom:0.6rem;">
                <img id="pub-thumb-preview-img" src="" alt="Thumbnail preview" style="max-width:240px; max-height:140px; border-radius:8px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
                <div style="font-size:0.75rem; color:var(--accent-cyan); margin-top:4px;">Click to change image</div>
              </div>
              <div id="pub-thumb-empty-prompt">
                <div style="font-size:2rem; margin-bottom:0.4rem;">🖼️</div>
                <div style="font-weight:700; color:#fff; font-size:0.9rem;">Click or Drag & Drop to Upload Thumbnail</div>
                <div style="font-size:0.75rem; color:var(--text-dim); margin-top:2px;">PNG, JPG, or WebP. Automatically resized & optimized.</div>
              </div>
            </div>
          </div>

          <!-- Source Type (Web Link vs HTML5 Single-File Code) -->
          <div class="crimx-field">
            <label class="crimx-label">Game Source Format *</label>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <label style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); cursor:pointer; font-size:0.85rem; color:#fff;">
                <input type="radio" name="sourceType" value="url" checked onchange="window.PluhCommunity.switchSourceType('url')">
                <span>🌐 Web Link (HTTPS URL)</span>
              </label>
              <label style="display:flex; align-items:center; gap:8px; padding:10px; border-radius:10px; background:rgba(255,255,255,0.03); border:1px solid var(--border-glass); cursor:pointer; font-size:0.85rem; color:#fff;">
                <input type="radio" name="sourceType" value="html" onchange="window.PluhCommunity.switchSourceType('html')">
                <span>📄 HTML5 File / Code</span>
              </label>
            </div>
          </div>

          <!-- URL Input Box -->
          <div id="pub-source-url-box" class="crimx-field">
            <label class="crimx-label">Game Web Embed URL *</label>
            <input type="url" id="pub-url" class="crimx-input" placeholder="https://example.com/game or https://user.github.io/game">
            <div style="font-size:0.72rem; color:var(--text-dim); margin-top:2px;">Must be a valid HTTPS link that allows iframe embedding.</div>
          </div>

          <!-- HTML Code Upload Box -->
          <div id="pub-source-html-box" class="crimx-field" style="display:none; flex-direction:column; gap:0.6rem;">
            <label class="crimx-label">Upload .html File or Paste Single-File Game Code *</label>
            <input type="file" id="pub-html-file" accept=".html,.htm" style="display:none;" onchange="window.PluhCommunity.handleHtmlFilePicked(event)">
            <div style="display:flex; gap:0.6rem;">
              <button type="button" class="cm-btn cm-btn-blue" style="font-size:0.8rem; padding:6px 12px;" onclick="document.getElementById('pub-html-file').click()">
                📁 Pick .HTML File
              </button>
              <span id="pub-html-filename" style="font-size:0.8rem; color:var(--text-dim); align-self:center;">No file chosen</span>
            </div>
            <textarea id="pub-html-code" class="crimx-input" rows="4" placeholder="Or paste <!DOCTYPE html> ... code here..." style="font-family:'JetBrains Mono', monospace; font-size:0.78rem;"></textarea>
          </div>

          <!-- How to Play & Controls -->
          <div class="crimx-field">
            <label class="crimx-label">How to Play & Controls (Optional)</label>
            <textarea id="pub-how-to-play" class="crimx-input" rows="2" placeholder="e.g. Arrow keys or WASD to move, Space to jump..."></textarea>
          </div>

          <!-- Submit Buttons -->
          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-subtle); padding-top:1rem; margin-top:0.5rem;">
            <button type="button" class="cm-btn cm-btn-blue" onclick="window.PluhCommunity.testRunCurrentDraft()" title="Test play your game in a sandbox before publishing">
              🧪 Test Play Draft
            </button>
            <div style="display:flex; gap:0.6rem;">
              <button type="button" class="cm-btn cm-btn-blue" onclick="window.PluhCommunity.closePublisherModal()">Cancel</button>
              <button type="submit" id="pub-submit-btn" class="cm-btn cm-btn-yellow" style="font-weight:800; padding:0.7rem 1.6rem;">
                🚀 Publish Game
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>

    <!-- Test Sandbox Modal -->
    <div class="crimx-modal-backdrop cm-modal-overlay" id="pm-sandbox-modal" style="display:none;">
      <div class="crimx-modal-box cm-modal-card" style="width:90vw; max-width:860px; height:80vh; display:flex; flex-direction:column; padding:0;">
        <div style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.5); border-bottom:1px solid var(--border-glass);">
          <div style="font-weight:700; color:#fff; font-size:0.9rem;">🧪 Sandbox Game Preview</div>
          <button class="crimx-modal-close" onclick="const m=document.getElementById('pm-sandbox-modal'); if(m){m.style.display='none';m.classList.remove('active');}">×</button>
        </div>
        <iframe id="pm-sandbox-iframe" style="flex:1; width:100%; height:100%; border:none; background:#000;" allow="autoplay; fullscreen; gamepad; pointer-lock"></iframe>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// ============================================================================
// MODAL CONTROLLER & EVENT HANDLERS
// ============================================================================

let currentUploadedThumbnail = '';

export function openPublisherModal() {
  const user = getCurrentUser();
  if (!user) {
    if (window.openCrimXModal) {
      window.openCrimXModal();
      showToast('Please sign in to publish your community game!', 'info');
    } else {
      alert('Please sign in to publish your community game!');
    }
    return;
  }

  ensurePublisherModal();
  const modal = document.getElementById('pm-community-publisher-modal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

export function closePublisherModal() {
  const modal = document.getElementById('pm-community-publisher-modal');
  if (modal) {
    modal.style.display = 'none';
    modal.classList.remove('active');
  }
}

export function switchSourceType(type) {
  const urlBox = document.getElementById('pub-source-url-box');
  const htmlBox = document.getElementById('pub-source-html-box');
  if (type === 'url') {
    if (urlBox) urlBox.style.display = 'block';
    if (htmlBox) htmlBox.style.display = 'none';
  } else {
    if (urlBox) urlBox.style.display = 'none';
    if (htmlBox) htmlBox.style.display = 'flex';
  }
}

export async function handleThumbnailPicked(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  try {
    const dataUrl = await processImageFile(file, 512, 320, 0.82);
    currentUploadedThumbnail = dataUrl;

    const img = document.getElementById('pub-thumb-preview-img');
    const container = document.getElementById('pub-thumb-preview-container');
    const emptyPrompt = document.getElementById('pub-thumb-empty-prompt');

    if (img && container && emptyPrompt) {
      img.src = dataUrl;
      container.style.display = 'block';
      emptyPrompt.style.display = 'none';
    }
  } catch (err) {
    showToast(err.message, 'error');
  }
}

export function handleHtmlFilePicked(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const nameEl = document.getElementById('pub-html-file-name');
  if (nameEl) nameEl.textContent = `✓ ${file.name}`;

  const reader = new FileReader();
  reader.onload = (e) => {
    const codeArea = document.getElementById('pub-html-code');
    if (codeArea) codeArea.value = e.target.result;
  };
  reader.readAsText(file);
}

export function testRunInSandbox() {
  const sourceType = document.querySelector('input[name="gameSourceType"]:checked')?.value || 'url';
  const iframe = document.getElementById('pm-sandbox-iframe');
  const modal = document.getElementById('pm-sandbox-modal');
  if (!iframe || !modal) return;

  if (sourceType === 'url') {
    const url = (document.getElementById('pub-game-url')?.value || '').trim();
    if (!url) {
      showToast('Please provide a game link to test.', 'error');
      return;
    }
    iframe.srcdoc = '';
    iframe.src = url;
  } else {
    const code = document.getElementById('pub-html-code')?.value || '';
    if (!code.trim()) {
      showToast('Please enter or upload HTML5 game code to test.', 'error');
      return;
    }
    iframe.removeAttribute('src');
    iframe.srcdoc = code;
  }

  modal.classList.add('active');
}

export async function handleFormSubmit(event) {
  event.preventDefault();
  const submitBtn = document.getElementById('pub-submit-btn');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publishing...';
  }

  try {
    const title = document.getElementById('pub-title').value;
    const category = document.getElementById('pub-category').value;
    const icon = document.getElementById('pub-icon').value;
    const desc = document.getElementById('pub-desc').value;
    const controlsRaw = document.getElementById('pub-controls').value;
    const sourceType = document.querySelector('input[name="gameSourceType"]:checked')?.value || 'url';
    const gameUrl = document.getElementById('pub-game-url')?.value || '';
    const htmlContent = document.getElementById('pub-html-code')?.value || '';

    // Parse controls
    const controls = controlsRaw.split('|').map(item => {
      const parts = item.split(':');
      if (parts.length >= 2) {
        return { key: parts[0].trim(), desc: parts.slice(1).join(':').trim() };
      }
      return { key: 'Action', desc: item.trim() };
    }).filter(c => c.desc);

    const gradients = [
      'linear-gradient(135deg, #1e1b4b, #312e81)',
      'linear-gradient(135deg, #0f172a, #1e293b)',
      'linear-gradient(135deg, #1f2937, #374151)',
      'linear-gradient(135deg, #14532d, #166534)',
      'linear-gradient(135deg, #701a75, #86198f)',
      'linear-gradient(135deg, #7c2d12, #9a3412)'
    ];
    const bgGradient = gradients[Math.floor(Math.random() * gradients.length)];

    const game = await publishCommunityGame({
      title,
      category,
      icon,
      description: desc,
      gameSourceType: sourceType,
      gameUrl,
      htmlContent,
      thumbnail: currentUploadedThumbnail,
      bgGradient,
      controls: controls.length > 0 ? controls : [{ key: 'Mouse & Keyboard', desc: 'Interact' }],
      howToPlay: 'Use standard keyboard and mouse controls to play.'
    });

    showToast(`🎉 "${game.title}" published to PluhCommunity!`, 'success');
    closePublisherModal();

    // Reset form
    document.getElementById('pm-publish-form').reset();
    currentUploadedThumbnail = '';
    const preview = document.getElementById('pub-thumb-preview-container');
    const emptyPrompt = document.getElementById('pub-thumb-empty-prompt');
    if (preview) preview.style.display = 'none';
    if (emptyPrompt) emptyPrompt.style.display = 'block';

    // Broadcast reload event
    window.dispatchEvent(new CustomEvent('pluhcommunity-games-updated'));

    // If on community.html, refresh list
    if (window.PluhCommunity && typeof window.PluhCommunity.reloadFeed === 'function') {
      window.PluhCommunity.reloadFeed();
    }
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '🚀 Publish Game';
    }
  }
}

export async function handleStarClick(gameId, btnEl) {
  const newStarred = await toggleStarCommunityGame(gameId);
  if (btnEl) {
    btnEl.classList.toggle('starred', newStarred);
    const numEl = btnEl.querySelector('.star-num');
    if (numEl) {
      let cur = parseInt(numEl.textContent || '0', 10);
      numEl.textContent = newStarred ? cur + 1 : Math.max(0, cur - 1);
    }
  }
}

export async function handlePromoteClick(gameId, btnEl) {
  try {
    const isPromoted = await togglePromoteToCatalog(gameId);
    showToast(isPromoted ? '🌟 Promoted to Main PluhMath Catalogue!' : 'Removed from Main Catalogue', 'success');
    if (btnEl) {
      btnEl.textContent = isPromoted ? '⭐ Remove from Main' : '🌟 Promote to Main';
    }
    window.dispatchEvent(new CustomEvent('pluhcommunity-games-updated'));
  } catch (err) {
    showToast(err.message, 'error');
  }
}

// Global namespace bindings
window.PluhCommunity = {
  fetchCommunityGames,
  fetchCommunityGameById,
  publishCommunityGame,
  updateCommunityGame,
  deleteCommunityGame,
  toggleStarCommunityGame,
  isGameStarred,
  incrementGamePlayCount,
  togglePromoteToCatalog,
  generateManifestSnippet,
  processImageFile,
  renderCommunityGameCard,
  openPublisherModal,
  closePublisherModal,
  switchSourceType,
  handleThumbnailPicked,
  handleHtmlFilePicked,
  testRunInSandbox,
  handleFormSubmit,
  handleStarClick,
  handlePromoteClick,
  // Curator & Creator Programs
  isUserCurator,
  isUserCreator,
  isOwner,
  setOwnerMode,
  addProgramMember,
  removeProgramMember,
  fetchProgramMembers,
  submitProgramApplication,
  fetchProgramApplications,
  approveProgramApplication,
  rejectProgramApplication,
  // Owner Notifications
  fetchOwnerNotifications,
  markNotificationRead,
  clearAllNotifications
};
