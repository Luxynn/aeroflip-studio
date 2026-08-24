class SettingsManager {
  constructor(app, storage, ui, keybinds) {
    this.app = app;
    this.storage = storage;
    this.ui = ui;
    this.keybinds = keybinds;

    this.activeSettingsTab = 'shortcuts';
    this.appLang = localStorage.getItem('fliqlo_lang') || 'tr';
    this.defaultMode = localStorage.getItem('fliqlo_default_mode') || 'stopwatch';

    this.bindDomElements();
    this.init();
  }

  bindDomElements() {
    this.settingsModalBtn = document.getElementById('settingsModalBtn');
    this.settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
    this.closeSettingsModalBtn = document.getElementById('closeSettingsModalBtn');

    this.tabSettingsShortcuts = document.getElementById('tabSettingsShortcuts');
    this.tabSettingsGeneral = document.getElementById('tabSettingsGeneral');
    this.tabSettingsData = document.getElementById('tabSettingsData');

    this.viewSettingsShortcuts = document.getElementById('viewSettingsShortcuts');
    this.viewSettingsGeneral = document.getElementById('viewSettingsGeneral');
    this.viewSettingsData = document.getElementById('viewSettingsData');

    this.langTrBtn = document.getElementById('langTrBtn');
    this.langEnBtn = document.getElementById('langEnBtn');
    this.defaultModeSelect = document.getElementById('defaultModeSelect');

    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    this.importBackupBtn = document.getElementById('importBackupBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');
  }

  init() {
    this.applyInitialSettings();
    this.bindEvents();
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

    // Sync initial ambience UI
    if (this.app.rain && this.app.rain.currentMode === 'none') {
      if (this.app.rainBackdrop) this.app.rainBackdrop.classList.add('disabled');
      if (this.app.ambienceToggleBtn) this.app.ambienceToggleBtn.classList.remove('active-accent');
    } else {
      if (this.app.rainBackdrop) this.app.rainBackdrop.classList.remove('disabled');
      if (this.app.ambienceToggleBtn) this.app.ambienceToggleBtn.classList.add('active-accent');
    }
  }

  bindEvents() {
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

    if (this.langTrBtn) {
      this.langTrBtn.addEventListener('click', () => this.setAppLanguage('tr'));
    }
    if (this.langEnBtn) {
      this.langEnBtn.addEventListener('click', () => this.setAppLanguage('en'));
    }
    if (this.defaultModeSelect) {
      this.defaultModeSelect.addEventListener('change', (e) => this.setDefaultMode(e.target.value));
    }

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
  }

  openSettingsModal() {
    if (this.settingsModalBackdrop) {
      this.settingsModalBackdrop.classList.remove('hidden');
      if (this.keybinds) this.keybinds.renderShortcutsGrid();
      this.switchSettingsTab(this.activeSettingsTab || 'shortcuts');
    }
  }

  closeSettingsModal() {
    if (this.keybinds && this.keybinds.recordingActionKey) {
      this.keybinds.recordingActionKey = null;
      this.keybinds.renderShortcutsGrid();
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

  setAppLanguage(lang) {
    this.appLang = lang;
    localStorage.setItem('fliqlo_lang', lang);
    if (lang === 'tr') {
      if (this.langTrBtn) this.langTrBtn.classList.add('active');
      if (this.langEnBtn) this.langEnBtn.classList.remove('active');
      if (this.ui) this.ui.showToast('Uygulama dili Türkçe olarak seçildi 🇹🇷', '🌍');
    } else {
      if (this.langEnBtn) this.langEnBtn.classList.add('active');
      if (this.langTrBtn) this.langTrBtn.classList.remove('active');
      if (this.ui) this.ui.showToast('Language set to English 🇬🇧 (Ready for translation)', '🌍');
    }
  }

  setDefaultMode(mode) {
    this.defaultMode = mode;
    localStorage.setItem('fliqlo_default_mode', mode);
    if (this.ui) this.ui.showToast(`Varsayılan başlangıç modu güncellendi: ${mode.toUpperCase()}`, '⚙️');
  }

  exportJsonData() {
    const data = this.storage.getAll();
    if (data.length === 0) {
      if (this.ui) this.ui.showToast('Dışa aktarılacak kayıtlı oturum bulunamadı', 'ℹ️');
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fliqlo-sessions-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    if (this.ui) this.ui.showToast('Oturum verileri JSON olarak indirildi', '💾');
  }

  exportCsvData() {
    const data = this.storage.getAll();
    if (data.length === 0) {
      if (this.ui) this.ui.showToast('Dışa aktarılacak kayıtlı oturum bulunamadı', 'ℹ️');
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
    if (this.ui) this.ui.showToast('Oturum verileri CSV tablosu olarak indirildi', '📊');
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
        if (this.app.history) {
          this.app.history.updateSessionBadge();
          this.app.history.renderSavedList();
        }
        if (this.ui) this.ui.showToast(`${addedCount} adet yeni oturum yedeği içe aktarıldı! ✅`, '📥');
      } catch (err) {
        console.error('Import error', err);
        if (this.ui) this.ui.showToast('Geçersiz JSON yedek dosyası', '⚠️');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  }

  clearAllData() {
    if (confirm('Tüm kayıtlı kronometre ve geri sayım oturumlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.')) {
      localStorage.removeItem('fliqlo_saved_sessions');
      this.storage.sessions = [];
      if (this.app.history) {
        this.app.history.updateSessionBadge();
        this.app.history.renderSavedList();
      }
      if (this.ui) this.ui.showToast('Tüm oturum kayıtları temizlendi', '🗑️');
    }
  }
}

window.SettingsManager = SettingsManager;
