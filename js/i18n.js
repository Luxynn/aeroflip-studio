/**
 * AeroFlip Studio - Complete Internationalization (i18n) Engine
 * Full bilingual support for Turkish (TR) and English (EN).
 */

const I18N_DICTIONARY = {
  tr: {
    // Mode Switcher
    mode_clock: 'Saat',
    mode_stopwatch: 'Kronometre',
    mode_timer: 'Geri Sayım',

    // Header Tooltips
    tooltip_mode_clock_title: 'Canlı Saat Modu',
    tooltip_mode_clock_sub: 'Sistem saatini Fliqlo mekanik kartlarıyla canlı gösterir [C veya 1]',
    tooltip_mode_stopwatch_title: 'Kronometre Modu',
    tooltip_mode_stopwatch_sub: 'Hassas ileri sayım ve tur kaydı yapar [W veya 2]',
    tooltip_mode_timer_title: 'Geri Sayım Modu',
    tooltip_mode_timer_sub: 'Belirlenen süreden geriye sayar ve alarm çalar [T veya 3]',
    tooltip_wakelock_title: 'Ekranı Uyanık Tut',
    tooltip_wakelock_sub: 'Sayaç veya saat açıkken ekranın kararmasını / uykuya geçmesini engeller [K]',
    tooltip_ambience_title: 'Atmosfer & Ambiyans',
    tooltip_ambience_sub: 'Yağmur, Şömine, Kozmik Gece ve Mat Siyah arasında geçiş yapar [Y]',
    tooltip_history_title: 'Kayıtlar & Kıyaslama',
    tooltip_history_sub: 'Kayıtlı oturumları ve tur analizlerini görüntüler [H]',
    tooltip_sound_title: 'Mekanik Kart Sesi',
    tooltip_sound_sub: 'Fliqlo kart çevirme klik ses efektini açar / kapatır [S]',
    tooltip_settings_title: 'Ayarlar',
    tooltip_settings_sub: 'Kısayollar, dil, saat formatı ve veri yönetimi [O]',
    tooltip_fullscreen_title: 'Tam Ekran Modu',
    tooltip_fullscreen_sub: 'Masa saati görünümü için tam ekrana geçer [F]',

    // Main Controls
    btn_start: 'Başlat',
    btn_pause: 'Durdur',
    btn_resume: 'Devam',
    btn_reset: 'Sıfırla',
    btn_lap: 'Tur',
    btn_save: 'Kaydet',
    btn_save_tooltip: 'Oturumu Kaydet',
    format_24h_btn: '24 Saat Formatı',
    format_12h_btn: '12 Saat (AM/PM)',
    live_clock_badge: 'CANLI SAAT',
    pill_mode: 'MOD',
    pill_period: 'FORMAT',
    pill_format: 'FORMAT',
    pill_elapsed: 'GEÇEN',
    pill_diff: 'FARK',
    pill_ms: 'MS',

    // Timer Setup Screen
    timer_setup_title: 'GERİ SAYIM SÜRESİ BELİRLE',
    timer_setup_sub: 'Başlatmak istediğiniz süreyi girin veya hazır butonları kullanın',
    label_hours: 'SAAT',
    label_minutes: 'DAKİKA',
    label_seconds: 'SANİYE',
    btn_clear: 'Temizle',
    btn_start_countdown: 'Geri Sayımı Başlat',
    preset_1m: '1 Dk',
    preset_5m: '5 Dk',
    preset_15m: '15 Dk',
    preset_25m: '25 Dk (Odak)',

    // Laps Tray
    laps_header_split: 'TUR ZAMANI',
    laps_header_total: 'TOPLAM SÜRE',
    lap_singular: 'Tur',
    lap_pb_badge: 'EN İYİ',

    // Alarm / Times Up Toast
    alarm_title: 'Süre Doldu!',
    alarm_sub: 'Geri sayım başarıyla tamamlandı.',
    btn_dismiss: 'Kapat',

    // History & Compare Drawer
    history_drawer_title: 'Oturum Geçmişi & Analiz',
    history_drawer_sub: 'Kayıtlı kronometre ve geri sayım oturumlarınızı inceleyin veya kıyaslayın',
    tab_history_sessions: 'Kayıtlı Oturumlar',
    tab_history_compare: 'Kıyaslama Analizi',
    filter_all: 'Tüm Oturumlar',
    filter_stopwatch: 'Kronometre',
    filter_timer: 'Geri Sayım',
    search_placeholder: 'Oturum adı veya etiket ara...',
    btn_select_all: 'Tümünü Seç',
    btn_deselect_all: 'Seçimi Kaldır',
    btn_compare_selected: 'Kıyasla',
    no_sessions_title: 'Kayıtlı Oturum Bulunamadı',
    no_sessions_sub: 'Kronometre veya sayaç durdurulduğunda "Kaydet" butonuna basarak oturumlarınızı buraya ekleyebilirsiniz.',
    stat_total_duration: 'Toplam Süre',
    stat_lap_count: 'Tur Sayısı',
    stat_avg_lap: 'Ort. Tur',
    stat_best_lap: 'En İyi Tur',
    btn_delete_session: 'Sil',

    // Comparison Analytics View
    compare_select_hint: 'Kıyaslama için en az 2 oturum seçin',
    compare_summary_title: 'Çoklu Oturum Kıyaslama Grafiği',
    compare_lap_progression: 'Tur Zamanı İlerlemesi (Saniye)',
    compare_fastest_lap: 'En Hızlı Tur',
    compare_slowest_lap: 'En Yavaş Tur',
    compare_delta: 'Fark (Delta)',

    // Delete Confirmation Modal
    delete_modal_title: 'Oturumu Silmek İstiyor musunuz?',
    delete_modal_msg: 'Bu oturum kalıcı olarak silinecektir. Bu işlem geri alınamaz.',
    btn_confirm_delete: 'Evet, Sil',
    btn_cancel: 'Vazgeç',

    // Save Session Modal
    save_modal_title: 'Oturumu Kaydet',
    save_modal_sub: 'Oturuma bir başlık verin ve turları isimlendirin',
    label_session_title: 'Oturum Başlığı',
    session_title_placeholder: 'Örn: Sabah Koşusu / Pomodoro Seansı',
    label_lap_names: 'Turları İsimlendir (İsteğe Bağlı)',
    lap_name_placeholder: 'Tur adı girin...',
    btn_save_session_confirm: 'Kaydet',

    // Settings Modal
    settings_modal_title: 'Sistem Tercihleri & Ayarlar',
    settings_modal_sub: 'Kısayollar, genel davranışlar ve veri yönetimi',
    tab_settings_keybinds: 'Klavye Kısayolları',
    tab_settings_general: 'Genel & Dil',
    tab_settings_data: 'Veri & Yedekleme',

    // Settings: General Tab
    general_section_title: 'Dil & Arayüz Tercihleri',
    general_section_sub: 'Uygulama genel görünüm ve varsayılan davranış ayarları.',
    label_app_language: 'Uygulama Dili',
    label_clock_format: 'Saat Formatı (Canlı Saat)',
    opt_format_24h: '24 Saat Formatı (Standart)',
    opt_format_12h: '12 Saat Formatı (AM / PM)',
    label_default_mode: 'Açılış Varsayılan Modu',
    opt_mode_stopwatch: 'Kronometre (Stopwatch)',
    opt_mode_clock: 'Canlı Saat (Clock)',
    opt_mode_timer: 'Geri Sayım (Timer)',

    // Settings: Keybinds Tab
    keybind_section_title: 'Özelleştirilebilir Kısayol Tuşları',
    keybind_section_sub: 'Bir kısayolu değiştirmek için üzerine tıklayın ve yeni bir tuşa basın.',
    btn_reset_keybinds: 'Varsayılan Kısayollara Sıfırla',
    keybind_start_pause: 'Başlat / Durdur',
    keybind_reset: 'Sıfırla',
    keybind_lap: 'Tur Kaydet',
    keybind_mode_clock: 'Saat Moduna Geç',
    keybind_mode_stopwatch: 'Kronometre Moduna Geç',
    keybind_mode_timer: 'Geri Sayım Moduna Geç',
    keybind_wakelock: 'Ekran Uyanıklığı (Wake Lock)',
    keybind_ambience: 'Atmosfer & Ambiyans Değiştir',
    keybind_sound: 'Mekanik Sesi Aç / Kapat',
    keybind_fullscreen: 'Tam Ekran Aç / Kapat',
    keybind_history: 'Geçmiş & Analiz Çekmecesi',
    keybind_settings: 'Ayarlar Modalı',
    keybind_close: 'Açık Modalı Kapat (ESC)',

    // Settings: Data Tab
    data_section_title: 'Kayıtlı Veriler & Yedekleme',
    data_section_sub: 'Oturum ve tur verilerinizi cihazınıza aktarın veya yedekten geri yükleyin.',
    card_excel_title: 'Excel (.xlsx) Raporu',
    card_excel_sub: 'Özet, Oturumlar ve Turlar olmak üzere 3 sayfalı profesyonel Excel tablosu oluşturun.',
    btn_export_excel: '📊 Excel\'e Aktar',
    card_csv_title: 'CSV Tablo Dışa Aktarımı',
    card_csv_sub: 'Excel ve tablolarda açmak için turları CSV formatında dışa aktarın.',
    btn_export_csv: 'CSV İndir',
    card_json_title: 'JSON Formatında Yedekle',
    card_json_sub: 'Tüm oturum ve tur geçmişinizi JSON dosyası olarak indirin.',
    btn_export_json: 'JSON İndir',
    card_import_title: 'Yedekten İçe Aktar (Import)',
    card_import_sub: 'Daha önce aldığınız bir JSON yedeğini yükleyerek geçmişinizi geri getirin.',
    btn_import_backup: 'Yedek Yükle',
    card_clear_title: 'Tüm Oturum Geçmişini Sıfırla',
    card_clear_sub: 'Kayıtlı tüm kronometre ve geri sayım oturumlarını kalıcı olarak siler.',
    btn_clear_all: 'Tümünü Sil',

    // Toasts
    toast_lang_switched: 'Uygulama dili Türkçe olarak güncellendi 🇹🇷',
    toast_format_24h: '24 Saat Formatı Aktif 🕒',
    toast_format_12h: '12 Saat Formatı (AM/PM) Aktif 🕒',
    toast_wakelock_on: 'Ekran Uyanık Tutma Aktif ☀️',
    toast_wakelock_off: 'Ekran Uyanık Tutma Kapatıldı 🌑',
    toast_sound_on: 'Mekanik Klik Sesi Açık 🔊',
    toast_sound_off: 'Mekanik Ses Kapatıldı 🔇',
    toast_preset_cleared: 'Sayaç süresi sıfırlandı',
    toast_session_saved: 'Oturum başarıyla kaydedildi! 💾',
    toast_session_deleted: 'Oturum silindi 🗑️',
    toast_all_cleared: 'Tüm geçmiş kayıtlar temizlendi 🗑️',
    toast_excel_preparing: 'Excel motoru hazırlanıyor...',
    toast_excel_error: 'Excel motoru indirilemedi',
    toast_backup_imported: 'Yedek başarıyla içe aktarıldı! 🎉',
    toast_backup_invalid: 'Geçersiz yedek dosyası ⚠️',
    toast_default_mode: 'Varsayılan başlangıç modu güncellendi: '
  },

  en: {
    // Mode Switcher
    mode_clock: 'Clock',
    mode_stopwatch: 'Stopwatch',
    mode_timer: 'Timer',

    // Header Tooltips
    tooltip_mode_clock_title: 'Live Clock Mode',
    tooltip_mode_clock_sub: 'Displays real-time system clock on Fliqlo mechanical cards [C or 1]',
    tooltip_mode_stopwatch_title: 'Stopwatch Mode',
    tooltip_mode_stopwatch_sub: 'High-precision stopwatch with lap and split recording [W or 2]',
    tooltip_mode_timer_title: 'Countdown Timer Mode',
    tooltip_mode_timer_sub: 'Counts down from configured time and sounds alarm chime [T or 3]',
    tooltip_wakelock_title: 'Screen Wake Lock',
    tooltip_wakelock_sub: 'Prevents screen from dimming or sleeping while active [K]',
    tooltip_ambience_title: 'Atmosphere & Ambience',
    tooltip_ambience_sub: 'Cycles through Rain, Fireplace, Cosmic Stars, and Zen Dark [Y]',
    tooltip_history_title: 'History & Analytics',
    tooltip_history_sub: 'View saved sessions, lap splits, and comparative analytics [H]',
    tooltip_sound_title: 'Mechanical Flip Sound',
    tooltip_sound_sub: 'Toggles authentic Fliqlo mechanical flip click sound effects [S]',
    tooltip_settings_title: 'Settings',
    tooltip_settings_sub: 'Keybinds, language, clock format, and data management [O]',
    tooltip_fullscreen_title: 'Fullscreen Mode',
    tooltip_fullscreen_sub: 'Enters immersive fullscreen desk clock view [F]',

    // Main Controls
    btn_start: 'Start',
    btn_pause: 'Pause',
    btn_resume: 'Resume',
    btn_reset: 'Reset',
    btn_lap: 'Lap',
    btn_save: 'Save',
    btn_save_tooltip: 'Save Session',
    format_24h_btn: '24-Hour Format',
    format_12h_btn: '12-Hour (AM/PM)',
    live_clock_badge: 'LIVE CLOCK',
    pill_mode: 'MODE',
    pill_period: 'FORMAT',
    pill_format: 'FORMAT',
    pill_elapsed: 'ELAPSED',
    pill_diff: 'DELTA',
    pill_ms: 'MS',

    // Timer Setup Screen
    timer_setup_title: 'SET COUNTDOWN TIME',
    timer_setup_sub: 'Enter your desired duration or click a quick preset pill below',
    label_hours: 'HOURS',
    label_minutes: 'MINUTES',
    label_seconds: 'SECONDS',
    btn_clear: 'Clear',
    btn_start_countdown: 'Start Countdown',
    preset_1m: '1m',
    preset_5m: '5m',
    preset_15m: '15m',
    preset_25m: '25m (Focus)',

    // Laps Tray
    laps_header_split: 'LAP TIME',
    laps_header_total: 'TOTAL TIME',
    lap_singular: 'Lap',
    lap_pb_badge: 'PB',

    // Alarm / Times Up Toast
    alarm_title: 'Time\'s Up!',
    alarm_sub: 'Countdown timer successfully completed.',
    btn_dismiss: 'Dismiss',

    // History & Compare Drawer
    history_drawer_title: 'Session History & Analytics',
    history_drawer_sub: 'Review, compare, and export your saved stopwatch & timer sessions',
    tab_history_sessions: 'Saved Sessions',
    tab_history_compare: 'Comparison Analytics',
    filter_all: 'All Sessions',
    filter_stopwatch: 'Stopwatch',
    filter_timer: 'Timer',
    search_placeholder: 'Search session title or tag...',
    btn_select_all: 'Select All',
    btn_deselect_all: 'Deselect All',
    btn_compare_selected: 'Compare',
    no_sessions_title: 'No Saved Sessions Yet',
    no_sessions_sub: 'When stopwatch or timer is stopped, click "Save" to archive your sessions here.',
    stat_total_duration: 'Total Duration',
    stat_lap_count: 'Lap Count',
    stat_avg_lap: 'Avg Lap',
    stat_best_lap: 'Best Lap',
    btn_delete_session: 'Delete',

    // Comparison Analytics View
    compare_select_hint: 'Select at least 2 sessions to compare',
    compare_summary_title: 'Multi-Session Comparison Chart',
    compare_lap_progression: 'Lap Split Progression (Seconds)',
    compare_fastest_lap: 'Fastest Lap',
    compare_slowest_lap: 'Slowest Lap',
    compare_delta: 'Delta Difference',

    // Delete Confirmation Modal
    delete_modal_title: 'Delete this Session?',
    delete_modal_msg: 'This session and all its lap splits will be permanently deleted. This action cannot be undone.',
    btn_confirm_delete: 'Yes, Delete',
    btn_cancel: 'Cancel',

    // Save Session Modal
    save_modal_title: 'Save Session',
    save_modal_sub: 'Provide a title and optionally label your lap splits',
    label_session_title: 'Session Title',
    session_title_placeholder: 'e.g. Morning Run / Pomodoro Study Session',
    label_lap_names: 'Name Laps (Optional)',
    lap_name_placeholder: 'Enter lap name...',
    btn_save_session_confirm: 'Save',

    // Settings Modal
    settings_modal_title: 'System Preferences & Settings',
    settings_modal_sub: 'Customizable keybinds, clock formats, and data backup',
    tab_settings_keybinds: 'Keyboard Shortcuts',
    tab_settings_general: 'General & Language',
    tab_settings_data: 'Data & Backup',

    // Settings: General Tab
    general_section_title: 'Language & Display Preferences',
    general_section_sub: 'Configure application appearance and default behaviors.',
    label_app_language: 'Application Language',
    label_clock_format: 'Clock Format (Live Clock)',
    opt_format_24h: '24-Hour Format (Standard)',
    opt_format_12h: '12-Hour Format (AM / PM)',
    label_default_mode: 'Default Startup Mode',
    opt_mode_stopwatch: 'Stopwatch',
    opt_mode_clock: 'Live Clock',
    opt_mode_timer: 'Countdown Timer',

    // Settings: Keybinds Tab
    keybind_section_title: 'Customizable Keyboard Shortcuts',
    keybind_section_sub: 'Click on any shortcut to rebind with your preferred key.',
    btn_reset_keybinds: 'Reset to Default Shortcuts',
    keybind_start_pause: 'Start / Pause',
    keybind_reset: 'Reset',
    keybind_lap: 'Record Lap',
    keybind_mode_clock: 'Switch to Clock Mode',
    keybind_mode_stopwatch: 'Switch to Stopwatch Mode',
    keybind_mode_timer: 'Switch to Timer Mode',
    keybind_wakelock: 'Toggle Screen Wake Lock',
    keybind_ambience: 'Cycle Ambience Mode',
    keybind_sound: 'Toggle Mechanical Sound',
    keybind_fullscreen: 'Toggle Fullscreen View',
    keybind_history: 'Toggle History & Analytics',
    keybind_settings: 'Open Settings Modal',
    keybind_close: 'Close Open Modal (ESC)',

    // Settings: Data Tab
    data_section_title: 'Saved Data & Backup',
    data_section_sub: 'Export your sessions or import from a previously saved JSON backup.',
    card_excel_title: 'Excel (.xlsx) Report',
    card_excel_sub: 'Generate a clean 3-sheet Excel workbook with Summary, Sessions, and Laps.',
    btn_export_excel: '📊 Export to Excel',
    card_csv_title: 'CSV Table Export',
    card_csv_sub: 'Export granular lap split data in standard CSV format.',
    btn_export_csv: 'Download CSV',
    card_json_title: 'JSON Data Backup',
    card_json_sub: 'Download your full session and lap history as a JSON file.',
    btn_export_json: 'Download JSON',
    card_import_title: 'Restore from Backup (Import)',
    card_import_sub: 'Restore your history by uploading a previously downloaded JSON backup.',
    btn_import_backup: 'Upload Backup',
    card_clear_title: 'Clear All Session Data',
    card_clear_sub: 'Permanently deletes all saved stopwatch and timer sessions.',
    btn_clear_all: 'Clear All Data',

    // Toasts
    toast_lang_switched: 'Language set to English 🇬🇧',
    toast_format_24h: '24-Hour Format Active 🕒',
    toast_format_12h: '12-Hour (AM/PM) Format Active 🕒',
    toast_wakelock_on: 'Screen Wake Lock Active ☀️',
    toast_wakelock_off: 'Screen Wake Lock Disabled 🌑',
    toast_sound_on: 'Mechanical Sound Enabled 🔊',
    toast_sound_off: 'Mechanical Sound Muted 🔇',
    toast_preset_cleared: 'Timer preset cleared',
    toast_session_saved: 'Session saved successfully! 💾',
    toast_session_deleted: 'Session deleted 🗑️',
    toast_all_cleared: 'All history records cleared 🗑️',
    toast_excel_preparing: 'Preparing Excel engine...',
    toast_excel_error: 'Failed to load Excel engine',
    toast_backup_imported: 'Backup imported successfully! 🎉',
    toast_backup_invalid: 'Invalid backup file ⚠️',
    toast_default_mode: 'Default startup mode set to: '
  }
};

