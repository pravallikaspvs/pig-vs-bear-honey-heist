/**
 * ====================================================================
 * PIG VS BEAR: HONEY HEIST
 * A rich arcade catching game built with Vanilla JavaScript & SVG
 * ====================================================================
 */

/* ====================================================================
   1. ADJUSTABLE GAME CONFIGURATION
   Beginners can easily tweak game speeds, lives, goals, and drop rates here!
   ==================================================================== */
const CONFIG = {
  // Gameplay Mechanics
  initialLives: 3,                // Starting hearts
  winScore: 50,                   // Honey score required to win the round
  winBonusCoins: 25,              // Bonus coins awarded upon victory

  // Movement & Falling Speeds
  playerMoveSpeed: 7.5,           // Desktop keyboard speed (pixels per frame)
  initialFallSpeed: 3.2,          // Starting drop speed of jars (pixels per frame)
  speedIncreasePer10Pts: 0.42,    // How much speed increases for every 10 points
  maxFallSpeed: 8.5,              // Absolute maximum fall speed

  // Spawning Rates
  initialSpawnIntervalMs: 1350,   // Milliseconds between item drops at start
  spawnDecreasePer10Pts: 70,      // Faster spawn rate every 10 points
  minSpawnIntervalMs: 650,        // Fastest possible spawn interval

  // Spawn Chances (must roughly sum to 1.0)
  itemChances: {
    honeyJar: 0.65,               // Normal Honey Jar (+1 pt, +1 coin)
    goldenJar: 0.15,              // Golden Honey Jar (+5 pts, +5 coins)
    bee: 0.14,                    // Angry Bee (-1 life, resets combo)
    heart: 0.06                   // Sweet Heart (+1 life)
  },

  // Combo Settings
  comboTimeoutMs: 3000,           // Combo resets if no jar is caught within this time

  // Rival Interference & Escape Mechanics
  rivalCharge: {
    enabled: true,
    firstChargeDelayMs: 6000,     // First rival attempt happens after 6 seconds
    initialIntervalMs: 8500,      // Time between rival rushes
    intervalDecreasePer10Pts: 450,// Rival attacks more frequently as score rises
    minIntervalMs: 4500,          // Fastest charge frequency
    chargeSpeed: 6.2,             // Running speed across arena
    warningDurationMs: 1350,      // Telegraphed warning time to give player time to escape
    dodgeBonusCoins: 2            // Bonus coins awarded for successfully dodging the rival
  }
};

/* ====================================================================
   2. AUDIO SYNTHESIZER (WEB AUDIO API - NO EXTERNAL FILES NEEDED)
   ==================================================================== */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  playTone(freq, type = 'sine', duration = 0.15, gainVal = 0.15) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio context might be restricted before gesture
    }
  }

  playCatch(combo = 1) {
    if (this.isMuted) return;
    this.init();
    // Pitch elevates as combo increases (Pentatonic scale)
    const baseFreqs = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
    const index = Math.min(combo - 1, baseFreqs.length - 1);
    const freq = baseFreqs[index] || 523.25;

    this.playTone(freq, 'triangle', 0.18, 0.22);
    setTimeout(() => {
      this.playTone(freq * 1.25, 'sine', 0.12, 0.15);
    }, 45);
  }

  playGoldenCatch() {
    if (this.isMuted) return;
    this.init();
    const notes = [659.25, 783.99, 987.77, 1318.51];
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.22, 0.25);
      }, idx * 55);
    });
  }

  playBeeSting() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.35);
    } catch (e) {}
  }

  playHeartCatch() {
    if (this.isMuted) return;
    this.init();
    this.playTone(523.25, 'sine', 0.2, 0.2);
    setTimeout(() => this.playTone(783.99, 'sine', 0.28, 0.25), 80);
  }

  playMiss() {
    if (this.isMuted) return;
    this.init();
    this.playTone(180, 'square', 0.12, 0.15);
    setTimeout(() => this.playTone(110, 'sine', 0.2, 0.18), 70);
  }

  playWin() {
    if (this.isMuted) return;
    this.init();
    const fanfare = [
      { f: 523.25, d: 100 },
      { f: 659.25, d: 100 },
      { f: 783.99, d: 100 },
      { f: 1046.50, d: 280 }
    ];
    let delay = 0;
    fanfare.forEach(item => {
      setTimeout(() => {
        this.playTone(item.f, 'triangle', item.d / 1000 + 0.1, 0.3);
      }, delay);
      delay += item.d;
    });
  }

  playClick() {
    this.playTone(600, 'sine', 0.06, 0.12);
  }

  playPurchase() {
    if (this.isMuted) return;
    this.init();
    this.playTone(987.77, 'sine', 0.1, 0.2);
    setTimeout(() => this.playTone(1318.51, 'triangle', 0.22, 0.25), 75);
  }

  playRivalWarning() {
    if (this.isMuted) return;
    this.init();
    // High alert horn
    this.playTone(440, 'sawtooth', 0.12, 0.15);
    setTimeout(() => this.playTone(554.37, 'sawtooth', 0.18, 0.2), 90);
  }

  playRivalCharge() {
    if (this.isMuted) return;
    this.init();
    // Low rushing sound
    this.playTone(150, 'triangle', 0.25, 0.2);
  }

  playDodgeSuccess() {
    if (this.isMuted) return;
    this.init();
    // Rewarding quick dodge flourish
    this.playTone(880, 'sine', 0.1, 0.2);
    setTimeout(() => this.playTone(1174.66, 'triangle', 0.18, 0.25), 60);
  }

  playRivalTackle() {
    if (this.isMuted) return;
    this.init();
    // Heavy tackle impact
    this.playTone(110, 'square', 0.18, 0.35);
    setTimeout(() => this.playTone(75, 'sawtooth', 0.28, 0.3), 60);
  }
}

const sounds = new SoundEngine();

/* ====================================================================
   3. SAFE LOCAL STORAGE MANAGER
   Keeps track of coins, high scores, equipped outfits, and unlocks
   ==================================================================== */
class StorageManager {
  static get(key, defaultVal) {
    try {
      const data = localStorage.getItem('honey_heist_' + key);
      return data !== null ? JSON.parse(data) : defaultVal;
    } catch (e) {
      console.warn('LocalStorage unavailable, using fallback', e);
      return defaultVal;
    }
  }

