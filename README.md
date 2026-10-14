# 🏎️ ROAD DASH: OVERDRIVE

> **High-Octane 2.5D Highway Arcade Racer**  
> Pure Web Audio Synthesis • Dynamic Pseudo-3D Engine • 5-Stage Campaign • Custom Garage Upgrades

![Road Dash Arcade](https://img.shields.io/badge/FPS-60%2B-00f3ff?style=for-the-badge&logo=html5)
![Zero Dependencies](https://img.shields.io/badge/Dependencies-Zero-ff007f?style=for-the-badge)
![GitHub Pages Ready](https://img.shields.io/badge/Hosted_on-GitHub_Pages-10b981?style=for-the-badge&logo=github)

---

## 🌟 Game Highlights

- **Dynamic 2.5D Pseudo-3D Engine**: Pure HTML5 canvas projection featuring rolling hills, sweeping curves, elevation crests, parallax horizon backdrops, and day/sunset/night/storm lighting.
- **Deep Level Design & Campaign**: 5 handcrafted stages with 3-Star objectives, environmental hazards, dynamic weather, and escalating traffic difficulty:
  1. *Stage 1: Pacific Coast Highway* — Sunny ocean dunes, wide curves, leisure cruisers.
  2. *Stage 2: Neon Metropolis* — Tokyo midnight cyber expressway, wet asphalt reflections, high-speed taxis.
  3. *Stage 3: Canyon Outlaw Pass* — Desert red rock ravines, hairpins, rolling elevations, rockfalls.
  4. *Stage 4: Thunder Mountain Summit* — Torrential lightning storm, ice slicks, drafting survival.
  5. *Stage 5: Police Pursuit Grand Escape* — Metropolitan heist getaway with aggressive police interceptors.
- **Endless Highway Mode**: Infinite road seamlessly cycling through all biomes and times of day with high score tracking.
- **High-Adrenaline Mechanics**:
  - **Near-Miss Combo System**: Weave inches from traffic to trigger *"CLOSE CALL!"* multipliers and recharge Nitro.
  - **Slipstream Drafting**: Tuck directly behind traffic at high speed to harness aerodynamic drafting speed boosts.
  - **Overdrive Mode**: Chain combos to unleash invulnerable god-mode and smash through traffic!
  - **Dynamic Traffic AI**: Turn signals/blinkers prior to lane changes, varied vehicles (Sedans, 18-Wheel Semi-Trucks, Sports Cars, Ambulances, Police Interceptors).
- **The Garage & Customization**:
  - 5 Unlockable vehicle classes (*Apex Striker*, *Shinobi R-Spec*, *Goliath Titan*, *Hyperion Valkyrie*, *Cyber Phantom X*).
  - 4 Upgradeable performance stats (Top Speed, Acceleration, Handling, Armor Hull).
  - 8 High-gloss body paint colors & 6 Neon Underglow lighting options.
  - Real-time 360° spinning vehicle preview turntable.
- **Pure Web Audio Synthesizer**: Zero external audio files or lag! Procedurally synthesized multi-oscillator engine roar, tire squeals, turbo blow-off hisses, crash impacts, near-miss Doppler whooshes, and an authentic 80s arcade synthwave music soundtrack.

---

## 🎮 Controls

| Action | Keyboard | Touch / Mobile |
| :--- | :--- | :--- |
| **Steer Left / Right** | `A` / `D` or `◀` / `▶` | Left / Right Touch Buttons |
| **Nitro Boost** | `SPACE` or `SHIFT` | `⚡` Nitro Button |
| **Brake / Drift** | `S` or `▼` | `🛑` Brake Button |
| **Pause Game** | `P` or `ESC` | `⏸` Pause Icon |
| **Quick Restart** | `R` | Restart Button |

---

## 🚀 Local Quickstart

Run a quick local HTTP server:

```bash
# Python 3
python3 -m http.server 8080

# Or Node.js
npx serve .
```

Open `http://localhost:8080` in any modern web browser.

---

## 🌐 Hosting on GitHub Pages

This repository includes a ready-to-use GitHub Actions workflow (`.github/workflows/deploy.yml`) and `.nojekyll`:

1. Push this project to your GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Road Dash Overdrive"
   git remote add origin https://github.com/gnany07/road-dash.git
   git branch -M main
   git push -u origin main
   ```
2. In your GitHub repository:
   - Go to **Settings** > **Pages**.
   - Under **Build and deployment** > **Source**, choose **GitHub Actions** (or deploy directly from the **main** branch root).
3. Your game will be live at:
   `https://gnany07.github.io/road-dash/`

---

## 🛠️ Architecture & Source Structure

```text
road-dash/
├── index.html                  # Responsive HTML5 shell with glassmorphism HUD & modals
├── style.css                   # Cyberpunk / OutRun arcade styling & animations
├── .nojekyll                   # Prevents Jekyll asset filtering on GitHub Pages
├── .github/
│   └── workflows/
│       └── deploy.yml          # Automated GitHub Pages CI/CD workflow
└── js/
    ├── audio.js                # Web Audio API engine & procedural synthwave music
    ├── road.js                 # 2.5D pseudo-3D road math, hills, curves & props
    ├── player.js               # Vehicle physics, drifting, nitro, health & rendering
    ├── traffic.js              # Multi-lane AI traffic, blinkers, police pursuit & collision
    ├── particles.js            # Nitro flames, speed lines, sparks, rain & combo text
    ├── levels.js               # 5 handcrafted campaign stages with 3-star objectives
    ├── garage.js               # Car stats, upgrades, paint customization & economy
    ├── ui.js                   # HUD meters, analog speedometer, modals & touch inputs
    └── game.js                 # 60 FPS requestAnimationFrame loop & orchestrator
```

---

*Engineered with precision for pure arcade speed and retro-futuristic style.*
