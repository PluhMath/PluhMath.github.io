// ═══════════════════════════════════════════════════════════════════════════
// The Chronicles of Restrictia: Island Overdrive 3D
// Native C++ Edition — Built with raylib 5.5
// ═══════════════════════════════════════════════════════════════════════════

#include "raylib.h"
#include "raymath.h"
#include "rlgl.h"
#include <cmath>
#include <cstring>
#include <cstdio>
#include <cstdlib>
#include <ctime>

// ─── Constants ───────────────────────────────────────────────────────────
static const int SCREEN_W = 1280;
static const int SCREEN_H = 720;
static const float FIXED_DT = 1.0f / 60.0f;
static const float GRAVITY = -25.0f;
static const float GROUND_Y = 0.4f;
static const float WATER_LEVEL = -0.5f;
static const float DRAG_GROUND = 0.98f;
static const float DRAG_WATER = 0.96f;
static const float WORLD_SIZE = 500.0f;

// Drift boost
static const float DRIFT_BLUE_TIME = 0.8f;
static const float DRIFT_ORANGE_TIME = 2.0f;
static const float DRIFT_BOOST_BLUE = 1.4f;
static const float DRIFT_BOOST_ORANGE = 2.0f;

// Fuel
static const float FUEL_DRAIN_RATE = 0.8f;
static const float FUEL_PIT_RATE = 25.0f;
static const float CRAWL_SPEED = 5.0f;

// Secret island
static const float SECRET_ISLAND_X = 350.0f;
static const float SECRET_ISLAND_Z = -500.0f;
static const float SECRET_ISLAND_RADIUS = 60.0f;

// ─── Game States ─────────────────────────────────────────────────────────
enum GameState {
    STATE_LOADING,
    STATE_MENU,
    STATE_VEHICLE_SELECT,
    STATE_PLAYING,
    STATE_PAUSED,
    STATE_CONTROLS
};

// ─── Vehicle Stats ───────────────────────────────────────────────────────
struct VehicleStats {
    int speed;
    int acceleration;
    int handling;
    int weight;
    int fuelEfficiency;
    int amphibiousThrust;
};

// ─── Vehicle Visual ──────────────────────────────────────────────────────
enum VehicleType {
    VT_SLED, VT_HEAVY_TRUCK, VT_CROSSOVER, VT_VAN,
    VT_ARMORED_CRUISER, VT_ROADSTER
};

struct VehicleVisual {
    VehicleType type;
    Color bodyColor;
    Color accentColor;
    float bodyWidth;
    float bodyHeight;
    float bodyLength;
    float wheelRadius;
    float wheelWidth;
    bool hasLiDAR;
    bool hasLightbar;
    bool hasSpoiler;
    bool hasBunnyDecal;
    bool hasBatteryPack;
    bool hasArmorPlating;
};

// ─── Vehicle Definition ──────────────────────────────────────────────────
struct VehicleDef {
    const char* id;
    const char* name;
    const char* manufacturer;
    const char* description;
    const char* driverId;
    VehicleStats stats;
    VehicleVisual visual;
};

// ─── Character / Driver ──────────────────────────────────────────────────
struct DriverLines {
    const char* boost;
    const char* idle;
    const char* collision;
    const char* waterEnter;
    const char* lowFuel;
    const char* zoneRestrictia;
    const char* zoneDivide;
    const char* zoneCrimson;
    const char* secretIsland;
};

struct Driver {
    const char* id;
    const char* name;
    const char* alias;
    Color portraitColor;
    DriverLines lines;
};

// ─── Pit Stop ────────────────────────────────────────────────────────────
struct PitStop {
    float x, z;
    const char* label;
};

// ─── Speech Bubble ───────────────────────────────────────────────────────
struct SpeechBubble {
    char text[256];
    char driverName[64];
    Color driverColor;
    float timer;
    bool active;
};

// ─── Input State ─────────────────────────────────────────────────────────
struct InputState {
    bool forward, backward, left, right;
    bool drift, submerge, surface;
    bool pause;
};

// ═══════════════════════════════════════════════════════════════════════════
//  DATA: VEHICLES
// ═══════════════════════════════════════════════════════════════════════════
static const int NUM_VEHICLES = 6;
static const VehicleDef VEHICLES[NUM_VEHICLES] = {
    {
        "milestech_mk1", "MilesTech Mk. I \"The Sled\"", "MilesTech",
        "Armored wooden pallet fitted with 58,000 AAA cell batteries\nand modular tectonic thrusters.",
        "miles",
        {9, 10, 6, 3, 4, 7},
        {VT_SLED, {89, 64, 38, 255}, {0, 229, 255, 255},
         2.2f, 0.5f, 3.5f, 0.3f, 0.2f,
         false, false, false, false, true, false}
    },
    {
        "milestech_surveyor", "MilesTech \"Surveyor 26\"", "MilesTech",
        "Reinforced alloy chassis with concrete/sand heat plating.\nHeavyweight, immune to minor collisions.",
        "blue",
        {5, 4, 7, 10, 6, 9},
        {VT_HEAVY_TRUCK, {77, 82, 89, 255}, {217, 140, 26, 255},
         2.8f, 1.6f, 4.2f, 0.55f, 0.35f,
         false, false, false, false, false, true}
    },
    {
        "waymo_ipace", "Waymo I-PACE Cruiser", "Waymo Autonomous Fleet",
        "Fully enclosed electric autonomous crossover with\nspinning rooftop LiDAR and sensor pods.",
        "lily",
        {7, 8, 8, 6, 9, 6},
        {VT_CROSSOVER, {242, 242, 247, 255}, {51, 153, 255, 255},
         2.2f, 1.3f, 3.8f, 0.4f, 0.25f,
         true, false, false, false, false, false}
    },
    {
        "waymo_ojai", "Waymo Ojai Multi-Passenger", "Waymo Autonomous Fleet",
        "Spacious 3D van with wide wheelbase.\nHeavy mass, excellent ramming momentum.",
        "crimson",
        {5, 5, 9, 9, 7, 5},
        {VT_VAN, {224, 224, 230, 255}, {26, 204, 128, 255},
         2.6f, 1.9f, 4.5f, 0.42f, 0.3f,
         true, false, false, false, false, false}
    },
    {
        "bunny_enforcer", "Council \"Bunny Edict\" Enforcer", "Restrictia State Fleet",
        "Armored police vehicle adorned with the mandatory\nsmiling rabbit decal.",
        "james",
        {6, 6, 7, 9, 5, 5},
        {VT_ARMORED_CRUISER, {26, 26, 31, 255}, {255, 51, 51, 255},
         2.4f, 1.2f, 4.0f, 0.42f, 0.28f,
         false, true, false, true, false, false}
    },
    {
        "crimson_gt", "Crimson Grand Tourer", "Mainland Executive Fleet",
        "Low-slung luxury roadster designed for mainland\nasphalt tracks. Maximum land top-speed.",
        "crimson",
        {10, 7, 9, 4, 5, 4},
        {VT_ROADSTER, {179, 13, 13, 255}, {255, 217, 0, 255},
         2.0f, 0.85f, 4.0f, 0.35f, 0.25f,
         false, false, true, false, false, false}
    }
};

// ═══════════════════════════════════════════════════════════════════════════
//  DATA: DRIVERS
// ═══════════════════════════════════════════════════════════════════════════
static const int NUM_DRIVERS = 5;
static const Driver DRIVERS[NUM_DRIVERS] = {
    {
        "miles", "Miles", "Nobodii", {0, 229, 255, 255},
        {
            "I'm taking the thrusters!",
            "Not wearing that shirt again.",
            "Clear the chute!",
            "Deploying hydrofoils!",
            "Batteries draining fast...",
            "Back in the sector...",
            "Into the divide!",
            "Crimson territory ahead.",
            "What... is this place?!"
        }
    },
    {
        "crimson", "President Crimson", "The President", {255, 23, 68, 255},
        {
            "Full executive power.",
            "Welcome to Crimson Island!",
            "The treaty is burnt.",
            "Naval operations engaged.",
            "Fuel reserves critical.",
            "Enemy territory. Stay sharp.",
            "Cross the divide.",
            "Check out my statue!",
            "This was never on any map..."
        }
    },
    {
        "lily", "Lily", "Perimeter", {224, 64, 251, 255},
        {
            "Friendzone speed active!",
            "Watch the perimeter!",
            "Don't crash the sled!",
            "Amphibious mode now!",
            "Charge running low!",
            "Checkpoint spotted!",
            "Open water, stay alert!",
            "Nice beaches down here.",
            "Sensors are going crazy out here..."
        }
    },
    {
        "blue", "Blue", "Iron", {68, 138, 255, 255},
        {
            "Solid iron, man.",
            "I'm on your side.",
            "Didn't even feel that hit.",
            "Submerging.",
            "Fuel. Low.",
            "Concrete.",
            "Water.",
            "Sand.",
            "Interesting."
        }
    },
    {
        "james", "James Anderdingus", "Anderdingus", {255, 234, 0, 255},
        {
            "MY NAME IS ANDERDINGUSSSSSSSSS!",
            "Watch the foot!",
            "Watch the foot!",
            "WATER WATER WATER!",
            "The Triple-As are dying!",
            "THE BUNNY ZONE!",
            "OCEAN! BIG OCEAN!",
            "Is that a STATUE?!",
            "WHAT IS THATTTTTT?!"
        }
    }
};

// ─── Pit Stop Positions ──────────────────────────────────────────────────
static const int NUM_PITSTOPS = 5;
static const PitStop PIT_STOPS[NUM_PITSTOPS] = {
    {20.0f, -90.0f, "Crimson Fuel Dock"},
    {-40.0f, -60.0f, "Beach Charging Station"},
    {0.0f, 140.0f, "Restrictia Garage"},
    {-70.0f, 200.0f, "Sector Fuel Bay"},
    {60.0f, 260.0f, "Industrial Charge Port"}
};

