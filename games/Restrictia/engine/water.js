// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Water System — Ocean, Jetski Mode, Submarine, Particles
// ═══════════════════════════════════════════════════════════════

export class WaterSystem {
  constructor(scene) {
    this.scene = scene;
    this.waterMesh = null;
    this.waterMat = null;
    this.splashSystems = [];
    this.wakeSystems = [];
    this.WATER_LEVEL = -0.5;
  }

  createOcean() {
    // Create a large subdivided ground for the ocean surface
    this.waterMesh = BABYLON.MeshBuilder.CreateGround('ocean', {
      width: 500,
      height: 500,
      subdivisions: 40,
      updatable: true
    }, this.scene);

    // Water material — clear tropical blue with soft, playful reflections.
    this.waterMat = new BABYLON.StandardMaterial('waterMat', this.scene);
    this.waterMat.diffuseColor = new BABYLON.Color3(0.04, 0.53, 0.69);
    this.waterMat.specularColor = new BABYLON.Color3(0.95, 0.98, 0.9);
    this.waterMat.emissiveColor = new BABYLON.Color3(0.02, 0.23, 0.32);
    this.waterMat.alpha = 0.84;
    this.waterMat.backFaceCulling = false;
    this.waterMat.specularPower = 64;

    this.waterMesh.material = this.waterMat;
    this.waterMesh.position.y = this.WATER_LEVEL;

    // Store original vertex positions for wave animation
    const positions = this.waterMesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
    this._originalPositions = new Float32Array(positions);
    this._positions = new Float32Array(positions);

    // Create underwater caustic light
    this._createUnderwaterLight();
  }

  _createUnderwaterLight() {
    // Point light beneath water for caustic glow effect
    this.underwaterLight = new BABYLON.PointLight('underwaterLight',
      new BABYLON.Vector3(0, -4, 40), this.scene);
    this.underwaterLight.intensity = 0.3;
    this.underwaterLight.diffuse = new BABYLON.Color3(0.1, 0.4, 0.6);
    this.underwaterLight.range = 80;
  }

  update(time) {
    if (!this.waterMesh || !this._originalPositions) return;

    // Animate wave vertices
    const positions = this._positions;
    const orig = this._originalPositions;
    const len = positions.length;

    for (let i = 0; i < len; i += 3) {
      const ox = orig[i];
      const oz = orig[i + 2];

      // Multi-layered wave function
      const wave1 = Math.sin(time * 1.2 + ox * 0.04 + oz * 0.03) * 0.34;
      const wave2 = Math.sin(time * 0.8 + ox * 0.07 - oz * 0.05) * 0.19;
      const wave3 = Math.sin(time * 2.0 + ox * 0.12 + oz * 0.1) * 0.1;
      const wave4 = Math.cos(time * 0.5 + ox * 0.02 + oz * 0.08) * 0.22;

      positions[i + 1] = orig[i + 1] + wave1 + wave2 + wave3 + wave4;
    }

    this.waterMesh.updateVerticesData(BABYLON.VertexBuffer.PositionKind, positions);

    // Animate underwater caustic light
    if (this.underwaterLight) {
      this.underwaterLight.intensity = 0.2 + Math.sin(time * 3) * 0.1;
      this.underwaterLight.position.x = Math.sin(time * 0.5) * 30;
      this.underwaterLight.position.z = 40 + Math.cos(time * 0.3) * 30;
    }

    // Clean up expired particle systems safely
    this.splashSystems = this.splashSystems.filter(s => {
      try {
        if (typeof s.isStarted === 'function' && s.isStarted()) return true;
        if (typeof s.isAlive === 'function' && s.isAlive()) return true;
        s.dispose();
      } catch (e) {
        // ignore
      }
      return false;
    });
  }

