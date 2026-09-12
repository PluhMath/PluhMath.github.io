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
  // PLUHCODE MODAL & REDEMPTION SYSTEM
  // ==========================================================================

  function ensurePluhCodeModal() {
    if (document.getElementById('pluhcode-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'pluhcode-modal';
    modal.className = 'cm-modal-backdrop';
    modal.innerHTML = `
      <div class="cm-modal-box pluhcode-modal-card">
        <div class="cm-modal-header">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <span style="font-size:1.4rem;">🔑</span>
            <h3 style="margin:0; font-family:'Outfit',sans-serif; color:#fff; font-size:1.25rem;">PluhCode Terminal</h3>
          </div>
          <button class="cm-modal-close" onclick="window.closePluhCodeModal()">&times;</button>
        </div>

        <div style="padding:1.4rem;">
          <p style="margin:0 0 1rem 0; color:var(--text-muted); font-size:0.9rem; line-height:1.5;">
            Enter an exclusive secret code to unlock special abilities, game modifications, and developer tools.
          </p>

          <div style="display:flex; gap:0.5rem; margin-bottom:1.2rem;">
            <input type="text" id="pluhcode-input" class="pluhcode-input" placeholder="Enter secret code (e.g. JohnPorkRulesAll)..." autocomplete="off" spellcheck="false">
            <button id="pluhcode-submit-btn" class="cm-btn cm-btn-yellow" style="padding:0.7rem 1.4rem; white-space:nowrap; font-weight:700;">
              Redeem
            </button>
          </div>

          <div id="pluhcode-message" style="display:none; padding:0.75rem 1rem; border-radius:8px; font-size:0.88rem; margin-bottom:1.2rem;"></div>

          <div class="pluhcode-unlocked-section">
            <h4 style="margin:0 0 0.8rem 0; color:#fff; font-size:0.95rem; display:flex; align-items:center; justify-content:space-between;">
              <span>Unlocked Perks & Tools</span>
              <span id="pluhcode-perk-count" style="font-size:0.78rem; color:var(--accent-cyan); font-weight:700;"></span>
            </h4>

            <div id="pluhcode-perks-list" style="display:flex; flex-direction:column; gap:0.7rem;">
              <!-- Dynamically populated -->
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Bind submit
    const submitBtn = modal.querySelector('#pluhcode-submit-btn');
    const input = modal.querySelector('#pluhcode-input');

    submitBtn.addEventListener('click', handleCodeSubmit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleCodeSubmit();
    });

    modal.addEventListener('click', (e) => {
      if (e.target === modal) window.closePluhCodeModal();
    });
  }

  function handleCodeSubmit() {
    const input = document.getElementById('pluhcode-input');
    const msgEl = document.getElementById('pluhcode-message');
    if (!input) return;

    const rawCode = input.value.trim();
    if (!rawCode) {
      showModalMessage('Please type a code first!', 'error');
      return;
    }

    const clean = rawCode.toLowerCase();

    // 1. Code: JohnPorkRulesAll
    if (clean === 'johnporkrulesall') {
      activateJohnPorkMode();
      input.value = '';
      showModalMessage('🐷 CODE ACCEPTED: JohnPorkRulesAll! Every image and sprite has been transformed into John Pork until you refresh.', 'success');
      renderUnlockedPerksList();
      return;
    }

    // 2. Code: PluhOfTheCentury
    if (clean === 'pluhofthecentury') {
      setPerkUnlocked('save_editor');
      input.value = '';
      showModalMessage('🔓 CODE ACCEPTED: PluhOfTheCentury! PluhHax Save File Editor is now permanently unlocked.', 'success');
      renderUnlockedPerksList();
      setTimeout(() => {
        window.closePluhCodeModal();
        window.openPluhHaxModal();
      }, 900);
      return;
    }

    // Invalid Code
    showModalMessage(`❌ Invalid code "${rawCode}". Try another secret code!`, 'error');
    input.classList.add('pluhcode-shake');
    setTimeout(() => input.classList.remove('pluhcode-shake'), 500);
  }

  function showModalMessage(text, type) {
    const msgEl = document.getElementById('pluhcode-message');
    if (!msgEl) return;
    msgEl.style.display = 'block';
    msgEl.textContent = text;
    if (type === 'success') {
      msgEl.style.background = 'rgba(16, 185, 129, 0.15)';
      msgEl.style.border = '1px solid rgba(16, 185, 129, 0.4)';
      msgEl.style.color = '#34d399';
    } else {
      msgEl.style.background = 'rgba(239, 68, 68, 0.15)';
      msgEl.style.border = '1px solid rgba(239, 68, 68, 0.4)';
      msgEl.style.color = '#f87171';
    }
  }

  function renderUnlockedPerksList() {
    const list = document.getElementById('pluhcode-perks-list');
    const countEl = document.getElementById('pluhcode-perk-count');
    if (!list) return;

    const perks = getUnlockedPerks();
    let items = [];

    // John Pork perk status
    if (johnPorkActive) {
      items.push(`
        <div class="pluhcode-perk-card active-perk">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <img src="${JOHN_PORK_IMAGE_URL}" style="width:36px; height:36px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.2);">
            <div>
              <div style="font-weight:700; color:#fff; font-size:0.9rem;">John Pork Rules All</div>
              <div style="font-size:0.78rem; color:#34d399;">Active • All graphics transformed (until refresh)</div>
            </div>
          </div>
          <span class="cm-tile-badge" style="position:static; background:rgba(16, 185, 129, 0.85);">ACTIVE</span>
        </div>
      `);
    } else {
      items.push(`
        <div class="pluhcode-perk-card">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:1.4rem;">🐷</span>
            <div>
              <div style="font-weight:700; color:#fff; font-size:0.9rem;">John Pork Mode</div>
              <div style="font-size:0.78rem; color:var(--text-dim);">Enter "JohnPorkRulesAll" to activate</div>
            </div>
          </div>
          <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="document.getElementById('pluhcode-input').value='JohnPorkRulesAll'; document.getElementById('pluhcode-submit-btn').click();">Redeem</button>
        </div>
      `);
    }

    // Save File Editor perk
    if (perks['save_editor']) {
      items.push(`
        <div class="pluhcode-perk-card unlocked-perk">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:1.4rem;">💾</span>
            <div>
              <div style="font-weight:700; color:#fff; font-size:0.9rem;">PluhHax Save File Editor</div>
              <div style="font-size:0.78rem; color:var(--accent-cyan);">Unlocked via PluhOfTheCentury</div>
            </div>
          </div>
          <button class="cm-btn cm-btn-yellow" style="padding:0.4rem 0.9rem; font-size:0.82rem; font-weight:700;" onclick="window.closePluhCodeModal(); window.openPluhHaxModal();">
            ⚡ Open Editor
          </button>
        </div>
      `);
    } else {
      items.push(`
        <div class="pluhcode-perk-card">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span style="font-size:1.4rem;">🔒</span>
            <div>
              <div style="font-weight:700; color:#fff; font-size:0.9rem;">Save File Editor (Hacking Tool)</div>
              <div style="font-size:0.78rem; color:var(--text-dim);">Enter "PluhOfTheCentury" to unlock</div>
            </div>
          </div>
          <button class="cm-btn cm-btn-blue" style="padding:0.35rem 0.75rem; font-size:0.8rem;" onclick="document.getElementById('pluhcode-input').value='PluhOfTheCentury'; document.getElementById('pluhcode-submit-btn').click();">Redeem</button>
        </div>
      `);
    }

    list.innerHTML = items.join('');
    if (countEl) {
      const activeCount = (johnPorkActive ? 1 : 0) + (perks['save_editor'] ? 1 : 0);
      countEl.textContent = `${activeCount} / 2 Unlocked`;
    }
  }

  window.openPluhCodeModal = function() {
    ensurePluhCodeModal();
    renderUnlockedPerksList();
    const modal = document.getElementById('pluhcode-modal');
    if (modal) modal.classList.add('active');
    setTimeout(() => {
      const inp = document.getElementById('pluhcode-input');
      if (inp) inp.focus();
    }, 100);
  };

  window.closePluhCodeModal = function() {
    const modal = document.getElementById('pluhcode-modal');
    if (modal) modal.classList.remove('active');
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
      { id: 'dr_file0', name: 'dr_file0 (Slot 1)', desc: 'Kris, Susie, Ralsei stats & Dark World flags' },
      { id: 'deltarune.ini', name: 'deltarune.ini (Config)', desc: 'Chapter progress and key items' },
      { id: 'dr_file1', name: 'dr_file1 (Slot 2)', desc: 'Secondary chapter save slot' },
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
    'dr_file0': "Kris\n100\n99999\n99999\n99999\n99999\n100\n100\n0\n0",
    'deltarune.ini': "[General]\nName=\"Kris\"\nChapter=\"1\"\nTime=\"99999\"\n[Dark]\nRecruits=\"All\"",
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
              <span style="font-size:0.75rem; color:var(--accent-cyan); font-weight:700;">UNLOCKED VIA PLUHOFTHECENTURY • RAW FILE TEXT EDITOR</span>
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
    const perks = getUnlockedPerks();
    if (!perks['save_editor']) {
      window.openPluhCodeModal();
      showModalMessage('🔒 Save File Editor is locked! Redeem code "PluhOfTheCentury" to access it.', 'error');
      return;
    }

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

    if (isFile0) {
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
        updatedData[`dr_${currentTextFileName}`] = newText;
      }
    }

    // Dispatch to iframe game
    const iframe = document.getElementById('game-iframe');
    if (iframe && iframe.contentWindow) {
      try {
        iframe.contentWindow.postMessage({
          type: 'initialSaveDataResponse',
          allLocalStorageData: updatedData
        }, '*');
        iframe.contentWindow.postMessage({
          type: 'saveDataChanged',
          gameId: activeEditorGame,
          allLocalStorageData: updatedData
        }, '*');
      } catch (e) {}

      // Reload iframe so changes take effect
      const currentSrc = iframe.src;
      iframe.src = 'about:blank';
      setTimeout(() => { iframe.src = currentSrc; }, 80);
    }

    // Trigger PMS and CrimX Cloud sync
    window.postMessage({
      type: 'saveDataChanged',
      gameId: activeEditorGame,
      allLocalStorageData: updatedData
    }, '*');

    updateStatus('💾 Saved & injected text save into game!', '#34d399');
    showPluhToast(`💾 Saved ${currentTextFileName}! Game restarted with new save data.`, 'success');
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

  // Inject PluhCode button into navbar on load if missing
  function injectPluhCodeNavButton() {
    const actions = document.querySelector('.cm-header-actions');
    if (actions && !document.getElementById('pluhcode-nav-btn')) {
      const btn = document.createElement('button');
      btn.id = 'pluhcode-nav-btn';
      btn.className = 'cm-btn cm-btn-blue';
      btn.innerHTML = '<span>🔑</span> PluhCode';
      btn.title = 'Enter secret codes to unlock tools and perks';
      btn.onclick = window.openPluhCodeModal;

      // Insert next to DoorAuth slot or at beginning
      const authSlot = document.getElementById('crimx-auth-slot');
      if (authSlot && authSlot.nextSibling) {
        actions.insertBefore(btn, authSlot.nextSibling);
      } else {
        actions.insertBefore(btn, actions.firstChild);
      }
    }
  }

  // Inject PluhHax button into game player actions if unlocked
  function injectPluhHaxPlayerButton() {
    const perks = getUnlockedPerks();
    if (!perks['save_editor']) return;
    const playerActions = document.querySelector('.cm-player-actions');
    if (playerActions && !document.getElementById('pluhhax-player-btn')) {
      const btn = document.createElement('button');
      btn.id = 'pluhhax-player-btn';
      btn.className = 'cm-btn cm-btn-yellow';
      btn.innerHTML = '⚡ PluhHax';
      btn.title = 'Open PluhHax Save File Editor to cheat / modify this game';
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
