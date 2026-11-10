// MULTITOOL ARACI - IceGlass Edition
// Sunucu kurma (SCPI / TCP soket)  •  Ethernet ayarı  •  USB panel kontrolü
// Sadece Windows. Sunucular, menü exe'sinden bağımsız arka plan süreci olarak çalışır.
// Konumdan bağımsız: Exe'yi nereye taşırsanız taşıyın, arka plan servisi C:\ProgramData\KeysightSim
// altındaki kopyası üzerinden kesintisiz çalışır ve her menüden durdurulabilir.
//
// Tuşlar (her menüde):
//   Tab        → Ana menüye dön
//   Backspace  → Bir geri git (yazı girişinde: boş satırda Backspace = iptal / geri)
//   n / s / g  → Network / Spectrum / Jeneratör sunucusunu aç-kapat
//   a / k      → Tüm sunucuları başlat / durdur

use std::collections::HashSet;
use std::fs::{self, OpenOptions};
use std::io::{self, BufRead, BufReader, Read, Seek, SeekFrom, Write};
use std::net::{Ipv4Addr, SocketAddr, TcpListener, TcpStream};
use std::os::windows::process::CommandExt;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};

const SCPI_PORT: u16 = 5025; // Varsayılan SCPI portu (cihaz başına değiştirilebilir)
const CREATE_NO_WINDOW: u32 = 0x0800_0000; // Yardımcı süreçlerde konsol penceresi açılmasın

// ───────────────────────── Görünüm sabitleri ─────────────────────────
// Not: Konsol yazı tipi (Consolas) yalnızca WGL4 karakter kümesini garanti eder.
// Bu yüzden yuvarlak köşeli kutu karakterleri, emoji ve ✔ ✖ gibi simgeler kullanılmaz;
// aksi halde kare / soru işareti olarak görünüp okunmaz hale gelirler.

const CONSOLE_COLS: u32 = 100;
const CONSOLE_LINES: u32 = 46;
const INNER: usize = 92; // Başlık kutusunun iç genişliği

const S_OK: &str = "√";
const S_ERR: &str = "×";
const S_WARN: &str = "!";
const S_ARROW: &str = "►";

const C_RESET: &str = "\x1b[0m";
const C_BOLD: &str = "\x1b[1m";

// ───────────────────────── Tema / renk paletleri (10 adet) ─────────────────────────
// İstek 19: Renk sabitleri temaya bağlı dinamik hale getirildi. Her tema 9 renk içerir:
// (ice, frost, white, dim, num, ok, warn, err, bg). Seçim settings.json'da kalıcıdır.
struct Theme {
    name: &'static str,
    ice: &'static str,
    frost: &'static str,
    white: &'static str,
    dim: &'static str,
    num: &'static str,
    ok: &'static str,
    warn: &'static str,
    err: &'static str,
    bg: &'static str,
}

const THEMES: [Theme; 10] = [
    Theme { name: "IceGlass", ice: "\x1b[38;2;0;229;255m", frost: "\x1b[38;2;140;200;235m", white: "\x1b[38;2;240;248;255m", dim: "\x1b[38;2;110;135;160m", num: "\x1b[1;38;2;255;215;64m", ok: "\x1b[1;38;2;0;230;118m", warn: "\x1b[1;38;2;255;171;0m", err: "\x1b[1;38;2;255;82;82m", bg: "\x1b[48;2;14;28;46m" },
    Theme { name: "Aurora", ice: "\x1b[38;2;80;250;180m", frost: "\x1b[38;2;130;200;255m", white: "\x1b[38;2;238;245;255m", dim: "\x1b[38;2;120;140;170m", num: "\x1b[1;38;2;180;255;120m", ok: "\x1b[1;38;2;60;230;150m", warn: "\x1b[1;38;2;255;210;100m", err: "\x1b[1;38;2;255;110;150m", bg: "\x1b[48;2;12;24;38m" },
    Theme { name: "Sunset", ice: "\x1b[38;2;255;160;80m", frost: "\x1b[38;2;255;190;140m", white: "\x1b[38;2;255;245;238m", dim: "\x1b[38;2;170;130;120m", num: "\x1b[1;38;2;255;215;120m", ok: "\x1b[1;38;2;120;230;140m", warn: "\x1b[1;38;2;255;180;70m", err: "\x1b[1;38;2;255;90;90m", bg: "\x1b[48;2;40;20;24m" },
    Theme { name: "Matrix", ice: "\x1b[38;2;0;255;120m", frost: "\x1b[38;2;80;220;120m", white: "\x1b[38;2;200;255;200m", dim: "\x1b[38;2;80;140;90m", num: "\x1b[1;38;2;160;255;120m", ok: "\x1b[1;38;2;0;255;120m", warn: "\x1b[1;38;2;220;255;80m", err: "\x1b[1;38;2;255;90;90m", bg: "\x1b[48;2;6;20;10m" },
    Theme { name: "Cyberpunk", ice: "\x1b[38;2;0;255;255m", frost: "\x1b[38;2;255;100;220m", white: "\x1b[38;2;245;240;255m", dim: "\x1b[38;2;150;110;170m", num: "\x1b[1;38;2;255;240;60m", ok: "\x1b[1;38;2;80;255;180m", warn: "\x1b[1;38;2;255;180;60m", err: "\x1b[1;38;2;255;60;140m", bg: "\x1b[48;2;24;10;38m" },
    Theme { name: "Ocean", ice: "\x1b[38;2;60;200;255m", frost: "\x1b[38;2;120;190;220m", white: "\x1b[38;2;235;245;252m", dim: "\x1b[38;2;100;130;160m", num: "\x1b[1;38;2;120;230;255m", ok: "\x1b[1;38;2;60;220;180m", warn: "\x1b[1;38;2;255;200;90m", err: "\x1b[1;38;2;255;110;110m", bg: "\x1b[48;2;8;24;40m" },
    Theme { name: "Forest", ice: "\x1b[38;2;120;220;140m", frost: "\x1b[38;2;160;200;150m", white: "\x1b[38;2;240;248;238m", dim: "\x1b[38;2;110;140;110m", num: "\x1b[1;38;2;210;230;120m", ok: "\x1b[1;38;2;110;220;120m", warn: "\x1b[1;38;2;230;200;90m", err: "\x1b[1;38;2;240;120;100m", bg: "\x1b[48;2;14;26;16m" },
    Theme { name: "Amber", ice: "\x1b[38;2;255;200;80m", frost: "\x1b[38;2;230;190;130m", white: "\x1b[38;2;252;245;230m", dim: "\x1b[38;2;160;140;100m", num: "\x1b[1;38;2;255;220;100m", ok: "\x1b[1;38;2;180;220;100m", warn: "\x1b[1;38;2;255;180;60m", err: "\x1b[1;38;2;255;110;90m", bg: "\x1b[48;2;32;24;10m" },
    Theme { name: "Mono", ice: "\x1b[38;2;220;220;220m", frost: "\x1b[38;2;180;180;180m", white: "\x1b[38;2;245;245;245m", dim: "\x1b[38;2;120;120;120m", num: "\x1b[1;38;2;255;255;255m", ok: "\x1b[1;38;2;200;200;200m", warn: "\x1b[1;38;2;190;190;190m", err: "\x1b[1;38;2;240;240;240m", bg: "\x1b[48;2;20;20;20m" },
    Theme { name: "Rose", ice: "\x1b[38;2;255;150;190m", frost: "\x1b[38;2;240;180;210m", white: "\x1b[38;2;255;240;248m", dim: "\x1b[38;2;170;120;140m", num: "\x1b[1;38;2;255;200;120m", ok: "\x1b[1;38;2;150;230;170m", warn: "\x1b[1;38;2;255;190;110m", err: "\x1b[1;38;2;255;90;120m", bg: "\x1b[48;2;38;16;26m" },
];

static THEME_IDX: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

fn thm() -> &'static Theme {
    &THEMES[THEME_IDX.load(Ordering::Relaxed).min(THEMES.len() - 1)]
}
fn ci() -> &'static str { thm().ice }
fn cf() -> &'static str { thm().frost }
fn cw() -> &'static str { thm().white }
fn cd() -> &'static str { thm().dim }
fn cn() -> &'static str { thm().num }
fn cok() -> &'static str { thm().ok }
fn cwn() -> &'static str { thm().warn }
fn cer() -> &'static str { thm().err }
fn cbg() -> &'static str { thm().bg }

// ───────────────────────── Win32 yerel çağrılar (PowerShell gerektirmez) ─────────────────────────

type Handle = isize;

#[repr(C)]
struct ConsoleFontInfoEx {
    cb_size: u32,
    n_font: u32,
    size_x: i16,
    size_y: i16,
    family: u32,
    weight: u32,
    face: [u16; 32],
}

#[repr(C)]
struct WinTime {
    year: u16,
    month: u16,
    dow: u16,
    day: u16,
    hour: u16,
    minute: u16,
    second: u16,
    ms: u16,
}

#[repr(C)]
struct Rect {
    left: i32,
    top: i32,
    right: i32,
    bottom: i32,
}

// SendInput için fare giriş yapısı (İstek 16: Fare tıklayıcısı)
#[repr(C)]
struct MouseInput {
    dx: i32,
    dy: i32,
    mouse_data: u32,
    dw_flags: u32,
    time: u32,
    dw_extra_info: usize,
}
#[repr(C)]
struct InputRec {
    type_: u32,
    _pad: u32,
    mi: MouseInput,
}

extern "system" {
    fn GetStdHandle(n_std_handle: i32) -> Handle;
    fn GetConsoleMode(h: Handle, mode: *mut u32) -> i32;
    fn SetConsoleMode(h: Handle, mode: u32) -> i32;
    fn SetCurrentConsoleFontEx(h: Handle, max_window: i32, info: *const ConsoleFontInfoEx) -> i32;
    fn GetConsoleWindow() -> Handle;
    fn SetConsoleOutputCP(cp: u32) -> i32;
    fn SetConsoleCP(cp: u32) -> i32;
    fn SetConsoleTitleW(title: *const u16) -> i32;
    fn GetLocalTime(st: *mut WinTime);
    // İstek 18: Uyku engelleyici
    fn SetThreadExecutionState(flags: u32) -> u32;
}

#[link(name = "user32")]
extern "system" {
    fn GetWindowLongW(hwnd: Handle, index: i32) -> i32;
    fn SetWindowLongW(hwnd: Handle, index: i32, value: i32) -> i32;
    fn SetLayeredWindowAttributes(hwnd: Handle, key: u32, alpha: u8, flags: u32) -> i32;
    // İstek 1: çözünürlük / DPI okuma + pencere ortalama
    fn GetSystemMetrics(index: i32) -> i32;
    fn GetWindowRect(hwnd: Handle, rect: *mut Rect) -> i32;
    fn MoveWindow(hwnd: Handle, x: i32, y: i32, w: i32, h: i32, repaint: i32) -> i32;
    fn SendInput(c_inputs: u32, inputs: *const InputRec, cb_size: i32) -> u32;
}

extern "C" {
    fn _getwch() -> u16; // Enter gerektirmeden tek tuş okur (Türkçe karakter uyumlu)
    fn _kbhit() -> i32; // Bekleyen tuş var mı? (bloklamadan kontrol — Esc ile durdurma için)
}

// İstek 9/16: Esc'e basıldı mı? (bloklamadan). Döngü içinde durdurma için kullanılır.
fn esc_pressed() -> bool {
    unsafe {
        while _kbhit() != 0 {
            let c = _getwch();
            if c == 27 || c == 3 {
                return true;
            }
            if c == 0 || c == 0xE0 {
                let _ = _getwch(); // genişletilmiş tuşun ikinci kodunu tüket
            }
        }
    }
    false
}

// GetDpiForSystem yalnızca Windows 10 1607+ sürümünde vardır; yoksa 96 (DPI %100) kabul edilir.
fn system_dpi() -> u32 {
    use std::sync::OnceLock;
    static DPI: OnceLock<u32> = OnceLock::new();
    *DPI.get_or_init(|| unsafe {
        let lib: Vec<u16> = "user32.dll\0".encode_utf16().collect();
        let h = LoadLibraryW(lib.as_ptr());
        if h == 0 {
            return 96;
        }
        let name = b"GetDpiForSystem\0";
        let proc = GetProcAddress(h, name.as_ptr());
        if proc.is_null() {
            return 96;
        }
        let f: extern "system" fn() -> u32 = std::mem::transmute(proc);
        let d = f();
        if d == 0 {
            96
        } else {
            d
        }
    })
}

#[link(name = "kernel32")]
extern "system" {
    fn LoadLibraryW(name: *const u16) -> isize;
    fn GetProcAddress(module: isize, name: *const u8) -> *const core::ffi::c_void;
}

// Ekranın (genişlik, yükseklik) piksel boyutu
fn screen_size() -> (i32, i32) {
    unsafe { (GetSystemMetrics(0), GetSystemMetrics(1)) } // SM_CXSCREEN, SM_CYSCREEN
}

// İstek 1 & 20: Çözünürlük + DPI + font katsayısından font piksel yüksekliği hesaplar (14-48).
// Sabit çözünürlük tablosu YOK; formül her çözünürlük/DPI için çalışır.
fn compute_font_px() -> i16 {
    let (sw, sh) = screen_size();
    let (sw, sh) = if sw <= 0 || sh <= 0 { (1920, 1080) } else { (sw, sh) };
    let dpi = system_dpi() as f64;
    let scale = (dpi / 96.0).max(1.0);
    // Pencere ekranın ~%70 genişliği / ~%85 yüksekliğine sığacak taban hesap.
    // Taban katsayı önceki sürümden (18 px) belirgin büyük harfler için yükseltildi.
    let by_w = (sw as f64 * 0.70) / (CONSOLE_COLS as f64 * 0.52);
    let by_h = (sh as f64 * 0.85) / CONSOLE_LINES as f64;
    let mut px = by_w.min(by_h) * 1.18 / scale;
    let user_scale = settings_get().font_scale.clamp(0.6, 2.0);
    px *= user_scale;
    px.round().clamp(14.0, 48.0) as i16
}

// Çözünürlük/DPI/font-katsayısı değişimini ucuz izlemek için son uygulanan durum
static LAST_FONT_PX: std::sync::atomic::AtomicI16 = std::sync::atomic::AtomicI16::new(0);

fn apply_console_font(px: i16) {
    unsafe {
        let hout = GetStdHandle(-11);
        let mut face = [0u16; 32];
        for (i, c) in "Consolas".encode_utf16().enumerate() {
            face[i] = c;
        }
        let info = ConsoleFontInfoEx {
            cb_size: std::mem::size_of::<ConsoleFontInfoEx>() as u32,
            n_font: 0,
            size_x: 0,
            size_y: px,
            family: 54,
            weight: 400,
            face,
        };
        SetCurrentConsoleFontEx(hout, 0, &info);
    }
    let _ = Command::new("cmd")
        .raw_arg(format!("/C mode con: cols={} lines={}", CONSOLE_COLS, CONSOLE_LINES))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    center_window();
}

// İstek 1: Pencereyi ekranın ortasına konumlandırır.
fn center_window() {
    unsafe {
        let hwnd = GetConsoleWindow();
        if hwnd == 0 {
            return;
        }
        let mut r = Rect { left: 0, top: 0, right: 0, bottom: 0 };
        if GetWindowRect(hwnd, &mut r) == 0 {
            return;
        }
        let w = r.right - r.left;
        let h = r.bottom - r.top;
        let (sw, sh) = screen_size();
        if w > 0 && h > 0 && sw > 0 && sh > 0 {
            let x = ((sw - w) / 2).max(0);
            let y = ((sh - h) / 2).max(0);
            MoveWindow(hwnd, x, y, w, h, 1);
        }
    }
}

// Her menü çiziminde çağrılır: çözünürlük/DPI/katsayı değiştiyse fontu yeniden uygular (ucuz).
fn refresh_font_if_needed() {
    let px = compute_font_px();
    if LAST_FONT_PX.swap(px, Ordering::Relaxed) != px {
        apply_console_font(px);
        center_window(); // İstek 1: font/çözünürlük değişince pencereyi yeniden ortala.
    }
}

fn setup_console() {
    unsafe {
        SetConsoleOutputCP(65001);
        SetConsoleCP(65001);
        let hout = GetStdHandle(-11);
        let mut mode: u32 = 0;
        if GetConsoleMode(hout, &mut mode) != 0 {
            SetConsoleMode(hout, mode | 0x0004); // ANSI renkleri aç
        }
        let title: Vec<u16> = "KEYSIGHT TECH MULTITOOL\0".encode_utf16().collect();
        SetConsoleTitleW(title.as_ptr());

        let hwnd = GetConsoleWindow();
        if hwnd != 0 {
            let ex = GetWindowLongW(hwnd, -20);
            SetWindowLongW(hwnd, -20, ex | 0x80000);
            SetLayeredWindowAttributes(hwnd, 0, 244, 0x2); // hafif yarı saydam cam
        }
    }
    let px = compute_font_px();
    LAST_FONT_PX.store(px, Ordering::Relaxed);
    apply_console_font(px);
}

// İstek 16: Tek sol fare tıklaması gönderir (mevcut imleç konumunda).
fn send_left_click() {
    const MOUSEEVENTF_LEFTDOWN: u32 = 0x0002;
    const MOUSEEVENTF_LEFTUP: u32 = 0x0004;
    let make = |flags: u32| InputRec {
        type_: 0, // INPUT_MOUSE
        _pad: 0,
        mi: MouseInput { dx: 0, dy: 0, mouse_data: 0, dw_flags: flags, time: 0, dw_extra_info: 0 },
    };
    let inputs = [make(MOUSEEVENTF_LEFTDOWN), make(MOUSEEVENTF_LEFTUP)];
    unsafe {
        SendInput(2, inputs.as_ptr(), std::mem::size_of::<InputRec>() as i32);
    }
}

// İstek 18: Uyku engelleyici — tamamen sessiz, arka plan iş parçacığında periyodik yenilenir.
fn start_sleep_guard() {
    const ES_CONTINUOUS: u32 = 0x8000_0000;
    const ES_SYSTEM_REQUIRED: u32 = 0x0000_0001;
    const ES_DISPLAY_REQUIRED: u32 = 0x0000_0002;
    const ES_AWAYMODE_REQUIRED: u32 = 0x0000_0040;
    thread::spawn(|| loop {
        unsafe {
            SetThreadExecutionState(
                ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED | ES_AWAYMODE_REQUIRED,
            );
        }
        thread::sleep(Duration::from_secs(30));
    });
}

fn ts() -> String {
    let mut t = WinTime { year: 0, month: 0, dow: 0, day: 0, hour: 0, minute: 0, second: 0, ms: 0 };
    unsafe { GetLocalTime(&mut t) };
    format!(
        "{:04}-{:02}-{:02} {:02}:{:02}:{:02}",
        t.year, t.month, t.day, t.hour, t.minute, t.second
    )
}

fn clock() -> String {
    ts().split(' ').nth(1).unwrap_or("").to_string()
}

// ───────────────────────── Türkçe normalizasyon (İstek 2) ─────────────────────────
// Tek merkezi fonksiyon: tüm kısayol/komut/metin karşılaştırmaları (ve SCPI scpi_eq) buradan geçer.
// ı İ I i hepsi 'i' olur; diğer Türkçe harfler de ASCII karşılığına indirgenir; küçük harfe çevrilir.
fn norm(s: &str) -> String {
    s.chars()
        .map(|c| match c {
            'İ' | 'I' | 'ı' | 'i' => 'i',
            'Ş' | 'ş' => 's',
            'Ğ' | 'ğ' => 'g',
            'Ü' | 'ü' => 'u',
            'Ö' | 'ö' => 'o',
            'Ç' | 'ç' => 'c',
            _ => c.to_lowercase().next().unwrap_or(c),
        })
        .collect()
}

fn norm_char(c: char) -> char {
    norm(&c.to_string()).chars().next().unwrap_or(c)
}

