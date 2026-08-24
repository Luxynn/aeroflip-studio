window.FliqloUtils = {
  formatTime(ms) {
    if (ms === null || ms === undefined || isNaN(ms)) return '00:00:00.00';
    const totalSeconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const h = String(hours).padStart(2, '0');
    const m = String(minutes).padStart(2, '0');
    const s = String(seconds).padStart(2, '0');
    const msec = String(milliseconds).padStart(2, '0');

    return `${h}:${m}:${s}.${msec}`;
  },

  formatTimeHMS(ms) {
    return this.formatTime(ms).slice(0, 8);
  }
};
