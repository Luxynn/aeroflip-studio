const TARGET_TIMER_FRAME_INTERVAL_MS = 40; // 25 FPS throttle to minimize GPU/DWM load
const MS_DOM_THROTTLE_INTERVAL_MS = 33;    // ~30 FPS DOM update cap
const DEFAULT_TIMER_DURATION_MS = 5 * 60 * 1000;
const ALARM_CHIME_INTERVAL_MS = 2000;

class FlipStopwatchApp {
  constructor() {
    // Mode: 'clock' | 'stopwatch' | 'timer'
    this.mode = 'stopwatch';

    // Core State
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerId = null;
    this.isRunning = false;
    this.rainEnabled = true;
    this.laps = [];
    this.lastLapTime = 0;
    this.lastMsDomUpdate = 0;
    this.lastTimerFrameTime = 0;

    // Clock Mode State
    this.clockInterval = null;
    this.clockFormat = localStorage.getItem('fliqlo_clock_format') || '24h'; // '24h' | '12h'

    // Timer State
    this.timerDurationMs = DEFAULT_TIMER_DURATION_MS;
    this.timerRemainingMs = DEFAULT_TIMER_DURATION_MS;
    this.timerInitialSetSec = 300;
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

    this.init();
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
              }, 25);
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
        if (e.data === 'tick' && this.isRunning) {
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

    // Default mode setup
    const defMode = localStorage.getItem('fliqlo_default_mode') || 'stopwatch';
    if (defMode !== 'stopwatch') {
      this.switchMode(defMode);
    }
  }

  /* ============================================================
     MODE SWITCHER & CLOCK MODE
     ============================================================ */
  switchMode(newMode) {
    if (this.mode === newMode) return;

    if (this.mode === 'clock') {
      this.stopClock();
    } else {
      this.reset();
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
      if (this.msLabel) this.msLabel.textContent = 'MS';
      if (this.msDisplay) this.msDisplay.textContent = '.00';
      this.lapBtnText.textContent = 'Tur';
      this.lapsHeaderSplit.textContent = 'TUR FARKI';
      this.lapsHeaderTotal.textContent = 'TOPLAM SÜRE';
      this.cards.setAllInstant('00', '00', '00');
    } else {
      if (this.modeTimerBtn) this.modeTimerBtn.classList.add('active');
      this.timerSetupPanel.classList.remove('hidden');
      this.fliqloStage.classList.add('hidden');
      this.fliqloControlsBar.classList.add('hidden');
      if (this.timerControlsGroup) this.timerControlsGroup.classList.remove('hidden');
      if (this.clockControlsGroup) this.clockControlsGroup.classList.add('hidden');
      if (this.clockInfoBanner) this.clockInfoBanner.classList.add('hidden');
      if (this.msLabel) this.msLabel.textContent = 'MS';
      if (this.msDisplay) this.msDisplay.textContent = '.00';
      this.lapBtnText.textContent = 'Ara Kayıt';
      this.lapsHeaderSplit.textContent = 'FARK';
      this.lapsHeaderTotal.textContent = 'KALAN SÜRE';
      this.syncTimerFromInputs();
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

  toggleClockFormat() {
    this.clockFormat = this.clockFormat === '24h' ? '12h' : '24h';
    localStorage.setItem('fliqlo_clock_format', this.clockFormat);
    this.updateClockFormatBtnUI();
    if (this.ui) this.ui.showToast(this.clockFormat === '24h' ? '24 Saat Formatı Aktif' : '12 Saat Formatı (AM/PM) Aktif', '🕒');
    if (this.mode === 'clock') {
      this.tickClock(true);
    }
  }

  updateClockFormatBtnUI() {
    if (this.clockFormatText) {
      this.clockFormatText.textContent = this.clockFormat === '24h' ? '24 Saat Formatı' : '12 Saat (AM/PM)';
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
      this.clockDateText.textContent = now.toLocaleDateString('tr-TR', options);
    }

    // Update Pill
    if (this.clockFormat === '12h') {
      if (this.msLabel) this.msLabel.textContent = 'DÖNEM';
      if (this.msDisplay) this.msDisplay.textContent = ampm;
    } else {
      if (this.msLabel) this.msLabel.textContent = 'MOD';
      if (this.msDisplay) this.msDisplay.textContent = '24H';
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

    const totalMs = (h * 3600 + m * 60 + s) * 1000;
    this.timerDurationMs = totalMs;
    this.timerRemainingMs = totalMs;
    this.timerInitialSetSec = h * 3600 + m * 60 + s;

    this.cards.setAllInstant(String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0'));
    this.msDisplay.textContent = '.00';
  }

  adjustTimerInput(type, delta) {
    if (this.isRunning) return;

    let input = type === 'hour' ? this.timerInputHours : (type === 'min' ? this.timerInputMinutes : this.timerInputSeconds);
    let max = type === 'hour' ? 99 : 59;
    let val = (parseInt(input.value, 10) || 0) + delta;

    if (val < 0) val = max;
    if (val > max) val = 0;

    input.value = String(val).padStart(2, '0');
    this.syncTimerFromInputs();
  }

  addPresetTime(secondsToAdd) {
    if (this.isRunning) return;

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
    if (this.isRunning) return;
    this.timerInputHours.value = '00';
    this.timerInputMinutes.value = '00';
    this.timerInputSeconds.value = '00';
    this.syncTimerFromInputs();
  }

  /* ============================================================
     TICK & RENDER LOOP (25 FPS Throttled)
     ============================================================ */
  onWorkerTick() {
    if (!this.isRunning || !document.hidden) return;
    const now = performance.now();
    if (this.mode === 'stopwatch') {
      const currentElapsed = this.elapsedTime + (now - this.startTime);
      this.updateDisplay(currentElapsed);
    } else if (this.mode === 'timer') {
      const currentElapsed = now - this.startTime;
      const remaining = this.timerRemainingMs - currentElapsed;
      if (remaining <= 0) {
        this.updateDisplay(0);
        this.timerFinished();
      } else {
        this.updateDisplay(remaining);
      }
    }
  }

  update(timestamp = performance.now()) {
    if (!this.isRunning) return;

    this.timerId = requestAnimationFrame((t) => this.update(t));

    const elapsed = timestamp - this.lastTimerFrameTime;
    if (elapsed < TARGET_TIMER_FRAME_INTERVAL_MS) {
      return; // 25 FPS throttle to minimize GPU/DWM load
    }
    this.lastTimerFrameTime = timestamp - (elapsed % TARGET_TIMER_FRAME_INTERVAL_MS);

    if (this.mode === 'stopwatch') {
      const currentElapsed = this.elapsedTime + (timestamp - this.startTime);
      this.updateDisplay(currentElapsed);
    } else if (this.mode === 'timer') {
      const currentElapsed = timestamp - this.startTime;
      const remaining = this.timerRemainingMs - currentElapsed;

      if (remaining <= 0) {
        this.updateDisplay(0);
        this.timerFinished();
        return;
      }

      this.updateDisplay(remaining);
    }
  }

  updateDisplay(msValue) {
    const totalSeconds = Math.floor(msValue / 1000);
    const ms = Math.floor((msValue % 1000) / 10);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const hStr = String(hours).padStart(2, '0');
    const mStr = String(minutes).padStart(2, '0');
    const sStr = String(seconds).padStart(2, '0');
    const msStr = '.' + String(ms).padStart(2, '0');

    this.cards.updateDisplay(hStr, mStr, sStr);

    const now = performance.now();
    if (now - this.lastMsDomUpdate >= MS_DOM_THROTTLE_INTERVAL_MS || msValue === 0) {
      if (this.msDisplay) {
        this.msDisplay.textContent = msStr;
      }
      this.lastMsDomUpdate = now;
    }
  }

  timerFinished() {
    this.isRunning = false;
    cancelAnimationFrame(this.timerId);
    if (this.worker) this.worker.postMessage('stop');
    this.timerRemainingMs = 0;

    this.startPauseBtn.classList.remove('is-running');
    this.startPauseBtn.querySelector('.icon-play').classList.remove('hidden');
    this.startPauseBtn.querySelector('.icon-pause').classList.add('hidden');
    this.startPauseText.textContent = 'Başlat';

    this.saveSessionBtn.disabled = false;
    this.startAlarm();
  }

  /* ============================================================
     CONTROLS: START / PAUSE / RESET / LAP
     ============================================================ */
  start() {
    if (this.isRunning) return;

    if (this.mode === 'timer') {
      if (this.timerRemainingMs <= 0) {
        this.syncTimerFromInputs();
      }
      if (this.timerRemainingMs <= 0) {
        return;
      }

      this.timerSetupPanel.classList.add('hidden');
      this.fliqloStage.classList.remove('hidden');
      this.fliqloControlsBar.classList.remove('hidden');
    }

    this.audio.ensureAudioRunning();

    this.isRunning = true;
    this.startTime = performance.now();
    this.lastTimerFrameTime = this.startTime;
    this.timerId = requestAnimationFrame((t) => this.update(t));
    if (this.worker) this.worker.postMessage('start');

    this.startPauseBtn.classList.add('is-running');
    this.startPauseBtn.querySelector('.icon-play').classList.add('hidden');
    this.startPauseBtn.querySelector('.icon-pause').classList.remove('hidden');
    this.startPauseText.textContent = 'Durdur';

    this.resetBtn.disabled = false;
    this.lapBtn.disabled = false;
    this.saveSessionBtn.disabled = true;
  }

  pause() {
    if (!this.isRunning) return;

    this.isRunning = false;
    cancelAnimationFrame(this.timerId);
    if (this.worker) this.worker.postMessage('stop');

    const now = performance.now();
    if (this.mode === 'stopwatch') {
      this.elapsedTime += now - this.startTime;
    } else {
      this.timerRemainingMs -= now - this.startTime;
      if (this.timerRemainingMs < 0) this.timerRemainingMs = 0;
    }

    this.startPauseBtn.classList.remove('is-running');
    this.startPauseBtn.querySelector('.icon-play').classList.remove('hidden');
    this.startPauseBtn.querySelector('.icon-pause').classList.add('hidden');
    this.startPauseText.textContent = 'Devam';

    this.saveSessionBtn.disabled = false;
  }

  toggleStartPause() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    this.pause();
    this.stopAlarm();

    this.startTime = 0;
    this.elapsedTime = 0;
    this.laps = [];
    this.lastLapTime = 0;

    this.startPauseBtn.classList.remove('is-running');
    this.startPauseBtn.querySelector('.icon-play').classList.remove('hidden');
    this.startPauseBtn.querySelector('.icon-pause').classList.add('hidden');
    this.startPauseText.textContent = 'Başlat';

    this.resetBtn.disabled = true;
    this.lapBtn.disabled = true;
    this.saveSessionBtn.disabled = true;

    this.renderActiveLaps();

    if (this.mode === 'timer') {
      this.timerSetupPanel.classList.remove('hidden');
      this.fliqloStage.classList.add('hidden');
      this.fliqloControlsBar.classList.add('hidden');
      this.syncTimerFromInputs();
    } else if (this.mode === 'stopwatch') {
      this.cards.setAllInstant('00', '00', '00');
      this.msDisplay.textContent = '.00';
    }
  }

  addLap() {
    if (!this.isRunning && this.elapsedTime === 0 && this.timerRemainingMs === this.timerDurationMs) return;

    const now = performance.now();

    if (this.mode === 'stopwatch') {
      const currentTotal = this.elapsedTime + (now - this.startTime);
      const splitTime = currentTotal - this.lastLapTime;
      this.lastLapTime = currentTotal;

      this.laps.unshift({
        index: this.laps.length + 1,
        split: splitTime,
        total: currentTotal,
        mode: 'stopwatch'
      });
    } else {
      const currentElapsed = now - this.startTime;
      const remaining = Math.max(0, this.timerRemainingMs - currentElapsed);
      const elapsedFromTotal = this.timerDurationMs - remaining;
      const splitTime = elapsedFromTotal - this.lastLapTime;
      this.lastLapTime = elapsedFromTotal;

      this.laps.unshift({
        index: this.laps.length + 1,
        split: splitTime,
        remaining: remaining,
        elapsed: elapsedFromTotal,
        mode: 'timer'
      });
    }

    this.renderActiveLaps();
  }

  renderActiveLaps() {
    if (this.laps.length === 0) {
      this.lapsContainer.classList.remove('has-laps');
      return;
    }

    this.lapsContainer.classList.add('has-laps');

    this.lapsList.innerHTML = this.laps.map(lap => {
      if (this.mode === 'stopwatch') {
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
    if (newMode === 'none') {
      this.rainBackdrop.classList.add('disabled');
      if (this.ambienceToggleBtn) this.ambienceToggleBtn.classList.remove('active-accent');
    } else {
      this.rainBackdrop.classList.remove('disabled');
      if (this.ambienceToggleBtn) this.ambienceToggleBtn.classList.add('active-accent');
    }
    if (this.ui) this.ui.showToast(`Atmosfer: ${info.name}`, info.icon);
  }

  toggleSound() {
    this.audio.soundEnabled = !this.audio.soundEnabled;
    const soundOnIcon = this.soundToggleBtn.querySelector('.sound-on');
    const soundOffIcon = this.soundToggleBtn.querySelector('.sound-off');

    if (this.audio.soundEnabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
      this.audio.playMechanicalClick();
      if (this.ui) this.ui.showToast('Mekanik Kart Sesi Açık', '🔊');
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
      if (this.ui) this.ui.showToast('Mekanik Kart Sesi Sessize Alındı', '🔇');
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
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.stopwatchApp = new FlipStopwatchApp();
});