// ───────────────────────── Kalıcı ayarlar (İstek 19, 20) ─────────────────────────
// settings.json: tema, font katsayısı, tık aralığı, cihaz türü başına seçili model.
// Harici crate (serde) YOK; el yazımı basit JSON okuyucu/yazıcı.
#[derive(Clone)]
struct Settings {
    theme: usize,
    font_scale: f64,
    click_interval_ms: u64,
    model_network: usize,
    model_spectrum: usize,
    model_generator: usize,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            theme: 0,
            font_scale: 1.0,
            click_interval_ms: 5000,
            model_network: 0,
            model_spectrum: 0,
            model_generator: 0,
        }
    }
}

static SETTINGS: Mutex<Option<Settings>> = Mutex::new(None);

fn settings_path() -> PathBuf {
    data_dir().join("settings.json")
}

// Basit JSON sayı/dize ayıklayıcı: "key": değer çiftini bulur.
fn json_num(text: &str, key: &str) -> Option<f64> {
    let pat = format!("\"{}\"", key);
    let i = text.find(&pat)? + pat.len();
    let rest = &text[i..];
    let c = rest.find(':')? + 1;
    let tail = rest[c..].trim_start();
    let end = tail
        .find(|ch: char| !(ch.is_ascii_digit() || ch == '.' || ch == '-' || ch == '+' || ch == 'e' || ch == 'E'))
        .unwrap_or(tail.len());
    tail[..end].parse::<f64>().ok()
}

fn load_settings_from_disk() -> Settings {
    let mut s = Settings::default();
    if let Ok(text) = fs::read_to_string(settings_path()) {
        if let Some(v) = json_num(&text, "theme") {
            s.theme = (v as usize).min(THEMES.len() - 1);
        }
        if let Some(v) = json_num(&text, "font_scale") {
            s.font_scale = v;
        }
        if let Some(v) = json_num(&text, "click_interval_ms") {
            s.click_interval_ms = v as u64;
        }
        if let Some(v) = json_num(&text, "model_network") {
            s.model_network = v as usize;
        }
        if let Some(v) = json_num(&text, "model_spectrum") {
            s.model_spectrum = v as usize;
        }
        if let Some(v) = json_num(&text, "model_generator") {
            s.model_generator = v as usize;
        }
    }
    s
}

fn settings_get() -> Settings {
    let mut g = SETTINGS.lock().unwrap_or_else(|e| e.into_inner());
    if g.is_none() {
        let s = load_settings_from_disk();
        THEME_IDX.store(s.theme, Ordering::Relaxed);
        *g = Some(s);
    }
    g.clone().unwrap()
}

fn settings_save(s: &Settings) {
    {
        let mut g = SETTINGS.lock().unwrap_or_else(|e| e.into_inner());
        *g = Some(s.clone());
    }
    THEME_IDX.store(s.theme, Ordering::Relaxed);
    let json = format!(
        "{{\n  \"theme\": {},\n  \"font_scale\": {:.3},\n  \"click_interval_ms\": {},\n  \"model_network\": {},\n  \"model_spectrum\": {},\n  \"model_generator\": {}\n}}\n",
        s.theme, s.font_scale, s.click_interval_ms, s.model_network, s.model_spectrum, s.model_generator
    );
    let _ = fs::write(settings_path(), json);
}

fn settings_update<F: FnOnce(&mut Settings)>(f: F) {
    let mut s = settings_get();
    f(&mut s);
    settings_save(&s);
}

// ───────────────────────── Üst kayan log şeridi + multitool.log (İstek 8, 20) ─────────────────────────
// Ekranın en üstünde sabit 4 satır. Yeni olaylar altta eklenir, eskiler yukarı kayar.
// Tüm flash_* çağrıları buraya zaman damgalı + renkli akar; ayrıca multitool.log dosyasına yazılır.
static LOG_STRIP: Mutex<Vec<(u8, String, String)>> = Mutex::new(Vec::new()); // (seviye, saat, mesaj)

fn global_log_path() -> PathBuf {
    data_dir().join("multitool.log")
}

fn push_log(level: u8, msg: String) {
    let t = clock();
    {
        let mut g = LOG_STRIP.lock().unwrap_or_else(|e| e.into_inner());
        g.push((level, t.clone(), msg.clone()));
        let len = g.len();
        if len > 300 {
            g.drain(0..len - 300);
        }
    }
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(global_log_path()) {
        let tag = match level {
            0 => "OK ",
            1 => "UYR",
            _ => "HAT",
        };
        let _ = writeln!(f, "{} [{}] {}", ts(), tag, msg);
    }
}

fn draw_log_strip() {
    let rows = 4usize;
    let items: Vec<(u8, String, String)> = {
        let g = LOG_STRIP.lock().unwrap_or_else(|e| e.into_inner());
        let n = g.len();
        g[n.saturating_sub(rows)..].to_vec()
    };
    println!("  {}{}{}", cd(), hline(INNER + 2), C_RESET);
    for i in 0..rows {
        if i < items.len() {
            let (lvl, t, m) = &items[i];
            let (c, s) = match *lvl {
                0 => (cok(), S_OK),
                1 => (cwn(), S_WARN),
                _ => (cer(), S_ERR),
            };
            let mut line = format!("{} {} {}", t, s, m);
            let maxw = INNER;
            if line.chars().count() > maxw {
                line = line.chars().take(maxw - 1).collect::<String>() + "…";
            }
            println!("  {}{}{}", c, line, C_RESET);
        } else {
            println!();
        }
    }
    println!("  {}{}{}", cd(), hline(INNER + 2), C_RESET);
}

// ───────────────────────── Tuş & giriş sistemi ─────────────────────────

#[derive(Clone, Copy, PartialEq)]
enum Key {
    Char(char),
    Tab,
    Back,
    Enter,
    Esc,
    Other,
}

#[derive(Clone, Copy, PartialEq)]
enum Nav {
    Back, // bir geri
    Home, // ana menü
}

enum Pick<T> {
    Got(T),
    Back,
    Home,
}

enum Input {
    Text(String),
    Hot(char),
    Back,
    Home,
}

enum Mk {
    Ch(char),
    Back,
    Home,
    None,
}

fn raw_key() -> Key {
    let c = unsafe { _getwch() };
    if c == 0 || c == 0xE0 {
        let _ = unsafe { _getwch() }; // ok tuşları vb. (ikinci kod)
        return Key::Other;
    }
    match c {
        9 => Key::Tab,
        8 => Key::Back,
        13 => Key::Enter,
        27 | 3 => Key::Esc,
        _ => match char::from_u32(c as u32) {
            Some(ch) if !ch.is_control() => Key::Char(ch),
            _ => Key::Other,
        },
    }
}

// Kısayol harflerini küçültür ve Türkçe I/İ/ı farkını ortadan kaldırır (tek norm() üzerinden)
fn hot(c: char) -> char {
    norm_char(c)
}

fn read_key(prompt: &str) -> Key {
    print!("  {}{}{} ", ci(), prompt, cw());
    let _ = io::stdout().flush();
    let k = raw_key();
    match k {
        Key::Char(c) => println!("{}{}", c, C_RESET),
        _ => println!("{}", C_RESET),
    }
    k
}

// Satır girişi. Boş satırda Backspace/Esc = Back, Tab = Home.
// hot_extra = Some(..) ise satır başındaki global kısayollar + ekstra harfler Hot olarak döner.
fn read_input(prompt: &str, hot_extra: Option<&[char]>) -> Input {
    print!("  {}{}{} ", ci(), prompt, cw());
    let _ = io::stdout().flush();
    let mut buf = String::new();
    loop {
        match raw_key() {
            Key::Enter => {
                println!("{}", C_RESET);
                return Input::Text(buf.trim().to_string());
            }
            Key::Tab => {
                println!("{}", C_RESET);
                return Input::Home;
            }
            Key::Esc => {
                println!("{}", C_RESET);
                return Input::Back;
            }
            Key::Back => {
                if buf.is_empty() {
                    println!("{}", C_RESET);
                    return Input::Back;
                }
                buf.pop();
                print!("\x08 \x08");
                let _ = io::stdout().flush();
            }
            Key::Char(c) => {
                if buf.is_empty() {
                    if let Some(extra) = hot_extra {
                        let h = hot(c);
                        // İstek 7: Global sunucu kısayolları (n/s/g/a/k) artık yalnızca
                        // caller'ın verdiği 'extra' listesinde varsa işlenir; diğer menülerde kaldırıldı.
                        if extra.contains(&h) {
                            println!("{}{}", h, C_RESET);
                            return Input::Hot(h);
                        }
                    }
                }
                buf.push(c);
                print!("{}", c);
                let _ = io::stdout().flush();
            }
            Key::Other => {}
        }
    }
}

fn ask_text(prompt: &str) -> Result<String, Nav> {
    match read_input(prompt, None) {
        Input::Text(t) => Ok(t),
        Input::Home => Err(Nav::Home),
        _ => Err(Nav::Back),
    }
}

// Döngü içinde kullanılır: Home → ana menüye; Back → işlemi iptal edip döngüye devam
macro_rules! ask {
    ($prompt:expr) => {
        match ask_text($prompt) {
            Ok(v) => v,
            Err(Nav::Home) => return Nav::Home,
            Err(Nav::Back) => continue,
        }
    };
}

fn confirm(prompt: &str) -> bool {
    match read_key(prompt) {
        Key::Char(c) => matches!(hot(c), 'e' | 'y'),
        _ => false,
    }
}

fn pause() {
    let _ = read_key("Devam etmek için herhangi bir tuşa basın ...");
}

// Menü tuşu (global YOK): Tab=Ana menü, Backspace/Esc=Geri. Çoğu menüde kullanılır (İstek 7).
fn menu_key(prompt: &str) -> Mk {
    match read_key(prompt) {
        Key::Tab => Mk::Home,
        Key::Back | Key::Esc => Mk::Back,
        Key::Char(c) => Mk::Ch(hot(c)),
        _ => Mk::None,
    }
}

// Sunucu kontrollü menü tuşu: yalnızca Ana Menü + Keysight menüsünde n/s/g/a/k işlenir (İstek 7).
fn menu_key_srv(prompt: &str) -> Mk {
    match read_key(prompt) {
        Key::Tab => Mk::Home,
        Key::Back | Key::Esc => Mk::Back,
        Key::Char(c) => {
            let c = hot(c);
            if global_key(c) {
                Mk::None
            } else {
                Mk::Ch(c)
            }
        }
        _ => Mk::None,
    }
}

// ───────────────────────── Bilgi mesajları → üst log şeridine akar (İstek 8) ─────────────────────────

fn flash(level: u8, msg: String) {
    push_log(level, msg);
}
fn flash_ok(msg: String) {
    flash(0, msg)
}
fn flash_warn(msg: String) {
    flash(1, msg)
}
fn flash_err(msg: String) {
    flash(2, msg)
}

fn cls() {
    print!("\x1b[2J\x1b[3J\x1b[H");
    let _ = io::stdout().flush();
}

// ───────────────────────── Çizim yardımcıları ─────────────────────────

fn hline(n: usize) -> String {
    "─".repeat(n)
}

fn draw_header(subtitle: &str) {
    // İstek 1: çözünürlük/DPI değiştiyse fontu her çizimde yeniden hesapla/uygula.
    refresh_font_if_needed();
    cls();
    // İstek 8: en üstte sabit 4 satırlık kayan log şeridi.
    draw_log_strip();
    let title = format!("KEYSIGHT TECH MULTITOOL  •  tema: {}", thm().name);
    println!("  {}┌{}┐{}", ci(), hline(INNER), C_RESET);
    println!(
        "  {}│{}{}{:<w$}{}{}│{}",
        ci(),
        cbg(),
        C_BOLD,
        format!("   {}", title),
        C_RESET,
        ci(),
        C_RESET,
        w = INNER
    );
    println!(
        "  {}│{}{}{:<w$}{}{}│{}",
        ci(),
        cbg(),
        cf(),
        format!("   {}", subtitle),
        C_RESET,
        ci(),
        C_RESET,
        w = INNER
    );
    println!("  {}└{}┘{}\n", ci(), hline(INNER), C_RESET);
}

fn draw_divider(title: &str) {
    if title.is_empty() {
        println!("  {}{}{}", cd(), hline(INNER + 2), C_RESET);
    } else {
        let pad = (INNER + 2).saturating_sub(title.chars().count() + 6);
        println!(
            "  {}─── {}{}{} {}{}",
            ci(),
            C_BOLD,
            title,
            ci(),
            hline(pad),
            C_RESET
        );
    }
}

fn opt_line(key: &str, desc: &str) {
    println!("    {}[{}]{}  {}{}{}", cn(), key, C_RESET, cw(), desc, C_RESET);
}

// İstek 14: Satır sonunda [YÖNETİCİ] rozeti (admin ise badge boş gelir, görünmez).
fn opt_line_badge(key: &str, desc: &str, badge: &str) {
    println!("    {}[{}]{}  {}{}{}{}", cn(), key, C_RESET, cw(), desc, C_RESET, badge);
}

// Her menünün altında: (yalnızca istenirse) sunucu kontrol paneli + gezinme ipuçları.
// İstek 7: panel yalnızca Ana Menü ve Keysight menüsünde (panel=true) gösterilir.
fn footer(sub: bool, panel: bool) {
    println!();
    if panel {
        server_panel();
        println!();
    }
    if sub {
        println!(
            "    {}[Tab]{} Ana Menü     {}[Backspace]{} Geri     {}[0]{} Geri",
            cn(), cd(), cn(), cd(), cn(), C_RESET
        );
    } else {
        println!("    {}[0]{} Çıkış (açık sunucular arka planda çalışmaya devam eder){}", cn(), cd(), C_RESET);
    }
    println!();
}

// ───────────────────────── Cihaz türleri ─────────────────────────

#[derive(Clone, Copy, PartialEq)]
enum Kind {
    Network,
    Spectrum,
    Generator,
}

const KINDS: [Kind; 3] = [Kind::Network, Kind::Spectrum, Kind::Generator];

impl Kind {
    fn id(&self) -> &'static str {
        match self {
            Kind::Network => "network",
            Kind::Spectrum => "spectrum",
            Kind::Generator => "generator",
        }
    }
    fn from_id(s: &str) -> Option<Kind> {
        match s {
            "network" => Some(Kind::Network),
            "spectrum" => Some(Kind::Spectrum),
            "generator" => Some(Kind::Generator),
            _ => None,
        }
    }
    fn key(&self) -> char {
        match self {
            Kind::Network => 'n',
            Kind::Spectrum => 's',
            Kind::Generator => 'g',
        }
    }
    fn name(&self) -> &'static str {
        match self {
            Kind::Network => "Network Analyzer",
            Kind::Spectrum => "Spectrum Analyzer",
            Kind::Generator => "Sinyal Jeneratörü",
        }
    }
    fn default_ip(&self) -> &'static str {
        match self {
            Kind::Network => "12.0.0.2",
            Kind::Spectrum => "12.0.0.3",
            Kind::Generator => "12.0.0.4",
        }
    }
    // İstek 5: Her cihaz türü için 7 gerçek Keysight modeli (model, bellenim sürümü).
    // Toplam 3 tür × 7 = 21 model. Serbest *IDN düzenleme kaldırıldı; model seçilir.
    fn models(&self) -> &'static [(&'static str, &'static str)] {
        match self {
            Kind::Network => &[
                ("E5071C", "A.09.90"),
                ("E5063A", "A.02.10"),
                ("N5221B", "A.14.00"),
                ("N5222B", "A.14.00"),
                ("N5231B", "A.14.00"),
                ("N5242B", "A.14.00"),
                ("P9374A", "A.13.25"),
            ],
            Kind::Spectrum => &[
                ("N9000B", "A.26.00"),
                ("N9010B", "A.26.00"),
                ("N9020A", "A.20.00"),
                ("N9020B", "A.26.00"),
                ("N9030B", "A.26.00"),
                ("N9038A", "A.20.14"),
                ("N9320B", "A.03.09"),
            ],
            Kind::Generator => &[
                ("N5171B", "B.01.80"),
                ("N5172B", "B.01.80"),
                ("N5181B", "B.01.80"),
                ("N5182B", "B.01.80"),
                ("E8257D", "C.06.46"),
                ("33500B", "3.09"),
                ("N5166B", "A.01.60"),
            ],
        }
    }
    // Seçili model indeksi (settings.json'dan; daemon da aynı dosyayı okur).
    fn selected_model_idx(&self) -> usize {
        let s = settings_get();
        let i = match self {
            Kind::Network => s.model_network,
            Kind::Spectrum => s.model_spectrum,
            Kind::Generator => s.model_generator,
        };
        i.min(self.models().len() - 1)
    }
    fn set_selected_model(&self, idx: usize) {
        let kind = *self;
        settings_update(|s| match kind {
            Kind::Network => s.model_network = idx,
            Kind::Spectrum => s.model_spectrum = idx,
            Kind::Generator => s.model_generator = idx,
        });
    }
    // Gerçekçi *IDN? yanıtı: "Keysight Technologies,MODEL,SERİ,BELLENİM"
    fn idn(&self) -> String {
        let (model, fw) = self.models()[self.selected_model_idx()];
        let prefix = match self {
            Kind::Network => "MY",
            Kind::Spectrum => "US",
            Kind::Generator => "SG",
        };
        let serial = format!("{}{:04}{:04}", prefix, 2024, self.selected_model_idx() * 111 + 137);
        format!("Keysight Technologies,{},{},{}", model, serial, fw)
    }
    fn defaults(&self) -> Vec<(&'static str, &'static str)> {
        let mut v = vec![
            ("*OPC", "1"),
            ("*ESR", "0"),
            ("*STB", "0"),
            ("*TST", "0"),
            ("*OPT", ""),
            ("SYST:ERR", "+0,\"No error\""),
        ];
        match self {
            Kind::Network => v.extend([
                ("SENS:FREQ:STAR", "+1.00000000E+007"),
                ("SENS:FREQ:STOP", "+2.65000000E+010"),
                ("SENS:SWE:POIN", "+201"),
                ("SENS:BAND", "+1.00000000E+003"),
                ("SOUR:POW", "-1.00000000E+001"),
                ("CALC:PAR:CAT", "\"CH1_S11_1,S11\""),
                ("INIT:CONT", "1"),
            ]),
            Kind::Spectrum => v.extend([
                ("FREQ:CENT", "+1.00000000E+009"),
                ("FREQ:SPAN", "+1.00000000E+008"),
                ("BAND", "+1.00000000E+006"),
                ("DISP:WIND:TRAC:Y:RLEV", "+0.00000000E+000"),
                ("CALC:MARK1:X", "+1.00000000E+009"),
                ("CALC:MARK1:Y", "-5.00000000E+001"),
            ]),
            Kind::Generator => v.extend([
                ("FREQ", "+1.00000000E+009"),
                ("POW", "-1.00000000E+001"),
                ("OUTP", "0"),
                ("OUTP:MOD", "0"),
            ]),
        }
        v
    }
}

// ───────────────────────── Dosya / IP / log yardımcıları ─────────────────────────

fn data_dir() -> PathBuf {
    let base = std::env::var("PROGRAMDATA").unwrap_or_else(|_| "C:\\ProgramData".into());
    let p = PathBuf::from(base).join("KeysightSim");
    let _ = fs::create_dir_all(&p);
    p
}
fn daemon_exe_path() -> PathBuf {
    data_dir().join("keysight_sim_daemon.exe")
}
fn pid_path(k: Kind) -> PathBuf {
    data_dir().join(format!("{}.pid", k.id()))
}
fn ip_conf_path(k: Kind) -> PathBuf {
    data_dir().join(format!("{}.ip", k.id()))
}
fn port_conf_path(k: Kind) -> PathBuf {
    data_dir().join(format!("{}.port", k.id()))
}
fn log_path(k: Kind) -> PathBuf {
    data_dir().join(format!("{}.log", k.id()))
}
fn responses_path(k: Kind) -> PathBuf {
    data_dir().join(format!("{}_responses.txt", k.id()))
}

