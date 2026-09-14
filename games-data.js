// PluhMath Games Database - Dynamic Auto-Discovery Edition
let GAMES_DB = [
  {
    id: 'undertale',
    slug: 'undertale',
    url: 'undertale.html',
    title: 'Undertale',
    category: 'RPG & Story',
    categorySlug: 'rpg',
    categories: ['rpg', 'arcade', 'skill'],
    rating: '5.0',
    plays: '520K',
    tags: ['RPG', 'Undertale', 'Sans', 'Bullet Hell', 'Story', 'Retro'],
    desc: 'The acclaimed indie RPG masterpiece. Dodge bones and blasters in the legendary Sans boss encounter, navigate dialogue, and survive with your soul intact.',
    howToPlay: 'Use Arrow Keys to dodge bones, blue attacks, and gaster blasters. Watch your soul gravity in blue/red modes. Select Fight, Act, Item, or Mercy on your turn!',
    controls: [
      { key: 'Arrow Keys', desc: 'Move / Dodge heart soul' },
      { key: 'Z / Enter', desc: 'Confirm / Attack' },
      { key: 'X / Shift', desc: 'Cancel / Focus soul speed' },
      { key: 'C / Ctrl', desc: 'Menu / Info' }
    ],
    gamePath: 'games/Undertale/Undertale-main/index.html',
    icon: '❤️',
    badge: 'LEGENDARY',
    badgeColor: 'rgba(239, 68, 68, 0.9)',
    thumbnail: 'https://raw.githubusercontent.com/jcw87/c2-sans-fight/master/icon-256.png',
    bgGradient: 'linear-gradient(135deg, #111116, #1f1b29)'
  },
  {
    id: 'deltarune',
    slug: 'deltarune',
    url: 'deltarune.html',
    title: 'Deltarune',
    category: 'RPG & Story',
    categorySlug: 'rpg',
    categories: ['rpg', 'arcade', 'skill'],
    rating: '5.0',
    plays: '480K',
    tags: ['RPG', 'Deltarune', 'Toby Fox', 'Story', 'Bullet Hell', 'Kris'],
    desc: 'Toby Fox’s parallel story to Undertale. Explore the mysterious Dark World with Kris and Susie, graze bullets for TP, and conquer intense encounters.',
    howToPlay: 'Control your heart soul during enemy attack phases. Graze bullets closely without touching to build Tension Points (TP) for powerful Spells and Acts.',
    controls: [
      { key: 'Arrow Keys', desc: 'Move / Navigate' },
      { key: 'Z / Enter', desc: 'Confirm / Interact' },
      { key: 'X / Shift', desc: 'Cancel / Run' },
      { key: 'C / Ctrl', desc: 'Menu' }
    ],
    gamePath: 'games/Deltarune/index.html',
    icon: '🔷',
    badge: 'POPULAR',
    badgeColor: 'rgba(0, 240, 255, 0.9)',
    thumbnail: '',
    bgGradient: 'linear-gradient(135deg, #090e1f, #151e36)'
  },
  {
    id: 'pluhshooter',
    slug: 'pluhshooter',
    url: 'pluhshooter.html',
    title: 'PluhShooter.io',
    category: '3D & FPS',
    categorySlug: '3d',
    categories: ['3d', 'action', 'arcade'],
    rating: '4.9',
    plays: '145K',
    tags: ['3D', 'Voxel', 'FPS', 'Multiplayer', 'Zombies'],
    desc: 'Fast-paced 3D voxel first-person shooter. Battle AI bots or players in Free For All and Team Deathmatch, or survive endless waves of zombies.',
    howToPlay: 'Eliminate opponents to earn score and climb the leaderboard. Keep moving, aim for headshots, and switch weapons according to combat range.',
    controls: [
      { key: 'WASD', desc: 'Move character' },
      { key: 'Mouse', desc: 'Aim & look around' },
      { key: 'Left Click', desc: 'Fire weapon' },
      { key: 'Right Click', desc: 'Aim Down Sights (ADS)' },
      { key: 'Space', desc: 'Jump' },
      { key: 'Shift', desc: 'Sprint' },
      { key: '1 - 4', desc: 'Switch weapons' },
      { key: 'R', desc: 'Reload weapon' },
      { key: 'Esc', desc: 'Pause / Release mouse lock' }
    ],
    gamePath: 'games/PluhShooter.io/index.html',
    icon: '🔫',
    badge: '3D VOXEL',
    badgeColor: 'rgba(139, 92, 246, 0.9)',
    thumbnail: '',
    bgGradient: 'linear-gradient(135deg, #0f1322, #182035)'
  },
  {
    id: 'run3',
    slug: 'run-3',
    url: 'run-3.html',
    title: 'Run 3',
    category: 'Runner & Rhythm',
    categorySlug: 'runner',
    categories: ['runner', 'skill', '3d'],
    rating: '4.9',
    plays: '390K',
    tags: ['Runner', '3D', 'Space', 'Classic', 'Alien'],
    desc: 'The iconic galaxy runner. Sprint, jump, and rotate through floating space tunnels while dodging falling crumbling tiles and unlocking alien characters.',
    howToPlay: 'Guide your alien through floating 3D tunnels in deep space. Moving left or right rotates the entire tunnel, letting you run on walls or ceilings.',
    controls: [
      { key: 'Arrow Keys / A, D', desc: 'Move left and right' },
      { key: 'Space / Up Arrow', desc: 'Jump over gaps' },
      { key: 'P', desc: 'Pause game' },
      { key: 'R', desc: 'Reset level' }
    ],
    gamePath: 'games/Run3/index.html',
    icon: '🏃‍♂️',
    badge: 'CLASSIC',
    badgeColor: 'rgba(245, 158, 11, 0.9)',
    thumbnail: 'games/Run3/img/menu/Run3.png',
    bgGradient: 'linear-gradient(135deg, #090e1a, #131b2d)'
  },
  {
    id: 'geometry-dash',
    slug: 'geometry-dash',
    url: 'geometry-dash.html',
    title: 'Geometry Dash Subzero',
    category: 'Runner & Rhythm',
    categorySlug: 'runner',
    categories: ['runner', 'skill', 'arcade'],
    rating: '4.9',
    plays: '280K',
    tags: ['Rhythm', 'Platformer', 'Music', 'Neon', 'Hard'],
    desc: 'Jump, fly, and flip your way through dangerous neon subzero obstacles synced to electrifying EDM beats in this upgraded edition.',
    howToPlay: 'Time your jumps precisely to the rhythm of the music. Avoid spikes, saw blades, and obstacles. One single mistake sends you back to the start!',
    controls: [
      { key: 'Space / Up Arrow', desc: 'Jump / Fly' },
      { key: 'Left Click', desc: 'Jump / Fly' },
      { key: 'P', desc: 'Pause game' }
    ],
    gamePath: 'Scratch/GeometryDashSubzeroPLM/index.html',
    icon: '⚡',
    badge: 'RHYTHM',
    badgeColor: 'rgba(236, 72, 153, 0.9)',
    thumbnail: '',
    bgGradient: 'linear-gradient(135deg, #071722, #0d273a)'
  },
  {
    id: 'pluhus',
    slug: 'pluhus',
    url: 'pluhus.html',
    title: 'PluhUs: Browser Edition',
    category: 'Skill & Strategy',
    categorySlug: 'strategy',
    categories: ['strategy', 'arcade', 'action'],
    rating: '4.7',
    plays: '165K',
    tags: ['Among Us', 'Impostor', 'Sabotage', '2D', 'Casual'],
    desc: 'Custom 2D Among Us browser game engine featuring impostor sabotages, door lockdowns, emergency meetings, ventilation tunnels, and sneaky kills.',
    howToPlay: 'Choose your role! As crewmate, complete tasks around the spaceship. As Impostor, sabotage systems, crawl through vents, and eliminate crew without getting caught.',
    controls: [
      { key: 'WASD / Arrow Keys', desc: 'Move character' },
      { key: 'Space', desc: 'Use / Interact' },
      { key: 'F', desc: 'Open Sabotage Map' },
      { key: 'E', desc: 'Kill (Impostor only)' },
      { key: 'V', desc: 'Vent (Impostor only)' },
      { key: 'R', desc: 'Report fallen crewmate' }
    ],
    gamePath: 'games/PluhUs/index.html',
    icon: '🚀',
    badge: 'STEALTH',
    badgeColor: 'rgba(239, 68, 68, 0.85)',
    thumbnail: 'games/PluhUs/Stand_mogus.png',
    bgGradient: 'linear-gradient(135deg, #200909, #381212)'
  },
  {
    id: 'drift-boss',
    slug: 'drift-boss',
    url: 'drift-boss.html',
    title: 'Drift Boss',
    category: 'Skill & Strategy',
    categorySlug: 'skill',
    categories: ['skill', 'runner', 'arcade', '3d'],
    rating: '4.8',
    plays: '215K',
    tags: ['Drifting', 'Car', 'Arcade', 'Timing', 'High Score'],
    desc: 'Endless 3D one-click drifting arcade game. Steer around tricky sharp turns, navigate pitfalls, and collect coins to unlock customizable cars.',
    howToPlay: 'Press and hold to drift right; release to drift left. Anticipate upcoming curves and time your turns with pinpoint precision to keep from falling off!',
    controls: [
      { key: 'Left Click / Space', desc: 'Hold to steer right, release to steer left' }
    ],
    gamePath: 'games/drift-boss/index.html',
    icon: '🏎️',
    badge: 'ARCADE',
    badgeColor: 'rgba(16, 185, 129, 0.85)',
    thumbnail: 'https://738501629-461082748261058427.preview.editmysite.com/uploads/b/139890129-817510652323129407/files/media/graphics/splash/mobile/cover-start.jpg',
    bgGradient: 'linear-gradient(135deg, #14110b, #241f14)'
  },
  {
    id: 'undertale-yellow',
    slug: 'undertale-yellow',
    url: 'undertale-yellow.html',
    title: 'Undertale Yellow',
    category: 'RPG & Story',
    categorySlug: 'rpg',
    categories: ['rpg', 'arcade', 'skill'],
    rating: '5.0',
    plays: '490K',
    tags: ['RPG', 'Undertale', 'Undertale Yellow', 'Clover', 'Story', 'Bullet Hell', 'Prequel'],
    desc: 'The acclaimed fan-made Undertale prequel. Guide Clover, the seventh human with the Justice soul, through the Underground with revolver attacks and rich new characters.',
    howToPlay: 'Control your yellow heart soul to dodge attacks. Use your revolver in combat by timing target rings for critical strikes. Choose Pacifist, Neutral, or No Mercy paths!',
    controls: [
      { key: 'Arrow Keys', desc: 'Move / Dodge heart soul' },
      { key: 'Z / Enter', desc: 'Confirm / Shoot revolver' },
      { key: 'X / Shift', desc: 'Cancel / Run' },
      { key: 'C / Ctrl', desc: 'Menu / Inventory' }
    ],
    gamePath: 'games/Undertale Yellow/index.html',
    icon: '💛',
    badge: 'JUSTICE SOUL',
    badgeColor: 'rgba(234, 179, 8, 0.95)',
    thumbnail: 'games/Undertale Yellow/favicon.png',
    bgGradient: 'linear-gradient(135deg, #1e1908, #362c0b)'
  },
  {
    id: 'tiny-fishing',
    slug: 'tiny-fishing',
    url: 'tiny-fishing.html',
    title: 'Tiny Fishing',
    category: 'Skill & Strategy',
    categorySlug: 'skill',
    categories: ['skill', 'arcade', 'strategy'],
    rating: '4.8',
    plays: '310K',
    tags: ['Fishing', 'Casual', 'Upgrade', 'Idle', 'High Score', 'Relaxing'],
    desc: 'Cast your line, hook rare and legendary fish, and reel them up to earn cash. Upgrade your fishing pole depth, max catch capacity, and passive offline income!',
    howToPlay: 'Click or tap to cast your line. Drag your hook across the water to catch as many high-value fish as possible on the way back up. Reinvest cash into deeper upgrades!',
    controls: [
      { key: 'Mouse / Touch', desc: 'Click to cast, drag to steer hook & catch fish' }
    ],
    gamePath: 'games/Tiny Fishing/index.html',
    icon: '🎣',
    badge: 'CASUAL HIT',
    badgeColor: 'rgba(6, 182, 212, 0.9)',
    thumbnail: 'games/Tiny Fishing/res/images/startbg.jpg',
    bgGradient: 'linear-gradient(135deg, #071926, #0e3046)'
  },
  {
    id: 'restrictia',
    slug: 'restrictia',
    url: 'restrictia.html',
    title: 'Restrictia: Island Overdrive 3D',
    category: '3D & Racing',
    categorySlug: '3d',
    categories: ['3d', 'arcade', 'action'],
    rating: '5.0',
    plays: '0',
    tags: ['3D', 'Racing', 'Kart', 'Open World', 'Babylon.js', 'Drift', 'Jetski', 'Amphibious', 'Free Roam'],
    desc: 'Full 3D open-world arcade kart racing across The Split Archipelago. 6 vehicles, amphibious jetski/submarine mode, drift boost mechanics, and Tomodachi-style voice synthesis.',
    howToPlay: 'Select a vehicle, then explore freely. W/Up to accelerate, A/D to steer. Space to hop & drift — hold while turning for blue/orange spark boosts. Drive into water to become a jetski. Shift to dive, Ctrl to surface. Toggle Pit Stops in the pause menu for fuel management.',
    controls: [
      { key: 'W / Up Arrow', desc: 'Accelerate' },
      { key: 'S / Down Arrow', desc: 'Brake / Reverse' },
      { key: 'A, D / Left, Right', desc: 'Steer' },
      { key: 'Spacebar', desc: 'Hop / Drift' },
      { key: 'Shift / Q', desc: 'Submerge (dive)' },
      { key: 'Ctrl / E', desc: 'Surface (rise)' },
      { key: 'Esc', desc: 'Pause / Resume' }
    ],
    gamePath: 'games/Restrictia/index.html',
    icon: '🏎️',
    badge: 'NEW • 3D WORLD',
    badgeColor: 'rgba(0, 229, 255, 0.9)',
    thumbnail: '',
    bgGradient: 'linear-gradient(135deg, #0a0e1a, #0d1f30)'
  }
];

