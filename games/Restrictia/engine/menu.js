// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Menu Manager — Main Menu, Vehicle Select, Pause Menu
// ═══════════════════════════════════════════════════════════════

import { VEHICLES } from '../data/vehicles.js';
import { CHARACTERS, VEHICLE_DRIVER_MAP } from '../data/characters.js';

export class MenuManager {
  constructor(game) {
    this.game = game;
    this.container = null;
    this.previewMesh = null;
    this.previewRotation = 0;
    this.selectedIndex = 0;
    this._createContainer();
  }

  _createContainer() {
    this.container = document.getElementById('game-menu');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'game-menu';
      document.body.appendChild(this.container);
    }
  }

  hideAll() {
    this.container.style.display = 'none';
    this.container.innerHTML = '';
    if (this.previewMesh) {
      this.previewMesh.dispose();
      this.previewMesh = null;
    }
  }

  // ═══ MAIN MENU ═══
  showMainMenu() {
    this.container.style.display = '';
    this.container.className = 'menu-overlay';

    this.container.innerHTML = `
      <div class="menu-main">
        <section class="menu-hero" aria-label="Restrictia Rush">
          <div class="menu-title-section">
            <div class="menu-subtitle">THE CHRONICLES OF</div>
            <h1 class="menu-title">RESTRICTIA <span>RUSH</span></h1>
            <div class="menu-title-sub">ISLAND GRAND TOUR <span class="menu-3d-badge">3D</span></div>
            <div class="menu-tagline">Big wheels. Bigger islands. One very strange divide.</div>
          </div>

          <div class="menu-actions">
            <button class="menu-btn menu-btn-primary" id="btn-play">
              <span class="menu-btn-icon">⚑</span>
              START TOUR
            </button>
            <button class="menu-btn menu-btn-secondary" id="btn-controls">
              <span class="menu-btn-icon">⌘</span>
              HOW TO DRIVE
            </button>
          </div>

          <div class="menu-footer-info">
            <div class="menu-footer-item">
              <span>6 Custom Rides</span>
              <span>•</span>
              <span>3 Wild Regions</span>
              <span>•</span>
              <span>Land + Sea</span>
            </div>
          </div>
        </section>

        <aside class="menu-world-card" aria-label="Archipelago tour map">
          <div class="world-card-header">
            <span class="world-card-kicker">TOUR MAP</span>
            <span class="world-card-stamp">EXPLORE</span>
          </div>
          <div class="world-map" aria-hidden="true">
            <div class="map-island map-island-crimson"></div>
            <div class="map-island map-island-divide"></div>
            <div class="map-island map-island-restrictia"></div>
            <div class="map-route route-one"></div>
            <div class="map-route route-two"></div>
            <span class="map-pin pin-crimson"><b>01</b><i>Crimson Coast</i></span>
            <span class="map-pin pin-divide"><b>02</b><i>Five-Mile Divide</i></span>
            <span class="map-pin pin-restrictia"><b>03</b><i>Restrictia Sector</i></span>
            <span class="map-boat">⛵</span>
          </div>
          <div class="world-card-footer"><span class="legend-dot"></span> Your adventure starts at the coast</div>
        </aside>
      </div>
    `;

    // Bind events
    document.getElementById('btn-play').addEventListener('click', () => {
      this.showVehicleSelect();
    });

    document.getElementById('btn-controls').addEventListener('click', () => {
      this.showControls();
    });
  }

  // ═══ VEHICLE SELECT ═══
  showVehicleSelect() {
    this.container.style.display = '';
    this.container.className = 'menu-overlay';
    this.selectedIndex = 0;

    this._renderVehicleSelect();
  }

  _renderVehicleSelect() {
    const vehicle = VEHICLES[this.selectedIndex];
    const driverId = VEHICLE_DRIVER_MAP[vehicle.id];
    const driver = CHARACTERS[driverId];
    const bodyColor = this._toCssColor(vehicle.visual.bodyColor);
    const accentColor = this._toCssColor(vehicle.visual.accentColor);

    this.container.innerHTML = `
      <div class="menu-vehicle-select">
        <div class="vs-header">
          <button class="vs-back" id="vs-back">← BACK</button>
          <h2 class="vs-title">SELECT VEHICLE</h2>
          <div class="vs-counter">${this.selectedIndex + 1} / ${VEHICLES.length}</div>
        </div>

        <div class="vs-main">
          <!-- Vehicle Preview Area -->
          <div class="vs-preview">
            <div class="vs-preview-3d" id="vs-preview-area">
              <div class="vs-preview-sun"></div>
              <div class="vs-checker-strip"></div>
              <div class="vs-race-kart" style="--kart-paint:${bodyColor}; --kart-accent:${accentColor}" aria-label="Stylized ${vehicle.name} kart preview">
                <span class="kart-spoiler"></span>
                <span class="kart-cockpit"></span>
                <span class="kart-body"></span>
                <span class="kart-bumper"></span>
                <span class="kart-wheel wheel-fl"></span>
                <span class="kart-wheel wheel-fr"></span>
                <span class="kart-wheel wheel-rl"></span>
                <span class="kart-wheel wheel-rr"></span>
              </div>
              <div class="vs-rider-tag">${driver ? driver.alias : 'TOUR DRIVER'}</div>
            </div>
            <div class="vs-nav">
              <button class="vs-nav-btn" id="vs-prev" aria-label="Previous vehicle">←</button>
              <button class="vs-nav-btn" id="vs-next" aria-label="Next vehicle">→</button>
            </div>
          </div>

          <!-- Vehicle Info -->
          <div class="vs-info">
            <div class="vs-manufacturer">${vehicle.manufacturer}</div>
            <h3 class="vs-vehicle-name">${vehicle.name}</h3>
            <p class="vs-description">${vehicle.description}</p>

            <!-- Driver -->
            <div class="vs-driver">
              <div class="vs-driver-portrait" style="background:${driver ? driver.portraitColor : '#666'}">
                ${driver ? driver.name.charAt(0) : '?'}
              </div>
              <div>
                <div class="vs-driver-name">${driver ? driver.name : 'Unknown'}</div>
                <div class="vs-driver-alias">${driver ? '"' + driver.alias + '"' : ''}</div>
              </div>
            </div>

            <!-- Stats -->
            <div class="vs-stats">
              ${this._renderStatBar('Speed', vehicle.stats.speed)}
              ${this._renderStatBar('Acceleration', vehicle.stats.acceleration)}
              ${this._renderStatBar('Handling', vehicle.stats.handling)}
              ${this._renderStatBar('Weight', vehicle.stats.weight)}
              ${this._renderStatBar('Fuel Efficiency', vehicle.stats.fuelEfficiency)}
              ${this._renderStatBar('Amphibious', vehicle.stats.amphibiousThrust)}
            </div>

            <!-- Start Button -->
            <button class="menu-btn menu-btn-primary vs-start" id="vs-start">
              <span class="menu-btn-icon">⚑</span>
              PICK THIS RIDE
            </button>
          </div>
        </div>

        <!-- Pit Stops Toggle -->
        <div class="vs-pitstop-toggle">
          <label class="toggle-label">
            <span>⛽ Pit Stops:</span>
            <button class="toggle-btn ${this.game.pitStopsEnabled ? 'toggle-on' : ''}" id="vs-pitstop">
              ${this.game.pitStopsEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </label>
        </div>
      </div>
    `;

    // Bind events
    document.getElementById('vs-back').addEventListener('click', () => this.showMainMenu());
    document.getElementById('vs-prev').addEventListener('click', () => {
      this.selectedIndex = (this.selectedIndex - 1 + VEHICLES.length) % VEHICLES.length;
      this._renderVehicleSelect();
    });
    document.getElementById('vs-next').addEventListener('click', () => {
      this.selectedIndex = (this.selectedIndex + 1) % VEHICLES.length;
      this._renderVehicleSelect();
    });
    document.getElementById('vs-start').addEventListener('click', () => {
      this.game.startGame(VEHICLES[this.selectedIndex].id);
    });
    document.getElementById('vs-pitstop').addEventListener('click', (e) => {
      this.game.pitStopsEnabled = !this.game.pitStopsEnabled;
      e.target.textContent = this.game.pitStopsEnabled ? 'ENABLED' : 'DISABLED';
      e.target.classList.toggle('toggle-on', this.game.pitStopsEnabled);
    });

    // Keyboard navigation
    this._vehicleSelectKeyHandler = (e) => {
      if (e.code === 'ArrowLeft') {
        this.selectedIndex = (this.selectedIndex - 1 + VEHICLES.length) % VEHICLES.length;
        this._renderVehicleSelect();
      } else if (e.code === 'ArrowRight') {
        this.selectedIndex = (this.selectedIndex + 1) % VEHICLES.length;
        this._renderVehicleSelect();
      } else if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        this.game.startGame(VEHICLES[this.selectedIndex].id);
        window.removeEventListener('keydown', this._vehicleSelectKeyHandler);
      }
    };
    window.addEventListener('keydown', this._vehicleSelectKeyHandler);
  }

  _renderStatBar(label, value) {
    const pct = (value / 10) * 100;
    const color = value >= 8 ? '#00e676' : value >= 5 ? '#ff9100' : '#ff1744';
    return `
      <div class="stat-row">
        <span class="stat-label">${label}</span>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${pct}%; background:${color}"></div>
        </div>
        <span class="stat-value">${value}</span>
      </div>
    `;
  }

  _getVehicleEmoji(type) {
    const map = {
      sled: '🛷',
      heavy_truck: '🚛',
      crossover: '🚙',
      van: '🚐',
      armored_cruiser: '🚔',
      roadster: '🏎️'
    };
    return map[type] || '🚗';
  }

  _toCssColor(color) {
    const channels = (color || [0.25, 0.5, 0.8]).map(channel =>
      Math.max(0, Math.min(255, Math.round(channel * 255)))
    );
    return `rgb(${channels.join(', ')})`;
  }

  // ═══ PAUSE MENU ═══
  showPauseMenu() {
    this.container.style.display = '';
    this.container.className = 'menu-overlay menu-overlay-dim';

    this.container.innerHTML = `
      <div class="menu-pause">
        <h2 class="pause-title">PAUSED</h2>
        <div class="pause-actions">
          <button class="menu-btn menu-btn-primary" id="pause-resume">
            <span class="menu-btn-icon">▶</span> RESUME
          </button>
          <button class="menu-btn menu-btn-secondary" id="pause-pitstop">
            <span class="menu-btn-icon">⛽</span> Pit Stops: ${this.game.pitStopsEnabled ? 'ON' : 'OFF'}
          </button>
          <button class="menu-btn menu-btn-secondary" id="pause-voice">
            <span class="menu-btn-icon">🔊</span> Voice: ${this.game.voiceEngine?.enabled ? 'ON' : 'OFF'}
          </button>
          <button class="menu-btn menu-btn-secondary" id="pause-controls">
            <span class="menu-btn-icon">🎮</span> CONTROLS
          </button>
          <button class="menu-btn menu-btn-danger" id="pause-quit">
            <span class="menu-btn-icon">🚪</span> QUIT TO MENU
          </button>
        </div>
        <div class="pause-hint">Press ESC to resume</div>
      </div>
    `;

    document.getElementById('pause-resume').addEventListener('click', () => this.game.resumeGame());
    document.getElementById('pause-pitstop').addEventListener('click', (e) => {
      this.game.pitStopsEnabled = !this.game.pitStopsEnabled;
      e.target.innerHTML = `<span class="menu-btn-icon">⛽</span> Pit Stops: ${this.game.pitStopsEnabled ? 'ON' : 'OFF'}`;
    });
    document.getElementById('pause-voice').addEventListener('click', (e) => {
      const enabled = this.game.voiceEngine?.toggle();
      e.target.innerHTML = `<span class="menu-btn-icon">🔊</span> Voice: ${enabled ? 'ON' : 'OFF'}`;
    });
    document.getElementById('pause-controls').addEventListener('click', () => this.showControls(true));
    document.getElementById('pause-quit').addEventListener('click', () => this.game.returnToMenu());
  }

  // ═══ CONTROLS SCREEN ═══
  showControls(fromPause = false) {
    this.container.style.display = '';
    this.container.className = 'menu-overlay';

    this.container.innerHTML = `
      <div class="menu-controls">
        <div class="controls-header">
          <button class="vs-back" id="controls-back">← BACK</button>
          <h2 class="vs-title">CONTROLS</h2>
        </div>
        <div class="controls-grid">
          <div class="control-group">
            <h3 class="control-group-title">🏎️ Driving</h3>
            <div class="control-row"><kbd>W</kbd> / <kbd>↑</kbd> <span>Accelerate</span></div>
            <div class="control-row"><kbd>S</kbd> / <kbd>↓</kbd> <span>Brake / Reverse</span></div>
            <div class="control-row"><kbd>A</kbd> / <kbd>←</kbd> <span>Steer Left</span></div>
            <div class="control-row"><kbd>D</kbd> / <kbd>→</kbd> <span>Steer Right</span></div>
          </div>
          <div class="control-group">
            <h3 class="control-group-title">⚡ Kart Actions</h3>
            <div class="control-row"><kbd>Space</kbd> <span>Hop / Drift</span></div>
            <div class="control-row"><span class="control-note">Hold Space while turning to drift. Release for boost!</span></div>
            <div class="control-row"><span class="control-note">Blue sparks → small boost. Orange sparks → BIG boost.</span></div>
          </div>
          <div class="control-group">
            <h3 class="control-group-title">🌊 Amphibious</h3>
            <div class="control-row"><kbd>Shift</kbd> / <kbd>Q</kbd> <span>Submerge (Dive)</span></div>
            <div class="control-row"><kbd>Ctrl</kbd> / <kbd>E</kbd> <span>Surface (Rise)</span></div>
            <div class="control-row"><span class="control-note">Drive into water to auto-transform into Jetski mode!</span></div>
          </div>
          <div class="control-group">
            <h3 class="control-group-title">⚙️ System</h3>
            <div class="control-row"><kbd>Esc</kbd> <span>Pause / Resume</span></div>
          </div>
        </div>
      </div>
    `;

    document.getElementById('controls-back').addEventListener('click', () => {
      if (fromPause) {
        this.showPauseMenu();
      } else {
        this.showMainMenu();
      }
    });
  }
}