// ───────────────────────── Statik cihaz listesi + devices.json (İstek 10, 11) ─────────────────────────
// İstek 11: Kod içindeki sabit cihaz listesi — buraya KENDİ cihazlarınızı yazın.
// Her satır: (cihaz adı, IP adresi, beklenen MAC adresi). Yalnızca ping ile çalışma durumu
// ve MAC doğrulaması için kullanılır. Ping ve MAC Doğrulama menüleri bu listeyi
// ProgramData\KeysightSim\devices.json kayıtlarıyla BİRLEŞTİRİR.
// Örnek satırlar (yorum olarak; başındaki // işaretini kaldırıp doldurabilirsiniz):
//     ("Spektrum Analizör", "192.168.1.50", "00-11-22-33-44-55"),
//     ("Sinyal Jeneratörü", "192.168.1.51", "A4-BB-6D-11-22-33"),
//     ("Network Analyzer",  "192.168.1.52", "D8-9E-F3-0A-1B-2C"),
const STATIC_DEVICES: &[(&str, &str, &str)] = &[
    // ("Cihaz Adı", "192.168.1.100", "00-00-00-00-00-00"),
];

#[derive(Clone)]
struct Device {
    name: String,
    ip: String,
    mac: String,
}

fn devices_json_path() -> PathBuf {
    data_dir().join("devices.json")
}

// El yazımı basit JSON dize alanı okuyucu (serde yok): "key": "deger" çiftini bulur.
fn json_str_field(obj: &str, key: &str) -> String {
    let pat = format!("\"{}\"", key);
    let i = match obj.find(&pat) {
        Some(i) => i,
        None => return String::new(),
    };
    let rest = &obj[i + pat.len()..];
    let c = match rest.find(':') {
        Some(c) => c,
        None => return String::new(),
    };
    let tail = rest[c + 1..].trim_start();
    if !tail.starts_with('"') {
        return String::new();
    }
    let tail = &tail[1..];
    let end = tail.find('"').unwrap_or(tail.len());
    tail[..end].to_string()
}

// devices.json biçimi: [ {"name":"...","ip":"...","mac":"..."}, ... ]
fn load_devices_json() -> Vec<Device> {
    let text = fs::read_to_string(devices_json_path()).unwrap_or_default();
    let mut out = Vec::new();
    let mut depth = 0i32;
    let mut start = 0usize;
    for (i, ch) in text.char_indices() {
        match ch {
            '{' => {
                if depth == 0 {
                    start = i;
                }
                depth += 1;
            }
            '}' => {
                depth -= 1;
                if depth == 0 {
                    let obj = &text[start..=i];
                    let name = json_str_field(obj, "name");
                    let ip = json_str_field(obj, "ip");
                    let mac = json_str_field(obj, "mac");
                    if !name.is_empty() || !ip.is_empty() {
                        out.push(Device { name, ip, mac });
                    }
                }
            }
            _ => {}
        }
    }
    out
}

fn json_escape(s: &str) -> String {
    s.replace('\\', "\\\\").replace('"', "\\\"")
}

fn save_devices_json(devs: &[Device]) {
    let mut s = String::from("[\n");
    for (i, d) in devs.iter().enumerate() {
        s.push_str(&format!(
            "  {{ \"name\": \"{}\", \"ip\": \"{}\", \"mac\": \"{}\" }}",
            json_escape(&d.name),
            json_escape(&d.ip),
            json_escape(&d.mac)
        ));
        if i + 1 < devs.len() {
            s.push(',');
        }
        s.push('\n');
    }
    s.push_str("]\n");
    let _ = fs::write(devices_json_path(), s);
}

// İstek 10/11: statik liste + devices.json birleşik cihaz listesi.
fn all_devices() -> Vec<Device> {
    let mut v: Vec<Device> = STATIC_DEVICES
        .iter()
        .map(|(n, ip, mac)| Device {
            name: n.to_string(),
            ip: ip.to_string(),
            mac: mac.to_string(),
        })
        .collect();
    v.extend(load_devices_json());
    v
}

// IP'ye tek ICMP ping (Windows ping.exe). (ulaşıldı mı, gecikme ms metni) döner.
fn ping_once(ip: &str) -> (bool, String) {
    let out = Command::new("ping")
        .args(["-n", "1", "-w", "1000", ip])
        .creation_flags(CREATE_NO_WINDOW)
        .output();
    match out {
        Ok(o) => {
            let txt = String::from_utf8_lossy(&o.stdout);
            // Türkçe/İngilizce Windows: "time=12ms" / "süre=12ms" / "zaman=12ms"
            let low = txt.to_lowercase();
            let reached = low.contains("ttl=");
            let mut ms = String::new();
            for tag in ["time=", "time<", "süre=", "süre<", "zaman=", "zaman<"] {
                if let Some(p) = low.find(tag) {
                    let tail = &low[p + tag.len() - 1..]; // '=' veya '<' dahil
                    let sym = tail.chars().next().unwrap_or('=');
                    let rest = &tail[1..];
                    let end = rest
                        .find(|c: char| !(c.is_ascii_digit() || c == '.'))
                        .unwrap_or(rest.len());
                    if end > 0 {
                        ms = format!("{}{} ms", sym, &rest[..end]);
                        break;
                    }
                }
            }
            (reached, ms)
        }
        Err(e) => (false, e.to_string()),
    }
}

// Bir IP için ARP tablosundan MAC adresini okur (arp -a <ip>). Normalize edilmiş (büyük, '-' ile) döner.
fn arp_lookup(ip: &str) -> Option<String> {
    let out = Command::new("arp")
        .args(["-a", ip])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
        .ok()?;
    let txt = String::from_utf8_lossy(&out.stdout);
    for line in txt.lines() {
        if line.contains(ip) {
            for tok in line.split_whitespace() {
                if is_mac_token(tok) {
                    return Some(normalize_mac(tok));
                }
            }
        }
    }
    None
}

fn is_mac_token(t: &str) -> bool {
    let parts: Vec<&str> = t.split(|c| c == '-' || c == ':').collect();
    parts.len() == 6 && parts.iter().all(|p| p.len() == 2 && p.chars().all(|c| c.is_ascii_hexdigit()))
}

// MAC adresini karşılaştırma için normalize eder: büyük harf, ayraç '-'.
fn normalize_mac(m: &str) -> String {
    m.chars()
        .filter(|c| c.is_ascii_hexdigit())
        .collect::<String>()
        .to_uppercase()
        .as_bytes()
        .chunks(2)
        .map(|c| String::from_utf8_lossy(c).to_string())
        .collect::<Vec<_>>()
        .join("-")
}

fn prepare_daemon_exe() -> io::Result<PathBuf> {
    let current = std::env::current_exe()?;
    let target = daemon_exe_path();
    if current != target {
        let _ = fs::copy(&current, &target);
    }
    if target.exists() {
        Ok(target)
    } else {
        Ok(current)
    }
}

fn get_configured_ip(k: Kind) -> String {
    if let Ok(t) = fs::read_to_string(ip_conf_path(k)) {
        let ip = t.trim();
        if ip.parse::<Ipv4Addr>().is_ok() {
            return ip.to_string();
        }
    }
    k.default_ip().to_string()
}

fn set_configured_ip(k: Kind, ip: &str) {
    // İstek 20: Yeni IP yazmadan önce eski ayarı zaman damgalı olarak yedekle.
    if let Ok(old) = fs::read_to_string(ip_conf_path(k)) {
        let bak = data_dir().join(format!("{}.ip.bak", k.id()));
        let _ = fs::write(&bak, format!("{}  (yedek: {})\n", old.trim(), ts()));
    }
    let _ = fs::write(ip_conf_path(k), ip.trim());
}

fn get_configured_port(k: Kind) -> u16 {
    fs::read_to_string(port_conf_path(k))
        .ok()
        .and_then(|t| t.trim().parse::<u16>().ok())
        .filter(|p| *p > 0)
        .unwrap_or(SCPI_PORT)
}

fn set_configured_port(k: Kind, port: u16) {
    let _ = fs::write(port_conf_path(k), port.to_string());
}

// IP sistemde herhangi bir adaptörde atanmış mı?
fn ip_present_on_system(ip: &str) -> bool {
    let out = ps("(Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | ForEach-Object { $_.IPAddress }) -join ','");
    out.split(',').any(|x| x.trim() == ip)
}

// Bağlanabilir en uygun fiziksel Ethernet adaptörünü seçer (önce 'Up' olan).
fn best_ethernet_adapter() -> Option<String> {
    let name = ps(
        "$a = Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Where-Object { $_.Status -eq 'Up' } | Select-Object -First 1; \
         if (-not $a) { $a = Get-NetAdapter -Physical -ErrorAction SilentlyContinue | Select-Object -First 1 }; \
         if ($a) { $a.Name }",
    )
    .trim()
    .to_string();
    if name.is_empty() || name.contains("HATA") {
        None
    } else {
        Some(name)
    }
}

// İstek 3: IP'yi loopback yerine SEÇİLEN gerçek Ethernet adaptörüne ikincil IP olarak ekler.
// Adaptör yoksa loopback'e düşer ve uyarı döndürür. Döndürülen metin durum amaçlıdır.
fn ensure_ip_on_system(ip: &str) -> String {
    if ip.starts_with("127.") {
        return "loopback".to_string();
    }
    if ip_present_on_system(ip) {
        return format!("IP {} zaten sistemde tanımlı", ip);
    }
    let add_loopback = || {
        let _ = Command::new("netsh")
            .raw_arg(format!(
                "interface ipv4 add address \"Loopback Pseudo-Interface 1\" {} 255.255.255.255",
                ip
            ))
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status();
    };
    match best_ethernet_adapter() {
        Some(ad) => {
            let _ = Command::new("netsh")
                .raw_arg(format!(
                    "interface ipv4 add address name=\"{}\" address={} mask=255.255.255.0",
                    ad, ip
                ))
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
            thread::sleep(Duration::from_millis(400));
            if ip_present_on_system(ip) {
                format!("IP {} -> adaptör '{}' üzerine eklendi", ip, ad)
            } else {
                add_loopback();
                format!(
                    "UYARI: IP '{}' adaptörüne eklenemedi (yönetici gerekebilir); loopback'e eklendi",
                    ad
                )
            }
        }
        None => {
            add_loopback();
            "UYARI: fiziksel Ethernet adaptörü bulunamadı; IP loopback'e eklendi (yalnızca yerel erişim)".to_string()
        }
    }
}

// İstek 3: Gelen bağlantılar için güvenlik duvarı kuralı açar (yalnızca yönetici varsa etkili olur).
fn ensure_firewall_rule(port: u16) {
    let name = format!("MultiTool SCPI {}", port);
    let _ = Command::new("netsh")
        .raw_arg(format!("advfirewall firewall delete rule name=\"{}\"", name))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
    let _ = Command::new("netsh")
        .raw_arg(format!(
            "advfirewall firewall add rule name=\"{}\" dir=in action=allow protocol=TCP localport={}",
            name, port
        ))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status();
}

// Verilen IP:port şu an başka bir süreç tarafından bağlanabilir (dolu) mu?
fn port_is_free(ip: &str, port: u16) -> bool {
    match ip.parse::<Ipv4Addr>() {
        Ok(a) => TcpListener::bind((a, port)).is_ok(),
        Err(_) => true,
    }
}

fn log(k: Kind, msg: &str) {
    if let Ok(mut f) = OpenOptions::new().create(true).append(true).open(log_path(k)) {
        let _ = writeln!(f, "{} {}", ts(), msg);
    }
}

fn ensure_responses_file(k: Kind) {
    let p = responses_path(k);
    if !p.exists() {
        let text = "# Özel cevaplar. Biçim:   SORGU=CEVAP   (sorgudaki ? işaretini yazmayın)\r\n\
# Bu dosya her sorguda yeniden okunur; kaydedince hemen geçerli olur.\r\n\
# Bu dosyadaki cevaplar, varsayılan ve hafızadaki değerlerden önceliklidir.\r\n\
# Örnekler:\r\n\
# *IDN=Üretici,Model,SeriNo,Sürüm\r\n\
# SENS:FREQ:STAR=+1.00000000E+006\r\n";
        let _ = fs::write(p, text);
    }
}

fn load_responses(k: Kind) -> Vec<(String, String)> {
    let raw = fs::read(responses_path(k)).unwrap_or_default();
    String::from_utf8_lossy(&raw)
        .lines()
        .filter_map(|l| {
            let l = l.trim();
            if l.is_empty() || l.starts_with('#') {
                return None;
            }
            let (a, b) = l.split_once('=')?;
            Some((a.trim().trim_end_matches('?').to_string(), b.trim().to_string()))
        })
        .collect()
}

// İstek 5: *IDN artık seçili modelden gelir (serbest düzenleme kaldırıldı).
fn current_idn(k: Kind) -> String {
    k.idn()
}

// ───────────────────────── SCPI sunucusu ─────────────────────────

struct State {
    store: Vec<(String, String)>,
    history: Vec<String>,
}

// İstek 2: SCPI komut eşleştirmesi de tek norm() üzerinden (büyük/küçük + Türkçe duyarsız).
fn scpi_eq(a: &str, b: &str) -> bool {
    let a = norm(a.trim().trim_start_matches(':'));
    let b = norm(b.trim().trim_start_matches(':'));
    let sa: Vec<&str> = a.split(':').collect();
    let sb: Vec<&str> = b.split(':').collect();
    if sa.len() != sb.len() {
        return false;
    }
    sa.iter().zip(sb.iter()).all(|(x, y)| {
        x == y || (x.len() >= 3 && y.len() >= 3 && (x.starts_with(*y) || y.starts_with(*x)))
    })
}

fn answer(k: Kind, st: &State, responses: &[(String, String)], q: &str) -> String {
    // *IDN her zaman seçili modelden döner (özel cevap dosyası ile değiştirilemez).
    if q.trim_start_matches('*').eq_ignore_ascii_case("IDN") {
        return k.idn();
    }
    if let Some((_, v)) = responses.iter().find(|(key, _)| scpi_eq(key, q)) {
        return v.clone();
    }
    if let Some((_, v)) = st.store.iter().find(|(key, _)| scpi_eq(key, q)) {
        return v.clone();
    }
    if let Some((_, v)) = k.defaults().iter().find(|(key, _)| scpi_eq(key, q)) {
        return v.to_string();
    }
    "0".to_string()
}

fn process(k: Kind, state: &Arc<Mutex<State>>, line: &str) -> Option<String> {
    let mut st = state.lock().unwrap_or_else(|e| e.into_inner());
    st.history.push(line.to_string());
    if st.history.len() > 10000 {
        st.history.remove(0);
    }
    let responses = load_responses(k);
    let mut out: Vec<String> = Vec::new();
    for part in line.split(';') {
        let part = part.trim();
        if part.is_empty() {
            continue;
        }
        let (head, arg) = match part.find(char::is_whitespace) {
            Some(i) => (&part[..i], part[i..].trim()),
            None => (part, ""),
        };
        if let Some(q) = head.strip_suffix('?') {
            out.push(answer(k, &*st, &responses, q));
        } else if head.eq_ignore_ascii_case("*RST") {
            st.store.clear();
        } else if !head.starts_with('*') {
            if let Some(e) = st.store.iter_mut().find(|(key, _)| scpi_eq(key, head)) {
                e.1 = arg.to_string();
            } else {
                st.store.push((head.to_string(), arg.to_string()));
            }
        }
    }
    if out.is_empty() {
        None
    } else {
        Some(out.join(";"))
    }
}

fn handle_client(mut stream: TcpStream, k: Kind, state: Arc<Mutex<State>>) {
    let peer = stream.peer_addr().map(|a| a.to_string()).unwrap_or_default();
    log(k, &format!("[{}] bağlandı", peer));
    let _ = stream.set_nodelay(true);
    let clone = match stream.try_clone() {
        Ok(c) => c,
        Err(_) => return,
    };
    let mut reader = BufReader::new(clone);
    let mut buf: Vec<u8> = Vec::new();
    loop {
        buf.clear();
        match reader.read_until(b'\n', &mut buf) {
            Ok(0) | Err(_) => break,
            Ok(_) => {}
        }
        let line = String::from_utf8_lossy(&buf).trim().to_string();
        if line.is_empty() {
            continue;
        }
        log(k, &format!("[{}] GELEN : {}", peer, line));
        if let Some(r) = process(k, &state, &line) {
            log(k, &format!("[{}] CEVAP : {}", peer, r));
            if stream.write_all(format!("{}\n", r).as_bytes()).is_err() {
                break;
            }
        }
    }
    log(k, &format!("[{}] bağlantı kapandı", peer));
}

fn run_server(k: Kind, ip_str: &str, port: u16) {
    let _ = std::env::set_current_dir(data_dir());
    ensure_responses_file(k);
    let ip_status = ensure_ip_on_system(ip_str);
    log(k, &format!("IP hazırlığı: {}", ip_status));
    ensure_firewall_rule(port); // İstek 3: gelen bağlantı için güvenlik duvarı kuralı
    let bind_ip: Ipv4Addr = match ip_str.parse() {
        Ok(ip) => ip,
        Err(e) => {
            log(k, &format!("Geçersiz IP {}: {}", ip_str, e));
            return;
        }
    };
    // İstek 3: Doğru bind — IP sistemde varsa o IP'ye, yoksa tüm arayüzlere (0.0.0.0) bağlan.
    let bind_target: Ipv4Addr = if ip_present_on_system(ip_str) || ip_str.starts_with("127.") {
        bind_ip
    } else {
        log(k, &format!("{} sistemde yok; 0.0.0.0 üzerine bağlanılıyor", ip_str));
        Ipv4Addr::UNSPECIFIED
    };
    let listener = match TcpListener::bind((bind_target, port)) {
        Ok(l) => l,
        Err(e) => {
            log(k, &format!("{}:{} açılamadı: {}", ip_str, port, e));
            return;
        }
    };
    let _ = fs::write(pid_path(k), format!("{} {} {}", std::process::id(), ip_str, port));
    log(k, &format!("Sunucu başladı -> {}:{}", ip_str, port));
    let state = Arc::new(Mutex::new(State {
        store: Vec::new(),
        history: Vec::new(),
    }));
    for s in listener.incoming() {
        if let Ok(s) = s {
            let st = Arc::clone(&state);
            thread::spawn(move || handle_client(s, k, st));
        }
    }
}

// ───────────────────────── Servis yönetimi ─────────────────────────

fn read_pid(k: Kind) -> Option<(u32, String, u16)> {
    let t = fs::read_to_string(pid_path(k)).ok()?;
    let mut it = t.split_whitespace();
    let pid: u32 = it.next()?.parse().ok()?;
    let second = it.next()?;
    if let Some(third) = it.next() {
        Some((pid, second.to_string(), third.parse().ok()?))
    } else {
        Some((pid, get_configured_ip(k), second.parse().ok()?))
    }
}

// Çalışan tüm süreç PID'lerini tek seferde alır (menüler hızlı çizilsin diye)
fn pid_set() -> HashSet<u32> {
    let out = match Command::new("tasklist").args(["/NH", "/FO", "CSV"]).output() {
        Ok(o) => o,
        Err(_) => return HashSet::new(),
    };
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .filter_map(|l| {
            l.split("\",\"")
                .nth(1)
                .and_then(|p| p.trim_matches('"').trim().parse::<u32>().ok())
        })
        .collect()
}

fn is_running_with(k: Kind, set: &HashSet<u32>) -> Option<(u32, String, u16)> {
    let (pid, ip, port) = read_pid(k)?;
    if set.contains(&pid) {
        Some((pid, ip, port))
    } else {
        let _ = fs::remove_file(pid_path(k));
        None
    }
}

fn is_running(k: Kind) -> Option<(u32, String, u16)> {
    is_running_with(k, &pid_set())
}

