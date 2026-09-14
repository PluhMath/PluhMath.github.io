// ═══════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Physics Engine — Arcade Kart Physics, Drift, Fuel, Amphibious
// ═══════════════════════════════════════════════════════════════

import { normalizeStat } from '../data/vehicles.js';

export class PhysicsEngine {
  constructor(game) {
    this.game = game;

    // Physics constants
    this.GRAVITY = -25;
    this.GROUND_Y = 0.5;       // ground level + half vehicle height
    this.WATER_LEVEL = -0.5;
    this.DRAG_GROUND = 0.98;
    this.DRAG_WATER = 0.96;
    this.DRAG_AIR = 0.995;

    // Drift boost values
    this.DRIFT_BLUE_TIME = 0.8;    // seconds to reach blue sparks
    this.DRIFT_ORANGE_TIME = 2.0;  // seconds to reach orange sparks
    this.DRIFT_BOOST_BLUE = 1.4;   // boost multiplier
    this.DRIFT_BOOST_ORANGE = 2.0;
    this.boostTimer = 0;
    this.boostMultiplier = 1.0;

    // Fuel
    this.FUEL_DRAIN_RATE = 0.8;    // per second while driving
    this.FUEL_PIT_RATE = 25;       // refuel rate per second at pit stop
    this.CRAWL_SPEED = 5;          // max speed when out of fuel
  }

