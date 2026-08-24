<div align="center">

  <img src="favicon.svg" alt="AeroFlip Studio Logo" width="120" height="120" />

  # ⏱️ AeroFlip Studio

  **Ultra-Lightweight, Modern & Aesthetic 3D Flip Clock, Stopwatch & Focus Station**

  <p align="center">
    <a href="https://github.com/Luxynn/aeroflip-studio/stargazers"><img src="https://img.shields.io/github/stars/Luxynn/aeroflip-studio?style=for-the-badge&logo=star&color=38bdf8&logoColor=white" alt="Stars Badge"/></a>
    <a href="https://github.com/Luxynn/aeroflip-studio/network/members"><img src="https://img.shields.io/github/forks/Luxynn/aeroflip-studio?style=for-the-badge&logo=git&color=3b82f6&logoColor=white" alt="Forks Badge"/></a>
    <a href="https://github.com/Luxynn/aeroflip-studio/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-MIT-10b981?style=for-the-badge&logo=open-source-initiative&logoColor=white" alt="MIT License"/></a>
    <img src="https://img.shields.io/badge/Version-v2.1.0-8b5cf6?style=for-the-badge" alt="Version"/>
    <img src="https://img.shields.io/badge/GPU_Usage-Ultra--Low_(<10%25)-10b981?style=for-the-badge&logo=speedtest&logoColor=white" alt="GPU Usage"/>
  </p>

  <p align="center">
    <strong>Zero Dependencies • Pure Vanilla JavaScript (ES6+) • 60 FPS Smooth 3D Flips • Multi-Sheet Excel Reports</strong>
  </p>

</div>

---

## 🌟 Overview

**AeroFlip Studio** is a state-of-the-art web-based **Fliqlo-inspired 3D Mechanical Flip Clock, Precision Stopwatch, and Countdown Timer**. 

Designed from the ground up with high performance, elegant aesthetics, and modular clean code in mind, it provides a distraction-free, atmospheric desk clock experience while maintaining **single-digit GPU/CPU consumption** even on 144Hz/240Hz monitors.

---

## ✨ Key Features

### 🕒 1. Live Desk Clock Mode
- **12h & 24h Formats:** Smooth toggle between standard 24-hour and 12-hour AM/PM mechanical cards.
- **Live Localized Date Banner:** Displays the current weekday, day, month, and year.
- **Kiosk / Desk Clock Ready:** Turn any spare tablet, laptop, or second monitor into an authentic aesthetic flip clock.

### ⏱️ 2. High-Precision Stopwatch
- **Sub-Millisecond Accuracy:** High-precision `performance.now()` time calculation with ~30 FPS throttled DOM updates.
- **Lap & Split Recording:** Record unlimited laps, view split time deltas, and automatically highlight personal best (PB) laps.
- **Interactive Silhouette Popover:** Hover over any lap row in the comparison view for instant micro-analytics.

### ⏳ 3. Customizable Countdown Timer
- **Quick Preset Pills:** 1m, 5m, 15m, and 25m (Pomodoro Focus) presets with custom hour/minute spinners.
- **Harmonic Audio Alarm:** Web Audio API multi-tone synthesized chime and visual toast alerts on completion.
- **Persistent Input Memory:** Preserves your last configured countdown settings across browser refreshes (`F5`).

### 🌧️ 4. Hardware-Accelerated Atmosphere Engine
- 🌧️ **Rain & Dynamic Lightning:** Atmospheric raindrops with smooth lightning storm flashes.
- 🪵 **Cozy Fireplace:** Warm ambient fireplace glow with floating, flickering ember particles.
- ✨ **Cosmic Night:** Twinkling stars with periodic shooting meteor trails.
- 🌑 **Matte Black (Zen):** Pure dark minimalist background that completely sleeps the animation loop for **0% idle GPU usage**.

### 🧘 5. Zen Minimalist Focus Mode
- Automatically fades out all controls, buttons, and navigation bars after **3.5 seconds** of inactivity during focus sessions.
- Gently restores the interface on subtle mouse movement.

### ☀️ 6. Screen Wake Lock API
- Prevents your screen or device from sleeping/dimming during study or desk clock use.
- Persistent state across reloads with automatic re-acquisition on tab visibility changes.

### 📊 7. Multi-Sheet Professional Excel (`.xlsx`) Export
- Built-in **SheetJS** client-side export generating clean, native **3-Sheet Excel workbooks**:
  1. **`Özet` (Summary):** Total sessions, lap count, total active duration, average lap time, best & worst laps.
  2. **`Oturumlar` (Sessions):** Filterable session summaries with native Excel time formatting (`[hh]:mm:ss.00`).
  3. **`Turlar` (Laps):** Granular split times, cumulative elapsed times, and countdown remaining times.