fn start_service(k: Kind, ip: &str, port: u16) -> io::Result<()> {
    let status = ensure_ip_on_system(ip);
    if status.starts_with("UYARI") {
        flash_warn(status);
    }
    ensure_firewall_rule(port); // İstek 3
    // İstek 3: port çakışma kontrolü — başka bir süreç bu portu tutuyorsa uyar.
    if !port_is_free(ip, port) {
        flash_warn(format!(
            "{} portu ({}:{}) başka bir uygulama tarafından kullanılıyor olabilir.",
            port, ip, port
        ));
    }
    let exe = prepare_daemon_exe()?;
    const DETACHED: u32 = 0x0000_0008;
    const NEW_GROUP: u32 = 0x0000_0200;
    const NO_WINDOW: u32 = 0x0800_0000;
    const BREAKAWAY: u32 = 0x0100_0000;
    let spawn = |flags: u32| {
        Command::new(&exe)
            .current_dir(data_dir())
            .args(["--serve", k.id(), ip, &port.to_string()])
            .stdin(Stdio::null())
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .creation_flags(flags)
            .spawn()
    };
    if spawn(DETACHED | NEW_GROUP | NO_WINDOW | BREAKAWAY).is_err() {
        spawn(DETACHED | NEW_GROUP | NO_WINDOW)?;
    }
    Ok(())
}

fn stop_service(k: Kind) {
    if let Some((pid, _, _)) = is_running(k) {
        let _ = Command::new("taskkill")
            .raw_arg(format!("/PID {} /F", pid))
            .output();
        let _ = fs::remove_file(pid_path(k));
    }
}

fn stop_all_services() {
    for k in KINDS {
        stop_service(k);
    }
}

// Başlatır ve gerçekten ayağa kalkana kadar bekler
fn start_and_wait(k: Kind) -> Result<(u32, String, u16), String> {
    let ip = get_configured_ip(k);
    let port = get_configured_port(k);
    start_service(k, &ip, port).map_err(|e| e.to_string())?;
    for _ in 0..16 {
        thread::sleep(Duration::from_millis(250));
        if let Some(r) = is_running(k) {
            return Ok(r);
        }
    }
    Err(format!(
        "{} başlamadı: {}:{} başka bir program tarafından kullanılıyor olabilir.",
        k.name(),
        ip,
        port
    ))
}

fn start_with_flash(k: Kind) {
    match start_and_wait(k) {
        Ok((pid, ip, port)) => {
            desired_set(k, true);
            // İstek 4: başlatma sonrası gerçek sağlık denetimi (TCP + *IDN?)
            match health_check(k) {
                Ok(ms) => flash_ok(format!(
                    "{} başlatıldı ve DOĞRULANDI ({}:{}  PID {}  *IDN? {} ms)",
                    k.name(), ip, port, pid, ms
                )),
                Err(e) => flash_warn(format!(
                    "{} başlatıldı (PID {}) ama *IDN? yanıtı alınamadı: {}",
                    k.name(), pid, e
                )),
            }
        }
        Err(e) => flash_err(e),
    }
}

fn toggle_device(k: Kind) {
    if is_running(k).is_some() {
        desired_set(k, false);
        stop_service(k);
        flash_ok(format!("{} durduruldu", k.name()));
    } else {
        start_with_flash(k);
    }
}

fn restart_device(k: Kind) {
    stop_service(k);
    thread::sleep(Duration::from_millis(700));
    start_with_flash(k);
}

// ───────────────────────── Sağlık denetimi + gözetmen (İstek 4) ─────────────────────────
// İstenen durum: kullanıcının başlattığı sunucular. Gözetmen bunları canlı tutar.
static DESIRED: Mutex<[bool; 3]> = Mutex::new([false, false, false]);

fn kind_index(k: Kind) -> usize {
    match k {
        Kind::Network => 0,
        Kind::Spectrum => 1,
        Kind::Generator => 2,
    }
}

fn desired_set(k: Kind, v: bool) {
    DESIRED.lock().unwrap_or_else(|e| e.into_inner())[kind_index(k)] = v;
}
fn desired_get(k: Kind) -> bool {
    DESIRED.lock().unwrap_or_else(|e| e.into_inner())[kind_index(k)]
}

// Gerçek sağlık denetimi: sunucuya TCP bağlanıp *IDN? gönderir, yanıtı doğrular. ms döndürür.
fn health_check(k: Kind) -> Result<u128, String> {
    let (ip, port) = match is_running(k) {
        Some((_, ip, port)) => (ip, port),
        None => return Err("süreç yok".to_string()),
    };
    let t0 = Instant::now();
    let addr: SocketAddr = format!("{}:{}", ip, port)
        .parse()
        .map_err(|_| "adres".to_string())?;
    let s = TcpStream::connect_timeout(&addr, Duration::from_millis(600)).map_err(|e| e.to_string())?;
    let _ = s.set_read_timeout(Some(Duration::from_millis(600)));
    let _ = s.set_write_timeout(Some(Duration::from_millis(600)));
    let mut w = s.try_clone().map_err(|e| e.to_string())?;
    w.write_all(b"*IDN?\n").map_err(|e| e.to_string())?;
    let mut line = String::new();
    let mut r = BufReader::new(s);
    match r.read_line(&mut line) {
        Ok(0) => Err("boş yanıt".to_string()),
        Ok(_) if line.to_uppercase().contains("KEYSIGHT") => Ok(t0.elapsed().as_millis()),
        Ok(_) => Ok(t0.elapsed().as_millis()),
        Err(e) => Err(e.to_string()),
    }
}

// Gözetmen: 3 sn'de bir kontrol; istenen ama ölü/yanıtsız sunucuyu otomatik yeniden başlatır.
fn start_watchdog() {
    thread::spawn(|| {
        let mut fail_count = [0u8; 3];
        loop {
            thread::sleep(Duration::from_secs(3));
            for k in KINDS {
                if !desired_get(k) {
                    fail_count[kind_index(k)] = 0;
                    continue;
                }
                let dead = is_running(k).is_none();
                let unhealthy = !dead && health_check(k).is_err();
                if dead || unhealthy {
                    let fc = &mut fail_count[kind_index(k)];
                    *fc += 1;
                    if *fc >= 2 {
                        *fc = 0;
                        push_log(
                            1,
                            format!(
                                "Gözetmen: {} {} — otomatik yeniden başlatılıyor",
                                k.name(),
                                if dead { "süreç ölü" } else { "yanıt vermiyor" }
                            ),
                        );
                        stop_service(k);
                        thread::sleep(Duration::from_millis(500));
                        if let Ok((_, ip, port)) = start_and_wait(k) {
                            match health_check(k) {
                                Ok(ms) => push_log(0, format!("Gözetmen: {} yeniden ÇALIŞIYOR ({}:{} {} ms)", k.name(), ip, port, ms)),
                                Err(e) => push_log(2, format!("Gözetmen: {} yeniden başlatıldı ama yanıt yok: {}", k.name(), e)),
                            }
                        } else {
                            push_log(2, format!("Gözetmen: {} yeniden başlatılamadı", k.name()));
                        }
                    }
                } else {
                    fail_count[kind_index(k)] = 0;
                }
            }
        }
    });
}

// Her menüde çalışan kısayollar: n, s, g, a, k. İşlendiyse true döner.
fn global_key(c: char) -> bool {
    match c {
        'n' => toggle_device(Kind::Network),
        's' => toggle_device(Kind::Spectrum),
        'g' => toggle_device(Kind::Generator),
        'a' => {
            for k in KINDS {
                if is_running(k).is_none() {
                    start_with_flash(k);
                }
            }
        }
        'k' => {
            stop_all_services();
            flash_ok("Tüm sunucular durduruldu".to_string());
        }
        _ => return false,
    }
    true
}

// ───────────────────────── Konsol & PowerShell yardımcıları ─────────────────────────

fn is_admin() -> bool {
    let ok = |prog: &str| {
        Command::new(prog)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    };
    ok("fltmc")
        || Command::new("net")
            .arg("session")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
}

// İstek 14: Yönetici gerektiren özelliklerin yanında gösterilecek rozet.
// Yönetici olarak çalışılıyorsa boş döner (rozet hiç görünmez).
fn admin_badge() -> String {
    if is_admin() {
        String::new()
    } else {
        format!("  {}[YÖNETİCİ]{}", cwn(), C_RESET)
    }
}

#[allow(dead_code)]
fn relaunch_as_admin() -> bool {
    let exe = match std::env::current_exe() {
        Ok(e) => e,
        Err(_) => return false,
    };
    let script = format!(
        "Start-Process -FilePath '{}' -Verb RunAs -ErrorAction Stop",
        ps_quote(&exe.to_string_lossy())
    );
    Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn ps_quote(s: &str) -> String {
    s.replace('\'', "''")
}

fn ps(script: &str) -> String {
    let full = format!("[Console]::OutputEncoding=[Text.Encoding]::UTF8; {}", script);
    match Command::new("powershell")
        .args([
            "-NoProfile",
            "-NonInteractive",
            "-ExecutionPolicy",
            "Bypass",
            "-Command",
            &full,
        ])
        .output()
    {
        Ok(o) => {
            let mut s = String::from_utf8_lossy(&o.stdout).to_string();
            let e = String::from_utf8_lossy(&o.stderr);
            if !e.trim().is_empty() {
                s.push_str(&e);
            }
            s
        }
        Err(e) => format!("PowerShell çalıştırılamadı: {}", e),
    }
}

// Komutu try/catch içinde çalıştırır; başarıyı / hatayı renkli yazdırır. Ek çıktıyı döndürür.
fn ps_report(script: &str, ok_msg: &str) -> String {
    let out = ps(&format!(
        "try {{ {}; '__OK__' }} catch {{ 'HATA: ' + $_.Exception.Message }}",
        script
    ));
    let extra = out.replace("__OK__", "").trim().to_string();
    if out.contains("__OK__") {
        println!("  {}{} {}{}", cok(), S_OK, ok_msg, C_RESET);
    } else {
        println!("  {}{} {}{}", cer(), S_ERR, extra, C_RESET);
    }
    extra
}

fn netsh(args: String) {
    match Command::new("netsh").raw_arg(args).output() {
        Ok(o) => {
            let out = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if !out.is_empty() {
                let col = if o.status.success() { cok() } else { cer() };
                println!("  {}{}{}", col, out, C_RESET);
            }
            let e = String::from_utf8_lossy(&o.stderr).trim().to_string();
            if !e.is_empty() {
                println!("  {}{}{}", cer(), e, C_RESET);
            }
        }
        Err(e) => println!("  {}netsh çalıştırılamadı: {}{}", cer(), e, C_RESET),
    }
}

fn copy_clipboard(text: &str) -> bool {
    let mut c = match Command::new("clip")
        .stdin(Stdio::piped())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
    {
        Ok(c) => c,
        Err(_) => return false,
    };
    if let Some(mut si) = c.stdin.take() {
        let _ = si.write_all(text.as_bytes());
    }
    c.wait().map(|s| s.success()).unwrap_or(false)
}

// İstek 6: Windows pano geçmişi (Win+V) açık mı? Kapalıysa yalnızca son kopya (IP) görünür.
fn clipboard_history_enabled() -> bool {
    match Command::new("reg")
        .args([
            "query",
            "HKCU\\Software\\Microsoft\\Clipboard",
            "/v",
            "EnableClipboardHistory",
        ])
        .creation_flags(CREATE_NO_WINDOW)
        .output()
    {
        Ok(o) => String::from_utf8_lossy(&o.stdout).contains("0x1"),
        Err(_) => false,
    }
}

static CLIP_HIST_WARNED: AtomicBool = AtomicBool::new(false);

// İstek 6: ÖNCE VISA, SONRA IP panoya kopyalanır (son kopya = IP; Win+V geçmişinde ikisi de görünür).
// Kopyalar arasında kısa bekleme; pano geçmişi kapalıysa ilk seferde uyarı verir.
fn copy_visa_then_ip(ip: &str, port: u16) -> bool {
    let visa = format!("TCPIP0::{}::{}::SOCKET", ip, port);
    let addr = format!("{}:{}", ip, port);
    let ok1 = copy_clipboard(&visa);
    thread::sleep(Duration::from_millis(400));
    let ok2 = copy_clipboard(&addr);
    if ok1 && ok2 {
        if !clipboard_history_enabled() && !CLIP_HIST_WARNED.swap(true, Ordering::SeqCst) {
            flash_warn(
                "Pano geçmişi kapalı: panoda yalnızca IP var. İkisini de görmek için Win+V geçmişini açın."
                    .to_string(),
            );
        }
        true
    } else {
        false
    }
}

// ───────────────────────── Sunucu kontrol paneli (her menünün altında) ─────────────────────────

fn state_badge_with(k: Kind, set: &HashSet<u32>) -> String {
    match is_running_with(k, set) {
        Some((pid, ip, port)) => format!(
            "{}● AKTİF{}   {}{}:{}{}  {}(PID {}){}",
            cok(), C_RESET, ci(), ip, port, C_RESET, cd(), pid, C_RESET
        ),
        None => format!(
            "{}○ KAPALI{}  {}({}:{}){}",
            cer(),
            C_RESET,
            cd(),
            get_configured_ip(k),
            get_configured_port(k),
            C_RESET
        ),
    }
}

fn server_panel() {
    let set = pid_set();
    draw_divider("SUNUCU KONTROLÜ  •  n/s/g aç-kapat · a tümünü aç · k tümünü kapat");
    for k in KINDS {
        let running = is_running_with(k, &set).is_some();
        println!(
            "    {}[{}]{}  {}{:<18}{} {}{} {:<7}{} {}",
            cn(),
            k.key(),
            C_RESET,
            cw(),
            k.name(),
            C_RESET,
            cd(),
            S_ARROW,
            if running { "kapat" } else { "başlat" },
            C_RESET,
            state_badge_with(k, &set)
        );
    }
    println!(
        "    {}[a]{} Tümünü Başlat        {}[k]{} Tümünü Durdur",
        cn(), C_RESET, cn(), C_RESET
    );
}

// ───────────────────────── 1) Sunucu kurma menüsü ─────────────────────────

fn colorize_log_line(line: &str) {
    if line.contains("GELEN :") {
        println!("  {}{}{}", ci(), line, C_RESET);
    } else if line.contains("CEVAP :") {
        println!("  {}{}{}", cok(), line, C_RESET);
    } else {
        println!("  {}{}{}", cf(), line, C_RESET);
    }
}

fn live_view(k: Kind) {
    let path = log_path(k);
    let stop = Arc::new(AtomicBool::new(false));
    let s2 = Arc::clone(&stop);
    thread::spawn(move || {
        let _ = raw_key();
        s2.store(true, Ordering::SeqCst);
    });
    let raw = fs::read(&path).unwrap_or_default();
    let text = String::from_utf8_lossy(&raw).to_string();
    let lines: Vec<&str> = text.lines().collect();
    for l in &lines[lines.len().saturating_sub(15)..] {
        colorize_log_line(l);
    }
    let mut pos = raw.len() as u64;
    while !stop.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(200));
        if let Ok(mut f) = fs::File::open(&path) {
            let len = f.metadata().map(|m| m.len()).unwrap_or(0);
            if len < pos {
                pos = 0;
            }
            if len > pos {
                let _ = f.seek(SeekFrom::Start(pos));
                let mut buf = Vec::new();
                let _ = f.read_to_end(&mut buf);
                pos += buf.len() as u64;
                for l in String::from_utf8_lossy(&buf).lines() {
                    colorize_log_line(l);
                }
            }
        }
    }
}

fn open_device(k: Kind) {
    draw_header(&format!("CANLI SCPI İZLEME  ›  {}", k.name()));
    let (ip, port) = match is_running(k) {
        Some((pid, ip, port)) => {
            println!(
                "  {}{} Sunucu zaten çalışıyor (PID {}). Yeniden başlatılmadı.{}\n",
                cok(), S_OK, pid, C_RESET
            );
            (ip, port)
        }
        None => match start_and_wait(k) {
            Ok((pid, ip, port)) => {
                println!(
                    "  {}{} Sunucu arka planda başlatıldı (PID {}).{}\n",
                    cok(), S_OK, pid, C_RESET
                );
                (ip, port)
            }
            Err(e) => {
                println!("  {}{} {}{}", cer(), S_ERR, e, C_RESET);
                pause();
                return;
            }
        },
    };
    let visa_addr = format!("TCPIP0::{}::{}::SOCKET", ip, port);
    // İstek 6: önce VISA sonra IP panoya kopyalanır (son kopya IP).
    if copy_visa_then_ip(&ip, port) {
        println!(
            "  {}Panoya kopyalandı →{} VISA: {}{}{}  •  IP: {}{}:{}{}",
            cf(), C_RESET, cn(), visa_addr, C_RESET, cn(), ip, port, C_RESET
        );
    } else {
        println!(
            "  {}Adres:{} {}{}:{}   (VISA: {}){}",
            cf(), C_RESET, cn(), ip, port, visa_addr, C_RESET
        );
    }
    println!(
        "\n  {}Menüye dönmek için herhangi bir tuşa basın  (Sunucu arka planda çalışmaya devam eder){}",
        cwn(), C_RESET
    );
    draw_divider("CANLI TRAFİK AKIŞI");
    live_view(k);
}

fn pick_device(prompt: &str) -> Pick<Kind> {
    loop {
        match read_key(prompt) {
            Key::Tab => return Pick::Home,
            Key::Back | Key::Esc => return Pick::Back,
            Key::Char(c) => match hot(c) {
                '1' | 'n' => return Pick::Got(Kind::Network),
                '2' | 's' => return Pick::Got(Kind::Spectrum),
                '3' | 'g' => return Pick::Got(Kind::Generator),
                '0' => return Pick::Back,
                _ => {}
            },
            _ => {}
        }
    }
}

macro_rules! pick {
    ($p:expr) => {
        match pick_device($p) {
            Pick::Got(k) => k,
            Pick::Back => continue,
            Pick::Home => return Nav::Home,
        }
    };
}

fn tcp_connect(ip: &str, port: u16) -> Result<TcpStream, String> {
    let addr: SocketAddr = format!("{}:{}", ip, port)
        .parse()
        .map_err(|e: std::net::AddrParseError| e.to_string())?;
    let s = TcpStream::connect_timeout(&addr, Duration::from_secs(2)).map_err(|e| e.to_string())?;
    let _ = s.set_read_timeout(Some(Duration::from_secs(2)));
    let _ = s.set_nodelay(true);
    Ok(s)
}

fn test_device(k: Kind) {
    println!();
    match is_running(k) {
        None => println!(
            "  {}{} {} çalışmıyor. Önce başlatın ({} tuşu).{}",
            cwn(),
            S_WARN,
            k.name(),
            k.key(),
            C_RESET
        ),
        Some((_, ip, port)) => {
            let t0 = Instant::now();
            match tcp_connect(&ip, port) {
                Err(e) => println!("  {}{} Bağlanılamadı: {}{}", cer(), S_ERR, e, C_RESET),
                Ok(mut s) => {
                    let t_conn = t0.elapsed().as_millis();
                    let t1 = Instant::now();
                    let res = s
                        .write_all(b"*IDN?\n")
                        .map_err(|e| e.to_string())
                        .and_then(|_| {
                            let mut line = String::new();
                            let mut r = BufReader::new(s.try_clone().map_err(|e| e.to_string())?);
                            match r.read_line(&mut line) {
                                Ok(0) => Err("bağlantı kapandı".to_string()),
                                Ok(_) => Ok(line.trim().to_string()),
                                Err(e) => Err(e.to_string()),
                            }
                        });
                    match res {
                        Ok(r) => {
                            println!(
                                "  {}{} {}:{} bağlantı {} ms, cevap {} ms{}",
                                cok(),
                                S_OK,
                                ip,
                                port,
                                t_conn,
                                t1.elapsed().as_millis(),
                                C_RESET
                            );
                            println!("  {}*IDN? {} {}{}", cf(), S_ARROW, r, C_RESET);
                        }
                        Err(e) => println!("  {}{} Sorgu başarısız: {}{}", cer(), S_ERR, e, C_RESET),
                    }
                }
            }
        }
    }
    println!();
    pause();
}