  update(dt) {
    const g = this.game;
    const stats = g.currentVehicle.stats;
    const input = g.input;

    // ─── Acceleration ───
    const accelForce = normalizeStat(stats.acceleration) * 60;
    const topSpeed = normalizeStat(stats.speed) * 80;
    const handling = normalizeStat(stats.handling);
    const weight = normalizeStat(stats.weight);

    // Effective max speed (reduced when out of fuel)
    let effectiveTopSpeed = topSpeed;
    if (g.pitStopsEnabled && g.fuel <= 0) {
      effectiveTopSpeed = this.CRAWL_SPEED;
    }

    // Forward/backward acceleration
    let accel = 0;
    if (input.forward) {
      accel = accelForce;
    } else if (input.backward) {
      accel = -accelForce * 0.5; // reverse is slower
    }

    // Apply boost multiplier
    accel *= this.boostMultiplier;

    // Calculate forward direction
    const forwardX = Math.sin(g.rotation.y);
    const forwardZ = Math.cos(g.rotation.y);

    // Apply acceleration
    g.velocity.x += forwardX * accel * dt;
    g.velocity.z += forwardZ * accel * dt;

    // Calculate current speed (magnitude in forward direction)
    g.speed = Math.sqrt(g.velocity.x * g.velocity.x + g.velocity.z * g.velocity.z);

    // Speed cap
    if (g.speed > effectiveTopSpeed) {
      const ratio = effectiveTopSpeed / g.speed;
      g.velocity.x *= ratio;
      g.velocity.z *= ratio;
      g.speed = effectiveTopSpeed;
    }

    // ─── Steering ───
    let steerAmount = 0;
    const steerSpeed = (1.5 + handling * 2.5) * (g.isDrifting ? 1.6 : 1.0);

    if (input.left) steerAmount = -steerSpeed;
    if (input.right) steerAmount = steerSpeed;

    // Steering is velocity-dependent (no turning when stationary)
    const speedFactor = Math.min(1, g.speed / 10);
    g.angularVelocity = steerAmount * speedFactor;
    g.rotation.y += g.angularVelocity * dt;

    // ─── Drift / Hop System ───
    if (input.drift && !g.isDrifting && !g.hopActive && g.speed > 5) {
      // Initiate hop
      g.hopActive = true;
      g.hopVelocity = 8;
      g.driftDirection = input.left ? -1 : (input.right ? 1 : 0);
    }

    // Hop in air
    if (g.hopActive) {
      g.position.y += g.hopVelocity * dt;
      g.hopVelocity += this.GRAVITY * dt;

      if (g.position.y <= this.getGroundHeight(g.position.x, g.position.z)) {
        g.position.y = this.getGroundHeight(g.position.x, g.position.z);
        g.hopActive = false;
        g.hopVelocity = 0;

        // Start drift if still holding drift button
        if (input.drift && g.speed > 5) {
          g.isDrifting = true;
          g.driftTimer = 0;
          g.driftStage = 0;
          if (g.driftDirection === 0) {
            g.driftDirection = input.left ? -1 : 1;
          }
        }
      }
    }

    // Active drift
    if (g.isDrifting) {
      if (!input.drift) {
        // Released — end drift normally (boost triggered in input handler)
        g.isDrifting = false;
      } else {
        g.driftTimer += dt;

        // Update drift direction lock with slight player influence
        if (input.left) g.driftDirection = -1;
        if (input.right) g.driftDirection = 1;

        // Apply drift slide force (outward centrifugal slide)
        const slideForce = -g.driftDirection * 15 * (1 - handling * 0.3);
        const perpX = Math.cos(g.rotation.y);
        const perpZ = -Math.sin(g.rotation.y);
        g.velocity.x += perpX * slideForce * dt;
        g.velocity.z += perpZ * slideForce * dt;

        // Counter-steer while drifting
        g.rotation.y += g.driftDirection * 1.5 * dt;

        // Drift stage progression
        if (g.driftTimer >= this.DRIFT_ORANGE_TIME) {
          g.driftStage = 2; // orange sparks
        } else if (g.driftTimer >= this.DRIFT_BLUE_TIME) {
          g.driftStage = 1; // blue sparks
        }
      }
    }

    // ─── Boost decay ───
    if (this.boostTimer > 0) {
      this.boostTimer -= dt;
      if (this.boostTimer <= 0) {
        this.boostMultiplier = 1.0;
        this.boostTimer = 0;
      }
    }

    // ─── Gravity & Ground ───
    const groundH = this.getGroundHeight(g.position.x, g.position.z);

    if (!g.hopActive) {
      if (g.position.y > groundH + 0.1 && !g.isInWater) {
        // Airborne
        g.velocity.y += this.GRAVITY * dt;
      } else if (!g.isInWater) {
        // On ground
        g.position.y = groundH;
        g.velocity.y = 0;
      }
    }

    // ─── Water / Amphibious ───
    if (g.position.y < this.WATER_LEVEL && !g.isSubmerged) {
      // Entering water surface
      if (!g.isInWater) {
        g.isInWater = true;
        g.waterSystem.spawnSplash(g.position.x, g.position.z);

        // Voice line
        if (g.currentDriver) {
          g.voiceEngine.speak(g.currentDriver.lines.water_enter, g.currentDriver);
          g.hud.showSpeechBubble(g.currentDriver.lines.water_enter, g.currentDriver);
        }
      }
    }

    if (g.isInWater) {
      // Buoyancy
      const waterSurface = this.WATER_LEVEL;
      const submergeTarget = g.input.submerge ? waterSurface - 8 : waterSurface;

      if (g.input.submerge) {
        // Dive
        g.velocity.y -= 12 * dt;
        g.isSubmerged = g.position.y < waterSurface - 1;
      } else if (g.input.surface || g.position.y < waterSurface) {
        // Surface / buoyancy
        const buoyancy = (waterSurface - g.position.y) * 5;
        g.velocity.y += buoyancy * dt;
        g.isSubmerged = g.position.y < waterSurface - 1;
      }

      // Water drag
      g.velocity.x *= this.DRAG_WATER;
      g.velocity.z *= this.DRAG_WATER;
      g.velocity.y *= 0.95;

      // Amphibious thrust stat affects water speed
      const ampThrust = normalizeStat(g.currentVehicle.stats.amphibiousThrust);
      if (input.forward) {
        g.velocity.x += forwardX * accelForce * ampThrust * 0.7 * dt;
        g.velocity.z += forwardZ * accelForce * ampThrust * 0.7 * dt;
      }

      // Wave hopping (surface mode)
      if (!g.isSubmerged && g.position.y >= waterSurface - 0.5) {
        const wavePhase = performance.now() / 1000;
        const waveHeight = Math.sin(wavePhase * 2 + g.position.x * 0.1) * 0.3
                         + Math.sin(wavePhase * 1.3 + g.position.z * 0.15) * 0.2;
        g.position.y = waterSurface + waveHeight;
      }

      // Check if leaving water (driving up a beach ramp)
      if (g.position.y > waterSurface + 0.5 && groundH > waterSurface) {
        g.isInWater = false;
        g.isSubmerged = false;
      }
    } else {
      // Ground drag
      g.velocity.x *= this.DRAG_GROUND;
      g.velocity.z *= this.DRAG_GROUND;
    }

    // ─── Apply Velocity ───
    g.position.x += g.velocity.x * dt;
    g.position.y += g.velocity.y * dt;
    g.position.z += g.velocity.z * dt;

    // ─── Depth tracking ───
    g.depth = Math.max(0, this.WATER_LEVEL - g.position.y);

    // ─── Fuel System ───
    if (g.pitStopsEnabled && g.speed > 1) {
      const efficiency = normalizeStat(g.currentVehicle.stats.fuelEfficiency);
      const drainRate = this.FUEL_DRAIN_RATE * (1 - efficiency * 0.6);
      g.fuel = Math.max(0, g.fuel - drainRate * dt);

      // Low fuel warning
      if (g.fuel < 15 && g.fuel > 14.5) {
        if (g.currentDriver) {
          g.voiceEngine.speak(g.currentDriver.lines.low_fuel, g.currentDriver);
          g.hud.showSpeechBubble(g.currentDriver.lines.low_fuel, g.currentDriver);
        }
      }
    }

    // ─── Pit Stop Refueling ───
    if (g.pitStopsEnabled) {
      const pitStops = g.worldBuilder.pitStopPositions || [];
      for (const pit of pitStops) {
        const dx = g.position.x - pit.x;
        const dz = g.position.z - pit.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < 6 && g.speed < 5) {
          g.fuel = Math.min(g.maxFuel, g.fuel + this.FUEL_PIT_RATE * dt);
        }
      }
    }

