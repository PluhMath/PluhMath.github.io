// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// World Builder — The Split Archipelago (3 Zones)
// ═══════════════════════════════════════════════════════════════

export class WorldBuilder {
  constructor(scene, shadowGen) {
    this.scene = scene;
    this.shadowGen = shadowGen;
    this.pitStopPositions = [];
  }

  buildWorld() {
    this._buildSouthZone();    // Crimson Island Mainland
    this._buildGrandTourLaunch(); // Festival start line and static rival karts
    this._buildCentralZone();  // The 5-Mile Divide
    this._buildNorthZone();    // Restrictia Sector
    this._buildSkybox();
    this._buildPitStops();
  }

  _mat(name, r, g, b, metallic = 0.2, roughness = 0.7) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = new BABYLON.Color3(r, g, b);
    mat.specularColor = new BABYLON.Color3(1 - roughness, 1 - roughness, 1 - roughness);
    return mat;
  }

  _glow(name, r, g, b) {
    const mat = new BABYLON.StandardMaterial(name, this.scene);
    mat.diffuseColor = new BABYLON.Color3(r, g, b);
    mat.emissiveColor = new BABYLON.Color3(r * 0.5, g * 0.5, b * 0.5);
    return mat;
  }

  // ═══════════════════════════════════════════
  // SOUTH ZONE — Crimson Island Mainland
  // Coastal superhighways, white sand beaches,
  // palm trees, museum, Statue of Crimson
  // ═══════════════════════════════════════════
  _buildSouthZone() {
    // Main ground plane — beach sand
    const beach = BABYLON.MeshBuilder.CreateGround('southGround', {
      width: 400, height: 200, subdivisions: 32
    }, this.scene);
    beach.material = this._mat('sand', 0.92, 0.88, 0.72, 0.05, 0.95);
    beach.position.set(0, 0, -120);
    beach.receiveShadows = true;

    // Superhighway (asphalt road)
    const highway = BABYLON.MeshBuilder.CreateGround('highway', {
      width: 20, height: 180, subdivisions: 4
    }, this.scene);
    highway.material = this._mat('asphalt', 0.15, 0.15, 0.17, 0.1, 0.85);
    highway.position.set(0, 0.05, -120);
    highway.receiveShadows = true;

    // Highway center line
    for (let i = 0; i < 20; i++) {
      const line = BABYLON.MeshBuilder.CreateBox('centerLine' + i, {
        width: 0.3, height: 0.02, depth: 4
      }, this.scene);
      line.material = this._mat('lineYellow', 0.95, 0.85, 0.2);
      line.parent = highway;
      line.position.set(0, 0.03, -80 + i * 9);
    }

    // Secondary road (perpendicular)
    const crossRoad = BABYLON.MeshBuilder.CreateGround('crossRoad', {
      width: 200, height: 14, subdivisions: 4
    }, this.scene);
    crossRoad.material = highway.material;
    crossRoad.position.set(0, 0.05, -100);

    // Palm trees along beach
    this._buildPalmTrees(-180, -60, -200, -60, 25);

    // Crimson Statue (landmark)
    this._buildStatueOfCrimson();

    // Old Restrictia Museum
    this._buildMuseum();

    // Beach buildings / coastal shops
    this._buildCoastalBuildings();
  }

  _buildPalmTrees(xMin, xMax, zMin, zMax, count) {
    const trunkMat = this._mat('palmTrunk', 0.45, 0.3, 0.15, 0.1, 0.9);
    const leafMat = this._mat('palmLeaf', 0.15, 0.55, 0.2, 0.05, 0.85);

    for (let i = 0; i < count; i++) {
      const x = xMin + Math.random() * (xMax - xMin);
      const z = zMin + Math.random() * (zMax - zMin);
      const height = 6 + Math.random() * 4;

      // Trunk
      const trunk = BABYLON.MeshBuilder.CreateCylinder('palmTrunk' + i, {
        diameterTop: 0.2, diameterBottom: 0.4,
        height: height, tessellation: 8
      }, this.scene);
      trunk.material = trunkMat;
      trunk.position.set(x, height / 2, z);
      this.shadowGen.addShadowCaster(trunk);

      // Leaf fronds (rotated boxes)
      for (let f = 0; f < 6; f++) {
        const frond = BABYLON.MeshBuilder.CreateBox('frond' + i + '_' + f, {
          width: 0.3, height: 0.05, depth: 3
        }, this.scene);
        frond.material = leafMat;
        frond.position.set(x, height, z);
        frond.rotation.y = (f / 6) * Math.PI * 2;
        frond.rotation.x = -0.5;
      }
    }
  }

  _buildStatueOfCrimson() {
    // Pedestal
    const pedestal = BABYLON.MeshBuilder.CreateBox('pedestal', {
      width: 6, height: 4, depth: 6
    }, this.scene);
    pedestal.material = this._mat('marble', 0.85, 0.83, 0.8, 0.3, 0.5);
    pedestal.position.set(40, 2, -160);
    pedestal.receiveShadows = true;
    this.shadowGen.addShadowCaster(pedestal);

    // Plaque
    const plaque = BABYLON.MeshBuilder.CreateBox('plaque', {
      width: 3, height: 1, depth: 0.1
    }, this.scene);
    plaque.material = this._glow('plaqueMat', 0.85, 0.7, 0.2);
    plaque.position.set(40, 2.5, -163.05);

    // Statue body (bronze figure — simplified)
    const torso = BABYLON.MeshBuilder.CreateCylinder('statueTorso', {
      diameterTop: 1.5, diameterBottom: 2.0,
      height: 8, tessellation: 12
    }, this.scene);
    torso.material = this._mat('bronze', 0.65, 0.45, 0.2, 0.8, 0.35);
    torso.position.set(40, 8, -160);
    this.shadowGen.addShadowCaster(torso);

    // Head
    const head = BABYLON.MeshBuilder.CreateSphere('statueHead', {
      diameter: 2.2, segments: 12
    }, this.scene);
    head.material = torso.material;
    head.position.set(40, 13, -160);

    // Raised arm
    const arm = BABYLON.MeshBuilder.CreateCylinder('statueArm', {
      diameter: 0.5, height: 5, tessellation: 8
    }, this.scene);
    arm.material = torso.material;
    arm.position.set(41.5, 11, -160);
    arm.rotation.z = -Math.PI / 4;
  }

  _buildMuseum() {
    // Main building
    const main = BABYLON.MeshBuilder.CreateBox('museum', {
      width: 30, height: 10, depth: 20
    }, this.scene);
    main.material = this._mat('museumWall', 0.9, 0.88, 0.82, 0.15, 0.6);
    main.position.set(-60, 5, -140);
    main.receiveShadows = true;
    this.shadowGen.addShadowCaster(main);

    // Roof
    const roof = BABYLON.MeshBuilder.CreateBox('museumRoof', {
      width: 32, height: 0.5, depth: 22
    }, this.scene);
    roof.material = this._mat('museumRoofMat', 0.4, 0.2, 0.15, 0.3, 0.6);
    roof.position.set(-60, 10.25, -140);

    // Columns
    for (let i = 0; i < 6; i++) {
      const col = BABYLON.MeshBuilder.CreateCylinder('museumCol' + i, {
        diameter: 0.8, height: 10, tessellation: 12
      }, this.scene);
      col.material = this._mat('colMat', 0.88, 0.85, 0.8, 0.2, 0.5);
      col.position.set(-75 + i * 6, 5, -130);
      this.shadowGen.addShadowCaster(col);
    }

    // "OLD RESTRICTIA MUSEUM" sign
    const sign = BABYLON.MeshBuilder.CreateBox('museumSign', {
      width: 20, height: 2, depth: 0.2
    }, this.scene);
    sign.material = this._glow('signGlow', 0.85, 0.7, 0.2);
    sign.position.set(-60, 12, -130);
  }

  _buildCoastalBuildings() {
    const colors = [
      [0.95, 0.6, 0.4], [0.5, 0.8, 0.9], [0.95, 0.85, 0.5],
      [0.6, 0.9, 0.6], [0.9, 0.5, 0.6]
    ];
    for (let i = 0; i < 8; i++) {
      const w = 8 + Math.random() * 6;
      const h = 6 + Math.random() * 8;
      const d = 8 + Math.random() * 6;
      const col = colors[i % colors.length];

      const building = BABYLON.MeshBuilder.CreateBox('coastBld' + i, {
        width: w, height: h, depth: d
      }, this.scene);
      building.material = this._mat('bldMat' + i, ...col, 0.15, 0.65);
      building.position.set(-120 + i * 30, h / 2, -80 - Math.random() * 40);
      building.receiveShadows = true;
      this.shadowGen.addShadowCaster(building);
    }
  }

  // ═══════════════════════════════════════════
  // GRAND TOUR LAUNCH — a colorful, all-ages race festival
  // The player spawns just behind this area. It makes the first
  // camera view feel like the beginning of an island kart tour.
  // ═══════════════════════════════════════════
  _buildGrandTourLaunch() {
    const ink = this._mat('tourInk', 0.08, 0.11, 0.2, 0.1, 0.9);
    const cream = this._mat('tourCream', 1.0, 0.94, 0.75, 0.1, 0.7);
    const coral = this._mat('tourCoral', 0.92, 0.18, 0.16, 0.1, 0.65);
    const teal = this._mat('tourTeal', 0.03, 0.56, 0.66, 0.15, 0.6);
    const gold = this._mat('tourGold', 1.0, 0.65, 0.1, 0.15, 0.55);
    const grass = this._mat('tourGrass', 0.2, 0.55, 0.28, 0.05, 0.85);

    // Checker start grid and colored shoulder curbs.
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 8; col++) {
        const square = BABYLON.MeshBuilder.CreateBox(`tourGrid_${row}_${col}`, {
          width: 2.25, height: 0.035, depth: 2.15
        }, this.scene);
        square.material = (row + col) % 2 === 0 ? cream : ink;
        square.position.set(-7.9 + col * 2.25, 0.085, -67 + row * 2.15);
      }
    }

    for (let i = 0; i < 13; i++) {
      [-11.1, 11.1].forEach((x, side) => {
        const curb = BABYLON.MeshBuilder.CreateBox(`tourCurb_${side}_${i}`, {
          width: 1.2, height: 0.12, depth: 3
        }, this.scene);
        curb.material = (i + side) % 2 === 0 ? coral : cream;
        curb.position.set(x, 0.12, -83 + i * 4.2);
      });
    }

    // Chunky start arch: deliberately simple and readable from a chase camera.
    [-11, 11].forEach((x, i) => {
      const post = BABYLON.MeshBuilder.CreateCylinder(`tourArchPost_${i}`, {
        diameter: 1.05, height: 8, tessellation: 10
      }, this.scene);
      post.material = i === 0 ? coral : teal;
      post.position.set(x, 4, -57.5);
      if (this.shadowGen) this.shadowGen.addShadowCaster(post);

      const cap = BABYLON.MeshBuilder.CreateSphere(`tourArchCap_${i}`, {
        diameter: 1.45, segments: 10
      }, this.scene);
      cap.material = gold;
      cap.position.set(x, 8.2, -57.5);
    });

    const archBeam = BABYLON.MeshBuilder.CreateBox('tourArchBeam', {
      width: 24, height: 2.15, depth: 1
    }, this.scene);
    archBeam.material = cream;
    archBeam.position.set(0, 8, -57.5);
    if (this.shadowGen) this.shadowGen.addShadowCaster(archBeam);

    // A row of colored squares reads as a race banner without copying any logo.
    for (let i = 0; i < 12; i++) {
      const panel = BABYLON.MeshBuilder.CreateBox(`tourBanner_${i}`, {
        width: 1.55, height: 1.25, depth: 0.08
      }, this.scene);
      panel.material = i % 3 === 0 ? coral : i % 3 === 1 ? teal : gold;
      panel.position.set(-8.8 + i * 1.6, 8, -58.04);
    }

    this._buildTourGrandstand(-20, -62, -1, [0.95, 0.22, 0.2]);
    this._buildTourGrandstand(20, -62, 1, [0.1, 0.56, 0.68]);

    // Palm-lined entrance gives the coast a cheerful, destination-race feel.
    this._buildTourPalms();

    // Decorative racers are scenery only; they do not participate in collision or physics.
    const rivalPaints = [
      [0.95, 0.25, 0.16], [0.1, 0.55, 0.75], [0.94, 0.69, 0.12],
      [0.32, 0.68, 0.32], [0.58, 0.34, 0.72]
    ];
    const rivalSlots = [
      { x: -7, z: -49, yaw: 0.02 }, { x: -3.5, z: -52.5, yaw: -0.03 },
      { x: 0.5, z: -49, yaw: 0.02 }, { x: 4.2, z: -52.5, yaw: -0.02 },
      { x: 7.5, z: -49, yaw: 0.03 }
    ];
    rivalSlots.forEach((slot, i) => this._buildDecorativeKart(i, slot, rivalPaints[i]));

    // Bright floating route arrows gently guide the eye from the start line to the divide.
    for (let i = 0; i < 3; i++) {
      const arrow = BABYLON.MeshBuilder.CreateCylinder(`tourRouteMarker_${i}`, {
        diameterTop: 0, diameterBottom: 1.6, height: 2.1, tessellation: 3
      }, this.scene);
      arrow.material = gold;
      arrow.position.set(0, 1.5, -36 + i * 12);
      arrow.rotation.x = Math.PI;
      this.scene.registerBeforeRender(() => {
        arrow.position.y = 1.5 + Math.sin(performance.now() / 500 + i) * 0.16;
      });
    }
  }

  _buildTourGrandstand(x, z, side, color) {
    const seatMat = this._mat(`tourSeat_${side}`, ...color, 0.08, 0.7);
    const frameMat = this._mat(`tourFrame_${side}`, 0.1, 0.13, 0.2, 0.3, 0.6);
    const crowdColors = [
      [1.0, 0.74, 0.18], [0.95, 0.25, 0.2], [0.14, 0.56, 0.72],
      [0.28, 0.67, 0.34], [0.72, 0.39, 0.75], [1.0, 0.82, 0.56]
    ];

    for (let row = 0; row < 3; row++) {
      const bench = BABYLON.MeshBuilder.CreateBox(`tourBench_${side}_${row}`, {
        width: 14, height: 0.55, depth: 1.9
      }, this.scene);
      bench.material = seatMat;
      bench.position.set(x, 1 + row * 1.15, z + side * (row * 0.8));
      if (this.shadowGen) this.shadowGen.addShadowCaster(bench);

      for (let seat = 0; seat < 7; seat++) {
        const fan = BABYLON.MeshBuilder.CreateSphere(`tourFan_${side}_${row}_${seat}`, {
          diameter: 0.62, segments: 6
        }, this.scene);
        fan.material = this._mat(`tourFanMat_${side}_${row}_${seat}`, ...crowdColors[(seat + row + (side > 0 ? 2 : 0)) % crowdColors.length], 0.05, 0.8);
        fan.position.set(x - 5.6 + seat * 1.85, 1.75 + row * 1.15, z + side * (0.75 + row * 0.8));
      }
    }

    const signpost = BABYLON.MeshBuilder.CreateBox(`tourStandPost_${side}`, {
      width: 0.35, height: 6, depth: 0.35
    }, this.scene);
    signpost.material = frameMat;
    signpost.position.set(x - side * 6.8, 3, z);
  }

  _buildTourPalms() {
    const trunkMat = this._mat('tourPalmTrunk', 0.43, 0.25, 0.1, 0.05, 0.9);
    const leafMat = this._mat('tourPalmLeaf', 0.12, 0.5, 0.2, 0.05, 0.8);
    const palms = [
      { x: -27, z: -76, h: 8 }, { x: 28, z: -76, h: 7 },
      { x: -28, z: -48, h: 9 }, { x: 27, z: -46, h: 8 }
    ];
    palms.forEach((p, i) => {
      const trunk = BABYLON.MeshBuilder.CreateCylinder(`tourPalm_${i}`, {
        diameterTop: 0.2, diameterBottom: 0.42, height: p.h, tessellation: 8
      }, this.scene);
      trunk.material = trunkMat;
      trunk.position.set(p.x, p.h / 2, p.z);
      if (this.shadowGen) this.shadowGen.addShadowCaster(trunk);
      for (let leaf = 0; leaf < 6; leaf++) {
        const frond = BABYLON.MeshBuilder.CreateBox(`tourPalmFrond_${i}_${leaf}`, {
          width: 0.24, height: 0.05, depth: 3.1
        }, this.scene);
        frond.material = leafMat;
        frond.position.set(p.x, p.h, p.z);
        frond.rotation.y = leaf * Math.PI / 3;
        frond.rotation.x = -0.48;
      }
    });
  }

  _buildDecorativeKart(index, slot, paint) {
    const kart = new BABYLON.TransformNode(`tourRivalKart_${index}`, this.scene);
    kart.position.set(slot.x, 0.55, slot.z);
    kart.rotation.y = slot.yaw;
    const bodyMat = this._mat(`tourKartPaint_${index}`, ...paint, 0.2, 0.48);
    const tireMat = this._mat(`tourKartTire_${index}`, 0.06, 0.07, 0.1, 0.1, 0.9);
    const rimMat = this._mat(`tourKartRim_${index}`, 0.96, 0.88, 0.6, 0.5, 0.3);
    const driverMat = this._mat(`tourKartDriver_${index}`, 0.95, 0.7 - index * 0.05, 0.46, 0.05, 0.8);

    const body = BABYLON.MeshBuilder.CreateBox(`tourKartBody_${index}`, {
      width: 2.1, height: 0.55, depth: 3.3
    }, this.scene);
    body.material = bodyMat;
    body.parent = kart;
    body.position.y = 0.45;
    if (this.shadowGen) this.shadowGen.addShadowCaster(body);

    const cockpit = BABYLON.MeshBuilder.CreateSphere(`tourKartDriver_${index}`, {
      diameter: 0.85, segments: 8
    }, this.scene);
    cockpit.material = driverMat;
    cockpit.parent = kart;
    cockpit.position.set(0, 1.05, -0.2);

    [-0.95, 0.95].forEach((x, side) => {
      [-1.08, 1.08].forEach((z, axle) => {
        const tire = BABYLON.MeshBuilder.CreateCylinder(`tourKartWheel_${index}_${side}_${axle}`, {
          diameter: 0.72, height: 0.36, tessellation: 12
        }, this.scene);
        tire.material = tireMat;
        tire.parent = kart;
        tire.position.set(x, 0.36, z);
        tire.rotation.z = Math.PI / 2;

        const hub = BABYLON.MeshBuilder.CreateCylinder(`tourKartHub_${index}_${side}_${axle}`, {
          diameter: 0.32, height: 0.39, tessellation: 12
        }, this.scene);
        hub.material = rimMat;
        hub.parent = tire;
      });
    });
  }

  // ═══════════════════════════════════════════
  // CENTRAL ZONE — The 5-Mile Divide
  // Open ocean, patrol gunboats, torpedo
  // obstacles, deep underwater tunnels
  // ═══════════════════════════════════════════
  _buildCentralZone() {
    // Ocean floor
    const oceanFloor = BABYLON.MeshBuilder.CreateGround('oceanFloor', {
      width: 400, height: 200, subdivisions: 16
    }, this.scene);
    oceanFloor.material = this._mat('seabed', 0.12, 0.15, 0.2, 0.1, 0.9);
    oceanFloor.position.set(0, -8, 40);

    // Underwater tunnel entrance (south side)
    this._buildUnderwaterTunnel(0, -6, -15, 0, -6, 95);

    // Patrol gunboats (obstacle structures)
    for (let i = 0; i < 5; i++) {
      this._buildGunboat(-80 + i * 40, 30 + i * 10);
    }

    // Torpedo obstacles (floating cylinders)
    for (let i = 0; i < 8; i++) {
      const torpedo = BABYLON.MeshBuilder.CreateCylinder('torpedo' + i, {
        diameter: 0.5, height: 3, tessellation: 8
      }, this.scene);
      torpedo.material = this._mat('torpedoMat', 0.3, 0.3, 0.32, 0.6, 0.4);
      torpedo.position.set(
        -60 + Math.random() * 120,
        -2 - Math.random() * 3,
        10 + Math.random() * 70
      );
      torpedo.rotation.z = Math.PI / 2;
    }

    // Sunken ruins
    this._buildSunkenRuins();
  }

  _buildUnderwaterTunnel(x1, y1, z1, x2, y2, z2) {
    const length = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
    const midX = (x1 + x2) / 2;
    const midZ = (z1 + z2) / 2;

    // Tunnel tube (ring of boxes)
    const segments = 15;
    const tunnelMat = this._mat('tunnelMat', 0.2, 0.25, 0.3, 0.4, 0.5);
    const tunnelGlow = this._glow('tunnelGlow', 0.0, 0.4, 0.6);

    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      const px = x1 + (x2 - x1) * t;
      const pz = z1 + (z2 - z1) * t;

      // Tunnel ring
      const ring = BABYLON.MeshBuilder.CreateTorus('tunnelRing' + i, {
        diameter: 6, thickness: 0.4, tessellation: 16
      }, this.scene);
      ring.material = tunnelMat;
      ring.position.set(px, y1, pz);
      ring.rotation.x = Math.PI / 2;

      // Glow marker every 3 segments
      if (i % 3 === 0) {
        const marker = BABYLON.MeshBuilder.CreateSphere('tunnelMarker' + i, {
          diameter: 0.4
        }, this.scene);
        marker.material = tunnelGlow;
        marker.position.set(px, y1 + 3, pz);
      }
    }
  }

  _buildGunboat(x, z) {
    // Hull
    const hull = BABYLON.MeshBuilder.CreateBox('gunboat_' + x, {
      width: 4, height: 2, depth: 12
    }, this.scene);
    hull.material = this._mat('gunboatHull', 0.35, 0.38, 0.4, 0.5, 0.5);
    hull.position.set(x, 0, z);
    this.shadowGen.addShadowCaster(hull);

    // Cabin
    const cabin = BABYLON.MeshBuilder.CreateBox('gunboatCabin_' + x, {
      width: 2.5, height: 2, depth: 4
    }, this.scene);
    cabin.material = hull.material;
    cabin.position.set(x, 2, z - 1);

    // Radar dish
    const dish = BABYLON.MeshBuilder.CreateDisc('radarDish_' + x, {
      radius: 0.8, tessellation: 12
    }, this.scene);
    dish.material = this._mat('radarMat', 0.7, 0.7, 0.72);
    dish.position.set(x, 3.5, z - 1);

    // Rotate radar
    this.scene.registerBeforeRender(() => {
      dish.rotation.y += 0.02;
    });
  }

  _buildSunkenRuins() {
    const ruinMat = this._mat('ruinStone', 0.4, 0.38, 0.35, 0.2, 0.8);

    // Broken columns
    for (let i = 0; i < 6; i++) {
      const h = 3 + Math.random() * 4;
      const col = BABYLON.MeshBuilder.CreateCylinder('ruin' + i, {
        diameter: 1 + Math.random(), height: h, tessellation: 8
      }, this.scene);
      col.material = ruinMat;
      col.position.set(
        -30 + Math.random() * 60,
        -8 + h / 2,
        30 + Math.random() * 40
      );
      col.rotation.x = (Math.random() - 0.5) * 0.3;
      col.rotation.z = (Math.random() - 0.5) * 0.3;
    }

    // Fallen arch
    const archL = BABYLON.MeshBuilder.CreateCylinder('archL', {
      diameter: 1.2, height: 6, tessellation: 8
    }, this.scene);
    archL.material = ruinMat;
    archL.position.set(15, -5, 50);

    const archR = BABYLON.MeshBuilder.CreateCylinder('archR', {
      diameter: 1.2, height: 6, tessellation: 8
    }, this.scene);
    archR.material = ruinMat;
    archR.position.set(21, -5, 50);

    const archTop = BABYLON.MeshBuilder.CreateBox('archTop', {
      width: 8, height: 1, depth: 2
    }, this.scene);
    archTop.material = ruinMat;
    archTop.position.set(18, -2, 50);
  }

  // ═══════════════════════════════════════════
  // NORTH ZONE — Restrictia Sector
  // Brutalist concrete high-rises, rusted
  // industrial chutes, guard checkpoints,
  // narrow alleys, metal scrap heaps
  // ═══════════════════════════════════════════
  _buildNorthZone() {
    // Ground — cracked concrete
    const ground = BABYLON.MeshBuilder.CreateGround('northGround', {
      width: 400, height: 200, subdivisions: 32
    }, this.scene);
    ground.material = this._mat('concrete', 0.4, 0.4, 0.42, 0.1, 0.9);
    ground.position.set(0, 0, 200);
    ground.receiveShadows = true;

    // Narrow asphalt alleys (grid of roads)
    for (let i = 0; i < 5; i++) {
      const road = BABYLON.MeshBuilder.CreateGround('alley_h' + i, {
        width: 300, height: 8, subdivisions: 2
      }, this.scene);
      road.material = this._mat('alleyAsphalt', 0.12, 0.12, 0.14);
      road.position.set(0, 0.03, 130 + i * 35);
    }
    for (let i = 0; i < 5; i++) {
      const road = BABYLON.MeshBuilder.CreateGround('alley_v' + i, {
        width: 8, height: 200, subdivisions: 2
      }, this.scene);
      road.material = this._mat('alleyAsphaltV', 0.12, 0.12, 0.14);
      road.position.set(-100 + i * 50, 0.03, 200);
    }

    // Brutalist high-rises
    this._buildBrutalistBuildings();

    // Guard checkpoints
    this._buildCheckpoints();

    // Scrap heaps
    this._buildScrapHeaps();

    // Industrial chutes
    this._buildIndustrialChutes();
  }

  _buildBrutalistBuildings() {
    const concreteMat = this._mat('brutalist', 0.45, 0.43, 0.4, 0.15, 0.85);
    const darkMat = this._mat('brutalistDark', 0.3, 0.28, 0.26, 0.15, 0.85);
    const windowMat = this._mat('windowDark', 0.08, 0.1, 0.15, 0.3, 0.4);

    const positions = [];
    for (let gx = -3; gx <= 3; gx++) {
      for (let gz = 0; gz < 5; gz++) {
        positions.push({ x: gx * 50, z: 125 + gz * 35 });
      }
    }

    positions.forEach((pos, i) => {
      // Skip road intersection areas
      if (Math.abs(pos.x) < 6 || Math.abs(pos.x - 50) < 6 || Math.abs(pos.x + 50) < 6) return;

      const w = 14 + Math.random() * 12;
      const h = 15 + Math.random() * 35;
      const d = 14 + Math.random() * 12;

      const bld = BABYLON.MeshBuilder.CreateBox('brutBld' + i, {
        width: w, height: h, depth: d
      }, this.scene);
      bld.material = i % 3 === 0 ? darkMat : concreteMat;
      bld.position.set(
        pos.x + (Math.random() - 0.5) * 15,
        h / 2,
        pos.z + (Math.random() - 0.5) * 10
      );
      bld.receiveShadows = true;
      this.shadowGen.addShadowCaster(bld);

      // Window strips
      const windowRows = Math.floor(h / 4);
      for (let r = 0; r < windowRows; r++) {
        const winStrip = BABYLON.MeshBuilder.CreateBox('win' + i + '_' + r, {
          width: w * 0.8, height: 0.8, depth: d + 0.1
        }, this.scene);
        winStrip.material = windowMat;
        winStrip.position.set(
          bld.position.x,
          3 + r * 4,
          bld.position.z
        );
      }
    });
  }

  _buildCheckpoints() {
    const gateMat = this._mat('gateMat', 0.7, 0.15, 0.1, 0.4, 0.5);
    const stripeMat = this._mat('stripeMat', 0.95, 0.85, 0.1);

    const checkpoints = [
      { x: 0, z: 110 }, { x: -80, z: 160 }, { x: 80, z: 210 }
    ];

    checkpoints.forEach((cp, i) => {
      // Gate posts
      [-5, 5].forEach((xOff, j) => {
        const post = BABYLON.MeshBuilder.CreateBox('gatePost' + i + '_' + j, {
          width: 0.8, height: 5, depth: 0.8
        }, this.scene);
        post.material = gateMat;
        post.position.set(cp.x + xOff, 2.5, cp.z);
        this.shadowGen.addShadowCaster(post);
      });

      // Barrier arm
      const arm = BABYLON.MeshBuilder.CreateBox('gateArm' + i, {
        width: 10, height: 0.2, depth: 0.3
      }, this.scene);
      arm.material = stripeMat;
      arm.position.set(cp.x, 4.5, cp.z);

      // Guard booth
      const booth = BABYLON.MeshBuilder.CreateBox('booth' + i, {
        width: 3, height: 3, depth: 3
      }, this.scene);
      booth.material = this._mat('boothMat', 0.5, 0.48, 0.45, 0.2, 0.7);
      booth.position.set(cp.x + 8, 1.5, cp.z);
      this.shadowGen.addShadowCaster(booth);
    });
  }

  _buildScrapHeaps() {
    const rustMat = this._mat('rust', 0.55, 0.3, 0.15, 0.3, 0.8);

    for (let i = 0; i < 12; i++) {
      const heap = BABYLON.MeshBuilder.CreateSphere('scrap' + i, {
        diameter: 3 + Math.random() * 5, segments: 6
      }, this.scene);
      heap.material = rustMat;
      heap.position.set(
        -150 + Math.random() * 300,
        1,
        120 + Math.random() * 160
      );
      heap.scaling.y = 0.5;
      this.shadowGen.addShadowCaster(heap);
    }
  }

  _buildIndustrialChutes() {
    const metalMat = this._mat('chuteMetal', 0.45, 0.42, 0.4, 0.6, 0.5);

    for (let i = 0; i < 6; i++) {
      // Vertical chute
      const chute = BABYLON.MeshBuilder.CreateCylinder('chute' + i, {
        diameter: 2, height: 12, tessellation: 8
      }, this.scene);
      chute.material = metalMat;
      chute.position.set(
        -100 + i * 40,
        6,
        250 + (Math.random() - 0.5) * 30
      );
      this.shadowGen.addShadowCaster(chute);

      // Support struts
      const strut = BABYLON.MeshBuilder.CreateBox('strut' + i, {
        width: 0.3, height: 10, depth: 0.3
      }, this.scene);
      strut.material = metalMat;
      strut.position.set(
        chute.position.x + 1.5,
        5,
        chute.position.z
      );
      strut.rotation.z = 0.2;
    }
  }

  // ═══ PIT STOPS ═══
  _buildPitStops() {
    const stops = [
      { x: 20, z: -90, label: 'Crimson Fuel Dock' },
      { x: -40, z: -60, label: 'Beach Charging Station' },
      { x: 0, z: 140, label: 'Restrictia Garage' },
      { x: -70, z: 200, label: 'Sector Fuel Bay' },
      { x: 60, z: 260, label: 'Industrial Charge Port' }
    ];

    const bayMat = this._mat('pitBay', 0.2, 0.2, 0.22, 0.4, 0.5);
    const glowMat = this._glow('pitGlow', 0.0, 1.0, 0.4);

    stops.forEach((stop, i) => {
      // Bay structure
      const bay = BABYLON.MeshBuilder.CreateBox('pitStop' + i, {
        width: 10, height: 4, depth: 8
      }, this.scene);
      bay.material = bayMat;
      bay.position.set(stop.x, 2, stop.z);
      this.shadowGen.addShadowCaster(bay);

      // Glowing fuel indicator
      const indicator = BABYLON.MeshBuilder.CreateSphere('pitGlow' + i, {
        diameter: 0.6
      }, this.scene);
      indicator.material = glowMat;
      indicator.position.set(stop.x, 4.5, stop.z);

      // Pulsing animation
      const baseIntensity = 0.4;
      this.scene.registerBeforeRender(() => {
        const pulse = baseIntensity + Math.sin(performance.now() / 500 + i) * 0.3;
        indicator.material.emissiveColor = new BABYLON.Color3(0, pulse, pulse * 0.4);
      });

      this.pitStopPositions.push({ x: stop.x, z: stop.z });
    });
  }

  // ═══ SKYBOX ═══
  _buildSkybox() {
    const skybox = BABYLON.MeshBuilder.CreateBox('skyBox', { size: 2000.0 }, this.scene);
    const skyMat = new BABYLON.StandardMaterial('skyMat', this.scene);
    skyMat.backFaceCulling = false;
    skyMat.disableLighting = true;
    skyMat.fogEnabled = false;
    skyMat.diffuseColor = new BABYLON.Color3(0, 0, 0);
    skyMat.specularColor = new BABYLON.Color3(0, 0, 0);
    skyMat.emissiveColor = new BABYLON.Color3(0.42, 0.68, 0.95);
    skybox.material = skyMat;
    skybox.infiniteDistance = true;
  }
}