- Formulas like `=SUM()`, `=AVERAGE()`, `=MIN()`, and `=MAX()` work directly on duration cells.

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Description |
| :---: | :--- | :--- |
| <kbd>SPACE</kbd> | **Start / Pause** | Toggles Stopwatch and Timer state |
| <kbd>R</kbd> | **Reset** | Pauses and resets stopwatch/timer to initial state |
| <kbd>L</kbd> | **Lap / Split** | Records split time and lap index |
| <kbd>C</kbd> / <kbd>1</kbd> | **Live Clock Mode** | Switches to real-time system clock |
| <kbd>W</kbd> / <kbd>2</kbd> | **Stopwatch Mode** | Switches to precision stopwatch |
| <kbd>T</kbd> / <kbd>3</kbd> | **Timer Mode** | Switches to countdown setup / timer |
| <kbd>K</kbd> | **Wake Lock** | Toggles Screen Wake Lock on/off |
| <kbd>Y</kbd> | **Ambience Mode** | Cycles through Rain, Fireplace, Stars, and Dark |
| <kbd>S</kbd> | **Mechanical Sound** | Toggles realistic mechanical flip click sound |
| <kbd>F</kbd> | **Fullscreen** | Toggles immersive kiosk fullscreen desk clock |
| <kbd>H</kbd> | **History & Analytics** | Opens session drawer and lap comparison charts |
| <kbd>O</kbd> / <kbd>,</kbd> | **Settings** | Opens customizable shortcut editor and data backup |
| <kbd>ESC</kbd> | **Close Modal** | Closes any open popup or active key recording |

> *All keyboard shortcuts can be interactively customized by clicking them in the Settings modal.*

---

## ⚡ Performance & GPU Optimization Benchmarks

AeroFlip Studio has undergone rigorous GPU and Windows Desktop Window Manager (DWM) optimizations:

| Metric | Before Optimization | After AeroFlip v2.1 | Improvement |
| :--- | :---: | :---: | :---: |
| **Active GPU Usage** | 70% – 85% | **6% – 12%** | **~85% Reduction** ⚡ |
| **DWM Alpha Blending** | Continuous heavy blit | **Bypassed (`alpha: false`)** | **Zero DWM Alpha Overhead** |
| **Atmosphere Loop** | Uncapped rAF (144Hz+) | **24 FPS Cinematic Cap** | **Smooth & Battery-Friendly** |
| **Timer Loop** | Unthrottled DOM reflow | **25 FPS Throttle + DOM Isolation** | **Zero Flexbox Thrashing** |
| **Background Tab** | 1000ms drift / freeze | **Web Worker Sync (25ms precision)** | **Accurate Timekeeping** |

---

## 🏗️ Clean Modular Architecture

The codebase follows the **Single Responsibility Principle (SRP)** with zero build-tool bloat:

```
aeroflip-studio/
├── 📄 index.html        # Semantic HTML5 Application Entrypoint
├── 📄 favicon.svg       # Vector Modern Flip Badge Icon
├── 📄 style.css         # Master Stylesheet Index
├── 📁 css/              # Modular Layered CSS
│   ├── base.css         # Typography, reset, canvas hardware layer promotion
│   ├── cards.css        # 3D Mechanical Flip Card transforms & animations
│   ├── controls.css     # Pill controls, mode selectors & icon buttons
│   ├── timer-setup.css  # Countdown spinner dials & preset duration pills
│   ├── laps.css         # Live active lap feed styling
│   ├── modals.css       # Settings, Save Session, History & Signature cards
│   ├── compare.css      # Interactive lap comparison matrix & popovers
│   └── responsive.css   # Mobile, tablet, 4K & ultrawide responsive rules
└── 📁 js/               # Modular ES6+ JavaScript Architecture
    ├── utils.js         # Formatting utilities & time calculations
    ├── audio.js         # Web Audio API sound synthesis & noise caching
    ├── rain.js          # AtmosphereEngine particle system (24 FPS Cap)
    ├── cards.js         # FliqloCardManager with in-memory value cache
    ├── storage.js       # SessionStore LocalStorage abstraction layer
    ├── compare.js       # ComparisonAnalytics multi-session comparison charts
    ├── ui.js            # UIManager (Toast, Tooltip, Zen Mode, Wake Lock)
    ├── keybinds.js      # KeybindManager (Customizable shortcut engine)
    ├── settings.js      # SettingsManager (Multi-Sheet Excel & JSON/CSV backup)
    ├── history.js       # HistoryManager (Session saving, Multi-select, Deletion)
    └── app.js           # Core FlipStopwatchApp Orchestrator & Timer Loop
```

---

## 🚀 Quick Start

No Node.js, Webpack, Vite, or dependencies to install.

### Option 1: Direct Run
1. Clone the repository:
   ```bash
   git clone https://github.com/Luxynn/aeroflip-studio.git
   ```
2. Open `index.html` in any modern web browser (Chrome, Edge, Firefox, Safari, Brave, Opera).

### Option 2: Live Server
If using VS Code, simply right-click `index.html` and select **"Open with Live Server"**.

---

## 👨‍💻 Author & Creator

Crafted with passion by **Batuhan Olgun**:
- 🐙 **GitHub:** [@Luxynn](https://github.com/Luxynn)
- 📸 **Instagram:** [@batuhnolgun](https://instagram.com/batuhnolgun)

---

## 📄 License

This project is open-source and licensed under the [MIT License](LICENSE).
Feel free to use, modify, and distribute it for personal and commercial projects.