  // ─── Splash Effect on Water Entry ───
  spawnSplash(x, z) {
    const splash = new BABYLON.ParticleSystem('splash', 200, this.scene);

    // Particle texture (create a simple white circle procedurally)
    splash.createPointEmitter(
      new BABYLON.Vector3(-2, 5, -2),
      new BABYLON.Vector3(2, 8, 2)
    );

    // Use default particle texture
    splash.particleTexture = this._getParticleTexture();

    splash.emitter = new BABYLON.Vector3(x, this.WATER_LEVEL, z);
    splash.minLifeTime = 0.3;
    splash.maxLifeTime = 0.8;
    splash.minSize = 0.2;
    splash.maxSize = 0.6;
    splash.emitRate = 0;
    splash.manualEmitCount = 80;
    splash.gravity = new BABYLON.Vector3(0, -15, 0);

    // Water colors
    splash.color1 = new BABYLON.Color4(0.3, 0.6, 0.9, 0.8);
    splash.color2 = new BABYLON.Color4(0.5, 0.8, 1.0, 0.6);
    splash.colorDead = new BABYLON.Color4(0.2, 0.4, 0.7, 0.0);

    splash.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;
    splash.start();

    // Auto-stop after burst
    setTimeout(() => splash.stop(), 200);
    this.splashSystems.push(splash);
  }

  // ─── Wake Trail Behind Moving Vehicle ───
  spawnWake(x, z, speed) {
    if (speed < 3) return;
    if (this.wakeSystems.length > 5) return; // limit active wakes

    const wake = new BABYLON.ParticleSystem('wake', 50, this.scene);
    wake.particleTexture = this._getParticleTexture();

    wake.createPointEmitter(
      new BABYLON.Vector3(-0.5, 0, -0.5),
      new BABYLON.Vector3(0.5, 1, 0.5)
    );

    wake.emitter = new BABYLON.Vector3(x, this.WATER_LEVEL + 0.1, z);
    wake.minLifeTime = 0.5;
    wake.maxLifeTime = 1.5;
    wake.minSize = 0.3;
    wake.maxSize = 0.8 + speed * 0.02;
    wake.emitRate = 0;
    wake.manualEmitCount = 15;
    wake.gravity = new BABYLON.Vector3(0, -3, 0);

    wake.color1 = new BABYLON.Color4(0.7, 0.85, 1.0, 0.5);
    wake.color2 = new BABYLON.Color4(0.5, 0.7, 0.9, 0.3);
    wake.colorDead = new BABYLON.Color4(0.3, 0.5, 0.7, 0.0);
    wake.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    wake.start();
    setTimeout(() => wake.stop(), 100);
    this.splashSystems.push(wake);
  }

  // ─── Bubble Particles (Underwater) ───
  spawnBubbles(x, y, z) {
    const bubbles = new BABYLON.ParticleSystem('bubbles', 30, this.scene);
    bubbles.particleTexture = this._getParticleTexture();

    bubbles.createPointEmitter(
      new BABYLON.Vector3(-0.3, 1, -0.3),
      new BABYLON.Vector3(0.3, 3, 0.3)
    );

    bubbles.emitter = new BABYLON.Vector3(x, y, z);
    bubbles.minLifeTime = 1.0;
    bubbles.maxLifeTime = 3.0;
    bubbles.minSize = 0.05;
    bubbles.maxSize = 0.2;
    bubbles.emitRate = 0;
    bubbles.manualEmitCount = 20;
    bubbles.gravity = new BABYLON.Vector3(0, 2, 0); // bubbles float up

    bubbles.color1 = new BABYLON.Color4(0.5, 0.7, 0.9, 0.6);
    bubbles.color2 = new BABYLON.Color4(0.6, 0.8, 1.0, 0.4);
    bubbles.colorDead = new BABYLON.Color4(0.4, 0.6, 0.8, 0.0);
    bubbles.blendMode = BABYLON.ParticleSystem.BLENDMODE_ADD;

    bubbles.start();
    setTimeout(() => bubbles.stop(), 300);
    this.splashSystems.push(bubbles);
  }

  // ─── Create simple procedural particle texture ───
  _getParticleTexture() {
    if (this._cachedTexture) return this._cachedTexture;

    // Create a dynamic texture for particles (white circle)
    const size = 64;
    const dt = new BABYLON.DynamicTexture('particleTex', size, this.scene, false);
    const ctx = dt.getContext();

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.4, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    dt.update();

    this._cachedTexture = dt;
    return dt;
  }
}
