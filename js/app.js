class FlipStopwatchApp {
  constructor() {
    // Mode: 'stopwatch' | 'timer'
    this.mode = 'stopwatch';

    // Core State
    this.startTime = 0;
    this.elapsedTime = 0;
    this.timerId = null;
    this.isRunning = false;
    this.rainEnabled = true;
    this.laps = [];
    this.lastLapTime = 0;

    // Timer State
    this.timerDurationMs = 5 * 60 * 1000;
    this.timerRemainingMs = 5 * 60 * 1000;
    this.timerInitialSetSec = 300;
    this.alarmInterval = null;

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

  bindDomElements() {
    this.rainBackdrop = document.getElementById('rainBackdrop');
    this.rainToggleBtn = document.getElementById('rainToggleBtn');
    this.modeStopwatchBtn = document.getElementById('modeStopwatchBtn');
    this.modeTimerBtn = document.getElementById('modeTimerBtn');
    this.timerSetupPanel = document.getElementById('timerSetupPanel');
    this.fliqloStage = document.getElementById('fliqloStage');
    this.fliqloControlsBar = document.getElementById('fliqloControlsBar');
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
  }

  init() {
    this.setupEventListeners();
    this.updateSessionBadge();
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

  switchMode(newMode) {
    if (this.mode === newMode) return;

    this.reset();
    this.mode = newMode;

    if (newMode === 'stopwatch') {
      this.modeStopwatchBtn.classList.add('active');
      this.modeTimerBtn.classList.remove('active');
      this.timerSetupPanel.classList.add('hidden');
      this.fliqloStage.classList.remove('hidden');
      this.fliqloControlsBar.classList.remove('hidden');
      this.lapBtnText.textContent = 'Tur';
      this.lapsHeaderSplit.textContent = 'TUR FARKI';
      this.lapsHeaderTotal.textContent = 'TOPLAM SÜRE';
    } else {
      this.modeStopwatchBtn.classList.remove('active');
      this.modeTimerBtn.classList.add('active');
      this.timerSetupPanel.classList.remove('hidden');
      this.fliqloStage.classList.add('hidden');
      this.fliqloControlsBar.classList.add('hidden');
      this.lapBtnText.textContent = 'Ara Kayıt';
      this.lapsHeaderSplit.textContent = 'FARK';
      this.lapsHeaderTotal.textContent = 'KALAN SÜRE';
      this.syncTimerFromInputs();
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

  update() {
    const now = performance.now();

    if (this.mode === 'stopwatch') {
      const currentElapsed = this.elapsedTime + (now - this.startTime);
      this.updateDisplay(currentElapsed);

      if (this.isRunning) {
        this.timerId = requestAnimationFrame(() => this.update());
      }
    } else {
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
      this.sessionNameInput.value = `Kronometre #${this.storage.getByType('stopwatch').length + 1}`;
    } else {
      const elapsed = this.timerDurationMs - this.timerRemainingMs;
      duration = elapsed;
      subInfo = `${FliqloUtils.formatTime(this.timerRemainingMs)} kala (${this.laps.length} Ara Kayıt)`;
      this.saveModalTitle.textContent = 'GERİ SAYIM OTURUMUNU KAYDET';
      this.saveSummaryLabel1.textContent = 'GEÇEN SÜRE';
      this.saveSummaryLabel2.textContent = 'KALAN SÜRE / ARA KAYIT';
      this.sessionNameInput.value = `Geri Sayım (${FliqloUtils.formatTimeHMS(this.timerDurationMs)})`;
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
    } else {
      this.rainBackdrop.classList.add('disabled');
      this.rainToggleBtn.classList.remove('active-accent');
      this.rain.stop();
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
    } else {
      soundOnIcon.classList.add('hidden');
      soundOffIcon.classList.remove('hidden');
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`Fullscreen error: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  setupEventListeners() {
    // Rain Toggle Button
    this.rainToggleBtn.addEventListener('click', () => this.toggleRain());

    // Mode Switchers
    this.modeStopwatchBtn.addEventListener('click', () => this.switchMode('stopwatch'));
    this.modeTimerBtn.addEventListener('click', () => this.switchMode('timer'));

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

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.toggleStartPause();
          break;
        case 'KeyR':
          this.reset();
          break;
        case 'KeyL':
          this.addLap();
          break;
        case 'KeyS':
          this.toggleSound();
          break;
        case 'KeyF':
          this.toggleFullscreen();
          break;
        case 'KeyH':
          this.openHistoryModal();
          break;
        case 'KeyY':
          this.toggleRain();
          break;
      }
    });
  }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.stopwatchApp = new FlipStopwatchApp();
});
