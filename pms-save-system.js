// PluhMath - Local .PMS (PluhMathSave) File Engine
// Manages offline save files, header validation, cross-game protection, and continuous disk auto-saving.

(function() {
  'use strict';

  // Game ID to Title mappings and localStorage key prefixes
  const GAME_CONFIG = {
    'undertale': {
      title: 'Undertale',
      filename: 'undertale.pms',
      prefixes: ['ut', 'undertale'],
      matcher: (k) => k.startsWith('ut') || k.startsWith('undertale')
    },
    'deltarune': {
      title: 'Deltarune',
      filename: 'deltarune.pms',
      prefixes: ['dr', 'deltarune'],
      matcher: (k) => k.startsWith('dr') || k.startsWith('deltarune')
    },
    'run3': {
      title: 'Run 3',
      filename: 'run3.pms',
      prefixes: ['run3', 'run_3'],
      matcher: (k) => k.toLowerCase().includes('run3') || k.toLowerCase().includes('run_3')
    },
    'pluhshooter': {
      title: 'PluhShooter.io',
      filename: 'pluhshooter.pms',
      prefixes: ['pluhshooter', 'ps_'],
      matcher: (k) => k.toLowerCase().includes('pluhshooter') || k.startsWith('ps_')
    },
    'geometry-dash': {
      title: 'Geometry Dash Subzero',
      filename: 'geometry-dash.pms',
      prefixes: ['gd_', 'geometrydash'],
      matcher: (k) => k.startsWith('gd_') || k.toLowerCase().includes('geometry')
    },
    'pluhus': {
      title: 'PluhUs',
      filename: 'pluhus.pms',
      prefixes: ['pluhus', 'amongus'],
      matcher: (k) => k.toLowerCase().includes('pluhus') || k.toLowerCase().includes('among')
    },
    'drift-boss': {
      title: 'Drift Boss',
      filename: 'drift-boss.pms',
      prefixes: ['driftboss', 'c2drift'],
      matcher: (k) => k.toLowerCase().includes('drift')
    }
  };

  // Active File System Handle for continuous direct-to-disk auto saving
  let activeFileHandle = null;
  let activeHandleGameId = null;

  // Detect current game from page body or URL
  function getCurrentGameId() {
    const bodyAttr = document.body.getAttribute('data-game-id');
    if (bodyAttr && GAME_CONFIG[bodyAttr]) return bodyAttr;

    const path = window.location.pathname.toLowerCase();
    for (const id of Object.keys(GAME_CONFIG)) {
      if (path.includes(id)) return id;
    }

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get('id');
    if (idParam && GAME_CONFIG[idParam]) return idParam;

    return null;
  }

  // Gather save data keys for a specific game
  function collectGameSaveData(gameId) {
    const config = GAME_CONFIG[gameId];
    if (!config) return {};

    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (config.matcher(key)) {
        data[key] = localStorage.getItem(key);
      }
    }

    // Also check cached cloud/bridge save objects
    try {
      const cachedBridge = localStorage.getItem(`pluhmath_cache_${gameId}`);
      if (cachedBridge) {
        data[`__bridge_${gameId}`] = cachedBridge;
      }
    } catch (e) {}

    return data;
  }

  // Gather all save data across all games (Global)
  function collectGlobalSaveData() {
    const globalData = {};
    for (const gameId of Object.keys(GAME_CONFIG)) {
      globalData[gameId] = collectGameSaveData(gameId);
    }
    return globalData;
  }

  // ============================================================================
  // EXPORT / DOWNLOAD (.PMS)
  // ============================================================================

  async function exportSingleGamePMS(gameId, promptFileSystem = false) {
    const targetGame = gameId || getCurrentGameId();
    if (!targetGame) {
      return exportGlobalPMS();
    }

    const config = GAME_CONFIG[targetGame];
    const saveData = collectGameSaveData(targetGame);
    const keysCount = Object.keys(saveData).length;

    const pmsObject = {
      format: 'PLUHMATH_SAVE',
      version: 1,
      scope: 'single',
      gameId: targetGame,
      gameTitle: config ? config.title : targetGame,
      suggestedFilename: config ? config.filename : `${targetGame}.pms`,
      timestamp: Date.now(),
      isoDate: new Date().toISOString(),
      keysCount: keysCount,
      data: saveData
    };

    const content = JSON.stringify(pmsObject, null, 2);
    const filename = config ? config.filename : `${targetGame}.pms`;

    // Attempt File System Access API if requested for continuous auto-save
    if (promptFileSystem && 'showSaveFilePicker' in window) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'PluhMath Save File (*.pms)',
            accept: { 'application/json': ['.pms'] }
          }]
        });

        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        activeFileHandle = handle;
        activeHandleGameId = targetGame;
        updatePMSStatusBadge(`Linked: ${handle.name}`);
        showPMSToast(`✓ Linked ${handle.name} for continuous live saving!`, 'success');
        return;
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('[PMS] File picker rejected, falling back to download:', err);
        } else {
          return;
        }
      }
    }

    // Standard Download Fallback
    triggerDownloadBlob(content, filename);
    showPMSToast(`Downloaded ${filename}. Notice: Do not rename file!`, 'success');
  }

  async function exportGlobalPMS() {
    const allData = collectGlobalSaveData();
    let totalKeys = 0;
    Object.values(allData).forEach(g => { totalKeys += Object.keys(g).length; });

    const pmsObject = {
      format: 'PLUHMATH_SAVE',
      version: 1,
      scope: 'global',
      gameId: 'global',
      gameTitle: 'PluhMath All Games Backup',
      suggestedFilename: 'pluhmath_global.pms',
      timestamp: Date.now(),
      isoDate: new Date().toISOString(),
      totalGames: Object.keys(allData).length,
      keysCount: totalKeys,
      data: allData
    };

    const content = JSON.stringify(pmsObject, null, 2);
    triggerDownloadBlob(content, 'pluhmath_global.pms');
    showPMSToast('Downloaded pluhmath_global.pms containing all game saves!', 'success');
  }

  function triggerDownloadBlob(text, filename) {
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }

  // ============================================================================
  // IMPORT WITH STRICT HEADER VALIDATION
  // ============================================================================

  async function importPMSFile(targetGameId = null) {
    const currentGame = targetGameId || getCurrentGameId();

    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{
            description: 'PluhMath Save Files (*.pms)',
            accept: { 'application/json': ['.pms', '.json'] }
          }],
          multiple: false
        });

        const file = await handle.getFile();
        const text = await file.text();
        const success = processPMSContent(text, file.name, currentGame);

        if (success && currentGame) {
          activeFileHandle = handle;
          activeHandleGameId = currentGame;
          updatePMSStatusBadge(`Linked: ${file.name}`);
        }
        return;
      } catch (err) {
        if (err.name === 'AbortError') return;
      }
    }

    // Input element fallback
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pms,.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      processPMSContent(text, file.name, currentGame);
    };
    input.click();
  }

  function processPMSContent(text, filename, currentGame) {
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      showPMSToast('Corrupted file: Invalid JSON structure.', 'error');
      return false;
    }

    // 1. Header Format Validation
    if (!parsed || parsed.format !== 'PLUHMATH_SAVE') {
      showPMSToast('Invalid Save File: Missing PLUHMATH_SAVE header.', 'error');
      return false;
    }

    const saveScope = parsed.scope || 'single';
    const saveGameId = parsed.gameId;

    // 2. Strict Cross-Game Mismatch Guard
    // If the user tries to import an Undertale save into Deltarune (or vice versa), reject it!
    if (currentGame && saveScope === 'single' && saveGameId && saveGameId !== currentGame) {
      const saveTitle = parsed.gameTitle || saveGameId;
      const expectedTitle = GAME_CONFIG[currentGame] ? GAME_CONFIG[currentGame].title : currentGame;
      alert(`⚠️ This save is for a different game!\n\nThis file contains save data for "${saveTitle}", but you are currently playing "${expectedTitle}".`);
      showPMSToast('This save is for a different game!', 'error');
      return false;
    }

    // 3. Unpack and Apply Data
    let restoredCount = 0;

    if (saveScope === 'single') {
      const data = parsed.data || {};
      Object.keys(data).forEach(k => {
        if (!k.startsWith('__bridge_')) {
          localStorage.setItem(k, data[k]);
          restoredCount++;
        }
      });

      showPMSToast(`✓ Restored ${restoredCount} save items for ${parsed.gameTitle || saveGameId}!`, 'success');

      // Dispatch restore event to reload iframes
      window.dispatchEvent(new CustomEvent('pluhmath-pms-restored', {
        detail: { gameId: saveGameId, data: data }
      }));

      // Notify any active iframe directly
      const iframe = document.getElementById('game-iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'initialSaveDataResponse',
          messageId: 'pms_restore_' + Date.now(),
          allLocalStorageData: data
        }, '*');
      }

      // Reload frame if reload function exists
      if (typeof window.reloadGame === 'function') {
        setTimeout(() => window.reloadGame(), 500);
      }

    } else if (saveScope === 'global') {
      // Global multi-game backup
      const games = parsed.data || {};
      for (const gId of Object.keys(games)) {
        const gData = games[gId] || {};
        Object.keys(gData).forEach(k => {
          if (!k.startsWith('__bridge_')) {
            localStorage.setItem(k, gData[k]);
            restoredCount++;
          }
        });
      }

      showPMSToast(`✓ Global Restore Complete: ${restoredCount} items applied across all games!`, 'success');
      window.dispatchEvent(new CustomEvent('pluhmath-pms-restored', {
        detail: { gameId: 'global', totalRestored: restoredCount }
      }));
    }

    closePMSModal();
    return true;
  }

  // ============================================================================
  // CONTINUOUS LIVE DISK AUTO-SAVING
  // ============================================================================

  async function continuousAutoSaveToPMS(gameId, updatedData) {
    if (!activeFileHandle || !activeHandleGameId) return;
    if (activeHandleGameId !== gameId) return;

    try {
      const config = GAME_CONFIG[gameId];
      const allData = collectGameSaveData(gameId);
      if (updatedData && typeof updatedData === 'object') {
        Object.assign(allData, updatedData);
      }

      const pmsObject = {
        format: 'PLUHMATH_SAVE',
        version: 1,
        scope: 'single',
        gameId: gameId,
        gameTitle: config ? config.title : gameId,
        suggestedFilename: config ? config.filename : `${gameId}.pms`,
        timestamp: Date.now(),
        isoDate: new Date().toISOString(),
        keysCount: Object.keys(allData).length,
        data: allData
      };

      const writable = await activeFileHandle.createWritable();
      await writable.write(JSON.stringify(pmsObject, null, 2));
      await writable.close();

      console.debug('[PMS Live Save] Flushed updated save to .pms file on disk.');
      updatePMSStatusBadge(`💾 Auto-saved: ${activeFileHandle.name}`);
    } catch (err) {
      console.warn('[PMS Live Save] Could not write to disk handle:', err);
    }
  }

  // Listen to game iframe save events
  window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'saveDataChanged') {
      const gId = (e.data.gameId || getCurrentGameId() || 'undertale').toLowerCase();
      continuousAutoSaveToPMS(gId, e.data.allLocalStorageData);
    }
  });

  // ============================================================================
  // MODAL & UI
  // ============================================================================

  function openPMSModal() {
    ensurePMSModal();
    const modal = document.getElementById('pms-modal');
    if (modal) modal.classList.add('active');
  }

  function closePMSModal() {
    const modal = document.getElementById('pms-modal');
    if (modal) modal.classList.remove('active');
  }

  function updatePMSStatusBadge(text) {
    const badge = document.getElementById('pms-live-badge');
    if (badge) {
      badge.textContent = text;
      badge.style.display = 'inline-flex';
    }
  }

  function ensurePMSModal() {
    if (document.getElementById('pms-modal')) return;

    const currentGame = getCurrentGameId();
    const isSingleGame = !!currentGame;
    const gameTitle = isSingleGame && GAME_CONFIG[currentGame] ? GAME_CONFIG[currentGame].title : 'All Games';
    const filename = isSingleGame && GAME_CONFIG[currentGame] ? GAME_CONFIG[currentGame].filename : 'pluhmath_global.pms';

    const modal = document.createElement('div');
    modal.id = 'pms-modal';
    modal.className = 'cm-modal-overlay';
    modal.innerHTML = `
      <div class="cm-modal-card pms-modal-card">
        <div class="cm-modal-header">
          <div class="cm-modal-title">
            <span>💾</span>
            <span>Local .PMS Save File Manager</span>
          </div>
          <button class="cm-modal-close" onclick="closePMSModal()">✕</button>
        </div>

        <div style="font-size:0.86rem; color:var(--text-dim); line-height:1.5; margin-bottom:1.25rem;">
          ${isSingleGame 
            ? `Download or import your <strong>${escapeHtml(gameTitle)}</strong> progress as a portable <code>.pms</code> file. You can also link the file so PluhMath continuously auto-saves directly to your disk!`
            : `Download a complete backup of all games as <code>pluhmath_global.pms</code>, or restore your previous progress without an account.`
          }
        </div>

        ${isSingleGame ? `
          <div class="pms-warning-box">
            <span style="font-size:1.1rem;">⚠️</span>
            <div>
              <strong>Important Rule:</strong> Do not rename <code>${escapeHtml(filename)}</code>! If you rename this file to another game, PluhMath will detect the internal header and reject it to protect your save files.
            </div>
          </div>
        ` : ''}

        <div class="pms-actions-grid">
          <!-- Download Button -->
          <button class="cm-btn cm-btn-yellow pms-action-btn" onclick="exportPMSCurrent()">
            <span style="font-size:1.25rem;">📥</span>
            <div style="text-align:left;">
              <div style="font-weight:700; color:#fff;">Download ${escapeHtml(filename)}</div>
              <div style="font-size:0.75rem; color:rgba(255,255,255,0.7);">Save current browser progress to a .pms file</div>
            </div>
          </button>

          ${isSingleGame && 'showSaveFilePicker' in window ? `
            <!-- Live Auto-Save Linker -->
            <button class="cm-btn cm-btn-blue pms-action-btn" onclick="linkPMSFileForAutoSave()">
              <span style="font-size:1.25rem;">🔄</span>
              <div style="text-align:left;">
                <div style="font-weight:700; color:#fff;">Link File for Live Auto-Save</div>
                <div style="font-size:0.75rem; color:rgba(255,255,255,0.7);">Automatically saves progress to your disk as you play</div>
              </div>
            </button>
          ` : ''}

          <!-- Import Button -->
          <button class="cm-btn cm-btn-blue pms-action-btn" onclick="importPMSCurrent()">
            <span style="font-size:1.25rem;">📂</span>
            <div style="text-align:left;">
              <div style="font-weight:700; color:#fff;">Import .PMS Save File</div>
              <div style="font-size:0.75rem; color:rgba(255,255,255,0.7);">Restore your saved progress after browser restart</div>
            </div>
          </button>
        </div>

        <div id="pms-live-badge" class="pms-live-badge" style="display:none;"></div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closePMSModal();
    });
  }

  function showPMSToast(message, type = 'info') {
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

  // Global window exports
  window.openPMSModal = openPMSModal;
  window.closePMSModal = closePMSModal;
  window.exportPMSCurrent = () => {
    const cur = getCurrentGameId();
    if (cur) exportSingleGamePMS(cur, false);
    else exportGlobalPMS();
  };
  window.linkPMSFileForAutoSave = () => {
    const cur = getCurrentGameId();
    if (cur) exportSingleGamePMS(cur, true);
  };
  window.importPMSCurrent = () => {
    const cur = getCurrentGameId();
    importPMSFile(cur);
  };
  window.exportSingleGamePMS = exportSingleGamePMS;
  window.exportGlobalPMS = exportGlobalPMS;
  window.importPMSFile = importPMSFile;

  document.addEventListener('DOMContentLoaded', () => {
    ensurePMSModal();
  });
})();
