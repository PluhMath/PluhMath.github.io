// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// HUD Manager — Speedometer, Minimap, Fuel, Depth, Speech
// ═══════════════════════════════════════════════════════════════

export class HUDManager {
  constructor(game) {
    this.game = game;
    this.container = null;
    this.elements = {};
    this.speechTimeout = null;
    this._createHUD();
  }

  _createHUD() {
    // Main HUD container
    this.container = document.getElementById('game-hud');
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = 'game-hud';
      this.container.className = 'hud-container';
      document.body.appendChild(this.container);
    }

    this.container.innerHTML = `
      <!-- Speedometer (bottom-right) -->
      <div class="hud-speedometer" id="hud-speedo">
        <div class="speedo-ring">
          <svg viewBox="0 0 120 120" class="speedo-svg">
            <circle cx="60" cy="60" r="52" class="speedo-track" />
            <circle cx="60" cy="60" r="52" class="speedo-fill" id="speedo-fill" />
          </svg>
          <div class="speedo-value" id="speedo-value">0</div>
          <div class="speedo-unit">KM/H</div>
        </div>
        <div class="speedo-label" id="speedo-gear">DRIVE</div>
      </div>

      <!-- Minimap (top-right) -->
      <div class="hud-minimap" id="hud-minimap">
        <canvas id="minimap-canvas" width="160" height="160"></canvas>
        <div class="minimap-label" id="minimap-zone">CRIMSON ISLAND</div>
      </div>

      <!-- Fuel Bar (top-left, only when pit stops enabled) -->
      <div class="hud-fuel" id="hud-fuel" style="display:none;">
        <div class="fuel-icon">⛽</div>
        <div class="fuel-bar-track">
          <div class="fuel-bar-fill" id="fuel-fill"></div>
        </div>
        <div class="fuel-text" id="fuel-text">100%</div>
      </div>

      <!-- Depth Gauge (left, only underwater) -->
      <div class="hud-depth" id="hud-depth" style="display:none;">
        <div class="depth-icon">🌊</div>
        <div class="depth-bar-track">
          <div class="depth-bar-fill" id="depth-fill"></div>
        </div>
        <div class="depth-text" id="depth-text">0m</div>
      </div>

      <!-- Drift Sparks Indicator (bottom-center) -->
      <div class="hud-drift" id="hud-drift" style="display:none;">
        <div class="drift-sparks" id="drift-sparks">DRIFT</div>
      </div>

      <!-- Tomodachi Speech Bubble (bottom-left) -->
      <div class="hud-speech" id="hud-speech" style="display:none;">
        <div class="speech-portrait" id="speech-portrait"></div>
        <div class="speech-content">
          <div class="speech-name" id="speech-name"></div>
          <div class="speech-text" id="speech-text"></div>
        </div>
      </div>

      <!-- Vehicle/Zone info (top-center) -->
      <div class="hud-info" id="hud-info">
        <span class="hud-vehicle-name" id="hud-vehicle-name"></span>
        <span class="hud-zone" id="hud-zone-tag"></span>
      </div>

      <!-- Controls hint (fades after 5s) -->
      <div class="hud-controls-hint" id="hud-controls-hint">
        <span>W/↑ Drive</span>
        <span>A/D Steer</span>
        <span>SPACE Drift</span>
        <span>ESC Pause</span>
      </div>
    `;

    // Cache elements
    this.elements = {
      speedoFill: document.getElementById('speedo-fill'),
      speedoValue: document.getElementById('speedo-value'),
      speedoGear: document.getElementById('speedo-gear'),
      minimapCanvas: document.getElementById('minimap-canvas'),
      minimapZone: document.getElementById('minimap-zone'),
      fuelContainer: document.getElementById('hud-fuel'),
      fuelFill: document.getElementById('fuel-fill'),
      fuelText: document.getElementById('fuel-text'),
      depthContainer: document.getElementById('hud-depth'),
      depthFill: document.getElementById('depth-fill'),
      depthText: document.getElementById('depth-text'),
      driftContainer: document.getElementById('hud-drift'),
      driftSparks: document.getElementById('drift-sparks'),
      speechContainer: document.getElementById('hud-speech'),
      speechPortrait: document.getElementById('speech-portrait'),
      speechName: document.getElementById('speech-name'),
      speechText: document.getElementById('speech-text'),
      vehicleName: document.getElementById('hud-vehicle-name'),
      zoneTag: document.getElementById('hud-zone-tag'),
      controlsHint: document.getElementById('hud-controls-hint'),
      info: document.getElementById('hud-info')
    };