  static set(key, val) {
    try {
      localStorage.setItem('honey_heist_' + key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }
}

/* ====================================================================
   4. DRESS-UP CATALOG & SVG CHARACTER GENERATOR
   No external image files! Procedural vectors for Pig, Bear, & Accessories
   ==================================================================== */
const DRESS_UP_CATALOG = {
  hats: [
    { id: 'none', name: 'No Hat', price: 0, unlocked: true },
    { id: 'party', name: 'Party Cone', price: 0, unlocked: true },
    { id: 'cowboy', name: 'Cowboy Hat', price: 20, unlocked: false },
    { id: 'chef', name: 'Chef Toque', price: 35, unlocked: false },
    { id: 'crown', name: 'Royal Crown', price: 50, unlocked: false }
  ],
  glasses: [
    { id: 'none', name: 'No Glasses', price: 0, unlocked: true },
    { id: 'round', name: 'Round Wire', price: 15, unlocked: false },
    { id: 'sunglasses', name: 'Cool Shades', price: 30, unlocked: false }
  ],
  outfits: [
    { id: 'none', name: 'No Outfit', price: 0, unlocked: true },
    { id: 'bowtie', name: 'Dapper Bow', price: 0, unlocked: true },
    { id: 'scarf', name: 'Warm Scarf', price: 25, unlocked: false },
    { id: 'hoodie', name: 'Comfy Hoodie', price: 40, unlocked: false },
    { id: 'cape', name: 'Hero Cape', price: 50, unlocked: false }
  ],
  colors: {
    pig: [
      { id: 'pink', name: 'Bubble Pink', hex: '#F472B6', accent: '#DB2777', price: 0, unlocked: true },
      { id: 'lavender', name: 'Lavender', hex: '#C084FC', accent: '#9333EA', price: 15, unlocked: false },
      { id: 'peach', name: 'Peach Cream', hex: '#FDBA74', accent: '#EA580C', price: 20, unlocked: false },
      { id: 'mint', name: 'Mint Piggy', hex: '#6EE7B7', accent: '#059669', price: 30, unlocked: false }
    ],
    bear: [
      { id: 'brown', name: 'Honey Brown', hex: '#92400E', accent: '#78350F', price: 0, unlocked: true },
      { id: 'grizzly', name: 'Dark Grizzly', hex: '#451A03', accent: '#290E02', price: 15, unlocked: false },
      { id: 'polar', name: 'Polar White', hex: '#E2E8F0', accent: '#94A3B8', price: 25, unlocked: false },
      { id: 'panda', name: 'Charcoal', hex: '#374151', accent: '#1F2937', price: 35, unlocked: false }
    ]
  }
};

class SVGFactory {
  // Generate character SVG with full body, back honey catching bag, and equipped accessories
  static createCharacterSVG(charType, outfitState, size = 100) {
    const isPig = charType === 'pig';

    // Skin color selection
    const colorId = outfitState.colors[charType] || (isPig ? 'pink' : 'brown');
    const colorList = DRESS_UP_CATALOG.colors[charType];
    const colorObj = colorList.find(c => c.id === colorId) || colorList[0];
    const mainColor = colorObj.hex;
    const accentColor = colorObj.accent;

    // Accessories
    const hat = outfitState.hat || 'none';
    const glasses = outfitState.glasses || 'none';
    const outfit = outfitState.outfit || 'none';

    let bodySvg = '';
    let accessoriesBehind = '';
    let accessoriesFront = '';

    // 1. BACKPACK HONEY CATCHING BAG (Behind Character's Body)
    const honeyBackpack = `
      <!-- Backpack Honey Catcher (Behind Character) -->
      <g class="honey-backpack-bag">
        <!-- Leather Backpack Body -->
        <path d="M22 46 Q15 78 26 88 Q50 94 74 88 Q85 78 78 46 Z" fill="#854D0E" stroke="#451A03" stroke-width="2.5"/>
        <!-- Wide Open Top Rim for Catching Honey -->
        <ellipse cx="50" cy="46" rx="31" ry="12" fill="#713F12" stroke="#451A03" stroke-width="2.5"/>
        <!-- Golden Honey Pool Inside Bag -->
        <ellipse cx="50" cy="47" rx="27" ry="9" fill="#F59E0B"/>
        <ellipse cx="50" cy="47" rx="22" ry="6" fill="#FBBF24" opacity="0.9"/>
        <!-- Viscous Honey Droplets on Rim -->
        <path d="M27 49 Q29 60 32 54 Q35 48 38 49 Q41 64 45 56 Q48 50 52 50 Q56 62 60 54 Q63 49 71 49" fill="#F59E0B" stroke="#B45309" stroke-width="1.2"/>
        <!-- Leather Pouch Seam & Buckle -->
        <path d="M34 70 Q50 74 66 70 L64 82 Q50 86 36 82 Z" fill="#A16207" stroke="#451A03" stroke-width="1.5"/>
        <circle cx="50" cy="76" r="3" fill="#FDE047" stroke="#78350F" stroke-width="1"/>
      </g>
    `;

    // 2. HERO CAPE (if equipped, hangs behind backpack & body)
    if (outfit === 'cape') {
      accessoriesBehind += `
        <!-- Superhero Cape -->
        <path d="M20 48 Q6 85 14 108 Q50 98 86 108 Q94 85 80 48 Z" fill="#DC2626" stroke="#991B1B" stroke-width="2.5"/>
        <path d="M25 52 Q50 98 75 52" stroke="#EF4444" stroke-width="2.5" fill="none" opacity="0.7"/>
      `;
    }

    if (isPig) {
      // FULL BODY PIG (Head, Snout, Floppy Ears, Curly Tail, Chubby Tummy, Arms, Feet)
      bodySvg = `
        <!-- Curly Pig Tail on Back -->
        <path d="M20 86 Q12 84 13 77 Q16 71 23 75 Q26 79 21 82" fill="none" stroke="${accentColor}" stroke-width="3" stroke-linecap="round"/>

        <!-- Pig Little Hooves/Feet -->
        <ellipse cx="37" cy="104" rx="9" ry="7" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <path d="M37 100 L37 108" stroke="${accentColor}" stroke-width="2"/>
        <ellipse cx="63" cy="104" rx="9" ry="7" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <path d="M63 100 L63 108" stroke="${accentColor}" stroke-width="2"/>

        <!-- Chubby Pig Torso & Tummy -->
        <path d="M27 60 Q18 88 28 98 Q50 104 72 98 Q82 88 73 60 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2.5"/>
        <!-- Soft Pink Belly Patch -->
        <ellipse cx="50" cy="82" rx="19" ry="15" fill="#FDA4AF" opacity="0.65"/>

        <!-- Pig Cute Little Arms -->
        <path d="M25 70 Q16 78 24 86 Q30 85 31 76 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <path d="M75 70 Q84 78 76 86 Q70 85 69 76 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>

        <!-- Backpack Leather Straps Over Chest -->
        <path d="M32 58 L34 86" stroke="#78350F" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M32 58 L34 86" stroke="#B45309" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="31" y="68" width="6" height="5" rx="1" fill="#FDE047" stroke="#78350F" stroke-width="1"/>

        <path d="M68 58 L66 86" stroke="#78350F" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M68 58 L66 86" stroke="#B45309" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="63" y="68" width="6" height="5" rx="1" fill="#FDE047" stroke="#78350F" stroke-width="1"/>

        <!-- Pig Floppy Ears -->
        <path d="M25 28 Q14 10 30 18 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <path d="M27 26 Q19 14 28 19 Z" fill="#FDA4AF"/>
        <path d="M75 28 Q86 10 70 18 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <path d="M73 26 Q81 14 72 19 Z" fill="#FDA4AF"/>

        <!-- Chubby Head -->
        <circle cx="50" cy="42" r="26" fill="${mainColor}" stroke="${accentColor}" stroke-width="2.5"/>

        <!-- Blushing Cheeks -->
        <circle cx="31" cy="46" r="5.5" fill="#F472B6" opacity="0.65"/>
        <circle cx="69" cy="46" r="5.5" fill="#F472B6" opacity="0.65"/>

        <!-- Pig Snout -->
        <ellipse cx="50" cy="48" rx="13" ry="9" fill="#FDA4AF" stroke="${accentColor}" stroke-width="2"/>
        <ellipse cx="45" cy="48" rx="2.5" ry="3.5" fill="${accentColor}"/>
        <ellipse cx="55" cy="48" rx="2.5" ry="3.5" fill="${accentColor}"/>

        <!-- Big Shiny Anime Eyes -->
        <ellipse cx="38" cy="35" rx="3.5" ry="4.5" fill="#1F2937"/>
        <circle cx="37" cy="33" r="1.5" fill="#FFFFFF"/>
        <circle cx="39.5" cy="36" r="0.8" fill="#FFFFFF"/>

        <ellipse cx="62" cy="35" rx="3.5" ry="4.5" fill="#1F2937"/>
        <circle cx="61" cy="33" r="1.5" fill="#FFFFFF"/>
        <circle cx="63.5" cy="36" r="0.8" fill="#FFFFFF"/>
      `;
    } else {
      // FULL BODY BEAR (Head, Ears, Muzzle, Fuzzy Tail, Chubby Tummy, Arms with Paws, Feet with Pads)
      bodySvg = `
        <!-- Round Bear Tail on Back -->
        <circle cx="21" cy="88" r="7.5" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>

        <!-- Bear Chubby Feet with Paw Pads -->
        <ellipse cx="36" cy="105" rx="10" ry="7.5" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <circle cx="36" cy="105" r="4" fill="#FEF3C7"/>
        <circle cx="30" cy="102" r="1.8" fill="#FEF3C7"/>
        <circle cx="36" cy="99" r="1.8" fill="#FEF3C7"/>
        <circle cx="42" cy="102" r="1.8" fill="#FEF3C7"/>

        <ellipse cx="64" cy="105" rx="10" ry="7.5" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <circle cx="64" cy="105" r="4" fill="#FEF3C7"/>
        <circle cx="58" cy="102" r="1.8" fill="#FEF3C7"/>
        <circle cx="64" cy="99" r="1.8" fill="#FEF3C7"/>
        <circle cx="70" cy="102" r="1.8" fill="#FEF3C7"/>

        <!-- Chubby Bear Torso -->
        <path d="M26 60 Q17 88 27 99 Q50 105 73 99 Q83 88 74 60 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2.5"/>
        <!-- Honey-Cream Belly Patch -->
        <ellipse cx="50" cy="82" rx="20" ry="16" fill="#FEF3C7" stroke="${accentColor}" stroke-width="1.5"/>

        <!-- Bear Arms with Paw Pads -->
        <path d="M25 68 Q14 78 23 87 Q29 86 31 77 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <circle cx="20" cy="81" r="3" fill="#FEF3C7"/>
        <path d="M75 68 Q86 78 77 87 Q71 86 69 77 Z" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <circle cx="80" cy="81" r="3" fill="#FEF3C7"/>

        <!-- Backpack Leather Straps Over Chest -->
        <path d="M32 58 L34 86" stroke="#78350F" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M32 58 L34 86" stroke="#B45309" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="31" y="68" width="6" height="5" rx="1" fill="#FDE047" stroke="#78350F" stroke-width="1"/>

        <path d="M68 58 L66 86" stroke="#78350F" stroke-width="4.5" stroke-linecap="round"/>
        <path d="M68 58 L66 86" stroke="#B45309" stroke-width="2.5" stroke-linecap="round"/>
        <rect x="63" y="68" width="6" height="5" rx="1" fill="#FDE047" stroke="#78350F" stroke-width="1"/>

        <!-- Bear Round Ears -->
        <circle cx="28" cy="22" r="11" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <circle cx="28" cy="22" r="6" fill="#FDE68A"/>
        <circle cx="72" cy="22" r="11" fill="${mainColor}" stroke="${accentColor}" stroke-width="2"/>
        <circle cx="72" cy="22" r="6" fill="#FDE68A"/>

        <!-- Bear Head -->
        <circle cx="50" cy="43" r="26" fill="${mainColor}" stroke="${accentColor}" stroke-width="2.5"/>

        <!-- Fur Cheek Tufts -->
        <path d="M24 45 Q20 48 24 52 Z" fill="${mainColor}"/>
        <path d="M76 45 Q80 48 76 52 Z" fill="${mainColor}"/>

        <!-- Bear Muzzle -->
        <ellipse cx="50" cy="50" rx="14" ry="11" fill="#FEF3C7" stroke="${accentColor}" stroke-width="1.5"/>
        <path d="M46 45 Q50 42 54 45 Q50 49 46 45 Z" fill="#1F2937"/>
        <path d="M50 48 L50 54" stroke="#1F2937" stroke-width="1.8"/>
        <path d="M45 54 Q50 58 55 54" stroke="#1F2937" stroke-width="1.8" fill="none"/>

        <!-- Expressive Shiny Eyes -->
        <circle cx="38" cy="36" r="4" fill="#1F2937"/>
        <circle cx="36.5" cy="34" r="1.5" fill="#FFFFFF"/>
        <circle cx="62" cy="36" r="4" fill="#1F2937"/>
        <circle cx="60.5" cy="34" r="1.5" fill="#FFFFFF"/>
      `;
    }

    // Glasses Layer
    if (glasses === 'sunglasses') {
      accessoriesFront += `
        <!-- Cool Sunglasses -->
        <path d="M26 31 L74 31 L71 42 Q63 45 55 41 L45 41 Q37 45 29 42 Z" fill="#1E293B" stroke="#0F172A" stroke-width="2"/>
        <line x1="31" y1="34" x2="41" y2="41" stroke="#94A3B8" stroke-width="1.5" opacity="0.8"/>
        <line x1="59" y1="34" x2="69" y2="41" stroke="#94A3B8" stroke-width="1.5" opacity="0.8"/>
      `;
    } else if (glasses === 'round') {
      accessoriesFront += `
        <!-- Round Gold Glasses -->
        <circle cx="38" cy="36" r="9" fill="rgba(191, 219, 254, 0.3)" stroke="#F59E0B" stroke-width="2"/>
        <circle cx="62" cy="36" r="9" fill="rgba(191, 219, 254, 0.3)" stroke="#F59E0B" stroke-width="2"/>
        <line x1="47" y1="36" x2="53" y2="36" stroke="#F59E0B" stroke-width="2"/>
      `;
    }

    // Outfit Front Accessories
    if (outfit === 'bowtie') {
      accessoriesFront += `
        <!-- Dapper Bow Tie -->
        <polygon points="40,56 50,61 40,66" fill="#EF4444" stroke="#B91C1C" stroke-width="1.5"/>
        <polygon points="60,56 50,61 60,66" fill="#EF4444" stroke="#B91C1C" stroke-width="1.5"/>
        <circle cx="50" cy="61" r="3.2" fill="#FBBF24"/>
      `;
    } else if (outfit === 'scarf') {
      accessoriesFront += `
        <!-- Cozy Scarf -->
        <rect x="32" y="55" width="36" height="10" rx="5" fill="#3B82F6" stroke="#1D4ED8" stroke-width="1.5"/>
        <rect x="42" y="55" width="7" height="10" fill="#93C5FD"/>
        <path d="M54 65 L54 82 L64 82 L64 65 Z" fill="#3B82F6" stroke="#1D4ED8" stroke-width="1.5"/>
        <line x1="54" y1="82" x2="64" y2="82" stroke="#FBBF24" stroke-width="2.5"/>
      `;
    } else if (outfit === 'hoodie') {
      accessoriesFront += `
        <!-- Comfy Hoodie -->
        <path d="M32 58 Q50 54 68 58 L72 82 Q50 87 28 82 Z" fill="#8B5CF6" stroke="#6D28D9" stroke-width="2"/>
        <line x1="43" y1="62" x2="40" y2="74" stroke="#DDD6FE" stroke-width="2"/>
        <line x1="57" y1="62" x2="60" y2="74" stroke="#DDD6FE" stroke-width="2"/>
        <path d="M38 72 Q50 76 62 72" stroke="#6D28D9" stroke-width="1.5" fill="none"/>
      `;
    }

    // Hats Layer
    if (hat === 'crown') {
      accessoriesFront += `
        <!-- Royal Crown -->
        <path d="M32 18 L38 4 L50 12 L62 4 L68 18 Z" fill="#F59E0B" stroke="#B45309" stroke-width="2"/>
        <circle cx="38" cy="4" r="2.8" fill="#EF4444"/>
        <circle cx="50" cy="12" r="2.8" fill="#3B82F6"/>
        <circle cx="62" cy="4" r="2.8" fill="#EF4444"/>
        <circle cx="50" cy="16" r="2" fill="#FDE047"/>
      `;
    } else if (hat === 'chef') {
      accessoriesFront += `
        <!-- Chef Toque -->
        <ellipse cx="50" cy="12" rx="22" ry="14" fill="#FFFFFF" stroke="#D1D5DB" stroke-width="2"/>
        <rect x="36" y="14" width="28" height="9" rx="2" fill="#FFFFFF" stroke="#9CA3AF" stroke-width="1.8"/>
        <path d="M42 4 Q50 -2 58 4" stroke="#E5E7EB" stroke-width="1.8" fill="none"/>
      `;
    } else if (hat === 'cowboy') {
      accessoriesFront += `
        <!-- Cowboy Hat -->
        <ellipse cx="50" cy="20" rx="30" ry="7" fill="#78350F" stroke="#451A03" stroke-width="2"/>
        <path d="M36 18 Q50 5 64 18 Z" fill="#92400E" stroke="#451A03" stroke-width="2"/>
        <rect x="38" y="17" width="24" height="3" fill="#F59E0B"/>
      `;
    } else if (hat === 'party') {
      accessoriesFront += `
        <!-- Party Hat -->
        <polygon points="38,22 50,1 62,22" fill="#EC4899" stroke="#BE185D" stroke-width="2"/>
        <polygon points="43,15 50,1 57,15" fill="#FACC15"/>
        <circle cx="50" cy="1" r="4" fill="#38BDF8"/>
      `;
    }

    return `
      <svg viewBox="0 0 100 120" width="${size}" height="${(size * 120) / 100}" xmlns="http://www.w3.org/2000/svg">
        ${accessoriesBehind}
        ${honeyBackpack}
        ${bodySvg}
        ${accessoriesFront}
      </svg>
    `;
  }

  // Generate Falling Objects SVG with New Upgraded Honey Bottle Models
  static createItemSVG(type) {
    if (type === 'honeyJar') {
      // BRAND NEW HONEY BOTTLE MODEL: Apothecary honey bottle with cork, drippy honey glaze & honeycomb crest
      return `
        <svg viewBox="0 0 48 54" width="48" height="54">
          <defs>
            <linearGradient id="honey-pot-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#FEF3C7"/>
              <stop offset="25%" stop-color="#FDE68A"/>
              <stop offset="70%" stop-color="#F59E0B"/>
              <stop offset="100%" stop-color="#D97706"/>
            </linearGradient>
            <linearGradient id="cork-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stop-color="#D97706"/>
              <stop offset="100%" stop-color="#92400E"/>
            </linearGradient>
          </defs>

          <!-- Cork Stopper & Neck String -->
          <polygon points="19,4 29,4 31,10 17,10" fill="url(#cork-grad)" stroke="#78350F" stroke-width="1.5"/>
          <rect x="15" y="10" width="18" height="4" rx="2" fill="#B45309" stroke="#78350F" stroke-width="1.5"/>
          <line x1="16" y1="12" x2="32" y2="12" stroke="#FDE68A" stroke-width="1"/>

          <!-- Curvaceous Glass Honey Bottle Body -->
          <path d="M17 14 Q10 24 10 38 Q10 49 24 49 Q38 49 38 38 Q38 24 31 14 Z" fill="url(#honey-pot-grad)" stroke="#92400E" stroke-width="2.2"/>

          <!-- Honey Viscous Level & Waves Inside -->
          <path d="M12 26 Q18 30 24 26 Q30 22 36 26 L37 38 Q37 47 24 47 Q11 47 11 38 Z" fill="#F59E0B" opacity="0.95"/>
          <path d="M13 28 Q18 32 24 28 Q30 24 35 28" stroke="#FEF08A" stroke-width="1.5" fill="none" opacity="0.8"/>

          <!-- Honey Dripping from Bottle Neck -->
          <path d="M17 14 Q20 22 22 18 Q25 24 27 19 Q30 23 31 14" fill="#FBBF24" stroke="#D97706" stroke-width="1.2"/>

          <!-- Honeycomb Hexagon Label -->
          <polygon points="24,31 29,34 29,40 24,43 19,40 19,34" fill="#FFFBEB" stroke="#B45309" stroke-width="1.4"/>
          <!-- Honey Drop Icon on Label -->
          <circle cx="24" cy="37" r="2.5" fill="#F59E0B"/>
          <ellipse cx="22" cy="35" rx="1.5" ry="2" fill="#93C5FD" opacity="0.7"/>
          <ellipse cx="26" cy="35" rx="1.5" ry="2" fill="#93C5FD" opacity="0.7"/>

          <!-- Gloss Specular Highlight -->
          <path d="M13 20 Q11 28 12 36" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" fill="none" opacity="0.75"/>
        </svg>
      `;
    }
    if (type === 'goldenJar') {
      // BRAND NEW GOLDEN HONEY BOTTLE MODEL: Royal crystal flagon with crown stopper, gold aura and liquid gold
      return `
        <svg viewBox="0 0 52 58" width="52" height="58">
          <defs>
            <radialGradient id="gold-aura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#FDE047" stop-opacity="0.8"/>
              <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
            </radialGradient>
          </defs>

          <!-- Radiant Golden Aura -->
          <circle cx="26" cy="30" r="24" fill="url(#gold-aura)"/>

          <!-- Royal Crown Stopper -->
          <path d="M21 4 L23 8 L26 3 L29 8 L31 4 L33 10 L19 10 Z" fill="#F59E0B" stroke="#78350F" stroke-width="1.5"/>
          <circle cx="26" cy="3" r="1.5" fill="#EF4444"/>
          <rect x="18" y="10" width="16" height="4" rx="2" fill="#D97706" stroke="#78350F" stroke-width="1.5"/>

          <!-- Ornate Royal Flagon Bottle -->
          <path d="M19 14 L12 24 L11 40 Q11 51 26 51 Q41 51 41 40 L40 24 L33 14 Z" fill="#FBBF24" stroke="#92400E" stroke-width="2.5"/>

          <!-- Liquid Gold Swirl -->
          <path d="M13 28 Q20 34 26 28 Q32 22 39 28 L40 40 Q40 49 26 49 Q12 49 12 40 Z" fill="#F59E0B"/>
          <path d="M14 30 Q20 36 26 30 Q32 24 38 30" stroke="#FFFBEB" stroke-width="2" fill="none"/>

          <!-- Diamond / Starburst Emblem -->
          <polygon points="26,33 29,38 34,38 30,42 32,47 26,44 20,47 22,42 18,38 23,38" fill="#FFFBEB" stroke="#B45309" stroke-width="1"/>

          <!-- Sparkle Stars -->
          <polygon points="12,16 14,19 17,19 14,21 15,24 12,22 9,24 10,21 7,19 10,19" fill="#FFF" opacity="0.9"/>
          <polygon points="40,16 42,19 45,19 42,21 43,24 40,22 37,24 38,21 35,19 38,19" fill="#FFF" opacity="0.9"/>
        </svg>
      `;
    }
    if (type === 'bee') {
      return `
        <svg viewBox="0 0 46 44" width="46" height="44">
          <!-- Wings -->
          <ellipse cx="17" cy="12" rx="7" ry="11" fill="rgba(224, 242, 254, 0.75)" stroke="#38BDF8" stroke-width="1.5" transform="rotate(-25 17 12)"/>
          <ellipse cx="29" cy="12" rx="7" ry="11" fill="rgba(224, 242, 254, 0.75)" stroke="#38BDF8" stroke-width="1.5" transform="rotate(25 29 12)"/>
          <!-- Bee Body -->
          <ellipse cx="23" cy="27" rx="15" ry="12" fill="#FACC15" stroke="#78350F" stroke-width="2"/>
          <!-- Black Stripes -->
          <path d="M18 16 Q20 27 18 38" stroke="#1F2937" stroke-width="3" fill="none"/>
          <path d="M25 15 Q27 27 25 39" stroke="#1F2937" stroke-width="3.5" fill="none"/>
          <!-- Stinger -->
          <polygon points="38,27 43,25 38,29" fill="#1F2937"/>
          <!-- Bee Face -->
          <circle cx="12" cy="25" r="2.5" fill="#1F2937"/>
          <circle cx="11" cy="24" r="0.8" fill="#FFFFFF"/>
          <path d="M8 22 Q12 20 14 22" stroke="#1F2937" stroke-width="1.2" fill="none"/>
        </svg>
      `;
    }
    if (type === 'heart') {
      return `
        <svg viewBox="0 0 40 40" width="40" height="40">
          <path d="M20 35 Q6 23 6 12 Q6 4 14 4 Q18 4 20 8 Q22 4 26 4 Q34 4 34 12 Q34 23 20 35 Z" fill="#F43F5E" stroke="#BE123C" stroke-width="2"/>
          <!-- Gloss highlight -->
          <path d="M10 10 Q14 7 17 8" stroke="#FFE4E6" stroke-width="2" stroke-linecap="round" fill="none"/>
        </svg>
      `;
    }
    return '';
  }
}

/* ====================================================================
   5. CONFETTI CELEBRATION SYSTEM (FOR WIN SCREEN)
   ==================================================================== */
class ConfettiCannon {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.animId = null;
    this.colors = ['#F59E0B', '#FBBF24', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];
  }

  start() {
    this.canvas.width = this.canvas.parentElement.clientWidth;
    this.canvas.height = this.canvas.parentElement.clientHeight;
    this.particles = [];

    // Create 90 vibrant confetti pieces
    for (let i = 0; i < 90; i++) {
      this.particles.push({
        x: this.canvas.width * 0.5 + (Math.random() - 0.5) * 60,
        y: this.canvas.height * 0.4 + (Math.random() - 0.5) * 40,
        vx: (Math.random() - 0.5) * 12,
        vy: -Math.random() * 12 - 4,
        size: Math.random() * 8 + 5,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rSpeed: (Math.random() - 0.5) * 12,
        gravity: 0.35
      });
    }

    if (this.animId) cancelAnimationFrame(this.animId);
    this.loop();
  }

  loop() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.98;
      p.rotation += p.rSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      this.ctx.restore();
    }

