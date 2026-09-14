// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Vehicle Builder — Procedural 3D Mesh Generation
// ═══════════════════════════════════════════════════════════════

export class VehicleBuilder {
  constructor(scene, shadowGen) {
    this.scene = scene;
    this.shadowGen = shadowGen;
  }

  buildVehicle(vehicleData) {
    const v = vehicleData.visual;
    const parent = new BABYLON.TransformNode('vehicle_' + vehicleData.id, this.scene);
    parent.exhaustFlames = [];

    // Build body based on type
    switch (v.type) {
      case 'sled': this._buildSled(parent, v); break;
      case 'heavy_truck': this._buildHeavyTruck(parent, v); break;
      case 'crossover': this._buildCrossover(parent, v); break;
      case 'van': this._buildVan(parent, v); break;
      case 'armored_cruiser': this._buildArmoredCruiser(parent, v); break;
      case 'roadster': this._buildRoadster(parent, v); break;
      default: this._buildGenericBody(parent, v); break;
    }

    // Mario Kart-style universal features
    this._buildWheels(parent, v);
    this._buildHeadlights(parent, v);
    this._buildCockpit(parent, v);
    this._buildExhaust(parent, v);

    // Optional extras
    if (v.hasLiDAR) this._buildLiDAR(parent, v);
    if (v.hasLightbar) this._buildLightbar(parent, v);
    if (v.hasSpoiler) this._buildSpoiler(parent, v);
    if (v.hasBatteryPack) this._buildBatteryPack(parent, v);

    return parent;
  }

