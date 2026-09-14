// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Vehicle Definitions — Fixed Factory Models (No Customization)
// ═══════════════════════════════════════════════════════════════

export const VEHICLES = [
  {
    id: 'milestech_mk1',
    name: 'MilesTech Mk. I "The Sled"',
    manufacturer: 'MilesTech',
    description: 'Armored wooden pallet fitted with 58,000 AAA cell batteries and modular tectonic thrusters. Colossal burst acceleration, high top speed, light and loose drift.',
    driver: 'miles',
    stats: {
      speed: 9,
      acceleration: 10,
      handling: 6,
      weight: 3,
      fuelEfficiency: 4,
      amphibiousThrust: 7
    },
    // Visual build config for procedural mesh
    visual: {
      type: 'sled',
      bodyColor: [0.35, 0.25, 0.15],     // dark wood brown
      accentColor: [0.0, 0.9, 1.0],       // electric cyan (thruster glow)
      bodyWidth: 2.2,
      bodyHeight: 0.5,
      bodyLength: 3.5,
      wheelRadius: 0.3,
      wheelWidth: 0.2,
      hasThrusters: true,
      thrusterColor: [0.0, 0.85, 1.0],
      hasBatteryPack: true
    }
  },
  {
    id: 'milestech_surveyor',
    name: 'MilesTech "Surveyor 26"',
    manufacturer: 'MilesTech',
    description: 'Reinforced alloy chassis with concrete/sand heat plating. Heavyweight, immune to minor collisions, steady underwater propulsion.',
    driver: 'blue',
    stats: {
      speed: 5,
      acceleration: 4,
      handling: 7,
      weight: 10,
      fuelEfficiency: 6,
      amphibiousThrust: 9
    },
    visual: {
      type: 'heavy_truck',
      bodyColor: [0.3, 0.32, 0.35],       // gunmetal grey
      accentColor: [0.85, 0.55, 0.1],     // sandy orange
      bodyWidth: 2.8,
      bodyHeight: 1.6,
      bodyLength: 4.2,
      wheelRadius: 0.55,
      wheelWidth: 0.35,
      hasThrusters: false,
      hasArmorPlating: true
    }
  },
  {
    id: 'waymo_ipace',
    name: 'Waymo I-PACE Cruiser',
    manufacturer: 'Waymo Autonomous Fleet',
    description: 'Fully enclosed electric autonomous crossover with spinning rooftop LiDAR and sensor pods. Instant zero-RPM electric torque, balanced fuel efficiency.',
    driver: 'lily',
    stats: {
      speed: 7,
      acceleration: 8,
      handling: 8,
      weight: 6,
      fuelEfficiency: 9,
      amphibiousThrust: 6
    },
    visual: {
      type: 'crossover',
      bodyColor: [0.95, 0.95, 0.97],      // clean white
      accentColor: [0.2, 0.6, 1.0],       // sensor blue
      bodyWidth: 2.2,
      bodyHeight: 1.3,
      bodyLength: 3.8,
      wheelRadius: 0.4,
      wheelWidth: 0.25,
      hasLiDAR: true,
      lidarColor: [0.2, 0.7, 1.0]
    }
  },
  {
    id: 'waymo_ojai',
    name: 'Waymo Ojai / Zeekr Multi-Passenger',
    manufacturer: 'Waymo Autonomous Fleet',
    description: 'Spacious 3D van with wide wheelbase. Heavy mass, excellent ramming momentum, ultra-stable handling.',
    driver: 'crimson',
    stats: {
      speed: 5,
      acceleration: 5,
      handling: 9,
      weight: 9,
      fuelEfficiency: 7,
      amphibiousThrust: 5
    },
    visual: {
      type: 'van',
      bodyColor: [0.88, 0.88, 0.9],       // silver-white
      accentColor: [0.1, 0.8, 0.5],       // green accent
      bodyWidth: 2.6,
      bodyHeight: 1.9,
      bodyLength: 4.5,
      wheelRadius: 0.42,
      wheelWidth: 0.3,
      hasLiDAR: true,
      lidarColor: [0.1, 0.9, 0.5]
    }
  },
  {
    id: 'bunny_enforcer',
    name: 'Council "Bunny Edict" Enforcer',
    manufacturer: 'Restrictia State Fleet',
    description: 'Armored police vehicle adorned with the mandatory smiling rabbit decal. High durability and ram force, low drift angle.',
    driver: 'james',
    stats: {
      speed: 6,
      acceleration: 6,
      handling: 7,
      weight: 9,
      fuelEfficiency: 5,
      amphibiousThrust: 5
    },
    visual: {
      type: 'armored_cruiser',
      bodyColor: [0.1, 0.1, 0.12],        // matte black
      accentColor: [1.0, 0.2, 0.2],       // police red
      secondAccent: [0.2, 0.4, 1.0],      // police blue
      bodyWidth: 2.4,
      bodyHeight: 1.2,
      bodyLength: 4.0,
      wheelRadius: 0.42,
      wheelWidth: 0.28,
      hasLightbar: true,
      hasBunnyDecal: true
    }
  },
  {
    id: 'crimson_gt',
    name: 'Crimson Grand Tourer',
    manufacturer: 'Mainland Executive Fleet',
    description: 'Low-slung luxury roadster designed for mainland asphalt tracks. Maximum land top-speed, sharp cornering.',
    driver: 'crimson',
    stats: {
      speed: 10,
      acceleration: 7,
      handling: 9,
      weight: 4,
      fuelEfficiency: 5,
      amphibiousThrust: 4
    },
    visual: {
      type: 'roadster',
      bodyColor: [0.7, 0.05, 0.05],       // crimson red
      accentColor: [1.0, 0.85, 0.0],      // gold trim
      bodyWidth: 2.0,
      bodyHeight: 0.85,
      bodyLength: 4.0,
      wheelRadius: 0.35,
      wheelWidth: 0.25,
      hasThrusters: false,
      hasSpoiler: true
    }
  }
];

// Helper to get vehicle by ID
export function getVehicleById(id) {
  return VEHICLES.find(v => v.id === id);
}

// Normalize a stat (1-10) to a 0-1 float
export function normalizeStat(value) {
  return Math.max(0, Math.min(1, value / 10));
}