fn scpi_terminal(k: Kind) -> Nav {
    let (ip, port) = match is_running(k) {
        Some((_, ip, port)) => (ip, port),
        None => {
            flash_warn(format!("{} çalışmıyor; terminal için önce başlatın ({} tuşu).", k.name(), k.key()));
            return Nav::Back;
        }
    };
    let stream = match tcp_connect(&ip, port) {
        Ok(s) => s,
        Err(e) => {
            flash_err(format!("Bağlanılamadı: {}", e));
            return Nav::Back;
        }
    };
    let mut writer = match stream.try_clone() {
        Ok(w) => w,
        Err(e) => {
            flash_err(format!("Bağlantı hatası: {}", e));
            return Nav::Back;
        }
    };
    let mut reader = BufReader::new(stream);
    draw_header(&format!("SCPI TERMİNALİ  ›  {}  ({}:{})", k.name(), ip, port));
    println!(
        "  {}Komut yazıp Enter'a basın. '?' içeren komutlar cevap bekler (örn *IDN?  FREQ:CENT?).{}",
        cf(), C_RESET
    );
    println!(
        "  {}Çıkmak için boş satırda Backspace, ana menü için Tab.{}\n",
        cd(), C_RESET
    );
    loop {
        let cmd = match read_input("SCPI ›", None) {
            Input::Text(t) => t,
            Input::Home => return Nav::Home,
            _ => return Nav::Back,
        };
        if cmd.is_empty() {
            continue;
        }
        if writer.write_all(format!("{}\n", cmd).as_bytes()).is_err() {
            println!("  {}{} Bağlantı koptu.{}", cer(), S_ERR, C_RESET);
            pause();
            return Nav::Back;
        }
        if cmd.contains('?') {
            let mut line = String::new();
            match reader.read_line(&mut line) {
                Ok(0) => {
                    println!("  {}{} Sunucu bağlantıyı kapattı.{}", cer(), S_ERR, C_RESET);
                    pause();
                    return Nav::Back;
                }
                Ok(_) => println!("  {}{} {}{}", cok(), S_ARROW, line.trim(), C_RESET),
                Err(_) => println!("  {}{} Cevap zaman aşımına uğradı.{}", cwn(), S_WARN, C_RESET),
            }
        }
    }
}

fn devices_menu() -> Nav {
    loop {
        draw_header("KEYSIGHT TECH  ›  Keysight Cihaz Ayarlama (SCPI / TCP soket)");
        let set = pid_set();
        draw_divider("CİHAZLAR");
        for (i, k) in KINDS.iter().enumerate() {
            println!(
                "    {}[{}]{}  {}{:<18}{}  {}",
                cn(),
                i + 1,
                C_RESET,
                cw(),
                k.name(),
                C_RESET,
                state_badge_with(*k, &set)
            );
            println!("         {}*IDN: {}{}", cd(), current_idn(*k), C_RESET);
        }
        println!();
        draw_divider("ÇALIŞTIRMA");
        opt_line("1-3", "Cihazı başlat + IP'yi panoya kopyala + canlı trafiği izle");
        opt_line("r", "Cihazı yeniden başlat");
        opt_line("y", "Adresi panoya kopyala (IP ve VISA adresi)");
        draw_divider("AYARLAR");
        opt_line("i", "IP adresini değiştir");
        opt_line("p", "Port numarasını değiştir (varsayılan 5025)");
        opt_line("m", "Cihaz modelini seç (7 gerçek Keysight modeli → *IDN yanıtı)");
        opt_line("e", "Özel SCPI cevap dosyasını düzenle (Notepad)");
        draw_divider("TEST & TANI");
        opt_line("t", "Bağlantı testi (*IDN? sorgusu, gecikme ölçümü)");
        opt_line("x", "SCPI terminali (komut gönder, cevap oku)");
        opt_line("l", "Günlüğü (log) Notepad'de aç");
        opt_line("c", "Günlüğü temizle");
        opt_line("f", "Güvenlik duvarı: portu gelen bağlantılara aç");
        opt_line("o", "Veri klasörünü aç");
        footer(true, true);

        let ch = match menu_key_srv("Seçiminiz ›") {
            Mk::Home => return Nav::Home,
            Mk::Back => return Nav::Back,
            Mk::None => continue,
            Mk::Ch(c) => c,
        };
        match ch {
            '1' => open_device(Kind::Network),
            '2' => open_device(Kind::Spectrum),
            '3' => open_device(Kind::Generator),
            '0' => return Nav::Back,
            'r' => {
                let k = pick!("Hangi cihaz yeniden başlasın (1-3 / n s g) ›");
                restart_device(k);
            }
            'y' => {
                let k = pick!("Hangi cihazın adresi (1-3 / n s g) ›");
                let ip = get_configured_ip(k);
                let port = get_configured_port(k);
                if copy_visa_then_ip(&ip, port) {
                    flash_ok(format!(
                        "Panoya kopyalandı → VISA: TCPIP0::{}::{}::SOCKET  •  IP: {}:{}",
                        ip, port, ip, port
                    ));
                } else {
                    flash_err("Panoya kopyalanamadı.".to_string());
                }
            }
            'i' => {
                let k = pick!("Hangi cihazın IP'si değişsin (1-3 / n s g) ›");
                let new_ip = ask!("Yeni IP adresi (örn 12.0.0.2) ›");
                if new_ip.parse::<Ipv4Addr>().is_ok() {
                    set_configured_ip(k, &new_ip);
                    if is_running(k).is_some() {
                        restart_device(k);
                    }
                    flash_ok(format!("{} IP adresi: {}", k.name(), new_ip));
                } else {
                    flash_err("Geçersiz IPv4 adresi.".to_string());
                }
            }
            'p' => {
                let k = pick!("Hangi cihazın portu değişsin (1-3 / n s g) ›");
                let v = ask!("Yeni port (1-65535) ›");
                match v.parse::<u16>() {
                    Ok(p) if p > 0 => {
                        set_configured_port(k, p);
                        if is_running(k).is_some() {
                            restart_device(k);
                        }
                        flash_ok(format!("{} portu: {}", k.name(), p));
                    }
                    _ => flash_err("Geçersiz port numarası.".to_string()),
                }
            }
            'm' => {
                // İstek 5: serbest *IDN düzenleme yerine 7 gerçek Keysight modelinden seçim.
                let k = pick!("Hangi cihazın modeli değişsin (1-3 / n s g) ›");
                let models = k.models();
                draw_header(&format!("MODEL SEÇİMİ  ›  {}", k.name()));
                println!("  {}Şu anki kimlik: {}{}\n", cd(), current_idn(k), C_RESET);
                for (i, (m, fw)) in models.iter().enumerate() {
                    let mark = if i == k.selected_model_idx() {
                        format!("{}●{}", cok(), C_RESET)
                    } else {
                        " ".to_string()
                    };
                    println!(
                        "    {} {}[{}]{}  {}{:<8}{}  {}bellenim {}{}",
                        mark, cn(), i + 1, C_RESET, cw(), m, C_RESET, cd(), fw, C_RESET
                    );
                }
                println!();
                let v = ask!("Model numarası (1-7; boş = iptal) ›");
                match v.trim().parse::<usize>() {
                    Ok(n) if n >= 1 && n <= models.len() => {
                        k.set_selected_model(n - 1);
                        if is_running(k).is_some() {
                            restart_device(k);
                        }
                        flash_ok(format!(
                            "{} modeli: {} (hemen geçerli).",
                            k.name(),
                            models[n - 1].0
                        ));
                    }
                    _ => flash_err("Geçersiz model numarası.".to_string()),
                }
            }
            'e' => {
                let k = pick!("Hangi cihaz (1-3 / n s g) ›");
                ensure_responses_file(k);
                let _ = Command::new("notepad").arg(responses_path(k)).spawn();
            }
            't' => {
                let k = pick!("Hangi cihaz test edilsin (1-3 / n s g) ›");
                test_device(k);
            }
            'x' => {
                let k = pick!("Hangi cihaza bağlanılsın (1-3 / n s g) ›");
                if scpi_terminal(k) == Nav::Home {
                    return Nav::Home;
                }
            }
            'l' => {
                let k = pick!("Hangi cihazın günlüğü (1-3 / n s g) ›");
                if !log_path(k).exists() {
                    let _ = fs::write(log_path(k), "");
                }
                let _ = Command::new("notepad").arg(log_path(k)).spawn();
            }
            'c' => {
                let k = pick!("Hangi cihazın günlüğü temizlensin (1-3 / n s g) ›");
                let _ = fs::write(log_path(k), "");
                flash_ok(format!("{} günlüğü temizlendi.", k.name()));
            }
            'f' => {
                let k = pick!("Hangi cihazın portu açılsın (1-3 / n s g) ›");
                let port = get_configured_port(k);
                let name = format!("MultiTool SCPI {}", port);
                println!();
                netsh(format!("advfirewall firewall delete rule name=\"{}\"", name));
                netsh(format!(
                    "advfirewall firewall add rule name=\"{}\" dir=in action=allow protocol=TCP localport={}",
                    name, port
                ));
                println!();
                pause();
            }
            'o' => {
                let _ = Command::new("explorer").arg(data_dir()).spawn();
            }
            _ => {}
        }
    }
}

// ───────────────────────── Ethernet adaptörleri (2, 3) ─────────────────────────

#[derive(Clone)]
struct Adapter {
    name: String,
    status: String,
    speed: String,
    ips: String,
}

fn list_adapters() -> Vec<Adapter> {
    let script = "Get-NetAdapter -Physical | ForEach-Object { $a=$_; \
        $ips=(Get-NetIPAddress -InterfaceIndex $a.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | \
        ForEach-Object { $_.IPAddress + '/' + $_.PrefixLength }) -join ', '; \
        '{0}|{1}|{2}|{3}' -f $a.Name,$a.Status,$a.LinkSpeed,$ips }";
    ps(script)
        .lines()
        .filter_map(|l| {
            let p: Vec<&str> = l.trim().splitn(4, '|').collect();
            if p.len() == 4 {
                Some(Adapter {
                    name: p[0].to_string(),
                    status: p[1].to_string(),
                    speed: p[2].to_string(),
                    ips: p[3].to_string(),
                })
            } else {
                None
            }
        })
        .collect()
}

fn adapter_link(name: &str) -> String {
    ps(&format!("(Get-NetAdapter -Name '{}').LinkSpeed", ps_quote(name)))
        .trim()
        .to_string()
}

fn status_color(st: &str) -> &'static str {
    if st.eq_ignore_ascii_case("Up") {
        cok()
    } else if st.eq_ignore_ascii_case("Disabled") {
        cer()
    } else {
        cwn()
    }
}

fn print_adapter_state(a: &Adapter) {
    println!(
        "    {}{}{}   {}[{}{}{} / {}{}{}]{}",
        C_BOLD,
        a.name,
        C_RESET,
        cf(),
        status_color(&a.status),
        a.status,
        cf(),
        ci(),
        a.speed,
        cf(),
        C_RESET
    );
    println!(
        "         {}IP:{} {}{}{}",
        cd(),
        C_RESET,
        cw(),
        if a.ips.is_empty() { "Atanmamış (-)" } else { a.ips.as_str() },
        C_RESET
    );
}

const NO_HOT: &[char] = &[];

fn pick_adapter(title: &str) -> Pick<Adapter> {
    draw_header(title);
    println!("  {}Adaptörler taranıyor...{}", cf(), C_RESET);
    let ads = list_adapters();
    if ads.is_empty() {
        flash_err("Fiziksel ağ adaptörü bulunamadı.".to_string());
        return Pick::Back;
    }
    loop {
        draw_header(title);
        draw_divider("AĞ ADAPTÖRLERİ");
        for (i, a) in ads.iter().enumerate() {
            print!("    {}[{}]{}", cn(), i + 1, C_RESET);
            print_adapter_state(a);
        }
        footer(true, false);
        match read_input("Adaptör No ›", Some(NO_HOT)) {
            Input::Text(t) => {
                if let Ok(n) = t.parse::<usize>() {
                    if n == 0 {
                        return Pick::Back;
                    }
                    if n <= ads.len() {
                        return Pick::Got(ads[n - 1].clone());
                    }
                }
            }
            Input::Hot(c) => {
                global_key(c);
            }
            Input::Back => return Pick::Back,
            Input::Home => return Pick::Home,
        }
    }
}

fn mask_from(input: &str) -> Option<String> {
    if let Ok(m) = input.parse::<Ipv4Addr>() {
        return Some(m.to_string());
    }
    let p: u32 = input.trim_start_matches('/').parse().ok()?;
    if p > 32 {
        return None;
    }
    let m: u32 = if p == 0 { 0 } else { u32::MAX << (32 - p) };
    Some(Ipv4Addr::from(m).to_string())
}

fn parse_cidr(s: &str) -> Option<(String, String)> {
    let (ip, pre) = match s.trim().split_once('/') {
        Some((a, b)) => (a.trim(), b.trim()),
        None => (s.trim(), "24"),
    };
    let ip: Ipv4Addr = ip.parse().ok()?;
    Some((ip.to_string(), mask_from(pre)?))
}

fn set_dns(name: &str, list: &str) {
    let ips: Vec<&str> = list
        .split(|c: char| c == ',' || c == ';' || c.is_whitespace())
        .map(|s| s.trim())
        .filter(|s| !s.is_empty())
        .collect();
    if ips.is_empty() {
        netsh(format!("interface ipv4 set dnsservers name=\"{}\" source=dhcp", name));
        return;
    }
    if ips.iter().any(|s| s.parse::<Ipv4Addr>().is_err()) {
        println!("  {}{} Geçersiz DNS adresi.{}", cer(), S_ERR, C_RESET);
        return;
    }
    netsh(format!(
        "interface ipv4 set dnsservers name=\"{}\" static {} primary validate=no",
        name, ips[0]
    ));
    for (i, d) in ips.iter().enumerate().skip(1) {
        netsh(format!(
            "interface ipv4 add dnsservers name=\"{}\" address={} index={} validate=no",
            name,
            d,
            i + 1
        ));
    }
}

fn valid_host(s: &str) -> bool {
    !s.is_empty() && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-' || c == ':')
}

fn adapter_details(name: &str) -> String {
    let script = r#"
$n = '%N%'
$a = Get-NetAdapter -Name $n -ErrorAction SilentlyContinue
if (-not $a) { 'Adaptör bulunamadı.'; return }
$i = Get-NetIPInterface -InterfaceAlias $n -AddressFamily IPv4 -ErrorAction SilentlyContinue
$c = Get-NetIPConfiguration -InterfaceAlias $n -ErrorAction SilentlyContinue
'Açıklama        : ' + $a.InterfaceDescription
'MAC adresi      : ' + $a.MacAddress
'Durum           : ' + $a.Status
'Bağlantı hızı   : ' + $a.LinkSpeed
'Sürücü sürümü   : ' + $a.DriverVersionString
'MTU             : ' + $i.NlMtu
'DHCP            : ' + $i.Dhcp
'Ağ geçidi       : ' + ((@($c.IPv4DefaultGateway.NextHop)) -join ', ')
'DNS             : ' + ((@($c.DnsServer.ServerAddresses)) -join ', ')
"#;
    ps(&script.replace("%N%", &ps_quote(name)))
}

// İstek 20: Adaptörün IP yapılandırmasını değiştirmeden önce mevcut durumu yedekler.
fn backup_adapter_ip(name: &str) {
    let info = adapter_details(name);
    let safe: String = name.chars().map(|c| if c.is_alphanumeric() { c } else { '_' }).collect();
    let bak = data_dir().join(format!("adapter_{}.ip.bak", safe));
    let _ = fs::write(&bak, format!("Adaptör: {}\nYedek zamanı: {}\n{}\n", name, ts(), info));
    flash_ok(format!("Eski ağ ayarı yedeklendi: adapter_{}.ip.bak", safe));
}

fn adapter_ip_menu(mut a: Adapter) -> Nav {
    let mut refresh = false;
    loop {
        if refresh {
            if let Some(n) = list_adapters().into_iter().find(|x| x.name == a.name) {
                a = n;
            }
            refresh = false;
        }
        draw_header(&format!("ETHERNET IP  ›  {}", a.name));
        draw_divider("MEVCUT DURUM");
        print_adapter_state(&a);
        // İstek 12: ayrıntılı ağ bilgisi (MAC, hız, MTU, DNS, ağ geçidi) otomatik gösterilir.
        for l in adapter_details(&a.name).lines() {
            println!("         {}{}{}", cd(), l, C_RESET);
        }
        println!();
        draw_divider("IP & AĞ İŞLEMLERİ");
        opt_line("1", "Statik IP ata (mevcut IP'leri değiştirir; ağ geçidi + DNS isteğe bağlı)");
        opt_line("2", "Ek IP(ler) ekle (çoklu IP / multi-homing)");
        opt_line("3", "Belirli bir IP adresini sil");
        opt_line("4", "DHCP (otomatik IP + otomatik DNS) moduna geçir");
        opt_line("5", "DNS sunucularını ayarla (boş = otomatik)");
        opt_line("6", "MTU ayarla (Jumbo Frame için 9000)");
        opt_line("7", "Adaptörü etkinleştir / devre dışı bırak");
        opt_line("8", "Adaptörü yeniden başlat");
        opt_line("9", "Ping testi");
        footer(true, false);

        let ch = match menu_key("Seçiminiz ›") {
            Mk::Home => return Nav::Home,
            Mk::Back => return Nav::Back,
            Mk::None => continue,
            Mk::Ch(c) => c,
        };
        let n = a.name.clone();
        let q = ps_quote(&n);
        match ch {
            '0' => return Nav::Back,
            '1' => {
                let ip = ask!("IP Adresi (örn 192.168.1.10/24) ›");
                match parse_cidr(&ip) {
                    Some((ip, mask)) => {
                        backup_adapter_ip(&n); // İstek 20: değişiklikten önce yedekle
                        let gw = ask!("Ağ Geçidi (boş geçilebilir) ›");
                        let gw_arg = if gw.parse::<Ipv4Addr>().is_ok() {
                            format!(" {}", gw)
                        } else {
                            if !gw.is_empty() {
                                println!("  {}{} Ağ geçidi geçersiz, atlandı.{}", cwn(), S_WARN, C_RESET);
                            }
                            String::new()
                        };
                        netsh(format!(
                            "interface ipv4 set address name=\"{}\" static {} {}{}",
                            n, ip, mask, gw_arg
                        ));
                        let dns = ask!("DNS sunucuları, virgülle (boş = değiştirme) ›");
                        if !dns.is_empty() {
                            set_dns(&n, &dns);
                        }
                    }
                    None => println!("  {}{} Geçersiz IP formatı.{}", cer(), S_ERR, C_RESET),
                }
                refresh = true;
                pause();
            }
            '2' => {
                let inp = ask!("IP'ler, virgülle (örn 10.0.0.5/8, 192.168.2.20/24) ›");
                for item in inp.split(',').filter(|s| !s.trim().is_empty()) {
                    match parse_cidr(item) {
                        Some((ip, mask)) => {
                            println!("  {}{} Ekleniyor: {} / {}{}", ci(), S_ARROW, ip, mask, C_RESET);
                            netsh(format!(
                                "interface ipv4 add address name=\"{}\" address={} mask={}",
                                n, ip, mask
                            ));
                        }
                        None => println!("  {}{} Geçersiz: {}{}", cer(), S_ERR, item.trim(), C_RESET),
                    }
                }
                refresh = true;
                pause();
            }
            '3' => {
                let ip = ask!("Silinecek IP ›");
                match ip.parse::<Ipv4Addr>() {
                    Ok(ip) => netsh(format!(
                        "interface ipv4 delete address name=\"{}\" address={}",
                        n, ip
                    )),
                    Err(_) => println!("  {}{} Geçersiz IP.{}", cer(), S_ERR, C_RESET),
                }
                refresh = true;
                pause();
            }
            '4' => {
                backup_adapter_ip(&n); // İstek 20: DHCP'ye geçmeden önce yedekle
                netsh(format!("interface ipv4 set address name=\"{}\" source=dhcp", n));
                netsh(format!("interface ipv4 set dnsservers name=\"{}\" source=dhcp", n));
                refresh = true;
                pause();
            }
            '5' => {
                let dns = ask!("DNS sunucuları, virgülle (örn 8.8.8.8, 1.1.1.1; boş = otomatik) ›");
                set_dns(&n, &dns);
                pause();
            }
            '6' => {
                let v = ask!("MTU değeri (576-9216; örn 1500 / 9000) ›");
                match v.parse::<u32>() {
                    Ok(m) if (576..=9216).contains(&m) => {
                        netsh(format!(
                            "interface ipv4 set subinterface \"{}\" mtu={} store=persistent",
                            n, m
                        ));
                        println!(
                            "  {}Not: Jumbo Frame için sürücüde 'Jumbo Packet' ayarı da açık olmalı.{}",
                            cd(), C_RESET
                        );
                    }
                    _ => println!("  {}{} Geçersiz MTU.{}", cer(), S_ERR, C_RESET),
                }
                pause();
            }
            '7' => {
                if a.status.eq_ignore_ascii_case("Disabled") {
                    ps_report(
                        &format!("Enable-NetAdapter -Name '{}' -Confirm:$false -ErrorAction Stop", q),
                        "Adaptör etkinleştirildi.",
                    );
                } else if confirm("Adaptör devre dışı bırakılsın mı? Bağlantı kopar. (e/h) ›") {
                    ps_report(
                        &format!("Disable-NetAdapter -Name '{}' -Confirm:$false -ErrorAction Stop", q),
                        "Adaptör devre dışı bırakıldı.",
                    );
                }
                refresh = true;
                pause();
            }
            '8' => {
                println!("  {}Yeniden başlatılıyor (bağlantı kısa süre kopar)...{}", cwn(), C_RESET);
                ps_report(
                    &format!("Restart-NetAdapter -Name '{}' -Confirm:$false -ErrorAction Stop", q),
                    "Adaptör yeniden başlatıldı.",
                );
                refresh = true;
                pause();
            }
            '9' => {
                let t = ask!("Ping hedefi (IP veya ad) ›");
                if valid_host(&t) {
                    println!("  {}Ping gönderiliyor...{}", cf(), C_RESET);
                    match Command::new("ping").args(["-n", "4", &t]).output() {
                        Ok(o) => {
                            for l in String::from_utf8_lossy(&o.stdout).lines() {
                                if !l.trim().is_empty() {
                                    println!("  {}{}{}", cf(), l, C_RESET);
                                }
                            }
                        }
                        Err(e) => println!("  {}{} ping çalışmadı: {}{}", cer(), S_ERR, e, C_RESET),
                    }
                } else {
                    println!("  {}{} Geçersiz hedef.{}", cer(), S_ERR, C_RESET);
                }
                pause();
            }
            _ => {}
        }
    }
}