// Helper to get game by id, slug, or folder name
function getGameById(idOrSlug) {
  if (!idOrSlug) return null;
  const target = String(idOrSlug).toLowerCase().trim();
  let found = GAMES_DB.find(g => 
    g.id.toLowerCase() === target || 
    (g.slug && g.slug.toLowerCase() === target) ||
    (g.folder && g.folder.toLowerCase() === target) ||
    g.title.toLowerCase() === target
  );

  // Dynamic fallback: if not in database, construct on-demand for any folder
  if (!found) {
    const cleanTitle = target
      .replace(/[-_.]/g, ' ')
      .replace(/\bio\b/gi, '.io')
      .replace(/\b\w/g, l => l.toUpperCase());

    found = {
      id: target,
      folder: target,
      slug: target,
      url: `game.html?id=${encodeURIComponent(target)}`,
      title: cleanTitle,
      category: 'Community & Games',
      categorySlug: 'arcade',
      categories: ['arcade', 'action', 'skill'],
      rating: '5.0',
      plays: 'New',
      gamePath: `games/${target}/index.html`,
      icon: '🎮',
      badge: 'AUTO-DETECTED',
      badgeColor: 'rgba(59, 130, 246, 0.9)',
      desc: `Enjoy ${cleanTitle} playable directly in PluhMath Arcade.`,
      howToPlay: 'Use standard keyboard and mouse controls to play.',
      controls: [
        { key: 'Arrow Keys / WASD', desc: 'Movement & action' },
        { key: 'Space / Enter', desc: 'Confirm / Action' }
      ]
    };
    GAMES_DB.push(found);
  }

  return found;
}

// Auto-discovery: load games-manifest.json and merge any discovered games
async function initDynamicGames() {
  try {
    const res = await fetch('games-manifest.json');
    if (res.ok) {
      const manifest = await res.json();
      if (Array.isArray(manifest)) {
        manifest.forEach(m => {
          const idx = GAMES_DB.findIndex(g => g.id === m.id || (g.folder && m.folder && g.folder.toLowerCase() === m.folder.toLowerCase()));
          if (idx !== -1) {
            GAMES_DB[idx] = { ...GAMES_DB[idx], ...m };
          } else {
            GAMES_DB.push(m);
          }
        });
        window.dispatchEvent(new CustomEvent('pluhmath-games-updated', { detail: GAMES_DB }));
      }
    }
  } catch (err) {
    console.debug('[Games Engine] Manifest load fallback (using static registry):', err);
  }
}

// Global exports
window.GAMES_DB = GAMES_DB;
window.getGameById = getGameById;
window.initDynamicGames = initDynamicGames;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDynamicGames);
} else {
  initDynamicGames();
}