  _mat(name, r, g, b, metallic = 0.3, roughness = 0.6) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = new BABYLON.Color3(r, g, b);
    mat.specularColor = new BABYLON.Color3(1 - roughness, 1 - roughness, 1 - roughness);
    return mat;
  }

  _glow(name, r, g, b) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = new BABYLON.Color3(r, g, b);
    mat.emissiveColor = new BABYLON.Color3(r * 0.8, g * 0.8, b * 0.8);
    return mat;
  }

  // ═══ SLED (MilesTech Mk. I) ═══
  _buildSled(parent, v) {
    // Flat wooden pallet base
    const base = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.4, depth: v.bodyLength
    }, this.scene);
    base.material = this._mat('sledWood', ...v.bodyColor, 0.1, 0.85);
    base.parent = parent;
    base.position.y = 0.3;
    base.receiveShadows = true;

    // Pallet slats
    for (let i = -1; i <= 1; i++) {
      const slat = BABYLON.MeshBuilder.CreateBox('slat' + i, {
        width: v.bodyWidth * 1.05, height: 0.08, depth: 0.3
      }, this.scene);
      slat.material = base.material;
      slat.parent = parent;
      slat.position.set(0, 0.15, i * 1.2);
    }

    // Battery block on top
    const batteryBlock = BABYLON.MeshBuilder.CreateBox('batteryMain', {
      width: v.bodyWidth * 0.6, height: 0.35, depth: v.bodyLength * 0.5
    }, this.scene);
    batteryBlock.material = this._mat('batteryMat', 0.15, 0.15, 0.18, 0.6, 0.4);
    batteryBlock.parent = parent;
    batteryBlock.position.set(0, 0.6, -0.3);

    // Cockpit shield
    const shield = BABYLON.MeshBuilder.CreateBox('shield', {
      width: v.bodyWidth * 0.8, height: 0.5, depth: 0.1
    }, this.scene);
    shield.material = this._mat('shieldMat', 0.2, 0.8, 0.9, 0.7, 0.3);
    shield.parent = parent;
    shield.position.set(0, 0.7, -v.bodyLength * 0.3);
  }

  // ═══ HEAVY TRUCK (Surveyor 26) ═══
  _buildHeavyTruck(parent, v) {
    // Main chassis
    const chassis = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.6, depth: v.bodyLength
    }, this.scene);
    chassis.material = this._mat('truckBody', ...v.bodyColor, 0.5, 0.5);
    chassis.parent = parent;
    chassis.position.y = 0.7;
    chassis.receiveShadows = true;

    // Cab
    const cab = BABYLON.MeshBuilder.CreateBox('cab', {
      width: v.bodyWidth * 0.85, height: v.bodyHeight * 0.5, depth: v.bodyLength * 0.35
    }, this.scene);
    cab.material = chassis.material;
    cab.parent = parent;
    cab.position.set(0, 1.35, -v.bodyLength * 0.25);

    // Windshield
    const windshield = BABYLON.MeshBuilder.CreateBox('windshield', {
      width: v.bodyWidth * 0.75, height: v.bodyHeight * 0.35, depth: 0.05
    }, this.scene);
    windshield.material = this._mat('glass', 0.3, 0.5, 0.6, 0.1, 0.15);
    windshield.parent = parent;
    windshield.position.set(0, 1.4, -v.bodyLength * 0.43);

    // Armor plating accents
    if (v.hasArmorPlating) {
      const plates = [
        { x: -v.bodyWidth / 2 - 0.05, z: 0 },
        { x: v.bodyWidth / 2 + 0.05, z: 0 }
      ];
      plates.forEach((p, i) => {
        const plate = BABYLON.MeshBuilder.CreateBox('armor' + i, {
          width: 0.1, height: v.bodyHeight * 0.5, depth: v.bodyLength * 0.8
        }, this.scene);
        plate.material = this._mat('armorMat', ...v.accentColor, 0.4, 0.6);
        plate.parent = parent;
        plate.position.set(p.x, 0.7, p.z);
      });
    }

    // Cargo bed
    const bed = BABYLON.MeshBuilder.CreateBox('bed', {
      width: v.bodyWidth * 0.9, height: 0.1, depth: v.bodyLength * 0.4
    }, this.scene);
    bed.material = this._mat('bedMat', 0.25, 0.25, 0.28, 0.4, 0.6);
    bed.parent = parent;
    bed.position.set(0, 1.05, v.bodyLength * 0.2);
  }

  // ═══ CROSSOVER (Waymo I-PACE) ═══
  _buildCrossover(parent, v) {
    // Rounded body
    const body = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.5, depth: v.bodyLength
    }, this.scene);
    body.material = this._mat('crossBody', ...v.bodyColor, 0.6, 0.35);
    body.parent = parent;
    body.position.y = 0.55;
    body.receiveShadows = true;

    // Roof
    const roof = BABYLON.MeshBuilder.CreateBox('roof', {
      width: v.bodyWidth * 0.85, height: v.bodyHeight * 0.35, depth: v.bodyLength * 0.55
    }, this.scene);
    roof.material = body.material;
    roof.parent = parent;
    roof.position.set(0, 1.05, -0.2);

    // Windshield front
    const wind = BABYLON.MeshBuilder.CreateBox('windshield', {
      width: v.bodyWidth * 0.8, height: v.bodyHeight * 0.3, depth: 0.05
    }, this.scene);
    wind.material = this._mat('glass', 0.15, 0.2, 0.3, 0.1, 0.1);
    wind.parent = parent;
    wind.position.set(0, 1.0, -v.bodyLength * 0.35);
    wind.rotation.x = -0.2;

    // Side windows
    [-1, 1].forEach((side, i) => {
      const win = BABYLON.MeshBuilder.CreateBox('sideWin' + i, {
        width: 0.04, height: v.bodyHeight * 0.25, depth: v.bodyLength * 0.3
      }, this.scene);
      win.material = wind.material;
      win.parent = parent;
      win.position.set(side * v.bodyWidth * 0.43, 1.0, -0.2);
    });

    // Sensor bumps
    const sensorMat = this._glow('sensorGlow', ...v.accentColor);
    [-1, 1].forEach((side, i) => {
      const sensor = BABYLON.MeshBuilder.CreateSphere('sensor' + i, { diameter: 0.15 }, this.scene);
      sensor.material = sensorMat;
      sensor.parent = parent;
      sensor.position.set(side * v.bodyWidth * 0.45, 0.85, v.bodyLength * 0.35);
    });
  }

  // ═══ VAN (Waymo Ojai) ═══
  _buildVan(parent, v) {
    // Boxy tall body
    const body = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.65, depth: v.bodyLength
    }, this.scene);
    body.material = this._mat('vanBody', ...v.bodyColor, 0.5, 0.4);
    body.parent = parent;
    body.position.y = 0.8;
    body.receiveShadows = true;

    // Upper cabin
    const cabin = BABYLON.MeshBuilder.CreateBox('cabin', {
      width: v.bodyWidth * 0.95, height: v.bodyHeight * 0.4, depth: v.bodyLength * 0.85
    }, this.scene);
    cabin.material = body.material;
    cabin.parent = parent;
    cabin.position.set(0, 1.5, 0.1);

    // Large windshield
    const wind = BABYLON.MeshBuilder.CreateBox('windshield', {
      width: v.bodyWidth * 0.85, height: v.bodyHeight * 0.35, depth: 0.04
    }, this.scene);
    wind.material = this._mat('glass', 0.2, 0.25, 0.3, 0.1, 0.1);
    wind.parent = parent;
    wind.position.set(0, 1.45, -v.bodyLength * 0.43);

    // Green accent stripe
    const stripe = BABYLON.MeshBuilder.CreateBox('stripe', {
      width: v.bodyWidth + 0.02, height: 0.08, depth: v.bodyLength + 0.02
    }, this.scene);
    stripe.material = this._glow('stripeGlow', ...v.accentColor);
    stripe.parent = parent;
    stripe.position.y = 0.95;

    // Sliding door mark
    const door = BABYLON.MeshBuilder.CreateBox('door', {
      width: 0.03, height: v.bodyHeight * 0.5, depth: v.bodyLength * 0.3
    }, this.scene);
    door.material = this._mat('doorLine', 0.3, 0.3, 0.32);
    door.parent = parent;
    door.position.set(v.bodyWidth / 2 + 0.01, 1.1, 0.3);
  }

  // ═══ ARMORED CRUISER (Bunny Edict Enforcer) ═══
  _buildArmoredCruiser(parent, v) {
    // Low angular body
    const body = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.5, depth: v.bodyLength
    }, this.scene);
    body.material = this._mat('enforcerBody', ...v.bodyColor, 0.7, 0.3);
    body.parent = parent;
    body.position.y = 0.55;
    body.receiveShadows = true;

    // Cabin
    const cabin = BABYLON.MeshBuilder.CreateBox('cabin', {
      width: v.bodyWidth * 0.8, height: v.bodyHeight * 0.35, depth: v.bodyLength * 0.45
    }, this.scene);
    cabin.material = body.material;
    cabin.parent = parent;
    cabin.position.set(0, 1.0, -0.15);

    // Windshield
    const wind = BABYLON.MeshBuilder.CreateBox('windshield', {
      width: v.bodyWidth * 0.7, height: v.bodyHeight * 0.28, depth: 0.04
    }, this.scene);
    wind.material = this._mat('glass', 0.1, 0.1, 0.15, 0.1, 0.1);
    wind.parent = parent;
    wind.position.set(0, 0.95, -v.bodyLength * 0.35);
    wind.rotation.x = -0.15;

    // Bull bar
    const bar = BABYLON.MeshBuilder.CreateBox('bullbar', {
      width: v.bodyWidth * 0.9, height: 0.15, depth: 0.1
    }, this.scene);
    bar.material = this._mat('barMat', 0.4, 0.4, 0.42, 0.7, 0.4);
    bar.parent = parent;
    bar.position.set(0, 0.4, -v.bodyLength * 0.52);

    // Bunny decal (simple white circle with rabbit ears)
    if (v.hasBunnyDecal) {
      const decal = BABYLON.MeshBuilder.CreateDisc('bunny', { radius: 0.3, tessellation: 24 }, this.scene);
      decal.material = this._mat('bunnyMat', 1.0, 1.0, 1.0, 0.0, 0.9);
      decal.parent = parent;
      decal.position.set(0, 0.85, -v.bodyLength * 0.501);
      decal.rotation.y = Math.PI;

      // Ears
      [-0.12, 0.12].forEach((xOff, i) => {
        const ear = BABYLON.MeshBuilder.CreateBox('ear' + i, {
          width: 0.08, height: 0.2, depth: 0.02
        }, this.scene);
        ear.material = decal.material;
        ear.parent = parent;
        ear.position.set(xOff, 1.15, -v.bodyLength * 0.5);
      });
    }
  }

  // ═══ ROADSTER (Crimson Grand Tourer) ═══
  _buildRoadster(parent, v) {
    // Low sleek body
    const body = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.45, depth: v.bodyLength
    }, this.scene);
    body.material = this._mat('roadsterBody', ...v.bodyColor, 0.7, 0.25);
    body.parent = parent;
    body.position.y = 0.35;
    body.receiveShadows = true;

    // Hood scoop
    const scoop = BABYLON.MeshBuilder.CreateBox('scoop', {
      width: v.bodyWidth * 0.25, height: 0.08, depth: v.bodyLength * 0.2
    }, this.scene);
    scoop.material = this._mat('scoopMat', 0.1, 0.1, 0.1, 0.8, 0.3);
    scoop.parent = parent;
    scoop.position.set(0, 0.6, -v.bodyLength * 0.2);

    // Cabin (very low)
    const cabin = BABYLON.MeshBuilder.CreateBox('cabin', {
      width: v.bodyWidth * 0.7, height: v.bodyHeight * 0.35, depth: v.bodyLength * 0.3
    }, this.scene);
    cabin.material = body.material;
    cabin.parent = parent;
    cabin.position.set(0, 0.65, 0);

    // Windshield
    const wind = BABYLON.MeshBuilder.CreateBox('windshield', {
      width: v.bodyWidth * 0.65, height: v.bodyHeight * 0.25, depth: 0.04
    }, this.scene);
    wind.material = this._mat('glass', 0.15, 0.15, 0.2, 0.1, 0.1);
    wind.parent = parent;
    wind.position.set(0, 0.65, -v.bodyLength * 0.15);
    wind.rotation.x = -0.35;

    // Gold trim line
    const trim = BABYLON.MeshBuilder.CreateBox('trim', {
      width: v.bodyWidth + 0.02, height: 0.04, depth: v.bodyLength + 0.02
    }, this.scene);
    trim.material = this._glow('goldTrim', ...v.accentColor);
    trim.parent = parent;
    trim.position.y = 0.45;

    // Rear taillight strip
    const taillight = BABYLON.MeshBuilder.CreateBox('taillight', {
      width: v.bodyWidth * 0.8, height: 0.06, depth: 0.04
    }, this.scene);
    taillight.material = this._glow('taillightMat', 1.0, 0.1, 0.1);
    taillight.parent = parent;
    taillight.position.set(0, 0.4, v.bodyLength * 0.49);
  }

  _buildGenericBody(parent, v) {
    const body = BABYLON.MeshBuilder.CreateBox('body', {
      width: v.bodyWidth, height: v.bodyHeight * 0.5, depth: v.bodyLength
    }, this.scene);
    body.material = this._mat('genericBody', ...v.bodyColor);
    body.parent = parent;
    body.position.y = 0.5;
    body.receiveShadows = true;
  }

  // ─── CHUNKY KART WHEELS ───
  _buildWheels(parent, v) {
    const wheelMat = this._mat('wheelMat', 0.1, 0.1, 0.12, 0.2, 0.9); // dark rubber
    const rimMat = this._mat('rimMat', 0.8, 0.8, 0.85, 0.9, 0.2); // chrome rim
    const springMat = this._mat('springMat', 0.9, 0.2, 0.1, 0.8, 0.3); // red metallic coil

    // Widen track width for kart look
    const trackWidth = v.bodyWidth / 2 + 0.3;
    const wheelBase = v.bodyLength * 0.4;
    
    // Make tires chunkier than default stats
    const tRadius = Math.max(v.wheelRadius, 0.35);
    const tWidth = Math.max(v.wheelWidth, 0.3);

    const positions = [
      { x: -trackWidth, z: -wheelBase, name: 'FL' },
      { x: trackWidth, z: -wheelBase, name: 'FR' },
      { x: -trackWidth, z: wheelBase, name: 'RL' },
      { x: trackWidth, z: wheelBase, name: 'RR' }
    ];

    positions.forEach((pos, i) => {
      // Suspension arm/axle
      const axle = BABYLON.MeshBuilder.CreateCylinder('axle' + i, {
        diameter: 0.1, height: trackWidth - v.bodyWidth / 2 + 0.2, tessellation: 8
      }, this.scene);
      axle.material = rimMat;
      axle.parent = parent;
      axle.position.set(pos.x > 0 ? pos.x - 0.15 : pos.x + 0.15, tRadius, pos.z);
      axle.rotation.z = Math.PI / 2;

      // Exposed suspension coil spring (visual approximation)
      const coil = BABYLON.MeshBuilder.CreateCylinder('coil' + i, {
        diameter: 0.25, height: 0.4, tessellation: 12
      }, this.scene);
      coil.material = springMat;
      coil.parent = parent;
      coil.position.set(pos.x > 0 ? pos.x - 0.2 : pos.x + 0.2, tRadius + 0.2, pos.z);
      
      // Chunky Tire
      const wheel = BABYLON.MeshBuilder.CreateCylinder('wheel' + i, {
        diameter: tRadius * 2,
        height: tWidth,
        tessellation: 24
      }, this.scene);
      wheel.material = wheelMat;
      wheel.parent = parent;
      wheel.position.set(pos.x, tRadius, pos.z);
      wheel.rotation.z = Math.PI / 2;

      // Chrome rim
      const rim = BABYLON.MeshBuilder.CreateCylinder('rim' + i, {
        diameter: tRadius * 1.3,
        height: tWidth + 0.05,
        tessellation: 16
      }, this.scene);
      rim.material = rimMat;
      rim.parent = wheel;
    });
  }

  // ─── HEADLIGHTS ───
  _buildHeadlights(parent, v) {
    const lensMat = this._glow('headlightGlow', 1.0, 0.98, 0.9);
    const housingMat = this._mat('housingMat', 0.2, 0.2, 0.2, 0.8, 0.5);

    [-0.3, 0.3].forEach((xOff, i) => {
      // Housing
      const housing = BABYLON.MeshBuilder.CreateCylinder('hlHousing' + i, {
        diameter: 0.25, height: 0.15, tessellation: 16
      }, this.scene);
      housing.material = housingMat;
      housing.parent = parent;
      housing.position.set(xOff * v.bodyWidth, v.bodyHeight * 0.6, v.bodyLength * 0.48);
      housing.rotation.x = Math.PI / 2;

      // Glowing Lens
      const lens = BABYLON.MeshBuilder.CreateCylinder('hlLens' + i, {
        diameter: 0.2, height: 0.18, tessellation: 16
      }, this.scene);
      lens.material = lensMat;
      lens.parent = parent;
      lens.position.set(xOff * v.bodyWidth, v.bodyHeight * 0.6, v.bodyLength * 0.48);
      lens.rotation.x = Math.PI / 2;

      // Actual SpotLight
      const spot = new BABYLON.SpotLight('hlSpot' + i,
        new BABYLON.Vector3(xOff * v.bodyWidth, v.bodyHeight * 0.6, v.bodyLength * 0.5),
        new BABYLON.Vector3(0, -0.1, 1),
        Math.PI / 3, 2, this.scene);
      spot.diffuse = new BABYLON.Color3(1.0, 0.98, 0.9);
      spot.intensity = 1.5;
      spot.parent = parent;
    });
  }

  // ─── COCKPIT ───
  _buildCockpit(parent, v) {
    // Cutout / Seat area
    const seat = BABYLON.MeshBuilder.CreateBox('seat', {
      width: v.bodyWidth * 0.6, height: 0.4, depth: 0.5
    }, this.scene);
    seat.material = this._mat('seatMat', 0.1, 0.1, 0.1, 0.2, 0.9);
    seat.parent = parent;
    seat.position.set(0, v.bodyHeight * 0.4, -v.bodyLength * 0.1);

    // Steering Wheel
    const wheelHousing = BABYLON.MeshBuilder.CreateCylinder('strHousing', {
      diameter: 0.05, height: 0.3, tessellation: 8
    }, this.scene);
    wheelHousing.material = this._mat('strMat', 0.2, 0.2, 0.2);
    wheelHousing.parent = parent;
    wheelHousing.position.set(0, v.bodyHeight * 0.6, -v.bodyLength * 0.02);
    wheelHousing.rotation.x = -Math.PI / 4;

    const strWheel = BABYLON.MeshBuilder.CreateTorus('strWheel', {
      diameter: 0.3, thickness: 0.04, tessellation: 16
    }, this.scene);
    strWheel.material = this._mat('strWheelMat', 0.8, 0.1, 0.1, 0.5, 0.5);
    strWheel.parent = wheelHousing;
    strWheel.position.y = 0.15;
    
    // Roll cage bars
    const barMat = this._mat('cageMat', 0.7, 0.7, 0.75, 0.8, 0.3); // Chrome
    const bar = BABYLON.MeshBuilder.CreateTorus('rollbar', {
      diameter: v.bodyWidth * 0.8, thickness: 0.08, tessellation: 16
    }, this.scene);
    bar.material = barMat;
    bar.parent = parent;
    bar.position.set(0, v.bodyHeight * 0.8, -v.bodyLength * 0.25);
    bar.rotation.x = Math.PI / 2;
  }

  // ─── EXHAUST / THRUSTERS ───
  _buildExhaust(parent, v) {
    const pipeMat = this._mat('pipeMat', 0.8, 0.8, 0.85, 0.9, 0.2); // Chrome

    [-0.3, 0.3].forEach((xOff, i) => {
      // Twin tailpipes
      const pipe = BABYLON.MeshBuilder.CreateCylinder('exhaust' + i, {
        diameter: 0.15, height: 0.3, tessellation: 12
      }, this.scene);
      pipe.material = pipeMat;
      pipe.parent = parent;
      pipe.position.set(xOff * v.bodyWidth, v.bodyHeight * 0.3, -v.bodyLength * 0.5);
      pipe.rotation.x = Math.PI / 2;

      // Flame particle system
      const flame = new BABYLON.ParticleSystem("flames", 50, this.scene);
      flame.particleTexture = new BABYLON.Texture("https://assets.babylonjs.com/textures/flare.png", this.scene);
      flame.emitter = pipe;
      flame.minEmitBox = new BABYLON.Vector3(-0.05, 0, -0.05);
      flame.maxEmitBox = new BABYLON.Vector3(0.05, 0, 0.05);
      
      flame.color1 = new BABYLON.Color4(1, 0.5, 0, 1.0);
      flame.color2 = new BABYLON.Color4(1, 0.1, 0, 1.0);
      flame.colorDead = new BABYLON.Color4(0, 0, 0, 0.0);
      
      flame.minSize = 0.1;
      flame.maxSize = 0.3;
      flame.minLifeTime = 0.1;
      flame.maxLifeTime = 0.2;
      flame.emitRate = 0; // Triggered on boost/acceleration
      
      // Point backwards (-Y in pipe local space since pipe is rotated)
      flame.direction1 = new BABYLON.Vector3(0, -1, 0);
      flame.direction2 = new BABYLON.Vector3(0, -1, 0);
      flame.minEmitPower = 1;
      flame.maxEmitPower = 3;
      flame.updateSpeed = 0.01;
      
      flame.start();
      
      // We attach the particle system to the mesh so physics.js can turn it on/off
      parent.exhaustFlames.push(flame);
    });
  }

  // ─── LiDAR SPINNER ───
  _buildLiDAR(parent, v) {
    const lidarBase = BABYLON.MeshBuilder.CreateCylinder('lidarBase', {
      diameter: 0.4, height: 0.15, tessellation: 16
    }, this.scene);
    lidarBase.material = this._mat('lidarBaseMat', 0.2, 0.2, 0.22, 0.5, 0.4);
    lidarBase.parent = parent;

    const topY = v.type === 'van' ? 1.75 : 1.3;
    lidarBase.position.set(0, topY, -0.1);

    const spinner = BABYLON.MeshBuilder.CreateCylinder('lidarSpinner', {
      diameter: 0.3, height: 0.2, tessellation: 12
    }, this.scene);
    const lidarColor = v.lidarColor || [0.2, 0.7, 1.0];
    spinner.material = this._glow('lidarGlow', ...lidarColor);
    spinner.parent = parent;
    spinner.position.set(0, topY + 0.15, -0.1);

    // Animate spinning
    this.scene.registerBeforeRender(() => {
      spinner.rotation.y += 0.08;
    });
  }

  // ─── LIGHTBAR (Police) ───
  _buildLightbar(parent, v) {
    const barBase = BABYLON.MeshBuilder.CreateBox('lightbar', {
      width: v.bodyWidth * 0.6, height: 0.08, depth: 0.3
    }, this.scene);
    barBase.material = this._mat('lightbarBase', 0.15, 0.15, 0.15);
    barBase.parent = parent;
    barBase.position.set(0, 1.25, -0.15);

    // Red light
    const redLight = BABYLON.MeshBuilder.CreateSphere('redLight', { diameter: 0.12 }, this.scene);
    redLight.material = this._glow('redGlow', 1.0, 0.1, 0.1);
    redLight.parent = parent;
    redLight.position.set(-v.bodyWidth * 0.2, 1.32, -0.15);

    // Blue light
    const blueLight = BABYLON.MeshBuilder.CreateSphere('blueLight', { diameter: 0.12 }, this.scene);
    blueLight.material = this._glow('blueGlow', 0.2, 0.4, 1.0);
    blueLight.parent = parent;
    blueLight.position.set(v.bodyWidth * 0.2, 1.32, -0.15);

    // Alternate flash
    let flashState = false;
    this.scene.registerBeforeRender(() => {
      if (Math.floor(performance.now() / 300) % 2 === 0) {
        if (!flashState) {
          redLight.material.emissiveColor = new BABYLON.Color3(1, 0.1, 0.1);
          blueLight.material.emissiveColor = new BABYLON.Color3(0.05, 0.1, 0.2);
          flashState = true;
        }
      } else {
        if (flashState) {
          redLight.material.emissiveColor = new BABYLON.Color3(0.2, 0.02, 0.02);
          blueLight.material.emissiveColor = new BABYLON.Color3(0.2, 0.4, 1.0);
          flashState = false;
        }
      }
    });
  }

  // ─── SPOILER ───
  _buildSpoiler(parent, v) {
    // Spoiler wing
    const wing = BABYLON.MeshBuilder.CreateBox('spoilerWing', {
      width: v.bodyWidth * 0.9, height: 0.04, depth: 0.25
    }, this.scene);
    wing.material = this._mat('spoilerMat', ...v.bodyColor, 0.7, 0.25);
    wing.parent = parent;
    wing.position.set(0, 0.75, v.bodyLength * 0.4);

    // Supports
    [-0.3, 0.3].forEach((xOff, i) => {
      const support = BABYLON.MeshBuilder.CreateBox('spoilerSupport' + i, {
        width: 0.05, height: 0.3, depth: 0.05
      }, this.scene);
      support.material = wing.material;
      support.parent = parent;
      support.position.set(xOff * v.bodyWidth, 0.6, v.bodyLength * 0.4);
    });
  }

  // ─── BATTERY PACK ───
  _buildBatteryPack(parent, v) {
    // Row of AAA cell cylinders on back
    for (let i = 0; i < 5; i++) {
      const cell = BABYLON.MeshBuilder.CreateCylinder('cell' + i, {
        diameter: 0.12, height: 0.5, tessellation: 8
      }, this.scene);
      cell.material = this._mat('cellMat', 0.3, 0.3, 0.35, 0.6, 0.4);
      cell.parent = parent;
      cell.position.set(-0.3 + i * 0.15, 0.75, v.bodyLength * 0.3);
      cell.rotation.x = Math.PI / 2;
    }
  }
}
