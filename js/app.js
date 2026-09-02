const TARGET_TIMER_FRAME_INTERVAL_MS = 40; // 25 FPS throttle to minimize GPU/DWM load
const MS_DOM_THROTTLE_INTERVAL_MS = 33;    // ~30 FPS DOM update cap
const DEFAULT_TIMER_DURATION_MS = 5 * 60 * 1000;
const ALARM_CHIME_INTERVAL_MS = 2000;

class FlipStopwatchApp {
  constructor() {
    // Mode: 'clock' | 'stopwatch' | 'timer'
    this.mode = 'stopwatch';

    // Stopwatch State (Independent from timer)
    this.stopwatch = {
      isRunning: false,
      startTime: 0,
      elapsedTime: 0,
      laps: [],
      lastLapTime: 0
    };

    // Timer / Countdown State (Independent from stopwatch)
    this.timer = {
      isRunning: false,
      isStarted: false,
      startTime: 0,
      timerDurationMs: DEFAULT_TIMER_DURATION_MS,
      timerRemainingMs: DEFAULT_TIMER_DURATION_MS,
      timerInitialSetSec: 300,
      laps: [],
      lastLapTime: 0,
      isFinished: false
    };

    // Common Animation & Loop State
    this.timerId = null;
    this.rainEnabled = true;
    this.lastMsDomUpdate = 0;
    this.lastTimerFrameTime = 0;
    this.lastTitleSec = -1;

    // Clock Mode State
    this.clockInterval = null;
    this.clockFormat = localStorage.getItem('fliqlo_clock_format') || '24h'; // '24h' | '12h'
    this.alarmInterval = null;

    // Web Worker Background Ticker
    this.worker = null;
    this.initWorker();

    // Instantiate Sub-Systems
    this.audio = new AudioManager();
    this.storage = new SessionStore();
    this.rain = new RainGlassEngine('rainCanvas');
    this.cards = new FliqloCardManager({
      hours: document.getElementById('cardHours'),
      minutes: document.getElementById('cardMinutes'),
      seconds: document.getElementById('cardSeconds'),
    }, (cardElement) => {
      if (cardElement.id === 'cardSeconds') {
        this.audio.playMechanicalClick();
      }
    });

    this.analytics = new ComparisonAnalytics(document.getElementById('comparisonContent'));

    // Modular Managers
    this.bindDomElements();
    this.ui = new UIManager(this);
    this.keybinds = new KeybindManager(this, this.ui);
    this.settings = new SettingsManager(this, this.storage, this.ui, this.keybinds);
    this.history = new HistoryManager(this, this.storage, this.analytics, this.ui);

    // Time-Morph Splash & Progressive Entrance
    this.splash = new SplashManager(() => {
      if (this.audio) {
        this.audio.ensureAudioRunning();
        this.audio.playMechanicalClick();
      }
    });

    this.init();
  }

  /* ============================================================
     BACKWARD COMPATIBILITY GETTERS & SETTERS
     ============================================================ */
  get isRunning() {
    if (this.mode === 'stopwatch') return this.stopwatch.isRunning;
    if (this.mode === 'timer') return this.timer.isRunning;
    return false;
  }
  set isRunning(val) {
    if (this.mode === 'stopwatch') this.stopwatch.isRunning = val;
    else if (this.mode === 'timer') this.timer.isRunning = val;
  }

  get elapsedTime() {
    if (this.stopwatch.isRunning) {
      return this.stopwatch.elapsedTime + (performance.now() - this.stopwatch.startTime);
    }
    return this.stopwatch.elapsedTime;
  }
  set elapsedTime(val) {
    this.stopwatch.elapsedTime = val;
  }

  get startTime() {
    if (this.mode === 'stopwatch') return this.stopwatch.startTime;
    if (this.mode === 'timer') return this.timer.startTime;
    return 0;
  }
  set startTime(val) {
    if (this.mode === 'stopwatch') this.stopwatch.startTime = val;
    else if (this.mode === 'timer') this.timer.startTime = val;
  }

  get laps() {
    if (this.mode === 'timer') return this.timer.laps;
    return this.stopwatch.laps;
  }
  set laps(val) {
    if (this.mode === 'timer') this.timer.laps = val;
    else this.stopwatch.laps = val;
  }

  get lastLapTime() {
    if (this.mode === 'timer') return this.timer.lastLapTime;
    return this.stopwatch.lastLapTime;
  }
  set lastLapTime(val) {
    if (this.mode === 'timer') this.timer.lastLapTime = val;
    else this.stopwatch.lastLapTime = val;
  }

  get timerDurationMs() {
    return this.timer.timerDurationMs;
  }
  set timerDurationMs(val) {
    this.timer.timerDurationMs = val;
  }

  get timerRemainingMs() {
    if (this.timer.isRunning) {
      return Math.max(0, this.timer.timerRemainingMs - (performance.now() - this.timer.startTime));
    }
    return this.timer.timerRemainingMs;
  }
  set timerRemainingMs(val) {
    this.timer.timerRemainingMs = val;
  }

  get timerInitialSetSec() {
    return this.timer.timerInitialSetSec;
  }
  set timerInitialSetSec(val) {
    this.timer.timerInitialSetSec = val;
  }

