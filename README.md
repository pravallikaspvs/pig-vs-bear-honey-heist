# 🍯 Pig vs Bear: Honey Heist

A charming, fast-paced arcade web game where **Pig protects the hives** and **Bear executes a daring honey heist**! Built entirely from scratch using pure **Vanilla JavaScript, HTML5, CSS3, and procedural inline SVGs**—no external images or third-party libraries needed.

Playable on both **Desktop** and **Mobile** browsers.

---

## 🎮 Game Concept & Features

- **The Showdown**: Choose your hero on the title screen—play as **Pig Guard** (defending the honeycombs) or **Bear Bandit** (stealing the sweet stash)!
- **Full Body Characters with Honey Backpack**:
  - Full-body procedural SVGs for Pig and Bear with cute ears, paws/hooves, tails, and expressions.
  - A stitched leather **honey-catching backpack** strapped to the character's back with an open mouth to catch falling honey bottles directly into the sack.
- **Dynamic Falling Items**:
  - 🍯 **Apothecary Honey Bottle**: +1 Point & +1 Coin. Viscous golden honey with cork stopper and honeycomb crest.
  - ✨ **Royal Golden Honey Bottle**: +5 Points & +5 Coins. Crown stopper with ruby jewel, radiant golden aura, and liquid gold swirl.
  - 🐝 **Angry Bees**: -1 Heart life! Resets current combo multiplier.
  - ❤️ **Sweet Hearts**: Restores 1 lost life (up to 3 max lives).
- **Rival Interference & Escape System**:
  - While you collect honey, the opposing rival animal periodically charges across the ground to stop you!
  - **Advance Warning**: A flashing warning banner (`⚠️ RIVAL CHARGING! DODGE!`) and audio alert gives you advance notice.
  - **Dodge & Escape**: Move out of their rush path to earn **`DODGED! 💨 +2 🪙`** bonus coins!
  - **Tackled**: If caught, you get tackled, lose 1 life, and drop your combo.
- **Combo Multiplier**: Catching honey bottles in a row builds an exciting multiplier (`x2`, `x3`, `x4`...) with higher-pitched chimes.
- **Day-to-Evening Sky Shift**: As your score rises from 0 to 50, the environment smoothly transitions from golden morning sunlight to warm amber afternoon to a starry evening with a glowing moon.
- **👗 Dress-Up Wardrobe & Shop**:
  - **Hats**: Royal Crown, Chef Toque, Cowboy Hat, Party Cone.
  - **Glasses**: Cool Sunglasses, Round Gold Spectacles.
  - **Outfits**: Hero Cape, Dapper Bow Tie, Cozy Scarf, Comfy Hoodie.
  - **Colors**: 4 color palettes for Pig (Bubble Pink, Lavender, Peach, Mint) and 4 for Bear (Honey Brown, Grizzly, Polar White, Charcoal).
  - Unlock special items using coins earned during gameplay.
  - All unlocks and high scores are saved safely in `localStorage`.
- **Procedural Web Audio API**: Crisp chimes, sparkle arpeggios, buzzing stings, tackle impacts, and victory fanfares synthesized in real-time. Includes mute toggle.

---

## 🕹️ Controls

| Platform | Controls |
| :--- | :--- |
| **Desktop** | `Left` / `Right` Arrow keys or `A` / `D` keys. You can also click and drag the mouse across the arena. |
| **Mobile / Touch** | Tap on-screen `◀` / `▶` buttons or drag your finger anywhere on the playfield. |

---

## 🚀 How to Run Locally

### Option 1: Double-Click Standalone File
Simply double-click `honey_heist_single.html` in your file manager to open and play directly in any web browser without needing any server.

### Option 2: Run with Local HTTP Server
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx serve .
```
Then navigate to:
```
http://localhost:8000/index.html
```

---

## ⚙️ How to Adjust Settings

All core gameplay settings (speeds, starting lives, win goals, drop rates, and rival frequency) are located in the `CONFIG` object at the top of `script.js`:

```javascript
const CONFIG = {
  initialLives: 3,                // Starting hearts
  winScore: 50,                   // Honey score required to win the round
  winBonusCoins: 25,              // Bonus coins awarded upon victory
  playerMoveSpeed: 7.5,           // Movement speed
  initialFallSpeed: 3.2,          // Starting bottle drop speed
  speedIncreasePer10Pts: 0.42,    // Speed boost per 10 points
  maxFallSpeed: 8.5,              // Maximum drop speed cap
  // ... and customizable drop chances & rival charge settings
};
```

---

## 📂 Project Structure

```
game/
├── index.html               # Main game HTML with viewport, HUD & modal overlays
├── style.css                # Polished theme, glassmorphism & responsive animations
├── script.js                # Core game loop, SVG generators, audio engine & physics
├── honey_heist_single.html  # Self-contained bundle (single-file playable game)
└── README.md                # Documentation & instructions
```

---

## 📜 License
MIT License. Created with love! 🍯🐻🐷