    this.animId = requestAnimationFrame(() => this.loop());
  }

  stop() {
    if (this.animId) cancelAnimationFrame(this.animId);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

/* ====================================================================
   6. MAIN GAME ENGINE
   Controls loop, inputs, physics, collisions, state, and UI binding
   ==================================================================== */
class HoneyHeistGame {
  constructor() {
    // Persistent Profile State
    this.coins = StorageManager.get('coins', 0);
    this.highScore = StorageManager.get('highScore', 0);
    this.selectedChar = StorageManager.get('selectedChar', 'pig');
    this.outfits = StorageManager.get('outfits', {
      hat: 'none',
      glasses: 'none',
      outfit: 'none',
      colors: { pig: 'pink', bear: 'brown' }
    });
    this.unlockedItems = StorageManager.get('unlocked', ['hat_none', 'hat_party', 'glasses_none', 'outfit_none', 'outfit_bowtie', 'color_pig_pink', 'color_bear_brown']);

    // Live Game Session State
    this.isPlaying = false;
    this.isEndless = false;
    this.score = 0;
    this.lives = CONFIG.initialLives;
    this.combo = 0;
    this.maxCombo = 0;
    this.coinsEarnedThisRun = 0;

    // Movement & Arena Coordinates
    this.playerX = 260; // Arena center
    this.arenaWidth = 520;
    this.arenaHeight = 660;
    this.keysHeld = { left: false, right: false };
    this.touchMovingLeft = false;
    this.touchMovingRight = false;
    this.lastComboTime = 0;

    // Falling Objects Pool
    this.fallingObjects = [];
    this.nextSpawnTime = 0;
    this.animFrameId = null;
    this.lastFrameTime = performance.now();

    // Rival Charger State (Other animal stops the player)
    this.rivalState = 'idle'; // 'idle' | 'warning' | 'charging'
    this.rivalX = -120;
    this.rivalDirection = 1;
    this.nextRivalChargeTime = 0;
    this.rivalWarningEndTime = 0;
    this.rivalHasCollidedThisRun = false;
    this.rivalHasDodged = false;

    // DOM Caching
    this.dom = {
      app: document.getElementById('game-app'),
      viewport: document.getElementById('game-viewport'),
      arena: document.getElementById('game-arena'),
      skyLayer: document.getElementById('sky-layer'),
      playerEntity: document.getElementById('player-entity'),
      playerAvatarWrap: document.getElementById('player-avatar-wrap'),
      fallingContainer: document.getElementById('falling-container'),
      fxLayer: document.getElementById('fx-layer'),
      opponentBox: document.getElementById('opponent-svg-box'),
      opponentBubble: document.getElementById('opponent-bubble'),
      opponentPeeker: document.getElementById('opponent-peeker'),

      // Rival Charging Entity & Alert
      rivalEntity: document.getElementById('rival-charger-entity'),
      rivalAvatarWrap: document.getElementById('rival-avatar-wrap'),
      rivalSpeech: document.getElementById('rival-speech'),
      rivalWarningBanner: document.getElementById('rival-warning-banner'),
      rivalWarningText: document.getElementById('rival-warning-text'),

      // Top bar & HUD
      topCoinsVal: document.getElementById('top-coins-val'),
      topBestVal: document.getElementById('top-best-val'),
      soundBtn: document.getElementById('btn-sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      hudScoreVal: document.getElementById('hud-score-val'),
      hudTargetVal: document.getElementById('hud-target-val'),
      hudComboBadge: document.getElementById('hud-combo-badge'),
      hudComboMult: document.getElementById('hud-combo-multiplier'),
      heartSlots: [
        document.getElementById('heart-1'),
        document.getElementById('heart-2'),
        document.getElementById('heart-3')
      ],

      // Screens
      screenStart: document.getElementById('screen-start'),
      screenShop: document.getElementById('screen-shop'),
      screenGameOver: document.getElementById('screen-game-over'),
      screenWin: document.getElementById('screen-win'),
      modalRules: document.getElementById('modal-rules'),
      confettiCanvas: document.getElementById('confetti-canvas'),

      // Start screen previews & picks
      startPigAvatar: document.getElementById('start-pig-avatar'),
      startBearAvatar: document.getElementById('start-bear-avatar'),
      btnPickPig: document.getElementById('btn-pick-pig'),
      btnPickBear: document.getElementById('btn-pick-bear'),
      btnStartGame: document.getElementById('btn-start-game'),
      btnOpenShop: document.getElementById('btn-open-shop'),
      btnOpenRules: document.getElementById('btn-open-rules'),

      // Shop elements
      shopTogglePig: document.getElementById('shop-toggle-pig'),
      shopToggleBear: document.getElementById('shop-toggle-bear'),
      shopPreview: document.getElementById('shop-character-preview'),
      shopEquipSummary: document.getElementById('equipped-summary-text'),
      shopCoinBal: document.getElementById('shop-coin-balance'),
      shopGrid: document.getElementById('shop-items-grid'),
      shopCatTabs: document.getElementById('shop-category-tabs'),
      btnCloseShop: document.getElementById('btn-close-shop'),
      btnShopPlay: document.getElementById('btn-shop-play'),

      // Rules
      btnCloseRules: document.getElementById('btn-close-rules'),
      btnUnderstoodRules: document.getElementById('btn-understood-rules'),

      // Game Over elements
      goScore: document.getElementById('go-score'),
      goCoins: document.getElementById('go-coins'),
      goCombo: document.getElementById('go-combo'),
      goFlavor: document.getElementById('game-over-flavor'),
      goRecordBanner: document.getElementById('new-high-score-banner'),
      btnReplayGame: document.getElementById('btn-replay-game'),
      btnGoToShop: document.getElementById('btn-go-to-shop'),
      btnGoToHome: document.getElementById('btn-go-to-home'),

      // Win Screen elements
      winHeadline: document.getElementById('win-headline'),
      winFlavor: document.getElementById('win-flavor'),
      winCharPreview: document.getElementById('win-character-preview'),
      winScore: document.getElementById('win-score'),
      winCoinsTotal: document.getElementById('win-coins-total'),
      winBestCombo: document.getElementById('win-best-combo'),
      btnContinueEndless: document.getElementById('btn-continue-endless'),
      btnWinShop: document.getElementById('btn-win-shop'),
      btnWinHome: document.getElementById('btn-win-home'),

      // Mobile Touch buttons
      btnTouchLeft: document.getElementById('btn-touch-left'),
      btnTouchRight: document.getElementById('btn-touch-right')
    };

    this.confetti = new ConfettiCannon(this.dom.confettiCanvas);
    this.shopCurrentChar = this.selectedChar;
    this.shopActiveCategory = 'hats';

    this.init();
  }

  init() {
    this.bindEvents();
    this.updateGlobalStatsDisplay();
    this.renderStartScreenPreviews();
    this.renderPlayerAvatar();
    this.renderOpponent();
    this.updateTargetScoreHUD();
  }

  /* ====================================================================
     7. EVENT LISTENERS & USER INPUTS (DESKTOP & MOBILE)
     ==================================================================== */
  bindEvents() {
    // Desktop Keyboard Controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keysHeld.left = true;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keysHeld.right = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keysHeld.left = false;
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keysHeld.right = false;
      }
    });

    // Touch Controls: On-Screen Directional Buttons
    const startLeft = (e) => { e.preventDefault(); this.touchMovingLeft = true; };
    const endLeft = (e) => { e.preventDefault(); this.touchMovingLeft = false; };
    this.dom.btnTouchLeft.addEventListener('pointerdown', startLeft);
    this.dom.btnTouchLeft.addEventListener('pointerup', endLeft);
    this.dom.btnTouchLeft.addEventListener('pointerleave', endLeft);

    const startRight = (e) => { e.preventDefault(); this.touchMovingRight = true; };
    const endRight = (e) => { e.preventDefault(); this.touchMovingRight = false; };
    this.dom.btnTouchRight.addEventListener('pointerdown', startRight);
    this.dom.btnTouchRight.addEventListener('pointerup', endRight);
    this.dom.btnTouchRight.addEventListener('pointerleave', endRight);

    // Direct Pointer Drag & Tap on Arena
    const movePlayerToPointer = (e) => {
      if (!this.isPlaying) return;
      const rect = this.dom.arena.getBoundingClientRect();
      const pointerX = e.clientX - rect.left;
      this.playerX = Math.max(45, Math.min(rect.width - 45, pointerX));
      this.updatePlayerPositionDOM();
    };

    let isPointerDragging = false;
    this.dom.arena.addEventListener('pointerdown', (e) => {
      isPointerDragging = true;
      movePlayerToPointer(e);
    });
    window.addEventListener('pointermove', (e) => {
      if (isPointerDragging) movePlayerToPointer(e);
    });
    window.addEventListener('pointerup', () => {
      isPointerDragging = false;
    });

    // Sound Mute Toggle
    this.dom.soundBtn.addEventListener('click', () => {
      const muted = sounds.toggleMute();
      this.dom.soundIcon.textContent = muted ? '🔇' : '🔊';
      sounds.playClick();
    });

    // Start Screen Character Choice
    this.dom.btnPickPig.addEventListener('click', () => {
      this.selectCharacter('pig');
      sounds.playClick();
    });
    this.dom.btnPickBear.addEventListener('click', () => {
      this.selectCharacter('bear');
      sounds.playClick();
    });

    // Navigation & Screen Switches
    this.dom.btnStartGame.addEventListener('click', () => {
      sounds.playClick();
      this.startGame();
    });
    this.dom.btnOpenShop.addEventListener('click', () => {
      sounds.playClick();
      this.openShop();
    });
    this.dom.btnCloseShop.addEventListener('click', () => {
      sounds.playClick();
      this.closeShop();
    });
    this.dom.btnShopPlay.addEventListener('click', () => {
      sounds.playClick();
      this.closeShop();
      this.startGame();
    });

    // Rules Modal
    this.dom.btnOpenRules.addEventListener('click', () => {
      sounds.playClick();
      this.dom.modalRules.classList.remove('hidden');
    });
    this.dom.btnCloseRules.addEventListener('click', () => {
      sounds.playClick();
      this.dom.modalRules.classList.add('hidden');
    });
    this.dom.btnUnderstoodRules.addEventListener('click', () => {
      sounds.playClick();
      this.dom.modalRules.classList.add('hidden');
    });

    // Game Over Buttons
    this.dom.btnReplayGame.addEventListener('click', () => {
      sounds.playClick();
      this.startGame();
    });
    this.dom.btnGoToShop.addEventListener('click', () => {
      sounds.playClick();
      this.dom.screenGameOver.classList.add('hidden');
      this.openShop();
    });
    this.dom.btnGoToHome.addEventListener('click', () => {
      sounds.playClick();
      this.dom.screenGameOver.classList.add('hidden');
      this.dom.screenStart.classList.remove('hidden');
    });

    // Win Screen Buttons
    this.dom.btnContinueEndless.addEventListener('click', () => {
      sounds.playClick();
      this.dom.screenWin.classList.add('hidden');
      this.confetti.stop();
      this.continueEndless();
    });
    this.dom.btnWinShop.addEventListener('click', () => {
      sounds.playClick();
      this.dom.screenWin.classList.add('hidden');
      this.confetti.stop();
      this.openShop();
    });
    this.dom.btnWinHome.addEventListener('click', () => {
      sounds.playClick();
      this.dom.screenWin.classList.add('hidden');
      this.confetti.stop();
      this.dom.screenStart.classList.remove('hidden');
    });

    // Shop Switchers
    this.dom.shopTogglePig.addEventListener('click', () => {
      this.setShopCharacter('pig');
      sounds.playClick();
    });
    this.dom.shopToggleBear.addEventListener('click', () => {
      this.setShopCharacter('bear');
      sounds.playClick();
    });

    // Category Tabs in Shop
    this.dom.shopCatTabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.cat-tab');
      if (!tab) return;
      sounds.playClick();
      this.dom.shopCatTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      this.shopActiveCategory = tab.dataset.category;
      this.renderShopGrid();
    });

    // Responsive Window Resize recalculation
    window.addEventListener('resize', () => {
      this.recalculateArenaBounds();
    });
  }

  /* ====================================================================
     8. CHARACTER SELECTION & DISPLAY UPDATES
     ==================================================================== */
  selectCharacter(charType) {
    this.selectedChar = charType;
    StorageManager.set('selectedChar', charType);

    this.dom.btnPickPig.classList.toggle('active', charType === 'pig');
    this.dom.btnPickBear.classList.toggle('active', charType === 'bear');

    this.renderPlayerAvatar();
    this.renderOpponent();
  }

  renderStartScreenPreviews() {
    this.dom.startPigAvatar.innerHTML = SVGFactory.createCharacterSVG('pig', {
      hat: 'party',
      glasses: 'none',
      outfit: 'bowtie',
      colors: { pig: 'pink' }
    }, 72);

    this.dom.startBearAvatar.innerHTML = SVGFactory.createCharacterSVG('bear', {
      hat: 'cowboy',
      glasses: 'sunglasses',
      outfit: 'cape',
      colors: { bear: 'brown' }
    }, 72);
  }

  renderPlayerAvatar() {
    this.dom.playerAvatarWrap.innerHTML = SVGFactory.createCharacterSVG(
      this.selectedChar,
      this.outfits,
      82
    );
  }

  renderOpponent() {
    // Opponent is the other animal
    const oppType = this.selectedChar === 'pig' ? 'bear' : 'pig';
    const oppOutfit = {
      hat: 'none',
      glasses: 'none',
      outfit: 'none',
      colors: { pig: 'pink', bear: 'brown' }
    };

    // Upper tree peeker
    this.dom.opponentBox.innerHTML = SVGFactory.createCharacterSVG(oppType, oppOutfit, 48);

    // Ground rushing rival charger
    if (this.dom.rivalAvatarWrap) {
      this.dom.rivalAvatarWrap.innerHTML = SVGFactory.createCharacterSVG(oppType, oppOutfit, 95);
    }

    this.dom.opponentBubble.textContent = this.selectedChar === 'pig'
      ? '"Stealing your honey! 🐻"'
      : '"Guard pig is watching! 🐷"';
  }

  /* ====================================================================
     9. DRESS-UP SHOP LOGIC & LIVE PREVIEWS
     ==================================================================== */
  openShop() {
    this.shopCurrentChar = this.selectedChar;
    this.dom.shopTogglePig.classList.toggle('active', this.shopCurrentChar === 'pig');
    this.dom.shopToggleBear.classList.toggle('active', this.shopCurrentChar === 'bear');
    this.dom.shopCoinBal.textContent = this.coins;
    this.dom.screenShop.classList.remove('hidden');
    this.renderShopPreview();
    this.renderShopGrid();
  }

  closeShop() {
    this.dom.screenShop.classList.add('hidden');
    this.renderPlayerAvatar();
    this.updateGlobalStatsDisplay();
  }

  setShopCharacter(charType) {
    this.shopCurrentChar = charType;
    this.dom.shopTogglePig.classList.toggle('active', charType === 'pig');
    this.dom.shopToggleBear.classList.toggle('active', charType === 'bear');
    this.renderShopPreview();
    this.renderShopGrid();
  }

  renderShopPreview() {
    this.dom.shopPreview.innerHTML = SVGFactory.createCharacterSVG(
      this.shopCurrentChar,
      this.outfits,
      80
    );
    this.dom.shopEquipSummary.textContent = `Hero: ${this.shopCurrentChar.toUpperCase()} | Hat: ${this.outfits.hat} | Outfit: ${this.outfits.outfit}`;
  }

  renderShopGrid() {
    this.dom.shopGrid.innerHTML = '';
    const cat = this.shopActiveCategory;

    let items = [];
    if (cat === 'colors') {
      items = DRESS_UP_CATALOG.colors[this.shopCurrentChar] || [];
    } else {
      items = DRESS_UP_CATALOG[cat] || [];
    }

    items.forEach(item => {
      const card = document.createElement('div');
      card.className = 'shop-item-card';

      // Check equipped status
      let isEquipped = false;
      if (cat === 'colors') {
        isEquipped = (this.outfits.colors[this.shopCurrentChar] || (this.shopCurrentChar === 'pig' ? 'pink' : 'brown')) === item.id;
      } else if (cat === 'hats') {
        isEquipped = this.outfits.hat === item.id;
      } else if (cat === 'glasses') {
        isEquipped = this.outfits.glasses === item.id;
      } else if (cat === 'outfits') {
        isEquipped = this.outfits.outfit === item.id;
      }

      if (isEquipped) card.classList.add('equipped');

      // Check unlocked status
      const unlockKey = `${cat.slice(0, -1)}_${item.id}`;
      const colorUnlockKey = `color_${this.shopCurrentChar}_${item.id}`;
      const isUnlocked = item.price === 0 || this.unlockedItems.includes(unlockKey) || this.unlockedItems.includes(colorUnlockKey);

      // Thumbnail
      let thumbHtml = '';
      if (cat === 'colors') {
        thumbHtml = `<div class="item-color-swatch" style="background:${item.hex};"></div>`;
      } else {
        // Mini preview SVG
        const dummyOutfit = {
          hat: cat === 'hats' ? item.id : 'none',
          glasses: cat === 'glasses' ? item.id : 'none',
          outfit: cat === 'outfits' ? item.id : 'none',
          colors: { pig: 'pink', bear: 'brown' }
        };
        thumbHtml = SVGFactory.createCharacterSVG(this.shopCurrentChar, dummyOutfit, 42);
      }

      // Badge label
      let badgeHtml = '';
      if (isEquipped) {
        badgeHtml = `<span class="item-badge badge-equipped">Equipped</span>`;
      } else if (isUnlocked) {
        badgeHtml = `<span class="item-badge badge-owned">Equip</span>`;
      } else {
        badgeHtml = `<span class="item-badge badge-price">${item.price} 🪙</span>`;
      }

      card.innerHTML = `
        <div class="item-thumb-box">${thumbHtml}</div>
        <div class="item-name">${item.name}</div>
        ${badgeHtml}
      `;

      card.addEventListener('click', () => {
        this.handleItemSelection(cat, item, isUnlocked, unlockKey, colorUnlockKey, card);
      });

      this.dom.shopGrid.appendChild(card);
    });
  }

  handleItemSelection(cat, item, isUnlocked, unlockKey, colorUnlockKey, cardElem) {
    if (isUnlocked) {
      // Equip item immediately
      sounds.playClick();
      if (cat === 'colors') {
        this.outfits.colors[this.shopCurrentChar] = item.id;
      } else if (cat === 'hats') {
        this.outfits.hat = item.id;
      } else if (cat === 'glasses') {
        this.outfits.glasses = item.id;
      } else if (cat === 'outfits') {
        this.outfits.outfit = item.id;
      }
      StorageManager.set('outfits', this.outfits);
      this.renderShopPreview();
      this.renderShopGrid();
      this.renderPlayerAvatar();
    } else {
      // Attempt Purchase
      if (this.coins >= item.price) {
        this.coins -= item.price;
        const keyToAdd = cat === 'colors' ? colorUnlockKey : unlockKey;
        this.unlockedItems.push(keyToAdd);

        StorageManager.set('coins', this.coins);
        StorageManager.set('unlocked', this.unlockedItems);

        // Equip purchased item
        if (cat === 'colors') {
          this.outfits.colors[this.shopCurrentChar] = item.id;
        } else if (cat === 'hats') {
          this.outfits.hat = item.id;
        } else if (cat === 'glasses') {
          this.outfits.glasses = item.id;
        } else if (cat === 'outfits') {
          this.outfits.outfit = item.id;
        }
        StorageManager.set('outfits', this.outfits);

        sounds.playPurchase();
        cardElem.classList.add('just-unlocked');
        this.dom.shopCoinBal.textContent = this.coins;
        this.updateGlobalStatsDisplay();

        setTimeout(() => {
          this.renderShopPreview();
          this.renderShopGrid();
          this.renderPlayerAvatar();
        }, 300);
      } else {
        // Not enough coins
        sounds.playMiss();
        this.dom.shopCoinBal.parentElement.style.animation = 'screenShake 0.3s ease';
        setTimeout(() => {
          this.dom.shopCoinBal.parentElement.style.animation = '';
        }, 350);
      }
    }
  }

  /* ====================================================================
     10. GAMEPLAY LOOP & PHYSICS
     ==================================================================== */
  startGame() {
    this.dom.screenStart.classList.add('hidden');
    this.dom.screenGameOver.classList.add('hidden');
    this.dom.screenWin.classList.add('hidden');
    this.confetti.stop();

    // Reset session stats
    this.isPlaying = true;
    this.isEndless = false;
    this.score = 0;
    this.lives = CONFIG.initialLives;
    this.combo = 0;
    this.maxCombo = 0;
    this.coinsEarnedThisRun = 0;

    // Reset DOM items
    this.dom.fallingContainer.innerHTML = '';
    this.dom.fxLayer.innerHTML = '';
    this.fallingObjects = [];

    // Reset Rival Charger state
    this.rivalState = 'idle';
    this.rivalX = -120;
    this.rivalDirection = 1;
    this.rivalHasCollidedThisRun = false;
    this.rivalHasDodged = false;
    if (this.dom.rivalEntity) this.dom.rivalEntity.classList.add('hidden');
    if (this.dom.rivalWarningBanner) this.dom.rivalWarningBanner.classList.add('hidden');
    this.nextRivalChargeTime = performance.now() + CONFIG.rivalCharge.firstChargeDelayMs;

    this.recalculateArenaBounds();
    this.playerX = this.arenaWidth * 0.5;
    this.updatePlayerPositionDOM();

    this.updateHUD();
    this.updateSkyShift();
    this.updateTargetScoreHUD();

    this.lastFrameTime = performance.now();
    this.nextSpawnTime = performance.now() + 600;

    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.gameLoop(performance.now());
  }

  continueEndless() {
    this.isPlaying = true;
    this.isEndless = true;
    this.updateTargetScoreHUD();
    this.lastFrameTime = performance.now();
    this.nextSpawnTime = performance.now() + 800;
    this.nextRivalChargeTime = performance.now() + 5000;
    this.gameLoop(performance.now());
  }

  recalculateArenaBounds() {
    const rect = this.dom.arena.getBoundingClientRect();
    if (rect.width > 0) {
      this.arenaWidth = rect.width;
      this.arenaHeight = rect.height;
    }
  }

  gameLoop(now) {
    if (!this.isPlaying) return;

    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    // Update Player Movement
    this.updatePlayerMovement(dt);

    // Spawn falling objects based on current difficulty
    if (now >= this.nextSpawnTime) {
      this.spawnFallingObject();
      const currentSpawnInterval = Math.max(
        CONFIG.minSpawnIntervalMs,
        CONFIG.initialSpawnIntervalMs - Math.floor(this.score / 10) * CONFIG.spawnDecreasePer10Pts
      );
      this.nextSpawnTime = now + currentSpawnInterval;
    }

    // Update Falling Objects Physics & Collision
    this.updateFallingObjects(dt);

    // Update Rival Interference & Escape Mechanics
    this.updateRival(now, dt);

    // Check combo expiration
    if (this.combo > 0 && now - this.lastComboTime > CONFIG.comboTimeoutMs) {
      this.resetCombo();
    }

    this.animFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  updatePlayerMovement(dt) {
    let moveDir = 0;
    if (this.keysHeld.left || this.touchMovingLeft) moveDir -= 1;
    if (this.keysHeld.right || this.touchMovingRight) moveDir += 1;

    if (moveDir !== 0) {
      const step = moveDir * CONFIG.playerMoveSpeed * (dt * 60);
      this.playerX = Math.max(45, Math.min(this.arenaWidth - 45, this.playerX + step));
      this.updatePlayerPositionDOM();
    }
  }

  updatePlayerPositionDOM() {
    this.dom.playerEntity.style.left = `${this.playerX}px`;
  }

  /* ====================================================================
     11. FALLING OBJECTS & COLLISION DETECTION
     ==================================================================== */
  spawnFallingObject() {
    const rand = Math.random();
    let type = 'honeyJar';

    const p = CONFIG.itemChances;
    if (rand < p.honeyJar) {
      type = 'honeyJar';
    } else if (rand < p.honeyJar + p.goldenJar) {
      type = 'goldenJar';
    } else if (rand < p.honeyJar + p.goldenJar + p.bee) {
      type = 'bee';
    } else {
      type = 'heart';
    }

    const padding = 36;
    const spawnX = padding + Math.random() * (this.arenaWidth - padding * 2);

    const elem = document.createElement('div');
    elem.className = `falling-item item-${type}`;
    elem.innerHTML = SVGFactory.createItemSVG(type);
    this.dom.fallingContainer.appendChild(elem);

    // Calculate current fall speed
    const difficultyBoost = Math.floor(this.score / 10) * CONFIG.speedIncreasePer10Pts;
    const speed = Math.min(CONFIG.maxFallSpeed, CONFIG.initialFallSpeed + difficultyBoost);

    this.fallingObjects.push({
      elem,
      type,
      x: spawnX,
      y: -20,
      speed: speed + (Math.random() * 0.4 - 0.2) // slight variation
    });
  }

  updateFallingObjects(dt) {
    const basketCatchY = this.arenaHeight - 75; // Player basket height from top
    const basketWidth = 65;

    for (let i = this.fallingObjects.length - 1; i >= 0; i--) {
      const obj = this.fallingObjects[i];
      obj.y += obj.speed * (dt * 60);
      obj.elem.style.transform = `translate(${obj.x}px, ${obj.y}px)`;

      // Collision Detection with Player Catcher
      const dx = Math.abs(obj.x - this.playerX);
      const dy = Math.abs(obj.y - basketCatchY);

      if (dx < basketWidth * 0.5 && dy < 28) {
        // Player caught item!
        this.handleItemCatch(obj);
        obj.elem.remove();
        this.fallingObjects.splice(i, 1);
        continue;
      }

      // Hit Ground (Missed or Avoided)
      if (obj.y > this.arenaHeight - 15) {
        this.handleItemGroundHit(obj);
        obj.elem.remove();
        this.fallingObjects.splice(i, 1);
      }
    }
  }

  /* ====================================================================
     11b. RIVAL INTERFERENCE & ESCAPE MECHANIC
     The other animal rushes across ground to tackle player & stop the heist!
     ==================================================================== */
  updateRival(now, dt) {
    if (!CONFIG.rivalCharge.enabled || !this.isPlaying) return;

    if (this.rivalState === 'idle') {
      if (now >= this.nextRivalChargeTime) {
        // Trigger Warning
        this.rivalState = 'warning';
        this.rivalWarningEndTime = now + CONFIG.rivalCharge.warningDurationMs;

        // Choose random direction: from left (1) or right (-1)
        this.rivalDirection = Math.random() < 0.5 ? 1 : -1;

        const isPigPlayer = this.selectedChar === 'pig';
        const rivalName = isPigPlayer ? 'BEAR' : 'GUARD PIG';
        if (this.dom.rivalWarningText) {
          this.dom.rivalWarningText.textContent = `⚠️ ${rivalName} CHARGING! DODGE!`;
        }
        if (this.dom.rivalWarningBanner) {
          this.dom.rivalWarningBanner.classList.remove('hidden');
        }

        // Set speech bubble
        const bearQuotes = ['"HONEY HEIST! 🐻"', '"GIMME THAT! 🍯"', '"CHARGE! 🐾"'];
        const pigQuotes = ['"HALT THIEF! 🐷"', '"GUARD ON DUTY! 🚨"', '"STOP RIGHT THERE! 👮"'];
        const quotes = isPigPlayer ? bearQuotes : pigQuotes;
        if (this.dom.rivalSpeech) {
          this.dom.rivalSpeech.textContent = quotes[Math.floor(Math.random() * quotes.length)];
        }

        sounds.playRivalWarning();
      }
    } else if (this.rivalState === 'warning') {
      if (now >= this.rivalWarningEndTime) {
        // Start rushing!
        if (this.dom.rivalWarningBanner) {
          this.dom.rivalWarningBanner.classList.add('hidden');
        }
        this.rivalState = 'charging';
        this.rivalHasCollidedThisRun = false;
        this.rivalHasDodged = false;

        if (this.rivalDirection === 1) {
          this.rivalX = -110;
          if (this.dom.rivalEntity) this.dom.rivalEntity.classList.remove('facing-left');
        } else {
          this.rivalX = this.arenaWidth + 20;
          if (this.dom.rivalEntity) this.dom.rivalEntity.classList.add('facing-left');
        }

        if (this.dom.rivalEntity) {
          this.dom.rivalEntity.style.left = `${this.rivalX}px`;
          this.dom.rivalEntity.classList.remove('hidden');
        }
        sounds.playRivalCharge();
      }
    } else if (this.rivalState === 'charging') {
      // Rush across ground
      const step = this.rivalDirection * CONFIG.rivalCharge.chargeSpeed * (dt * 60);
      this.rivalX += step;
      if (this.dom.rivalEntity) {
        this.dom.rivalEntity.style.left = `${this.rivalX}px`;
      }

      // Check Tackle Collision with Player
      const dist = Math.abs(this.rivalX - this.playerX);
      if (!this.rivalHasCollidedThisRun && dist < 52) {
        // TACKLED! Opponent stopped the player!
        this.rivalHasCollidedThisRun = true;
        this.lives = Math.max(0, this.lives - 1);
        this.resetCombo();
        this.triggerStumble();
        this.triggerScreenShake();
        sounds.playRivalTackle();

        if (this.dom.rivalSpeech) {
          this.dom.rivalSpeech.textContent = '"TACKLED! 💥"';
        }
        this.createFloatingText('TACKLED! -1 ❤️', this.playerX, this.arenaHeight - 110, 'txt-tackled');

        if (this.lives <= 0) {
          this.triggerGameOver();
          return;
        }
        this.updateHUD();
      }

      // Check if Player successfully dodged / escaped
      const passedDistance = this.rivalDirection === 1
        ? (this.rivalX > this.playerX + 55)
        : (this.rivalX < this.playerX - 55);

      if (passedDistance && !this.rivalHasCollidedThisRun && !this.rivalHasDodged) {
        this.rivalHasDodged = true;
        // Reward for clever escape!
        this.coins += CONFIG.rivalCharge.dodgeBonusCoins;
        this.coinsEarnedThisRun += CONFIG.rivalCharge.dodgeBonusCoins;
        this.updateGlobalStatsDisplay();

        sounds.playDodgeSuccess();
        this.createFloatingText('DODGED! 💨 +2 🪙', this.playerX, this.arenaHeight - 110, 'txt-dodge');
      }

      // Check if rival left the arena screen completely
      const isOffscreen = this.rivalDirection === 1
        ? (this.rivalX > this.arenaWidth + 120)
        : (this.rivalX < -130);

      if (isOffscreen) {
        if (this.dom.rivalEntity) {
          this.dom.rivalEntity.classList.add('hidden');
        }
        this.rivalState = 'idle';

        // Schedule next charge based on difficulty
        const currentInterval = Math.max(
          CONFIG.rivalCharge.minIntervalMs,
          CONFIG.rivalCharge.initialIntervalMs - Math.floor(this.score / 10) * CONFIG.rivalCharge.intervalDecreasePer10Pts
        );
        this.nextRivalChargeTime = now + currentInterval;
      }
    }
  }

  handleItemCatch(obj) {
    this.triggerPlayerSquash();

    if (obj.type === 'honeyJar') {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.lastComboTime = performance.now();

      const mult = Math.max(1, this.combo);
      const pts = 1 * mult;
      this.score += pts;
      this.coins += 1;
      this.coinsEarnedThisRun += 1;

      sounds.playCatch(this.combo);
      this.createFloatingText(`+${pts}`, obj.x, obj.y, 'txt-honey');
      if (this.combo >= 2) {
        this.createFloatingText(`COMBO x${this.combo}!`, this.playerX, this.arenaHeight - 120, 'txt-combo');
      }
    } else if (obj.type === 'goldenJar') {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this.lastComboTime = performance.now();

      const mult = Math.max(1, this.combo);
      const pts = 5 * mult;
      this.score += pts;
      this.coins += 5;
      this.coinsEarnedThisRun += 5;

      sounds.playGoldenCatch();
      this.createFloatingText(`+${pts} GOLDEN!`, obj.x, obj.y, 'txt-golden');
    } else if (obj.type === 'bee') {
      // Caught a bee! Lose a life & reset combo
      this.lives = Math.max(0, this.lives - 1);
      this.resetCombo();
      this.triggerStumble();
      this.triggerScreenShake();
      sounds.playBeeSting();
      this.createFloatingText(`STUNG! -1 ❤️`, obj.x, obj.y, 'txt-sting');

      if (this.lives <= 0) {
        this.triggerGameOver();
        return;
      }
    } else if (obj.type === 'heart') {
      // Restore life if not full
      if (this.lives < CONFIG.initialLives) {
        this.lives++;
        sounds.playHeartCatch();
        this.createFloatingText(`+1 ❤️ LIFE!`, obj.x, obj.y, 'txt-heart');
      } else {
        // Bonus points if full health
        this.score += 2;
        sounds.playCatch(1);
        this.createFloatingText(`+2 BONUS!`, obj.x, obj.y, 'txt-heart');
      }
    }

    this.updateHUD();
    this.updateSkyShift();

    // Check Win Condition
    if (!this.isEndless && this.score >= CONFIG.winScore) {
      this.triggerWin();
    }
  }

  handleItemGroundHit(obj) {
    if (obj.type === 'honeyJar' || obj.type === 'goldenJar') {
      // Missing a honey jar lets opponent grab honey and costs a life (3 misses = game over)
      this.lives = Math.max(0, this.lives - 1);
      this.resetCombo();
      this.triggerScreenShake();
      sounds.playMiss();
      this.createHoneySplat(obj.x);
      this.tauntOpponent();

      if (this.lives <= 0) {
        this.triggerGameOver();
        return;
      }
      this.updateHUD();
    }
    // Bees hitting ground safely buzz away without damage!
  }

  resetCombo() {
    this.combo = 0;
    this.updateComboHUD();
  }

  /* ====================================================================
     12. VISUAL POLISH, PARTICLES, POPUPS & SKY SHIFT
     ==================================================================== */
  createFloatingText(text, x, y, styleClass) {
    const el = document.createElement('div');
    el.className = `floating-text ${styleClass}`;
    el.textContent = text;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    this.dom.fxLayer.appendChild(el);

    setTimeout(() => el.remove(), 850);
  }

  createHoneySplat(x) {
    const splat = document.createElement('div');
    splat.className = 'honey-splat';
    splat.style.left = `${x}px`;
    this.dom.arena.appendChild(splat);
    setTimeout(() => splat.remove(), 1200);
  }

  triggerPlayerSquash() {
    this.dom.playerEntity.classList.remove('squash-stretch');
    void this.dom.playerEntity.offsetWidth; // reflow
    this.dom.playerEntity.classList.add('squash-stretch');
  }

  triggerStumble() {
    this.dom.playerEntity.classList.remove('stumbled');
    void this.dom.playerEntity.offsetWidth;
    this.dom.playerEntity.classList.add('stumbled');
  }

  triggerScreenShake() {
    this.dom.viewport.classList.remove('shake');
    void this.dom.viewport.offsetWidth;
    this.dom.viewport.classList.add('shake');
    setTimeout(() => this.dom.viewport.classList.remove('shake'), 450);
  }

  tauntOpponent() {
    this.dom.opponentPeeker.classList.add('taunt');
    const taunts = ['"Mine now! 🍯"', '"Snatched it! 😋"', '"Too slow! 🐾"'];
    this.dom.opponentBubble.textContent = taunts[Math.floor(Math.random() * taunts.length)];
    setTimeout(() => this.dom.opponentPeeker.classList.remove('taunt'), 1200);
  }

  // Day to Evening Sky Transition based on score progress (0 -> 50)
  updateSkyShift() {
    const progress = Math.min(1, this.score / CONFIG.winScore);

    // Morning golden: #fed7aa -> Afternoon amber: #f97316 -> Twilight navy: #1e1b4b
    let skyTop, skyBottom, sunOp, moonOp;

    if (progress < 0.5) {
      // Morning to Golden Afternoon
      skyTop = '#fed7aa';
      skyBottom = '#fef3c7';
      sunOp = 1;
      moonOp = 0;
    } else if (progress < 0.85) {
      // Golden to Sunset Amber
      skyTop = '#fb923c';
      skyBottom = '#fed7aa';
      sunOp = 0.8;
      moonOp = 0.2;
    } else {
      // Twilight / Evening with Moon
      skyTop = '#312e81';
      skyBottom = '#f43f5e';
      sunOp = 0;
      moonOp = 1;
    }

    document.documentElement.style.setProperty('--sky-top', skyTop);
    document.documentElement.style.setProperty('--sky-bottom', skyBottom);
    document.documentElement.style.setProperty('--sun-opacity', sunOp);
    document.documentElement.style.setProperty('--moon-opacity', moonOp);
  }

  /* ====================================================================
     13. HUD & STATS SYNCHRONIZATION
     ==================================================================== */
  updateHUD() {
    this.dom.hudScoreVal.textContent = this.score;

    // Heart slots
    this.dom.heartSlots.forEach((slot, idx) => {
      if (idx < this.lives) {
        slot.classList.remove('lost');
      } else {
        slot.classList.add('lost');
      }
    });

    this.updateComboHUD();
    this.updateGlobalStatsDisplay();
  }

  updateComboHUD() {
    if (this.combo >= 2) {
      this.dom.hudComboBadge.classList.remove('hidden');
      this.dom.hudComboMult.textContent = `x${this.combo}`;
    } else {
      this.dom.hudComboBadge.classList.add('hidden');
    }
  }

  updateTargetScoreHUD() {
    this.dom.hudTargetVal.textContent = this.isEndless ? '(ENDLESS)' : `/ ${CONFIG.winScore}`;
  }

  updateGlobalStatsDisplay() {
    this.dom.topCoinsVal.textContent = this.coins;
    this.dom.topBestVal.textContent = this.highScore;
  }

  /* ====================================================================
     14. WIN & GAME OVER SCREENS
     ==================================================================== */
  triggerGameOver() {
    this.isPlaying = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Save high score
    let isNewRecord = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      StorageManager.set('highScore', this.highScore);
      isNewRecord = true;
    }
    StorageManager.set('coins', this.coins);

    this.dom.goScore.textContent = this.score;
    this.dom.goCoins.textContent = `+${this.coinsEarnedThisRun}`;
    this.dom.goCombo.textContent = `x${Math.max(1, this.maxCombo)}`;
    this.dom.goRecordBanner.classList.toggle('hidden', !isNewRecord);

    this.dom.goFlavor.textContent = this.selectedChar === 'pig'
      ? 'The sneaky bear ran off with the sweet honey combs!'
      : 'The watchful pig caught you in the act!';

    this.dom.screenGameOver.classList.remove('hidden');
  }

  triggerWin() {
    this.isPlaying = false;
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

    // Award bonus coins for completing round!
    this.coins += CONFIG.winBonusCoins;
    this.coinsEarnedThisRun += CONFIG.winBonusCoins;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      StorageManager.set('highScore', this.highScore);
    }
    StorageManager.set('coins', this.coins);

    // Populate Win screen
    this.dom.winHeadline.textContent = this.selectedChar === 'pig'
      ? 'Sweet Hive Protected! 🐷'
      : 'Grand Honey Heist Master! 🐻';

    this.dom.winFlavor.textContent = this.selectedChar === 'pig'
      ? `You defended the hive with ${this.score} honey collected!`
      : `You secured the glorious stash with ${this.score} jars stolen!`;

    this.dom.winCharPreview.innerHTML = SVGFactory.createCharacterSVG(
      this.selectedChar,
      this.outfits,
      80
    );

    this.dom.winScore.textContent = this.score;
    this.dom.winCoinsTotal.textContent = `+${this.coinsEarnedThisRun}`;
    this.dom.winBestCombo.textContent = `x${Math.max(1, this.maxCombo)}`;

    sounds.playWin();
    this.dom.screenWin.classList.remove('hidden');
    this.confetti.start();
    this.updateGlobalStatsDisplay();
  }
}

// Instantiate and launch game when DOM is loaded
window.addEventListener('DOMContentLoaded', () => {
  window.honeyGame = new HoneyHeistGame();
});
