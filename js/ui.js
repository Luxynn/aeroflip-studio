const TOAST_DURATION_MS = 2800;
const ZEN_INACTIVITY_DELAY_MS = 3500;
const ZEN_THROTTLE_INTERVAL_MS = 150;
const TOOLTIP_SCREEN_EDGE_MARGIN_PX = 10;

class UIManager {
  constructor(app) {
    this.app = app;
    this.quickToast = document.getElementById('quickToast');
    this.toastIcon = document.getElementById('toastIcon');
    this.toastText = document.getElementById('toastText');
    this.toastTimeout = null;

    this.appTooltip = document.getElementById('appTooltip');
    this.tooltipTitle = document.getElementById('tooltipTitle');
    this.tooltipSub = document.getElementById('tooltipSub');

    this.taskGoalBar = document.getElementById('taskGoalBar');
    this.taskGoalInput = document.getElementById('taskGoalInput');
    this.taskClearBtn = document.getElementById('taskClearBtn');

    this.wakeLockBtn = document.getElementById('wakeLockBtn');
    this.wakeLock = null;
    this.wakeLockEnabled = localStorage.getItem('aeroflip_wakelock_enabled') === 'true';

    this.zenTimeout = null;

    this.init();
  }

  init() {
    this.setupTooltipEngine();
    this.setupZenMode();
    this.setupTaskGoal();
    this.setupWakeLockEvents();
  }

  /* ============================================================
     1. TOAST NOTIFICATIONS
     ============================================================ */
  showToast(message, icon = '💡') {
    if (!this.quickToast || !this.toastText) return;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);

    if (this.toastIcon) this.toastIcon.textContent = icon;
    this.toastText.textContent = message;

