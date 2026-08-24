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

class KeybindManager {
  constructor(app, ui) {
    this.app = app;
    this.ui = ui;
    this.keybinds = this.loadKeybinds();
    this.recordingActionKey = null;

    this.shortcutsListGrid = document.getElementById('shortcutsListGrid');
    this.resetShortcutsBtn = document.getElementById('resetShortcutsBtn');

    this.init();
  }

  init() {
    this.renderShortcutsGrid();
    this.bindEvents();
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
    if (this.ui) this.ui.showToast('Tüm kısayollar varsayılana sıfırlandı', '🔄');
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
    if (this.ui) this.ui.showToast(`"${this.keybinds[actionKey].label}" için bir tuşa basın`, '⌨️');
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