// ═══════════════════════════════════════════════════════════════════════════
//  HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════
static float NormStat(int val) { return Clamp((float)val / 10.0f, 0.0f, 1.0f); }
static float RandF(float lo, float hi) { return lo + (float)rand() / (float)RAND_MAX * (hi - lo); }

static const Driver* FindDriver(const char* id) {
    for (int i = 0; i < NUM_DRIVERS; i++) {
        if (strcmp(DRIVERS[i].id, id) == 0) return &DRIVERS[i];
    }
    return &DRIVERS[0];
}

static float GetGroundHeight(float x, float z) {
    // Secret island ground
    float dxS = x - SECRET_ISLAND_X;
    float dzS = z - SECRET_ISLAND_Z;
    float distSecret = sqrtf(dxS * dxS + dzS * dzS);
    if (distSecret < SECRET_ISLAND_RADIUS) return 0.4f;

    // Central divide is open ocean floor
    if (z > -20.0f && z < 100.0f) return -6.0f;
    // South & North zones are land
    return 0.4f;
}

// ═══════════════════════════════════════════════════════════════════════════
//  GAME STATE STRUCT
// ═══════════════════════════════════════════════════════════════════════════
struct Game {
    GameState state;
    InputState input;

    // Vehicle
    int selectedVehicleIdx;
    const VehicleDef* currentVehicle;
    const Driver* currentDriver;

    // Physics
    Vector3 position;
    Vector3 velocity;
    float rotationY;
    float angularVelocity;
    float speed;
    float maxSpeed;

    // Drift
    bool isDrifting;
    float driftTimer;
    int driftStage; // 0=none, 1=blue, 2=orange
    int driftDirection; // -1 left, 1 right
    bool hopActive;
    float hopVelocity;

    // Boost
    float boostTimer;
    float boostMultiplier;

    // Water
    bool isInWater;
    bool isSubmerged;
    float depth;

    // Fuel
    float fuel;
    float maxFuel;
    bool pitStopsEnabled;

    // Zone
    const char* currentZone;
    const char* lastZoneAnnouncement;

    // Camera
    Camera3D camera;
    Vector3 cameraTarget;
    float cameraAlpha; // horizontal angle around target
    float cameraBeta;  // vertical angle
    float cameraRadius;
    float cameraFov;

    // Speech bubble
    SpeechBubble speech;

    // Menu
    int menuSelection;
    int vehicleSelectIdx;

    // Loading
    float loadProgress;
    float loadTimer;

    // Timing
    float accumulator;

    // Easter egg
    bool secretIslandFound;

    // Lore text
    int loreIndex;
    float loreTimer;
};

// ═══════════════════════════════════════════════════════════════════════════
//  SPEECH BUBBLE
// ═══════════════════════════════════════════════════════════════════════════
static void ShowSpeech(Game& g, const char* text, const Driver* driver) {
    if (!driver || !text) return;
    strncpy(g.speech.text, text, 255);
    g.speech.text[255] = '\0';
    strncpy(g.speech.driverName, driver->name, 63);
    g.speech.driverName[63] = '\0';
    g.speech.driverColor = driver->portraitColor;
    g.speech.timer = 3.0f;
    g.speech.active = true;
}

