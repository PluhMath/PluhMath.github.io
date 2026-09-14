// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Core Engine — Babylon.js Scene, Camera, Game Loop, Input
// ═══════════════════════════════════════════════════════════════

import { VEHICLES, getVehicleById, normalizeStat } from '../data/vehicles.js';
import { CHARACTERS, getDriverForVehicle } from '../data/characters.js';
import { PhysicsEngine } from './physics.js';
import { VehicleBuilder } from './vehicle-builder.js';
import { WorldBuilder } from './world.js';
import { WaterSystem } from './water.js';
import { VoiceEngine } from './voice.js';
import { HUDManager } from './hud.js';
import { MenuManager } from './menu.js';

// ─── Game States ───
export const GameState = {
  LOADING: 'LOADING',
  MENU: 'MENU',
  VEHICLE_SELECT: 'VEHICLE_SELECT',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED'
};

// ─── Main Game Class ───
export class RestrictiaGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.state = GameState.LOADING;

    // Babylon.js core
    this.engine = null;
    this.scene = null;
    this.camera = null;
    this.light = null;
    this.shadowGen = null;

    // Subsystems
    this.physics = null;
    this.vehicleBuilder = null;
    this.worldBuilder = null;
    this.waterSystem = null;
    this.voiceEngine = null;
    this.hud = null;
    this.menu = null;

    // Game state
    this.currentVehicle = null;
    this.currentDriver = null;
    this.vehicleMesh = null;
    this.selectedVehicleId = null;
    this.pitStopsEnabled = false;
    this.fuel = 100;
    this.maxFuel = 100;
    this.speed = 0;
    this.maxSpeed = 0;
    this.depth = 0;           // underwater depth
    this.isInWater = false;
    this.isSubmerged = false;
    this.currentZone = 'crimson';  // start zone

    // Input state
    this.input = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,       // Spacebar — hop/drift
      submerge: false,     // Shift — dive
      surface: false,      // Ctrl — surface
      pause: false         // Escape
    };

    // Timing
    this.lastTime = 0;
    this.deltaTime = 0;
    this.fixedStep = 1 / 60;
    this.accumulator = 0;

    // Vehicle physics state
    this.position = { x: 0, y: 0.5, z: 0 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = 0;

    // Drift state
    this.isDrifting = false;
    this.driftTimer = 0;
    this.driftStage = 0;       // 0=none, 1=blue sparks, 2=orange sparks
    this.driftDirection = 0;   // -1 left, 1 right
    this.hopActive = false;
    this.hopVelocity = 0;

    // Zone tracking
    this.lastZoneAnnouncement = '';
  }

  // ─── Initialize ───
  async init() {
    // Create Babylon engine
    this.engine = new BABYLON.Engine(this.canvas, true, {
      preserveDrawingBuffer: true,
      stencil: true,
      antialias: true
    });

    this.scene = new BABYLON.Scene(this.engine);
    // Bright, postcard-like daylight keeps the island tour readable at speed.
    this.scene.clearColor = new BABYLON.Color4(0.48, 0.78, 0.93, 1);
    this.scene.ambientColor = new BABYLON.Color3(0.42, 0.42, 0.46);
    this.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.00055;
    this.scene.fogColor = new BABYLON.Color3(0.62, 0.82, 0.91);

    // Hemispheric light (bright ambient sky)
    const hemiLight = new BABYLON.HemisphericLight('hemiLight',
      new BABYLON.Vector3(0, 1, 0), this.scene);
    hemiLight.intensity = 0.9;
    hemiLight.diffuse = new BABYLON.Color3(0.98, 0.96, 0.9);
    hemiLight.groundColor = new BABYLON.Color3(0.38, 0.43, 0.32);

    // Directional sun light
    this.light = new BABYLON.DirectionalLight('sunLight',
      new BABYLON.Vector3(-0.6, -1.2, 0.5).normalize(), this.scene);
    this.light.position = new BABYLON.Vector3(50, 100, -50);
    this.light.intensity = 1.3;
    this.light.diffuse = new BABYLON.Color3(1.0, 0.94, 0.78);

    // Shadow generator with robust settings
    try {
      this.shadowGen = new BABYLON.ShadowGenerator(1024, this.light);
      this.shadowGen.usePercentageCloserFiltering = true; // Soft PCF shadows
      this.shadowGen.filteringQuality = BABYLON.ShadowGenerator.QUALITY_HIGH;
    } catch (e) {
      console.warn('Shadow generator initialization skipped:', e);
      this.shadowGen = null;
    }

    // Initialize subsystems
    this.vehicleBuilder = new VehicleBuilder(this.scene, this.shadowGen);
    this.worldBuilder = new WorldBuilder(this.scene, this.shadowGen);
    this.waterSystem = new WaterSystem(this.scene);
    this.voiceEngine = new VoiceEngine();
    this.physics = new PhysicsEngine(this);
    this.hud = new HUDManager(this);
    this.menu = new MenuManager(this);

    // Build the world
    this.worldBuilder.buildWorld();
    this.waterSystem.createOcean();

    // Setup camera (will attach to vehicle later)
    this.setupCamera();

    // Cinematic Rendering Pipeline
    this.pipeline = new BABYLON.DefaultRenderingPipeline(
      "defaultPipeline",
      true, // HDR
      this.scene,
      [this.camera]
    );
    this.pipeline.samples = 4; // MSAA
    this.pipeline.fxaaEnabled = true;
    this.pipeline.bloomEnabled = true;
    this.pipeline.bloomThreshold = 0.8;
    this.pipeline.bloomWeight = 0.22;
    this.pipeline.imageProcessingEnabled = true;
    this.pipeline.imageProcessing.toneMappingEnabled = true;
    this.pipeline.imageProcessing.toneMappingType = BABYLON.ImageProcessingConfiguration.TONEMAPPING_ACES;
    this.pipeline.imageProcessing.contrast = 1.14;
    this.pipeline.imageProcessing.exposure = 1.0;

    // Setup input
    this.setupInput();

    // Setup window resize
    window.addEventListener('resize', () => this.engine.resize());

    // Show menu
    this.state = GameState.MENU;
    this.menu.showMainMenu();

    // Start render loop
    this.engine.runRenderLoop(() => this.gameLoop());
  }

  // ─── Camera Setup ───
  setupCamera() {
    this.camera = new BABYLON.ArcRotateCamera('chaseCamera',
      -Math.PI / 2, Math.PI / 2.8, 14,
      new BABYLON.Vector3(0, 2, -80), this.scene);

    this.camera.minZ = 0.5;
    this.camera.maxZ = 3000;
    this.camera.lowerRadiusLimit = 6;
    this.camera.upperRadiusLimit = 40;
    this.camera.lowerBetaLimit = 0.1;
    this.camera.upperBetaLimit = Math.PI / 2.05;
    this.camera.panningSensibility = 0;

    // Smooth camera tracking
    this.camera.inertia = 0.85;
    this.camera.speed = 2.5;
    this.cameraTargetPos = new BABYLON.Vector3(0, 2, -80);
    this.scene.activeCamera = this.camera;
  }

  // ─── Update Camera to Chase Vehicle ───
  updateCamera() {
    if (!this.vehicleMesh) return;

    const pos = this.vehicleMesh.position;
    const targetY = this.isSubmerged ? pos.y + 1 : pos.y + 2.0;

    // Smooth chase cam lerp towards vehicle position
    this.cameraTargetPos.x += (pos.x - this.cameraTargetPos.x) * 0.1;
    this.cameraTargetPos.y += (targetY - this.cameraTargetPos.y) * 0.1;
    this.cameraTargetPos.z += (pos.z - this.cameraTargetPos.z) * 0.1;

    // Mutate camera.target Vector3 directly (avoids recalculating angles from scratch)
    this.camera.target.copyFrom(this.cameraTargetPos);

    // Auto-rotate camera smoothly behind vehicle
    const targetAlpha = -this.rotation.y - Math.PI / 2;
    let alphaDiff = targetAlpha - this.camera.alpha;
    // Wrap around
    while (alphaDiff > Math.PI) alphaDiff -= Math.PI * 2;
    while (alphaDiff < -Math.PI) alphaDiff += Math.PI * 2;
    this.camera.alpha += alphaDiff * 0.05;

    // Tilt camera during drift
    if (this.isDrifting) {
      const tiltTarget = Math.PI / 2.65;
      this.camera.beta += (tiltTarget - this.camera.beta) * 0.04;
    } else {
      const defaultBeta = Math.PI / 2.8;
      this.camera.beta += (defaultBeta - this.camera.beta) * 0.04;
    }

    // Zoom out at high speed
    const speedRatio = Math.min(1, this.speed / (this.maxSpeed || 1));
    const targetRadius = 12 + speedRatio * 6;
    this.camera.radius += (targetRadius - this.camera.radius) * 0.04;

    // Dynamic FOV expansion on speed
    const targetFov = 0.8 + (speedRatio * 0.16); // 0.8 to 0.96 rad
    this.camera.fov += (targetFov - this.camera.fov) * 0.05;

    // Subtle camera vibration on drift boost and off-road/high speed
    if (this.isDrifting || speedRatio > 0.8) {
      const vibrationIntensity = this.isDrifting ? 0.05 : 0.02 * speedRatio;
      this.cameraTargetPos.x += (Math.random() - 0.5) * vibrationIntensity;
      this.cameraTargetPos.y += (Math.random() - 0.5) * vibrationIntensity;
    }

    // Underwater camera adjustments
    if (this.isSubmerged) {
      this.scene.fogDensity = 0.02;
      this.scene.fogColor = new BABYLON.Color3(0.0, 0.12, 0.25);
    } else {
      this.scene.fogDensity = 0.00055;
      this.scene.fogColor = new BABYLON.Color3(0.62, 0.82, 0.91);
    }
  }

  // ─── Input Setup ───
  setupInput() {
    const keyMap = {
      'KeyW': 'forward', 'ArrowUp': 'forward',
      'KeyS': 'backward', 'ArrowDown': 'backward',
      'KeyA': 'left', 'ArrowLeft': 'left',
      'KeyD': 'right', 'ArrowRight': 'right',
      'Space': 'drift',
      'ShiftLeft': 'submerge', 'ShiftRight': 'submerge', 'KeyC': 'submerge', 'KeyQ': 'submerge',
      'ControlLeft': 'surface', 'ControlRight': 'surface', 'KeyE': 'surface',
      'Escape': 'pause'
    };

    window.addEventListener('keydown', (e) => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        if (action === 'pause' && this.state === GameState.PLAYING) {
          this.pauseGame();
          return;
        }
        if (action === 'pause' && this.state === GameState.PAUSED) {
          this.resumeGame();
          return;
        }
        this.input[action] = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const action = keyMap[e.code];
      if (action) {
        e.preventDefault();
        this.input[action] = false;

        // Release drift = trigger boost if drift stage > 0
        if (action === 'drift' && this.isDrifting) {
          this.physics.releaseDrift();
        }
      }
    });
  }

  // ─── Start Game with Selected Vehicle ───
  startGame(vehicleId) {
    this.selectedVehicleId = vehicleId;
    this.currentVehicle = getVehicleById(vehicleId);
    this.currentDriver = getDriverForVehicle(vehicleId);

    // Calculate max speed from vehicle stats
    this.maxSpeed = this.currentVehicle.stats.speed * 8; // max ~80 units/sec

    // Reset game state
    this.fuel = this.maxFuel;
    this.speed = 0;
    this.depth = 0;
    this.isInWater = false;
    this.isSubmerged = false;
    this.isDrifting = false;
    this.driftTimer = 0;
    this.driftStage = 0;

    // Spawn position (South Zone — Crimson Island)
    this.position = { x: 0, y: 1, z: -80 };
    this.rotation = { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    this.angularVelocity = 0;

    // Build vehicle mesh
    if (this.vehicleMesh) {
      this.vehicleMesh.dispose();
    }
    this.vehicleMesh = this.vehicleBuilder.buildVehicle(this.currentVehicle);
    this.vehicleMesh.position = new BABYLON.Vector3(
      this.position.x, this.position.y, this.position.z
    );

    // Safely add child meshes (not the TransformNode itself) to shadow map
    if (this.shadowGen) {
      try {
        const childMeshes = this.vehicleMesh.getChildMeshes();
        for (const m of childMeshes) {
          if (m && m.subMeshes) {
            this.shadowGen.addShadowCaster(m);
          }
        }
      } catch (e) {
        console.warn('Could not add vehicle shadow caster:', e);
      }
    }

    // Immediately snap camera to vehicle
    this.cameraTargetPos.copyFromFloats(this.position.x, this.position.y + 2.0, this.position.z);
    this.camera.target.copyFrom(this.cameraTargetPos);
    this.camera.alpha = -this.rotation.y - Math.PI / 2;
    this.camera.beta = Math.PI / 2.8;
    this.camera.radius = 14;

    // Force engine resize to ensure correct canvas resolution
    this.engine.resize();

    // Setup HUD
    this.hud.show(this.currentVehicle, this.currentDriver);

    // Hide menu
    this.menu.hideAll();

    // Switch state
    this.state = GameState.PLAYING;

    // Driver intro line
    if (this.currentDriver) {
      this.voiceEngine.speak(
        this.currentDriver.lines.idle,
        this.currentDriver
      );
      this.hud.showSpeechBubble(
        this.currentDriver.lines.idle,
        this.currentDriver
      );
    }
  }

  // ─── Pause / Resume ───
  pauseGame() {
    this.state = GameState.PAUSED;
    this.menu.showPauseMenu();
    this.hud.hide();
  }

  resumeGame() {
    this.state = GameState.PLAYING;
    this.menu.hideAll();
    this.hud.show(this.currentVehicle, this.currentDriver);
  }

  returnToMenu() {
    this.state = GameState.MENU;
    if (this.vehicleMesh) {
      this.vehicleMesh.dispose();
      this.vehicleMesh = null;
    }
    this.hud.hide();
    this.menu.showMainMenu();
  }

  // ─── Game Loop ───
  gameLoop() {
    const now = performance.now() / 1000;
    this.deltaTime = Math.min(now - (this.lastTime || now), 0.1);
    this.lastTime = now;

    try {
      if (this.state === GameState.PLAYING) {
        // Fixed timestep physics
        this.accumulator += this.deltaTime;
        while (this.accumulator >= this.fixedStep) {
          this.physics.update(this.fixedStep);
          this.accumulator -= this.fixedStep;
        }

        // Update visual interpolation
        this.updateVehicleMesh();
        this.updateCamera();
        this.waterSystem.update(now);
        this.hud.update();

        // Zone detection
        this.detectZone();
      }

      // Always render
      this.scene.render();
    } catch (err) {
      console.error('GameLoop error:', err);
      const banner = document.getElementById('error-banner');
      if (banner && banner.style.display !== 'block') {
        banner.style.display = 'block';
        banner.textContent = 'GAMELOOP RENDER ERROR: ' + (err.stack || err.message);
      }
    }
  }

  // ─── Sync Vehicle Mesh to Physics State ───
  updateVehicleMesh() {
    if (!this.vehicleMesh) return;

    this.vehicleMesh.position.x = this.position.x;
    this.vehicleMesh.position.y = this.position.y;
    this.vehicleMesh.position.z = this.position.z;

    this.vehicleMesh.rotation.x = this.rotation.x;
    this.vehicleMesh.rotation.y = this.rotation.y + Math.PI; // Rotate 180° so vehicle front faces forward (+Z)
    this.vehicleMesh.rotation.z = this.rotation.z;

    // Suspension tilt during turning
    const tiltAngle = this.angularVelocity * 0.12;
    this.vehicleMesh.rotation.z += tiltAngle;

    // Drift visual lean
    if (this.isDrifting) {
      this.vehicleMesh.rotation.z -= this.driftDirection * 0.08;
    }
  }

  // ─── Zone Detection ───
  detectZone() {
    let zone = 'crimson'; // default south
    const z = this.position.z;

    if (z > 100) {
      zone = 'restrictia';  // North
    } else if (z > -20 && z < 100) {
      zone = 'divide';      // Central ocean
    } else {
      zone = 'crimson';     // South
    }

    if (zone !== this.currentZone) {
      this.currentZone = zone;

      // Announce zone change via voice
      if (this.currentDriver && this.lastZoneAnnouncement !== zone) {
        this.lastZoneAnnouncement = zone;
        const lineKey = `zone_${zone}`;
        const line = this.currentDriver.lines[lineKey];
        if (line) {
          this.voiceEngine.speak(line, this.currentDriver);
          this.hud.showSpeechBubble(line, this.currentDriver);
        }
      }
    }
  }

  // ─── Dispose ───
  dispose() {
    this.engine.dispose();
  }
}
