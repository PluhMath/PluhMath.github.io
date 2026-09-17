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

  const docPayload = {
    title: cleanTitle,
    description: (gameData.description || '').trim(),
    category: gameData.category || 'arcade',
    tags: Array.isArray(gameData.tags) ? gameData.tags : (gameData.tags || '').split(',').map(t => t.trim()).filter(Boolean),
    authorUid: user.uid,
    authorName: authorName,
    authorAvatar: authorAvatar,
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
    status: 'published',
    createdAt: serverTimestamp(),
    createdAtIso: new Date().toISOString(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'community_games', docId), docPayload);
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
  if (!db) throw new Error('Database connection required');

  const cleanId = gameId.replace(/^community_/, '');
  const ref = doc(db, 'community_games', cleanId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('Game not found');

  const curPromoted = snap.data().promoted === true;
  const newPromoted = !curPromoted;

  await updateDoc(ref, { 
    promoted: newPromoted,
    promotedAt: newPromoted ? serverTimestamp() : null
  });

  return newPromoted;
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

  const playUrl = `game.html?community=${encodeURIComponent(game.id)}`;
  const authorAvatar = game.authorAvatar 
    ? `<img src="${game.authorAvatar}" class="pm-comm-author-pfp" alt="${author}" onerror="this.style.display='none'">`
    : `<span class="pm-comm-author-icon">👤</span>`;

  return `
    <div class="cm-tile pm-comm-card ${isPromoted ? 'pm-comm-promoted' : ''}" data-game-id="${escapeHtml(game.id)}">
      <div class="cm-tile-thumb-container">
        <span class="cm-tile-badge ${isPromoted ? 'pm-badge-promoted' : 'pm-badge-comm'}">
          ${isPromoted ? '👑 COMMUNITY PICK' : '🌟 COMMUNITY'}
        </span>

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
          </div>
          <span class="pm-comm-views">👁️ ${views}</span>
        </div>

        <div class="cm-tile-meta" style="margin-top:6px;">
          <span>${cat}</span>
          ${isPromoted ? `<span style="color:var(--accent-yellow); font-weight:700;">★ TOP PICK</span>` : `<span>★ 4.9</span>`}
        </div>

        ${options.showAdmin ? `
          <div class="pm-comm-admin-bar">
            <button type="button" class="cm-btn cm-btn-yellow" style="padding:4px 8px; font-size:0.72rem; width:100%;" onclick="window.PluhCommunity.handlePromoteClick('${game.id}', this)">
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
    <div class="crimx-modal-backdrop" id="pm-community-publisher-modal">
      <div class="crimx-modal-box pm-publisher-modal" style="max-width: 680px; max-height: 90vh; overflow-y: auto;">
        
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
              <input type="file" id="pub-thumb-file" accept="image/png, image/jpeg, image/webp, image/gif" style="display:none" onchange="window.PluhCommunity.handleThumbnailPicked(event)">
              <div id="pub-thumb-preview-container" style="display:none; width:100%; text-align:center;">
                <img id="pub-thumb-preview-img" style="max-height:160px; border-radius:10px; border:1px solid var(--border-glass); margin-bottom:8px;">
                <div style="font-size:0.75rem; color:var(--accent-cyan); font-weight:600;">✓ Image loaded • Click to replace</div>
              </div>
              <div id="pub-thumb-empty-prompt">
                <div style="font-size:2rem; margin-bottom:0.4rem;">🖼️</div>
                <div style="font-weight:700; color:#fff; font-size:0.9rem;">Click or drag to upload a picture</div>
                <div style="font-size:0.74rem; color:var(--text-dim); margin-top:2px;">PNG, JPG, WebP supported • Automatically optimized</div>
              </div>
            </div>
          </div>

          <!-- Game Source: URL or HTML File -->
          <div class="crimx-field">
            <label class="crimx-label">Game Source Format *</label>
            <div style="display:flex; gap:10px; margin-bottom:0.6rem;">
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.88rem; color:#fff;">
                <input type="radio" name="gameSourceType" value="url" checked onchange="window.PluhCommunity.switchSourceType('url')">
                <span>Playable Web Link (itch.io, GitHub, etc.)</span>
              </label>
              <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.88rem; color:#fff;">
                <input type="radio" name="gameSourceType" value="html" onchange="window.PluhCommunity.switchSourceType('html')">
                <span>Direct HTML5 File / Code</span>
              </label>
            </div>

            <!-- URL Input Box -->
            <div id="pub-source-url-box">
              <input type="url" id="pub-game-url" class="crimx-input" placeholder="https://yourname.github.io/mygame or itch.io embed URL">
              <div style="font-size:0.73rem; color:var(--text-dim); margin-top:4px;">Must be a direct playable HTTPS link.</div>
            </div>

            <!-- HTML5 File Upload Box -->
            <div id="pub-source-html-box" style="display:none; flex-direction:column; gap:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <button type="button" class="cm-btn cm-btn-blue" style="font-size:0.8rem; padding:6px 14px;" onclick="document.getElementById('pub-html-file').click()">
                  📂 Upload .html Game File
                </button>
                <input type="file" id="pub-html-file" accept=".html,.htm" style="display:none" onchange="window.PluhCommunity.handleHtmlFilePicked(event)">
                <span id="pub-html-file-name" style="font-size:0.75rem; color:var(--text-dim);">or paste code below:</span>
              </div>
              <textarea id="pub-html-code" class="crimx-input" rows="4" style="font-family:'JetBrains Mono', monospace; font-size:0.78rem;" placeholder="<!DOCTYPE html><html>..."></textarea>
            </div>
          </div>

          <!-- Controls Guide -->
          <div class="crimx-field">
            <label class="crimx-label">Key Controls (e.g. "WASD / Arrows to Move, Space to Jump")</label>
            <input type="text" id="pub-controls" class="crimx-input" placeholder="e.g. Arrows: Move | Space: Attack | Z: Confirm">
          </div>

          <!-- Submit and Test Actions -->
          <div style="display:flex; justify-content:space-between; align-items:center; gap:0.8rem; margin-top:0.6rem; padding-top:1rem; border-top:1px solid var(--border-subtle); flex-wrap:wrap;">
            <button type="button" class="cm-btn cm-btn-blue" onclick="window.PluhCommunity.testRunInSandbox()" style="font-size:0.86rem; padding:0.6rem 1.1rem;">
              🧪 Test Game Preview
            </button>
            <div style="display:flex; gap:0.6rem;">
              <button type="button" class="cm-btn cm-btn-blue" onclick="window.PluhCommunity.closePublisherModal()">
                Cancel
              </button>
              <button type="submit" id="pub-submit-btn" class="cm-btn cm-btn-yellow" style="font-weight:800; padding:0.6rem 1.6rem;">
                🚀 Publish Game
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>

    <!-- Test Sandbox Modal -->
    <div class="crimx-modal-backdrop" id="pm-sandbox-modal">
      <div class="crimx-modal-box" style="width:90vw; max-width:860px; height:80vh; display:flex; flex-direction:column; padding:0;">
        <div style="padding:12px 18px; display:flex; justify-content:space-between; align-items:center; background:rgba(0,0,0,0.5); border-bottom:1px solid var(--border-glass);">
          <div style="font-weight:700; color:#fff; font-size:0.9rem;">🧪 Sandbox Game Preview</div>
          <button class="crimx-modal-close" onclick="document.getElementById('pm-sandbox-modal').classList.remove('active')">×</button>
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
  if (modal) modal.classList.add('active');
}

export function closePublisherModal() {
  const modal = document.getElementById('pm-community-publisher-modal');
  if (modal) modal.classList.remove('active');
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
  handlePromoteClick
};
