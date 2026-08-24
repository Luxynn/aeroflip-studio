class RainGlassEngine {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.width = 0;
    this.height = 0;

    // Fast background falling rain streaks (Layered Depth)
    this.rainStreaks = [];
    this.maxStreaks = 140;

    // Lightning State & Timing
    this.lightningFlash = 0;
    this.lightningBolts = [];
    this.nextLightningTime = performance.now() + Math.random() * 3500 + 2000;

    this.animId = null;
    this.isActive = true;
    this.lastFrameTime = 0;
    this.targetFpsInterval = 1000 / 35; // 35 FPS capped

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

    this.initRainStreaks();
    this.lastFrameTime = performance.now();
    this.render(this.lastFrameTime);
  }

  resize() {
    this.width = this.canvas.width = window.innerWidth;
    this.height = this.canvas.height = window.innerHeight;
  }

  initRainStreaks() {
    this.rainStreaks = [];
    for (let i = 0; i < this.maxStreaks; i++) {
      this.rainStreaks.push(this.createRainStreak(true));
    }
  }

  createRainStreak(randomY = false) {
    const depth = Math.random(); // 0: far/faint, 1: near/bright
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

      // Occasional small fork/branch
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
    // Determine 1, 2, or 3 simultaneous lightning bolts
    const rand = Math.random();
    let boltCount = 1;
    if (rand > 0.82) {
      boltCount = 3;
    } else if (rand > 0.45) {
      boltCount = 2;
    }

    this.lightningBolts = [];
    for (let i = 0; i < boltCount; i++) {
      this.lightningBolts.push(this.createLightningBolt());
    }

    this.lightningFlash = 1.0;

    // Multi-strike realistic lightning flash sequence
    setTimeout(() => {
      this.lightningFlash = 0.25;
    }, 45);

    setTimeout(() => {
      this.lightningFlash = 0.95;
    }, 90);

    setTimeout(() => {
      this.lightningFlash = 0.5;
    }, 150);

    // Schedule next strike (2.5s - 6.5s)
    this.nextLightningTime = performance.now() + 2500 + Math.random() * 4000;
  }

  drawLightning(ctx) {
    if (this.lightningFlash <= 0.01) return;

    // 1. Atmospheric Ambient Sky Glow Flash
    ctx.save();
    ctx.fillStyle = `rgba(180, 215, 255, ${this.lightningFlash * 0.22})`;
    ctx.fillRect(0, 0, this.width, this.height);

    // 2. Render all active lightning bolts
    for (let b = 0; b < this.lightningBolts.length; b++) {
      const segments = this.lightningBolts[b];
      if (!segments || segments.length === 0) continue;

      // Outer soft electrical glow
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

      // Inner intense core bolt
      ctx.lineWidth = 1.8;
      ctx.strokeStyle = `rgba(255, 255, 255, ${this.lightningFlash * 0.95})`;
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
    }

    ctx.restore();

    // Decay the flash intensity smoothly
    this.lightningFlash *= 0.86;
    if (this.lightningFlash < 0.02) {
      this.lightningFlash = 0;
      this.lightningBolts = [];
    }
  }

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

    // Lightning Check & Draw
    if (timestamp >= this.nextLightningTime) {
      this.triggerLightning();
    }
    this.drawLightning(ctx);

    // Fast Falling Rain Streaks (Single Batch Draw)
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

window.RainGlassEngine = RainGlassEngine;
