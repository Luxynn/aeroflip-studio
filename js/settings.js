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
    this.clockFormatSelect = document.getElementById('clockFormatSelect');
    this.defaultModeSelect = document.getElementById('defaultModeSelect');

    this.exportExcelBtn = document.getElementById('exportExcelBtn');
    this.exportJsonBtn = document.getElementById('exportJsonBtn');
    this.exportCsvBtn = document.getElementById('exportCsvBtn');
    this.importBackupBtn = document.getElementById('importBackupBtn');
    this.importFileInput = document.getElementById('importFileInput');
    this.clearAllDataBtn = document.getElementById('clearAllDataBtn');
  }

  init() {
    this.applyInitialSettings();
    this.bindEvents();

    if (window.I18n) {
      window.I18n.onLanguageChange((lang) => {
        this.appLang = lang;
        if (lang === 'tr') {
          if (this.langTrBtn) this.langTrBtn.classList.add('active');
          if (this.langEnBtn) this.langEnBtn.classList.remove('active');
        } else {
          if (this.langEnBtn) this.langEnBtn.classList.add('active');
          if (this.langTrBtn) this.langTrBtn.classList.remove('active');
        }
      });
    }
  }

  applyInitialSettings() {
    if (this.defaultModeSelect) {
      this.defaultModeSelect.value = this.defaultMode;
    }
    if (this.clockFormatSelect && this.app) {
      this.clockFormatSelect.value = this.app.clockFormat || '24h';
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
      if (this.app.rainBackdrop) this.rainBackdrop && this.app.rainBackdrop.classList.remove('disabled');
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
    if (this.clockFormatSelect) {
      this.clockFormatSelect.addEventListener('change', (e) => {
        if (this.app) {
          this.app.setClockFormat(e.target.value);
        }
      });
    }
    if (this.defaultModeSelect) {
      this.defaultModeSelect.addEventListener('change', (e) => this.setDefaultMode(e.target.value));
    }

    if (this.exportExcelBtn) {
      this.exportExcelBtn.addEventListener('click', () => this.exportExcelData());
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
      if (this.clockFormatSelect && this.app) {
        this.clockFormatSelect.value = this.app.clockFormat || '24h';
      }
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
    if (window.I18n) {
      window.I18n.setLanguage(lang);
    } else {
      localStorage.setItem('fliqlo_lang', lang);
    }

    if (lang === 'tr') {
      if (this.langTrBtn) this.langTrBtn.classList.add('active');
      if (this.langEnBtn) this.langEnBtn.classList.remove('active');
    } else {
      if (this.langEnBtn) this.langEnBtn.classList.add('active');
      if (this.langTrBtn) this.langTrBtn.classList.remove('active');
    }

    const toastMsg = window.I18n ? window.I18n.get('toast_lang_switched') : (lang === 'tr' ? 'Uygulama dili Türkçe olarak seçildi 🇹🇷' : 'Language set to English 🇬🇧');
    if (this.ui) this.ui.showToast(toastMsg, '🌍');

    if (this.keybinds) this.keybinds.renderShortcutsGrid();
    if (this.app) {
      this.app.updateClockFormatBtnUI();
      if (this.app.mode === 'clock') {
        this.app.tickClock(true);
      }
    }
  }

  setDefaultMode(mode) {
    this.defaultMode = mode;
    localStorage.setItem('fliqlo_default_mode', mode);
    const prefix = window.I18n ? window.I18n.get('toast_default_mode') : 'Varsayılan başlangıç modu güncellendi: ';
    if (this.ui) this.ui.showToast(`${prefix}${mode.toUpperCase()}`, '⚙️');
  }

  async ensureSheetJSLoaded() {
    if (typeof XLSX !== 'undefined') return true;
    if (this._sheetJSLoadingPromise) return this._sheetJSLoadingPromise;

    this._sheetJSLoadingPromise = new Promise((resolve) => {
      if (this.ui) this.ui.showToast('Excel motoru hazırlanıyor...', '⏳');
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.async = true;
      script.onload = () => {
        resolve(true);
      };
      script.onerror = () => {
        console.warn('Failed to dynamically load SheetJS');
        if (this.ui) this.ui.showToast('Excel motoru indirilemedi', '⚠️');
        resolve(false);
      };
      document.body.appendChild(script);
    });

    return this._sheetJSLoadingPromise;
  }

  async exportExcelData() {
    if (typeof XLSX === 'undefined') {
      const loaded = await this.ensureSheetJSLoaded();
      if (!loaded || typeof XLSX === 'undefined') {
        if (this.ui) this.ui.showToast('SheetJS Excel motoru yüklenemedi', '⚠️');
        return;
      }
    }

    const data = this.storage.getAll();
    if (!data || data.length === 0) {
      if (this.ui) this.ui.showToast('Dışa aktarılacak kayıtlı oturum bulunamadı', 'ℹ️');
      return;
    }

    // Helper: Convert Milliseconds to Excel Day Fraction with native duration format [hh]:mm:ss.00
    const msToExcelTime = (ms) => {
      if (ms === null || ms === undefined || isNaN(ms) || ms < 0) return null;
      return {
        t: 'n',
        v: ms / 86400000, // 86,400,000 ms in a day
        z: '[hh]:mm:ss.00' // Native Excel duration number format with milliseconds
      };
    };

    // Calculate Global Statistics for Summary Sheet
    const totalSessions = data.length;
    let totalLaps = 0;
    let totalWorkDurationMs = 0;
    const lapSplitTimes = [];

    data.forEach(s => {
      const duration = s.totalMs || s.elapsedMs || 0;
      totalWorkDurationMs += duration;

      if (s.laps && Array.isArray(s.laps)) {
        s.laps.forEach(l => {
          totalLaps++;
          if (l.split && !isNaN(l.split)) {
            lapSplitTimes.push(l.split);
          }
        });
      }
    });

    const averageLapMs = lapSplitTimes.length > 0
      ? lapSplitTimes.reduce((a, b) => a + b, 0) / lapSplitTimes.length
      : (totalSessions > 0 ? totalWorkDurationMs / totalSessions : 0);

    const bestLapMs = lapSplitTimes.length > 0 ? Math.min(...lapSplitTimes) : null;
    const worstLapMs = lapSplitTimes.length > 0 ? Math.max(...lapSplitTimes) : null;

    const now = new Date();
    const formattedExportDate = now.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    /* ==========================================================
       1. SAYFA: ÖZET (SUMMARY SHEET)
       ========================================================== */
    const summaryData = [
      ['SAYAÇ RAPORU', ''],
      ['', ''],
      ['Metrik', 'Değer'],
      ['Toplam Oturum', totalSessions],
      ['Toplam Tur', totalLaps],
      ['Toplam Çalışma Süresi', msToExcelTime(totalWorkDurationMs) || FliqloUtils.formatTime(totalWorkDurationMs)],
      ['Ortalama Tur Süresi', msToExcelTime(averageLapMs) || FliqloUtils.formatTime(averageLapMs)],
      ['En İyi Tur', bestLapMs !== null ? (msToExcelTime(bestLapMs) || FliqloUtils.formatTime(bestLapMs)) : '-'],
      ['En Uzun Tur', worstLapMs !== null ? (msToExcelTime(worstLapMs) || FliqloUtils.formatTime(worstLapMs)) : '-'],
      ['', ''],
      ['Excel Oluşturulma Tarihi', formattedExportDate]
    ];

    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 28 }, { wch: 32 }];

    /* ==========================================================
       2. SAYFA: OTURUMLAR (SESSIONS SHEET)
       ========================================================== */
    const sessionsHeader = [
      'Oturum No',
      'Oturum Adı',
      'Mod / Tür',
      'Tarih',
      'Hedef Süre',
      'Toplam Süre',
      'Kalan Süre',
      'Toplam Tur Sayısı',
      'En İyi Tur'
    ];

    const sessionsRows = [];
    sessionsRows.push(sessionsHeader);

    data.forEach((s, idx) => {
      const typeText = s.type === 'stopwatch' ? 'Kronometre' : 'Geri Sayım';
      const totalMs = s.totalMs || s.elapsedMs || 0;
      const targetMs = s.targetDurationMs || null;
      const remainingMs = s.remainingMs !== undefined ? s.remainingMs : null;
      const lapCount = s.laps ? s.laps.length : 0;
      
      // Calculate Best Lap (Shortest Split)
      let bestLapVal = s.bestLapMs || null;
      if (!bestLapVal && s.laps && s.laps.length > 0) {
        const splits = s.laps.map(l => l.split).filter(val => typeof val === 'number' && !isNaN(val));
        if (splits.length > 0) bestLapVal = Math.min(...splits);
      }

      sessionsRows.push([
        idx + 1,
        s.name || `Oturum #${idx + 1}`,
        typeText,
        s.date || '-',
        targetMs ? msToExcelTime(targetMs) : '-',
        msToExcelTime(totalMs),
        remainingMs !== null ? msToExcelTime(remainingMs) : '-',
        lapCount,
        bestLapVal ? msToExcelTime(bestLapVal) : '-'
      ]);
    });

    const wsSessions = XLSX.utils.aoa_to_sheet(sessionsRows);
    wsSessions['!cols'] = [
      { wch: 12 }, // Oturum No
      { wch: 26 }, // Oturum Adı
      { wch: 16 }, // Mod / Tür
      { wch: 18 }, // Tarih
      { wch: 16 }, // Hedef Süre
      { wch: 18 }, // Toplam Süre
      { wch: 16 }, // Kalan Süre
      { wch: 18 }, // Toplam Tur Sayısı
      { wch: 16 }  // En İyi Tur
    ];
    if (sessionsRows.length > 1) {
      wsSessions['!autofilter'] = { ref: `A1:I${sessionsRows.length}` };
    }

    /* ==========================================================
       3. SAYFA: TURLAR (LAPS SHEET)
       ========================================================== */
    const lapsHeader = [
      'Oturum No',
      'Oturum Adı',
      'Mod / Tür',
      'Tarih',
      'Tur / Kayıt No',
      'Tur Notu / Adı',
      'Tur Süresi (Split)',
      'Kümülatif Süre (Total)',
      'Tur Kalan Süre'
    ];

    const lapsRows = [];
    lapsRows.push(lapsHeader);

    data.forEach((s, idx) => {
      const typeText = s.type === 'stopwatch' ? 'Kronometre' : 'Geri Sayım';
      const sessionNo = idx + 1;
      const sessionName = s.name || `Oturum #${sessionNo}`;
      const sessionDate = s.date || '-';

      if (s.laps && s.laps.length > 0) {
        const sortedLaps = [...s.laps].sort((a, b) => (a.index || 0) - (b.index || 0));
        sortedLaps.forEach(lap => {
          const lapLabel = s.type === 'stopwatch' ? `Tur #${lap.index}` : `Ara Kayıt #${lap.index}`;
          const splitMs = lap.split || null;
          const totalMs = lap.total || lap.elapsed || null;
          const remainingMs = lap.remaining !== undefined ? lap.remaining : null;

          lapsRows.push([
            sessionNo,
            sessionName,
            typeText,
            sessionDate,
            lapLabel,
            lap.name || '-',
            splitMs !== null ? msToExcelTime(splitMs) : '-',
            totalMs !== null ? msToExcelTime(totalMs) : '-',
            remainingMs !== null ? msToExcelTime(remainingMs) : '-'
          ]);
        });
      }
    });

    const wsLaps = XLSX.utils.aoa_to_sheet(lapsRows);
    wsLaps['!cols'] = [
      { wch: 12 }, // Oturum No
      { wch: 26 }, // Oturum Adı
      { wch: 16 }, // Mod / Tür
      { wch: 18 }, // Tarih
      { wch: 18 }, // Tur / Kayıt No
      { wch: 24 }, // Tur Notu / Adı
      { wch: 20 }, // Tur Süresi (Split)
      { wch: 22 }, // Kümülatif Süre (Total)
      { wch: 18 }  // Tur Kalan Süre
    ];
    if (lapsRows.length > 1) {
      wsLaps['!autofilter'] = { ref: `A1:I${lapsRows.length}` };
    }

    /* ==========================================================
       WORKBOOK ASSEMBLY & DOWNLOAD (.XLSX)
       ========================================================== */
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Özet');
    XLSX.utils.book_append_sheet(wb, wsSessions, 'Oturumlar');
    XLSX.utils.book_append_sheet(wb, wsLaps, 'Turlar');

    const fileDateStr = now.toISOString().slice(0, 10);
    const filename = `Sayaç_Raporu_${fileDateStr}.xlsx`;

    XLSX.writeFile(wb, filename);

    if (this.ui) this.ui.showToast('Sayaç raporu 3 sayfalı Excel (.xlsx) olarak indirildi! 📊', '✅');
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
    a.download = `aeroflip-sessions-backup-${new Date().toISOString().slice(0, 10)}.json`;
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

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const headers = [
      'Oturum No',
      'Oturum Adı',
      'Mod / Tür',
      'Tarih',
      'Toplam Süre',
      'Hedef Süre',
      'Kalan Süre',
      'Toplam Tur Sayısı',
      'En İyi Tur',
      'Tur / Kayıt No',
      'Tur Süresi (Split)',
      'Kümülatif Süre (Total)',
      'Tur Kalan Süre'
    ];

    const rows = [];
    rows.push(headers.map(escapeCsv).join(','));

    data.forEach((s, sIndex) => {
      const typeText = s.type === 'stopwatch' ? 'Kronometre' : 'Geri Sayım';
      const totalFormatted = FliqloUtils.formatTime(s.totalMs || s.elapsedMs || 0);
      const targetFormatted = s.targetDurationMs ? FliqloUtils.formatTimeHMS(s.targetDurationMs) : '-';
      const remainingFormatted = s.remainingMs !== undefined ? FliqloUtils.formatTime(s.remainingMs) : '-';
      const lapCount = s.laps ? s.laps.length : 0;
      const bestLapFormatted = s.bestLapMs ? FliqloUtils.formatTime(s.bestLapMs) : '-';

      if (!s.laps || s.laps.length === 0) {
        rows.push([
          escapeCsv(sIndex + 1),
          escapeCsv(s.name),
          escapeCsv(typeText),
          escapeCsv(s.date),
          escapeCsv(totalFormatted),
          escapeCsv(targetFormatted),
          escapeCsv(remainingFormatted),
          escapeCsv(lapCount),
          escapeCsv(bestLapFormatted),
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('-'),
          escapeCsv('-')
        ].join(','));
      } else {
        const sortedLaps = [...s.laps].sort((a, b) => (a.index || 0) - (b.index || 0));
        sortedLaps.forEach((lap) => {
          const lapSplit = lap.split ? FliqloUtils.formatTime(lap.split) : '-';
          const lapTotal = lap.total ? FliqloUtils.formatTime(lap.total) : (lap.elapsed ? FliqloUtils.formatTime(lap.elapsed) : '-');
          const lapRem = lap.remaining !== undefined ? FliqloUtils.formatTime(lap.remaining) : '-';

          rows.push([
            escapeCsv(sIndex + 1),
            escapeCsv(s.name),
            escapeCsv(typeText),
            escapeCsv(s.date),
            escapeCsv(totalFormatted),
            escapeCsv(targetFormatted),
            escapeCsv(remainingFormatted),
            escapeCsv(lapCount),
            escapeCsv(bestLapFormatted),
            escapeCsv(`Tur #${lap.index}`),
            escapeCsv(lapSplit),
            escapeCsv(lapTotal),
            escapeCsv(lapRem)
          ].join(','));
        });
      }
    });

    // UTF-8 BOM (\uFEFF) for perfect Turkish character encoding in Microsoft Excel & Google Sheets
    const csvContent = '\uFEFF' + rows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aeroflip-sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    if (this.ui) this.ui.showToast('Oturum ve tur verileri detaylı CSV olarak indirildi', '📊');
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

  async clearAllData() {
    let confirmed = false;
    if (this.ui && typeof this.ui.confirmDialog === 'function') {
      confirmed = await this.ui.confirmDialog({
        title: 'Tüm Geçmişi Sıfırla',
        message: 'Kayıtlı TÜM kronometre ve geri sayım oturumları kalıcı olarak silinecektir. Bu işlem kesinlikle geri alınamaz!',
        confirmText: 'Tümünü Temizle',
        cancelText: 'Vazgeç',
        icon: 'warning'
      });
    } else {
      confirmed = window.confirm('Tüm kayıtlı kronometre ve geri sayım oturumlarını silmek istediğinize emin misiniz? Bu işlem geri alınamaz.');
    }

    if (!confirmed) return;

    localStorage.removeItem('fliqlo_saved_sessions');
    this.storage.sessions = [];
    if (this.app.history) {
      this.app.history.selectedSessionIds.clear();
      this.app.history.saveSelection();
      this.app.history.updateSessionBadge();
      this.app.history.renderSavedList();
    }
    if (this.ui) this.ui.showToast('Tüm oturum kayıtları temizlendi', '🗑️');
  }
}

window.SettingsManager = SettingsManager;
