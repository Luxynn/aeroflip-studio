/**
 * AeroFlip Studio - Time-Morph Splash & Progressive Loading Manager
 * Ultra-fluid continuous stream transition with high-priority font synchronization.
 */
class SplashManager {
  constructor(onEnterCallback) {
    this.onEnterCallback = onEnterCallback;
    this.splashEl = document.getElementById('appSplashScreen');
    this.stageEl = document.getElementById('splashStage3D');
    this.centerCard = document.getElementById('splashCardCenter');
    this.centerVal = document.getElementById('splashCenterVal');
    this.hoursCard = document.getElementById('splashCardHours');
    this.hoursVal = document.getElementById('splashHoursVal');
    this.secondsCard = document.getElementById('splashCardSeconds');
    this.secondsVal = document.getElementById('splashSecondsVal');

    this.isEntered = false;
    this.autoEnterTimer = null;
    this.animationTimers = [];

    if (this.splashEl) {
      this.init();
    }
  }

  init() {
    this.bindEvents();
    this.runMorphSequence();
  }

  bindEvents() {
    if (this.splashEl) {
      this.splashEl.addEventListener('click', () => {
        this.enterStudio();
      });
    }

    this.keyHandler = (e) => {
      if (this.isEntered) return;
      this.enterStudio();
    };
    window.addEventListener('keydown', this.keyHandler);
  }

  runMorphSequence() {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const curH = pad(now.getHours());
    const curM = pad(now.getMinutes());
    const curS = pad(now.getSeconds());

    if (this.hoursVal) this.hoursVal.textContent = curH;
    if (this.secondsVal) this.secondsVal.textContent = curS;

    // Step 1: Central Card 3D Flip to current minutes
    this.addTimer(() => {
      if (this.isEntered) return;
      if (this.centerCard) {
        this.centerCard.classList.add('flipping');
        setTimeout(() => {
          if (this.centerVal && !this.isEntered) {
            this.centerVal.textContent = curM;
          }
        }, 220);
      }
    }, 200);

    // Step 2: Smooth Side Cards Glide & Unfold
    this.addTimer(() => {
      if (this.isEntered) return;
      if (this.stageEl) {
        this.stageEl.classList.add('unfolded');
      }
    }, 450);

    // Step 3: Seamless Auto-Entry as soon as the continuous stream finishes & fonts are ready (1.15s)
    this.autoEnterTimer = setTimeout(async () => {
      if (this.isEntered) return;
      if (document.fonts && document.fonts.ready) {
        try {
          await document.fonts.ready;
        } catch (e) {
          // ignore font loading error and proceed
        }
      }
      this.enterStudio();
    }, 1150);
  }

  addTimer(fn, delay) {
    const timer = setTimeout(fn, delay);
    this.animationTimers.push(timer);
  }

  enterStudio() {
    if (this.isEntered) return;
    this.isEntered = true;

    // Clear any pending timers
    if (this.autoEnterTimer) clearTimeout(this.autoEnterTimer);
    this.animationTimers.forEach((t) => clearTimeout(t));
    window.removeEventListener('keydown', this.keyHandler);

    // Trigger progressive hydration callback (audio, rain engine, etc.)
    if (typeof this.onEnterCallback === 'function') {
      try {
        this.onEnterCallback();
      } catch (err) {
        console.warn('Error during splash onEnter callback', err);
      }
    }

    // Smooth exit transition
    if (this.splashEl) {
      this.splashEl.classList.add('splash-hidden');
      setTimeout(() => {
        this.splashEl.style.display = 'none';
      }, 480);
    }
  }
}

window.SplashManager = SplashManager;
