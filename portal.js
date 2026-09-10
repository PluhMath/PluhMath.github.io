// PluhMath - Game Library & Interactive Portal Engine

const GAMES_DATA = [
  {
    id: 'pluhshooter',
    title: 'PluhShooter.io',
    category: '3d',
    tags: ['3D', 'FPS', 'Bots', 'Zombies', 'Multiplayer'],
    badges: [{ text: '3D Voxel', class: 'badge-3d' }, { text: 'Hot', class: 'badge-hot' }],
    desc: 'Fast-paced 3D voxel first-person shooter! Fight bots or players in FFA, Team Deathmatch, or survive waves of Zombies.',
    path: 'games/PluhShooter.io/index.html',
    icon: '🔫',
    bgGradient: 'linear-gradient(135deg, #0f172a, #1e1b4b)'
  },
  {
    id: 'run3',
    title: 'Run 3',
    category: 'runner',
    tags: ['Runner', '3D', 'Space', 'Classic', 'Alien'],
    badges: [{ text: 'Legendary', class: 'badge-classic' }, { text: '3D', class: 'badge-3d' }],
    desc: 'The legendary galaxy runner! Sprint, jump, and rotate through floating space tunnels with unlockable alien characters.',
    path: 'games/Run3/index.html',
    image: 'games/Run3/img/menu/Run3.png',
    icon: '🏃‍♂️',
    bgGradient: 'linear-gradient(135deg, #0c1222, #1e293b)'
  },
  {
    id: 'tcor',
    title: 'The Chronicles of Restrictia',
    category: 'action',
    tags: ['3D', 'Cyberpunk', 'BabylonJS', 'FPS', 'Adventure'],
    badges: [{ text: '3D RPG', class: 'badge-3d' }, { text: 'Definitive', class: 'badge-hot' }],
    desc: 'Immersive 3D dystopian cyberpunk adventure powered by Babylon.js with real-time lighting, interactive dialogue, and exploration.',
    path: 'games/TCOR/index.html',
    icon: '🤖',
    bgGradient: 'linear-gradient(135deg, #18181b, #2e1065)'
  },
  {
    id: 'geometry-dash',
    title: 'Geometry Dash Subzero',
    category: 'runner',
    tags: ['Rhythm', 'Platformer', 'Neon', 'Music', 'Hard'],
    badges: [{ text: 'Rhythm', class: 'badge-rhythm' }, { text: 'Popular', class: 'badge-hot' }],
    desc: 'Jump, fly, and flip your way through neon subzero obstacles synced to energetic electronic beats in this upgraded web port.',
    path: 'Scratch/GeometryDashSubzeroPLM/index.html',
    icon: '⚡',
    bgGradient: 'linear-gradient(135deg, #042f2e, #0f766e)'
  },
  {
    id: 'pluhus',
    title: 'PluhUs: Browser Edition',
    category: 'casual',
    tags: ['Among Us', 'Impostor', 'Sabotage', '2D', 'Crew'],
    badges: [{ text: 'Popular', class: 'badge-hot' }],
    desc: 'Custom 2D Among Us browser game with impostor sabotages, door lockdowns, emergency meetings, vents, and sneaky kills.',
    path: 'games/PluhUs/index.html',
    image: 'games/PluhUs/Stand_mogus.png',
    icon: '🚀',
    bgGradient: 'linear-gradient(135deg, #450a0a, #7f1d1d)'
  },
  {
    id: 'drift-boss',
    title: 'Drift Boss',
    category: 'arcade',
    tags: ['Drift', 'Car', 'Arcade', 'High Score', 'Casual'],
    badges: [{ text: 'Arcade', class: 'badge-classic' }],
    desc: 'One-click endless 3D car drifting! Time your drifts perfectly around tight curves and collect coins to unlock new rides.',
    path: 'games/drift-boss/index.html',
    image: 'https://738501629-461082748261058427.preview.editmysite.com/uploads/b/139890129-817510652323129407/files/media/graphics/splash/mobile/cover-start.jpg',
    icon: '🏎️',
    bgGradient: 'linear-gradient(135deg, #1c1917, #44403c)'
  },
  {
    id: 'baseball',
    title: 'Google Doodle Baseball',
    category: 'arcade',
    tags: ['Baseball', 'Sports', 'Arcade', 'Google Doodle', 'Fun'],
    badges: [{ text: 'Classic', class: 'badge-classic' }],
    desc: "Step up to the plate in Google's iconic 4th of July baseball showdown. Hit grand slams with delicious summer ballpark sluggers!",
    path: 'games/DoodleBaseball.html',
    image: 'style.css',
    icon: '⚾',
    bgGradient: 'linear-gradient(135deg, #2e1065, #701a75)'
  }
];

