class SessionStore {
  constructor(storageKey = 'fliqlo_saved_sessions') {
    this.storageKey = storageKey;
    this.sessions = this.load();
  }

  load() {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.warn('LocalStorage load failed', e);
      return [];
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.sessions));
    } catch (e) {
      console.warn('LocalStorage save failed', e);
    }
  }

  getAll() {
    return this.sessions;
  }

  getByType(type) {
    return this.sessions.filter(s => s.type === type);
  }

  addSession(session) {
    this.sessions.unshift(session);
    this.save();
  }

  deleteSession(id) {
    this.sessions = this.sessions.filter(s => s.id !== id);
    this.save();
  }

  getCounts() {
    return {
      total: this.sessions.length,
      stopwatch: this.sessions.filter(s => s.type === 'stopwatch').length,
      timer: this.sessions.filter(s => s.type === 'timer').length
    };
  }
}

window.SessionStore = SessionStore;
