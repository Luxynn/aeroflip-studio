class HistoryManager {
  constructor(app, storage, analytics, ui) {
    this.app = app;
    this.storage = storage;
    this.analytics = analytics;
    this.ui = ui;

    this.historyFilter = localStorage.getItem('aeroflip_history_filter') || 'stopwatch';
    this.activeTab = localStorage.getItem('aeroflip_history_tab') || 'list';
    try {
      this.selectedSessionIds = new Set(JSON.parse(localStorage.getItem('aeroflip_selected_sessions') || '[]'));
    } catch (e) {
      this.selectedSessionIds = new Set();
    }

    this.bindDomElements();
    this.init();
  }

  bindDomElements() {
    this.sessionCountBadge = document.getElementById('sessionCountBadge');
    this.historyModalBtn = document.getElementById('historyModalBtn');
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

    // Save Modal Elements
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
    this.saveLapsSection = document.getElementById('saveLapsSection');
    this.saveLapsList = document.getElementById('saveLapsList');
  }

  init() {
    this.updateSessionBadge();
    this.bindEvents();

    if (window.I18n) {
      window.I18n.onLanguageChange(() => {
        this.renderSavedList();
        if (this.activeTab === 'compare') {
          this.renderComparison();
        }
      });
    }
  }

  bindEvents() {
    // Save Modal Triggers
    if (this.app.saveSessionBtn) {
      this.app.saveSessionBtn.addEventListener('click', () => this.openSaveModal());
    }
    if (this.closeSaveModalBtn) {
      this.closeSaveModalBtn.addEventListener('click', () => this.closeSaveModal());
    }
    if (this.cancelSaveBtn) {
      this.cancelSaveBtn.addEventListener('click', () => this.closeSaveModal());
    }
    if (this.confirmSaveBtn) {
      this.confirmSaveBtn.addEventListener('click', () => this.confirmSaveSession());
    }
    if (this.sessionNameInput) {
      this.sessionNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') this.confirmSaveSession();
      });
    }

    // History & Compare Modal Triggers
    if (this.historyModalBtn) {
      this.historyModalBtn.addEventListener('click', () => this.openHistoryModal());
    }
    if (this.closeHistoryModalBtn) {
      this.closeHistoryModalBtn.addEventListener('click', () => this.closeHistoryModal());
    }
    if (this.tabSavedList) {
      this.tabSavedList.addEventListener('click', () => this.switchTab('list'));
    }
    if (this.tabCompare) {
      this.tabCompare.addEventListener('click', () => this.switchTab('compare'));
    }
    if (this.launchCompareBtn) {
      this.launchCompareBtn.addEventListener('click', () => this.switchTab('compare'));
    }

    // Filter Buttons
    if (this.filterStopwatchBtn) {
      this.filterStopwatchBtn.addEventListener('click', () => this.setHistoryFilter('stopwatch'));
    }
    if (this.filterTimerBtn) {
      this.filterTimerBtn.addEventListener('click', () => this.setHistoryFilter('timer'));
    }

    // Select All Checkbox
    if (this.selectAllCheckbox) {
      this.selectAllCheckbox.addEventListener('change', () => this.toggleSelectAll());
    }

    // Delegation on Saved List
    if (this.savedSessionsList) {
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
    }
  }

  updateSessionBadge() {
    const counts = this.storage.getCounts();
    if (this.sessionCountBadge) this.sessionCountBadge.textContent = counts.total;
    if (this.countStopwatchBadge) this.countStopwatchBadge.textContent = counts.stopwatch;
    if (this.countTimerBadge) this.countTimerBadge.textContent = counts.timer;
  }

  openSaveModal() {
    let duration = 0;
    let subInfo = '';

    const taskInput = this.app.ui ? this.app.ui.taskGoalInput : document.getElementById('taskGoalInput');
    const taskName = (taskInput && taskInput.value.trim()) || '';

    if (this.app.mode === 'stopwatch') {
      duration = this.app.elapsedTime;
      subInfo = `${this.app.laps.length} Tur Kaydedildi`;
      this.saveModalTitle.textContent = 'KRONOMETRE OTURUMUNU KAYDET';
      this.saveSummaryLabel1.textContent = 'TOPLAM SÜRE';
      this.saveSummaryLabel2.textContent = 'TUR SAYISI';
      this.sessionNameInput.value = taskName || `Kronometre #${this.storage.getByType('stopwatch').length + 1}`;
    } else {
      const elapsed = this.app.timerDurationMs - this.app.timerRemainingMs;
      duration = elapsed;
      subInfo = `${FliqloUtils.formatTime(this.app.timerRemainingMs)} kala (${this.app.laps.length} Ara Kayıt)`;
      this.saveModalTitle.textContent = 'GERİ SAYIM OTURUMUNU KAYDET';
      this.saveSummaryLabel1.textContent = 'GEÇEN SÜRE';
      this.saveSummaryLabel2.textContent = 'KALAN SÜRE / ARA KAYIT';
      this.sessionNameInput.value = taskName || `Geri Sayım (${FliqloUtils.formatTimeHMS(this.app.timerDurationMs)})`;
    }

    if (duration <= 0 && this.app.timerRemainingMs === this.app.timerDurationMs) return;

    this.saveSummaryTotal.textContent = FliqloUtils.formatTime(duration);
    this.saveSummaryLaps.textContent = subInfo;

    // Render laps list for custom naming/notes
    if (this.app.laps && this.app.laps.length > 0) {
      if (this.saveLapsSection) this.saveLapsSection.classList.remove('hidden');
      if (this.saveLapsList) {
        const sortedLaps = [...this.app.laps].sort((a, b) => (a.index || 0) - (b.index || 0));
        this.saveLapsList.innerHTML = sortedLaps.map(l => {
          const typeLabel = this.app.mode === 'stopwatch' ? `Tur #${String(l.index).padStart(2, '0')}` : `Ara #${String(l.index).padStart(2, '0')}`;
          const timeText = this.app.mode === 'stopwatch' ? `+${FliqloUtils.formatTime(l.split)}` : `${FliqloUtils.formatTime(l.remaining)} kala`;
          return `
            <div class="save-lap-row">
              <span class="save-lap-badge">${typeLabel}</span>
              <span class="save-lap-time">${timeText}</span>
              <input type="text" class="save-lap-input" data-lap-index="${l.index}" placeholder="Tur adı / açıklaması..." value="${l.name || ''}" maxlength="35">
            </div>
          `;
        }).join('');
      }
    } else {
      if (this.saveLapsSection) this.saveLapsSection.classList.add('hidden');
      if (this.saveLapsList) this.saveLapsList.innerHTML = '';
    }

    this.saveModalBackdrop.classList.remove('hidden');
    setTimeout(() => this.sessionNameInput.focus(), 100);
  }

  closeSaveModal() {
    if (this.saveModalBackdrop) {
      this.saveModalBackdrop.classList.add('hidden');
    }
  }

  confirmSaveSession() {
    const name = this.sessionNameInput.value.trim() || (this.app.mode === 'stopwatch' ? 'Kronometre' : 'Geri Sayım');
    const now = new Date();
    const dateStr = now.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

    // Collect custom lap names from save inputs
    const lapInputs = this.saveLapsList ? this.saveLapsList.querySelectorAll('.save-lap-input') : [];
    const lapNameMap = new Map();
    lapInputs.forEach(inp => {
      const idx = parseInt(inp.dataset.lapIndex, 10);
      const val = inp.value.trim();
      if (idx && val) lapNameMap.set(idx, val);
    });

    const lapsWithNames = this.app.laps.map(l => ({
      ...l,
      name: lapNameMap.get(l.index) || l.name || ''
    }));

    let newSession = null;

    if (this.app.mode === 'stopwatch') {
      let bestLap = lapsWithNames.length > 0 ? Math.min(...lapsWithNames.map(l => l.split)) : null;
      newSession = {
        id: Date.now().toString(),
        name: name,
        type: 'stopwatch',
        date: dateStr,
        timestamp: now.getTime(),
        totalMs: this.app.elapsedTime,
        laps: lapsWithNames,
        bestLapMs: bestLap,
      };
    } else {
      const elapsed = this.app.timerDurationMs - this.app.timerRemainingMs;
      newSession = {
        id: Date.now().toString(),
        name: name,
        type: 'timer',
        date: dateStr,
        timestamp: now.getTime(),
        targetDurationMs: this.app.timerDurationMs,
        elapsedMs: elapsed,
        remainingMs: this.app.timerRemainingMs,
        laps: lapsWithNames,
      };
    }

    this.storage.addSession(newSession);
    this.selectedSessionIds.add(newSession.id);
    this.saveSelection();
    this.updateSessionBadge();
    this.closeSaveModal();

    this.historyFilter = this.app.mode;
    this.openHistoryModal('list');
    if (this.ui) this.ui.showToast('Oturum Başarıyla Kaydedildi', '💾');
  }

  openHistoryModal(forceTab = null) {
    this.historyModalBackdrop.classList.remove('hidden');
    this.setHistoryFilter(this.historyFilter);
    const tabToOpen = forceTab || this.activeTab;
    this.switchTab(tabToOpen);
  }

  closeHistoryModal() {
    if (this.analytics) this.analytics.hidePopover();
    if (this.historyModalBackdrop) {
      this.historyModalBackdrop.classList.add('hidden');
    }
  }

  setHistoryFilter(type) {
    if (this.analytics) this.analytics.hidePopover();
    this.historyFilter = type;
    localStorage.setItem('aeroflip_history_filter', type);

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
    this.activeTab = tab;
    localStorage.setItem('aeroflip_history_tab', tab);

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

  async deleteSession(id) {
    const session = this.storage.getAll().find(s => s.id === id);
    const sessionName = session && session.name ? session.name : (window.I18n ? window.I18n.get('delete_modal_title') : 'Bu oturum');
    
    let confirmed = false;
    const title = window.I18n ? window.I18n.get('delete_modal_title') : 'Oturumu Sil';
    const message = window.I18n ? window.I18n.get('delete_modal_msg') : `"${sessionName}" adlı oturum kaydını kalıcı olarak silmek istediğinize emin misiniz?`;
    const confirmText = window.I18n ? window.I18n.get('btn_confirm_delete') : 'Evet, Sil';
    const cancelText = window.I18n ? window.I18n.get('btn_cancel') : 'Vazgeç';

    if (this.ui && typeof this.ui.confirmDialog === 'function') {
      confirmed = await this.ui.confirmDialog({
        title,
        message,
        confirmText,
        cancelText,
        icon: 'trash'
      });
    } else {
      confirmed = window.confirm(message);
    }

    if (!confirmed) return;

    this.storage.deleteSession(id);
    this.selectedSessionIds.delete(id);
    this.saveSelection();
    this.updateSessionBadge();
    this.renderSavedList();
    if (this.ui) this.ui.showToast(window.I18n ? window.I18n.get('toast_session_deleted') : 'Oturum kaydı silindi 🗑️', '🗑️');
  }

  toggleSelectSession(id) {
    if (this.selectedSessionIds.has(id)) {
      this.selectedSessionIds.delete(id);
    } else {
      this.selectedSessionIds.add(id);
    }
    this.saveSelection();
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

    this.saveSelection();
    this.renderSavedList();
  }

  saveSelection() {
    try {
      localStorage.setItem('aeroflip_selected_sessions', JSON.stringify([...this.selectedSessionIds]));
    } catch (e) {
      console.warn('Failed to persist selection', e);
    }
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
      const noTitle = window.I18n ? window.I18n.get('no_sessions_title') : 'Henüz kayıtlı oturum bulunmuyor.';
      const noSub = window.I18n ? window.I18n.get('no_sessions_sub') : '';
      this.savedSessionsList.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
          </svg>
          <p style="font-weight:600; font-size:1.05rem;">${noTitle}</p>
          <p style="color:var(--text-muted, #94a3b8); font-size:0.85rem; margin-top:4px;">${noSub}</p>
        </div>
      `;
      this.launchCompareBtn.disabled = true;
      this.selectionStatus.textContent = window.I18n ? window.I18n.get('compare_select_hint') : '0 oturum seçildi';
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
      this.selectAllLabel.textContent = allSelected 
        ? (window.I18n ? window.I18n.get('btn_deselect_all') : 'Seçimi Kaldır')
        : (window.I18n ? window.I18n.get('btn_select_all') : 'Tümünü Seç');
    }

    const selectedCount = this.selectedSessionIds.size;
    this.launchCompareBtn.disabled = selectedCount < 2;
    this.selectionStatus.textContent = selectedCount >= 2 
      ? `${selectedCount} ${window.I18n ? window.I18n.get('tab_history_sessions') : 'oturum'} (${window.I18n ? window.I18n.get('btn_compare_selected') : 'Kıyaslamaya hazır'})`
      : (window.I18n ? window.I18n.get('compare_select_hint') : 'Kıyaslamak için en az 2 oturum seçin');

    const lapText = window.I18n ? window.I18n.get('lap_singular') : 'Tur';

    this.savedSessionsList.innerHTML = filtered.map(session => {
      const isSelected = this.selectedSessionIds.has(session.id);
      const hasLaps = session.laps && session.laps.length > 0;

      let timeDisplay = '';
      let subLabel = '';

      if (session.type === 'stopwatch') {
        timeDisplay = FliqloUtils.formatTime(session.totalMs);
        subLabel = `${session.laps.length} ${lapText}`;
      } else {
        timeDisplay = `${FliqloUtils.formatTime(session.remainingMs)}`;
        subLabel = `${session.laps.length} ${lapText}`;
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
                  <button class="session-btn-icon" title="Detaylar" data-action="expand" data-id="${session.id}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="pointer-events:none;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                  </button>
                ` : ''}
                <button class="session-btn-icon delete" title="${window.I18n ? window.I18n.get('btn_delete_session') : 'Sil'}" data-action="delete" data-id="${session.id}">
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
                      <span style="display:inline-flex; align-items:center; gap:6px;">
                        <span>${lapText} #${String(l.index).padStart(2, '0')}</span>
                        ${l.name ? `<em style="color:#60a5fa; font-style:normal; font-size:0.8rem; font-weight:600;">(${l.name})</em>` : ''}
                      </span>
                      <span>+${FliqloUtils.formatTime(l.split)}</span>
                      <span>${FliqloUtils.formatTime(l.total)}</span>
                    </div>
                  `;
                } else {
                  return `
                    <div class="session-lap-row">
                      <span style="display:inline-flex; align-items:center; gap:6px;">
                        <span>${lapText} #${String(l.index).padStart(2, '0')}</span>
                        ${l.name ? `<em style="color:#60a5fa; font-style:normal; font-size:0.8rem; font-weight:600;">(${l.name})</em>` : ''}
                      </span>
                      <span>+${FliqloUtils.formatTime(l.split)}</span>
                      <span style="color:#22c55e;">${FliqloUtils.formatTime(l.remaining)}</span>
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
}

window.HistoryManager = HistoryManager;
