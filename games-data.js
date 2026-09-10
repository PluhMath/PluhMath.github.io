// PluhMath Games Database
const GAMES_DB = [
  {
    id: 'pluhshooter',
    slug: 'pluhshooter',
    url: 'pluhshooter.html',
    title: 'PluhShooter.io',
    category: '3D & FPS',
    categorySlug: '3d',
    rating: '4.9',
    plays: '142K',
    tags: ['3D', 'Voxel', 'FPS', 'Multiplayer', 'Zombies'],
    desc: 'A high-speed 3D voxel first-person shooter. Battle smart AI bots or real players in Free For All and Team Deathmatch, or survive endless waves of zombies.',
    howToPlay: 'Eliminate opponents to earn score and climb the leaderboard. Keep moving, aim for headshots, and switch weapons according to combat range.',
    controls: [
      { key: 'WASD', desc: 'Move character' },
      { key: 'Mouse', desc: 'Aim & look around' },
      { key: 'Left Click', desc: 'Shoot / Fire weapon' },
      { key: 'Right Click', desc: 'Aim Down Sights (ADS)' },
      { key: 'Space', desc: 'Jump' },
      { key: 'Shift', desc: 'Sprint' },
      { key: '1 - 4', desc: 'Switch weapons' },
      { key: 'R', desc: 'Reload weapon' },
      { key: 'Esc', desc: 'Pause / Release mouse lock' }
    ],
    gamePath: 'games/PluhShooter.io/index.html',
    icon: '🔫',
    badge: 'HOT',
    badgeColor: '#ff4757',
    thumbnail: '',
    bgGradient: 'linear-gradient(135deg, #10162f, #1b264f)'
  },
  {
    id: 'run3',
    slug: 'run-3',
    url: 'run-3.html',
    title: 'Run 3',
    category: 'Skill & Runner',
    categorySlug: 'runner',
    rating: '4.9',
    plays: '380K',
    tags: ['Runner', '3D', 'Space', 'Classic', 'Alien'],
    desc: 'The iconic galaxy runner! Dash, jump, and rotate through floating space tunnels while dodging falling crumbling tiles and unlocking alien characters.',
    howToPlay: 'Guide your little grey alien through floating 3D tunnels in deep space. Moving left or right rotates the entire tunnel, letting you run on walls or ceilings!',
    controls: [
      { key: 'Arrow Keys / A, D', desc: 'Move left and right' },
      { key: 'Space / Up Arrow', desc: 'Jump over gaps' },
      { key: 'P', desc: 'Pause game' },
      { key: 'R', desc: 'Reset level' }
    ],
    gamePath: 'games/Run3/index.html',
    icon: '🏃‍♂️',
    badge: 'CLASSIC',
    badgeColor: '#ffd000',
    thumbnail: 'games/Run3/img/menu/Run3.png',
    bgGradient: 'linear-gradient(135deg, #09122c, #132448)'
  },
  {
    id: 'geometry-dash',
    slug: 'geometry-dash',
    url: 'geometry-dash.html',
    title: 'Geometry Dash Subzero',
    category: 'Skill & Runner',
    categorySlug: 'runner',
    rating: '4.9',
    plays: '275K',
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
    badge: 'POPULAR',
    badgeColor: '#ff007f',
    thumbnail: '',
    bgGradient: 'linear-gradient(135deg, #002233, #004d66)'
  },
  {
    id: 'pluhus',
    slug: 'pluhus',
    url: 'pluhus.html',
    title: 'PluhUs: Browser Edition',
    category: 'Strategy & Action',
    categorySlug: 'strategy',
    rating: '4.7',
    plays: '160K',
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
    badge: 'FEATURED',
    badgeColor: '#ff4757',
    thumbnail: 'games/PluhUs/Stand_mogus.png',
    bgGradient: 'linear-gradient(135deg, #380b0b, #5f1414)'
  },
  {
    id: 'drift-boss',
    slug: 'drift-boss',
    url: 'drift-boss.html',
    title: 'Drift Boss',
    category: 'Skill & Runner',
    categorySlug: 'skill',
    rating: '4.8',
    plays: '210K',
    tags: ['Drifting', 'Car', 'Arcade', 'Timing', 'High Score'],
    desc: 'Endless 3D one-click drifting arcade game. Steer around tricky sharp turns, navigate pitfalls, and collect coins to unlock customizable cars.',
    howToPlay: 'Press and hold to drift right; release to drift left. Anticipate upcoming curves and time your turns with pinpoint precision to keep from falling off!',
    controls: [
      { key: 'Left Click / Space', desc: 'Hold to steer right, release to steer left' }
    ],
    gamePath: 'games/drift-boss/index.html',
    icon: '🏎️',
    badge: 'TRENDING',
    badgeColor: '#00e676',
    thumbnail: 'https://738501629-461082748261058427.preview.editmysite.com/uploads/b/139890129-817510652323129407/files/media/graphics/splash/mobile/cover-start.jpg',
    bgGradient: 'linear-gradient(135deg, #1d1912, #393222)'
  }
];

// Helper to get game by id or slug
function getGameById(idOrSlug) {
  return GAMES_DB.find(g => g.id === idOrSlug || g.slug === idOrSlug);
}