  initWorker() {
    try {
      const workerCode = `
        let intervalId = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!intervalId) {
              intervalId = setInterval(function() {
                self.postMessage('tick');
              }, 500);
            }
          } else if (e.data === 'stop') {
            if (intervalId) {
              clearInterval(intervalId);
              intervalId = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));
      this.worker.onmessage = (e) => {
        if (e.data === 'tick' && (this.stopwatch.isRunning || this.timer.isRunning)) {
          this.onWorkerTick();
        }
      };
    } catch (err) {
      console.warn('Web Worker could not be initialized, fallback to standard timer', err);
    }
  }

  bindDomElements() {
    this.rainBackdrop = document.getElementById('rainBackdrop');
    this.rainToggleBtn = document.getElementById('rainToggleBtn');
    this.ambienceToggleBtn = document.getElementById('ambienceToggleBtn') || document.getElementById('rainToggleBtn');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');

    this.modeClockBtn = document.getElementById('modeClockBtn');
    this.modeStopwatchBtn = document.getElementById('modeStopwatchBtn');
    this.modeTimerBtn = document.getElementById('modeTimerBtn');
    this.timerSetupPanel = document.getElementById('timerSetupPanel');
    this.fliqloStage = document.getElementById('fliqloStage');
    this.taskGoalBar = document.getElementById('taskGoalBar');
    this.fliqloControlsBar = document.getElementById('fliqloControlsBar');
    this.timerControlsGroup = document.getElementById('timerControlsGroup');
    this.clockControlsGroup = document.getElementById('clockControlsGroup');
    this.toggle1224Btn = document.getElementById('toggle1224Btn');
    this.clockFormatText = document.getElementById('clockFormatText');
    this.clockInfoBanner = document.getElementById('clockInfoBanner');
    this.clockDateText = document.getElementById('clockDateText');
    this.setupStartBtn = document.getElementById('setupStartBtn');

    this.timerInputHours = document.getElementById('timerInputHours');
    this.timerInputMinutes = document.getElementById('timerInputMinutes');
    this.timerInputSeconds = document.getElementById('timerInputSeconds');
    this.hourUpBtn = document.getElementById('hourUpBtn');
    this.hourDownBtn = document.getElementById('hourDownBtn');
    this.minUpBtn = document.getElementById('minUpBtn');
    this.minDownBtn = document.getElementById('minDownBtn');
    this.secUpBtn = document.getElementById('secUpBtn');
    this.secDownBtn = document.getElementById('secDownBtn');
    this.clearTimerPresetBtn = document.getElementById('clearTimerPresetBtn');

    this.msPill = document.getElementById('msPill');
    this.msLabel = document.getElementById('msLabel');
    this.msDisplay = document.getElementById('msDisplay');
    this.startPauseBtn = document.getElementById('startPauseBtn');
    this.startPauseText = document.getElementById('startPauseText');
    this.resetBtn = document.getElementById('resetBtn');
    this.lapBtn = document.getElementById('lapBtn');
    this.lapBtnText = document.getElementById('lapBtnText');
    this.saveSessionBtn = document.getElementById('saveSessionBtn');

    this.lapsContainer = document.getElementById('lapsContainer');
    this.lapsList = document.getElementById('lapsList');
    this.lapsHeaderSplit = document.getElementById('lapsHeaderSplit');
    this.lapsHeaderTotal = document.getElementById('lapsHeaderTotal');

    this.alarmToast = document.getElementById('alarmToast');
    this.dismissAlarmBtn = document.getElementById('dismissAlarmBtn');
  }

  init() {
    this.setupEventListeners();
    this.updateClockFormatBtnUI();
    this.updateSoundBtnUI();
    this.updateAmbienceUI();

    if (window.I18n) {
      window.I18n.onLanguageChange((lang) => this.onLanguageChanged(lang));
    }

    // Restore saved timer custom preset
    const savedH = localStorage.getItem('aeroflip_timer_h');
    const savedM = localStorage.getItem('aeroflip_timer_m');
    const savedS = localStorage.getItem('aeroflip_timer_s');
    if (savedH !== null && this.timerInputHours) this.timerInputHours.value = savedH;
    if (savedM !== null && this.timerInputMinutes) this.timerInputMinutes.value = savedM;
    if (savedS !== null && this.timerInputSeconds) this.timerInputSeconds.value = savedS;

    // Default mode setup
    const defMode = localStorage.getItem('fliqlo_default_mode') || 'stopwatch';
    this.switchMode(defMode);
  }

  onLanguageChanged(lang) {
    this.updateClockFormatBtnUI();
    if (this.mode === 'clock') {
      this.tickClock(true);
    } else {
      this.updateControlsUI();
    }
  }

  updateControlsUI() {
    if (!this.startPauseText) return;
    const isRunning = this.isRunning;
    const isTimer = this.mode === 'timer';

    if (isRunning) {
      this.startPauseBtn.classList.add('is-running');
      this.startPauseBtn.querySelector('.icon-play').classList.add('hidden');
      this.startPauseBtn.querySelector('.icon-pause').classList.remove('hidden');
      this.startPauseText.textContent = window.I18n ? window.I18n.get('btn_pause') : 'Durdur';
      this.resetBtn.disabled = false;
      this.lapBtn.disabled = false;
      this.saveSessionBtn.disabled = true;
    } else {
      this.startPauseBtn.classList.remove('is-running');
      this.startPauseBtn.querySelector('.icon-play').classList.remove('hidden');
      this.startPauseBtn.querySelector('.icon-pause').classList.add('hidden');

      if (isTimer) {
        if (this.timer.isFinished) {
          this.startPauseText.textContent = window.I18n ? window.I18n.get('btn_start') : 'Başlat';
          this.resetBtn.disabled = false;
          this.lapBtn.disabled = true;
          this.saveSessionBtn.disabled = false;
        } else if (this.timer.isStarted && this.timerRemainingMs < this.timer.timerDurationMs) {
          this.startPauseText.textContent = window.I18n ? window.I18n.get('btn_resume') : 'Devam';
          this.resetBtn.disabled = false;
          this.lapBtn.disabled = true;
          this.saveSessionBtn.disabled = false;
        } else {
          this.startPauseText.textContent = window.I18n ? window.I18n.get('btn_start') : 'Başlat';
          this.resetBtn.disabled = true;
          this.lapBtn.disabled = true;
          this.saveSessionBtn.disabled = true;
        }
      } else {
        // Stopwatch
        if (this.stopwatch.elapsedTime > 0) {
          this.startPauseText.textContent = window.I18n ? window.I18n.get('btn_resume') : 'Devam';
          this.resetBtn.disabled = false;
          this.lapBtn.disabled = true;
          this.saveSessionBtn.disabled = false;
        } else {
          this.startPauseText.textContent = window.I18n ? window.I18n.get('btn_start') : 'Başlat';
          this.resetBtn.disabled = true;
          this.lapBtn.disabled = true;
          this.saveSessionBtn.disabled = true;
        }
      }
    }

    if (this.lapBtnText) {
      this.lapBtnText.textContent = window.I18n ? window.I18n.get('btn_lap') : 'Tur';
    }

    if (this.lapsHeaderSplit && this.lapsHeaderTotal) {
      if (this.mode === 'stopwatch') {
        this.lapsHeaderSplit.textContent = window.I18n ? window.I18n.get('laps_header_split') : 'TUR ZAMANI';
        this.lapsHeaderTotal.textContent = window.I18n ? window.I18n.get('laps_header_total') : 'TOPLAM SÜRE';
      } else {
        this.lapsHeaderSplit.textContent = window.I18n ? window.I18n.get('pill_diff') : 'FARK';
        this.lapsHeaderTotal.textContent = window.I18n ? window.I18n.get('laps_header_total') : 'KALAN SÜRE';
      }
    }
  }

  /* ============================================================
     MODE SWITCHER & CLOCK MODE
     ============================================================ */
  switchMode(newMode) {
    if (this.mode === newMode) return;

    const prevMode = this.mode;
    if (prevMode === 'clock') {
      this.stopClock();
    }

    this.mode = newMode;

    [this.modeClockBtn, this.modeStopwatchBtn, this.modeTimerBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    if (newMode === 'clock') {
      if (this.modeClockBtn) this.modeClockBtn.classList.add('active');
      this.timerSetupPanel.classList.add('hidden');
      this.fliqloStage.classList.remove('hidden');
      this.fliqloControlsBar.classList.remove('hidden');
      if (this.timerControlsGroup) this.timerControlsGroup.classList.add('hidden');
      if (this.clockControlsGroup) this.clockControlsGroup.classList.remove('hidden');
      if (this.clockInfoBanner) this.clockInfoBanner.classList.remove('hidden');
      if (this.taskGoalBar) this.taskGoalBar.classList.add('hidden');
      this.lapsContainer.classList.remove('has-laps');

      this.startClock();
    } else if (newMode === 'stopwatch') {
      if (this.modeStopwatchBtn) this.modeStopwatchBtn.classList.add('active');
      this.timerSetupPanel.classList.add('hidden');
      this.fliqloStage.classList.remove('hidden');
      this.fliqloControlsBar.classList.remove('hidden');
      if (this.timerControlsGroup) this.timerControlsGroup.classList.remove('hidden');
      if (this.clockControlsGroup) this.clockControlsGroup.classList.add('hidden');
      if (this.clockInfoBanner) this.clockInfoBanner.classList.add('hidden');
      if (this.taskGoalBar) this.taskGoalBar.classList.remove('hidden');

      const now = performance.now();
      const currentElapsed = this.stopwatch.elapsedTime + (this.stopwatch.isRunning ? (now - this.stopwatch.startTime) : 0);
      const totalSeconds = Math.floor(currentElapsed / 1000);
      const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
      const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
      const seconds = String(totalSeconds % 60).padStart(2, '0');
      const ms = Math.floor((currentElapsed % 1000) / 10);

      this.cards.setAllInstant(hours, minutes, seconds);
      if (this.msLabel) this.msLabel.textContent = window.I18n ? window.I18n.get('pill_ms') : 'MS';
      if (this.msDisplay) this.msDisplay.textContent = '.' + String(ms).padStart(2, '0');

      this.renderActiveLaps();
      this.updateControlsUI();

      if (this.stopwatch.isRunning) {
        this.ensureRunningLoop();
      }
    } else if (newMode === 'timer') {
      if (this.modeTimerBtn) this.modeTimerBtn.classList.add('active');
      if (this.timerControlsGroup) this.timerControlsGroup.classList.remove('hidden');
      if (this.clockControlsGroup) this.clockControlsGroup.classList.add('hidden');
      if (this.clockInfoBanner) this.clockInfoBanner.classList.add('hidden');
      if (this.taskGoalBar) this.taskGoalBar.classList.remove('hidden');

      if (this.timer.isStarted) {
        this.timerSetupPanel.classList.add('hidden');
        this.fliqloStage.classList.remove('hidden');
        this.fliqloControlsBar.classList.remove('hidden');

        const now = performance.now();
        let remaining = this.timer.timerRemainingMs;
        if (this.timer.isRunning) {
          remaining = Math.max(0, this.timer.timerRemainingMs - (now - this.timer.startTime));
        }

        const totalSeconds = Math.floor(remaining / 1000);
        const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
        const seconds = String(totalSeconds % 60).padStart(2, '0');

        this.cards.setAllInstant(hours, minutes, seconds);

        const elapsed = Math.max(0, this.timer.timerDurationMs - remaining);
        const elapsedHMS = FliqloUtils.formatTimeHMS(elapsed);
        let timerPillText = elapsedHMS;
        if (this.timer.laps && this.timer.laps.length > 0) {
          const splitSinceLap = Math.max(0, elapsed - this.timer.lastLapTime);
          const splitHMS = FliqloUtils.formatTimeHMS(splitSinceLap);
          timerPillText = `${elapsedHMS} (Tur: +${splitHMS})`;
        }
        if (this.msLabel) this.msLabel.textContent = window.I18n ? window.I18n.get('pill_elapsed') : 'GEÇEN';
        if (this.msDisplay) this.msDisplay.textContent = timerPillText;

        this.renderActiveLaps();
        this.updateControlsUI();

        if (this.timer.isRunning) {
          this.ensureRunningLoop();
        }
      } else {
        this.timerSetupPanel.classList.remove('hidden');
        this.fliqloStage.classList.add('hidden');
        this.fliqloControlsBar.classList.add('hidden');
        this.lapsContainer.classList.remove('has-laps');
        this.syncTimerFromInputs();
      }
    }
  }

  startClock() {
    this.tickClock(true);
    this.clockInterval = setInterval(() => {
      this.tickClock(false);
    }, 1000);
  }

  stopClock() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
  }

  setClockFormat(format) {
    if (format !== '24h' && format !== '12h') format = '24h';
    this.clockFormat = format;
    localStorage.setItem('fliqlo_clock_format', this.clockFormat);
    this.updateClockFormatBtnUI();
    const toastMsg = this.clockFormat === '24h'
      ? (window.I18n ? window.I18n.get('toast_format_24h') : '24 Saat Formatı Aktif 🕒')
      : (window.I18n ? window.I18n.get('toast_format_12h') : '12 Saat Formatı (AM/PM) Aktif 🕒');
    if (this.ui) this.ui.showToast(toastMsg, '🕒');
    if (this.mode === 'clock') {
      this.tickClock(true);
    }
  }

  toggleClockFormat() {
    this.setClockFormat(this.clockFormat === '24h' ? '12h' : '24h');
  }

  updateClockFormatBtnUI() {
    const is24h = this.clockFormat === '24h';
    const text = is24h
      ? (window.I18n ? window.I18n.get('format_24h_btn') : '24 Saat Formatı')
      : (window.I18n ? window.I18n.get('format_12h_btn') : '12 Saat (AM/PM)');

    if (this.clockFormatText) {
      this.clockFormatText.textContent = text;
    }

    const select = document.getElementById('clockFormatSelect');
    if (select && select.value !== this.clockFormat) {
      select.value = this.clockFormat;
    }
  }

  tickClock(instant = false) {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    let ampm = '';
    if (this.clockFormat === '12h') {
      ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      if (hours === 0) hours = 12;
    }

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');

    if (instant) {
      this.cards.setAllInstant(hStr, mStr, sStr);
    } else {
      this.cards.updateDisplay(hStr, mStr, sStr);
    }

    // Update Date text
    if (this.clockDateText) {
      const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      const locale = (window.I18n && window.I18n.currentLang === 'en') ? 'en-US' : 'tr-TR';
      this.clockDateText.textContent = now.toLocaleDateString(locale, options);
    }

    // Update Browser Tab Title in Clock Mode
    document.title = `🕒 ${hStr}:${mStr} | AeroFlip Studio`;

    // Update Pill
    const formatLabel = window.I18n ? window.I18n.get('pill_format') : 'FORMAT';
    if (this.msLabel) this.msLabel.textContent = formatLabel;
    if (this.msDisplay) {
      this.msDisplay.textContent = this.clockFormat === '12h' ? ampm : '24H';
    }
  }

  /* ============================================================
     TIMER SETUP & PRESETS
     ============================================================ */
  syncTimerFromInputs() {
    const h = Math.max(0, Math.min(99, parseInt(this.timerInputHours.value, 10) || 0));
    const m = Math.max(0, Math.min(59, parseInt(this.timerInputMinutes.value, 10) || 0));
    const s = Math.max(0, Math.min(59, parseInt(this.timerInputSeconds.value, 10) || 0));

    this.timerInputHours.value = String(h).padStart(2, '0');
    this.timerInputMinutes.value = String(m).padStart(2, '0');
    this.timerInputSeconds.value = String(s).padStart(2, '0');

    try {
      localStorage.setItem('aeroflip_timer_h', this.timerInputHours.value);
      localStorage.setItem('aeroflip_timer_m', this.timerInputMinutes.value);
      localStorage.setItem('aeroflip_timer_s', this.timerInputSeconds.value);
    } catch (e) {
      console.warn('Failed to save timer inputs', e);
    }

    const totalMs = (h * 3600 + m * 60 + s) * 1000;
    this.timer.timerDurationMs = totalMs;
    this.timer.timerRemainingMs = totalMs;
    this.timer.timerInitialSetSec = h * 3600 + m * 60 + s;

    this.cards.setAllInstant(String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0'));
    if (this.msLabel) this.msLabel.textContent = 'GEÇEN';
    if (this.msDisplay) this.msDisplay.textContent = '00:00:00';
  }

  adjustTimerInput(type, delta) {
    if (this.timer.isRunning) return;

    let input = type === 'hour' ? this.timerInputHours : (type === 'min' ? this.timerInputMinutes : this.timerInputSeconds);
    let max = type === 'hour' ? 99 : 59;
    let val = (parseInt(input.value, 10) || 0) + delta;

    if (val < 0) val = max;
    if (val > max) val = 0;

    input.value = String(val).padStart(2, '0');
    this.syncTimerFromInputs();
  }

  addPresetTime(secondsToAdd) {
    if (this.timer.isRunning) return;

    const currentTotalSec = (parseInt(this.timerInputHours.value, 10) || 0) * 3600 +
                            (parseInt(this.timerInputMinutes.value, 10) || 0) * 60 +
                            (parseInt(this.timerInputSeconds.value, 10) || 0);

    const newTotalSec = currentTotalSec + secondsToAdd;

    const h = Math.floor(newTotalSec / 3600);
    const m = Math.floor((newTotalSec % 3600) / 60);
    const s = newTotalSec % 60;

    this.timerInputHours.value = String(h).padStart(2, '0');
    this.timerInputMinutes.value = String(m).padStart(2, '0');
    this.timerInputSeconds.value = String(s).padStart(2, '0');

    this.syncTimerFromInputs();
  }

  clearTimerInputs() {
    if (this.timer.isRunning) return;
    this.timerInputHours.value = '00';
    this.timerInputMinutes.value = '00';
    this.timerInputSeconds.value = '00';
    this.syncTimerFromInputs();
  }

  /* ============================================================
     TICK & RENDER LOOP (25 FPS Throttled)
     ============================================================ */
  onWorkerTick() {
    if (!document.hidden) return;
    const now = performance.now();

    if (this.stopwatch.isRunning) {
      const currentElapsed = this.stopwatch.elapsedTime + (now - this.stopwatch.startTime);
      if (this.mode === 'stopwatch') {
        this.updateDisplay(currentElapsed);
      }
    }

    if (this.timer.isRunning) {
      const currentElapsed = now - this.timer.startTime;
      const remaining = this.timer.timerRemainingMs - currentElapsed;
      if (remaining <= 0) {
        if (this.mode === 'timer') this.updateDisplay(0);
        this.timerFinished();
      } else {
        if (this.mode === 'timer') this.updateDisplay(remaining);
      }
    }
  }

  ensureRunningLoop() {
    if (!this.timerId) {
      this.lastTimerFrameTime = performance.now();
      this.timerId = requestAnimationFrame((t) => this.update(t));
    }
    if (document.hidden && this.worker) {
      this.worker.postMessage('start');
    }
  }

  checkStopRunningLoop() {
    if (!this.stopwatch.isRunning && !this.timer.isRunning) {
      if (this.timerId) {
        cancelAnimationFrame(this.timerId);
        this.timerId = null;
      }
      if (this.worker) {
        this.worker.postMessage('stop');
      }
    }
  }

  update(timestamp = performance.now()) {
    const anyRunning = this.stopwatch.isRunning || this.timer.isRunning;
    if (!anyRunning) {
      this.timerId = null;
      return;
    }

    this.timerId = requestAnimationFrame((t) => this.update(t));

    const elapsedFrame = timestamp - this.lastTimerFrameTime;
    if (elapsedFrame < TARGET_TIMER_FRAME_INTERVAL_MS) {
      return; // 25 FPS throttle to minimize GPU/DWM load
    }
    this.lastTimerFrameTime = timestamp - (elapsedFrame % TARGET_TIMER_FRAME_INTERVAL_MS);

    let currentStopwatchElapsed = this.stopwatch.elapsedTime;
    if (this.stopwatch.isRunning) {
      currentStopwatchElapsed += (timestamp - this.stopwatch.startTime);
    }

    let currentTimerRemaining = this.timer.timerRemainingMs;
    if (this.timer.isRunning) {
      const currentElapsed = timestamp - this.timer.startTime;
      currentTimerRemaining = this.timer.timerRemainingMs - currentElapsed;

      if (currentTimerRemaining <= 0) {
        currentTimerRemaining = 0;
        this.timerFinished();
      }
    }

    if (this.mode === 'stopwatch') {
      this.updateDisplay(currentStopwatchElapsed);
    } else if (this.mode === 'timer' && this.timer.isStarted) {
      this.updateDisplay(currentTimerRemaining);
    }
  }

  updateDisplay(msValue) {
    const totalSeconds = Math.floor(msValue / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');

    this.cards.updateDisplay(hStr, mStr, sStr);

    const now = performance.now();
    if (now - this.lastMsDomUpdate >= MS_DOM_THROTTLE_INTERVAL_MS || msValue === 0) {
      if (this.mode === 'timer') {
        const elapsed = Math.max(0, this.timer.timerDurationMs - msValue);
        const elapsedHMS = FliqloUtils.formatTimeHMS(elapsed);
        let timerPillText = elapsedHMS;
        if (this.timer.laps && this.timer.laps.length > 0) {
          const splitSinceLap = Math.max(0, elapsed - this.timer.lastLapTime);
          const splitHMS = FliqloUtils.formatTimeHMS(splitSinceLap);
          timerPillText = `${elapsedHMS} (Tur: +${splitHMS})`;
        }
        if (this.msLabel && this.msLabel.textContent !== 'GEÇEN') {
          this.msLabel.textContent = 'GEÇEN';
        }
        if (this.msDisplay && this.msDisplay.textContent !== timerPillText) {
          this.msDisplay.textContent = timerPillText;
        }
      } else if (this.mode === 'stopwatch') {
        const ms = Math.floor((msValue % 1000) / 10);
        const msStr = '.' + String(ms).padStart(2, '0');
        if (this.msLabel && this.msLabel.textContent !== 'MS') {
          this.msLabel.textContent = 'MS';
        }
        if (this.msDisplay && this.msDisplay.textContent !== msStr) {
          this.msDisplay.textContent = msStr;
        }
      }
      this.lastMsDomUpdate = now;
    }

    // Update Live Browser Tab Title only when whole second changes (1/s instead of 30/s)
    if (totalSeconds !== this.lastTitleSec) {
      this.lastTitleSec = totalSeconds;
      if (this.mode === 'stopwatch') {
        document.title = `⏱️ ${hStr}:${mStr}:${sStr} | AeroFlip Studio`;
      } else if (this.mode === 'timer') {
        document.title = `⏳ ${hStr}:${mStr}:${sStr} | AeroFlip Studio`;
      }
    }
  }

  timerFinished() {
    this.timer.isRunning = false;
    this.timer.timerRemainingMs = 0;
    this.timer.isFinished = true;
    this.checkStopRunningLoop();

    document.title = (window.I18n && window.I18n.currentLang === 'en') ? '🔔 TIME\'S UP! | AeroFlip Studio' : '🔔 SÜRE DOLDU! | AeroFlip Studio';

    if (this.mode === 'timer') {
      this.updateDisplay(0);
      this.updateControlsUI();
    }

    this.startAlarm();
  }

  /* ============================================================
     CONTROLS: START / PAUSE / RESET / LAP
     ============================================================ */
  start() {
    if (this.mode === 'clock') return;

    this.audio.ensureAudioRunning();

    if (this.mode === 'timer') {
      if (this.timer.isRunning) return;

      if (!this.timer.isStarted || this.timer.timerRemainingMs <= 0) {
        this.syncTimerFromInputs();
      }
      if (this.timer.timerRemainingMs <= 0) {
        return;
      }

      this.timer.isStarted = true;
      this.timer.isRunning = true;
      this.timer.isFinished = false;
      this.timer.startTime = performance.now();

      this.timerSetupPanel.classList.add('hidden');
      this.fliqloStage.classList.remove('hidden');
      this.fliqloControlsBar.classList.remove('hidden');

      const totalSec = Math.floor(this.timer.timerRemainingMs / 1000);
      const h = String(Math.floor(totalSec / 3600)).padStart(2, '0');
      const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const s = String(totalSec % 60).padStart(2, '0');
      this.cards.setAllInstant(h, m, s);
    } else if (this.mode === 'stopwatch') {
      if (this.stopwatch.isRunning) return;

      this.stopwatch.isRunning = true;
      this.stopwatch.startTime = performance.now();
    }

    this.ensureRunningLoop();
    this.updateControlsUI();
  }

  pause() {
    if (this.mode === 'clock') return;

    const now = performance.now();

    if (this.mode === 'timer') {
      if (!this.timer.isRunning) return;
      this.timer.isRunning = false;
      this.timer.timerRemainingMs -= (now - this.timer.startTime);
      if (this.timer.timerRemainingMs < 0) this.timer.timerRemainingMs = 0;
    } else if (this.mode === 'stopwatch') {
      if (!this.stopwatch.isRunning) return;
      this.stopwatch.isRunning = false;
      this.stopwatch.elapsedTime += (now - this.stopwatch.startTime);
    }

    this.checkStopRunningLoop();
    this.updateControlsUI();
  }

  toggleStartPause() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    if (this.mode === 'clock') return;

    this.stopAlarm();

    if (this.mode === 'timer') {
      this.timer.isRunning = false;
      this.timer.isStarted = false;
      this.timer.isFinished = false;
      this.timer.startTime = 0;
      this.timer.laps = [];
      this.timer.lastLapTime = 0;

      this.timerSetupPanel.classList.remove('hidden');
      this.fliqloStage.classList.add('hidden');
      this.fliqloControlsBar.classList.add('hidden');

      if (this.msLabel) this.msLabel.textContent = window.I18n ? window.I18n.get('pill_elapsed') : 'GEÇEN';
      if (this.msDisplay) this.msDisplay.textContent = '00:00:00';
      this.syncTimerFromInputs();
    } else if (this.mode === 'stopwatch') {
      this.stopwatch.isRunning = false;
      this.stopwatch.startTime = 0;
      this.stopwatch.elapsedTime = 0;
      this.stopwatch.laps = [];
      this.stopwatch.lastLapTime = 0;

      this.cards.setAllInstant('00', '00', '00');
      if (this.msLabel) this.msLabel.textContent = window.I18n ? window.I18n.get('pill_ms') : 'MS';
      if (this.msDisplay) this.msDisplay.textContent = '.00';
    }

    this.checkStopRunningLoop();
    this.lastTitleSec = -1;
    document.title = 'AeroFlip Studio | Minimalist Flip Clock & Stopwatch';
    this.renderActiveLaps();
    this.updateControlsUI();
  }

  addLap() {
    if (this.mode === 'clock') return;

    const now = performance.now();

    if (this.mode === 'stopwatch') {
      if (!this.stopwatch.isRunning && this.stopwatch.elapsedTime === 0) return;

      const currentTotal = this.stopwatch.elapsedTime + (this.stopwatch.isRunning ? (now - this.stopwatch.startTime) : 0);
      const splitTime = currentTotal - this.stopwatch.lastLapTime;
      this.stopwatch.lastLapTime = currentTotal;

      this.stopwatch.laps.unshift({
        index: this.stopwatch.laps.length + 1,
        split: splitTime,
        total: currentTotal,
        mode: 'stopwatch'
      });
    } else if (this.mode === 'timer') {
      if (!this.timer.isStarted) return;

      let remaining = this.timer.timerRemainingMs;
      if (this.timer.isRunning) {
        const currentElapsed = now - this.timer.startTime;
        remaining = Math.max(0, this.timer.timerRemainingMs - currentElapsed);
      }
      const elapsedFromTotal = Math.max(0, this.timer.timerDurationMs - remaining);
      const splitTime = elapsedFromTotal - this.timer.lastLapTime;
      this.timer.lastLapTime = elapsedFromTotal;

      this.timer.laps.unshift({
        index: this.timer.laps.length + 1,
        split: splitTime,
        remaining: remaining,
        elapsed: elapsedFromTotal,
        mode: 'timer'
      });
    }

    this.renderActiveLaps();
  }

  renderActiveLaps() {
    const laps = this.laps;
    if (!laps || laps.length === 0 || this.mode === 'clock') {
      this.lapsContainer.classList.remove('has-laps');
      return;
    }

    this.lapsContainer.classList.add('has-laps');

    this.lapsList.innerHTML = laps.map(lap => {
      if (lap.mode === 'stopwatch' || this.mode === 'stopwatch') {
        return `
          <div class="lap-item">
            <span>#${String(lap.index).padStart(2, '0')}</span>
            <span style="color:#ffffff;">+${FliqloUtils.formatTime(lap.split)}</span>
            <span>${FliqloUtils.formatTime(lap.total)}</span>
          </div>
        `;
      } else {
        return `
          <div class="lap-item">
            <span>#${String(lap.index).padStart(2, '0')}</span>
            <span style="color:#ffffff;">+${FliqloUtils.formatTime(lap.split)}</span>
            <span style="color:#22c55e;">${FliqloUtils.formatTime(lap.remaining)} kala</span>
          </div>
        `;
      }
    }).join('');
  }

  /* ============================================================
     ALARM & AMBIENCE
     ============================================================ */
  startAlarm() {
    this.audio.playAlarmChime();
    this.alarmToast.classList.remove('hidden');
    this.alarmInterval = setInterval(() => {
      this.audio.playAlarmChime();
    }, ALARM_CHIME_INTERVAL_MS);
  }

  stopAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    this.alarmToast.classList.add('hidden');
  }

  cycleAmbience() {
    const newMode = this.rain.cycleMode();
    const modeMeta = {
      rain: { name: 'Yağmur & Şimşek', icon: '🌧️' },
      fire: { name: 'Şömine & Kıvılcımlar', icon: '🔥' },
      stars: { name: 'Kozmik Gece & Yıldızlar', icon: '✨' },
      none: { name: 'Mat Siyah (Minimalist Zen)', icon: '🌑' }
    };
    const info = modeMeta[newMode] || { name: newMode, icon: '🌤️' };
    this.updateAmbienceUI();
    if (this.ui) this.ui.showToast(`Atmosfer: ${info.name}`, info.icon);
  }

  updateAmbienceUI() {
    if (!this.rain) return;
    if (this.rain.currentMode === 'none') {
      if (this.rainBackdrop) this.rainBackdrop.classList.add('disabled');
      if (this.ambienceToggleBtn) this.ambienceToggleBtn.classList.remove('active-accent');
    } else {
      if (this.rainBackdrop) this.rainBackdrop.classList.remove('disabled');
      if (this.ambienceToggleBtn) this.ambienceToggleBtn.classList.add('active-accent');
    }
  }

  toggleSound() {
    this.audio.soundEnabled = !this.audio.soundEnabled;
    try {
      localStorage.setItem('aeroflip_sound_enabled', String(this.audio.soundEnabled));
    } catch (e) {
      console.warn('Failed to persist sound state', e);
    }
    this.updateSoundBtnUI();

    if (this.audio.soundEnabled) {
      this.audio.playMechanicalClick();
      if (this.ui) this.ui.showToast('Mekanik Kart Sesi Açık', '🔊');
    } else {
      if (this.ui) this.ui.showToast('Mekanik Kart Sesi Sessize Alındı', '🔇');
    }
  }

  updateSoundBtnUI() {
    if (!this.soundToggleBtn) return;
    const soundOnIcon = this.soundToggleBtn.querySelector('.sound-on');
    const soundOffIcon = this.soundToggleBtn.querySelector('.sound-off');

    if (soundOnIcon && soundOffIcon) {
      if (this.audio.soundEnabled) {
        soundOnIcon.classList.remove('hidden');
        soundOffIcon.classList.add('hidden');
      } else {
        soundOnIcon.classList.add('hidden');
        soundOffIcon.classList.remove('hidden');
      }
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        if (this.ui) this.ui.showToast('Tam Ekran Masa Saati Modu Açık [F]', '⛶');
      }).catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          if (this.ui) this.ui.showToast('Tam Ekrandan Çıkıldı', '🗗');
        });
      }
    }
  }

  /* ============================================================
     EVENT LISTENERS SETUP
     ============================================================ */
  setupEventListeners() {
    // Mode Switchers
    if (this.modeClockBtn) {
      this.modeClockBtn.addEventListener('click', () => this.switchMode('clock'));
    }
    this.modeStopwatchBtn.addEventListener('click', () => this.switchMode('stopwatch'));
    this.modeTimerBtn.addEventListener('click', () => this.switchMode('timer'));

    // Clock Format 12h/24h Toggle Button
    if (this.toggle1224Btn) {
      this.toggle1224Btn.addEventListener('click', () => this.toggleClockFormat());
    }

    // Timer Setup Start Button
    this.setupStartBtn.addEventListener('click', () => this.start());

    // Timer Spinner Buttons
    this.hourUpBtn.addEventListener('click', () => this.adjustTimerInput('hour', 1));
    this.hourDownBtn.addEventListener('click', () => this.adjustTimerInput('hour', -1));
    this.minUpBtn.addEventListener('click', () => this.adjustTimerInput('min', 1));
    this.minDownBtn.addEventListener('click', () => this.adjustTimerInput('min', -1));
    this.secUpBtn.addEventListener('click', () => this.adjustTimerInput('sec', 1));
    this.secDownBtn.addEventListener('click', () => this.adjustTimerInput('sec', -1));

    // Direct Input Changes
    [this.timerInputHours, this.timerInputMinutes, this.timerInputSeconds].forEach(input => {
      input.addEventListener('change', () => this.syncTimerFromInputs());
      input.addEventListener('input', () => this.syncTimerFromInputs());
    });

    // Preset Buttons
    document.querySelectorAll('.preset-pill[data-time]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sec = parseInt(btn.getAttribute('data-time'), 10);
        this.addPresetTime(sec);
      });
    });
    this.clearTimerPresetBtn.addEventListener('click', () => this.clearTimerInputs());

    // Controls
    this.startPauseBtn.addEventListener('click', () => this.toggleStartPause());
    this.resetBtn.addEventListener('click', () => this.reset());
    this.lapBtn.addEventListener('click', () => this.addLap());

    // Alarm dismiss
    this.dismissAlarmBtn.addEventListener('click', () => this.stopAlarm());

    // Ambience & Sound & Fullscreen
    if (this.ambienceToggleBtn) {
      this.ambienceToggleBtn.addEventListener('click', () => this.cycleAmbience());
    }
    this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    // Auto-manage Web Worker vs requestAnimationFrame on background tab switch
    document.addEventListener('visibilitychange', () => {
      const anyRunning = this.stopwatch.isRunning || this.timer.isRunning;
      if (document.hidden) {
        if (anyRunning && this.worker) {
          this.worker.postMessage('start');
        }
      } else {
        if (this.worker) {
          this.worker.postMessage('stop');
        }
        if (anyRunning && !this.timerId) {
          this.lastTimerFrameTime = performance.now();
          this.timerId = requestAnimationFrame((t) => this.update(t));
        }
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.stopwatchApp = new FlipStopwatchApp();
});
