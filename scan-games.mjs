// PluhMath - Games Folder Auto-Discovery Scanner
// Scans the games/ directory, finds entry points, and writes games-manifest.json

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GAMES_DIR = path.join(__dirname, 'games');
const MANIFEST_PATH = path.join(__dirname, 'games-manifest.json');

// Known meta enrichment for specific folders
const META_OVERRIDES = {
  'undertale': {
    title: 'Undertale',
    category: 'RPG & Story',
    categorySlug: 'rpg',
    icon: '❤️',
    badge: 'LEGENDARY',
    badgeColor: 'rgba(239, 68, 68, 0.9)',
    rating: '5.0',
    plays: '520K',
    entryRel: 'Undertale-main/index.html',
    desc: 'The acclaimed indie RPG masterpiece. Dodge bones and blasters in the legendary Sans boss encounter, navigate dialogue, and survive with your soul intact.'
  },
  'deltarune': {
    title: 'Deltarune',
    category: 'RPG & Story',
    categorySlug: 'rpg',
    icon: '🔷',
    badge: 'POPULAR',
    badgeColor: 'rgba(0, 240, 255, 0.9)',
    rating: '5.0',
    plays: '480K',
    entryRel: 'index.html',
    desc: 'Toby Fox’s parallel story to Undertale. Explore the mysterious Dark World with Kris and Susie, graze bullets for TP, and conquer intense encounters.'
  },
  'undertale yellow': {
    title: 'Undertale Yellow',
    category: 'RPG & Story',
    categorySlug: 'rpg',
    icon: '💛',
    badge: 'JUSTICE SOUL',
    badgeColor: 'rgba(234, 179, 8, 0.95)',
    rating: '5.0',
    plays: '490K',
    entryRel: 'index.html',
    desc: 'The acclaimed fan-made Undertale prequel. Guide Clover, the seventh human with the Justice soul, through the Underground with revolver attacks and rich new characters.'
  },
  'run3': {
    title: 'Run 3',
    category: 'Runner & Rhythm',
    categorySlug: 'runner',
    icon: '🏃‍♂️',
    badge: 'CLASSIC',
    badgeColor: 'rgba(245, 158, 11, 0.9)',
    rating: '4.9',
    plays: '390K',
    entryRel: 'index.html',
    desc: 'The iconic galaxy runner. Sprint, jump, and rotate through floating space tunnels while dodging falling crumbling tiles and unlocking alien characters.'
  },
  'pluhshooter.io': {
    title: 'PluhShooter.io',
    category: '3D & FPS',
    categorySlug: '3d',
    icon: '🔫',
    badge: '3D VOXEL',
    badgeColor: 'rgba(139, 92, 246, 0.9)',
    rating: '4.9',
    plays: '145K',
    entryRel: 'index.html',
    desc: 'Fast-paced 3D voxel first-person shooter. Battle AI bots or players in Free For All and Team Deathmatch, or survive endless waves of zombies.'
  },
  'drift-boss': {
    title: 'Drift Boss',
    category: 'Skill & Strategy',
    categorySlug: 'skill',
    icon: '🏎️',
    badge: 'ARCADE',
    badgeColor: 'rgba(16, 185, 129, 0.85)',
    rating: '4.8',
    plays: '215K',
    entryRel: 'index.html',
    desc: 'Endless 3D one-click drifting arcade game. Steer around tricky sharp turns, navigate pitfalls, and collect coins to unlock customizable cars.'
  },
  'tiny fishing': {
    title: 'Tiny Fishing',
    category: 'Skill & Strategy',
    categorySlug: 'skill',
    icon: '🎣',
    badge: 'CASUAL HIT',
    badgeColor: 'rgba(6, 182, 212, 0.9)',
    rating: '4.8',
    plays: '310K',
    entryRel: 'index.html',
    desc: 'Cast your line, hook rare and legendary fish, and reel them up to earn cash. Upgrade your fishing pole depth, max catch capacity, and passive offline income!'
  },
  'pluhus': {
    title: 'PluhUs: Browser Edition',
    category: 'Skill & Strategy',
    categorySlug: 'strategy',
    icon: '🚀',
    badge: 'STEALTH',
    badgeColor: 'rgba(239, 68, 68, 0.85)',
    rating: '4.7',
    plays: '165K',
    entryRel: 'index.html',
    desc: 'Custom 2D Among Us browser game engine featuring impostor sabotages, door lockdowns, emergency meetings, ventilation tunnels, and sneaky kills.'
  },
  'restrictia': {
    title: 'Restrictia: Island Overdrive 3D',
    category: '3D & Racing',
    categorySlug: '3d',
    icon: '🏎️',
    badge: 'NEW • 3D WORLD',
    badgeColor: 'rgba(0, 229, 255, 0.9)',
    rating: '5.0',
    plays: '120K',
    entryRel: 'index.html',
    desc: 'Full 3D open-world arcade kart racing across The Split Archipelago with amphibious jetski mode, drift boosts, and 6 vehicles.'
  }
};