fn ip_menu() -> Nav {
    loop {
        let a = match pick_adapter("ETHERNET AYARI  ›  IP Yapılandırması") {
            Pick::Got(a) => a,
            Pick::Back => return Nav::Back,
            Pick::Home => return Nav::Home,
        };
        if adapter_ip_menu(a) == Nav::Home {
            return Nav::Home;
        }
    }
}

// ───────────────────────── Ethernet hız & duplex (dinamik liste) ─────────────────────────

struct SpeedOpt {
    reg: String,
    display: String,
    mbps: Option<u64>,
    is_auto: bool,
    half: bool,
}

struct SpeedInfo {
    keyword: String,
    prop_name: String,
    cur_reg: String,
    cur_display: String,
    opts: Vec<SpeedOpt>,
}

// "2.5 Gbps Full Duplex", "1,0 Gbps Tam Dupleks", "100 Mbps", "10Gbps" gibi metinlerden hızı (Mbps) çıkarır
fn parse_mbps(s: &str) -> Option<u64> {
    let s = s.replace(',', ".");
    let toks: Vec<&str> = s.split_whitespace().collect();
    for (i, t) in toks.iter().enumerate() {
        let num_end = t
            .find(|c: char| !(c.is_ascii_digit() || c == '.'))
            .unwrap_or(t.len());
        if num_end == 0 {
            continue;
        }
        let num: f64 = match t[..num_end].parse() {
            Ok(n) => n,
            Err(_) => continue,
        };
        let unit = if num_end < t.len() {
            t[num_end..].to_lowercase()
        } else {
            toks.get(i + 1).map(|x| x.to_lowercase()).unwrap_or_default()
        };
        if unit.starts_with('g') {
            return Some((num * 1000.0).round() as u64);
        }
        if unit.starts_with('m') {
            return Some(num.round() as u64);
        }
    }
    None
}

fn fmt_speed(m: u64) -> String {
    if m >= 1000 {
        if m % 1000 == 0 {
            format!("{} Gbps", m / 1000)
        } else {
            format!("{:.1} Gbps", m as f64 / 1000.0)
        }
    } else {
        format!("{} Mbps", m)
    }
}

fn speed_class(max_mbps: u64) -> &'static str {
    match max_mbps {
        0 => "Bilinmiyor",
        1..=100 => "Fast Ethernet (100 Mbps sınıfı)",
        101..=1000 => "Gigabit Ethernet (1 Gbps sınıfı)",
        1001..=2500 => "Multi-Gig 2.5G sınıfı",
        2501..=5000 => "Multi-Gig 5G sınıfı",
        5001..=10000 => "10 Gigabit Ethernet sınıfı",
        _ => "10G üzeri (SFP+ / 25G / 40G sınıfı)",
    }
}

// Sürücünün gerçekten sunduğu hız seçeneklerini okur (sabit liste YOK)
fn fetch_speed_info(name: &str) -> Option<SpeedInfo> {
    let script = r#"
$n = '%N%'
$all = Get-NetAdapterAdvancedProperty -Name $n -ErrorAction SilentlyContinue
$p = $all | Where-Object { $_.RegistryKeyword -eq '*SpeedDuplex' } | Select-Object -First 1
if (-not $p) {
  $p = $all | Where-Object {
    $_.RegistryKeyword -in 'SpeedDuplex','LinkSpeedDuplex','ConnectionType','Speed' -or
    $_.DisplayName -match 'Speed.*Duplex|Duplex|Dupleks'
  } | Select-Object -First 1
}
if ($p) {
  'KEY|' + $p.RegistryKeyword + '|' + $p.DisplayName + '|' + (($p.RegistryValue) -join '') + '|' + $p.DisplayValue
  $rv = @($p.ValidRegistryValues)
  $dv = @($p.ValidDisplayValues)
  for ($i = 0; $i -lt $rv.Count; $i++) { 'OPT|' + $rv[$i] + '|' + $dv[$i] }
}
"#;
    let out = ps(&script.replace("%N%", &ps_quote(name)));
    let mut keyword = String::new();
    let mut prop_name = String::new();
    let mut cur_reg = String::new();
    let mut cur_display = String::new();
    let mut opts: Vec<SpeedOpt> = Vec::new();
    for l in out.lines() {
        let l = l.trim();
        if let Some(rest) = l.strip_prefix("KEY|") {
            let p: Vec<&str> = rest.splitn(4, '|').collect();
            if p.len() == 4 {
                keyword = p[0].to_string();
                prop_name = p[1].to_string();
                cur_reg = p[2].to_string();
                cur_display = p[3].to_string();
            }
        } else if let Some(rest) = l.strip_prefix("OPT|") {
            let p: Vec<&str> = rest.splitn(2, '|').collect();
            if p.len() == 2 {
                let disp = p[1].to_string();
                let low = disp.to_lowercase();
                let mbps = parse_mbps(&disp);
                opts.push(SpeedOpt {
                    reg: p[0].to_string(),
                    is_auto: low.contains("auto") || low.contains("otomatik") || (mbps.is_none() && p[0] == "0"),
                    half: low.contains("half") || low.contains("yar"),
                    mbps,
                    display: disp,
                });
            }
        }
    }
    if keyword.is_empty() || opts.is_empty() {
        return None;
    }
    // Otomatik en başta, sonra hızına göre; aynı hızda önce half sonra full
    opts.sort_by_key(|o| (if o.is_auto { 0u8 } else { 1u8 }, o.mbps.unwrap_or(0), if o.half { 0u8 } else { 1u8 }));
    Some(SpeedInfo {
        keyword,
        prop_name,
        cur_reg,
        cur_display,
        opts,
    })
}

const SPEED_HOT: &[char] = &['r', 'l'];

fn speed_adapter_menu(a: &Adapter) -> Nav {
    draw_header(&format!("HIZ & DUPLEX  ›  {}", a.name));
    println!("  {}Sürücüden hız seçenekleri okunuyor...{}", cf(), C_RESET);
    let mut info = fetch_speed_info(&a.name);
    let mut link = a.speed.clone();
    let q = ps_quote(&a.name);
    loop {
        draw_header(&format!("HIZ & DUPLEX  ›  {}", a.name));
        draw_divider("BAĞLANTI BİLGİSİ");
        println!("    {}Mevcut bağlantı hızı :{} {}{}{}", cd(), C_RESET, ci(), link, C_RESET);
        // İstek 12: ayrıntılı ağ bilgisi (MAC, durum, MTU, DNS, ağ geçidi) otomatik gösterilir.
        for l in adapter_details(&a.name).lines() {
            println!("    {}{}{}", cd(), l, C_RESET);
        }
        match &info {
            None => {
                println!(
                    "\n  {}{} Bu adaptörün sürücüsü hız/duplex seçeneği sunmuyor (sanal ya da özel sürücü olabilir).{}",
                    cwn(), S_WARN, C_RESET
                );
                println!(
                    "  {}Sürücünün sunduğu tüm gelişmiş özellikleri [l] ile listeleyebilirsiniz.{}\n",
                    cd(), C_RESET
                );
            }
            Some(si) => {
                let max = si.opts.iter().filter_map(|o| o.mbps).max().unwrap_or(0);
                println!(
                    "    {}Desteklenen en yüksek :{} {}{}{}  {}({}){}",
                    cd(),
                    C_RESET,
                    cn(),
                    if max > 0 { fmt_speed(max) } else { "?".to_string() },
                    C_RESET,
                    cf(),
                    speed_class(max),
                    C_RESET
                );
                println!(
                    "    {}Ayar özelliği        :{} {}  {}({}){}",
                    cd(), C_RESET, si.prop_name, cd(), si.keyword, C_RESET
                );
                println!(
                    "    {}Seçili ayar          :{} {}{}{}\n",
                    cd(), C_RESET, cw(), si.cur_display, C_RESET
                );
                draw_divider("UYGULANABİLİR HIZ AYARLARI  (sürücüden okundu)");
                for (i, o) in si.opts.iter().enumerate() {
                    let is_cur = o.reg == si.cur_reg;
                    let col = if o.mbps.map(|m| m >= 2500).unwrap_or(false) { ci() } else { cw() };
                    println!(
                        "    {}[{:>2}]{}  {}{:<34}{} {}{}{}",
                        cn(),
                        i + 1,
                        C_RESET,
                        col,
                        o.display,
                        C_RESET,
                        if is_cur { cok() } else { cd() },
                        if is_cur { "◄ MEVCUT".to_string() } else { format!("(değer {})", o.reg) },
                        C_RESET
                    );
                }
                println!();
            }
        }
        opt_line("r", "Yeniden oku / bağlantı hızını yenile");
        opt_line("l", "Sürücünün tüm gelişmiş özelliklerini listele");
        footer(true, false);

        match read_input("Ayar No veya komut ›", Some(SPEED_HOT)) {
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot(c) => {
                if global_key(c) {
                    continue;
                }
                match c {
                    'r' => {
                        println!("  {}Okunuyor...{}", cf(), C_RESET);
                        info = fetch_speed_info(&a.name);
                        link = adapter_link(&a.name);
                    }
                    'l' => {
                        println!("  {}Okunuyor...{}", cf(), C_RESET);
                        let t = ps(&format!(
                            "Get-NetAdapterAdvancedProperty -Name '{}' | ForEach-Object {{ $_.DisplayName + '  =  ' + $_.DisplayValue }}",
                            q
                        ));
                        for l in t.lines().filter(|l| !l.trim().is_empty()) {
                            println!("  {}{}{}", cf(), l.trim(), C_RESET);
                        }
                        pause();
                    }
                    _ => {}
                }
            }
            Input::Text(t) => {
                let n: usize = match t.parse() {
                    Ok(n) => n,
                    Err(_) => continue,
                };
                if n == 0 {
                    return Nav::Back;
                }
                let (kw, reg, disp) = match &info {
                    Some(si) if n <= si.opts.len() => (
                        si.keyword.clone(),
                        si.opts[n - 1].reg.clone(),
                        si.opts[n - 1].display.clone(),
                    ),
                    _ => continue,
                };
                println!(
                    "\n  {}Uygulanıyor: {}  (bağlantı kısa süre kopup gelebilir)...{}",
                    cwn(), disp, C_RESET
                );
                let script = format!(
                    "try {{ Set-NetAdapterAdvancedProperty -Name '{n}' -RegistryKeyword '{kw}' -RegistryValue '{rv}' -ErrorAction Stop; \
                     Start-Sleep -Seconds 4; 'LINK=' + (Get-NetAdapter -Name '{n}').LinkSpeed; '__OK__' }} \
                     catch {{ 'HATA: ' + $_.Exception.Message }}",
                    n = q,
                    kw = ps_quote(&kw),
                    rv = ps_quote(&reg)
                );
                let out = ps(&script);
                if out.contains("__OK__") {
                    if let Some(l) = out.lines().find_map(|l| l.trim().strip_prefix("LINK=")) {
                        link = l.trim().to_string();
                    }
                    println!(
                        "  {}{} Uygulandı. Bağlantı hızı: {}{}",
                        cok(), S_OK, link, C_RESET
                    );
                    println!(
                        "  {}Hız anlaşması uzun sürebilir; güncel değer için [r] tuşuna basın.{}",
                        cd(), C_RESET
                    );
                    info = fetch_speed_info(&a.name);
                } else {
                    println!("  {}{} {}{}", cer(), S_ERR, out.trim(), C_RESET);
                }
                pause();
            }
        }
    }
}

fn speed_menu() -> Nav {
    loop {
        let a = match pick_adapter("ETHERNET AYARI  ›  Hız & Duplex") {
            Pick::Got(a) => a,
            Pick::Back => return Nav::Back,
            Pick::Home => return Nav::Home,
        };
        if speed_adapter_menu(&a) == Nav::Home {
            return Nav::Home;
        }
    }
}

// ───────────────────────── 4) USB panel kontrolü ─────────────────────────

struct UsbDisplayItem {
    group: String,
    status: String,
    title: String,
    meta: String,
    instance_id: String,
    letters: String, // "E:,F:" gibi sürücü harfleri (yalnızca bellekler)
}

fn fetch_usb_items(show_hubs: bool) -> Vec<UsbDisplayItem> {
    let script = r#"
$out = @()
Get-Disk | Where-Object { $_.BusType -eq 'USB' } | ForEach-Object {
    $d = $_
    $size = "{0:N1} GB" -f ($d.Size / 1GB)
    $parts = Get-Partition -DiskNumber $d.Number -ErrorAction SilentlyContinue
    $lets = @()
    $vols = @()
    if ($parts) {
        foreach ($p in $parts) {
            if ($p.DriveLetter) {
                $lets += "$($p.DriveLetter):"
                $v = Get-Volume -DriveLetter $p.DriveLetter -ErrorAction SilentlyContinue
                if ($v -and $v.FileSystemLabel) { $vols += $v.FileSystemLabel }
            }
        }
    }
    $letStr = if ($lets.Count -gt 0) { $lets -join ', ' } else { 'Harf Yok' }
    $volStr = if ($vols.Count -gt 0) { " [$($vols -join ', ')]" } else { '' }
    $pnp = Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object {
        $_.Class -eq 'DiskDrive' -and $_.FriendlyName -eq $d.FriendlyName
    } | Select-Object -First 1
    $iid = if ($pnp) { $pnp.InstanceId } else { $d.Path }
    $st = if ($pnp) { $pnp.Status } else { $d.HealthStatus }
    $out += "BELLEK|$st|$($d.FriendlyName)$volStr|$letStr  •  $size|$iid|$($lets -join ',')"
}

Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Where-Object {
    ($_.InstanceId -like 'USB\*' -or $_.Class -eq 'USB') -and $_.Class -ne 'DiskDrive'
} | ForEach-Object {
    $fn = $_.FriendlyName
    if (-not $fn) { $fn = $_.Name }
    $isHub = ($fn -match 'Root Hub|Host Controller|Generic USB Hub|Composite Device|Kök Hub|Ana Denetleyici|Bileşik Aygıt|USB Mass Storage Device|USB Yığın Depolama')
    $grp = if ($isHub) { 'HUB' } else { 'AYGIT' }
    $vid = if ($_.InstanceId -match 'VID_([0-9A-F]{4})&PID_([0-9A-F]{4})') { "VID:$($matches[1]) PID:$($matches[2])" } else { $_.Class }
    $out += "$grp|$($_.Status)|$fn|$vid|$($_.InstanceId)|"
}
$out -join "`n"
"#;

    let mut list = Vec::new();
    for line in ps(script).lines() {
        let p: Vec<&str> = line.trim().splitn(6, '|').collect();
        if p.len() == 6 {
            let grp = p[0].to_string();
            if grp == "HUB" && !show_hubs {
                continue;
            }
            list.push(UsbDisplayItem {
                group: grp,
                status: p[1].to_string(),
                title: p[2].to_string(),
                meta: p[3].to_string(),
                instance_id: p[4].to_string(),
                letters: p[5].to_string(),
            });
        }
    }
    list
}

// ── USB sistem ayarları (kayıt defteri / güç planı) ──

const USB_SUB: &str = "2a737441-1930-4402-8d77-b2bebba308a3";
const USB_SELECTIVE: &str = "48e6b7a6-50f5-4782-a5d4-53bb8f07e226";
const KEY_USBSTOR: &str = "HKLM\\SYSTEM\\CurrentControlSet\\Services\\USBSTOR";
const KEY_WPROTECT: &str = "HKLM\\SYSTEM\\CurrentControlSet\\Control\\StorageDevicePolicies";

fn reg_dword(key: &str, name: &str) -> Option<u32> {
    let o = Command::new("reg")
        .raw_arg(format!("query \"{}\" /v {}", key, name))
        .output()
        .ok()?;
    if !o.status.success() {
        return None;
    }
    let t = String::from_utf8_lossy(&o.stdout).to_string();
    for l in t.lines() {
        if let Some(pos) = l.find("0x") {
            return u32::from_str_radix(l[pos + 2..].trim(), 16).ok();
        }
    }
    None
}

fn reg_set_dword(key: &str, name: &str, val: u32) -> bool {
    Command::new("reg")
        .raw_arg(format!("add \"{}\" /v {} /t REG_DWORD /d {} /f", key, name, val))
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .map(|s| s.success())
        .unwrap_or(false)
}

fn selective_suspend() -> Option<(u32, u32)> {
    let o = Command::new("powercfg")
        .raw_arg(format!("/query SCHEME_CURRENT {} {}", USB_SUB, USB_SELECTIVE))
        .output()
        .ok()?;
    let t = String::from_utf8_lossy(&o.stdout).to_string();
    let v: Vec<u32> = t
        .lines()
        .filter_map(|l| {
            let p = l.find("0x")?;
            u32::from_str_radix(l[p + 2..].trim(), 16).ok()
        })
        .collect();
    if v.len() >= 2 {
        Some((v[v.len() - 2], v[v.len() - 1]))
    } else {
        None
    }
}

fn set_selective_suspend(on: bool) -> bool {
    let v = if on { 1 } else { 0 };
    let run = |args: String| {
        Command::new("powercfg")
            .raw_arg(args)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    };
    let a = run(format!("/setacvalueindex SCHEME_CURRENT {} {} {}", USB_SUB, USB_SELECTIVE, v));
    let d = run(format!("/setdcvalueindex SCHEME_CURRENT {} {} {}", USB_SUB, USB_SELECTIVE, v));
    let s = run("/setactive SCHEME_CURRENT".to_string());
    a && d && s
}

struct UsbPolicy {
    storage: Option<u32>,
    wprotect: Option<u32>,
    suspend: Option<(u32, u32)>,
}

fn usb_policy() -> UsbPolicy {
    UsbPolicy {
        storage: reg_dword(KEY_USBSTOR, "Start"),
        wprotect: reg_dword(KEY_WPROTECT, "WriteProtect"),
        suspend: selective_suspend(),
    }
}

