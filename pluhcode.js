// PluhMath - PluhCode Secret Perks Engine
// Secret Codes:
// 1. "JohnPorkRulesAll" -> Replaces every image, sprite, texture, and graphic with John Pork until refresh.

(function() {
  'use strict';

  const STORAGE_KEY_PERKS = 'pluh_unlocked_perks';
  const JOHN_PORK_IMAGE_URL = 'john_pork.png';

  let johnPorkActive = false;

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

  window.toggleJohnPorkMode = function() {
    if (!johnPorkActive) {
      activateJohnPorkMode();
    } else {
      showPluhToast('🐷 John Pork Mode is currently active! Refresh the page to reset sprites.', 'info');
    }
  };

  window.activateJohnPorkMode = activateJohnPorkMode;
  window.openPluhCodeModal = function() {};
  window.closePluhCodeModal = function() {};
  window.openPluhHaxModal = function() {};
  window.closePluhHaxModal = function() {};

  // Toast Notification System
  function showPluhToast(text, type = 'info') {
    const existing = document.getElementById('pluh-toast');
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

})();