export function scanGamesDirectory() {
  if (!fs.existsSync(GAMES_DIR)) {
    console.warn('[Game Scanner] games/ directory not found at', GAMES_DIR);
    return [];
  }

  const entries = fs.readdirSync(GAMES_DIR, { withFileTypes: true });
  const games = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const folderName = entry.name;
    const folderLower = folderName.toLowerCase();
    const folderPath = path.join(GAMES_DIR, folderName);

    // Find entry HTML file
    let entryRel = 'index.html';
    if (fs.existsSync(path.join(folderPath, 'index.html'))) {
      entryRel = 'index.html';
    } else if (fs.existsSync(path.join(folderPath, `${folderName}-main`, 'index.html'))) {
      entryRel = `${folderName}-main/index.html`;
    } else {
      // Look 1 level deep for any index.html
      const subEntries = fs.readdirSync(folderPath, { withFileTypes: true });
      for (const sub of subEntries) {
        if (sub.isDirectory() && fs.existsSync(path.join(folderPath, sub.name, 'index.html'))) {
          entryRel = `${sub.name}/index.html`;
          break;
        }
      }
    }

    const override = META_OVERRIDES[folderLower] || {};
    const gameId = folderLower.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Format a clean display title from folder name if no override
    const cleanTitle = override.title || folderName
      .replace(/[-_.]/g, ' ')
      .replace(/\bio\b/gi, '.io')
      .replace(/\b\w/g, l => l.toUpperCase());

    const knownHtml = [
      `${gameId}.html`,
      `${folderLower}.html`,
      `${gameId.replace('-io', '')}.html`,
      `${gameId.replace('run3', 'run-3')}.html`,
      `${gameId.replace('tinyfishing', 'tiny-fishing')}.html`,
      `${gameId.replace('undertaleyellow', 'undertale-yellow')}.html`
    ].find(f => fs.existsSync(path.join(__dirname, f)));

    const gameUrl = knownHtml || `game.html?id=${encodeURIComponent(gameId)}`;

    const gameItem = {
      id: gameId,
      folder: folderName,
      slug: gameId,
      url: gameUrl,
      title: cleanTitle,
      category: override.category || 'Arcade & Action',
      categorySlug: override.categorySlug || 'arcade',
      categories: [override.categorySlug || 'arcade', 'action', 'skill'],
      rating: override.rating || '4.8',
      plays: override.plays || '50K+',
      gamePath: `games/${folderName}/${override.entryRel || entryRel}`,
      icon: override.icon || '🎮',
      badge: override.badge || 'GAME',
      badgeColor: override.badgeColor || 'rgba(59, 130, 246, 0.9)',
      desc: override.desc || `Play ${cleanTitle} unblocked free on PluhMath Arcade.`,
      howToPlay: 'Use standard keyboard and mouse controls to play.',
      controls: [
        { key: 'Arrow Keys / WASD', desc: 'Movement & action' },
        { key: 'Space / Enter', desc: 'Select / Confirm' }
      ]
    };

    games.push(gameItem);
  }

  // Also include standalone scratch game if present (Geometry Dash Subzero)
  if (fs.existsSync(path.join(__dirname, 'Scratch', 'GeometryDashSubzeroPLM', 'index.html'))) {
    games.push({
      id: 'geometry-dash',
      folder: 'Scratch/GeometryDashSubzeroPLM',
      slug: 'geometry-dash',
      url: 'geometry-dash.html',
      title: 'Geometry Dash Subzero',
      category: 'Runner & Rhythm',
      categorySlug: 'runner',
      categories: ['runner', 'skill', 'arcade'],
      rating: '4.9',
      plays: '280K',
      gamePath: 'Scratch/GeometryDashSubzeroPLM/index.html',
      icon: '⚡',
      badge: 'RHYTHM',
      badgeColor: 'rgba(236, 72, 153, 0.9)',
      desc: 'Jump, fly, and flip your way through dangerous neon subzero obstacles synced to electrifying EDM beats.',
      howToPlay: 'Time your jumps precisely to the rhythm of the music. Avoid spikes and saw blades.',
      controls: [{ key: 'Space / Click', desc: 'Jump / Fly' }]
    });
  }

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(games, null, 2), 'utf-8');
  console.log(`[Game Scanner] Successfully indexed ${games.length} games into games-manifest.json`);
  return games;
}

// Execute if run directly
scanGamesDirectory();
