// PluhMath - PluhCode Secret Perks & Save File Editor Engine
// Secret Codes:
// 1. "JohnPorkRulesAll" -> Replaces every image, sprite, texture, and graphic with John Pork until refresh.
// 2. "PluhOfTheCentury" -> Unlocks the built-in PluhHax Save File Editor to hack game progress.

(function() {
  'use strict';

  const STORAGE_KEY_PERKS = 'pluh_unlocked_perks';
  const JOHN_PORK_IMAGE_URL = 'john_pork.png';

  let johnPorkActive = false;
  let activeEditorGame = 'undertale';

  // Load unlocked perks
  function getUnlockedPerks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PERKS);
      return stored ? JSON.parse(stored) : {};
    } catch (e) {
      return {};
    }
  }

  function setPerkUnlocked(perkId) {
    const perks = getUnlockedPerks();
    perks[perkId] = true;
    localStorage.setItem(STORAGE_KEY_PERKS, JSON.stringify(perks));
  }

  // ==========================================================================
  // JOHN PORK RULES ALL ENGINE
  // Replaces every image, canvas draw, and WebGL texture with John Pork until refresh
  // ==========================================================================

  function activateJohnPorkMode() {
    if (johnPorkActive) return;
    johnPorkActive = true;

    const porkAbsUrl = new URL(JOHN_PORK_IMAGE_URL, window.location.href).href;
    console.log('[PluhCode] 🐷 JohnPorkRulesAll Activated! All images & sprites hijacked.');

    // 1. Preload master John Pork image
    const masterPorkImg = new Image();
    masterPorkImg.crossOrigin = 'anonymous';
    masterPorkImg.src = porkAbsUrl;

    // 2. Replace all existing DOM images & backgrounds
    function applyPorkToDOM(root = document) {
      // <img> tags
      root.querySelectorAll('img').forEach(img => {
        if (img.src !== porkAbsUrl) {
          img.src = porkAbsUrl;
          img.srcset = '';
        }
      });

      // Elements with background icons or graphics
      root.querySelectorAll('.cm-tile-graphic, .cm-logo-box, .cm-tile-thumb, .cm-player-title > span:first-child, .cm-tile-thumb-container').forEach(el => {
        el.style.backgroundImage = `url("${porkAbsUrl}")`;
        el.style.backgroundSize = 'cover';
        el.style.backgroundPosition = 'center';
        if (el.tagName !== 'IMG' && !el.querySelector('img')) {
          el.textContent = '';
        }
      });

      // Favicon
      const icon = document.querySelector('link[rel*="icon"]');
      if (icon) icon.href = porkAbsUrl;
    }

    applyPorkToDOM(document);

    // 3. MutationObserver to hijack any newly inserted images
    const observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node.nodeType === 1) {
            if (node.tagName === 'IMG') {
              node.src = porkAbsUrl;
              node.srcset = '';
            }
            if (node.querySelectorAll) {
              node.querySelectorAll('img').forEach(i => { i.src = porkAbsUrl; i.srcset = ''; });
              node.querySelectorAll('.cm-tile-graphic, .cm-logo-box, .cm-tile-thumb').forEach(el => {
                el.style.backgroundImage = `url("${porkAbsUrl}")`;
                el.style.backgroundSize = 'cover';
                el.textContent = '';
              });
            }
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 4. Override HTMLImageElement src setter globally
    try {
      const imgDesc = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
      if (imgDesc && imgDesc.set) {
        Object.defineProperty(HTMLImageElement.prototype, 'src', {
          set: function(val) {
            return imgDesc.set.call(this, porkAbsUrl);
          },
          get: function() {
            return porkAbsUrl;
          },
          configurable: true
        });
      }
    } catch (e) {
      console.warn('[JohnPork] Image prototype override:', e);
    }

    // 5. Override CanvasRenderingContext2D.prototype.drawImage
    try {
      const origDrawImage = CanvasRenderingContext2D.prototype.drawImage;
      CanvasRenderingContext2D.prototype.drawImage = function(image, ...args) {
        try {
          if (masterPorkImg.complete && masterPorkImg.naturalWidth > 0) {
            return origDrawImage.call(this, masterPorkImg, ...args);
          }
        } catch (err) {}
        return origDrawImage.apply(this, arguments);
      };
    } catch (e) {
      console.warn('[JohnPork] Canvas override:', e);
    }

    // 6. Override WebGL texImage2D for 3D/GameMaker games
    function hookWebGL(glProto) {
      if (!glProto || !glProto.texImage2D) return;
      const origTex = glProto.texImage2D;
      glProto.texImage2D = function(...args) {
        try {
          for (let i = 0; i < args.length; i++) {
            if (args[i] instanceof HTMLImageElement || (typeof HTMLCanvasElement !== 'undefined' && args[i] instanceof HTMLCanvasElement)) {
              if (masterPorkImg.complete && masterPorkImg.naturalWidth > 0) {
                args[i] = masterPorkImg;
              }
            }
          }
        } catch (e) {}
        return origTex.apply(this, args);
      };
    }
    if (window.WebGLRenderingContext) hookWebGL(WebGLRenderingContext.prototype);
    if (window.WebGL2RenderingContext) hookWebGL(WebGL2RenderingContext.prototype);

    // 7. Hijack Game Iframes (Undertale, Deltarune, Undertale Yellow, Run 3, Tiny Fishing, etc.)
    function hookGameIframe(iframe) {
      try {
        const win = iframe.contentWindow;
        if (!win) return;

        // Apply inside iframe
        if (win.CanvasRenderingContext2D) {
          const iframeOrigDI = win.CanvasRenderingContext2D.prototype.drawImage;
          const iframePork = new win.Image();
          iframePork.crossOrigin = 'anonymous';
          iframePork.src = porkAbsUrl;

          win.CanvasRenderingContext2D.prototype.drawImage = function(img, ...args) {
            try {
              if (iframePork.complete && iframePork.naturalWidth > 0) {
                return iframeOrigDI.call(this, iframePork, ...args);
              }
            } catch (e) {}
            return iframeOrigDI.apply(this, arguments);
          };
        }

        if (win.WebGLRenderingContext) hookWebGL(win.WebGLRenderingContext.prototype);
        if (win.WebGL2RenderingContext) hookWebGL(win.WebGL2RenderingContext.prototype);

        if (win.HTMLImageElement) {
          const iframeDesc = Object.getOwnPropertyDescriptor(win.HTMLImageElement.prototype, 'src');
          if (iframeDesc && iframeDesc.set) {
            Object.defineProperty(win.HTMLImageElement.prototype, 'src', {
              set: function() { return iframeDesc.set.call(this, porkAbsUrl); },
              get: function() { return porkAbsUrl; },
              configurable: true
            });
          }
        }

        if (iframe.contentDocument) {
          applyPorkToDOM(iframe.contentDocument);
        }
      } catch (err) {
        console.debug('[JohnPork] Cross-origin iframe prevented deep interception:', err);
      }
    }

    document.querySelectorAll('iframe').forEach(iframe => {
      hookGameIframe(iframe);
      iframe.addEventListener('load', () => hookGameIframe(iframe));
    });

    showPluhToast('🐷 JOHN PORK RULES ALL ACTIVATED! Every image and sprite is now John Pork until refresh.', 'success');
  }

  // ==========================================================================
  // DIRECT TOOLS & MODS (NO CODES NEEDED)
  // ==========================================================================

  window.toggleJohnPorkMode = function() {
    if (!johnPorkActive) {
      activateJohnPorkMode();
    } else {
      showPluhToast('🐷 John Pork Mode is currently active! Refresh the page to reset sprites.', 'info');
    }
  };

  window.activateJohnPorkMode = activateJohnPorkMode;
  window.openPluhCodeModal = function() {
    window.openPluhHaxModal();
  };
  window.closePluhCodeModal = function() {
    window.closePluhHaxModal();
  };

  // ==========================================================================
  // PLUHHAX - SAVE FILE TEXT EDITOR (Unlocked via PluhOfTheCentury)
  // Raw line-numbered text editor for file0, undertale.ini, file9, .PMS & JSON saves
  // ==========================================================================

  let currentTextFileName = 'file0';
  let editorGameData = {};

  const GAME_FILE_TABS = {
    'undertale': [
      { id: 'file0', name: 'file0 (Main Save)', desc: 'Player stats, LV, HP, ATK, Gold, Items' },
      { id: 'undertale.ini', name: 'undertale.ini (Config & Flags)', desc: 'Story progression, boss counters & settings' },
      { id: 'file9', name: 'file9 (Auto-Backup)', desc: 'Secondary backup save file' },
      { id: 'all_json', name: 'All Storage (JSON)', desc: 'Complete raw localStorage snapshot' }
    ],
    'undertale-yellow': [
      { id: 'file0', name: 'file0 (Main Save)', desc: 'Clover stats, Justice LV, HP, Revolver ATK, Gold' },
      { id: 'undertale.ini', name: 'undertale.ini (Flags)', desc: 'Story checkpoints and flags' },
      { id: 'file9', name: 'file9 (Backup)', desc: 'Secondary backup save file' },
      { id: 'all_json', name: 'All Storage (JSON)', desc: 'Complete raw localStorage snapshot' }
    ],
    'deltarune': [
      { id: 'filech1_0', name: 'filech1_0 (Ch1 Slot 1)', desc: 'Kris, Susie, Ralsei stats & Dark World flags' },
      { id: 'dr.ini', name: 'dr.ini (Progress & Completion)', desc: 'Chapter 1 completed flags & story checkpoint' },
      { id: 'filech1_1', name: 'filech1_1 (Ch1 Slot 2)', desc: 'Secondary chapter save slot' },
      { id: 'filech2_0', name: 'filech2_0 (Ch2 Slot 1)', desc: 'Chapter 2 Cyber World save slot' },
      { id: 'dr_file0', name: 'dr_file0 (Legacy Slot)', desc: 'Legacy save format' },
      { id: 'all_json', name: 'All Storage (JSON)', desc: 'Complete raw localStorage snapshot' }
    ],
    'tiny-fishing': [
      { id: 'tiny_fishing_save', name: 'tiny_fishing_save', desc: 'Cash, rod depth, hook capacity, idle earnings' },
      { id: 'all_json', name: 'All Storage (JSON)', desc: 'Complete raw localStorage snapshot' }
    ],
    'run3': [
      { id: 'run3_save', name: 'run3_save', desc: 'Unlocked alien characters, power cells, tunnel progress' },
      { id: 'all_json', name: 'All Storage (JSON)', desc: 'Complete raw localStorage snapshot' }
    ],
    'pluhshooter': [
      { id: 'pluhshooter_save', name: 'pluhshooter_save', desc: 'Score, unlocked weapons, player stats' },
      { id: 'all_json', name: 'All Storage (JSON)', desc: 'Complete raw localStorage snapshot' }
    ]
  };

  const DEFAULT_FILE_TEMPLATES = {
    'file0': "Frisk\n20\n99999\n99999\n999\n999\n999\n999\n99999\n999999\n11\n11\n11\n11\n11\n11\n11\n11\n0\n0\n0\n0\n0\n0\n0\n0\n0\n0\n0",
    'undertale.ini': "[General]\nName=\"Frisk\"\nLove=\"20\"\nTime=\"99999\"\nKills=\"999\"\n[Sans]\nPass=\"1\"\n[Flowey]\nmet=\"1\"",
    'file9': "Frisk\n20\n99999\n99999\n999\n999\n999\n999\n99999\n999999\n11\n11\n11\n11\n11\n11\n11\n11\n0\n0\n0\n0\n0\n0\n0\n0\n0\n0\n0",
    'filech1_0': "Kris\n1\n90\n90\n12\n2\n0\n12\n2\n150\n2\n1\n1\n5\n4\n1\n4\n6\n1\n1\n3\n1\n1\n1\n1\n1\n1\n1\n1\n1",
    'dr.ini': "[G]\nroom=\"132\"\ntime=\"14400\"\n[General]\nName=\"Kris\"\nChapter=\"1\"\nComplete=\"1\"\n[CH1]\ncompleted=\"1\"\nrecruits=\"all\"\npacifist=\"1\"",
    'filech1_1': "Kris\n1\n90\n90\n12\n2\n0\n12\n2\n150\n2\n1\n1\n5\n4\n1\n4\n6\n1\n1\n3\n1\n1\n1\n1\n1\n1\n1\n1\n1",
    'filech2_0': "Kris\n2\n120\n120\n14\n4\n0\n14\n4\n250\n2\n1\n1\n5\n4\n1\n4\n6\n1\n1\n3\n1\n1\n1\n1\n1\n1\n1\n1\n1",
    'dr_file0': "Kris\n1\n90\n90\n12\n2\n0\n12\n2\n150\n2\n1\n1\n5\n4\n1\n4\n6\n1\n1\n3\n1\n1\n1\n1\n1\n1\n1\n1\n1",
    'deltarune.ini': "[G]\nroom=\"132\"\ntime=\"14400\"\n[General]\nName=\"Kris\"\nChapter=\"1\"\nComplete=\"1\"\n[CH1]\ncompleted=\"1\"\nrecruits=\"all\"\npacifist=\"1\"",
    'tiny_fishing_save': "{\n  \"cash\": 999999999,\n  \"depth\": 10000,\n  \"maxFish\": 100,\n  \"offlineEarnings\": 999999\n}",
    'run3_save': "{\n  \"powerCells\": 99999,\n  \"unlockedCharacters\": [\"runner\", \"skater\", \"lizard\", \"duplicator\", \"gentleman\", \"angel\", \"pastafarian\"],\n  \"maxLevel\": 300\n}",
    'pluhshooter_save': "{\n  \"highScore\": 999999,\n  \"unlockedWeapons\": [\"pistol\", \"shotgun\", \"rifle\", \"sniper\", \"rocket\"],\n  \"kills\": 9999\n}"
  };

  function ensurePluhHaxModal() {
    if (document.getElementById('pluhhax-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'pluhhax-modal';
    modal.className = 'cm-modal-backdrop';
    modal.innerHTML = `
      <div class="cm-modal-box pluhhax-modal-card">
        <div class="cm-modal-header" style="padding:1rem 1.25rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:1.4rem;">📝</span>
            <div>
              <h3 style="margin:0; font-family:'Outfit',sans-serif; color:#fff; font-size:1.25rem;">PluhSave — Save File Text Editor</h3>
              <span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">RAW SAVE FILE TEXT EDITOR & MOD ENGINE</span>
            </div>
          </div>
          <button class="cm-modal-close" onclick="window.closePluhHaxModal()">&times;</button>
        </div>

        <div style="padding:1.1rem 1.25rem;">
          <!-- Top Bar: Game Selector & Actions -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.75rem; margin-bottom:0.8rem; background:rgba(0,0,0,0.3); padding:0.6rem 0.85rem; border-radius:8px; border:1px solid var(--border-subtle);">
            <div style="display:flex; align-items:center; gap:0.6rem;">
              <label for="pluhhax-game-select" style="font-size:0.86rem; color:var(--text-white); font-weight:700;">Game:</label>
              <select id="pluhhax-game-select" class="pluhhax-select">
                <option value="undertale">Undertale</option>
                <option value="deltarune">Deltarune</option>
                <option value="undertale-yellow">Undertale Yellow</option>
                <option value="tiny-fishing">Tiny Fishing</option>
                <option value="run3">Run 3</option>
                <option value="pluhshooter">PluhShooter.io</option>
              </select>
            </div>

            <div style="display:flex; gap:0.4rem; flex-wrap:wrap;">
              <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="window.pluhEditorLoadFromFile()">📂 Open File</button>
              <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="window.pluhEditorDownloadFile()">📥 Download File</button>
              <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="window.pluhEditorCopyText()">📋 Copy</button>
              <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.75rem; font-size:0.78rem;" onclick="window.pluhEditorReset()">🔄 Revert</button>
            </div>
          </div>

          <!-- File Tabs -->
          <div class="pluh-editor-tabs" id="pluh-editor-tabs-bar">
            <!-- Populated by JS -->
          </div>

          <!-- Quick Cheats Toolbar -->
          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.4rem; margin-bottom:0.6rem;">
            <div style="display:flex; align-items:center; gap:0.4rem; flex-wrap:wrap;" id="pluh-quick-cheats-bar">
              <!-- Quick cheat buttons for active file -->
            </div>
            <div style="font-size:0.75rem; color:var(--text-dim);" id="pluh-editor-cursor-pos">Line 1, Col 1 | 0 Lines</div>
          </div>

          <!-- Editor Container: Line Numbers + Textarea + Guide Drawer -->
          <div class="pluh-text-editor-container">
            <div id="pluh-line-numbers" class="pluh-line-numbers">1</div>
            <textarea id="pluh-code-textarea" class="pluh-code-textarea" spellcheck="false" autocomplete="off" wrap="off" placeholder="Loading save file text..."></textarea>

            <!-- Guide drawer for file0 / deltarune -->
            <div id="pluh-guide-drawer" class="pluh-guide-drawer">
              <div style="font-weight:700; color:#fff; margin-bottom:8px; font-size:0.8rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:4px;">
                📖 file0 Line Guide
              </div>
              <div class="pluh-guide-item"><span>Line 1:</span> Player Name</div>
              <div class="pluh-guide-item"><span>Line 2:</span> LV (Love: 1-20)</div>
              <div class="pluh-guide-item"><span>Line 3:</span> Max HP</div>
              <div class="pluh-guide-item"><span>Line 4:</span> Current HP</div>
              <div class="pluh-guide-item"><span>Line 5:</span> Base ATK</div>
              <div class="pluh-guide-item"><span>Line 6:</span> Weapon ATK</div>
              <div class="pluh-guide-item"><span>Line 7:</span> Base DEF</div>
              <div class="pluh-guide-item"><span>Line 8:</span> Armor DEF</div>
              <div class="pluh-guide-item"><span>Line 9:</span> EXP</div>
              <div class="pluh-guide-item"><span>Line 10:</span> Gold Currency</div>
              <div class="pluh-guide-item"><span>Line 11-18:</span> Inventory Items (11=Pie, 14=Steak)</div>
              <div class="pluh-guide-item"><span>Line 19:</span> Weapon ID</div>
              <div class="pluh-guide-item"><span>Line 20:</span> Armor ID</div>
              <div class="pluh-guide-item"><span>Line 29:</span> Plot Flag</div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; margin-top:0.85rem; border-top:1px solid var(--border-subtle); padding-top:0.85rem;">
            <div id="pluhhax-status" style="font-size:0.84rem; color:var(--text-dim);">Ready. Edit text directly or use 1-click cheat buttons.</div>
            <button class="cm-btn cm-btn-yellow" style="padding:0.6rem 1.4rem; font-weight:700; font-size:0.92rem;" onclick="window.pluhEditorSaveAndInject()">
              💾 Save & Inject Text into Game
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closePluhHaxModal();
    });

    const select = document.getElementById('pluhhax-game-select');
    if (select) {
      select.addEventListener('change', (e) => {
        activeEditorGame = e.target.value;
        const tabs = GAME_FILE_TABS[activeEditorGame] || [{ id: 'all_json', name: 'All Storage (JSON)' }];
        currentTextFileName = tabs[0].id;
        renderTextEditor();
      });
    }

    const textarea = document.getElementById('pluh-code-textarea');
    const lineNums = document.getElementById('pluh-line-numbers');

    // Synchronize scrolling
    textarea.addEventListener('scroll', () => {
      lineNums.scrollTop = textarea.scrollTop;
    });

    // Synchronize line numbers and cursor pos
    textarea.addEventListener('input', () => {
      updateLineNumbers();
      updateCursorPos();
    });

    textarea.addEventListener('click', updateCursorPos);
    textarea.addEventListener('keyup', updateCursorPos);

    // Support Tab key for indentation
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, start) + '  ' + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 2;
        updateLineNumbers();
      }
    });
  }

  function updateLineNumbers() {
    const textarea = document.getElementById('pluh-code-textarea');
    const lineNums = document.getElementById('pluh-line-numbers');
    if (!textarea || !lineNums) return;

    const lineCount = textarea.value.split('\n').length;
    let numbers = '';
    for (let i = 1; i <= lineCount; i++) {
      numbers += i + '\n';
    }
    lineNums.textContent = numbers;
  }

  function updateCursorPos() {
    const textarea = document.getElementById('pluh-code-textarea');
    const posEl = document.getElementById('pluh-editor-cursor-pos');
    if (!textarea || !posEl) return;

    const val = textarea.value;
    const selStart = textarea.selectionStart;
    const lines = val.substring(0, selStart).split('\n');
    const currentLine = lines.length;
    const currentCol = lines[lines.length - 1].length + 1;
    const totalLines = val.split('\n').length;

    posEl.textContent = `Line ${currentLine}, Col ${currentCol} | ${totalLines} Lines | ${val.length} chars`;
  }

  // Detect current game if on game page
  function detectActiveGame() {
    const bodyAttr = document.body.getAttribute('data-game-id');
    if (bodyAttr) return bodyAttr;
    const path = window.location.pathname.toLowerCase();
    if (path.includes('yellow')) return 'undertale-yellow';
    if (path.includes('undertale')) return 'undertale';
    if (path.includes('deltarune')) return 'deltarune';
    if (path.includes('fishing')) return 'tiny-fishing';
    if (path.includes('run')) return 'run3';
    if (path.includes('shooter')) return 'pluhshooter';
    return 'undertale';
  }

  window.openPluhHaxModal = function() {
    ensurePluhHaxModal();
    activeEditorGame = detectActiveGame();
    const select = document.getElementById('pluhhax-game-select');
    if (select) select.value = activeEditorGame;

    const tabs = GAME_FILE_TABS[activeEditorGame] || [{ id: 'all_json', name: 'All Storage (JSON)' }];
    currentTextFileName = tabs[0].id;

    renderTextEditor();

    const modal = document.getElementById('pluhhax-modal');
    if (modal) modal.classList.add('active');
  };

  window.closePluhHaxModal = function() {
    const modal = document.getElementById('pluhhax-modal');
    if (modal) modal.classList.remove('active');
  };

  function renderTextEditor() {
    renderTabs();
    renderCheatsBar();
    loadFileTextIntoEditor();
  }

  function renderTabs() {
    const container = document.getElementById('pluh-editor-tabs-bar');
    if (!container) return;

    const tabs = GAME_FILE_TABS[activeEditorGame] || [
      { id: 'save', name: 'Save File' },
      { id: 'all_json', name: 'All Storage (JSON)' }
    ];

    container.innerHTML = tabs.map(t => `
      <button class="pluh-tab-btn ${t.id === currentTextFileName ? 'active' : ''}" onclick="window.pluhEditorSwitchTab('${t.id}')" title="${t.desc || t.name}">
        📄 ${t.name}
      </button>
    `).join('') + `
      <button class="pluh-tab-btn" style="color:var(--accent-yellow);" onclick="window.pluhEditorPromptCustomKey()">
        + Custom Storage Key
      </button>
    `;
  }

  window.pluhEditorSwitchTab = function(fileId) {
    currentTextFileName = fileId;
    renderTabs();
    renderCheatsBar();
    loadFileTextIntoEditor();
  };

  window.pluhEditorPromptCustomKey = function() {
    const key = prompt('Enter custom localStorage key to open in text editor (e.g. ut_gold, save_data):');
    if (!key) return;
    currentTextFileName = key.trim();
    renderTabs();
    renderCheatsBar();
    loadFileTextIntoEditor();
  };

  function renderCheatsBar() {
    const bar = document.getElementById('pluh-quick-cheats-bar');
    const drawer = document.getElementById('pluh-guide-drawer');
    if (!bar) return;

    // Show guide drawer for file0/undertale
    const isFile0 = currentTextFileName === 'file0' || currentTextFileName === 'file9';
    if (drawer) {
      drawer.style.display = isFile0 ? 'block' : 'none';
    }

    if (activeEditorGame === 'deltarune') {
      bar.innerHTML = `
        <button class="pluhhax-preset-btn" style="border-color:var(--accent-cyan); color:#00f0ff; font-weight:700;" onclick="window.pluhCompleteChapter(1)">Complete Chapter 1</button>
        <button class="pluhhax-preset-btn" style="border-color:var(--accent-cyan); color:#00f0ff; font-weight:700;" onclick="window.pluhCompleteChapter(2)">Complete Chapter 2</button>
        <button class="pluhhax-preset-btn" style="border-color:var(--accent-cyan); color:#00f0ff; font-weight:700;" onclick="window.pluhCompleteChapter(3)">Complete Chapter 3</button>
        <button class="pluhhax-preset-btn" style="border-color:var(--accent-cyan); color:#00f0ff; font-weight:700;" onclick="window.pluhCompleteChapter(4)">Complete Chapter 4</button>
        <button class="pluhhax-preset-btn" onclick="window.pluhEditorUndoBackup()">↩️ Undo</button>
      `;
    } else if (isFile0) {
      bar.innerHTML = `
        <button class="pluhhax-preset-btn" onclick="window.pluhPatchMaxStats()">⚡ Max Stats (LV 20, 99999 HP, 999 ATK)</button>
        <button class="pluhhax-preset-btn" onclick="window.pluhPatchGold()">💰 999,999 Gold</button>
        <button class="pluhhax-preset-btn" onclick="window.pluhPatchPies()">🥧 Fill Inventory with Pies</button>
      `;
    } else if (currentTextFileName === 'all_json' || currentTextFileName.endsWith('.json') || currentTextFileName.includes('save')) {
      bar.innerHTML = `
        <button class="pluhhax-preset-btn" onclick="window.pluhFormatJSON()">✨ Format JSON</button>
        <button class="pluhhax-preset-btn" onclick="window.pluhMinifyJSON()">📦 Minify JSON</button>
      `;
    } else {
      bar.innerHTML = `<span style="font-size:0.75rem; color:var(--text-dim);">Direct raw text mode for: ${currentTextFileName}</span>`;
    }
  }

  function loadFileTextIntoEditor() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;

    let content = '';

    if (currentTextFileName === 'all_json') {
      const allKeys = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k) {
          try {
            allKeys[k] = JSON.parse(localStorage.getItem(k));
          } catch (e) {
            allKeys[k] = localStorage.getItem(k);
          }
        }
      }
      content = JSON.stringify(allKeys, null, 2);
    } else {
      // Look up key directly or with game prefix
      content = localStorage.getItem(currentTextFileName) ||
                localStorage.getItem(`ut_${currentTextFileName}`) ||
                localStorage.getItem(`dr_${currentTextFileName}`) ||
                localStorage.getItem(`uty_${currentTextFileName}`);

      // If missing from localStorage, check if there is a template
      if (!content && DEFAULT_FILE_TEMPLATES[currentTextFileName]) {
        content = DEFAULT_FILE_TEMPLATES[currentTextFileName];
      } else if (!content) {
        content = `// Empty save file: ${currentTextFileName}\n// Type or paste your save data here`;
      }
    }

    textarea.value = content;
    updateLineNumbers();
    updateCursorPos();
    updateStatus(`Loaded "${currentTextFileName}" (${content.length} bytes).`);
  }

  // 1-Click patches that directly update lines in the textarea
  window.pluhPatchMaxStats = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;

    let lines = textarea.value.split('\n');
    while (lines.length < 10) lines.push('0');

    lines[1] = '20';      // Line 2: LV
    lines[2] = '99999';   // Line 3: Max HP
    lines[3] = '99999';   // Line 4: Current HP
    lines[4] = '999';     // Line 5: Base ATK
    lines[5] = '999';     // Line 6: Weapon ATK
    lines[6] = '999';     // Line 7: Base DEF
    lines[7] = '999';     // Line 8: Armor DEF
    lines[8] = '99999';   // Line 9: EXP
    lines[9] = '999999';  // Line 10: Gold

    textarea.value = lines.join('\n');
    updateLineNumbers();
    updateCursorPos();
    showPluhToast('⚡ Patched stats: LV 20, 99,999 HP, 999 ATK, 999,999 Gold!', 'success');
  };

  window.pluhPatchGold = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;

    let lines = textarea.value.split('\n');
    while (lines.length < 10) lines.push('0');
    lines[9] = '999999'; // Line 10: Gold

    textarea.value = lines.join('\n');
    updateLineNumbers();
    updateCursorPos();
    showPluhToast('💰 Patched gold to 999,999G!', 'success');
  };

  window.pluhPatchPies = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;

    let lines = textarea.value.split('\n');
    while (lines.length < 18) lines.push('0');

    // Lines 11-18 are inventory items (Item ID 11 = Butterscotch Pie)
    for (let i = 10; i < 18; i++) {
      lines[i] = '11';
    }

    textarea.value = lines.join('\n');
    updateLineNumbers();
    updateCursorPos();
    showPluhToast('🥧 Filled inventory with Butterscotch Pies (Item ID 11)!', 'success');
  };

  // Deltarune Chapter Completion Preset (legitimate stats, no inflated dark dollars)
  window.pluhCompleteChapter = function(chapNum) {
    const textarea = document.getElementById('pluh-code-textarea');
    const ch = parseInt(chapNum, 10) || 1;

    // Normal, non-cheated dark dollars & stats per chapter
    const normalMoney = ch === 1 ? '150' : ch === 2 ? '250' : ch === 3 ? '350' : '450';
    const hpMax = ch === 1 ? '90' : ch === 2 ? '120' : ch === 3 ? '140' : '160';
    const atkBase = ch === 1 ? '12' : ch === 2 ? '14' : ch === 3 ? '16' : '18';

    // Standard save text with clean normal items
    const saveLines = [
      "Kris",
      String(ch),
      hpMax,
      hpMax,
      atkBase,
      "2",
      "0",
      atkBase,
      "2",
      normalMoney,
      "2", "1", "1", "5", "4", "1", "4", "6", "1", "1", "3",
      "1", "1", "1", "1", "1", "1", "1", "1", "1"
    ];
    const saveText = saveLines.join('\n');

    // dr.ini lines marking completed chapters up to selected chapter
    let iniLines = [
      "[G]",
      `room="${ch === 1 ? '132' : ch === 2 ? '200' : '300'}"`,
      `time="${ch * 14400}"`,
      "[General]",
      'Name="Kris"',
      `Chapter="${ch}"`,
      'Complete="1"'
    ];

    for (let c = 1; c <= ch; c++) {
      iniLines.push(`[CH${c}]`);
      iniLines.push('completed="1"');
      iniLines.push('recruits="all"');
    }
    const drIniText = iniLines.join('\n');

    // Save automatic backup before replacing
    try {
      localStorage.setItem('pluh_dr_backup_pre_restore', JSON.stringify({
        file: localStorage.getItem(`filech${ch}_0`) || localStorage.getItem('dr_file0') || '',
        dr_ini: localStorage.getItem('dr.ini') || localStorage.getItem('deltarune.ini') || ''
      }));
    } catch(e) {}

    // Populate all known keys for Deltarune
    const keysMap = {
      [`filech${ch}_0`]: saveText,
      [`filech${ch}_1`]: saveText,
      'dr_file0': saveText,
      'dr.ini': drIniText,
      'deltarune.ini': drIniText,
      [`dtfilech${ch}_0`]: saveText,
      'dtdr.ini': drIniText,
      [`dt/_savedata/filech${ch}_0`]: saveText,
      'dt/_savedata/dr.ini': drIniText
    };

    for (const [k, v] of Object.entries(keysMap)) {
      localStorage.setItem(k, v);
    }

    // Also inject into GameMaker HTML5 IndexedDB store if available
    try {
      if (window.indexedDB) {
        const openReq = indexedDB.open('/_savedata');
        openReq.onsuccess = (ev) => {
          const db = ev.target.result;
          if (db.objectStoreNames.contains('FILE_DATA')) {
            const tx = db.transaction(['FILE_DATA'], 'readwrite');
            const store = tx.objectStore('FILE_DATA');
            const enc = new TextEncoder();
            store.put({ timestamp: Date.now(), mode: 33206, contents: enc.encode(saveText) }, `/_savedata/filech${ch}_0`);
            store.put({ timestamp: Date.now(), mode: 33206, contents: enc.encode(drIniText) }, '/_savedata/dr.ini');
          }
        };
      }
    } catch(e) {}

    if (textarea) {
      textarea.value = currentTextFileName.includes('ini') ? drIniText : saveText;
      updateLineNumbers();
      updateCursorPos();
    }

    // Post to iframe
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'saveDataChanged',
          gameId: 'deltarune',
          allLocalStorageData: keysMap
        }, '*');
      } catch(e) {}
    }

    updateStatus(`✓ Completed Chapter ${ch}! Story progress saved.`, '#34d399');
    showPluhToast(`✓ Completed Chapter ${ch}! Story checkpoint updated.`, 'success');
  };

  window.pluhEditorUndoBackup = function() {
    try {
      const stored = localStorage.getItem('pluh_dr_backup_pre_restore');
      if (!stored) {
        alert('No previous backup found.');
        return;
      }
      const b = JSON.parse(stored);
      if (b.filech1_0) {
        localStorage.setItem('filech1_0', b.filech1_0);
        localStorage.setItem('dr_file0', b.filech1_0);
      }
      if (b.dr_ini) {
        localStorage.setItem('dr.ini', b.dr_ini);
        localStorage.setItem('deltarune.ini', b.dr_ini);
      }
      loadFileTextIntoEditor();
      showPluhToast('↩️ Restored previous backup save data!', 'info');
    } catch(err) {
      alert('Failed to restore backup: ' + err.message);
    }
  };

  window.pluhFormatJSON = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed, null, 2);
      updateLineNumbers();
      updateCursorPos();
      showPluhToast('✨ Formatted JSON successfully!', 'success');
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  window.pluhMinifyJSON = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;
    try {
      const parsed = JSON.parse(textarea.value);
      textarea.value = JSON.stringify(parsed);
      updateLineNumbers();
      updateCursorPos();
    } catch (err) {
      alert('Invalid JSON: ' + err.message);
    }
  };

  window.pluhEditorReset = function() {
    if (confirm('Revert all unsaved text changes?')) {
      loadFileTextIntoEditor();
    }
  };

  window.pluhEditorCopyText = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;
    navigator.clipboard.writeText(textarea.value).then(() => {
      showPluhToast('📋 Copied file text to clipboard!', 'success');
    });
  };

  window.pluhEditorDownloadFile = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;

    const text = textarea.value;
    const filename = currentTextFileName.includes('.') ? currentTextFileName : `${currentTextFileName}.txt`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    showPluhToast(`📥 Downloaded ${filename}!`, 'success');
  };

  window.pluhEditorLoadFromFile = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.ini,.json,.pms,*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        const textarea = document.getElementById('pluh-code-textarea');
        if (textarea) {
          textarea.value = evt.target.result;
          updateLineNumbers();
          updateCursorPos();
          showPluhToast(`📂 Loaded "${file.name}" into editor!`, 'success');
          updateStatus(`Loaded external file: ${file.name}`);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  window.pluhEditorSaveAndInject = function() {
    const textarea = document.getElementById('pluh-code-textarea');
    if (!textarea) return;

    const newText = textarea.value;
    const updatedData = {};

    // Automatic non-destructive backup before modifying
    try {
      const backupKey = `pluh_backup_${activeEditorGame}_${currentTextFileName}`;
      localStorage.setItem(backupKey, localStorage.getItem(currentTextFileName) || '');
    } catch(e) {}

    if (currentTextFileName === 'all_json') {
      try {
        const parsed = JSON.parse(newText);
        for (const [k, v] of Object.entries(parsed)) {
          const strVal = typeof v === 'object' ? JSON.stringify(v) : String(v);
          localStorage.setItem(k, strVal);
          updatedData[k] = strVal;
        }
      } catch (err) {
        alert('Invalid JSON! Please fix errors before saving: ' + err.message);
        return;
      }
    } else {
      localStorage.setItem(currentTextFileName, newText);
      updatedData[currentTextFileName] = newText;

      // Also set game prefixed variant if relevant
      if (activeEditorGame === 'undertale') {
        localStorage.setItem(`ut_${currentTextFileName}`, newText);
        updatedData[`ut_${currentTextFileName}`] = newText;
      } else if (activeEditorGame === 'undertale-yellow') {
        localStorage.setItem(`uty_${currentTextFileName}`, newText);
        updatedData[`uty_${currentTextFileName}`] = newText;
      } else if (activeEditorGame === 'deltarune') {
        localStorage.setItem(`dr_${currentTextFileName}`, newText);
        localStorage.setItem(`dt${currentTextFileName}`, newText);
        localStorage.setItem(`dt/_savedata/${currentTextFileName}`, newText);
        updatedData[`dr_${currentTextFileName}`] = newText;
        updatedData[`dt${currentTextFileName}`] = newText;
        updatedData[`dt/_savedata/${currentTextFileName}`] = newText;

        // Also inject into IndexedDB for GameMaker Emscripten
        try {
          if (window.indexedDB) {
            const req = indexedDB.open('/_savedata');
            req.onsuccess = (ev) => {
              const idb = ev.target.result;
              if (idb.objectStoreNames.contains('FILE_DATA')) {
                const tx = idb.transaction(['FILE_DATA'], 'readwrite');
                const st = tx.objectStore('FILE_DATA');
                const enc = new TextEncoder();
                const idbKey = currentTextFileName.startsWith('/') ? currentTextFileName : `/_savedata/${currentTextFileName}`;
                st.put({
                  timestamp: Date.now(),
                  mode: 33206,
                  contents: enc.encode(newText)
                }, idbKey);
              }
            };
          }
        } catch(e) {}
      }
    }

    // Dispatch safely to iframe game without wiping session
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'saveDataChanged',
          gameId: activeEditorGame,
          allLocalStorageData: updatedData
        }, '*');
      } catch (e) {}

      // Prompt before reload so we never wipe in-progress sessions unexpectedly
      const askReload = confirm('Save data saved safely with backup! Would you like to restart the game to load the changes now? (Click Cancel if you are currently playing)');
      if (askReload) {
        const currentSrc = iframe.src;
        iframe.src = 'about:blank';
        setTimeout(() => { iframe.src = currentSrc; }, 80);
      }
    }

    // Trigger PMS and CrimX Cloud sync
    window.postMessage({
      type: 'saveDataChanged',
      gameId: activeEditorGame,
      allLocalStorageData: updatedData
    }, '*');

    updateStatus('💾 Save injected safely with automatic backup!', '#34d399');
    showPluhToast(`💾 Saved ${currentTextFileName}!`, 'success');
  };

  function updateStatus(msg, color) {
    const el = document.getElementById('pluhhax-status');
    if (el) {
      el.textContent = msg;
      el.style.color = color || 'var(--text-dim)';
    }
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function showPluhToast(text, type = 'info') {
    const existing = document.querySelector('.pluh-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'pluh-toast';
    toast.style.cssText = `
      position: fixed;
      bottom: 24px;
      right: 24px;
      padding: 12px 20px;
      background: #11141a;
      border: 1px solid ${type === 'success' ? 'rgba(52, 211, 153, 0.5)' : 'rgba(0, 240, 255, 0.4)'};
      border-radius: 8px;
      color: #fff;
      font-size: 0.9rem;
      font-weight: 600;
      box-shadow: 0 10px 30px rgba(0,0,0,0.6);
      z-index: 999999;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: pluhToastFade 0.3s ease;
    `;
    toast.innerHTML = `<span>${type === 'success' ? '✨' : 'ℹ️'}</span><span>${text}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4500);
  }

  // Inject Save Editor button into navbar on load if missing and not in sidebar
  function injectPluhCodeNavButton() {
    if (document.getElementById('pluhsave-nav-btn') || document.getElementById('pluhsave-sidebar-btn')) return;
    if (document.getElementById('pm-sidebar')) return; // In sidebar layout, keep header clean!
    const actions = document.querySelector('.cm-header-actions');
    if (actions) {
      const btn = document.createElement('button');
      btn.id = 'pluhsave-nav-btn';
      btn.className = 'cm-btn cm-btn-blue';
      btn.innerHTML = '<span>📝</span> Save Editor';
      btn.title = 'Open Save File Editor';
      btn.onclick = window.openPluhHaxModal;
      actions.appendChild(btn);
    }
  }

  // Inject Save Editor button into game player actions directly
  function injectPluhHaxPlayerButton() {
    const playerActions = document.querySelector('.cm-player-actions');
    if (playerActions && !document.getElementById('pluhhax-player-btn')) {
      const btn = document.createElement('button');
      btn.id = 'pluhhax-player-btn';
      btn.className = 'cm-btn cm-btn-yellow';
      btn.innerHTML = '⚡ Save Editor';
      btn.title = 'Open Save File Editor to edit saves or complete chapters';
      btn.onclick = window.openPluhHaxModal;
      playerActions.insertBefore(btn, playerActions.firstChild);
    }
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectPluhCodeNavButton();
      injectPluhHaxPlayerButton();
    });
  } else {
    injectPluhCodeNavButton();
    injectPluhHaxPlayerButton();
  }

})();
