// PluhMath - Dedicated Game Page Engine

document.addEventListener('DOMContentLoaded', () => {
  initGamePage();
  setupGlobalShortcuts();
});

function initGamePage() {
  // Check for community game query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const communityId = urlParams.get('community') || (urlParams.get('id') && urlParams.get('id').startsWith('community_') ? urlParams.get('id').replace('community_', '') : null);

  if (communityId) {
    loadCommunityGamePage(communityId);
    return;
  }

  // Determine game from page attribute or URL query
  const pageGameId = document.body.dataset.gameId || urlParams.get('id') || 'undertale';
  const game = getGameById(pageGameId) || GAMES_DB[0];

  document.body.dataset.gameId = game.id;

  // Update Page Title and Meta if needed
  if (!document.title.includes(game.title)) {
    document.title = `${game.title} — Play Free Unblocked on PluhMath`;
  }

  // Populate dynamic game elements if they exist
  const frame = document.getElementById('game-iframe');
  if (frame) {
    if (!frame.src || frame.src.endsWith('about:blank') || frame.src === window.location.href) {
      frame.src = game.gamePath;
    }
    frame.addEventListener('load', async () => {
      if (window.PluhSaveBridge) {
        const state = await window.PluhSaveBridge.extractAllSaveDataForGame(game.id);
        if (state && Object.keys(state.localStorage).length > 0) {
          try {
            frame.contentWindow.postMessage({
              type: 'initialSaveDataResponse',
              messageId: 'auto_init_' + Date.now(),
              allLocalStorageData: state.localStorage
            }, '*');
          } catch (e) {}
        }
      }
    });
  }

  // Populate details
  const titleEl = document.getElementById('game-title-el');
  if (titleEl) titleEl.textContent = game.title;

  const breadcrumbEl = document.getElementById('game-title-breadcrumb');
  if (breadcrumbEl) breadcrumbEl.textContent = game.title;

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

// ============================================================================
// PLUHCOMMUNITY GAME LOADER
// ============================================================================

async function loadCommunityGamePage(communityId) {
  document.body.dataset.gameId = `community_${communityId}`;
  const titleEl = document.getElementById('game-title-el');
  const breadcrumbEl = document.getElementById('game-title-breadcrumb');
  const descEl = document.getElementById('game-desc-el');
  const howToPlayEl = document.getElementById('game-howtoplay-el');
  const controlsGrid = document.getElementById('controls-grid');
  const frame = document.getElementById('game-iframe');
  const authorBadge = document.getElementById('game-author-badge');
  const promoteBtn = document.getElementById('promote-btn');

  if (titleEl) titleEl.textContent = 'Loading PluhCommunity Game...';

  // Wait for PluhCommunity helper if needed
  let retries = 0;
  while ((!window.PluhCommunity || !window.PluhCommunity.fetchCommunityGameById) && retries < 25) {
    await new Promise(r => setTimeout(r, 100));
    retries++;
  }

  let game = null;
  if (window.PluhCommunity && window.PluhCommunity.fetchCommunityGameById) {
    game = await window.PluhCommunity.fetchCommunityGameById(communityId);
  }

  if (!game) {
    if (titleEl) titleEl.textContent = 'Game Not Found';
    if (descEl) descEl.textContent = 'This community creation may have been deleted or is currently unavailable.';
    return;
  }

  // Populate metadata
  if (titleEl) titleEl.textContent = game.title;
  if (breadcrumbEl) breadcrumbEl.textContent = game.title;
  document.title = `${game.title} — Play Free on PluhCommunity`;

  if (authorBadge) {
    authorBadge.innerHTML = `by @${game.authorName || 'Pluher'}${game.isCreatorGame ? ' <span style="color:#10b981; font-weight:800; margin-left:4px;">🚀 CREATOR</span>' : ''}${game.curatedBy ? ` • ⭐ Curated by @${game.curatedBy}` : ''}`;
    authorBadge.style.display = 'inline-block';
  }

  // Check if user has Curator or Owner privileges to promote
  let canCurate = false;
  try {
    const user = window.PluhAuth ? window.PluhAuth.getCurrentUser() : null;
    if (user && window.PluhCommunity && window.PluhCommunity.isUserCurator) {
      canCurate = await window.PluhCommunity.isUserCurator(user.uid);
    } else if (window.PluhCommunity && window.PluhCommunity.isOwner) {
      canCurate = window.PluhCommunity.isOwner();
    }
  } catch(e) {}

  if (promoteBtn && canCurate) {
    promoteBtn.style.display = 'inline-block';
    promoteBtn.textContent = game.promoted ? '⭐ Remove from Main' : '🌟 Promote to Main';
    window.handlePromoteActiveGame = async function() {
      try {
        const isPromoted = await window.PluhCommunity.togglePromoteToCatalog(communityId);
        promoteBtn.textContent = isPromoted ? '⭐ Remove from Main' : '🌟 Promote to Main';
        if (window.PluhAuth && window.PluhAuth.showToast) {
          window.PluhAuth.showToast(isPromoted ? '🌟 Promoted to Main PluhMath Catalogue!' : 'Removed from Main Catalogue', 'success');
        }
      } catch (err) {
        alert(err.message);
      }
    };
  } else if (promoteBtn) {
    promoteBtn.style.display = 'none';
  }

  if (descEl) descEl.textContent = game.description || 'A web game created by the PluhMath community.';
  if (howToPlayEl) howToPlayEl.textContent = game.howToPlay || 'Use standard keyboard and mouse controls to play.';

  if (controlsGrid) {
    const ctrls = Array.isArray(game.controls) && game.controls.length > 0
      ? game.controls
      : [{ key: 'Mouse & Keyboard', desc: 'Interact with game' }];
    controlsGrid.innerHTML = ctrls.map(c => `
      <div class="cm-control-item">
        <span class="cm-key">${c.key}</span>
        <span style="font-size:0.9rem; color:var(--cm-text-light);">${c.desc}</span>
      </div>
    `).join('');
  }

  // Set frame source
  if (frame) {
    if (game.gameSourceType === 'html' && game.htmlContent) {
      frame.removeAttribute('src');
      frame.srcdoc = game.htmlContent;
    } else if (game.gameUrl) {
      frame.src = game.gameUrl;
    }
  }

  // Likes & Stars rating
  const likeBtn = document.getElementById('like-btn');
  const likeCount = document.getElementById('like-count');
  if (likeBtn && likeCount) {
    const isStarred = window.PluhCommunity.isGameStarred ? window.PluhCommunity.isGameStarred(communityId) : false;
    let stars = game.stars || 0;
    likeCount.textContent = `${stars} Star${stars === 1 ? '' : 's'}`;
    if (isStarred) likeBtn.style.color = '#fbbf24';

    likeBtn.onclick = async () => {
      if (window.PluhCommunity && window.PluhCommunity.toggleStarCommunityGame) {
        const starred = await window.PluhCommunity.toggleStarCommunityGame(communityId);
        stars = starred ? stars + 1 : Math.max(0, stars - 1);
        likeCount.textContent = `${stars} Star${stars === 1 ? '' : 's'}`;
        likeBtn.style.color = starred ? '#fbbf24' : '';
      }
    };
  }

  // Increment play count
  if (window.PluhCommunity && window.PluhCommunity.incrementGamePlayCount) {
    window.PluhCommunity.incrementGamePlayCount(communityId);
  }

  // Update CrimX Rich Game Presence
  setTimeout(() => {
    if (window.updateCrimXStatus) {
      window.updateCrimXStatus(`Playing ${game.title}`);
    }
  }, 1000);

  // Cloak state restore
  const savedCloak = localStorage.getItem('pluhmath_cloak');
  if (savedCloak && savedCloak !== 'default') {
    applyCloak(savedCloak);
  }
}

// Panic Function
function triggerPanic() {
  const target = (typeof getPanicUrl === 'function') 
    ? getPanicUrl() 
    : (localStorage.getItem('pluhmath_panic_url') || 'https://classroom.google.com');
  window.location.replace(target);
}

// Shortcuts
function setupGlobalShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (e.key === ']' && document.activeElement.tagName !== 'INPUT') {
      triggerPanic();
    }
  });
}
