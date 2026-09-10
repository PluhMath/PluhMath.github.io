// PluhMath - Dedicated Game Page Engine

document.addEventListener('DOMContentLoaded', () => {
  initGamePage();
  setupGlobalShortcuts();
});

function initGamePage() {
  // Determine game from page attribute or URL query
  const pageGameId = document.body.dataset.gameId || new URLSearchParams(window.location.search).get('id') || 'pluhshooter';
  const game = getGameById(pageGameId) || GAMES_DB[0];

  // Update Page Title and Meta if needed
  if (!document.title.includes(game.title)) {
    document.title = `${game.title} — Play Free Unblocked on PluhMath`;
  }

  // Populate dynamic game elements if they exist
  const frame = document.getElementById('game-iframe');
  if (frame && (!frame.src || frame.src.endsWith('about:blank') || frame.src === window.location.href)) {
    frame.src = game.gamePath;
  }

  // Populate details
  const titleEl = document.getElementById('game-title-el');
  if (titleEl) titleEl.textContent = game.title;

  const descEl = document.getElementById('game-desc-el');
  if (descEl) descEl.textContent = game.desc;

  const howToPlayEl = document.getElementById('game-howtoplay-el');
  if (howToPlayEl) howToPlayEl.textContent = game.howToPlay;

  // Populate Controls
  const controlsGrid = document.getElementById('controls-grid');
  if (controlsGrid && game.controls) {
    controlsGrid.innerHTML = game.controls.map(c => `
      <div class="cm-control-item">
        <span class="cm-key">${c.key}</span>
        <span style="font-size:0.9rem; color:var(--cm-text-light);">${c.desc}</span>
      </div>
    `).join('');
  }

  // Populate Related Games
  const relatedGrid = document.getElementById('related-games-grid');
  if (relatedGrid) {
    const others = GAMES_DB.filter(g => g.id !== game.id).slice(0, 4);
    relatedGrid.innerHTML = others.map(g => `
      <a href="${g.url}" class="cm-tile">
        <div class="cm-tile-thumb-container">
          <span class="cm-tile-badge" style="background:${g.badgeColor}">${g.badge}</span>
          ${g.thumbnail 
            ? `<img class="cm-tile-thumb" src="${g.thumbnail}" alt="${g.title}" onerror="this.parentElement.innerHTML='<div class=\\'cm-tile-graphic\\' style=\\'background:${g.bgGradient}\\'>${g.icon}</div>'" />`
            : `<div class="cm-tile-graphic" style="background:${g.bgGradient}">${g.icon}</div>`
          }
          <div class="cm-tile-play-overlay">
            <div class="cm-play-circle">▶</div>
          </div>
        </div>
        <div class="cm-tile-info">
          <div class="cm-tile-title">${g.title}</div>
          <div class="cm-tile-meta">
            <span>${g.category}</span>
            <span class="cm-tile-rating">★ ${g.rating}</span>
          </div>
        </div>
      </a>
    `).join('');
  }

  // Like / Dislike system
  setupRatingButtons(game.id);

  // Cloak state restore
  const savedCloak = localStorage.getItem('pluhmath_cloak');
  if (savedCloak && savedCloak !== 'default') {
    applyCloak(savedCloak);
  }
}

// Fullscreen
function toggleFullscreen() {
  const container = document.getElementById('game-frame-wrapper');
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

// Reload Game
function reloadGame() {
  const frame = document.getElementById('game-iframe');
  if (frame) {
    const current = frame.src;
    frame.src = 'about:blank';
    setTimeout(() => { frame.src = current; }, 50);
  }
}

// Pop out to new tab
function popoutGame() {
  const frame = document.getElementById('game-iframe');
  if (frame) {
    window.open(frame.src, '_blank');
  }
}

// Likes system
function setupRatingButtons(gameId) {
  const likeBtn = document.getElementById('like-btn');
  const dislikeBtn = document.getElementById('dislike-btn');
  const countEl = document.getElementById('like-count');

  const key = `pluhmath_rating_${gameId}`;
  let state = localStorage.getItem(key);

  let baseLikes = 1240;
  if (state === 'like') {
    if (likeBtn) likeBtn.style.color = '#00e676';
    baseLikes += 1;
  } else if (state === 'dislike') {
    if (dislikeBtn) dislikeBtn.style.color = '#ff3366';
  }

  if (countEl) countEl.textContent = `${baseLikes} Likes`;

  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      if (state === 'like') {
        localStorage.removeItem(key);
        likeBtn.style.color = '';
        state = null;
        if (countEl) countEl.textContent = `${baseLikes - 1} Likes`;
      } else {
        localStorage.setItem(key, 'like');
        likeBtn.style.color = '#00e676';
        if (dislikeBtn) dislikeBtn.style.color = '';
        state = 'like';
        if (countEl) countEl.textContent = `${baseLikes + 1} Likes`;
      }
    });
  }

  if (dislikeBtn) {
    dislikeBtn.addEventListener('click', () => {
      if (state === 'dislike') {
        localStorage.removeItem(key);
        dislikeBtn.style.color = '';
        state = null;
      } else {
        localStorage.setItem(key, 'dislike');
        dislikeBtn.style.color = '#ff3366';
        if (likeBtn) likeBtn.style.color = '';
        state = 'dislike';
      }
    });
  }
}

// Panic Function
function triggerPanic() {
  window.location.replace('https://classroom.google.com');
}

// Shortcuts
function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key === ']') {
      triggerPanic();
    }
  });
}
