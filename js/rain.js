class AtmosphereEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.width = 0;
    this.height = 0;

    // Modes: 'rain' | 'fire' | 'stars' | 'none'
    this.currentMode = localStorage.getItem('fliqlo_ambience_mode') || 'rain';

    // 1. Rain & Lightning State
    this.rainStreaks = [];
    this.maxStreaks = 140;
    this.lightningFlash = 0;
    this.lightningBolts = [];
    this.nextLightningTime = performance.now() + Math.random() * 3500 + 2000;

    // 2. Fireplace & Ember State
    this.fireEmbers = [];
    this.maxEmbers = 70;
    this.fireGlowIntensity = 0.5;

    // 3. Cosmic Stars State
    this.stars = [];
    this.maxStars = 100;
    this.shootingStars = [];
    this.nextShootingStar = performance.now() + 4000;

    this.animId = null;
    this.isActive = true;
    this.lastFrameTime = 0;
    this.targetFpsInterval = 1000 / 35; // 35 FPS capped for performance

    this.init();
  }

  init() {
    this.resize();
    window.addEventListener('resize', () => this.resize(), { passive: true });

    // Auto-pause when tab is inactive
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (this.animId) cancelAnimationFrame(this.animId);
        this.animId = null;
      } else if (this.isActive && !this.animId) {
        this.lastFrameTime = performance.now();
        this.render(this.lastFrameTime);
      }
    });

    this.initParticles();
    this.lastFrameTime = performance.now();
    this.render(this.lastFrameTime);
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
    this.initParticles();
  }

  initParticles() {
    this.initRainStreaks();
    this.initFireEmbers();
    this.initStars();
  }

  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('fliqlo_ambience_mode', mode);
    this.initParticles();
    if (this.ctx) this.ctx.clearRect(0, 0, this.width, this.height);
  }

  cycleMode() {
    const modes = ['rain', 'fire', 'stars', 'none'];
    const nextIdx = (modes.indexOf(this.currentMode) + 1) % modes.length;
    this.setMode(modes[nextIdx]);
    return this.currentMode;
  }

  /* ============================================================
     1. RAIN & LIGHTNING METHODS
     ============================================================ */
  initRainStreaks() {
    this.rainStreaks = [];
    for (let i = 0; i < this.maxStreaks; i++) {
      this.rainStreaks.push(this.createRainStreak(true));
    }
  }

  createRainStreak(randomY = false) {
    const depth = Math.random();
    return {
      x: Math.random() * (this.width + 200) - 100,
      y: randomY ? Math.random() * this.height : -40 - Math.random() * 100,
      length: 18 + depth * 38,
      speed: 6.5 + depth * 10,
      thickness: 0.8 + depth * 1.4,
      alpha: 0.12 + depth * 0.28,
      slant: -0.22 - Math.random() * 0.15
    };
  }

  createLightningBolt() {
    const startX = Math.random() * (this.width * 0.8) + (this.width * 0.1);
    const startY = 0;
    const endY = this.height * (0.45 + Math.random() * 0.4);
    
    let currentX = startX;
    let currentY = startY;
    const segments = [{ x: currentX, y: currentY }];

    while (currentY < endY) {
      const stepY = 12 + Math.random() * 22;
      const stepX = (Math.random() - 0.5) * 38;
      currentX += stepX;
      currentY += stepY;
      segments.push({ x: currentX, y: currentY });

      if (Math.random() < 0.25 && segments.length > 3) {
        const branchLen = 2 + Math.floor(Math.random() * 3);
        let bX = currentX;
        let bY = currentY;
        const branchSegs = [{ x: bX, y: bY }];
        for (let b = 0; b < branchLen; b++) {
          bX += (Math.random() - 0.5) * 45;
          bY += 10 + Math.random() * 16;
          branchSegs.push({ x: bX, y: bY });
        }
        segments.push({ branch: branchSegs });
      }
    }
    return segments;
  }

  triggerLightning() {
    const rand = Math.random();
    const boltCount = rand > 0.82 ? 3 : (rand > 0.45 ? 2 : 1);
    this.lightningBolts = [];
    for (let i = 0; i < boltCount; i++) {
      this.lightningBolts.push(this.createLightningBolt());
    }
    this.lightningFlash = 1.0;

    setTimeout(() => { this.lightningFlash = 0.25; }, 45);
    setTimeout(() => { this.lightningFlash = 0.95; }, 90);
    setTimeout(() => { this.lightningFlash = 0.5; }, 150);

    this.nextLightningTime = performance.now() + 2500 + Math.random() * 4000;
  }

  drawLightning(ctx) {
    if (this.lightningFlash <= 0.01) return;

    ctx.save();
    ctx.fillStyle = `rgba(180, 215, 255, ${this.lightningFlash * 0.22})`;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let b = 0; b < this.lightningBolts.length; b++) {
      const segments = this.lightningBolts[b];
      if (!segments || segments.length === 0) continue;

      ctx.lineWidth = 4.5;
      ctx.strokeStyle = `rgba(147, 197, 253, ${this.lightningFlash * 0.45})`;
      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segments.length; i++) {
        const pt = segments[i];
        if (pt.branch) {
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(pt.branch[0].x, pt.branch[0].y);
          for (let k = 1; k < pt.branch.length; k++) {
            ctx.lineTo(pt.branch[k].x, pt.branch[k].y);
          }
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(segments[i-1].x, segments[i-1].y);
        } else {
          ctx.lineTo(pt.x, pt.y);
        }
      }
      ctx.stroke();

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.95})`;
      ctx.beginPath();
      ctx.moveTo(segments[0].x, segments[0].y);
      for (let i = 1; i < segments.length; i++) {
        const pt = segments[i];
        if (!pt.branch) ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }
    ctx.restore();

    this.lightningFlash *= 0.86;
    if (this.lightningFlash < 0.02) {
      this.lightningFlash = 0;
      this.lightningBolts = [];
    }
  }

  /* ============================================================
     2. FIREPLACE & EMBERS METHODS
     ============================================================ */
  initFireEmbers() {
    this.fireEmbers = [];
    for (let i = 0; i < this.maxEmbers; i++) {
      this.fireEmbers.push(this.createFireEmber(true));
    }
  }

  createFireEmber(randomY = false) {
    return {
      x: this.width * 0.15 + Math.random() * (this.width * 0.7),
      y: randomY ? this.height - Math.random() * (this.height * 0.75) : this.height + 10,
      size: 1.5 + Math.random() * 3.2,
      speedY: 1.2 + Math.random() * 2.8,
      swayFreq: 0.02 + Math.random() * 0.03,
      swayAmp: 1.5 + Math.random() * 2.5,
      alpha: 0.4 + Math.random() * 0.6,
      decay: 0.003 + Math.random() * 0.006,
      hue: 20 + Math.random() * 30 // Orange to Gold
    };
  }

  drawFire(ctx, timestamp) {
    // 1. Warm bottom ambient glow
    const flicker = 0.18 + Math.sin(timestamp * 0.004) * 0.05 + Math.cos(timestamp * 0.007) * 0.04;
    const grad = ctx.createRadialGradient(
      this.width / 2, this.height + 80, 50,
      this.width / 2, this.height, this.height * 0.7
    );
    grad.addColorStop(0, `rgba(249, 115, 22, ${flicker * 0.45})`);
    grad.addColorStop(0.5, `rgba(234, 88, 12, ${flicker * 0.2})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Rising glowing embers
    for (let i = 0; i < this.fireEmbers.length; i++) {
      const e = this.fireEmbers[i];
      e.y -= e.speedY;
      e.x += Math.sin(timestamp * e.swayFreq) * e.swayAmp;
      e.alpha -= e.decay;

      if (e.y < -20 || e.alpha <= 0) {
        this.fireEmbers[i] = this.createFireEmber(false);
        continue;
      }

      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue}, 95%, 60%, ${e.alpha})`;
      ctx.shadowColor = `hsl(${e.hue}, 100%, 50%)`;
      ctx.shadowBlur = 8;
      ctx.fill();
    }
    ctx.shadowBlur = 0;
  }

  /* ============================================================
     3. COSMIC STARS & STARFIELD METHODS
     ============================================================ */
  initStars() {
    this.stars = [];
    for (let i = 0; i < this.maxStars; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        size: 0.8 + Math.random() * 2.2,
        baseAlpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  drawStars(ctx, timestamp) {
    // 1. Soft cosmic background gradient
    ctx.fillStyle = 'rgba(10, 14, 26, 0.4)';
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Twinkling Stars
    for (let i = 0; i < this.stars.length; i++) {
      const s = this.stars[i];
      const alpha = s.baseAlpha + Math.sin(timestamp * s.twinkleSpeed + s.twinkleOffset) * 0.35;
      const clampedAlpha = Math.max(0.08, Math.min(1, alpha));

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(224, 242, 254, ${clampedAlpha})`;
      ctx.fill();
    }

    // 3. Occasional Shooting Star
    if (timestamp >= this.nextShootingStar) {
      this.shootingStars.push({
        x: Math.random() * this.width * 0.8,
        y: Math.random() * (this.height * 0.4),
        length: 80 + Math.random() * 60,
        speed: 12 + Math.random() * 8,
        alpha: 0.9,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2
      });
      this.nextShootingStar = timestamp + 5000 + Math.random() * 7000;
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.alpha -= 0.025;

      if (ss.alpha <= 0) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${ss.alpha})`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - Math.cos(ss.angle) * ss.length, ss.y - Math.sin(ss.angle) * ss.length);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ============================================================
     RENDER LOOP
     ============================================================ */
  render(timestamp) {
    if (!this.isActive) return;

    this.animId = requestAnimationFrame((t) => this.render(t));

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.targetFpsInterval) {
      return;
    }
    this.lastFrameTime = timestamp - (elapsed % this.targetFpsInterval);

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    if (this.currentMode === 'rain') {
      if (timestamp >= this.nextLightningTime) {
        this.triggerLightning();
      }
      this.drawLightning(ctx);

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(215, 235, 255, 0.28)';
      for (let i = 0; i < this.rainStreaks.length; i++) {
        const s = this.rainStreaks[i];
        s.y += s.speed;
        s.x += s.slant * s.speed;

        if (s.y > h + 40 || s.x < -150) {
          this.rainStreaks[i] = this.createRainStreak(false);
        }

        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + s.slant * s.length, s.y + s.length);
      }
      ctx.stroke();
    } else if (this.currentMode === 'fire') {
      this.drawFire(ctx, timestamp);
    } else if (this.currentMode === 'stars') {
      this.drawStars(ctx, timestamp);
    }
  }

  start() {
    if (this.isActive) return;
    this.isActive = true;
    this.lastFrameTime = performance.now();
    this.render(this.lastFrameTime);
  }

  stop() {
    this.isActive = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx) {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }
  }
}

// Global Aliases
window.AtmosphereEngine = AtmosphereEngine;
window.RainGlassEngine = AtmosphereEngine;