class I18nManager {
  constructor() {
    this.currentLang = localStorage.getItem('fliqlo_lang') || 'tr';
    this.listeners = [];
  }

  get(key, fallback = '') {
    const dict = I18N_DICTIONARY[this.currentLang] || I18N_DICTIONARY.tr;
    return dict[key] !== undefined ? dict[key] : (I18N_DICTIONARY.tr[key] || fallback || key);
  }

  setLanguage(lang) {
    if (lang !== 'tr' && lang !== 'en') lang = 'tr';
    this.currentLang = lang;
    localStorage.setItem('fliqlo_lang', lang);
    document.documentElement.lang = lang;

    this.applyToDOM();

    // Notify registered subsystem listeners
    this.listeners.forEach(fn => {
      try {
        fn(lang);
      } catch (err) {
        console.warn('Error in i18n listener', err);
      }
    });
  }

  onLanguageChange(callback) {
    if (typeof callback === 'function') {
      this.listeners.push(callback);
    }
  }

  applyToDOM() {
    // 1. Static Text content
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key) {
        const text = this.get(key);
        if (text) {
          el.textContent = text;
        }
      }
    });

    // 2. Input Placeholders
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) {
        const ph = this.get(key);
        if (ph) {
          el.placeholder = ph;
        }
      }
    });

    // 3. Title Attributes
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key) {
        const title = this.get(key);
        if (title) {
          el.title = title;
        }
      }
    });

    // 4. Interactive Floating Tooltips
    document.querySelectorAll('[data-i18n-tooltip]').forEach(el => {
      const titleKey = el.getAttribute('data-i18n-tooltip');
      const subKey = el.getAttribute('data-i18n-tooltip-sub');
      if (titleKey) {
        el.setAttribute('data-tooltip', this.get(titleKey));
      }
      if (subKey) {
        el.setAttribute('data-tooltip-sub', this.get(subKey));
      }
    });
  }
}

// Global Single Instance
window.I18n = new I18nManager();