fn reset_device(id: &str) -> bool {
    let ok = Command::new("pnputil")
        .raw_arg(format!("/restart-device \"{}\"", id))
        .output()
        .map(|o| {
            println!("  {}{}{}", cf(), String::from_utf8_lossy(&o.stdout).trim(), C_RESET);
            o.status.success()
        })
        .unwrap_or(false);
    if !ok {
        println!(
            "  {}Yedek yöntem (devre dışı bırak / etkinleştir) uygulanıyor...{}",
            cwn(), C_RESET
        );
        let q = ps_quote(id);
        let out = ps_report(
            &format!(
                "Disable-PnpDevice -InstanceId '{0}' -Confirm:$false -ErrorAction Stop; Start-Sleep -Seconds 2; \
                 Enable-PnpDevice -InstanceId '{0}' -Confirm:$false -ErrorAction Stop",
                q
            ),
            "Aygıt başarıyla sıfırlandı.",
        );
        return !out.starts_with("HATA");
    }
    true
}

fn usb_details(id: &str) -> String {
    let script = r#"
$id = '%ID%'
$d = Get-PnpDevice -InstanceId $id -ErrorAction SilentlyContinue
if (-not $d) { 'Aygıt bulunamadı.'; return }
'Ad              : ' + $d.FriendlyName
'Sınıf           : ' + $d.Class
'Durum           : ' + $d.Status
'Üretici         : ' + $d.Manufacturer
foreach ($k in 'DEVPKEY_Device_DriverVersion','DEVPKEY_Device_DriverDate','DEVPKEY_Device_LocationInfo','DEVPKEY_Device_Parent','DEVPKEY_Device_HardwareIds') {
  $p = Get-PnpDeviceProperty -InstanceId $id -KeyName $k -ErrorAction SilentlyContinue
  if ($p -and $p.Data) { ($k -replace 'DEVPKEY_Device_','').PadRight(16) + ': ' + (@($p.Data) -join ', ') }
}
"#;
    ps(&script.replace("%ID%", &ps_quote(id)))
}

fn usb_device_menu(d: &UsbDisplayItem) -> Nav {
    let is_storage = d.group == "BELLEK" && !d.letters.is_empty();
    loop {
        draw_header(&format!("USB AYGIT İŞLEMLERİ  ›  {}", d.title));
        draw_divider("SEÇİLİ AYGIT");
        println!("    {}{}{}", cw(), d.title, C_RESET);
        println!("    {}{}   Durum: {}{}", ci(), d.meta, d.status, C_RESET);
        println!("    {}Donanım kimliği: {}{}", cd(), d.instance_id, C_RESET);
        if d.group == "HUB" {
            println!(
                "    {}{} Hub/denetleyici işlemleri üzerindeki tüm portları kısa süre koparır.{}",
                cwn(), S_WARN, C_RESET
            );
        }
        println!();
        draw_divider("İŞLEMLER");
        opt_line("1", "Sıfırla (yeniden başlat)");
        opt_line("2", "Devre dışı bırak");
        opt_line("3", "Etkinleştir");
        opt_line("4", "Ayrıntılı bilgi (sürücü, üretici, konum, donanım kimlikleri)");
        if is_storage {
            opt_line("5", "Güvenli çıkar (sürücüyü sistemden ayır)");
            opt_line("6", "Sürücüyü Dosya Gezgini'nde aç");
        }
        opt_line("7", "Sistemden kaldır + yeniden tara (sert sıfırlama)");
        footer(true, false);

        let ch = match menu_key("Seçiminiz ›") {
            Mk::Home => return Nav::Home,
            Mk::Back => return Nav::Back,
            Mk::None => continue,
            Mk::Ch(c) => c,
        };
        let q = ps_quote(&d.instance_id);
        match ch {
            '0' => return Nav::Back,
            '1' => {
                if d.group == "HUB" && !confirm("Hub/denetleyici sıfırlansın mı? (e/h) ›") {
                    continue;
                }
                reset_device(&d.instance_id);
                pause();
            }
            '2' => {
                if confirm("Aygıt devre dışı bırakılsın mı? (e/h) ›") {
                    ps_report(
                        &format!("Disable-PnpDevice -InstanceId '{}' -Confirm:$false -ErrorAction Stop", q),
                        "Aygıt devre dışı bırakıldı.",
                    );
                    pause();
                }
            }
            '3' => {
                ps_report(
                    &format!("Enable-PnpDevice -InstanceId '{}' -Confirm:$false -ErrorAction Stop", q),
                    "Aygıt etkinleştirildi.",
                );
                pause();
            }
            '4' => {
                println!("  {}Bilgiler okunuyor...{}", cf(), C_RESET);
                for l in usb_details(&d.instance_id).lines().filter(|l| !l.trim().is_empty()) {
                    println!("  {}{}{}", cw(), l, C_RESET);
                }
                pause();
            }
            '5' if is_storage => {
                for l in d.letters.split(',').filter(|l| !l.is_empty()) {
                    let l = ps_quote(l);
                    let script = format!(
                        "$s = New-Object -ComObject Shell.Application; \
                         $s.Namespace(17).ParseName('{0}').InvokeVerb('Eject'); \
                         Start-Sleep -Seconds 2; \
                         if (Test-Path '{0}\\') {{ throw 'Sürücü hâlâ kullanımda (açık dosya olabilir).' }}",
                        l
                    );
                    ps_report(&script, &format!("{} güvenle çıkarıldı. Aygıtı fiziksel olarak çıkarabilirsiniz.", l));
                }
                pause();
            }
            '6' if is_storage => {
                for l in d.letters.split(',').filter(|l| !l.is_empty()) {
                    let _ = Command::new("explorer").arg(format!("{}\\", l)).spawn();
                }
            }
            '7' => {
                if confirm("Aygıt sistemden kaldırılıp yeniden taransın mı? (e/h) ›") {
                    netsh_free("pnputil", format!("/remove-device \"{}\"", d.instance_id));
                    netsh_free("pnputil", "/scan-devices".to_string());
                    pause();
                }
            }
            _ => {}
        }
    }
}

// Herhangi bir komutu çalıştırıp çıktısını yazdırır
fn netsh_free(prog: &str, args: String) {
    match Command::new(prog).raw_arg(args).output() {
        Ok(o) => {
            let out = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if !out.is_empty() {
                let col = if o.status.success() { cok() } else { cer() };
                println!("  {}{}{}", col, out, C_RESET);
            }
            let e = String::from_utf8_lossy(&o.stderr).trim().to_string();
            if !e.is_empty() {
                println!("  {}{}{}", cer(), e, C_RESET);
            }
        }
        Err(e) => println!("  {}{} {} çalıştırılamadı: {}{}", cer(), S_ERR, prog, e, C_RESET),
    }
}

// Takma / çıkarma olaylarını canlı izler
fn usb_monitor() {
    draw_header("USB CANLI İZLEME  ›  takma / çıkarma olayları");
    println!(
        "  {}Bir USB aygıtı takıp çıkarın. Çıkmak için herhangi bir tuşa basın.{}\n",
        cwn(), C_RESET
    );
    let stop = Arc::new(AtomicBool::new(false));
    let s2 = Arc::clone(&stop);
    thread::spawn(move || {
        let _ = raw_key();
        s2.store(true, Ordering::SeqCst);
    });
    let snap = |items: Vec<UsbDisplayItem>| -> Vec<(String, String)> {
        items.into_iter().map(|d| (d.instance_id, d.title)).collect()
    };
    let mut prev = snap(fetch_usb_items(true));
    println!("  {}[{}] Başlangıç: {} aygıt görünüyor.{}", cd(), clock(), prev.len(), C_RESET);
    while !stop.load(Ordering::SeqCst) {
        thread::sleep(Duration::from_millis(800));
        if stop.load(Ordering::SeqCst) {
            break;
        }
        let cur = snap(fetch_usb_items(true));
        for (id, title) in &cur {
            if !prev.iter().any(|(p, _)| p == id) {
                println!("  {}[{}] + TAKILDI   {}{}", cok(), clock(), title, C_RESET);
            }
        }
        for (id, title) in &prev {
            if !cur.iter().any(|(c, _)| c == id) {
                println!("  {}[{}] - ÇIKARILDI {}{}", cer(), clock(), title, C_RESET);
            }
        }
        prev = cur;
    }
}

const USB_HOT: &[char] = &['h', 'r', 'm', 'u', 'y', 'v', 'w'];

fn usb_menu() -> Nav {
    let mut show_hubs = false;
    let mut devs: Vec<UsbDisplayItem> = Vec::new();
    let mut pol = UsbPolicy { storage: None, wprotect: None, suspend: None };
    let mut refresh = true;
    loop {
        if refresh {
            draw_header("USB PANEL KONTROLÜ");
            println!("  {}USB veri yolları taranıyor...{}", cf(), C_RESET);
            devs = fetch_usb_items(show_hubs);
            pol = usb_policy();
            refresh = false;
        }
        draw_header("USB PANEL KONTROLÜ");

        if devs.is_empty() {
            println!(
                "  {}{} Gösterilecek USB bellek veya uç aygıt bulunamadı.{}\n",
                cwn(), S_WARN, C_RESET
            );
        } else {
            if devs.iter().any(|d| d.group == "BELLEK") {
                draw_divider("USB BELLEKLER & HARİCİ DİSKLER");
                for (i, d) in devs.iter().enumerate().filter(|(_, d)| d.group == "BELLEK") {
                    let st_col = if d.status == "OK" || d.status == "Healthy" { cok() } else { cwn() };
                    println!(
                        "    {}[{:>2}]{}  {}●{} {}{:<38}{}  {}[{}]{}",
                        cn(),
                        i + 1,
                        C_RESET,
                        st_col,
                        C_RESET,
                        cw(),
                        d.title,
                        C_RESET,
                        ci(),
                        d.meta,
                        C_RESET
                    );
                }
                println!();
            }
            if devs.iter().any(|d| d.group == "AYGIT") {
                draw_divider("BAĞLI USB AYGITLARI");
                for (i, d) in devs.iter().enumerate().filter(|(_, d)| d.group == "AYGIT") {
                    let st_col = if d.status == "OK" { cok() } else { cwn() };
                    println!(
                        "    {}[{:>2}]{}  {}●{} {}{:<38}{}  {}{}{}",
                        cn(),
                        i + 1,
                        C_RESET,
                        st_col,
                        C_RESET,
                        cw(),
                        d.title,
                        C_RESET,
                        cd(),
                        d.meta,
                        C_RESET
                    );
                }
                println!();
            }
            if show_hubs && devs.iter().any(|d| d.group == "HUB") {
                draw_divider("SİSTEM USB HUB & DENETLEYİCİLERİ");
                for (i, d) in devs.iter().enumerate().filter(|(_, d)| d.group == "HUB") {
                    println!(
                        "    {}[{:>2}]{}  {}{:<40}{}  {}{}{}",
                        cn(),
                        i + 1,
                        C_RESET,
                        cf(),
                        d.title,
                        C_RESET,
                        cd(),
                        d.meta,
                        C_RESET
                    );
                }
                println!();
            }
        }

        // Sistem düzeyi USB durumu
        draw_divider("USB SİSTEM DURUMU");
        let on = |b: bool, t: &str, f: &str| -> String {
            if b {
                format!("{}{}{}", cok(), t, C_RESET)
            } else {
                format!("{}{}{}", cwn(), f, C_RESET)
            }
        };
        println!(
            "    {}USB depolama erişimi :{} {}",
            cd(),
            C_RESET,
            match pol.storage {
                Some(4) => format!("{}ENGELLİ{}", cer(), C_RESET),
                Some(_) => on(true, "SERBEST", ""),
                None => format!("{}bilinmiyor{}", cd(), C_RESET),
            }
        );
        println!(
            "    {}Yazma koruması       :{} {}",
            cd(),
            C_RESET,
            match pol.wprotect {
                Some(1) => format!("{}AKTİF (salt okunur){}", cwn(), C_RESET),
                _ => on(true, "KAPALI", ""),
            }
        );
        println!(
            "    {}Güç tasarrufu (askıya alma):{} {}",
            cd(),
            C_RESET,
            match pol.suspend {
                Some((ac, dc)) => format!(
                    "{}  {}(prize takılı: {} / pil: {}){}",
                    if ac == 0 && dc == 0 {
                        format!("{}KAPALI (aygıtlar uyumaz){}", cok(), C_RESET)
                    } else {
                        format!("{}AÇIK (aygıtlar uyutulabilir){}", cwn(), C_RESET)
                    },
                    cd(),
                    if ac == 0 { "kapalı" } else { "açık" },
                    if dc == 0 { "kapalı" } else { "açık" },
                    C_RESET
                ),
                None => format!("{}bilinmiyor{}", cd(), C_RESET),
            }
        );
        println!();

        draw_divider("KONTROLLER");
        opt_line("No", "Aygıt numarasını yazıp Enter: sıfırla / devre dışı / çıkar / ayrıntı ...");
        opt_line(
            "h",
            if show_hubs {
                "Sistem hub ve denetleyicilerini gizle"
            } else {
                "Sistem hub ve denetleyicilerini göster"
            },
        );
        opt_line("r", "Listeyi yenile");
        opt_line("m", "Canlı izleme (takılma / çıkarma olaylarını anında göster)");
        opt_line("u", "USB güç tasarrufunu (selective suspend) aç / kapat");
        opt_line("y", "USB depolama erişimini engelle / serbest bırak");
        opt_line("v", "Yazma korumasını (salt okunur) aç / kapat");
        opt_line("w", "Tüm USB denetleyicilerini sıfırla (hepsini yeniden başlat)");
        footer(true, false);

        match read_input("Aygıt No veya komut ›", Some(USB_HOT)) {
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot(c) => {
                if global_key(c) {
                    continue;
                }
                match c {
                    'h' => {
                        show_hubs = !show_hubs;
                        refresh = true;
                    }
                    'r' => refresh = true,
                    'm' => usb_monitor(),
                    'u' => {
                        let currently_on = pol.suspend.map(|(a, d)| a != 0 || d != 0).unwrap_or(true);
                        if set_selective_suspend(!currently_on) {
                            flash_ok(if currently_on {
                                "USB güç tasarrufu KAPATILDI (aygıtlar uyutulmaz).".to_string()
                            } else {
                                "USB güç tasarrufu AÇILDI.".to_string()
                            });
                        } else {
                            flash_err("Güç ayarı değiştirilemedi (yönetici izni gerekli olabilir).".to_string());
                        }
                        pol = usb_policy();
                    }
                    'y' => {
                        let blocked = pol.storage == Some(4);
                        if reg_set_dword(KEY_USBSTOR, "Start", if blocked { 3 } else { 4 }) {
                            flash_ok(if blocked {
                                "USB depolama erişimi SERBEST bırakıldı (yeni takılan bellekler çalışır).".to_string()
                            } else {
                                "USB depolama ENGELLENDİ (yeni takılan bellekler tanınmaz).".to_string()
                            });
                        } else {
                            flash_err("Kayıt defteri yazılamadı (yönetici izni gerekli).".to_string());
                        }
                        pol = usb_policy();
                    }
                    'v' => {
                        let active = pol.wprotect == Some(1);
                        if reg_set_dword(KEY_WPROTECT, "WriteProtect", if active { 0 } else { 1 }) {
                            flash_ok(if active {
                                "Yazma koruması KAPATILDI (bellekleri yeniden takın).".to_string()
                            } else {
                                "Yazma koruması AÇILDI: belleklere yazılamaz (bellekleri yeniden takın).".to_string()
                            });
                        } else {
                            flash_err("Kayıt defteri yazılamadı (yönetici izni gerekli).".to_string());
                        }
                        pol = usb_policy();
                    }
                    'w' => {
                        println!(
                            "\n  {}{} Tüm USB denetleyicileri yeniden başlatılır: klavye/fare dahil bütün USB aygıtlar birkaç saniye kopar.{}",
                            cwn(), S_WARN, C_RESET
                        );
                        if confirm("Devam edilsin mi? (e/h) ›") {
                            let all = fetch_usb_items(true);
                            let mut n = 0;
                            for d in all.iter().filter(|d| d.group == "HUB") {
                                let t = d.title.to_lowercase();
                                if t.contains("host controller")
                                    || t.contains("denetleyici")
                                    || t.contains("root hub")
                                    || t.contains("kök")
                                {
                                    println!("  {}{} {}{}", ci(), S_ARROW, d.title, C_RESET);
                                    if reset_device(&d.instance_id) {
                                        n += 1;
                                    }
                                }
                            }
                            flash_ok(format!("{} USB denetleyici / kök hub yeniden başlatıldı.", n));
                            refresh = true;
                        }
                    }
                    _ => {}
                }
            }
            Input::Text(t) => {
                let n: usize = match t.parse() {
                    Ok(n) => n,
                    Err(_) => continue,
                };
                if n == 0 {
                    return Nav::Back;
                }
                if n > devs.len() {
                    continue;
                }
                let nav = usb_device_menu(&devs[n - 1]);
                refresh = true;
                if nav == Nav::Home {
                    return Nav::Home;
                }
            }
        }
    }
}

// ───────────────────────── 5) Ping (İstek 9) ─────────────────────────

fn parse_ms(s: &str) -> Option<f64> {
    s.chars()
        .filter(|c| c.is_ascii_digit() || *c == '.')
        .collect::<String>()
        .parse::<f64>()
        .ok()
}

// Tek IP'ye sürekli ping — her sonuç anlık yazılır; Esc ile durunca istatistik gösterir.
fn ping_stream(label: &str, ip: &str) -> Nav {
    draw_header(&format!("PING  ›  {}  ({})", label, ip));
    println!(
        "  {}Sürekli ping akışı — durdurmak için {}Esc{}{}.{}\n",
        cf(), cn(), C_RESET, cf(), C_RESET
    );
    let (mut sent, mut recv) = (0u32, 0u32);
    let (mut sum, mut min, mut max) = (0f64, f64::MAX, 0f64);
    'outer: loop {
        if esc_pressed() {
            break;
        }
        sent += 1;
        let (ok, ms) = ping_once(ip);
        if ok {
            recv += 1;
            if let Some(v) = parse_ms(&ms) {
                sum += v;
                if v < min {
                    min = v;
                }
                if v > max {
                    max = v;
                }
            }
            println!(
                "  {}{:>4}{}  {}yanıt var{}  {}{}{}  {}{}{}",
                cn(), sent, C_RESET, cok(), C_RESET, ci(), ms, C_RESET, cd(), ip, C_RESET
            );
        } else {
            println!(
                "  {}{:>4}{}  {}yanıt yok / zaman aşımı{}  {}{}{}",
                cn(), sent, C_RESET, cer(), C_RESET, cd(), ip, C_RESET
            );
        }
        let _ = io::stdout().flush();
        // ~1 sn aralık, Esc'i sık kontrol ederek.
        for _ in 0..12 {
            if esc_pressed() {
                break 'outer;
            }
            thread::sleep(Duration::from_millis(80));
        }
    }
    let lost = sent.saturating_sub(recv);
    let loss = if sent > 0 { lost as f64 * 100.0 / sent as f64 } else { 0.0 };
    let avg = if recv > 0 { sum / recv as f64 } else { 0.0 };
    println!();
    draw_divider("İSTATİSTİK");
    println!(
        "    {}Gönderilen:{} {}   {}Alınan:{} {}   {}Kayıp:{} {} ({:.0}%)",
        cd(), C_RESET, sent, cd(), C_RESET, recv, cd(), C_RESET, lost, loss
    );
    if recv > 0 {
        println!(
            "    {}En düşük:{} {:.0} ms   {}Ortalama:{} {:.0} ms   {}En yüksek:{} {:.0} ms",
            cd(), C_RESET, min, cd(), C_RESET, avg, cd(), C_RESET, max
        );
    }
    println!();
    pause();
    Nav::Back
}