    // Minimap context
    this.minimapCtx = this.elements.minimapCanvas?.getContext('2d');

    // Fade controls hint after 5 seconds
    setTimeout(() => {
      if (this.elements.controlsHint) {
        this.elements.controlsHint.style.opacity = '0';
      }
    }, 5000);
  }

  show(vehicle, driver) {
    this.container.style.display = '';

    // Set vehicle name
    if (this.elements.vehicleName) {
      this.elements.vehicleName.textContent = vehicle.name;
    }

    // Show fuel bar only if pit stops enabled
    if (this.elements.fuelContainer) {
      this.elements.fuelContainer.style.display = this.game.pitStopsEnabled ? '' : 'none';
    }

    // Reset controls hint
    if (this.elements.controlsHint) {
      this.elements.controlsHint.style.opacity = '1';
      setTimeout(() => {
        if (this.elements.controlsHint) {
          this.elements.controlsHint.style.opacity = '0';
        }
      }, 5000);
    }
  }

  hide() {
    if (this.container) this.container.style.display = 'none';
  }

  update() {
    const g = this.game;

    // ─── Speedometer ───
    const displaySpeed = Math.round(g.speed * 3.6); // convert to "km/h" feel
    if (this.elements.speedoValue) {
      this.elements.speedoValue.textContent = displaySpeed;
    }

    // SVG arc fill
    if (this.elements.speedoFill) {
      const circumference = 2 * Math.PI * 52;
      const ratio = Math.min(1, g.speed / (g.maxSpeed || 80));
      const offset = circumference * (1 - ratio * 0.75); // 270° arc
      this.elements.speedoFill.style.strokeDasharray = `${circumference}`;
      this.elements.speedoFill.style.strokeDashoffset = `${offset}`;

      // Color based on speed
      if (ratio > 0.8) {
        this.elements.speedoFill.style.stroke = '#ff3d00';
      } else if (ratio > 0.5) {
        this.elements.speedoFill.style.stroke = '#ff9100';
      } else {
        this.elements.speedoFill.style.stroke = '#00e5ff';
      }
    }

    // Gear label
    if (this.elements.speedoGear) {
      if (g.isInWater && g.isSubmerged) {
        this.elements.speedoGear.textContent = 'SUBMARINE';
        this.elements.speedoGear.style.color = '#00bcd4';
      } else if (g.isInWater) {
        this.elements.speedoGear.textContent = 'JETSKI';
        this.elements.speedoGear.style.color = '#00e5ff';
      } else if (g.isDrifting) {
        this.elements.speedoGear.textContent = 'DRIFT';
        this.elements.speedoGear.style.color = '#ff9100';
      } else if (g.speed < 1) {
        this.elements.speedoGear.textContent = 'IDLE';
        this.elements.speedoGear.style.color = '#666';
      } else {
        this.elements.speedoGear.textContent = 'DRIVE';
        this.elements.speedoGear.style.color = '#00e5ff';
      }
    }

    // ─── Fuel Bar ───
    if (g.pitStopsEnabled && this.elements.fuelFill) {
      const fuelPct = (g.fuel / g.maxFuel) * 100;
      this.elements.fuelFill.style.width = fuelPct + '%';
      this.elements.fuelText.textContent = Math.round(fuelPct) + '%';

      if (fuelPct < 20) {
        this.elements.fuelFill.style.background = '#ff1744';
        this.elements.fuelFill.classList.add('fuel-critical');
      } else if (fuelPct < 50) {
        this.elements.fuelFill.style.background = '#ff9100';
        this.elements.fuelFill.classList.remove('fuel-critical');
      } else {
        this.elements.fuelFill.style.background = '#00e676';
        this.elements.fuelFill.classList.remove('fuel-critical');
      }
    }

    // ─── Depth Gauge ───
    if (this.elements.depthContainer) {
      if (g.isSubmerged) {
        this.elements.depthContainer.style.display = '';
        const depthM = Math.round(g.depth * 2);
        this.elements.depthText.textContent = depthM + 'm';
        const depthPct = Math.min(100, (g.depth / 15) * 100);
        this.elements.depthFill.style.height = depthPct + '%';
      } else {
        this.elements.depthContainer.style.display = 'none';
      }
    }

    // ─── Drift Sparks ───
    if (this.elements.driftContainer) {
      if (g.isDrifting) {
        this.elements.driftContainer.style.display = '';
        if (g.driftStage >= 2) {
          this.elements.driftSparks.textContent = '🔥 ORANGE BOOST READY';
          this.elements.driftSparks.className = 'drift-sparks drift-orange';
        } else if (g.driftStage >= 1) {
          this.elements.driftSparks.textContent = '⚡ BLUE SPARKS';
          this.elements.driftSparks.className = 'drift-sparks drift-blue';
        } else {
          this.elements.driftSparks.textContent = 'DRIFTING...';
          this.elements.driftSparks.className = 'drift-sparks';
        }
      } else {
        this.elements.driftContainer.style.display = 'none';
      }
    }

    // ─── Zone Tag ───
    if (this.elements.zoneTag) {
      const zoneNames = {
        crimson: 'CRIMSON ISLAND',
        divide: 'THE 5-MILE DIVIDE',
        restrictia: 'RESTRICTIA SECTOR'
      };
      const zoneColors = {
        crimson: '#ff1744',
        divide: '#00b0ff',
        restrictia: '#ff9100'
      };
      this.elements.zoneTag.textContent = zoneNames[g.currentZone] || '';
      this.elements.zoneTag.style.color = zoneColors[g.currentZone] || '#fff';

      if (this.elements.minimapZone) {
        this.elements.minimapZone.textContent = zoneNames[g.currentZone] || '';
        this.elements.minimapZone.style.color = zoneColors[g.currentZone] || '#fff';
      }
    }

    // ─── Minimap ───
    this._updateMinimap();
  }

  _updateMinimap() {
    const ctx = this.minimapCtx;
    if (!ctx) return;

    const g = this.game;
    const w = 160, h = 160;
    const scale = 0.16; // world units to pixels

    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Zone colors
    const centerX = w / 2 - g.position.x * scale;
    const centerZ = h / 2 - g.position.z * scale;

    // South zone (crimson - red tint)
    ctx.fillStyle = 'rgba(255, 23, 68, 0.15)';
    ctx.fillRect(centerX - 200 * scale, centerZ + 20 * scale, 400 * scale, 200 * scale);

    // Central zone (blue - water)
    ctx.fillStyle = 'rgba(0, 176, 255, 0.2)';
    ctx.fillRect(centerX - 200 * scale, centerZ - 100 * scale, 400 * scale, 120 * scale);

    // North zone (orange tint)
    ctx.fillStyle = 'rgba(255, 145, 0, 0.15)';
    ctx.fillRect(centerX - 200 * scale, centerZ - 300 * scale, 400 * scale, 200 * scale);

    // Player dot (always center)
    ctx.fillStyle = '#00ff88';
    ctx.shadowColor = '#00ff88';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    const dirX = Math.sin(g.rotation.y) * 10;
    const dirZ = Math.cos(g.rotation.y) * 10;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2, h / 2);
    ctx.lineTo(w / 2 + dirX, h / 2 - dirZ);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Pit stops
    if (g.pitStopsEnabled && g.worldBuilder) {
      const pits = g.worldBuilder.pitStopPositions || [];
      ctx.fillStyle = '#00e676';
      pits.forEach(pit => {
        const px = w / 2 + (pit.x - g.position.x) * scale;
        const pz = h / 2 + (pit.z - g.position.z) * scale;
        if (px > 0 && px < w && pz > 0 && pz < h) {
          ctx.beginPath();
          ctx.arc(px, pz, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    }

    // Border ring
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2 - 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ─── Tomodachi Speech Bubble ───
  showSpeechBubble(text, character) {
    if (!this.elements.speechContainer) return;

    // Clear existing timeout
    if (this.speechTimeout) clearTimeout(this.speechTimeout);

    // Set portrait
    this.elements.speechPortrait.style.background = character.portraitColor;
    this.elements.speechPortrait.textContent = character.name.charAt(0);

    // Set name
    this.elements.speechName.textContent = character.name;
    this.elements.speechName.style.color = character.portraitColor;

    // Animated text reveal
    this.elements.speechText.textContent = '';
    this.elements.speechContainer.style.display = '';
    this.elements.speechContainer.classList.add('speech-enter');

    let charIndex = 0;
    const textInterval = setInterval(() => {
      if (charIndex < text.length) {
        this.elements.speechText.textContent += text[charIndex];
        charIndex++;
      } else {
        clearInterval(textInterval);
      }
    }, 35);

    // Auto-hide after duration
    const duration = Math.max(3000, text.length * 60);
    this.speechTimeout = setTimeout(() => {
      this.elements.speechContainer.classList.remove('speech-enter');
      this.elements.speechContainer.classList.add('speech-exit');
      setTimeout(() => {
        this.elements.speechContainer.style.display = 'none';
        this.elements.speechContainer.classList.remove('speech-exit');
      }, 300);
    }, duration);
  }
}
