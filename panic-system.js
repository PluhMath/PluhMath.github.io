// PluhMath - Universal Panic Mode & Settings Engine

const DEFAULT_PANIC_URL = 'https://classroom.google.com';

function getPanicUrl() {
  return localStorage.getItem('pluhmath_panic_url') || DEFAULT_PANIC_URL;
}

function setPanicUrl(url) {
  let finalUrl = url.trim();
  if (finalUrl && !/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }
  localStorage.setItem('pluhmath_panic_url', finalUrl || DEFAULT_PANIC_URL);
  updateModalState();
}

function triggerPanic() {
  const target = getPanicUrl();
  window.location.replace(target);
}

// Universal Tab Cloaker (Enter URL directly)
function cloakTabPrompt() {
  const current = localStorage.getItem('pluhmath_cloak_url') || 'https://classroom.google.com';
  const urlInput = prompt('Enter the URL to cloak this tab as (e.g. https://classroom.google.com or leave empty to reset):', current);
  if (urlInput !== null) {
    applyCloakByUrl(urlInput.trim());
  }
}

function applyCloakByUrl(url) {
  if (!url || url.toLowerCase() === 'reset' || url.toLowerCase() === 'default') {
    localStorage.removeItem('pluhmath_cloak_url');
    document.title = 'PluhMath — Free Unblocked Games & Math Arcade';
    setFavicon('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect width=%22100%22 height=%22100%22 rx=%2220%22 fill=%22%23ffd000%22/><text x=%2250%%22 y=%2268%%22 text-anchor=%22middle%22 font-size=%2260%22 font-family=%22sans-serif%22 font-weight=%22bold%22 fill=%22%23000%22>∑</text></svg>');
    return;
  }

  let finalUrl = url;
  if (!/^https?:\/\//i.test(finalUrl)) {
    finalUrl = 'https://' + finalUrl;
  }

  localStorage.setItem('pluhmath_cloak_url', finalUrl);

  const lower = finalUrl.toLowerCase();
  if (lower.includes('classroom')) {
    document.title = 'Classes';
    setFavicon('https://ssl.gstatic.com/classroom/favicon.png');
  } else if (lower.includes('docs.google')) {
    document.title = 'Google Docs';
    setFavicon('https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico');
  } else if (lower.includes('drive.google')) {
    document.title = 'My Drive - Google Drive';
    setFavicon('https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png');
  } else if (lower.includes('desmos')) {
    document.title = 'Desmos | Graphing Calculator';
    setFavicon('https://www.desmos.com/favicon.ico');
  } else if (lower.includes('canvas') || lower.includes('instructure')) {
    document.title = 'Dashboard';
    setFavicon('https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico');
  } else {
    try {
      const parsed = new URL(finalUrl);
      document.title = parsed.hostname;
      setFavicon(`https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=64`);
    } catch {
      document.title = finalUrl;
    }
  }
}

function setFavicon(url) {
  let link = document.querySelector("link[rel~='icon']");
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = url;
}

// Restore cloak on load across all pages
window.addEventListener('load', () => {
  const saved = localStorage.getItem('pluhmath_cloak_url');
  if (saved) applyCloakByUrl(saved);
});

// Global hotkey: ']' immediately redirects to panic URL
window.addEventListener('keydown', (e) => {
  if (e.key === ']' && document.activeElement.tagName !== 'INPUT') {
    triggerPanic();
  }
});

// Setup Panic Modal in DOM
document.addEventListener('DOMContentLoaded', () => {
  ensurePanicModal();
  setupPanicButtons();
});