fn ping_menu() -> Nav {
    loop {
        draw_header("PING  ›  Cihaz Erişilebilirlik Testi");
        let devs = all_devices();
        draw_divider("KAYITLI CİHAZLAR (statik liste + devices.json)");
        if devs.is_empty() {
            println!(
                "    {}Kayıtlı cihaz yok. STATIC_DEVICES dizisine ekleyin ya da MAC Doğrulama menüsünden cihaz girin.{}",
                cd(), C_RESET
            );
        } else {
            for (i, d) in devs.iter().enumerate() {
                println!(
                    "    {}[{}]{}  {}{:<22}{}  {}{}{}",
                    cn(), i + 1, C_RESET, cw(), d.name, C_RESET, ci(), d.ip, C_RESET
                );
            }
        }
        println!();
        draw_divider("İŞLEMLER");
        opt_line("1-N", "Seçili cihaza sürekli ping (anlık akış, Esc ile durdur)");
        opt_line("t", "Tüm cihazları bir kez pingle (anlık akış)");
        opt_line("m", "Elle IP gir ve sürekli pingle");
        footer(true, false);

        match read_input("Seçiminiz ›", Some(&['t', 'm'])) {
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot('t') => {
                draw_header("PING  ›  Tüm Cihazlar (tek tur)");
                if devs.is_empty() {
                    println!("  {}Kayıtlı cihaz yok.{}", cd(), C_RESET);
                } else {
                    for d in &devs {
                        let (ok, ms) = ping_once(&d.ip);
                        let badge = if ok {
                            format!("{}ERİŞİLEBİLİR{}  {}{}{}", cok(), C_RESET, ci(), ms, C_RESET)
                        } else {
                            format!("{}ERİŞİLEMİYOR{}", cer(), C_RESET)
                        };
                        println!(
                            "  {}{:<22}{}  {}{:<16}{}  {}",
                            cw(), d.name, C_RESET, cf(), d.ip, C_RESET, badge
                        );
                        let _ = io::stdout().flush();
                    }
                }
                println!();
                pause();
            }
            Input::Hot('m') => {
                let ip = match ask_text("IP adresi ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                if ip.parse::<Ipv4Addr>().is_ok() {
                    if ping_stream("Elle girilen", &ip) == Nav::Home {
                        return Nav::Home;
                    }
                } else {
                    flash_err("Geçersiz IPv4 adresi.".to_string());
                }
            }
            Input::Hot(_) => {}
            Input::Text(t) => {
                if let Ok(n) = t.parse::<usize>() {
                    if n == 0 {
                        return Nav::Back;
                    }
                    if n >= 1 && n <= devs.len() {
                        let d = &devs[n - 1];
                        if ping_stream(&d.name, &d.ip) == Nav::Home {
                            return Nav::Home;
                        }
                    }
                }
            }
        }
    }
}

// ───────────────────────── 6) MAC doğrulama (İstek 10) ─────────────────────────

fn mac_verify_all(devs: &[Device]) {
    draw_header("MAC DOĞRULAMA  ›  Tümünü Doğrula");
    println!(
        "  {}Her cihaz için ping + ARP yapılıp girilen MAC ile karşılaştırılıyor...{}\n",
        cf(), C_RESET
    );
    if devs.is_empty() {
        println!("  {}Kayıtlı cihaz yok.{}", cd(), C_RESET);
        println!();
        pause();
        return;
    }
    for d in devs {
        let (ok, _ms) = ping_once(&d.ip);
        print!("  {}{:<22}{}  {}{:<16}{}  ", cw(), d.name, C_RESET, cf(), d.ip, C_RESET);
        let _ = io::stdout().flush();
        if !ok {
            println!("{}ERİŞİLEMİYOR{}", cer(), C_RESET);
            let _ = io::stdout().flush();
            continue;
        }
        let expected = normalize_mac(&d.mac);
        match arp_lookup(&d.ip) {
            Some(found) if !expected.is_empty() && found == expected => {
                println!("{}UYUMLU{}  {}({}){}", cok(), C_RESET, cd(), found, C_RESET);
            }
            Some(found) if expected.is_empty() => {
                println!("{}ERİŞİLEBİLİR{}  {}(MAC: {}){}", cok(), C_RESET, cd(), found, C_RESET);
            }
            Some(found) => {
                println!(
                    "{}MAC FARKLI{}  {}beklenen {} / gelen {}{}",
                    cwn(), C_RESET, cd(), expected, found, C_RESET
                );
            }
            None => {
                println!("{}MAC OKUNAMADI{}  {}(ARP tablosunda yok){}", cwn(), C_RESET, cd(), C_RESET);
            }
        }
        let _ = io::stdout().flush();
    }
    println!();
    pause();
}

fn mac_menu() -> Nav {
    loop {
        draw_header("MAC DOĞRULAMA  ›  Cihaz Kayıtları (devices.json)");
        let devs = all_devices();
        let json_devs = load_devices_json();
        draw_divider("CİHAZLAR");
        if devs.is_empty() {
            println!("    {}Kayıtlı cihaz yok.{}", cd(), C_RESET);
        } else {
            for (i, d) in devs.iter().enumerate() {
                let src = if i < STATIC_DEVICES.len() { "(sabit)" } else { "(json)" };
                println!(
                    "    {}[{}]{}  {}{:<20}{}  {}{:<16}{}  {}{:<17}{} {}{}{}",
                    cn(), i + 1, C_RESET, cw(), d.name, C_RESET,
                    ci(), d.ip, C_RESET, cf(),
                    if d.mac.is_empty() { "MAC yok".to_string() } else { d.mac.clone() },
                    C_RESET, cd(), src, C_RESET
                );
            }
        }
        println!();
        draw_divider("İŞLEMLER");
        opt_line("d", "Tümünü doğrula (ping + ARP, anlık akış)");
        opt_line("e", "Yeni cihaz ekle (devices.json)");
        opt_line("s", "Cihaz sil (devices.json)");
        footer(true, false);

        match read_input("Seçiminiz ›", Some(&['d', 'e', 's'])) {
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot('d') => mac_verify_all(&devs),
            Input::Hot('e') => {
                let name = match ask_text("Cihaz adı ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                let ip = match ask_text("IP adresi ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                if ip.parse::<Ipv4Addr>().is_err() {
                    flash_err("Geçersiz IPv4 adresi.".to_string());
                    continue;
                }
                let mac = match ask_text("MAC adresi (örn 00-11-22-33-44-55; boş geçilebilir) ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                if !mac.trim().is_empty() && !is_mac_token(mac.trim()) {
                    flash_err("Geçersiz MAC biçimi (6 çift onaltılık bekleniyor).".to_string());
                    continue;
                }
                let mut v = json_devs.clone();
                v.push(Device {
                    name,
                    ip,
                    mac: if mac.trim().is_empty() { String::new() } else { normalize_mac(mac.trim()) },
                });
                save_devices_json(&v);
                flash_ok("Cihaz eklendi (devices.json).".to_string());
            }
            Input::Hot('s') => {
                if json_devs.is_empty() {
                    flash_warn("Silinebilecek devices.json kaydı yok (sabit liste silinemez).".to_string());
                    continue;
                }
                draw_header("MAC DOĞRULAMA  ›  Cihaz Sil");
                for (i, d) in json_devs.iter().enumerate() {
                    println!(
                        "    {}[{}]{}  {}{}{}  {}{}{}",
                        cn(), i + 1, C_RESET, cw(), d.name, C_RESET, ci(), d.ip, C_RESET
                    );
                }
                println!();
                let t = match ask_text("Silinecek numara (0 = iptal) ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                if let Ok(n) = t.parse::<usize>() {
                    if n >= 1 && n <= json_devs.len() {
                        let mut v = json_devs.clone();
                        let removed = v.remove(n - 1);
                        save_devices_json(&v);
                        flash_ok(format!("Silindi: {}", removed.name));
                    }
                }
            }
            Input::Hot(_) => {}
            Input::Text(_) => {}
        }
    }
}

// ───────────────────────── 7) Fare tıklayıcısı (İstek 16) ─────────────────────────

fn mouse_menu() -> Nav {
    loop {
        let s = settings_get();
        let interval = s.click_interval_ms;
        draw_header("FARE TIKLAYICISI  ›  Otomatik Sol Tık");
        draw_divider("AYARLAR");
        println!("    {}Tık aralığı :{} {}{} ms{}", cd(), C_RESET, cn(), interval, C_RESET);
        println!(
            "    {}Fareyi tıklatılacak konuma getirin; başladıktan sonra imleci oynatmayın.{}",
            cd(), C_RESET
        );
        println!();
        draw_divider("İŞLEMLER");
        opt_line("1", "Başlat (süresiz; Esc ile durdur)");
        opt_line("2", "Başlat (tık sayısı sınırlı)");
        opt_line("a", "Tık aralığını değiştir (ms)");
        opt_line("g", "Başlama gecikmesi ile başlat");
        footer(true, false);

        match read_input("Seçiminiz ›", Some(&['a', 'g'])) {
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot('a') => {
                let t = match ask_text("Yeni tık aralığı (ms, örn 5000) ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                match t.parse::<u64>() {
                    Ok(ms) if ms >= 50 => {
                        settings_update(|st| st.click_interval_ms = ms);
                        flash_ok(format!("Tık aralığı: {} ms", ms));
                    }
                    _ => flash_err("Geçersiz süre (en az 50 ms).".to_string()),
                }
            }
            Input::Hot('g') => {
                let t = match ask_text("Başlama gecikmesi (saniye) ›") {
                    Ok(v) => v,
                    Err(Nav::Home) => return Nav::Home,
                    Err(Nav::Back) => continue,
                };
                let delay = t.parse::<u64>().unwrap_or(0);
                run_clicker(interval, 0, delay);
            }
            Input::Hot(_) => {}
            Input::Text(t) => match t.as_str() {
                "0" => return Nav::Back,
                "1" => run_clicker(interval, 0, 0),
                "2" => {
                    let c = match ask_text("Kaç tık yapılsın? ›") {
                        Ok(v) => v,
                        Err(Nav::Home) => return Nav::Home,
                        Err(Nav::Back) => continue,
                    };
                    let limit = c.parse::<u64>().unwrap_or(0);
                    if limit == 0 {
                        flash_err("Geçersiz sayı.".to_string());
                    } else {
                        run_clicker(interval, limit, 0);
                    }
                }
                _ => {}
            },
        }
    }
}

// limit=0 → süresiz. delay_s → başlamadan önce geri sayım. Esc ile her an durur.
fn run_clicker(interval_ms: u64, limit: u64, delay_s: u64) {
    draw_header("FARE TIKLAYICISI  ›  Çalışıyor");
    for r in (1..=delay_s).rev() {
        if esc_pressed() {
            return;
        }
        println!("  {}Başlıyor... {} sn   (Esc = iptal){}", cwn(), r, C_RESET);
        let _ = io::stdout().flush();
        thread::sleep(Duration::from_secs(1));
    }
    println!(
        "  {}Tıklama başladı. Aralık {} ms. Durdurmak için {}Esc{}{}.{}\n",
        cf(), interval_ms, cn(), C_RESET, cf(), C_RESET
    );
    let mut count = 0u64;
    'outer: loop {
        if esc_pressed() {
            break;
        }
        send_left_click();
        count += 1;
        print!("\r  {}Tık sayısı: {}{}{}   ", cd(), cn(), count, C_RESET);
        let _ = io::stdout().flush();
        if limit > 0 && count >= limit {
            break;
        }
        let mut waited = 0u64;
        while waited < interval_ms {
            if esc_pressed() {
                break 'outer;
            }
            let step = interval_ms.min(80).max(20).min(interval_ms - waited).max(1);
            thread::sleep(Duration::from_millis(step));
            waited += step;
        }
    }
    println!(
        "\n\n  {}{} Durduruldu. Toplam {} tık.{}",
        cok(), S_OK, count, C_RESET
    );
    println!();
    pause();
}

// ───────────────────────── 8) Güvenlik duvarı (İstek 17) ─────────────────────────

fn firewall_state() -> String {
    ps("(Get-NetFirewallProfile | Select-Object -ExpandProperty Enabled) -join ', '")
        .trim()
        .to_string()
}

fn firewall_menu() -> Nav {
    loop {
        draw_header("GÜVENLİK DUVARI  ›  Windows Defender Firewall");
        draw_divider("DURUM");
        println!(
            "    {}Profiller (Domain, Private, Public):{} {}{}{}",
            cd(), C_RESET, cw(), firewall_state(), C_RESET
        );
        println!();
        draw_divider("İŞLEMLER");
        opt_line_badge("1", "Tüm profilleri AÇ (güvenlik duvarını etkinleştir)", &admin_badge());
        opt_line_badge("2", "Tüm profilleri KAPAT (güvenlik duvarını devre dışı bırak)", &admin_badge());
        opt_line_badge("3", "Çalışan bir uygulamayı beyaz listeye ekle (gelen + giden)", &admin_badge());
        footer(true, false);

        let ch = match menu_key("Seçiminiz ›") {
            Mk::Home => return Nav::Home,
            Mk::Back => return Nav::Back,
            Mk::None => continue,
            Mk::Ch(c) => c,
        };
        match ch {
            '0' => return Nav::Back,
            '1' => {
                netsh("advfirewall set allprofiles state on".to_string());
                flash_ok("Tüm güvenlik duvarı profilleri açıldı.".to_string());
                pause();
            }
            '2' => {
                netsh("advfirewall set allprofiles state off".to_string());
                flash_warn("Tüm güvenlik duvarı profilleri kapatıldı.".to_string());
                pause();
            }
            '3' => {
                if firewall_whitelist_menu() == Nav::Home {
                    return Nav::Home;
                }
            }
            _ => {}
        }
    }
}

fn firewall_whitelist_menu() -> Nav {
    draw_header("GÜVENLİK DUVARI  ›  Çalışan Uygulamalar");
    println!("  {}Çalışan uygulamalar taranıyor...{}", cf(), C_RESET);
    let raw = ps(
        "Get-Process | Where-Object { $_.Path } | Select-Object -ExpandProperty Path -Unique | Sort-Object",
    );
    let apps: Vec<String> = raw
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| l.to_lowercase().ends_with(".exe"))
        .collect();
    loop {
        draw_header("GÜVENLİK DUVARI  ›  Beyaz Listeye Ekle");
        draw_divider("ÇALIŞAN UYGULAMALAR");
        if apps.is_empty() {
            println!("    {}Uygulama listesi alınamadı.{}", cd(), C_RESET);
        } else {
            for (i, p) in apps.iter().enumerate() {
                let name = p.rsplit('\\').next().unwrap_or(p);
                println!(
                    "    {}[{}]{}  {}{:<26}{}  {}{}{}",
                    cn(), i + 1, C_RESET, cw(), name, C_RESET, cd(), p, C_RESET
                );
            }
        }
        println!();
        footer(true, false);
        let t = match read_input("Eklenecek numara (0 = geri) ›", Some(NO_HOT)) {
            Input::Text(t) => t,
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot(_) => continue,
        };
        if let Ok(n) = t.parse::<usize>() {
            if n == 0 {
                return Nav::Back;
            }
            if n >= 1 && n <= apps.len() {
                let path = &apps[n - 1];
                let name = path.rsplit('\\').next().unwrap_or(path);
                netsh(format!(
                    "advfirewall firewall add rule name=\"Keysight-{} (Gelen)\" dir=in action=allow program=\"{}\" enable=yes",
                    name, path
                ));
                netsh(format!(
                    "advfirewall firewall add rule name=\"Keysight-{} (Giden)\" dir=out action=allow program=\"{}\" enable=yes",
                    name, path
                ));
                flash_ok(format!("{} gelen+giden kurallarla beyaz listeye eklendi.", name));
                pause();
            }
        }
    }
}

// ───────────────────────── 9) Tema (İstek 19) ─────────────────────────

fn theme_menu() -> Nav {
    loop {
        draw_header("TEMA  ›  Renk Paleti Seçimi");
        let cur = THEME_IDX.load(Ordering::Relaxed);
        draw_divider("TEMALAR (seçince anında uygulanır, kalıcıdır)");
        for (i, t) in THEMES.iter().enumerate() {
            let mark = if i == cur {
                format!("{}●{}", cok(), C_RESET)
            } else {
                " ".to_string()
            };
            println!(
                "    {} {}[{}]{}  {}{}{}{}{}  {}örnek metin{}",
                mark, cn(), i + 1, C_RESET, t.ice, C_BOLD, t.name, C_RESET,
                "   ", t.frost, C_RESET
            );
        }
        println!();
        footer(true, false);
        let t = match read_input("Tema numarası (0 = geri) ›", Some(NO_HOT)) {
            Input::Text(t) => t,
            Input::Home => return Nav::Home,
            Input::Back => return Nav::Back,
            Input::Hot(_) => continue,
        };
        if let Ok(n) = t.parse::<usize>() {
            if n == 0 {
                return Nav::Back;
            }
            if n >= 1 && n <= THEMES.len() {
                let mut s = settings_get();
                s.theme = n - 1;
                settings_save(&s);
                flash_ok(format!("Tema: {}", THEMES[n - 1].name));
            }
        }
    }
}

// ───────────────────────── Ana menü ─────────────────────────

fn main_menu() {
    let admin = is_admin();
    let badge = admin_badge(); // İstek 14: yönetici değilse [YÖNETİCİ] rozeti.
    loop {
        draw_header("KEYSIGHT TECH  •  ETHERNET  •  USB  •  AĞ ARAÇLARI");
        if !admin {
            println!(
                "  {}{} Yönetici değilsiniz: [YÖNETİCİ] etiketli işlemler yetki gerektirir (program çökmez, net hata verir).{}\n",
                cwn(), S_WARN, C_RESET
            );
        }
        draw_divider("ANA MENÜ");
        opt_line("1", "Keysight Cihaz Ayarlama  (SCPI sunucu: başlat / izle / model / IP / port / test / terminal)");
        opt_line_badge("2", "Ethernet IP Ayarı        (statik / çoklu IP / DHCP / DNS / MTU / ping)", &badge);
        opt_line_badge("3", "Ethernet Hız Ayarı       (adaptörün desteklediği tüm hız & duplex seçenekleri)", &badge);
        opt_line_badge("4", "USB Panel Kontrolü       (sıfırla / güvenli çıkar / izle / güç & yazma koruması)", &badge);
        opt_line("5", "Ping                     (cihazlara anlık/sürekli ping, istatistik)");
        opt_line("6", "MAC Doğrulama            (ping + ARP ile MAC karşılaştırma, devices.json)");
        opt_line("7", "Fare Tıklayıcısı         (otomatik sol tık, ayarlanabilir aralık)");
        opt_line_badge("8", "Güvenlik Duvarı          (profilleri aç/kapat, uygulama beyaz listesi)", &badge);
        opt_line("9", "Tema                     (10 renk paleti, anında uygulanır)");
        footer(false, true);

        match menu_key_srv("Seçiminiz ›") {
            Mk::Ch('1') => {
                devices_menu();
            }
            Mk::Ch('2') => {
                ip_menu();
            }
            Mk::Ch('3') => {
                speed_menu();
            }
            Mk::Ch('4') => {
                usb_menu();
            }
            Mk::Ch('5') => {
                ping_menu();
            }
            Mk::Ch('6') => {
                mac_menu();
            }
            Mk::Ch('7') => {
                mouse_menu();
            }
            Mk::Ch('8') => {
                firewall_menu();
            }
            Mk::Ch('9') => {
                theme_menu();
            }
            Mk::Ch('0') => return,
            _ => {}
        }
    }
}

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() >= 3 && args[1] == "--serve" {
        if let Some(k) = Kind::from_id(&args[2]) {
            let ip = args.get(3).cloned().unwrap_or_else(|| get_configured_ip(k));
            let port = args
                .get(4)
                .and_then(|p| p.parse().ok())
                .unwrap_or_else(|| get_configured_port(k));
            run_server(k, &ip, port);
        }
        return;
    }
    // İstek 14: yönetici zorunluluğu kaldırıldı — otomatik relaunch yok.
    // Yönetici gerektiren işlemler menüde [YÖNETİCİ] rozetiyle işaretlenir.
    let _ = settings_get(); // İstek 19/20: kalıcı ayarları (tema, font vb.) yükle.
    let _ = prepare_daemon_exe();
    setup_console(); // İstek 1: çözünürlük/DPI'ya göre font + pencere ortalama.
    start_sleep_guard(); // İstek 18: sessiz uyku engelleyici (arka plan thread).
    start_watchdog(); // İstek 4: sunucu sağlık izleyici (3 sn, otomatik restart).
    main_menu();
}