    // ─── World Bounds ───
    const WORLD_SIZE = 500;
    g.position.x = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, g.position.x));
    g.position.z = Math.max(-WORLD_SIZE, Math.min(WORLD_SIZE, g.position.z));

    // Prevent falling to oblivion
    if (g.position.y < -30) {
      g.position.y = this.WATER_LEVEL;
      g.velocity.y = 0;
      g.isInWater = true;
    }
  }

  // ─── Release Drift → Apply Boost ───
  releaseDrift() {
    const g = this.game;
    if (!g.isDrifting) return;

    g.isDrifting = false;

    if (g.driftStage >= 2) {
      // Orange boost
      this.boostMultiplier = this.DRIFT_BOOST_ORANGE;
      this.boostTimer = 1.5;
      if (g.currentDriver) {
        g.voiceEngine.speak(g.currentDriver.lines.boost, g.currentDriver);
        g.hud.showSpeechBubble(g.currentDriver.lines.boost, g.currentDriver);
      }
    } else if (g.driftStage >= 1) {
      // Blue boost
      this.boostMultiplier = this.DRIFT_BOOST_BLUE;
      this.boostTimer = 0.8;
    }

    g.driftTimer = 0;
    g.driftStage = 0;
    g.driftDirection = 0;
  }

  // ─── Ground Height (simple heightmap) ───
  getGroundHeight(x, z) {
    // Central divide is open ocean / floor
    if (z > -20 && z < 100) {
      return -6; // ocean floor
    }
    // South Zone (Crimson Island) and North Zone (Restrictia Sector) land height
    return 0.4;
  }
}