function ensurePanicModal() {
  if (document.getElementById('panic-settings-modal')) return;

  const modal = document.createElement('div');
  modal.id = 'panic-settings-modal';
  modal.className = 'cm-modal-overlay';
  modal.innerHTML = `
    <div class="cm-modal-card">
      <div class="cm-modal-header">
        <div class="cm-modal-title">
          <span>⚙️</span>
          <span>Panic Mode Settings</span>
        </div>
        <button class="cm-modal-close" onclick="closePanicModal()">✕</button>
      </div>

      <p style="font-size:0.88rem; color:var(--cm-text-dim); line-height:1.5;">
        Choose where Panic Mode sends you when you hit <kbd style="background:#000; color:#ffd000; padding:2px 6px; border-radius:3px; font-weight:bold;">]</kbd> or click the 🚨 Panic button.
      </p>

      <div style="font-size:0.8rem; font-weight:800; color:var(--cm-yellow); text-transform:uppercase; letter-spacing:0.5px;">
        1-Click Presets:
      </div>

      <div class="cm-panic-presets">
        <button class="cm-preset-btn" data-url="https://classroom.google.com">
          <span>🏫</span> Google Classroom
        </button>
        <button class="cm-preset-btn" data-url="https://docs.google.com">
          <span>📄</span> Google Docs
        </button>
        <button class="cm-preset-btn" data-url="https://drive.google.com">
          <span>📁</span> Google Drive
        </button>
        <button class="cm-preset-btn" data-url="https://www.google.com">
          <span>🔍</span> Google Search
        </button>
        <button class="cm-preset-btn" data-url="https://www.desmos.com/calculator">
          <span>📐</span> Desmos Calculator
        </button>
        <button class="cm-preset-btn" data-url="https://canvas.instructure.com">
          <span>🎓</span> Canvas LMS
        </button>
      </div>

      <div class="cm-input-group">
        <label style="font-size:0.8rem; font-weight:800; color:var(--cm-yellow); text-transform:uppercase; letter-spacing:0.5px;">
          Or Enter Any Custom URL:
        </label>
        <div style="display:flex; gap:0.5rem;">
          <input type="text" id="custom-panic-input" class="cm-url-input" placeholder="https://example.com" style="flex:1;">
          <button class="cm-btn cm-btn-yellow" onclick="saveCustomPanic()" style="padding:0.6rem 1rem;">Save</button>
        </div>
      </div>

      <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid #233458; padding-top:0.75rem;">
        <span style="font-size:0.78rem; color:var(--cm-text-dim);">
          Current: <strong id="current-panic-display" style="color:#00e5ff;">...</strong>
        </span>
        <button class="cm-btn cm-btn-panic" onclick="triggerPanic()" style="font-size:0.8rem; padding:0.4rem 0.8rem;">
          Test Panic Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Preset clicks
  modal.querySelectorAll('.cm-preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setPanicUrl(btn.dataset.url);
    });
  });

  // Close on backdrop
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closePanicModal();
  });

  updateModalState();
}

function openPanicModal() {
  ensurePanicModal();
  updateModalState();
  const modal = document.getElementById('panic-settings-modal');
  if (modal) modal.classList.add('active');
}

function closePanicModal() {
  const modal = document.getElementById('panic-settings-modal');
  if (modal) modal.classList.remove('active');
}

function saveCustomPanic() {
  const input = document.getElementById('custom-panic-input');
  if (input && input.value.trim()) {
    setPanicUrl(input.value.trim());
    alert('Panic URL updated to: ' + getPanicUrl());
  }
}

function updateModalState() {
  const current = getPanicUrl();
  const disp = document.getElementById('current-panic-display');
  const input = document.getElementById('custom-panic-input');

  if (disp) {
    try {
      const parsed = new URL(current);
      disp.textContent = parsed.hostname + (parsed.pathname.length > 1 ? parsed.pathname : '');
      disp.title = current;
    } catch {
      disp.textContent = current;
    }
  }

  if (input && document.activeElement !== input) {
    input.value = current;
  }

  const modal = document.getElementById('panic-settings-modal');
  if (modal) {
    modal.querySelectorAll('.cm-preset-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.url === current);
    });
  }
}

function setupPanicButtons() {
  document.querySelectorAll('.panic-trigger').forEach(btn => {
    btn.addEventListener('click', triggerPanic);
  });
  document.querySelectorAll('.panic-settings-trigger').forEach(btn => {
    btn.addEventListener('click', openPanicModal);
  });
}
