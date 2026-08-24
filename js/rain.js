class AtmosphereEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    // Hardware accelerated opaque context to bypass DWM alpha blending
    this.ctx = this.canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.width = 0;
    this.height = 0;

    // Modes: 'rain' | 'fire' | 'stars' | 'none'
    this.currentMode = localStorage.getItem('fliqlo_ambience_mode') || 'rain';

    // Resolution Downsampling (0.65x for high fill-rate performance & zero visual drop on ambient effects)
    this.renderScale = 0.65;

    // 1. Rain & Lightning State
    this.rainStreaks = [];
    this.maxStreaks = 65; // Optimized streak count
    this.lightningFlash = 0;
    this.lightningBolts = [];
    this.nextLightningTime = performance.now() + Math.random() * 3500 + 2000;

    // 2. Fireplace & Ember State
    this.fireEmbers = [];
    this.maxEmbers = 35; // Optimized ember count
    this.cachedFireBottomGrad = null;
    this.cachedBaseBgGrad = null;

    // 3. Cosmic Stars State
    this.stars = [];
    this.maxStars = 45;
    this.shootingStars = [];
    this.nextShootingStar = performance.now() + 4000;

    this.animId = null;
    this.isActive = this.currentMode !== 'none';
    this.lastFrameTime = 0;
    this.targetFpsInterval = 1000 / 24; // 24 FPS cinematic ambient cap (reduces GPU & DWM swapchain load)

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
      } else if (this.isActive && this.currentMode !== 'none' && !this.animId) {
        this.lastFrameTime = performance.now();
        this.render(this.lastFrameTime);
      }
    });

    if (this.currentMode !== 'none') {
      this.initParticles();
      this.lastFrameTime = performance.now();
      this.render(this.lastFrameTime);
    } else if (this.ctx) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.width = this.canvas.width = Math.max(100, Math.floor(w * this.renderScale));
    this.height = this.canvas.height = Math.max(100, Math.floor(h * this.renderScale));

    this.cacheGradients();
    if (this.currentMode !== 'none') {
      this.initParticles();
    } else if (this.ctx) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  cacheGradients() {
    if (!this.ctx || this.width === 0 || this.height === 0) return;
    try {
      // Base background gradient for opaque rendering (bypasses DWM alpha blending overhead)
      this.cachedBaseBgGrad = this.ctx.createRadialGradient(
        this.width / 2, this.height * 0.4, 0,
        this.width / 2, this.height * 0.5, Math.max(this.width, this.height) * 0.75
      );
      this.cachedBaseBgGrad.addColorStop(0, '#0d0f14');
      this.cachedBaseBgGrad.addColorStop(0.7, '#040507');
      this.cachedBaseBgGrad.addColorStop(1, '#000000');

      // Fireplace ambient bottom gradient
      this.cachedFireBottomGrad = this.ctx.createRadialGradient(
        this.width / 2, this.height + 40, 20,
        this.width / 2, this.height, this.height * 0.75
      );
      this.cachedFireBottomGrad.addColorStop(0, 'rgba(249, 115, 22, 0.35)');
      this.cachedFireBottomGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.12)');
      this.cachedFireBottomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    } catch (e) {
      console.warn('Gradient caching failed', e);
    }
  }

  initParticles() {
    if (this.currentMode === 'rain') {
      this.initRainStreaks();
    } else if (this.currentMode === 'fire') {
      this.initFireEmbers();
    } else if (this.currentMode === 'stars') {
      this.initStars();
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    localStorage.setItem('fliqlo_ambience_mode', mode);

    if (mode === 'none') {
      this.stop();
      if (this.ctx) {
        this.ctx.fillStyle = '#000000';
        this.ctx.fillRect(0, 0, this.width, this.height);
      }
    } else {
      this.initParticles();
      this.start();
    }
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
      x: Math.random() * (this.width + 100) - 50,
      y: randomY ? Math.random() * this.height : -30 - Math.random() * 60,
      length: 14 + depth * 28,
      speed: 4.5 + depth * 8,
      thickness: 0.7 + depth * 1.1,
      alpha: 0.12 + depth * 0.25,
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
      const stepY = 10 + Math.random() * 18;
      const stepX = (Math.random() - 0.5) * 30;
      currentX += stepX;
      currentY += stepY;
      segments.push({ x: currentX, y: currentY });

      if (Math.random() < 0.2 && segments.length > 3) {
        const branchLen = 2 + Math.floor(Math.random() * 2);
        let bX = currentX;
        let bY = currentY;
        const branchSegs = [{ x: bX, y: bY }];
        for (let b = 0; b < branchLen; b++) {
          bX += (Math.random() - 0.5) * 35;
          bY += 8 + Math.random() * 14;
          branchSegs.push({ x: bX, y: bY });
        }
        segments.push({ branch: branchSegs });
      }
    }
    return segments;
  }

  triggerLightning() {
    const rand = Math.random();
    const boltCount = rand > 0.85 ? 2 : 1;
    this.lightningBolts = [];
    for (let i = 0; i < boltCount; i++) {
      this.lightningBolts.push(this.createLightningBolt());
    }
    this.lightningFlash = 1.0;

    setTimeout(() => { this.lightningFlash = 0.25; }, 45);
    setTimeout(() => { this.lightningFlash = 0.95; }, 90);
    setTimeout(() => { this.lightningFlash = 0.5; }, 150);

    this.nextLightningTime = performance.now() + 3000 + Math.random() * 4500;
  }

  drawLightning(ctx) {
    if (this.lightningFlash <= 0.01) return;

    ctx.save();
    ctx.fillStyle = `rgba(180, 215, 255, ${this.lightningFlash * 0.18})`;
    ctx.fillRect(0, 0, this.width, this.height);

    for (let b = 0; b < this.lightningBolts.length; b++) {
      const segments = this.lightningBolts[b];
      if (!segments || segments.length === 0) continue;

      ctx.lineWidth = 3.5;
      ctx.strokeStyle = `rgba(147, 197, 253, ${this.lightningFlash * 0.4})`;
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

      ctx.lineWidth = 1.5;
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.9})`;
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
     2. FIREPLACE & EMBERS METHODS (Zero shadowBlur - 2-Pass Glow)
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
      y: randomY ? this.height - Math.random() * (this.height * 0.75) : this.height + 8,
      size: 1.2 + Math.random() * 2.5,
      speedY: 1.0 + Math.random() * 2.0,
      swayFreq: 0.02 + Math.random() * 0.03,
      swayAmp: 1.2 + Math.random() * 1.8,
      alpha: 0.4 + Math.random() * 0.6,
      decay: 0.003 + Math.random() * 0.006,
      hue: 20 + Math.random() * 30 // Orange to Gold
    };
  }

  drawFire(ctx, timestamp) {
    // 1. Warm bottom ambient glow using pre-cached gradient
    if (this.cachedFireBottomGrad) {
      const flicker = 0.85 + Math.sin(timestamp * 0.004) * 0.15;
      ctx.save();
      ctx.globalAlpha = flicker;
      ctx.fillStyle = this.cachedFireBottomGrad;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    // 2. Rising embers with fast 2-pass glow (0 GPU blur cost!)
    for (let i = 0; i < this.fireEmbers.length; i++) {
      const e = this.fireEmbers[i];
      e.y -= e.speedY;
      e.x += Math.sin(timestamp * e.swayFreq) * e.swayAmp;
      e.alpha -= e.decay;

      if (e.y < -15 || e.alpha <= 0) {
        this.fireEmbers[i] = this.createFireEmber(false);
        continue;
      }

      // Pass 1: Soft Outer Halo
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size * 2.2, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue}, 95%, 55%, ${e.alpha * 0.25})`;
      ctx.fill();

      // Pass 2: Bright Inner Core
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${e.hue}, 100%, 75%, ${e.alpha})`;
      ctx.fill();
    }
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
        size: 0.7 + Math.random() * 1.8,
        baseAlpha: 0.2 + Math.random() * 0.6,
        twinkleSpeed: 0.002 + Math.random() * 0.004,
        twinkleOffset: Math.random() * Math.PI * 2
      });
    }
  }

  drawStars(ctx, timestamp) {
    // 1. Soft cosmic background
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
        length: 60 + Math.random() * 45,
        speed: 10 + Math.random() * 6,
        alpha: 0.9,
        angle: Math.PI / 4 + (Math.random() - 0.5) * 0.2
      });
      this.nextShootingStar = timestamp + 5000 + Math.random() * 7000;
    }

    for (let i = this.shootingStars.length - 1; i >= 0; i--) {
      const ss = this.shootingStars[i];
      ss.x += Math.cos(ss.angle) * ss.speed;
      ss.y += Math.sin(ss.angle) * ss.speed;
      ss.alpha -= 0.03;

      if (ss.alpha <= 0) {
        this.shootingStars.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${ss.alpha})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(ss.x, ss.y);
      ctx.lineTo(ss.x - Math.cos(ss.angle) * ss.length, ss.y - Math.sin(ss.angle) * ss.length);
      ctx.stroke();
      ctx.restore();
    }
  }

  /* ============================================================
     RENDER LOOP (24 FPS Throttled & Opaque Blit)
     ============================================================ */
  render(timestamp) {
    if (!this.isActive || this.currentMode === 'none') {
      return;
    }

    this.animId = requestAnimationFrame((t) => this.render(t));

    const elapsed = timestamp - this.lastFrameTime;
    if (elapsed < this.targetFpsInterval) {
      return;
    }
    this.lastFrameTime = timestamp - (elapsed % this.targetFpsInterval);

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    // Fast Opaque background fill (eliminates DWM alpha blending overhead)
    ctx.fillStyle = this.cachedBaseBgGrad || '#050608';
    ctx.fillRect(0, 0, w, h);

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

        if (s.y > h + 30 || s.x < -100) {
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
    if (this.currentMode === 'none') return;
    this.isActive = true;
    if (!this.animId) {
      this.lastFrameTime = performance.now();
      this.render(this.lastFrameTime);
    }
  }

  stop() {
    this.isActive = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
      this.animId = null;
    }
    if (this.ctx) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }
}

// Global Aliases
window.AtmosphereEngine = AtmosphereEngine;
window.RainGlassEngine = AtmosphereEngine;
