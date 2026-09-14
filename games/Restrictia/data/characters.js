// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Character / Driver Profiles & Voice Configuration
// Tomodachi Life-Style Voice Synthesis Parameters
// ═══════════════════════════════════════════════════════════════

export const CHARACTERS = {
  miles: {
    id: 'miles',
    name: 'Miles',
    alias: 'Nobodii',
    portraitColor: '#00e5ff',
    // Voice config: Mid pitch, fast, robotic, slightly tense
    voice: {
      pitch: 1.2,
      rate: 1.6,
      volume: 0.9,
      // Tomodachi-style: syllable duration variation
      syllableSpeed: 60,    // ms per syllable
      pitchVariance: 0.15,  // random pitch wobble per syllable
      roboticFilter: true
    },
    lines: {
      boost: "I'm taking the thrusters!",
      idle: "Not wearing that shirt again.",
      collision: "Clear the chute!",
      water_enter: "Deploying hydrofoils!",
      low_fuel: "Batteries draining fast...",
      zone_restrictia: "Back in the sector...",
      zone_divide: "Into the divide!",
      zone_crimson: "Crimson territory ahead."
    }
  },

  crimson: {
    id: 'crimson',
    name: 'President Crimson',
    alias: 'The President',
    portraitColor: '#ff1744',
    // Voice config: Low pitch, authoritative, steady cadence
    voice: {
      pitch: 0.6,
      rate: 0.9,
      volume: 1.0,
      syllableSpeed: 100,
      pitchVariance: 0.05,
      roboticFilter: true
    },
    lines: {
      boost: "Full executive power.",
      idle: "Welcome to Crimson Island!",
      collision: "The treaty is burnt.",
      water_enter: "Naval operations engaged.",
      low_fuel: "Fuel reserves critical.",
      zone_restrictia: "Enemy territory. Stay sharp.",
      zone_divide: "Cross the divide.",
      zone_crimson: "Check out my statue!"
    }
  },

  lily: {
    id: 'lily',
    name: 'Lily',
    alias: 'Perimeter',
    portraitColor: '#e040fb',
    // Voice config: High pitch, fast-paced, sharp robotic inflection
    voice: {
      pitch: 1.8,
      rate: 1.8,
      volume: 0.85,
      syllableSpeed: 45,
      pitchVariance: 0.25,
      roboticFilter: true
    },
    lines: {
      boost: "Friendzone speed active!",
      idle: "Watch the perimeter!",
      collision: "Don't crash the sled!",
      water_enter: "Amphibious mode now!",
      low_fuel: "Charge running low!",
      zone_restrictia: "Checkpoint spotted!",
      zone_divide: "Open water, stay alert!",
      zone_crimson: "Nice beaches down here."
    }
  },

  blue: {
    id: 'blue',
    name: 'Blue',
    alias: 'Iron',
    portraitColor: '#448aff',
    // Voice config: Very low pitch, flat, completely monotone and unbothered
    voice: {
      pitch: 0.35,
      rate: 0.75,
      volume: 0.8,
      syllableSpeed: 130,
      pitchVariance: 0.02,   // almost zero variation = monotone
      roboticFilter: true
    },
    lines: {
      boost: "Solid iron, man.",
      idle: "I'm on your side.",
      collision: "Didn't even feel that hit.",
      water_enter: "Submerging.",
      low_fuel: "Fuel. Low.",
      zone_restrictia: "Concrete.",
      zone_divide: "Water.",
      zone_crimson: "Sand."
    }
  },

  james: {
    id: 'james',
    name: 'James Anderdingus',
    alias: 'Anderdingus',
    portraitColor: '#ffea00',
    // Voice config: High, jittery, erratic pitch with variable speech rate
    voice: {
      pitch: 1.5,
      rate: 2.0,
      volume: 1.0,
      syllableSpeed: 35,
      pitchVariance: 0.5,    // extreme variation = jittery
      roboticFilter: true
    },
    lines: {
      boost: "MY NAME IS ANDERDINGUSSSSSSSSS!",
      idle: "Watch the foot!",
      collision: "Watch the foot!",
      water_enter: "WATER WATER WATER!",
      low_fuel: "The Triple-As are dying!",
      zone_restrictia: "THE BUNNY ZONE!",
      zone_divide: "OCEAN! BIG OCEAN!",
      zone_crimson: "Is that a STATUE?!"
    }
  }
};

// Map vehicle IDs to their default drivers
export const VEHICLE_DRIVER_MAP = {
  milestech_mk1: 'miles',
  milestech_surveyor: 'blue',
  waymo_ipace: 'lily',
  waymo_ojai: 'crimson',
  bunny_enforcer: 'james',
  crimson_gt: 'crimson'
};

export function getCharacterById(id) {
  return CHARACTERS[id] || null;
}

export function getDriverForVehicle(vehicleId) {
  const driverId = VEHICLE_DRIVER_MAP[vehicleId];
  return driverId ? CHARACTERS[driverId] : null;
}