    this.quickToast.classList.add('show');
    this.toastTimeout = setTimeout(() => {
      this.quickToast.classList.remove('show');
    }, TOAST_DURATION_MS);
  }

  /* ============================================================
     2. FLOATING TOOLTIPS
     ============================================================ */
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

      if (left < TOOLTIP_SCREEN_EDGE_MARGIN_PX) left = TOOLTIP_SCREEN_EDGE_MARGIN_PX;
      if (left + tooltipRect.width > window.innerWidth - TOOLTIP_SCREEN_EDGE_MARGIN_PX) {
        left = window.innerWidth - tooltipRect.width - TOOLTIP_SCREEN_EDGE_MARGIN_PX;
      }
      if (top + tooltipRect.height > window.innerHeight - TOOLTIP_SCREEN_EDGE_MARGIN_PX) {
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

  /* ============================================================
     3. ZEN / MINIMALIST FOCUS MODE (150ms Throttled)
     ============================================================ */
  setupZenMode() {
    let lastZenCheck = 0;
    const resetZenTimer = () => {
      const now = performance.now();
      if (document.body.classList.contains('zen-mode')) {
        document.body.classList.remove('zen-mode');
      }
      if (now - lastZenCheck < ZEN_THROTTLE_INTERVAL_MS) return;
      lastZenCheck = now;

      if (this.zenTimeout) clearTimeout(this.zenTimeout);

      const hasOpenModal = !!document.querySelector('.modal-backdrop:not(.hidden)');
      if ((this.app.isRunning || this.app.mode === 'clock') && !hasOpenModal) {
        this.zenTimeout = setTimeout(() => {
          const isStillOpen = !!document.querySelector('.modal-backdrop:not(.hidden)');
          if ((this.app.isRunning || this.app.mode === 'clock') && !isStillOpen) {
            document.body.classList.add('zen-mode');
          }
        }, ZEN_INACTIVITY_DELAY_MS);
      }
    };

    ['mousemove', 'mousedown', 'keydown', 'touchstart'].forEach(evt => {
      document.addEventListener(evt, resetZenTimer, { passive: true });
    });
  }

  /* ============================================================
     4. TASK / FOCUS GOAL BAR
     ============================================================ */
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

  /* ============================================================
     5. SCREEN WAKE LOCK API
     ============================================================ */
  setupWakeLockEvents() {
    if (this.wakeLockBtn) {
      this.wakeLockBtn.addEventListener('click', () => this.toggleWakeLock());
    }

    // Auto-restore Wake Lock on F5 / startup if previously enabled
    if (this.wakeLockEnabled) {
      if (this.wakeLockBtn) {
        this.wakeLockBtn.classList.add('active-wake');
        this.wakeLockBtn.title = 'Ekran Uyanık Tutuluyor (Aktif)';
      }
      this.requestWakeLock(true);

      // Fallback: acquire on first user gesture if browser policy requires it on load
      const onFirstInteraction = () => {
        if (this.wakeLockEnabled && !this.wakeLock) {
          this.requestWakeLock(true);
        }
        window.removeEventListener('pointerdown', onFirstInteraction);
        window.removeEventListener('keydown', onFirstInteraction);
      };
      window.addEventListener('pointerdown', onFirstInteraction, { passive: true, once: true });
      window.addEventListener('keydown', onFirstInteraction, { passive: true, once: true });
    }

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.wakeLockEnabled) {
        this.requestWakeLock(true);
      }
    });
  }

  async requestWakeLock(silent = false) {
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        this.wakeLockEnabled = true;
        try {
          localStorage.setItem('aeroflip_wakelock_enabled', 'true');
        } catch (e) {
          console.warn('Failed to save wakelock state', e);
        }
        if (this.wakeLockBtn) {
          this.wakeLockBtn.classList.add('active-wake');
          this.wakeLockBtn.title = 'Ekran Uyanık Tutuluyor (Aktif)';
        }
        if (!silent) {
          this.showToast('Ekran Uyanık Tutma Açık — Cihaz uyku moduna geçmeyecek', '☀️');
        }
        this.wakeLock.addEventListener('release', () => {
          if (!this.wakeLockEnabled && this.wakeLockBtn) {
            this.wakeLockBtn.classList.remove('active-wake');
            this.wakeLockBtn.title = 'Ekranı Uyanık Tut (Wake Lock)';
          }
        });
      } catch (err) {
        console.warn('Wake Lock error:', err);
        if (!silent) {
          this.showToast('Tarayıcınız Wake Lock iznini onaylamadı', '⚠️');
        }
      }
    } else {
      if (!silent) {
        this.showToast('Tarayıcınız Wake Lock API desteklemiyor', '⚠️');
      }
    }
  }

  releaseWakeLock() {
    this.wakeLockEnabled = false;
    try {
      localStorage.setItem('aeroflip_wakelock_enabled', 'false');
    } catch (e) {
      console.warn('Failed to save wakelock state', e);
    }
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
      this.requestWakeLock(false);
    }
  }

  /* ============================================================
     6. GLASSMORPHIC CONFIRMATION DIALOG PROMISE
     ============================================================ */
  confirmDialog({
    title = 'Emin misiniz?',
    message = 'Bu işlem geri alınamaz.',
    confirmText = 'Evet, Sil',
    cancelText = 'Vazgeç',
    icon = 'trash'
  } = {}) {
    return new Promise((resolve) => {
      const backdrop = document.getElementById('confirmModalBackdrop');
      const titleEl = document.getElementById('confirmModalTitle');
      const msgEl = document.getElementById('confirmModalMessage');
      const confirmBtn = document.getElementById('confirmModalConfirmBtn');
      const cancelBtn = document.getElementById('confirmModalCancelBtn');
      const iconSvg = document.getElementById('confirmModalIconSvg');

      if (!backdrop || !confirmBtn || !cancelBtn) {
        resolve(window.confirm(message));
        return;
      }

      if (titleEl) titleEl.textContent = title;
      if (msgEl) msgEl.textContent = message;
      if (confirmBtn) confirmBtn.textContent = confirmText;
      if (cancelBtn) cancelBtn.textContent = cancelText;

      if (iconSvg) {
        if (icon === 'warning') {
          iconSvg.innerHTML = `
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          `;
        } else {
          iconSvg.innerHTML = `
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          `;
        }
      }

      backdrop.classList.remove('hidden');

      const cleanup = (result) => {
        backdrop.classList.add('hidden');
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        document.removeEventListener('keydown', onKeyDown);
        resolve(result);
      };

      const onConfirm = () => cleanup(true);
      const onCancel = () => cleanup(false);
      const onKeyDown = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          cleanup(false);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          cleanup(true);
        }
      };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      document.addEventListener('keydown', onKeyDown);
    });
  }
}

window.UIManager = UIManager;