// Cloaking presets
const CLOAK_PRESETS = {
  default: {
    title: 'PluhMath — Unblocked Arcade & Math Games',
    favicon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%2300f0ff"/><text x="50%" y="68%" text-anchor="middle" font-size="60" font-family="sans-serif" font-weight="bold" fill="%23000">∑</text></svg>'
  },
  classroom: {
    title: 'Classes',
    favicon: 'https://ssl.gstatic.com/classroom/favicon.png'
  },
  drive: {
    title: 'My Drive - Google Drive',
    favicon: 'https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png'
  },
  docs: {
    title: 'Google Docs',
    favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico'
  },
  desmos: {
    title: 'Desmos | Graphing Calculator',
    favicon: 'https://www.desmos.com/favicon.ico'
  },
  canvas: {
    title: 'Dashboard',
    favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico'
  }
};

// State
let activeCategory = 'all';
let searchQuery = '';
let favorites = JSON.parse(localStorage.getItem('pluhmath_favorites') || '[]');
let currentCloak = localStorage.getItem('pluhmath_cloak') || 'default';
let activeGame = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  applyCloak(currentCloak);
  setupEventListeners();
  renderGames();
  setupFeaturedSpotlight();
});

// Render Games Grid
function renderGames() {
  const grid = document.getElementById('games-grid');
  const emptyState = document.getElementById('empty-state');
  const countLabel = document.getElementById('games-count');

  const filtered = GAMES_DATA.filter(game => {
    // Category filter
    if (activeCategory === 'favorites') {
      if (!favorites.includes(game.id)) return false;
    } else if (activeCategory !== 'all' && game.category !== activeCategory) {
      return false;
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = game.title.toLowerCase().includes(q);
      const matchTags = game.tags.some(t => t.toLowerCase().includes(q));
      const matchDesc = game.desc.toLowerCase().includes(q);
      if (!matchTitle && !matchTags && !matchDesc) return false;
    }

    return true;
  });

  countLabel.textContent = `Showing ${filtered.length} game${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    grid.innerHTML = '';
    emptyState.classList.add('active');
    return;
  }

  emptyState.classList.remove('active');
  grid.innerHTML = filtered.map(game => {
    const isFav = favorites.includes(game.id);
    const badgesHtml = (game.badges || []).map(b => `<span class="badge ${b.class}">${b.text}</span>`).join('');

    const thumbnailHtml = game.image 
      ? `<img class="card-thumbnail" src="${game.image}" alt="${game.title}" onerror="this.onerror=null; this.parentElement.innerHTML='<div class=\\'thumbnail-graphic\\' style=\\'background: ${game.bgGradient}\\'> <span class=\\'graphic-icon\\'>${game.icon}</span> </div>';" />`
      : `<div class="thumbnail-graphic" style="background: ${game.bgGradient}">
          <span class="graphic-icon">${game.icon}</span>
        </div>`;

    return `
      <article class="game-card" onclick="openTheater('${game.id}')" data-game-id="${game.id}">
        <div class="card-thumbnail-container">
          <div class="card-badges">${badgesHtml}</div>
          <button class="fav-btn ${isFav ? 'is-fav' : ''}" onclick="event.stopPropagation(); toggleFavorite('${game.id}')" title="${isFav ? 'Remove from favorites' : 'Add to favorites'}">
            ★
          </button>
          ${thumbnailHtml}
        </div>
        <div class="card-info">
          <div class="card-header-row">
            <h3 class="card-title">${game.title}</h3>
            <span class="card-category">${game.category}</span>
          </div>
          <p class="card-desc">${game.desc}</p>
          <div class="card-footer">
            <span class="play-prompt">PLAY NOW ➔</span>
            <span style="font-size:0.75rem; color:var(--text-sub);">Unblocked</span>
          </div>
        </div>
      </article>
    `;
  }).join('');
}

// Featured Spotlight Setup
function setupFeaturedSpotlight() {
  const featured = GAMES_DATA.find(g => g.id === 'pluhshooter') || GAMES_DATA[0];
  const title = document.getElementById('featured-title');
  const desc = document.getElementById('featured-desc');
  const playBtn = document.getElementById('featured-play-btn');

  if (title) title.textContent = featured.title;
  if (desc) desc.textContent = featured.desc;
  if (playBtn) {
    playBtn.onclick = () => openTheater(featured.id);
  }
}

// Open Game Theater
function openTheater(gameId) {
  const game = GAMES_DATA.find(g => g.id === gameId);
  if (!game) return;

  activeGame = game;
  const modal = document.getElementById('theater-modal');
  const frame = document.getElementById('theater-iframe');
  const title = document.getElementById('theater-game-title');
  const favBtn = document.getElementById('theater-fav-btn');

  title.textContent = game.title;
  frame.src = game.path;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';

  if (favBtn) {
    favBtn.className = `btn btn-secondary ${favorites.includes(game.id) ? 'active' : ''}`;
    favBtn.innerHTML = `★ ${favorites.includes(game.id) ? 'Favorited' : 'Favorite'}`;
  }
}

// Close Game Theater
function closeTheater() {
  const modal = document.getElementById('theater-modal');
  const frame = document.getElementById('theater-iframe');
  modal.classList.remove('active');
  frame.src = 'about:blank';
  document.body.style.overflow = '';
  activeGame = null;
}

// Reload Current Theater Game
function reloadTheater() {
  const frame = document.getElementById('theater-iframe');
  if (activeGame && frame) {
    frame.src = activeGame.path;
  }
}

// Fullscreen Toggle for Game Theater
function toggleTheaterFullscreen() {
  const container = document.getElementById('theater-frame-container');
  if (!document.fullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen();
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  }
}

// Open in New Tab
function openInNewTab() {
  if (activeGame) {
    window.open(activeGame.path, '_blank');
  }
}

// Toggle Favorites
function toggleFavorite(gameId) {
  const index = favorites.indexOf(gameId);
  if (index >= 0) {
    favorites.splice(index, 1);
  } else {
    favorites.push(gameId);
  }
  localStorage.setItem('pluhmath_favorites', JSON.stringify(favorites));
  renderGames();

  // Also update theater button if open
  if (activeGame && activeGame.id === gameId) {
    const favBtn = document.getElementById('theater-fav-btn');
    if (favBtn) {
      favBtn.className = `btn btn-secondary ${favorites.includes(gameId) ? 'active' : ''}`;
      favBtn.innerHTML = `★ ${favorites.includes(gameId) ? 'Favorited' : 'Favorite'}`;
    }
  }
}

// Tab Cloak
function applyCloak(key) {
  const preset = CLOAK_PRESETS[key] || CLOAK_PRESETS.default;
  currentCloak = key;
  localStorage.setItem('pluhmath_cloak', key);

  document.title = preset.title;

  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.getElementsByTagName('head')[0].appendChild(link);
  }
  link.href = preset.favicon;

  // Update cloak UI buttons if modal is open
  document.querySelectorAll('.cloak-option-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.cloak === key);
  });
}

// Panic Function (Teacher is coming!)
function triggerPanic() {
  // Rapid stealth redirect
  window.location.replace('https://classroom.google.com');
}

// Setup Event Listeners
function setupEventListeners() {
  // Category filter pills
  document.querySelectorAll('.pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.dataset.category;
      renderGames();
    });
  });

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim();
      renderGames();
    });
  }

  // Keyboard shortcut '/' to search & ']' for Panic
  window.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== searchInput) {
      e.preventDefault();
      searchInput.focus();
    } else if (e.key === ']' || (e.key === 'Escape' && document.getElementById('theater-modal').classList.contains('active') === false)) {
      // Emergency Panic trigger
      triggerPanic();
    }
  });

  // Random Game button
  const randomBtn = document.getElementById('random-game-btn');
  if (randomBtn) {
    randomBtn.addEventListener('click', () => {
      const rand = GAMES_DATA[Math.floor(Math.random() * GAMES_DATA.length)];
      if (rand) openTheater(rand.id);
    });
  }

  // Settings / Tab Cloaker modal handlers
  const settingsOverlay = document.getElementById('settings-overlay');
  const cloakModalBtn = document.getElementById('cloak-modal-btn');
  const closeSettingsBtn = document.getElementById('close-settings-btn');

  if (cloakModalBtn) {
    cloakModalBtn.addEventListener('click', () => {
      settingsOverlay.classList.add('active');
    });
  }

  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', () => {
      settingsOverlay.classList.remove('active');
    });
  }

  if (settingsOverlay) {
    settingsOverlay.addEventListener('click', (e) => {
      if (e.target === settingsOverlay) settingsOverlay.classList.remove('active');
    });
  }

  document.querySelectorAll('.cloak-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyCloak(btn.dataset.cloak);
    });
  });

  // Panic button in header
  const panicBtn = document.getElementById('panic-btn');
  if (panicBtn) {
    panicBtn.addEventListener('click', triggerPanic);
  }
}
