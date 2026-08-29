const DEFAULT_KEYBINDS = {
  startPause: { code: 'Space', display: 'SPACE', i18nKey: 'keybind_start_pause' },
  reset: { code: 'KeyR', display: 'R', i18nKey: 'keybind_reset' },
  lap: { code: 'KeyL', display: 'L', i18nKey: 'keybind_lap' },
  clockMode: { code: 'KeyC', display: 'C', i18nKey: 'keybind_mode_clock' },
  stopwatchMode: { code: 'KeyW', display: 'W', i18nKey: 'keybind_mode_stopwatch' },
  timerMode: { code: 'KeyT', display: 'T', i18nKey: 'keybind_mode_timer' },
  wakeLock: { code: 'KeyK', display: 'K', i18nKey: 'keybind_wakelock' },
  sound: { code: 'KeyS', display: 'S', i18nKey: 'keybind_sound' },
  rain: { code: 'KeyY', display: 'Y', i18nKey: 'keybind_ambience' },
  fullscreen: { code: 'KeyF', display: 'F', i18nKey: 'keybind_fullscreen' },
  history: { code: 'KeyH', display: 'H', i18nKey: 'keybind_history' },
  settings: { code: 'KeyO', display: 'O', i18nKey: 'keybind_settings' }
};

class KeybindManager {
  constructor(app, ui) {
    this.app = app;
    this.ui = ui;
    this.keybinds = this.loadKeybinds();
    this.recordingActionKey = null;

    this.shortcutsListGrid = document.getElementById('shortcutsListGrid');
    this.resetShortcutsBtn = document.getElementById('resetShortcutsBtn');

    if (window.I18n) {
      window.I18n.onLanguageChange(() => this.renderShortcutsGrid());
    }

    this.init();
  }

  init() {
    this.renderShortcutsGrid();
    this.bindEvents();
  }

  getActionLabel(actionKey) {
    const defaultItem = DEFAULT_KEYBINDS[actionKey];
    if (defaultItem && defaultItem.i18nKey && window.I18n) {
      return window.I18n.get(defaultItem.i18nKey);
    }
    return (this.keybinds[actionKey] && this.keybinds[actionKey].label) || actionKey;
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
    if (this.ui) this.ui.showToast(window.I18n ? window.I18n.get('btn_reset_keybinds') : 'Tüm kısayollar varsayılana sıfırlandı', '🔄');
  }

  formatKeyDisplay(code) {
    if (!code) return 'NONE';
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
      const label = this.getActionLabel(actionKey);
      return `
        <div class="shortcut-row">
          <span class="shortcut-label">${label}</span>
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
    buttonEl.textContent = '...';
    const label = this.getActionLabel(actionKey);
    if (this.ui) this.ui.showToast(`"${label}" için bir tuşa basın`, '⌨️');
  }

  bindEvents() {
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

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleKeyDown(e) {
    // 1. If currently recording a key for a shortcut
    if (this.recordingActionKey) {
      e.preventDefault();
      e.stopPropagation();

      if (e.code === 'Escape') {
        this.recordingActionKey = null;
        this.renderShortcutsGrid();
        if (this.ui) this.ui.showToast('Kısayol ataması iptal edildi', 'ℹ️');
        return;
      }

      const action = this.recordingActionKey;
      this.keybinds[action].code = e.code;
      this.keybinds[action].display = this.formatKeyDisplay(e.code);
      this.saveKeybinds();
      this.recordingActionKey = null;
      this.renderShortcutsGrid();
      if (this.ui) this.ui.showToast(`Kısayol güncellendi: ${this.keybinds[action].display}`, '✅');
      return;
    }

    // Ignore if user is writing in an input field
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

    // Global Esc key to close any modal
    if (e.code === 'Escape') {
      if (this.app.settings) this.app.settings.closeSettingsModal();
      if (this.app.history) this.app.history.closeHistoryModal();
      if (this.app.history) this.app.history.closeSaveModal();
      return;
    }

    // Match dynamic keybinds
    const code = e.code;
    if (this.keybinds.startPause && code === this.keybinds.startPause.code) {
      e.preventDefault();
      if (this.app.mode !== 'clock') this.app.toggleStartPause();
    } else if (this.keybinds.reset && code === this.keybinds.reset.code) {
      if (this.app.mode !== 'clock') this.app.reset();
    } else if (this.keybinds.lap && code === this.keybinds.lap.code) {
      if (this.app.mode !== 'clock') this.app.addLap();
    } else if ((this.keybinds.clockMode && code === this.keybinds.clockMode.code) || code === 'Digit1') {
      this.app.switchMode('clock');
    } else if ((this.keybinds.stopwatchMode && code === this.keybinds.stopwatchMode.code) || code === 'Digit2') {
      this.app.switchMode('stopwatch');
    } else if ((this.keybinds.timerMode && code === this.keybinds.timerMode.code) || code === 'Digit3') {
      this.app.switchMode('timer');
    } else if (this.keybinds.wakeLock && code === this.keybinds.wakeLock.code) {
      if (this.ui) this.ui.toggleWakeLock();
    } else if (this.keybinds.sound && code === this.keybinds.sound.code) {
      this.app.toggleSound();
    } else if (this.keybinds.fullscreen && code === this.keybinds.fullscreen.code) {
      this.app.toggleFullscreen();
    } else if (this.keybinds.history && code === this.keybinds.history.code) {
      if (this.app.history) this.app.history.openHistoryModal();
    } else if (this.keybinds.rain && code === this.keybinds.rain.code) {
      this.app.cycleAmbience();
    } else if ((this.keybinds.settings && code === this.keybinds.settings.code) || code === 'Comma') {
      if (this.app.settings) {
        if (this.app.settings.settingsModalBackdrop && !this.app.settings.settingsModalBackdrop.classList.contains('hidden')) {
          this.app.settings.closeSettingsModal();
        } else {
          this.app.settings.openSettingsModal();
        }
      }
    }
  }
}

window.DEFAULT_KEYBINDS = DEFAULT_KEYBINDS;
window.KeybindManager = KeybindManager;