// ═══════════════════════════════════════════════════════════════════════════
//  INIT GAME
// ═══════════════════════════════════════════════════════════════════════════
static void InitGame(Game& g) {
    g.state = STATE_LOADING;
    memset(&g.input, 0, sizeof(InputState));

    g.selectedVehicleIdx = 0;
    g.currentVehicle = nullptr;
    g.currentDriver = nullptr;

    g.position = {0, 1, -80};
    g.velocity = {0, 0, 0};
    g.rotationY = 0;
    g.angularVelocity = 0;
    g.speed = 0;
    g.maxSpeed = 0;

    g.isDrifting = false;
    g.driftTimer = 0;
    g.driftStage = 0;
    g.driftDirection = 0;
    g.hopActive = false;
    g.hopVelocity = 0;

    g.boostTimer = 0;
    g.boostMultiplier = 1.0f;

    g.isInWater = false;
    g.isSubmerged = false;
    g.depth = 0;

    g.fuel = 100;
    g.maxFuel = 100;
    g.pitStopsEnabled = false;

    g.currentZone = "crimson";
    g.lastZoneAnnouncement = "";

    // Camera
    g.camera = {0};
    g.camera.position = {0, 12, -94};
    g.camera.target = {0, 2, -80};
    g.camera.up = {0, 1, 0};
    g.camera.fovy = 50.0f;
    g.camera.projection = CAMERA_PERSPECTIVE;
    g.cameraTarget = {0, 2, -80};
    g.cameraAlpha = 0;
    g.cameraBeta = PI / 3.5f;
    g.cameraRadius = 14.0f;
    g.cameraFov = 50.0f;

    g.speech = {0};
    g.menuSelection = 0;
    g.vehicleSelectIdx = 0;
    g.loadProgress = 0;
    g.loadTimer = 0;
    g.accumulator = 0;
    g.secretIslandFound = false;
    g.loreIndex = 0;
    g.loreTimer = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
//  START GAME WITH SELECTED VEHICLE
// ═══════════════════════════════════════════════════════════════════════════
static void StartGame(Game& g, int vehicleIdx) {
    g.selectedVehicleIdx = vehicleIdx;
    g.currentVehicle = &VEHICLES[vehicleIdx];
    g.currentDriver = FindDriver(g.currentVehicle->driverId);
    g.maxSpeed = g.currentVehicle->stats.speed * 8.0f;

    // Reset
    g.fuel = g.maxFuel;
    g.speed = 0;
    g.depth = 0;
    g.isInWater = false;
    g.isSubmerged = false;
    g.isDrifting = false;
    g.driftTimer = 0;
    g.driftStage = 0;
    g.hopActive = false;
    g.hopVelocity = 0;
    g.boostTimer = 0;
    g.boostMultiplier = 1.0f;
    g.secretIslandFound = false;

    g.position = {0, 1, -80};
    g.velocity = {0, 0, 0};
    g.rotationY = 0;
    g.angularVelocity = 0;

    g.cameraTarget = g.position;
    g.cameraTarget.y += 2.0f;
    g.cameraAlpha = 0;
    g.cameraBeta = PI / 3.5f;
    g.cameraRadius = 14.0f;

    g.state = STATE_PLAYING;
    ShowSpeech(g, g.currentDriver->lines.idle, g.currentDriver);
}

// ═══════════════════════════════════════════════════════════════════════════
//  INPUT
// ═══════════════════════════════════════════════════════════════════════════
static void UpdateInput(Game& g) {
    g.input.forward   = IsKeyDown(KEY_W) || IsKeyDown(KEY_UP);
    g.input.backward  = IsKeyDown(KEY_S) || IsKeyDown(KEY_DOWN);
    g.input.left      = IsKeyDown(KEY_A) || IsKeyDown(KEY_LEFT);
    g.input.right     = IsKeyDown(KEY_D) || IsKeyDown(KEY_RIGHT);
    g.input.drift     = IsKeyDown(KEY_SPACE);
    g.input.submerge  = IsKeyDown(KEY_LEFT_SHIFT) || IsKeyDown(KEY_RIGHT_SHIFT) ||
                        IsKeyDown(KEY_C) || IsKeyDown(KEY_Q);
    g.input.surface   = IsKeyDown(KEY_LEFT_CONTROL) || IsKeyDown(KEY_RIGHT_CONTROL) ||
                        IsKeyDown(KEY_E);
    g.input.pause     = IsKeyPressed(KEY_ESCAPE);
}

// ═══════════════════════════════════════════════════════════════════════════
//  DRIFT RELEASE → BOOST
// ═══════════════════════════════════════════════════════════════════════════
static void ReleaseDrift(Game& g) {
    if (!g.isDrifting) return;
    g.isDrifting = false;

    if (g.driftStage >= 2) {
        g.boostMultiplier = DRIFT_BOOST_ORANGE;
        g.boostTimer = 1.5f;
        ShowSpeech(g, g.currentDriver->lines.boost, g.currentDriver);
    } else if (g.driftStage >= 1) {
        g.boostMultiplier = DRIFT_BOOST_BLUE;
        g.boostTimer = 0.8f;
    }
    g.driftTimer = 0;
    g.driftStage = 0;
    g.driftDirection = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
//  PHYSICS UPDATE (fixed timestep)
// ═══════════════════════════════════════════════════════════════════════════
static void UpdatePhysics(Game& g, float dt) {
    const VehicleStats& stats = g.currentVehicle->stats;
    float accelForce = NormStat(stats.acceleration) * 60.0f;
    float topSpeed   = NormStat(stats.speed) * 80.0f;
    float handling   = NormStat(stats.handling);
    float weight     = NormStat(stats.weight);

    float effectiveTopSpeed = topSpeed;
    if (g.pitStopsEnabled && g.fuel <= 0) effectiveTopSpeed = CRAWL_SPEED;

    // Acceleration
    float accel = 0;
    if (g.input.forward)       accel = accelForce;
    else if (g.input.backward) accel = -accelForce * 0.5f;
    accel *= g.boostMultiplier;

    float forwardX = sinf(g.rotationY);
    float forwardZ = cosf(g.rotationY);

    g.velocity.x += forwardX * accel * dt;
    g.velocity.z += forwardZ * accel * dt;

    g.speed = sqrtf(g.velocity.x * g.velocity.x + g.velocity.z * g.velocity.z);

    // Speed cap
    if (g.speed > effectiveTopSpeed) {
        float ratio = effectiveTopSpeed / g.speed;
        g.velocity.x *= ratio;
        g.velocity.z *= ratio;
        g.speed = effectiveTopSpeed;
    }

    // Steering
    float steerAmount = 0;
    float steerSpeed = (1.5f + handling * 2.5f) * (g.isDrifting ? 1.6f : 1.0f);
    if (g.input.left)  steerAmount = -steerSpeed;
    if (g.input.right) steerAmount = steerSpeed;

    float speedFactor = fminf(1.0f, g.speed / 10.0f);
    g.angularVelocity = steerAmount * speedFactor;
    g.rotationY += g.angularVelocity * dt;

    // Drift / Hop
    if (g.input.drift && !g.isDrifting && !g.hopActive && g.speed > 5) {
        g.hopActive = true;
        g.hopVelocity = 8.0f;
        g.driftDirection = g.input.left ? -1 : (g.input.right ? 1 : 0);
    }

    if (g.hopActive) {
        g.position.y += g.hopVelocity * dt;
        g.hopVelocity += GRAVITY * dt;
        float groundH = GetGroundHeight(g.position.x, g.position.z);
        if (g.position.y <= groundH) {
            g.position.y = groundH;
            g.hopActive = false;
            g.hopVelocity = 0;
            if (g.input.drift && g.speed > 5) {
                g.isDrifting = true;
                g.driftTimer = 0;
                g.driftStage = 0;
                if (g.driftDirection == 0) g.driftDirection = g.input.left ? -1 : 1;
            }
        }
    }

    // Active drift
    if (g.isDrifting) {
        if (!g.input.drift) {
            ReleaseDrift(g);
        } else {
            g.driftTimer += dt;
            if (g.input.left) g.driftDirection = -1;
            if (g.input.right) g.driftDirection = 1;

            float slideForce = -(float)g.driftDirection * 15.0f * (1.0f - handling * 0.3f);
            float perpX = cosf(g.rotationY);
            float perpZ = -sinf(g.rotationY);
            g.velocity.x += perpX * slideForce * dt;
            g.velocity.z += perpZ * slideForce * dt;
            g.rotationY += (float)g.driftDirection * 1.5f * dt;

            if (g.driftTimer >= DRIFT_ORANGE_TIME) g.driftStage = 2;
            else if (g.driftTimer >= DRIFT_BLUE_TIME) g.driftStage = 1;
        }
    }

    // Boost decay
    if (g.boostTimer > 0) {
        g.boostTimer -= dt;
        if (g.boostTimer <= 0) {
            g.boostMultiplier = 1.0f;
            g.boostTimer = 0;
        }
    }

    // Gravity & Ground
    float groundH = GetGroundHeight(g.position.x, g.position.z);
    if (!g.hopActive) {
        if (g.position.y > groundH + 0.1f && !g.isInWater) {
            g.velocity.y += GRAVITY * dt;
        } else if (!g.isInWater) {
            g.position.y = groundH;
            g.velocity.y = 0;
        }
    }

    // Water / Amphibious
    if (g.position.y < WATER_LEVEL && !g.isSubmerged) {
        if (!g.isInWater) {
            g.isInWater = true;
            ShowSpeech(g, g.currentDriver->lines.waterEnter, g.currentDriver);
        }
    }

    if (g.isInWater) {
        if (g.input.submerge) {
            g.velocity.y -= 12.0f * dt;
            g.isSubmerged = g.position.y < WATER_LEVEL - 1.0f;
        } else if (g.input.surface || g.position.y < WATER_LEVEL) {
            float buoyancy = (WATER_LEVEL - g.position.y) * 5.0f;
            g.velocity.y += buoyancy * dt;
            g.isSubmerged = g.position.y < WATER_LEVEL - 1.0f;
        }

        g.velocity.x *= DRAG_WATER;
        g.velocity.z *= DRAG_WATER;
        g.velocity.y *= 0.95f;

        float ampThrust = NormStat(g.currentVehicle->stats.amphibiousThrust);
        if (g.input.forward) {
            g.velocity.x += forwardX * accelForce * ampThrust * 0.7f * dt;
            g.velocity.z += forwardZ * accelForce * ampThrust * 0.7f * dt;
        }

        // Wave hopping on surface
        if (!g.isSubmerged && g.position.y >= WATER_LEVEL - 0.5f) {
            float t = (float)GetTime();
            float waveH = sinf(t * 2.0f + g.position.x * 0.1f) * 0.3f
                        + sinf(t * 1.3f + g.position.z * 0.15f) * 0.2f;
            g.position.y = WATER_LEVEL + waveH;
        }

        // Leaving water
        if (g.position.y > WATER_LEVEL + 0.5f && groundH > WATER_LEVEL) {
            g.isInWater = false;
            g.isSubmerged = false;
        }
    } else {
        g.velocity.x *= DRAG_GROUND;
        g.velocity.z *= DRAG_GROUND;
    }

    // Apply velocity
    g.position.x += g.velocity.x * dt;
    g.position.y += g.velocity.y * dt;
    g.position.z += g.velocity.z * dt;

    // Depth tracking
    g.depth = fmaxf(0, WATER_LEVEL - g.position.y);

    // Fuel
    if (g.pitStopsEnabled && g.speed > 1) {
        float eff = NormStat(g.currentVehicle->stats.fuelEfficiency);
        float drain = FUEL_DRAIN_RATE * (1.0f - eff * 0.6f);
        g.fuel = fmaxf(0, g.fuel - drain * dt);
        if (g.fuel < 15 && g.fuel > 14.5f) {
            ShowSpeech(g, g.currentDriver->lines.lowFuel, g.currentDriver);
        }
    }

    // Pit Stop Refueling
    if (g.pitStopsEnabled) {
        for (int i = 0; i < NUM_PITSTOPS; i++) {
            float dx = g.position.x - PIT_STOPS[i].x;
            float dz = g.position.z - PIT_STOPS[i].z;
            float dist = sqrtf(dx * dx + dz * dz);
            if (dist < 6.0f && g.speed < 5.0f) {
                g.fuel = fminf(g.maxFuel, g.fuel + FUEL_PIT_RATE * dt);
            }
        }
    }

    // World Bounds (expand for secret island)
    g.position.x = Clamp(g.position.x, -WORLD_SIZE, WORLD_SIZE);
    g.position.z = Clamp(g.position.z, -WORLD_SIZE - 200.0f, WORLD_SIZE);

    // Prevent oblivion
    if (g.position.y < -30.0f) {
        g.position.y = WATER_LEVEL;
        g.velocity.y = 0;
        g.isInWater = true;
    }

    // Secret island detection
    float dxS = g.position.x - SECRET_ISLAND_X;
    float dzS = g.position.z - SECRET_ISLAND_Z;
    float distSecret = sqrtf(dxS * dxS + dzS * dzS);
    if (distSecret < SECRET_ISLAND_RADIUS + 20.0f && !g.secretIslandFound) {
        g.secretIslandFound = true;
        ShowSpeech(g, g.currentDriver->lines.secretIsland, g.currentDriver);
    }

    // Exhaust flame control — emit rate tied to acceleration
    // (handled in draw since raylib particles are immediate mode)
}

// ═══════════════════════════════════════════════════════════════════════════
//  ZONE DETECTION
// ═══════════════════════════════════════════════════════════════════════════
static void DetectZone(Game& g) {
    const char* zone = "crimson";
    float z = g.position.z;

    // Check secret island first
    float dxS = g.position.x - SECRET_ISLAND_X;
    float dzS = g.position.z - SECRET_ISLAND_Z;
    float distSecret = sqrtf(dxS * dxS + dzS * dzS);
    if (distSecret < SECRET_ISLAND_RADIUS + 30.0f) {
        zone = "forbidden";
    } else if (z > 100) {
        zone = "restrictia";
    } else if (z > -20) {
        zone = "divide";
    }

    if (strcmp(zone, g.currentZone) != 0) {
        g.currentZone = zone;
        if (strcmp(zone, g.lastZoneAnnouncement) != 0) {
            g.lastZoneAnnouncement = zone;
            const char* line = nullptr;
            if (strcmp(zone, "restrictia") == 0) line = g.currentDriver->lines.zoneRestrictia;
            else if (strcmp(zone, "divide") == 0) line = g.currentDriver->lines.zoneDivide;
            else if (strcmp(zone, "crimson") == 0) line = g.currentDriver->lines.zoneCrimson;
            else if (strcmp(zone, "forbidden") == 0) line = g.currentDriver->lines.secretIsland;
            if (line) ShowSpeech(g, line, g.currentDriver);
        }
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  CAMERA UPDATE
// ═══════════════════════════════════════════════════════════════════════════
static void UpdateCamera(Game& g) {
    float targetY = g.isSubmerged ? g.position.y + 1.0f : g.position.y + 2.0f;

    // Smooth chase
    g.cameraTarget.x += (g.position.x - g.cameraTarget.x) * 0.1f;
    g.cameraTarget.y += (targetY - g.cameraTarget.y) * 0.1f;
    g.cameraTarget.z += (g.position.z - g.cameraTarget.z) * 0.1f;

    // Auto-rotate behind vehicle
    float targetAlpha = g.rotationY + PI;
    float alphaDiff = targetAlpha - g.cameraAlpha;
    while (alphaDiff > PI)  alphaDiff -= PI * 2;
    while (alphaDiff < -PI) alphaDiff += PI * 2;
    g.cameraAlpha += alphaDiff * 0.05f;

    // Beta (pitch)
    float targetBeta = g.isDrifting ? PI / 3.2f : PI / 3.5f;
    g.cameraBeta += (targetBeta - g.cameraBeta) * 0.04f;

    // Radius (zoom out at speed)
    float speedRatio = (g.maxSpeed > 0) ? fminf(1.0f, g.speed / g.maxSpeed) : 0;
    float targetRadius = 12.0f + speedRatio * 6.0f;
    g.cameraRadius += (targetRadius - g.cameraRadius) * 0.04f;

    // Dynamic FOV
    float targetFov = 50.0f + speedRatio * 10.0f;
    g.cameraFov += (targetFov - g.cameraFov) * 0.05f;
    g.camera.fovy = g.cameraFov;

    // Camera vibration
    if (g.isDrifting || speedRatio > 0.8f) {
        float vib = g.isDrifting ? 0.05f : 0.02f * speedRatio;
        g.cameraTarget.x += RandF(-vib, vib);
        g.cameraTarget.y += RandF(-vib, vib);
    }

    // Compute camera position from spherical coords
    g.camera.position.x = g.cameraTarget.x + g.cameraRadius * sinf(g.cameraAlpha) * sinf(g.cameraBeta);
    g.camera.position.y = g.cameraTarget.y + g.cameraRadius * cosf(g.cameraBeta);
    g.camera.position.z = g.cameraTarget.z + g.cameraRadius * cosf(g.cameraAlpha) * sinf(g.cameraBeta);
    g.camera.target = g.cameraTarget;
}

// ═══════════════════════════════════════════════════════════════════════════
//  DRAW: VEHICLE (procedural mesh)
// ═══════════════════════════════════════════════════════════════════════════
static void DrawVehicle(const Game& g) {
    if (!g.currentVehicle) return;
    const VehicleVisual& v = g.currentVehicle->visual;

    // Push transform
    rlPushMatrix();
    rlTranslatef(g.position.x, g.position.y, g.position.z);
    rlRotatef(-(g.rotationY + PI) * RAD2DEG, 0, 1, 0);

    // Suspension tilt during turning
    float tiltAngle = g.angularVelocity * 0.12f;
    if (g.isDrifting) tiltAngle -= (float)g.driftDirection * 0.08f;
    rlRotatef(tiltAngle * RAD2DEG, 0, 0, 1);

    Color body = v.bodyColor;
    Color accent = v.accentColor;

    // ─── Main Body ───
    float bw = v.bodyWidth, bh = v.bodyHeight, bl = v.bodyLength;
    DrawCube({0, bh * 0.35f, 0}, bw, bh * 0.5f, bl, body);
    DrawCubeWires({0, bh * 0.35f, 0}, bw, bh * 0.5f, bl, ColorBrightness(body, -0.3f));

    // Cabin (upper portion)
    float cabH = bh * 0.4f;
    float cabW = bw * 0.85f;
    float cabL = bl * 0.5f;
    DrawCube({0, bh * 0.7f, 0.1f}, cabW, cabH, cabL, body);

    // Windshield
    Color glass = {40, 60, 80, 200};
    DrawCube({0, bh * 0.65f, bl * 0.3f}, cabW * 0.8f, cabH * 0.7f, 0.08f, glass);

    // ─── Chunky Wheels ───
    Color wheelCol = {26, 26, 31, 255};
    Color rimCol = {200, 200, 210, 255};
    Color springCol = {230, 50, 25, 255};

    float trackW = bw / 2.0f + 0.3f;
    float wheelBase = bl * 0.4f;
    float tR = fmaxf(v.wheelRadius, 0.35f);
    float tW = fmaxf(v.wheelWidth, 0.3f);

    struct WheelPos { float x, z; };
    WheelPos wheels[4] = {
        {-trackW, -wheelBase}, {trackW, -wheelBase},
        {-trackW, wheelBase},  {trackW, wheelBase}
    };

    for (int i = 0; i < 4; i++) {
        float wx = wheels[i].x, wz = wheels[i].z;

        // Tire
        DrawCylinder({wx, tR, wz}, tR, tR, tW, 16, wheelCol);
        // Rim (slightly smaller, bright)
        DrawCylinder({wx, tR, wz}, tR * 0.65f, tR * 0.65f, tW + 0.05f, 8, rimCol);

        // Axle
        float axleX = wx > 0 ? wx - 0.15f : wx + 0.15f;
        DrawCylinder({axleX, tR, wz}, 0.05f, 0.05f, 0.4f, 6, rimCol);

        // Suspension coil spring
        float coilX = wx > 0 ? wx - 0.2f : wx + 0.2f;
        DrawCylinder({coilX, tR + 0.2f, wz}, 0.12f, 0.12f, 0.4f, 8, springCol);
        DrawCylinderWires({coilX, tR + 0.2f, wz}, 0.14f, 0.14f, 0.4f, 8, ColorBrightness(springCol, -0.3f));
    }

    // ─── Headlights ───
    Color lensCol = {255, 250, 230, 255};
    for (int i = 0; i < 2; i++) {
        float hx = (i == 0) ? -bw * 0.3f : bw * 0.3f;
        // Housing
        DrawCube({hx, bh * 0.45f, bl * 0.5f}, 0.25f, 0.2f, 0.12f, {50, 50, 50, 255});
        // Glowing lens
        DrawSphere({hx, bh * 0.45f, bl * 0.52f}, 0.08f, lensCol);
    }

    // ─── Cockpit: Steering Wheel ───
    // Steering column (thin cylinder)
    DrawCube({0, bh * 0.55f, 0.1f}, 0.04f, 0.25f, 0.04f, {50, 50, 55, 255});
    // Wheel ring (approximate with thin cube ring)
    DrawCube({0, bh * 0.7f, 0.1f}, 0.25f, 0.03f, 0.25f, {200, 30, 30, 255});
    // Seat
    DrawCube({0, bh * 0.25f, -bl * 0.05f}, bw * 0.5f, 0.3f, 0.4f, {20, 20, 22, 255});

    // ─── Roll Cage ───
    Color cageMat = {180, 180, 190, 255};
    DrawCube({-cabW * 0.4f, bh * 0.85f, 0}, 0.06f, cabH, 0.06f, cageMat);
    DrawCube({ cabW * 0.4f, bh * 0.85f, 0}, 0.06f, cabH, 0.06f, cageMat);
    DrawCube({0, bh * 1.05f, 0}, cabW * 0.8f, 0.06f, 0.06f, cageMat);

    // ─── Twin Exhaust Pipes ───
    Color pipeCol = {200, 200, 210, 255};
    for (int i = 0; i < 2; i++) {
        float ex = (i == 0) ? -bw * 0.3f : bw * 0.3f;
        DrawCylinder({ex, bh * 0.2f, -bl * 0.52f}, 0.08f, 0.06f, 0.3f, 8, pipeCol);

        // Flame effect when accelerating
        if (g.input.forward && g.speed > 2) {
            float flameSize = 0.1f + (g.boostMultiplier - 1.0f) * 0.2f;
            Color flame1 = {255, 130, 0, 200};
            Color flame2 = {255, 50, 0, 150};
            DrawSphere({ex, bh * 0.2f, -bl * 0.58f - flameSize}, flameSize, flame1);
            DrawSphere({ex, bh * 0.2f, -bl * 0.62f - flameSize}, flameSize * 0.6f, flame2);
        }
    }

    // ─── Type-specific extras ───
    if (v.hasLiDAR) {
        float topY = (v.type == VT_VAN) ? 1.75f : 1.3f;
        DrawCylinder({0, topY, -0.1f}, 0.2f, 0.2f, 0.15f, 12, {50, 50, 55, 255});
        float spinAngle = (float)GetTime() * 5.0f;
        Color lidarCol = {50, 180, 255, 255};
        DrawCube({sinf(spinAngle) * 0.15f, topY + 0.1f, cosf(spinAngle) * 0.15f - 0.1f},
                 0.06f, 0.06f, 0.06f, lidarCol);
    }

    if (v.hasLightbar) {
        DrawCube({0, 1.25f, -0.15f}, bw * 0.6f, 0.08f, 0.3f, {40, 40, 40, 255});
        bool flash = ((int)(GetTime() * 3.0f) % 2) == 0;
        Color red   = flash ? Color{255, 25, 25, 255} : Color{80, 10, 10, 255};
        Color blue  = flash ? Color{50, 100, 255, 255} : Color{10, 10, 80, 255};
        DrawSphere({-bw * 0.2f, 1.32f, -0.15f}, 0.06f, red);
        DrawSphere({ bw * 0.2f, 1.32f, -0.15f}, 0.06f, blue);
    }

    if (v.hasSpoiler) {
        DrawCube({0, 0.75f, -bl * 0.4f}, bw * 0.9f, 0.04f, 0.25f, body);
        DrawCube({-bw * 0.3f, 0.6f, -bl * 0.4f}, 0.05f, 0.3f, 0.05f, body);
        DrawCube({ bw * 0.3f, 0.6f, -bl * 0.4f}, 0.05f, 0.3f, 0.05f, body);
    }

    if (v.hasBunnyDecal) {
        // White circle face on front
        DrawSphere({0, 0.85f, bl * 0.51f}, 0.2f, WHITE);
        // Ears
        DrawCube({-0.12f, 1.15f, bl * 0.5f}, 0.08f, 0.2f, 0.02f, WHITE);
        DrawCube({ 0.12f, 1.15f, bl * 0.5f}, 0.08f, 0.2f, 0.02f, WHITE);
    }

    if (v.hasBatteryPack) {
        for (int i = 0; i < 5; i++) {
            DrawCylinder({-0.3f + i * 0.15f, 0.75f, -bl * 0.3f}, 0.06f, 0.06f, 0.12f, 6,
                         {80, 80, 90, 255});
        }
    }

    if (v.hasArmorPlating) {
        DrawCube({-bw / 2 - 0.08f, bh * 0.35f, 0}, 0.1f, bh * 0.5f, bl * 0.8f, accent);
        DrawCube({ bw / 2 + 0.08f, bh * 0.35f, 0}, 0.1f, bh * 0.5f, bl * 0.8f, accent);
    }

    // ─── Drift Sparks ───
    if (g.isDrifting && g.driftStage > 0) {
        Color sparkCol = (g.driftStage == 2) ? Color{255, 150, 0, 255} : Color{50, 150, 255, 255};
        for (int s = 0; s < 8; s++) {
            Vector3 sp = {RandF(-0.5f, 0.5f), RandF(0, 0.3f), RandF(-0.5f, 0.5f)};
            DrawSphere(sp, RandF(0.02f, 0.06f), sparkCol);
        }
    }

    rlPopMatrix();
}

// ═══════════════════════════════════════════════════════════════════════════
//  DRAW: WORLD
// ═══════════════════════════════════════════════════════════════════════════
static void DrawSouthZone() {
    // Beach ground
    DrawCube({0, 0, -120}, 400, 0.1f, 200, {235, 224, 184, 255});

    // Highway
    DrawCube({0, 0.05f, -120}, 20, 0.1f, 180, {38, 38, 43, 255});
    // Center lines
    for (int i = 0; i < 20; i++) {
        DrawCube({0, 0.12f, -200.0f + i * 9.0f}, 0.3f, 0.02f, 4.0f, {242, 217, 51, 255});
    }

    // Cross road
    DrawCube({0, 0.05f, -100}, 200, 0.1f, 14, {38, 38, 43, 255});

    // Palm trees
    Color trunkCol = {115, 77, 38, 255};
    Color leafCol = {38, 140, 51, 255};
    srand(42); // deterministic positions
    for (int i = 0; i < 25; i++) {
        float px = RandF(-180, -60);
        float pz = RandF(-200, -60);
        float h = RandF(6, 10);
        DrawCylinder({px, h / 2, pz}, 0.2f, 0.4f, h, 8, trunkCol);
        for (int f = 0; f < 6; f++) {
            float angle = (float)f / 6.0f * PI * 2.0f;
            Vector3 leafPos = {px + sinf(angle) * 1.5f, h, pz + cosf(angle) * 1.5f};
            DrawCube(leafPos, 0.3f, 0.05f, 3.0f, leafCol);
        }
    }

    // Statue of Crimson
    Color marble = {217, 212, 204, 255};
    Color bronze = {166, 115, 51, 255};
    DrawCube({40, 2, -160}, 6, 4, 6, marble); // pedestal
    DrawCube({40, 2.5f, -163.05f}, 3, 1, 0.1f, {217, 179, 51, 255}); // plaque
    DrawCylinder({40, 8, -160}, 1.5f, 2.0f, 8, 12, bronze); // torso
    DrawSphere({40, 13, -160}, 1.1f, bronze); // head

    // Museum
    Color museumWall = {230, 224, 209, 255};
    DrawCube({-60, 5, -140}, 30, 10, 20, museumWall);
    DrawCube({-60, 10.25f, -140}, 32, 0.5f, 22, {102, 51, 38, 255}); // roof
    for (int i = 0; i < 6; i++) {
        DrawCylinder({-75.0f + i * 6.0f, 5, -130}, 0.4f, 0.4f, 10, 8, {224, 217, 204, 255});
    }
    DrawCube({-60, 12, -130}, 20, 2, 0.2f, {217, 179, 51, 255}); // sign

    // Coastal buildings
    Color bldColors[5] = {
        {242, 153, 102, 255}, {128, 204, 230, 255}, {242, 217, 128, 255},
        {153, 230, 153, 255}, {230, 128, 153, 255}
    };
    srand(99);
    for (int i = 0; i < 8; i++) {
        float w = RandF(8, 14);
        float h = RandF(6, 14);
        float d = RandF(8, 14);
        DrawCube({-120.0f + i * 30.0f, h / 2, -80.0f - RandF(0, 40)}, w, h, d, bldColors[i % 5]);
    }
}

static void DrawCentralZone() {
    // Ocean floor
    DrawCube({0, -8, 40}, 400, 0.1f, 200, {31, 38, 51, 255});

    // Underwater tunnel rings
    Color tunnelCol = {51, 64, 77, 255};
    Color tunnelGlow = {0, 102, 153, 255};
    for (int i = 0; i < 15; i++) {
        float t = (float)i / 15.0f;
        float pz = -15.0f + t * 110.0f;
        // Ring approximation — 4 cubes in a square
        float ringR = 3.0f;
        DrawCube({-ringR, -6, pz}, 0.4f, ringR * 2.0f, 0.4f, tunnelCol);
        DrawCube({ ringR, -6, pz}, 0.4f, ringR * 2.0f, 0.4f, tunnelCol);
        DrawCube({0, -6 + ringR, pz}, ringR * 2.0f, 0.4f, 0.4f, tunnelCol);
        DrawCube({0, -6 - ringR, pz}, ringR * 2.0f, 0.4f, 0.4f, tunnelCol);
        if (i % 3 == 0) {
            DrawSphere({0, -3, pz}, 0.3f, tunnelGlow);
        }
    }

    // Gunboats
    Color hullCol = {89, 97, 102, 255};
    float boatPositions[5][2] = {{-80, 30}, {-40, 40}, {0, 50}, {40, 60}, {80, 70}};
    for (int i = 0; i < 5; i++) {
        float bx = boatPositions[i][0], bz = boatPositions[i][1];
        DrawCube({bx, 0, bz}, 4, 2, 12, hullCol);
        DrawCube({bx, 2, bz - 1}, 2.5f, 2, 4, hullCol);
    }

    // Sunken ruins
    Color ruinCol = {102, 97, 89, 255};
    srand(77);
    for (int i = 0; i < 6; i++) {
        float h = RandF(3, 7);
        float rx = RandF(-30, 30);
        float rz = RandF(30, 70);
        DrawCylinder({rx, -8 + h / 2, rz}, 0.5f + RandF(0, 0.5f), 0.5f + RandF(0, 0.5f), h, 8, ruinCol);
    }
}

static void DrawNorthZone() {
    // Concrete ground
    DrawCube({0, 0, 200}, 400, 0.1f, 200, {102, 102, 107, 255});

    // Grid of alleys
    Color alleyCol = {31, 31, 36, 255};
    for (int i = 0; i < 5; i++) {
        DrawCube({0, 0.03f, 130.0f + i * 35.0f}, 300, 0.08f, 8, alleyCol);
    }
    for (int i = 0; i < 5; i++) {
        DrawCube({-100.0f + i * 50.0f, 0.03f, 200}, 8, 0.08f, 200, alleyCol);
    }

    // Brutalist high-rises
    Color concreteLt = {115, 110, 102, 255};
    Color concreteDk = {77, 71, 66, 255};
    Color windowDk = {20, 26, 38, 255};
    srand(33);
    int bldIdx = 0;
    for (int gx = -3; gx <= 3; gx++) {
        for (int gz = 0; gz < 5; gz++) {
            float bx = gx * 50.0f + RandF(-7, 7);
            float bz = 125.0f + gz * 35.0f + RandF(-5, 5);
            if (fabsf(bx) < 6 || fabsf(bx - 50) < 6 || fabsf(bx + 50) < 6) continue;

            float w = RandF(14, 26);
            float h = RandF(15, 50);
            float d = RandF(14, 26);
            Color col = (bldIdx % 3 == 0) ? concreteDk : concreteLt;
            DrawCube({bx, h / 2, bz}, w, h, d, col);
            DrawCubeWires({bx, h / 2, bz}, w, h, d, ColorBrightness(col, -0.2f));

            // Window strips
            int windowRows = (int)(h / 4.0f);
            for (int r = 0; r < windowRows; r++) {
                DrawCube({bx, 3.0f + r * 4.0f, bz}, w * 0.8f, 0.8f, d + 0.1f, windowDk);
            }
            bldIdx++;
        }
    }

    // Guard checkpoints
    Color gateCol = {179, 38, 26, 255};
    Color stripeCol = {242, 217, 26, 255};
    float cpPositions[3][2] = {{0, 110}, {-80, 160}, {80, 210}};
    for (int i = 0; i < 3; i++) {
        float cx = cpPositions[i][0], cz = cpPositions[i][1];
        DrawCube({cx - 5, 2.5f, cz}, 0.8f, 5, 0.8f, gateCol);
        DrawCube({cx + 5, 2.5f, cz}, 0.8f, 5, 0.8f, gateCol);
        DrawCube({cx, 4.5f, cz}, 10, 0.2f, 0.3f, stripeCol);
        DrawCube({cx + 8, 1.5f, cz}, 3, 3, 3, {128, 122, 115, 255}); // booth
    }

    // Scrap heaps
    Color rustCol = {140, 77, 38, 255};
    srand(55);
    for (int i = 0; i < 12; i++) {
        float sx = RandF(-150, 150);
        float sz = RandF(120, 280);
        float rad = RandF(1.5f, 4.0f);
        DrawSphere({sx, rad * 0.3f, sz}, rad, rustCol);
    }

    // Industrial chutes
    Color chuteCol = {115, 107, 102, 255};
    for (int i = 0; i < 6; i++) {
        float cx = -100.0f + i * 40.0f;
        float cz = 250.0f + RandF(-15, 15);
        DrawCylinder({cx, 6, cz}, 1.0f, 1.0f, 12, 8, chuteCol);
    }
}

static void DrawSecretIsland() {
    // Only draw when player is somewhat nearby (optimization)
    // The island itself:
    DrawCube({SECRET_ISLAND_X, 0, SECRET_ISLAND_Z}, 120, 0.2f, 120, {77, 71, 66, 255}); // dark concrete ground

    // Brutalist megastructures
    Color megaCol = {60, 56, 51, 255};
    DrawCube({SECRET_ISLAND_X - 20, 25, SECRET_ISLAND_Z}, 20, 50, 20, megaCol);
    DrawCube({SECRET_ISLAND_X + 20, 18, SECRET_ISLAND_Z - 15}, 15, 36, 18, megaCol);
    DrawCube({SECRET_ISLAND_X + 5, 30, SECRET_ISLAND_Z + 20}, 22, 60, 16, megaCol);
    DrawCube({SECRET_ISLAND_X - 25, 12, SECRET_ISLAND_Z + 25}, 18, 24, 14, megaCol);

    // Window strips on structures
    Color windowDk = {20, 26, 38, 255};
    for (int r = 0; r < 12; r++) {
        DrawCube({SECRET_ISLAND_X - 20, 3.0f + r * 4.0f, SECRET_ISLAND_Z}, 18.0f, 0.8f, 20.1f, windowDk);
        DrawCube({SECRET_ISLAND_X + 5, 3.0f + r * 4.0f, SECRET_ISLAND_Z + 20}, 20.0f, 0.8f, 16.1f, windowDk);
    }

    // Smoking industrial furnaces (red glow cubes)
    Color furnaceGlow = {255, 60, 20, 255};
    DrawCube({SECRET_ISLAND_X - 35, 3, SECRET_ISLAND_Z - 20}, 6, 6, 6, {50, 45, 40, 255});
    DrawSphere({SECRET_ISLAND_X - 35, 6.5f, SECRET_ISLAND_Z - 20}, 0.8f, furnaceGlow);
    DrawCube({SECRET_ISLAND_X + 30, 3, SECRET_ISLAND_Z + 10}, 5, 6, 5, {50, 45, 40, 255});
    DrawSphere({SECRET_ISLAND_X + 30, 6.5f, SECRET_ISLAND_Z + 10}, 0.8f, furnaceGlow);

    // Red searchlight beams (rotating cubes)
    float searchAngle = (float)GetTime() * 1.5f;
    Color searchCol = {255, 30, 30, 100};
    DrawCube({SECRET_ISLAND_X + sinf(searchAngle) * 30, 20, SECRET_ISLAND_Z + cosf(searchAngle) * 30},
             1, 40, 1, searchCol);
    DrawCube({SECRET_ISLAND_X + sinf(searchAngle + PI) * 25, 15, SECRET_ISLAND_Z + cosf(searchAngle + PI) * 25},
             1, 30, 1, searchCol);

    // THE SMILING RABBIT MONOLITH
    Color monolithCol = {90, 85, 80, 255};
    float mx = SECRET_ISLAND_X, mz = SECRET_ISLAND_Z - 35;
    // Giant slab
    DrawCube({mx, 15, mz}, 12, 30, 4, monolithCol);
    // Rabbit face
    DrawSphere({mx, 22, mz + 2.1f}, 3.0f, WHITE); // face circle
    // Eyes
    DrawSphere({mx - 1.0f, 23, mz + 2.5f}, 0.5f, BLACK);
    DrawSphere({mx + 1.0f, 23, mz + 2.5f}, 0.5f, BLACK);
    // Smile (curved with small cubes)
    for (int s = 0; s < 7; s++) {
        float angle = PI * 0.15f + (float)s * PI * 0.1f;
        float smX = mx + cosf(angle) * 1.5f - 0.75f;
        float smY = 20.5f - sinf(angle) * 0.5f;
        DrawCube({smX, smY, mz + 2.6f}, 0.3f, 0.15f, 0.1f, BLACK);
    }
    // Ears
    DrawCube({mx - 2.0f, 28, mz + 2.1f}, 1.5f, 5, 1, monolithCol);
    DrawCube({mx + 2.0f, 28, mz + 2.1f}, 1.5f, 5, 1, monolithCol);

    // Dock on the near side (old restrictia dock for arriving)
    Color dockWood = {120, 85, 50, 255};
    DrawCube({SECRET_ISLAND_X + 50, 0.3f, SECRET_ISLAND_Z + 55}, 8, 0.3f, 25, dockWood);
    // Dock posts
    for (int p = 0; p < 4; p++) {
        DrawCylinder({SECRET_ISLAND_X + 46.0f + p * 3.0f, -1.0f, SECRET_ISLAND_Z + 67},
                     0.2f, 0.2f, 3, 6, dockWood);
    }
}

static void DrawOldRestrictiaDock() {
    // The departure dock on the South Zone coast (near Museum)
    Color dockWood = {120, 85, 50, 255};
    // Main pier extending south from the museum area
    DrawCube({-60, 0.3f, -210}, 6, 0.3f, 30, dockWood);
    // Pier posts
    for (int p = 0; p < 6; p++) {
        DrawCylinder({-63.0f + p * 2.0f, -1.5f, -220}, 0.15f, 0.15f, 3, 6, dockWood);
    }
    // Sign
    DrawCube({-60, 3, -225}, 8, 2, 0.2f, {140, 100, 40, 255});
    // Navigation buoys leading toward secret island (to the right/east and then south)
    Color buoyCol = {255, 200, 0, 255};
    float buoyPath[8][2] = {
        {-40, -230}, {-10, -250}, {30, -280}, {80, -310},
        {140, -340}, {200, -380}, {270, -420}, {320, -460}
    };
    float t = (float)GetTime();
    for (int i = 0; i < 8; i++) {
        float bobY = sinf(t * 2.0f + i) * 0.3f;
        DrawSphere({buoyPath[i][0], WATER_LEVEL + 0.5f + bobY, buoyPath[i][1]}, 0.5f, buoyCol);
        // Faint glow
        DrawSphere({buoyPath[i][0], WATER_LEVEL + 0.8f + bobY, buoyPath[i][1]}, 0.2f,
                   {255, 255, 100, 150});
    }
}

static void DrawPitStops() {
    Color bayCol = {51, 51, 56, 255};
    float t = (float)GetTime();

    for (int i = 0; i < NUM_PITSTOPS; i++) {
        float px = PIT_STOPS[i].x, pz = PIT_STOPS[i].z;
        DrawCube({px, 2, pz}, 10, 4, 8, bayCol);
        // Glowing indicator (pulsing)
        float pulse = 0.4f + sinf(t * 2.0f + i) * 0.3f;
        Color glowCol = {0, (unsigned char)(pulse * 255), (unsigned char)(pulse * 100), 255};
        DrawSphere({px, 4.5f, pz}, 0.4f, glowCol);
    }
}

static void DrawOcean(float time) {
    // Simple grid of blue quads with wave animation
    Color deepBlue = {10, 40, 80, 180};
    Color shallowBlue = {30, 100, 180, 160};

    // Large ocean plane
    for (int gx = -10; gx < 10; gx++) {
        for (int gz = -14; gz < 10; gz++) {
            float wx = gx * 40.0f;
            float wz = gz * 40.0f;
            float waveH = sinf(time * 1.5f + wx * 0.05f) * 0.4f
                        + sinf(time * 1.0f + wz * 0.07f) * 0.3f;
            Color waterCol = (gz < -5) ? deepBlue : shallowBlue;
            DrawCube({wx, WATER_LEVEL + waveH, wz}, 40, 0.05f, 40, waterCol);
        }
    }
}

static void DrawSkyGradient() {
    // Clouds (floating white spheres at high altitude)
    srand(123);
    for (int i = 0; i < 30; i++) {
        float cx = RandF(-400, 400);
        float cy = RandF(80, 140);
        float cz = RandF(-400, 400);
        float r = RandF(8, 20);
        DrawSphere({cx, cy, cz}, r, {255, 255, 255, 60});
        DrawSphere({cx + r * 0.6f, cy - 1, cz + r * 0.3f}, r * 0.7f, {255, 255, 255, 40});
    }
}

// ═══════════════════════════════════════════════════════════════════════════
//  DRAW: HUD (2D overlay)
// ═══════════════════════════════════════════════════════════════════════════
static void DrawHUD(const Game& g) {
    // ─── Speedometer ───
    DrawRectangle(20, SCREEN_H - 60, 200, 20, {30, 30, 35, 200});
    float speedRatio = (g.maxSpeed > 0) ? Clamp(g.speed / g.maxSpeed, 0, 1) : 0;
    Color speedCol = (speedRatio > 0.8f) ? Color{255, 80, 30, 255} : Color{0, 200, 255, 255};
    DrawRectangle(22, SCREEN_H - 58, (int)(196 * speedRatio), 16, speedCol);
    char speedTxt[32];
    snprintf(speedTxt, 32, "%.0f km/h", g.speed * 3.6f);
    DrawText(speedTxt, 230, SCREEN_H - 58, 16, WHITE);

    // ─── Fuel Gauge ───
    DrawRectangle(20, SCREEN_H - 35, 200, 12, {30, 30, 35, 200});
    float fuelRatio = Clamp(g.fuel / g.maxFuel, 0, 1);
    Color fuelCol = (fuelRatio < 0.2f) ? Color{255, 30, 30, 255} : Color{50, 255, 100, 255};
    DrawRectangle(22, SCREEN_H - 33, (int)(196 * fuelRatio), 8, fuelCol);
    DrawText("FUEL", 230, SCREEN_H - 35, 10, LIGHTGRAY);

    // ─── Zone Display ───
    const char* zoneName = "CRIMSON ISLAND";
    Color zoneCol = {255, 200, 100, 255};
    if (strcmp(g.currentZone, "restrictia") == 0) {
        zoneName = "RESTRICTIA SECTOR";
        zoneCol = {200, 50, 50, 255};
    } else if (strcmp(g.currentZone, "divide") == 0) {
        zoneName = "THE 5-MILE DIVIDE";
        zoneCol = {50, 150, 255, 255};
    } else if (strcmp(g.currentZone, "forbidden") == 0) {
        zoneName = "??? FORBIDDEN RESTRICTIA ???";
        zoneCol = {255, 30, 30, 255};
    }
    int zoneW = MeasureText(zoneName, 18);
    DrawText(zoneName, SCREEN_W / 2 - zoneW / 2, 15, 18, zoneCol);

    // ─── Depth Meter (underwater) ───
    if (g.isSubmerged) {
        char depthTxt[32];
        snprintf(depthTxt, 32, "DEPTH: %.1f m", g.depth);
        DrawText(depthTxt, SCREEN_W / 2 - 50, 40, 16, {100, 200, 255, 255});
    }

    // ─── Drift Indicator ───
    if (g.isDrifting) {
        const char* driftLabel = "DRIFTING";
        Color driftCol = {100, 100, 100, 255};
        if (g.driftStage == 1) { driftLabel = "DRIFT ★ BLUE"; driftCol = {50, 150, 255, 255}; }
        if (g.driftStage == 2) { driftLabel = "DRIFT ★★ ORANGE!"; driftCol = {255, 150, 0, 255}; }
        int dw = MeasureText(driftLabel, 22);
        DrawText(driftLabel, SCREEN_W / 2 - dw / 2, SCREEN_H - 90, 22, driftCol);
    }

    // ─── Boost Active ───
    if (g.boostMultiplier > 1.0f) {
        DrawText("BOOST!", SCREEN_W / 2 - 30, SCREEN_H - 115, 20, {255, 200, 0, 255});
    }

    // ─── Minimap ───
    int mapX = SCREEN_W - 170, mapY = SCREEN_H - 170;
    int mapSize = 150;
    DrawRectangle(mapX, mapY, mapSize, mapSize, {20, 20, 25, 180});
    DrawRectangleLines(mapX, mapY, mapSize, mapSize, {100, 100, 110, 255});

    // Map zones (simplified colors)
    int halfMap = mapSize / 2;
    // South (golden)
    DrawRectangle(mapX, mapY + halfMap + 20, mapSize, halfMap - 20, {180, 160, 100, 100});
    // Central (blue ocean)
    DrawRectangle(mapX, mapY + halfMap - 10, mapSize, 30, {30, 80, 150, 100});
    // North (grey)
    DrawRectangle(mapX, mapY, mapSize, halfMap - 10, {80, 80, 85, 100});

    // Player dot
    float mapScale = mapSize / (WORLD_SIZE * 2.0f);
    int dotX = mapX + halfMap + (int)(g.position.x * mapScale);
    int dotY = mapY + halfMap - (int)(g.position.z * mapScale);
    dotX = Clamp(dotX, mapX + 2, mapX + mapSize - 2);
    dotY = Clamp(dotY, mapY + 2, mapY + mapSize - 2);
    DrawCircle(dotX, dotY, 4, {255, 50, 50, 255});
    DrawCircle(dotX, dotY, 2, WHITE);

    // ─── Vehicle Name ───
    if (g.currentVehicle) {
        DrawText(g.currentVehicle->name, 20, 15, 14, {200, 200, 200, 200});
    }
    if (g.currentDriver) {
        DrawText(g.currentDriver->name, 20, 32, 12, g.currentDriver->portraitColor);
    }

    // ─── Speech Bubble ───
    if (g.speech.active) {
        int bubbleW = MeasureText(g.speech.text, 16) + 30;
        int bubbleX = SCREEN_W / 2 - bubbleW / 2;
        int bubbleY = SCREEN_H - 160;
        DrawRectangleRounded({(float)bubbleX, (float)bubbleY, (float)bubbleW, 50}, 0.3f, 8,
                             {20, 20, 25, 220});
        DrawText(g.speech.driverName, bubbleX + 10, bubbleY + 5, 12, g.speech.driverColor);
        DrawText(g.speech.text, bubbleX + 10, bubbleY + 22, 16, WHITE);
    }

    // ─── Easter Egg Banner ───
    if (g.secretIslandFound) {
        const char* easterEgg = "EASTER EGG FOUND: FORBIDDEN RESTRICTIA SECTOR";
        int eeW = MeasureText(easterEgg, 24);
        float flash = (sinf((float)GetTime() * 4.0f) + 1.0f) * 0.5f;
        Color eeCol = {255, (unsigned char)(30 + flash * 100), 30, 255};
        DrawText(easterEgg, SCREEN_W / 2 - eeW / 2, 65, 24, eeCol);
    }

    // ─── Controls hint ───
    DrawText("WASD: Drive  SPACE: Drift  ESC: Pause", 20, SCREEN_H - 15, 10, {120, 120, 130, 150});
}

// ═══════════════════════════════════════════════════════════════════════════
//  DRAW: MENUS
// ═══════════════════════════════════════════════════════════════════════════
static void DrawMainMenu(const Game& g) {
    DrawRectangle(0, 0, SCREEN_W, SCREEN_H, {10, 14, 26, 255});

    // Title
    const char* title = "RESTRICTIA";
    const char* subtitle = "ISLAND OVERDRIVE 3D";
    int tw = MeasureText(title, 60);
    int sw = MeasureText(subtitle, 24);
    DrawText(title, SCREEN_W / 2 - tw / 2, 120, 60, {255, 80, 40, 255});
    DrawText(subtitle, SCREEN_W / 2 - sw / 2, 185, 24, {200, 200, 210, 255});

    // Animated accents
    float t = (float)GetTime();
    for (int i = 0; i < 20; i++) {
        float x = sinf(t * 0.5f + i * 0.8f) * 400 + SCREEN_W / 2;
        float y = cosf(t * 0.3f + i * 1.1f) * 200 + SCREEN_H / 2;
        DrawCircle((int)x, (int)y, 2, {255, 100, 50, 30});
    }

    // Menu items
    const char* items[] = {"PLAY", "CONTROLS", "QUIT"};
    for (int i = 0; i < 3; i++) {
        int iw = MeasureText(items[i], 28);
        Color col = (i == g.menuSelection) ? Color{255, 200, 50, 255} : Color{150, 150, 160, 255};
        if (i == g.menuSelection) {
            DrawRectangle(SCREEN_W / 2 - iw / 2 - 20, 320 + i * 60 - 5, iw + 40, 38,
                          {255, 200, 50, 25});
        }
        DrawText(items[i], SCREEN_W / 2 - iw / 2, 320 + i * 60, 28, col);
    }

    DrawText("Arrow Keys / Enter to select", SCREEN_W / 2 - 120, SCREEN_H - 40, 14, {100, 100, 110, 200});
}

static void DrawVehicleSelect(const Game& g) {
    DrawRectangle(0, 0, SCREEN_W, SCREEN_H, {10, 14, 26, 240});

    DrawText("SELECT YOUR VEHICLE", SCREEN_W / 2 - MeasureText("SELECT YOUR VEHICLE", 30) / 2, 30, 30,
             {255, 200, 50, 255});

    for (int i = 0; i < NUM_VEHICLES; i++) {
        int yOff = 100 + i * 90;
        bool selected = (i == g.vehicleSelectIdx);

        // Selection highlight
        if (selected) {
            DrawRectangle(50, yOff - 5, SCREEN_W - 100, 80, {255, 200, 50, 30});
            DrawRectangleLines(50, yOff - 5, SCREEN_W - 100, 80, {255, 200, 50, 200});
        }

        // Vehicle color swatch
        DrawRectangle(70, yOff + 10, 40, 40, VEHICLES[i].visual.bodyColor);
        DrawRectangleLines(70, yOff + 10, 40, 40, WHITE);

        // Name
        Color nameCol = selected ? Color{255, 255, 255, 255} : Color{180, 180, 190, 255};
        DrawText(VEHICLES[i].name, 130, yOff + 5, 20, nameCol);

        // Stats bars
        const char* statNames[] = {"SPD", "ACC", "HND", "WGT"};
        int statVals[] = {
            VEHICLES[i].stats.speed, VEHICLES[i].stats.acceleration,
            VEHICLES[i].stats.handling, VEHICLES[i].stats.weight
        };
        for (int s = 0; s < 4; s++) {
            int sx = 130 + s * 120;
            int sy = yOff + 35;
            DrawText(statNames[s], sx, sy, 10, {120, 120, 130, 200});
            DrawRectangle(sx, sy + 12, 80, 6, {40, 40, 45, 200});
            DrawRectangle(sx, sy + 12, statVals[s] * 8, 6, VEHICLES[i].visual.accentColor);
        }

        // Manufacturer
        DrawText(VEHICLES[i].manufacturer, 130, yOff + 55, 10, {100, 100, 110, 200});
    }

    DrawText("UP/DOWN: Browse   ENTER: Select   ESC: Back", SCREEN_W / 2 - 180, SCREEN_H - 30, 14,
             {100, 100, 110, 200});
}

static void DrawPauseMenu(const Game& g) {
    DrawRectangle(0, 0, SCREEN_W, SCREEN_H, {0, 0, 0, 150});

    const char* pauseTitle = "PAUSED";
    int ptw = MeasureText(pauseTitle, 40);
    DrawText(pauseTitle, SCREEN_W / 2 - ptw / 2, 200, 40, WHITE);

    const char* items[] = {"RESUME", "CONTROLS", "QUIT TO MENU"};
    for (int i = 0; i < 3; i++) {
        int iw = MeasureText(items[i], 24);
        Color col = (i == g.menuSelection) ? Color{255, 200, 50, 255} : Color{150, 150, 160, 255};
        DrawText(items[i], SCREEN_W / 2 - iw / 2, 300 + i * 50, 24, col);
    }
}

static void DrawControlsScreen() {
    DrawRectangle(0, 0, SCREEN_W, SCREEN_H, {10, 14, 26, 250});

    DrawText("CONTROLS", SCREEN_W / 2 - MeasureText("CONTROLS", 36) / 2, 50, 36, {255, 200, 50, 255});

    const char* controls[] = {
        "W / UP       - Accelerate",
        "S / DOWN     - Reverse",
        "A / LEFT     - Steer Left",
        "D / RIGHT    - Steer Right",
        "SPACE        - Hop / Drift",
        "SHIFT / Q    - Dive (in water)",
        "CTRL / E     - Surface (in water)",
        "ESC          - Pause",
        "",
        "DRIFT: Hold SPACE while turning.",
        "Hold longer for BLUE then ORANGE sparks.",
        "Release for a BOOST!",
        "",
        "TIP: Find the Old Restrictia Dock near the",
        "Museum. Drive right into the ocean and keep",
        "going... you might find something."
    };

    for (int i = 0; i < 16; i++) {
        Color col = (i >= 9) ? Color{180, 220, 255, 200} : Color{200, 200, 210, 255};
        DrawText(controls[i], 200, 120 + i * 28, 16, col);
    }

    DrawText("Press ESC or ENTER to go back", SCREEN_W / 2 - 130, SCREEN_H - 40, 14, {100, 100, 110, 200});
}

static void DrawLoadingScreen(const Game& g) {
    DrawRectangle(0, 0, SCREEN_W, SCREEN_H, {10, 14, 26, 255});

    const char* title = "RESTRICTIA";
    const char* subtitle = "ISLAND OVERDRIVE 3D";
    int tw = MeasureText(title, 60);
    int sw = MeasureText(subtitle, 24);
    DrawText(title, SCREEN_W / 2 - tw / 2, 200, 60, {255, 80, 40, 255});
    DrawText(subtitle, SCREEN_W / 2 - sw / 2, 270, 24, {200, 200, 210, 255});

    // Loading bar
    DrawRectangle(SCREEN_W / 2 - 200, 400, 400, 16, {30, 30, 35, 200});
    int barW = (int)(396 * g.loadProgress / 100.0f);
    DrawRectangle(SCREEN_W / 2 - 198, 402, barW, 12, {255, 100, 50, 255});

    // Lore text
    const char* loreTexts[] = {
        "The Split Archipelago - two nations divided by five miles of ocean...",
        "MilesTech Industries: 58,000 AAA batteries. One wooden pallet.",
        "The Council of Restrictia mandates the Smiling Rabbit decal.",
        "President Crimson commissioned a 40-foot bronze statue of himself.",
        "The underwater tunnels were built during the first civil works project.",
        "James Anderdingus holds the unofficial speed record. His vehicle was on fire."
    };
    int loreCount = 6;
    int idx = g.loreIndex % loreCount;
    const char* lore = loreTexts[idx];
    int lw = MeasureText(lore, 14);
    DrawText(lore, SCREEN_W / 2 - lw / 2, 450, 14, {150, 150, 160, 200});
}

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN
// ═══════════════════════════════════════════════════════════════════════════
int main() {
    srand((unsigned int)time(nullptr));

    SetConfigFlags(FLAG_MSAA_4X_HINT | FLAG_VSYNC_HINT);
    InitWindow(SCREEN_W, SCREEN_H, "The Chronicles of Restrictia: Island Overdrive 3D");
    SetTargetFPS(60);

    Game g;
    InitGame(g);

    // ─── Main Loop ───
    while (!WindowShouldClose()) {
        float dt = GetFrameTime();

        // ─── State Machine ───
        switch (g.state) {

        // ═══ LOADING ═══
        case STATE_LOADING: {
            g.loadTimer += dt;
            g.loadProgress += (100.0f - g.loadProgress) * dt * 1.5f;
            if (g.loadTimer > 0.6f) {
                g.loreTimer += dt;
                if (g.loreTimer > 3.0f) { g.loreIndex++; g.loreTimer = 0; }
            }
            if (g.loadProgress > 99.0f || g.loadTimer > 3.0f) {
                g.state = STATE_MENU;
                g.menuSelection = 0;
            }
        } break;

        // ═══ MENU ═══
        case STATE_MENU: {
            if (IsKeyPressed(KEY_UP))    g.menuSelection = (g.menuSelection + 2) % 3;
            if (IsKeyPressed(KEY_DOWN))  g.menuSelection = (g.menuSelection + 1) % 3;
            if (IsKeyPressed(KEY_W))     g.menuSelection = (g.menuSelection + 2) % 3;
            if (IsKeyPressed(KEY_S))     g.menuSelection = (g.menuSelection + 1) % 3;

            if (IsKeyPressed(KEY_ENTER) || IsKeyPressed(KEY_SPACE)) {
                if (g.menuSelection == 0) {
                    g.state = STATE_VEHICLE_SELECT;
                    g.vehicleSelectIdx = 0;
                }
                else if (g.menuSelection == 1) g.state = STATE_CONTROLS;
                else if (g.menuSelection == 2) break; // quit handled by WindowShouldClose
            }
            // Quit on menu selection 2
            if (g.menuSelection == 2 && (IsKeyPressed(KEY_ENTER) || IsKeyPressed(KEY_SPACE))) {
                CloseWindow();
                return 0;
            }
        } break;

        // ═══ VEHICLE SELECT ═══
        case STATE_VEHICLE_SELECT: {
            if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_W))
                g.vehicleSelectIdx = (g.vehicleSelectIdx + NUM_VEHICLES - 1) % NUM_VEHICLES;
            if (IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S))
                g.vehicleSelectIdx = (g.vehicleSelectIdx + 1) % NUM_VEHICLES;
            if (IsKeyPressed(KEY_ENTER) || IsKeyPressed(KEY_SPACE)) {
                StartGame(g, g.vehicleSelectIdx);
            }
            if (IsKeyPressed(KEY_ESCAPE)) {
                g.state = STATE_MENU;
                g.menuSelection = 0;
            }
        } break;

        // ═══ PLAYING ═══
        case STATE_PLAYING: {
            UpdateInput(g);

            // Pause
            if (g.input.pause) {
                g.state = STATE_PAUSED;
                g.menuSelection = 0;
                break;
            }

            // Drift release detection (key up)
            if (IsKeyReleased(KEY_SPACE) && g.isDrifting) {
                ReleaseDrift(g);
            }

            // Fixed timestep physics
            g.accumulator += dt;
            while (g.accumulator >= FIXED_DT) {
                UpdatePhysics(g, FIXED_DT);
                g.accumulator -= FIXED_DT;
            }

            UpdateCamera(g);
            DetectZone(g);

            // Speech bubble timer
            if (g.speech.active) {
                g.speech.timer -= dt;
                if (g.speech.timer <= 0) g.speech.active = false;
            }
        } break;

        // ═══ PAUSED ═══
        case STATE_PAUSED: {
            if (IsKeyPressed(KEY_UP) || IsKeyPressed(KEY_W))
                g.menuSelection = (g.menuSelection + 2) % 3;
            if (IsKeyPressed(KEY_DOWN) || IsKeyPressed(KEY_S))
                g.menuSelection = (g.menuSelection + 1) % 3;

            if (IsKeyPressed(KEY_ENTER) || IsKeyPressed(KEY_SPACE)) {
                if (g.menuSelection == 0) {
                    g.state = STATE_PLAYING;
                } else if (g.menuSelection == 1) {
                    g.state = STATE_CONTROLS;
                } else if (g.menuSelection == 2) {
                    g.state = STATE_MENU;
                    g.menuSelection = 0;
                }
            }
            if (IsKeyPressed(KEY_ESCAPE)) {
                g.state = STATE_PLAYING;
            }
        } break;

        // ═══ CONTROLS ═══
        case STATE_CONTROLS: {
            if (IsKeyPressed(KEY_ESCAPE) || IsKeyPressed(KEY_ENTER)) {
                g.state = (g.currentVehicle) ? STATE_PAUSED : STATE_MENU;
                g.menuSelection = 0;
            }
        } break;
        }

        // ─── RENDER ───
        BeginDrawing();

        switch (g.state) {
        case STATE_LOADING:
            DrawLoadingScreen(g);
            break;

        case STATE_MENU:
            DrawMainMenu(g);
            break;

        case STATE_VEHICLE_SELECT:
            DrawVehicleSelect(g);
            break;

        case STATE_PLAYING: {
            // Underwater tint
            if (g.isSubmerged) {
                ClearBackground({0, 15, 40, 255});
            } else {
                ClearBackground({107, 174, 242, 255});
            }

            BeginMode3D(g.camera);
                // Fog distance with sky
                DrawSkyGradient();

                // World geometry
                DrawSouthZone();
                DrawCentralZone();
                DrawNorthZone();
                DrawSecretIsland();
                DrawOldRestrictiaDock();
                DrawPitStops();

                // Water (translucent overlay)
                DrawOcean((float)GetTime());

                // Vehicle
                DrawVehicle(g);
            EndMode3D();

            // HUD overlay
            DrawHUD(g);
        } break;

        case STATE_PAUSED:
            // Draw game scene behind
            if (g.isSubmerged) ClearBackground({0, 15, 40, 255});
            else ClearBackground({107, 174, 242, 255});
            BeginMode3D(g.camera);
                DrawSkyGradient();
                DrawSouthZone();
                DrawCentralZone();
                DrawNorthZone();
                DrawSecretIsland();
                DrawOldRestrictiaDock();
                DrawPitStops();
                DrawOcean((float)GetTime());
                DrawVehicle(g);
            EndMode3D();
            DrawHUD(g);
            DrawPauseMenu(g);
            break;

        case STATE_CONTROLS:
            DrawControlsScreen();
            break;
        }

        // FPS counter (top-right, subtle)
        DrawFPS(SCREEN_W - 90, 5);

        EndDrawing();
    }

    CloseWindow();
    return 0;
}
