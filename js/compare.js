class ComparisonAnalytics {
  constructor(containerElement) {
    this.container = containerElement;
    this.popoverEl = null;
    this.activeCell = null;
    this.initPopover();
  }

  initPopover() {
    let existing = document.getElementById('compareSilhouettePopover');
    if (existing) {
      this.popoverEl = existing;
      return;
    }

    this.popoverEl = document.createElement('div');
    this.popoverEl.id = 'compareSilhouettePopover';
    this.popoverEl.className = 'compare-silhouette-popover';
    document.body.appendChild(this.popoverEl);

    // Event delegation on container
    if (this.container) {
      this.container.addEventListener('mouseenter', (e) => {
        const cell = e.target.closest('.lap-interactive-cell');
        if (cell) this.showPopover(cell);
      }, true);

      this.container.addEventListener('mouseleave', (e) => {
        const cell = e.target.closest('.lap-interactive-cell');
        if (cell) this.hidePopover();
      }, true);

      this.container.addEventListener('mousemove', (e) => {
        const cell = e.target.closest('.lap-interactive-cell');
        if (cell && this.activeCell === cell) {
          this.positionPopover(cell);
        }
      });
    }
  }

  showPopover(cell) {
    this.activeCell = cell;
    const type = cell.dataset.popoverType;
    const sessionName = decodeURIComponent(cell.dataset.sessionName || '');

    if (type === 'timer') {
      const checkpointNo = cell.dataset.checkpointNo;
      const remaining = parseInt(cell.dataset.remaining, 10) || 0;
      const elapsed = parseInt(cell.dataset.elapsed, 10) || 0;
      const split = parseInt(cell.dataset.split, 10) || 0;
      const target = parseInt(cell.dataset.target, 10) || 0;
      const percent = parseFloat(cell.dataset.percent) || 0;
      const isBest = cell.dataset.isBest === 'true';

      this.popoverEl.innerHTML = `
        <div class="popover-glow-ambient"></div>
        <div class="popover-header">
          <div class="popover-title-group">
            <span class="popover-session-name">${sessionName}</span>
            <span class="popover-tag-label">Ara Kayıt #${checkpointNo} Detayı</span>
          </div>
          ${isBest ? '<span class="popover-badge-best">EN ÇOK KALAN</span>' : ''}
        </div>

        <div class="popover-hero-metric">
          <span class="popover-hero-label">Kalan Süre (Kaç Kala)</span>
          <span class="popover-hero-value">${FliqloUtils.formatTime(remaining)}</span>
        </div>

        <div class="popover-grid-details">
          <div class="popover-grid-cell">
            <span class="popover-sub-label">Geçen Süre</span>
            <span class="popover-sub-val">${FliqloUtils.formatTime(elapsed)}</span>
          </div>
          <div class="popover-grid-cell">
            <span class="popover-sub-label">Aralık Farkı</span>
            <span class="popover-sub-val">+${FliqloUtils.formatTime(split)}</span>
          </div>
          <div class="popover-grid-cell">
            <span class="popover-sub-label">Hedef Süre</span>
            <span class="popover-sub-val">${FliqloUtils.formatTimeHMS(target)}</span>
          </div>
          <div class="popover-grid-cell">
            <span class="popover-sub-label">Tamamlanma</span>
            <span class="popover-sub-val" style="color:#60a5fa;">%${percent.toFixed(1)}</span>
          </div>
        </div>

        <div class="popover-progress-container">
          <div class="popover-progress-meta">
            <span>Zaman İlerlemesi</span>
            <span class="percent-text">%${percent.toFixed(1)}</span>
          </div>
          <div class="popover-progress-track">
            <div class="popover-progress-fill" style="width: ${percent}%;"></div>
          </div>
        </div>
      `;
    } else {
      const lapNo = cell.dataset.lapNo;
      const split = parseInt(cell.dataset.split, 10) || 0;
      const total = parseInt(cell.dataset.total, 10) || 0;
      const isFastest = cell.dataset.isFastest === 'true';
      const isPb = cell.dataset.isPb === 'true';

      this.popoverEl.innerHTML = `
        <div class="popover-glow-ambient"></div>
        <div class="popover-header">
          <div class="popover-title-group">
            <span class="popover-session-name">${sessionName}</span>
            <span class="popover-tag-label">Tur #${lapNo} Detayı</span>
          </div>
          ${isFastest ? '<span class="popover-badge-best">EN HIZLI TUR</span>' : (isPb ? '<span class="popover-badge-best" style="border-color:#3b82f6; color:#60a5fa; background:rgba(59,130,246,0.15)">EN İYİ TUR</span>' : '')}
        </div>

        <div class="popover-hero-metric">
          <span class="popover-hero-label">Tur Süresi (Split)</span>
          <span class="popover-hero-value blue">+${FliqloUtils.formatTime(split)}</span>
        </div>

        <div class="popover-grid-details">
          <div class="popover-grid-cell">
            <span class="popover-sub-label">Toplam Süre</span>
            <span class="popover-sub-val">${FliqloUtils.formatTime(total)}</span>
          </div>
          <div class="popover-grid-cell">
            <span class="popover-sub-label">Tur Numarası</span>
            <span class="popover-sub-val">#${lapNo}</span>
          </div>
        </div>
      `;
    }

    this.positionPopover(cell);
    this.popoverEl.classList.add('visible');
  }

  positionPopover(cell) {
    if (!this.popoverEl) return;

    const rect = cell.getBoundingClientRect();
    const popoverWidth = this.popoverEl.offsetWidth || 290;
    const popoverHeight = this.popoverEl.offsetHeight || 190;

    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    let top = rect.top - popoverHeight - 10;

    // Viewport clamp horizontal
    if (left < 12) left = 12;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = window.innerWidth - popoverWidth - 12;
    }

    // Viewport flip vertical if not enough room on top
    if (top < 10) {
      top = rect.bottom + 10;
    }

    this.popoverEl.style.left = `${left}px`;
    this.popoverEl.style.top = `${top}px`;
  }

  hidePopover() {
    this.activeCell = null;
    if (this.popoverEl) {
      this.popoverEl.classList.remove('visible');
    }
  }

  render(selectedSessions, type) {
    if (!this.container) return;

    if (!selectedSessions || selectedSessions.length < 2) {
      const typeText = type === 'stopwatch' ? 'Kronometre' : 'Geri Sayım';
      this.container.innerHTML = `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polyline points="16 3 21 3 21 8"></polyline><line x1="4" y1="20" x2="21" y2="3"></line><polyline points="21 16 21 21 16 21"></polyline><line x1="15" y1="15" x2="21" y2="21"></line>
          </svg>
          <p>Kıyaslama yapabilmek için listeden en az 2 adet <strong>${typeText}</strong> oturumu seçmelisiniz.</p>
        </div>
      `;
      return;
    }

    if (type === 'stopwatch') {
      this.renderStopwatchComparison(selectedSessions);
    } else {
      this.renderTimerComparison(selectedSessions);
    }
  }

  renderStopwatchComparison(selected) {
    const fastestTotalMs = Math.min(...selected.map(s => s.totalMs));

    const cardsHtml = selected.map(s => {
      const isFastest = s.totalMs === fastestTotalMs;
      const diffMs = s.totalMs - fastestTotalMs;
      const diffText = isFastest ? 'EN HIZLI' : `+${(diffMs / 1000).toFixed(2)}s (${((diffMs / fastestTotalMs) * 100).toFixed(1)}% fark)`;
      const avgLap = s.laps && s.laps.length > 0 ? s.totalMs / s.laps.length : s.totalMs;

      return `
        <div class="compare-card ${isFastest ? 'winner' : ''}">
          <div class="compare-card-title">
            <h4>${s.name}</h4>
            ${isFastest ? '<span class="badge-win">LİDER</span>' : ''}
          </div>

          <div class="compare-metrics">
            <div class="metric-row">
              <span class="metric-label">Toplam Süre:</span>
              <span class="metric-value">${FliqloUtils.formatTime(s.totalMs)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Lidere Fark:</span>
              <span class="metric-diff ${isFastest ? 'faster' : 'slower'}">${diffText}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Tur Sayısı:</span>
              <span class="metric-value">${s.laps ? s.laps.length : 0} Tur</span>
            </div>
            ${s.bestLapMs ? `
              <div class="metric-row">
                <span class="metric-label">En İyi Tur:</span>
                <span class="metric-value">${FliqloUtils.formatTime(s.bestLapMs)}</span>
              </div>
            ` : ''}
            <div class="metric-row">
              <span class="metric-label">Ortalama Tur:</span>
              <span class="metric-value">${FliqloUtils.formatTime(avgLap)}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const maxLaps = Math.max(...selected.map(s => (s.laps ? s.laps.length : 0)));
    let lapTableHtml = '';

    if (maxLaps > 0) {
      const getSortedLaps = (session) => {
        if (!session.laps) return [];
        return [...session.laps].sort((a, b) => (a.index || 0) - (b.index || 0));
      };

      let tableRows = '';
      for (let i = 0; i < maxLaps; i++) {
        const lapSplits = selected.map(s => {
          const sorted = getSortedLaps(s);
          return sorted[i] ? sorted[i].split : Infinity;
        });
        const fastestLapSplit = Math.min(...lapSplits);

        const cells = selected.map(s => {
          const sorted = getSortedLaps(s);
          const lapData = sorted[i] || null;
          if (!lapData) return '<td style="color:#555;">-</td>';

          const isFastestLap = lapData.split === fastestLapSplit && selected.length > 1 && fastestLapSplit !== Infinity;
          const isPb = s.bestLapMs && lapData.split === s.bestLapMs;

          return `
            <td class="lap-interactive-cell ${isFastestLap ? 'cell-faster' : ''}"
                data-popover-type="stopwatch"
                data-session-name="${encodeURIComponent(s.name)}"
                data-lap-no="${i + 1}"
                data-split="${lapData.split}"
                data-total="${lapData.total}"
                data-is-fastest="${isFastestLap}"
                data-is-pb="${isPb}">
              <div class="cell-pill-wrap">
                <span>+${FliqloUtils.formatTime(lapData.split)}</span>
                <span class="cell-hint-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
              </div>
            </td>
          `;
        }).join('');

        tableRows += `
          <tr>
            <td><strong>Tur #${i + 1}</strong></td>
            ${cells}
          </tr>
        `;
      }

      lapTableHtml = `
        <div style="margin-top: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color:#fff; letter-spacing: 1px;">TUR BAZLI KIYASLAMA</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">💡 Detaylar için sürelerin üzerine gelin</span>
          </div>
          <div class="lap-compare-table-wrap">
            <table class="lap-compare-table">
              <thead>
                <tr>
                  <th>Tur No</th>
                  ${selected.map(s => `<th>${s.name}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="compare-grid">${cardsHtml}</div>
      ${lapTableHtml}
    `;
  }

  renderTimerComparison(selected) {
    const maxRemainingMs = Math.max(...selected.map(s => s.remainingMs));

    const cardsHtml = selected.map(s => {
      const isWinner = s.remainingMs === maxRemainingMs && maxRemainingMs > 0;
      const diffMs = maxRemainingMs - s.remainingMs;
      const diffText = isWinner ? 'EN ERKEN BİTİREN' : `-${(diffMs / 1000).toFixed(2)}s daha az süre kaldı`;

      return `
        <div class="compare-card ${isWinner ? 'winner' : ''}">
          <div class="compare-card-title">
            <h4>${s.name}</h4>
            ${isWinner ? '<span class="badge-win">EN ERKEN</span>' : ''}
          </div>

          <div class="compare-metrics">
            <div class="metric-row">
              <span class="metric-label">Hedef Süre:</span>
              <span class="metric-value">${FliqloUtils.formatTimeHMS(s.targetDurationMs)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Kalan Süre (Kaç Kala):</span>
              <span class="metric-value" style="color:#22c55e;">${FliqloUtils.formatTime(s.remainingMs)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Geçen Toplam Süre:</span>
              <span class="metric-value">${FliqloUtils.formatTime(s.elapsedMs)}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Ara Kayıt Sayısı:</span>
              <span class="metric-value">${s.laps ? s.laps.length : 0} Kayıt</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Fark Analizi:</span>
              <span class="metric-diff ${isWinner ? 'faster' : 'slower'}">${diffText}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    const maxCheckpoints = Math.max(...selected.map(s => (s.laps ? s.laps.length : 0)));
    let checkpointTableHtml = '';

    if (maxCheckpoints > 0) {
      const getSortedLaps = (session) => {
        if (!session.laps) return [];
        return [...session.laps].sort((a, b) => (a.index || 0) - (b.index || 0));
      };

      let tableRows = '';
      for (let i = 0; i < maxCheckpoints; i++) {
        const remainingTimes = selected.map(s => {
          const sorted = getSortedLaps(s);
          return (sorted[i] && sorted[i].remaining !== undefined) ? sorted[i].remaining : -1;
        });
        const maxRemain = Math.max(...remainingTimes);

        const cells = selected.map(s => {
          const sorted = getSortedLaps(s);
          const l = sorted[i] || null;
          if (!l) return '<td style="color:#555;">-</td>';

          const isBestRemain = l.remaining === maxRemain && selected.length > 1 && maxRemain > 0;
          const elapsedSoFar = l.elapsed || Math.max(0, s.targetDurationMs - l.remaining);
          const percent = s.targetDurationMs > 0 ? Math.min(100, Math.max(0, (elapsedSoFar / s.targetDurationMs) * 100)) : 0;

          return `
            <td class="lap-interactive-cell ${isBestRemain ? 'cell-faster' : ''}"
                data-popover-type="timer"
                data-session-name="${encodeURIComponent(s.name)}"
                data-checkpoint-no="${i + 1}"
                data-remaining="${l.remaining}"
                data-elapsed="${elapsedSoFar}"
                data-split="${l.split || 0}"
                data-target="${s.targetDurationMs}"
                data-percent="${percent.toFixed(1)}"
                data-is-best="${isBestRemain}">
              <div class="cell-pill-wrap">
                <span>${FliqloUtils.formatTime(l.remaining)} kala</span>
                <span class="cell-hint-icon">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                </span>
              </div>
            </td>
          `;
        }).join('');

        tableRows += `
          <tr>
            <td><strong>Ara Kayıt #${i + 1}</strong></td>
            ${cells}
          </tr>
        `;
      }

      checkpointTableHtml = `
        <div style="margin-top: 10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
            <h4 style="font-size: 0.95rem; font-weight: 800; color:#fff; letter-spacing: 1px;">ARA KAYIT (CHECKPOINT) KIYASLAMASI</h4>
            <span style="font-size: 0.75rem; color: var(--text-muted);">💡 Detaylar için sürelerin üzerine gelin</span>
          </div>
          <div class="lap-compare-table-wrap">
            <table class="lap-compare-table">
              <thead>
                <tr>
                  <th>Kayıt No</th>
                  ${selected.map(s => `<th>${s.name}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    this.container.innerHTML = `
      <div class="compare-grid">${cardsHtml}</div>
      ${checkpointTableHtml}
    `;
  }
}

window.ComparisonAnalytics = ComparisonAnalytics;
