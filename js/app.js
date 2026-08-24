const DEFAULT_KEYBINDS = {
  startPause: { label: 'Başlat / Duraklat', code: 'Space', display: 'SPACE' },
  reset: { label: 'Sıfırla', code: 'KeyR', display: 'R' },
  lap: { label: 'Tur / Ara Kayıt', code: 'KeyL', display: 'L' },
  clockMode: { label: 'Saat Modu', code: 'KeyC', display: 'C' },
  stopwatchMode: { label: 'Kronometre Modu', code: 'KeyW', display: 'W' },
  timerMode: { label: 'Geri Sayım Modu', code: 'KeyT', display: 'T' },
  wakeLock: { label: 'Ekranı Uyanık Tut (Wake Lock)', code: 'KeyK', display: 'K' },
  sound: { label: 'Mekanik Kart Sesi', code: 'KeyS', display: 'S' },
  rain: { label: 'Yağmur Efekti', code: 'KeyY', display: 'Y' },
  fullscreen: { label: 'Tam Ekran Modu', code: 'KeyF', display: 'F' },
  history: { label: 'Kayıtlar & Kıyaslama', code: 'KeyH', display: 'H' },
  settings: { label: 'Ayarlar Modalı', code: 'KeyO', display: 'O' }
};

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

    // Settings & Keybinds State
    this.keybinds = this.loadKeybinds();
    this.recordingActionKey = null;
    this.activeSettingsTab = 'shortcuts';
    this.appLang = localStorage.getItem('fliqlo_lang') || 'tr';
    this.defaultMode = localStorage.getItem('fliqlo_default_mode') || 'stopwatch';

    // Clock Mode State
    this.clockInterval = null;
    this.clockFormat = localStorage.getItem('fliqlo_clock_format') || '24h'; // '24h' | '12h'

    // Timer State
    this.timerDurationMs = 5 * 60 * 1000;
    this.timerRemainingMs = 5 * 60 * 1000;
    this.timerInitialSetSec = 300;
    this.alarmInterval = null;

    // Screen Wake Lock State
    this.wakeLock = null;
    this.wakeLockEnabled = false;

    // Web Worker Background Ticker
    this.worker = null;
    this.initWorker();

    // Filter & Selection
    this.historyFilter = 'stopwatch';
    this.selectedSessionIds = new Set();

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

    // DOM Elements
    this.bindDomElements();
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
    this.wakeLockBtn = document.getElementById('wakeLockBtn');
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
    this.historyModalBtn = document.getElementById('historyModalBtn');
    this.sessionCountBadge = document.getElementById('sessionCountBadge');
    this.soundToggleBtn = document.getElementById('soundToggleBtn');
    this.fullscreenBtn = document.getElementById('fullscreenBtn');
    this.ambienceToggleBtn = document.getElementById('ambienceToggleBtn') || document.getElementById('rainToggleBtn');
    this.taskGoalBar = document.getElementById('taskGoalBar');
    this.taskGoalInput = document.getElementById('taskGoalInput');
    this.taskClearBtn = document.getElementById('taskClearBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.lapsContainer = document.getElementById('lapsContainer');
    this.lapsList = document.getElementById('lapsList');
    this.lapsHeaderSplit = document.getElementById('lapsHeaderSplit');
    this.lapsHeaderTotal = document.getElementById('lapsHeaderTotal');

    this.alarmToast = document.getElementById('alarmToast');
    this.dismissAlarmBtn = document.getElementById('dismissAlarmBtn');

    this.saveModalBackdrop = document.getElementById('saveModalBackdrop');
    this.saveModalTitle = document.getElementById('saveModalTitle');
    this.closeSaveModalBtn = document.getElementById('closeSaveModalBtn');
    this.cancelSaveBtn = document.getElementById('cancelSaveBtn');
    this.confirmSaveBtn = document.getElementById('confirmSaveBtn');
    this.saveSummaryLabel1 = document.getElementById('saveSummaryLabel1');
    this.saveSummaryLabel2 = document.getElementById('saveSummaryLabel2');
    this.saveSummaryTotal = document.getElementById('saveSummaryTotal');
    this.saveSummaryLaps = document.getElementById('saveSummaryLaps');
    this.sessionNameInput = document.getElementById('sessionNameInput');

    this.historyModalBackdrop = document.getElementById('historyModalBackdrop');
    this.closeHistoryModalBtn = document.getElementById('closeHistoryModalBtn');
    this.tabSavedList = document.getElementById('tabSavedList');
    this.tabCompare = document.getElementById('tabCompare');
    this.viewSavedList = document.getElementById('viewSavedList');
    this.viewCompare = document.getElementById('viewCompare');
    this.filterStopwatchBtn = document.getElementById('filterStopwatchBtn');
    this.filterTimerBtn = document.getElementById('filterTimerBtn');
    this.countStopwatchBadge = document.getElementById('countStopwatchBadge');
    this.countTimerBadge = document.getElementById('countTimerBadge');
    this.savedSessionsList = document.getElementById('savedSessionsList');
    this.selectionStatus = document.getElementById('selectionStatus');
    this.launchCompareBtn = document.getElementById('launchCompareBtn');
    this.selectAllCheckbox = document.getElementById('selectAllCheckbox');
    this.selectAllLabel = document.getElementById('selectAllLabel');
    this.selectAllToggleBtn = document.getElementById('selectAllToggleBtn');

    // Settings Modal Elements
    this.settingsModalBtn = document.getElementById('settingsModalBtn');
    this.settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
    this.closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');
    this.tabSettingsShortcuts = document.getElementById('tabSettingsShortcuts');
    this.tabSettingsGeneral = document.getElementById('tabSettingsGeneral');
    this.tabSettingsData = document.getElementById('tabSettingsData');
    this.viewSettingsShortcuts = document.getElementById('viewSettingsShortcuts');
    this.viewSettingsGeneral = document.getElementById('viewSettingsGeneral');
    this.viewSettingsData = document.getElementById('viewSettingsData');
    this.shortcutsListGrid = document.getElementById('shortcutsListGrid');
    this.resetShortcutsBtn = document.getElementById('resetShortcutsBtn');
    this.langTrBtn = document.getElementById('langTrBtn');
    this.langEnBtn = document.getElementById('langEnBtn');
    this.defaultModeSelect = document.getElementById('defaultModeSelect');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    this.importBackupBtn = document.getElementById('importBackupBtn');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');

    // Global Tooltip and Toast elements
    this.appTooltip = document.getElementById('appTooltip');
    this.tooltipTitle = document.getElementById('tooltipTitle');
    this.tooltipSub = document.getElementById('tooltipSub');
    this.quickToast = document.getElementById('quickToast');
    this.toastIcon = document.getElementById('toastIcon');
    this.toastText = document.getElementById('toastText');
    this.toastTimeout = null;

    // Zen Mode State
    this.zenTimeout = null;
  }

  init() {
    this.setupEventListeners();
    this.setupTooltipEngine();
    this.setupZenMode();
    this.setupTaskGoal();
    this.updateSessionBadge();
    this.updateClockFormatBtnUI();
    this.renderShortcutsGrid();
    this.applyInitialSettings();
  }

  loadKeybinds() {
    try {
      const saved = localStorage.getItem('fliqlo_keybinds');
      if (saved) {
        return { ...DEFAULT_KEYBINDS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Failed to load keybinds', e);
    }
    return JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
  }

  saveKeybinds() {
    try {
      localStorage.setItem('fliqlo_keybinds', JSON.stringify(this.keybinds));
    } catch (e) {
      console.warn('Failed to save keybinds', e);
    }
  }

  resetKeybinds() {
    this.keybinds = JSON.parse(JSON.stringify(DEFAULT_KEYBINDS));
    this.saveKeybinds();
    this.renderShortcutsGrid();
    this.showToast('Tüm kısayollar varsayılana sıfırlandı', '🔄');
  }

  formatKeyDisplay(code) {
    if (!code) return 'YOK';
    if (code === 'Space') return 'SPACE';
    if (code.startsWith('Key')) return code.slice(3).toUpperCase();
    if (code.startsWith('Digit')) return code.slice(5);
    if (code === 'Escape') return 'ESC';
    if (code === 'Comma') return ',';
    if (code === 'Period') return '.';
    return code.toUpperCase();
  }

  renderShortcutsGrid() {
    if (!this.shortcutsListGrid) return;
    this.shortcutsListGrid.innerHTML = Object.entries(this.keybinds).map(([actionKey, item]) => {
      const display = item.display || this.formatKeyDisplay(item.code);
      return `
        <div class="shortcut-row">
          <span class="shortcut-label">${item.label}</span>
          <button class="keybind-btn" data-action="${actionKey}" title="Değiştirmek için tıklayın">
            ${display}
          </button>
        </div>
      `;
    }).join('');
  }

  startRecordingKeybind(actionKey, buttonEl) {
    if (this.recordingActionKey) {
      this.renderShortcutsGrid();
    }

    this.recordingActionKey = actionKey;
    buttonEl.classList.add('recording');
    buttonEl.textContent = 'Tuşa Basın...';
    this.showToast(`"${this.keybinds[actionKey].label}" için bir tuşa basın`, '⌨️');
  }

  openSettingsModal() {
    if (this.settingsModalBackdrop) {
      this.settingsModalBackdrop.classList.remove('hidden');
      this.renderShortcutsGrid();
      this.switchSettingsTab(this.activeSettingsTab || 'shortcuts');
    }
  }

  closeSettingsModal() {
    if (this.recordingActionKey) {
      this.recordingActionKey = null;
      this.renderShortcutsGrid();
    }
    if (this.settingsModalBackdrop) {
      this.settingsModalBackdrop.classList.add('hidden');
    }
  }

  switchSettingsTab(tab) {
    this.activeSettingsTab = tab;
    const tabs = [
      { id: 'shortcuts', btn: this.tabSettingsShortcuts, view: this.viewSettingsShortcuts },
      { id: 'general', btn: this.tabSettingsGeneral, view: this.viewSettingsGeneral },
      { id: 'data', btn: this.tabSettingsData, view: this.viewSettingsData }
    ];

    tabs.forEach(t => {
      if (t.btn && t.view) {
        if (t.id === tab) {
          t.btn.classList.add('active');
          t.view.classList.add('active');
        } else {
          t.btn.classList.remove('active');
          t.view.classList.remove('active');
        }
      }
    });
  }

  applyInitialSettings() {
    if (this.defaultModeSelect) {
      this.defaultModeSelect.value = this.defaultMode;
    }
    if (this.appLang === 'en') {
      if (this.langEnBtn) this.langEnBtn.classList.add('active');
      if (this.langTrBtn) this.langTrBtn.classList.remove('active');
    } else {
      if (this.langTrBtn) this.langTrBtn.classList.add('active');
      if (this.langEnBtn) this.langEnBtn.classList.remove('active');
    }
  }

  setAppLanguage(lang) {
    this.appLang = lang;
    localStorage.setItem('fliqlo_lang', lang);
    if (lang === 'tr') {
      if (this.langTrBtn) this.langTrBtn.classList.add('active');
      if (this.langEnBtn) this.langEnBtn.classList.remove('active');
      this.showToast('Uygulama dili Türkçe olarak seçildi 🇹🇷', '🌍');
    } else {
      if (this.langEnBtn) this.langEnBtn.classList.add('active');
      if (this.langTrBtn) this.langTrBtn.classList.remove('active');
      this.showToast('Language set to English 🇬🇧 (Ready for translation)', '🌍');
    }
  }

  setDefaultMode(mode) {
    this.defaultMode = mode;
    localStorage.setItem('fliqlo_default_mode', mode);
    this.showToast(`Varsayılan başlangıç modu güncellendi: ${mode.toUpperCase()}`, '⚙️');
  }

  exportJsonData() {
    const data = this.storage.getAll();
    if (data.length === 0) {
      this.showToast('Dışa aktarılacak kayıtlı oturum bulunamadı', 'ℹ️');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fliqlo-sessions-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Oturum verileri JSON olarak indirildi', '💾');
  }

  exportCsvData() {
    const data = this.storage.getAll();
    if (data.length === 0) {
      this.showToast('Dışa aktarılacak kayıtlı oturum bulunamadı', 'ℹ️');
      return;
    }
    let csv = 'ID,Name,Type,Date,TotalTimeMs,FormattedTotal\n';
    data.forEach(s => {
      const timeMs = s.totalMs || s.elapsedMs || 0;
      csv += `"${s.id}","${s.name.replace(/"/g, '""')}","${s.type}","${s.date}",${timeMs},"${FliqloUtils.formatTime(timeMs)}"\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fliqlo-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('Oturum verileri CSV tablosu olarak indirildi', '📊');
  }

  importBackupData() {
    if (this.importFileInput) {
      this.importFileInput.click();
    }
  }

  handleFileImport(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (!Array.isArray(imported)) {
          throw new Error('Geçersiz dosya formatı.');
        }

        let addedCount = 0;
        const current = this.storage.getAll();
        const existingIds = new Set(current.map(s => s.id));

        imported.forEach(sess => {
          if (sess && sess.id && !existingIds.has(sess.id)) {
            current.push(sess);
            addedCount++;
          }
        });

        this.storage.save();
        this.updateSessionBadge();
        this.renderSavedList();
        this.showToast(`${addedCount} adet yeni oturum yedeği içe aktarıldı! ✅`, '📥');
      } catch (err) {
        console.error('Import error', err);
        this.showToast('Geçersiz JSON yedek dosyası', '⚠️');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  setupZenMode() {
    const resetZenTimer = () => {
      if (document.body.classList.contains('zen-mode')) {
        document.body.classList.remove('zen-mode');
      }
      if (this.zenTimeout) clearTimeout(this.zenTimeout);

      const hasOpenModal = !!document.querySelector('.modal-backdrop:not(.hidden)');
      if ((this.isRunning || this.mode === 'clock') && !hasOpenModal) {
        this.zenTimeout = setTimeout(() => {
          const isStillOpen = !!document.querySelector('.modal-backdrop:not(.hidden)');
          if ((this.isRunning || this.mode === 'clock') && !isStillOpen) {
            document.body.classList.add('zen-mode');
          }
        }, 3500);
      }
    };

    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetZenTimer, { passive: true });
    });
  }

  setupTaskGoal() {
    if (!this.taskGoalInput) return;
    const saved = localStorage.getItem('fliqlo_current_task') || '';
    this.taskGoalInput.value = saved;
    this.updateTaskClearBtn();

    this.taskGoalInput.addEventListener('input', () => {
      localStorage.setItem('fliqlo_current_task', this.taskGoalInput.value);
      this.updateTaskClearBtn();
    });

    if (this.taskClearBtn) {
      this.taskClearBtn.addEventListener('click', () => {
        this.taskGoalInput.value = '';
        localStorage.removeItem('fliqlo_current_task');
        this.updateTaskClearBtn();
        this.showToast('Odaklanma hedefi temizlendi', '🧹');
      });
    }
  }

  updateTaskClearBtn() {
    if (!this.taskClearBtn || !this.taskGoalInput) return;
    if (this.taskGoalInput.value.trim().length > 0) {
      this.taskClearBtn.classList.remove('hidden');
    } else {
      this.taskClearBtn.classList.add('hidden');
    }
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
    this.showToast(`Atmosfer: ${info.name}`, info.icon);
  }

  clearAllData() {
    if (confirm('Tüm kayıtlı kronometre ve geri sayım oturumlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      localStorage.removeItem('fliqlo_saved_sessions');
      this.storage.sessions = [];
      this.updateSessionBadge();
      this.renderSavedList();
      this.showToast('Tüm oturum kayıtları temizlendi', '🗑️');
    }
  }

  showToast(message, icon = '💡') {
    if (!this.quickToast || !this.toastText) return;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    if (this.toastIcon) this.toastIcon.textContent = icon;
    this.toastText.textContent = message;

    this.quickToast.classList.add('show');
    this.toastTimeout = setTimeout(() => {
      this.quickToast.classList.remove('show');
    }, 2800);
  }

  setupTooltipEngine() {
    if (!this.appTooltip) return;

    document.addEventListener('mouseover', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (!target) return;

      const title = target.getAttribute('data-tooltip') || '';
      const sub = target.getAttribute('data-tooltip-sub') || '';

      if (!title && !sub) return;

      if (this.tooltipTitle) this.tooltipTitle.textContent = title;
      if (this.tooltipSub) this.tooltipSub.textContent = sub;

      const rect = target.getBoundingClientRect();
      const tooltipRect = this.appTooltip.getBoundingClientRect();

      let left = rect.left + rect.width / 2 - tooltipRect.width / 2;
      let top = rect.bottom + 8;

      if (left < 10) left = 10;
      if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
      }
      if (top + tooltipRect.height > window.innerHeight - 10) {
        top = rect.top - tooltipRect.height - 8;
      }

      this.appTooltip.style.left = `${left}px`;
      this.appTooltip.style.top = `${top}px`;
      this.appTooltip.classList.add('visible');
    }, true);

    document.addEventListener('mouseout', (e) => {
      const target = e.target.closest('[data-tooltip]');
      if (target && this.appTooltip) {
        this.appTooltip.classList.remove('visible');
      }
    }, true);
  }

  startAlarm() {
    this.audio.playAlarmChime();
    this.alarmToast.classList.remove('hidden');
    this.alarmInterval = setInterval(() => {
      this.audio.playAlarmChime();
    }, 2000);
  }

  stopAlarm() {
    if (this.alarmInterval) {
      clearInterval(this.alarmInterval);
      this.alarmInterval = null;
    }
    this.alarmToast.classList.add('hidden');
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLockEnabled = true;
        if (this.wakeLockBtn) {
          this.wakeLockBtn.classList.add('active-wake');
          this.wakeLockBtn.title = 'Ekran Uyanık Tutuluyor (Aktif)';
        }
        this.showToast('Ekran Uyanık Tutma Açık — Cihaz uyku moduna geçmeyecek', '☀️');
        this.wakeLock.addEventListener('release', () => {
          if (!this.wakeLockEnabled && this.wakeLockBtn) {
            this.wakeLockBtn.classList.remove('active-wake');
            this.wakeLockBtn.title = 'Ekranı Uyanık Tut (Wake Lock)';
          }
        });
      } catch (err) {
        console.warn('Wake Lock request error:', err);
        this.showToast('Tarayıcınız Wake Lock iznini onaylamadı', '⚠️');
      }
    } else {
      this.showToast('Tarayıcınız Wake Lock API desteklemiyor', '⚠️');
    }
  }

  releaseWakeLock() {
    this.wakeLockEnabled = false;
    if (this.wakeLock) {
      this.wakeLock.release();
      this.wakeLock = null;
    }
    if (this.wakeLockBtn) {
      this.wakeLockBtn.classList.remove('active-wake');
      this.wakeLockBtn.title = 'Ekranı Uyanık Tut (Wake Lock)';
    }
    this.showToast('Ekran Uyanık Tutma Kapalı — Standart uyku modu devrede', '🌙');
  }

  toggleWakeLock() {
    if (this.wakeLockEnabled) {
      this.releaseWakeLock();
    } else {
      this.requestWakeLock();
    }
  }

  switchMode(newMode) {
    if (this.mode === newMode) return;

    if (this.mode === 'clock') {
      this.stopClock();
    } else {
      this.reset();
    }

    this.mode = newMode;

    // Reset all mode pills
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
    this.showToast(this.clockFormat === '24h' ? '24 Saat Formatı Aktif' : '12 Saat Formatı (AM/PM) Aktif', '🕒');
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

  onWorkerTick() {
    if (!this.isRunning) return;
    const now = performance.now();
    if (this.mode === 'stopwatch') {
      const currentElapsed = this.elapsedTime + (now - this.startTime);
      if (document.hidden) {
        this.updateDisplay(currentElapsed);
      }
    } else if (this.mode === 'timer') {
      const currentElapsed = now - this.startTime;
      const remaining = this.timerRemainingMs - currentElapsed;
      if (remaining <= 0) {
        this.updateDisplay(0);
        this.timerFinished();
      } else if (document.hidden) {
        this.updateDisplay(remaining);
      }
    }
  }

  update() {
    const now = performance.now();

    if (this.mode === 'stopwatch') {
      const currentElapsed = this.elapsedTime + (now - this.startTime);
      this.updateDisplay(currentElapsed);

      if (this.isRunning) {
        this.timerId = requestAnimationFrame(() => this.update());
      }
    } else if (this.mode === 'timer') {
      const currentElapsed = now - this.startTime;
      const remaining = this.timerRemainingMs - currentElapsed;

      if (remaining <= 0) {
        this.updateDisplay(0);
        this.timerFinished();
        return;
      }

      this.updateDisplay(remaining);

      if (this.isRunning) {
        this.timerId = requestAnimationFrame(() => this.update());
      }
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
    this.msDisplay.textContent = msStr;
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
    this.timerId = requestAnimationFrame(() => this.update());
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
      this.timerRemainingMs -= (now - this.startTime);
      if (this.timerRemainingMs < 0) this.timerRemainingMs = 0;
    }

    this.startPauseBtn.classList.remove('is-running');
    this.startPauseBtn.querySelector('.icon-play').classList.remove('hidden');
    this.startPauseBtn.querySelector('.icon-pause').classList.add('hidden');
    this.startPauseText.textContent = 'Devam Et';

    this.lapBtn.disabled = true;

    const hasTime = this.mode === 'stopwatch' ? this.elapsedTime > 0 : (this.timerDurationMs - this.timerRemainingMs > 0);
    if (hasTime) {
      this.saveSessionBtn.disabled = false;
    }
  }

  toggleStartPause() {
    if (this.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  reset() {
    this.isRunning = false;
    cancelAnimationFrame(this.timerId);
    if (this.worker) this.worker.postMessage('stop');
    this.stopAlarm();

    this.startPauseBtn.classList.remove('is-running');
    this.startPauseBtn.querySelector('.icon-play').classList.remove('hidden');
    this.startPauseBtn.querySelector('.icon-pause').classList.add('hidden');
    this.startPauseText.textContent = 'Başlat';

    this.resetBtn.disabled = true;
    this.lapBtn.disabled = true;
    this.saveSessionBtn.disabled = true;
    this.laps = [];
    this.lastLapTime = 0;

    this.lapsContainer.classList.remove('has-laps');
    this.lapsList.innerHTML = '';

    if (this.mode === 'stopwatch') {
      this.startTime = 0;
      this.elapsedTime = 0;
      this.cards.setAllInstant('00', '00', '00');
      this.msDisplay.textContent = '.00';
    } else {
      this.timerSetupPanel.classList.remove('hidden');
      this.fliqloStage.classList.add('hidden');
      this.fliqloControlsBar.classList.add('hidden');
      this.syncTimerFromInputs();
    }
  }

  addLap() {
    if (!this.isRunning) return;

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

  updateSessionBadge() {
    const counts = this.storage.getCounts();
    this.sessionCountBadge.textContent = counts.total;
    this.countStopwatchBadge.textContent = counts.stopwatch;
    this.countTimerBadge.textContent = counts.timer;
  }

  openSaveModal() {
    let duration = 0;
    let subInfo = '';

    if (this.mode === 'stopwatch') {
      duration = this.elapsedTime;
      subInfo = `${this.laps.length} Tur Kaydedildi`;
      this.saveModalTitle.textContent = 'KRONOMETRE OTURUMUNU KAYDET';
      this.saveSummaryLabel1.textContent = 'TOPLAM SÜRE';
      this.saveSummaryLabel2.textContent = 'TUR SAYISI';
      this.sessionNameInput.value = (this.taskGoalInput && this.taskGoalInput.value.trim()) || `Kronometre #${this.storage.getByType('stopwatch').length + 1}`;
    } else {
      const elapsed = this.timerDurationMs - this.timerRemainingMs;
      duration = elapsed;
      subInfo = `${FliqloUtils.formatTime(this.timerRemainingMs)} kala (${this.laps.length} Ara Kayıt)`;
      this.saveModalTitle.textContent = 'GERİ SAYIM OTURUMUNU KAYDET';
      this.saveSummaryLabel1.textContent = 'GEÇEN SÜRE';
      this.saveSummaryLabel2.textContent = 'KALAN SÜRE / ARA KAYIT';
      this.sessionNameInput.value = (this.taskGoalInput && this.taskGoalInput.value.trim()) || `Geri Sayım (${FliqloUtils.formatTimeHMS(this.timerDurationMs)})`;
    }

    if (duration <= 0 && this.timerRemainingMs === this.timerDurationMs) return;

    this.saveSummaryTotal.textContent = FliqloUtils.formatTime(duration);
    this.saveSummaryLaps.textContent = subInfo;

    this.saveModalBackdrop.classList.remove('hidden');
    setTimeout(() => this.sessionNameInput.focus(), 100);
  }

  closeSaveModal() {
    this.saveModalBackdrop.classList.add('hidden');
  }

  confirmSaveSession() {
    const name = this.sessionNameInput.value.trim() || (this.mode === 'stopwatch' ? 'Kronometre' : 'Geri Sayım');
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    let newSession = null;

    if (this.mode === 'stopwatch') {
      let bestLap = this.laps.length > 0 ? Math.min(...this.laps.map(l => l.split)) : null;
      newSession = {
        id: Date.now().toString(),
        name: name,
        type: 'stopwatch',
        date: dateStr,
        timestamp: now.getTime(),
        totalMs: this.elapsedTime,
        laps: [...this.laps],
        bestLapMs: bestLap,
      };
    } else {
      const elapsed = this.timerDurationMs - this.timerRemainingMs;
      newSession = {
        id: Date.now().toString(),
        name: name,
        type: 'timer',
        date: dateStr,
        timestamp: now.getTime(),
        targetDurationMs: this.timerDurationMs,
        elapsedMs: elapsed,
        remainingMs: this.timerRemainingMs,
        laps: [...this.laps],
      };
    }

    this.storage.addSession(newSession);
    this.updateSessionBadge();
    this.closeSaveModal();

    this.historyFilter = this.mode;
    this.openHistoryModal();
  }

  openHistoryModal() {
    this.historyModalBackdrop.classList.remove('hidden');
    this.selectedSessionIds.clear();
    this.setHistoryFilter(this.historyFilter);
    this.switchTab('list');
  }

  closeHistoryModal() {
    if (this.analytics) this.analytics.hidePopover();
    this.historyModalBackdrop.classList.add('hidden');
  }

  setHistoryFilter(type) {
    if (this.analytics) this.analytics.hidePopover();
    this.historyFilter = type;
    this.selectedSessionIds.clear();

    if (type === 'stopwatch') {
      this.filterStopwatchBtn.classList.add('active');
      this.filterTimerBtn.classList.remove('active');
    } else {
      this.filterStopwatchBtn.classList.remove('active');
      this.filterTimerBtn.classList.add('active');
    }

    this.renderSavedList();
  }

  switchTab(tab) {
    if (this.analytics) this.analytics.hidePopover();
    if (tab === 'list') {
      this.tabSavedList.classList.add('active');
      this.tabCompare.classList.remove('active');
      this.viewSavedList.classList.add('active');
      this.viewCompare.classList.remove('active');
    } else {
      this.tabSavedList.classList.remove('active');
      this.tabCompare.classList.add('active');
      this.viewSavedList.classList.remove('active');
      this.viewCompare.classList.add('active');
      this.renderComparison();
    }
  }

  deleteSession(id) {
    this.storage.deleteSession(id);
    this.selectedSessionIds.delete(id);
    this.updateSessionBadge();
    this.renderSavedList();
  }

  toggleSelectSession(id) {
    if (this.selectedSessionIds.has(id)) {
      this.selectedSessionIds.delete(id);
    } else {
      this.selectedSessionIds.add(id);
    }
    this.renderSavedList();
  }

  toggleSelectAll() {
    const filtered = this.storage.getByType(this.historyFilter);
    if (filtered.length === 0) return;

    const allSelected = filtered.every(s => this.selectedSessionIds.has(s.id));

    if (allSelected) {
      filtered.forEach(s => this.selectedSessionIds.delete(s.id));
    } else {
      filtered.forEach(s => this.selectedSessionIds.add(s.id));
    }

    this.renderSavedList();
  }

  toggleLapExpand(id) {
    const target = document.getElementById(`lapsExp_${id}`);
    if (target) {
      target.classList.toggle('hidden');
    }
  }

  renderSavedList() {
    const filtered = this.storage.getByType(this.historyFilter);

    if (filtered.length === 0) {
      if (this.selectAllToggleBtn) this.selectAllToggleBtn.style.display = 'none';
      const typeText = this.historyFilter === 'stopwatch' ? 'Kronometre' : 'Geri Sayım';
      this.savedSessionsList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          </svg>
          <p>Henüz kaydedilmiş ${typeText} oturumu bulunmuyor.</p>
        </div>
      `;
      this.launchCompareBtn.disabled = true;
      this.selectionStatus.textContent = '0 oturum seçildi';
      return;
    }

    if (this.selectAllToggleBtn) this.selectAllToggleBtn.style.display = 'flex';

    const currentFilteredSelectedCount = filtered.filter(s => this.selectedSessionIds.has(s.id)).length;
    const allSelected = currentFilteredSelectedCount === filtered.length && filtered.length > 0;
    const someSelected = currentFilteredSelectedCount > 0 && currentFilteredSelectedCount < filtered.length;

    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.checked = allSelected;
      this.selectAllCheckbox.indeterminate = someSelected;
    }
    if (this.selectAllLabel) {
      this.selectAllLabel.textContent = allSelected ? 'Seçimi Kaldır' : 'Tümünü Seç';
    }

    const selectedCount = this.selectedSessionIds.size;
    this.launchCompareBtn.disabled = selectedCount < 2;
    this.selectionStatus.textContent = selectedCount >= 2 
      ? `${selectedCount} oturum seçildi (Kıyaslamaya hazır)`
      : `${selectedCount} oturum seçildi (Kıyaslamak için en az 2 ${this.historyFilter === 'stopwatch' ? 'kronometre' : 'geri sayım'} oturumu seçin)`;

    this.savedSessionsList.innerHTML = filtered.map(session => {
      const isSelected = this.selectedSessionIds.has(session.id);
      const hasLaps = session.laps && session.laps.length > 0;

      let timeDisplay = '';
      let subLabel = '';

      if (session.type === 'stopwatch') {
        timeDisplay = FliqloUtils.formatTime(session.totalMs);
        subLabel = `${session.laps.length} Tur`;
      } else {
        timeDisplay = `${FliqloUtils.formatTime(session.remainingMs)} kala`;
        subLabel = `Hedef: ${FliqloUtils.formatTimeHMS(session.targetDurationMs)} (${session.laps.length} Ara Kayıt)`;
      }

      return `
        <div class="session-card ${isSelected ? 'selected' : ''}" data-id="${session.id}">
          <div class="session-card-header">
            <div class="session-checkbox-wrap">
              <input type="checkbox" class="session-select-checkbox" data-action="select" data-id="${session.id}" ${isSelected ? 'checked' : ''}>
              <div class="session-title-meta">
                <h4>${session.name}</h4>
                <span class="session-date">${session.date}</span>
              </div>
            </div>

            <div class="session-time-display">
              <span class="session-total-time">${timeDisplay}</span>
              <span class="session-lap-count">${subLabel}</span>
              <div class="session-actions">
                ${hasLaps ? `
                  <button class="session-btn-icon" title="Detayları Göster/Gizle" data-action="expand" data-id="${session.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                ` : ''}
                <button class="session-btn-icon delete" title="Sil" data-action="delete" data-id="${session.id}">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
              </div>
            </div>
          </div>

          ${hasLaps ? `
            <div class="session-laps-expanded hidden" id="lapsExp_${session.id}">
              ${[...session.laps].sort((a, b) => (a.index || 0) - (b.index || 0)).map(l => {
                if (session.type === 'stopwatch') {
                  return `
                    <div class="session-lap-row ${l.split === session.bestLapMs ? 'best' : ''}">
                      <span>Tur #${String(l.index).padStart(2, '0')}</span>
                      <span>+${FliqloUtils.formatTime(l.split)}</span>
                      <span>${FliqloUtils.formatTime(l.total)}</span>
                    </div>
                  `;
                } else {
                  return `
                    <div class="session-lap-row">
                      <span>Ara Kayıt #${String(l.index).padStart(2, '0')}</span>
                      <span>+${FliqloUtils.formatTime(l.split)} fark</span>
                      <span style="color:#22c55e;">${FliqloUtils.formatTime(l.remaining)} kala</span>
                    </div>
                  `;
                }
              }).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  renderComparison() {
    const selected = this.storage.getAll().filter(s => this.selectedSessionIds.has(s.id));
    this.analytics.render(selected, this.historyFilter);
  }

  toggleRain() {
    this.rainEnabled = !this.rainEnabled;
    if (this.rainEnabled) {
      this.rainBackdrop.classList.remove('disabled');
      this.rainToggleBtn.classList.add('active-accent');
      this.rain.start();
      this.showToast('Yağmur & Fırtına Efekti Açık', '🌧️');
    } else {
      this.rainBackdrop.classList.add('disabled');
      this.rainToggleBtn.classList.remove('active-accent');
      this.rain.stop();
      this.showToast('Yağmur Efekti Kapatıldı', '🌤️');
    }
  }

  toggleSound() {
    this.audio.soundEnabled = !this.audio.soundEnabled;
    const soundOnIcon = this.soundToggleBtn.querySelector('.sound-on');
    const soundOffIcon = this.soundToggleBtn.querySelector('.sound-off');

    if (this.audio.soundEnabled) {
      soundOnIcon.classList.remove('hidden');
      soundOffIcon.classList.add('hidden');
      this.audio.playMechanicalClick();
      this.showToast('Mekanik Kart Sesi Açık', '🔊');
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
      this.showToast('Mekanik Kart Sesi Sessize Alındı', '🔇');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => {
        this.showToast('Tam Ekran Masa Saati Modu Açık [F]', '⛶');
      }).catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          this.showToast('Tam Ekrandan Çıkıldı', '🗗');
        });
      }
    }
  }

  setupEventListeners() {
    // Screen Wake Lock Button
    if (this.wakeLockBtn) {
      this.wakeLockBtn.addEventListener('click', () => this.toggleWakeLock());
    }

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

    // Visibility Change for Wake Lock re-acquisition
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.wakeLockEnabled) {
        this.requestWakeLock();
      }
    });

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

    // Save Session Modal Triggers
    this.saveSessionBtn.addEventListener('click', () => this.openSaveModal());
    this.closeSaveModalBtn.addEventListener('click', () => this.closeSaveModal());
    this.cancelSaveBtn.addEventListener('click', () => this.closeSaveModal());
    this.confirmSaveBtn.addEventListener('click', () => this.confirmSaveSession());
    this.sessionNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.confirmSaveSession();
    });

    // Saved Sessions Delegation (Select, Expand, Delete)
    this.savedSessionsList.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;
      
      const action = target.dataset.action;
      const id = target.dataset.id;
      if (!id) return;

      if (action === 'select') {
        this.toggleSelectSession(id);
      } else if (action === 'expand') {
        e.stopPropagation();
        this.toggleLapExpand(id);
      } else if (action === 'delete') {
        e.stopPropagation();
        this.deleteSession(id);
      }
    });

    // History & Compare Modal Triggers
    this.historyModalBtn.addEventListener('click', () => this.openHistoryModal());
    this.closeHistoryModalBtn.addEventListener('click', () => this.closeHistoryModal());
    this.tabSavedList.addEventListener('click', () => this.switchTab('list'));
    this.tabCompare.addEventListener('click', () => this.switchTab('compare'));
    this.launchCompareBtn.addEventListener('click', () => this.switchTab('compare'));

    // Settings Modal Triggers
    if (this.settingsModalBtn) {
      this.settingsModalBtn.addEventListener('click', () => this.openSettingsModal());
    }
    if (this.closeSettingsModalBtn) {
      this.closeSettingsModalBtn.addEventListener('click', () => this.closeSettingsModal());
    }
    if (this.tabSettingsShortcuts) {
      this.tabSettingsShortcuts.addEventListener('click', () => this.switchSettingsTab('shortcuts'));
    }
    if (this.tabSettingsGeneral) {
      this.tabSettingsGeneral.addEventListener('click', () => this.switchSettingsTab('general'));
    }
    if (this.tabSettingsData) {
      this.tabSettingsData.addEventListener('click', () => this.switchSettingsTab('data'));
    }
    if (this.resetShortcutsBtn) {
      this.resetShortcutsBtn.addEventListener('click', () => this.resetKeybinds());
    }
    if (this.shortcutsListGrid) {
      this.shortcutsListGrid.addEventListener('click', (e) => {
        const btn = e.target.closest('.keybind-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        if (action) {
          this.startRecordingKeybind(action, btn);
        }
      });
    }

    // Language & Mode Selectors
    if (this.langTrBtn) {
      this.langTrBtn.addEventListener('click', () => this.setAppLanguage('tr'));
    }
    if (this.langEnBtn) {
      this.langEnBtn.addEventListener('click', () => this.setAppLanguage('en'));
    }
    if (this.defaultModeSelect) {
      this.defaultModeSelect.addEventListener('change', (e) => this.setDefaultMode(e.target.value));
    }

    // Ambience & Background Switcher
    if (this.ambienceToggleBtn) {
      this.ambienceToggleBtn.addEventListener('click', () => this.cycleAmbience());
    }

    // Data & Backup Buttons
    if (this.exportJsonBtn) {
      this.exportJsonBtn.addEventListener('click', () => this.exportJsonData());
    }
    if (this.exportCsvBtn) {
      this.exportCsvBtn.addEventListener('click', () => this.exportCsvData());
    }
    if (this.importBackupBtn) {
      this.importBackupBtn.addEventListener('click', () => this.importBackupData());
    }
    if (this.importFileInput) {
      this.importFileInput.addEventListener('change', (e) => this.handleFileImport(e));
    }
    if (this.clearAllDataBtn) {
      this.clearAllDataBtn.addEventListener('click', () => this.clearAllData());
    }

    // Select All Checkbox
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', () => this.toggleSelectAll());
    }

    // Segregated Type Filter Clicks
    this.filterStopwatchBtn.addEventListener('click', () => this.setHistoryFilter('stopwatch'));
    this.filterTimerBtn.addEventListener('click', () => this.setHistoryFilter('timer'));

    // Sound & Fullscreen
    this.soundToggleBtn.addEventListener('click', () => this.toggleSound());
    this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());

    // Dynamic Keyboard Shortcuts Controller
    window.addEventListener('keydown', (e) => {
      // 1. If currently recording a key for a shortcut
      if (this.recordingActionKey) {
        e.preventDefault();
        e.stopPropagation();

        if (e.code === 'Escape') {
          this.recordingActionKey = null;
          this.renderShortcutsGrid();
          this.showToast('Kısayol ataması iptal edildi', 'ℹ️');
          return;
        }

        const action = this.recordingActionKey;
        this.keybinds[action].code = e.code;
        this.keybinds[action].display = this.formatKeyDisplay(e.code);
        this.saveKeybinds();
        this.recordingActionKey = null;
        this.renderShortcutsGrid();
        this.showToast(`Kısayol güncellendi: ${this.keybinds[action].display}`, '✅');
        return;
      }

      // Ignore if user is writing in an input field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      // Global Esc key to close any modal
      if (e.code === 'Escape') {
        this.closeSettingsModal();
        this.closeHistoryModal();
        this.closeSaveModal();
        return;
      }

      // Match dynamic keybinds
      const code = e.code;
      if (this.keybinds.startPause && code === this.keybinds.startPause.code) {
        e.preventDefault();
        if (this.mode !== 'clock') this.toggleStartPause();
      } else if (this.keybinds.reset && code === this.keybinds.reset.code) {
        if (this.mode !== 'clock') this.reset();
      } else if (this.keybinds.lap && code === this.keybinds.lap.code) {
        if (this.mode !== 'clock') this.addLap();
      } else if ((this.keybinds.clockMode && code === this.keybinds.clockMode.code) || code === 'Digit1') {
        this.switchMode('clock');
      } else if ((this.keybinds.stopwatchMode && code === this.keybinds.stopwatchMode.code) || code === 'Digit2') {
        this.switchMode('stopwatch');
      } else if ((this.keybinds.timerMode && code === this.keybinds.timerMode.code) || code === 'Digit3') {
        this.switchMode('timer');
      } else if (this.keybinds.wakeLock && code === this.keybinds.wakeLock.code) {
        this.toggleWakeLock();
      } else if (this.keybinds.sound && code === this.keybinds.sound.code) {
        this.toggleSound();
      } else if (this.keybinds.fullscreen && code === this.keybinds.fullscreen.code) {
        this.toggleFullscreen();
      } else if (this.keybinds.history && code === this.keybinds.history.code) {
        this.openHistoryModal();
      } else if (this.keybinds.rain && code === this.keybinds.rain.code) {
        this.cycleAmbience();
      } else if ((this.keybinds.settings && code === this.keybinds.settings.code) || code === 'Comma') {
        if (this.settingsModalBackdrop && !this.settingsModalBackdrop.classList.contains('hidden')) {
          this.closeSettingsModal();
        } else {
          this.openSettingsModal();
        }
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.stopwatchApp = new FlipStopwatchApp();
});
