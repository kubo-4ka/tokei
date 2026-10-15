'use strict';
/*
 * シンプル時計
 * 設定はすべて localStorage（tokei.settings）に保存する。
 * 時刻は Intl.DateTimeFormat で地域ごとの年月日・時分秒を取り出し、表示の形は自前で組み立てる。
 */
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const pad = (n) => String(n).padStart(2, '0');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const KEY = 'tokei.settings';
  const SEEN = 'tokei.seenHint';

  /* ================= data ================= */
  // [IANA名, 日本語, English, 地域]
  const ZONES = [
    ['Asia/Tokyo', '東京', 'Tokyo', 'アジア'],
    ['Asia/Seoul', 'ソウル', 'Seoul', 'アジア'],
    ['Asia/Shanghai', '北京・上海', 'Beijing', 'アジア'],
    ['Asia/Hong_Kong', '香港', 'Hong Kong', 'アジア'],
    ['Asia/Taipei', '台北', 'Taipei', 'アジア'],
    ['Asia/Manila', 'マニラ', 'Manila', 'アジア'],
    ['Asia/Singapore', 'シンガポール', 'Singapore', 'アジア'],
    ['Asia/Kuala_Lumpur', 'クアラルンプール', 'Kuala Lumpur', 'アジア'],
    ['Asia/Bangkok', 'バンコク', 'Bangkok', 'アジア'],
    ['Asia/Ho_Chi_Minh', 'ホーチミン', 'Ho Chi Minh City', 'アジア'],
    ['Asia/Jakarta', 'ジャカルタ', 'Jakarta', 'アジア'],
    ['Asia/Kolkata', 'ニューデリー・ムンバイ', 'New Delhi', 'アジア'],
    ['Asia/Kathmandu', 'カトマンズ', 'Kathmandu', 'アジア'],
    ['Asia/Dubai', 'ドバイ', 'Dubai', 'アジア'],
    ['Europe/London', 'ロンドン', 'London', 'ヨーロッパ・アフリカ'],
    ['Europe/Paris', 'パリ', 'Paris', 'ヨーロッパ・アフリカ'],
    ['Europe/Berlin', 'ベルリン', 'Berlin', 'ヨーロッパ・アフリカ'],
    ['Europe/Rome', 'ローマ', 'Rome', 'ヨーロッパ・アフリカ'],
    ['Europe/Madrid', 'マドリード', 'Madrid', 'ヨーロッパ・アフリカ'],
    ['Europe/Amsterdam', 'アムステルダム', 'Amsterdam', 'ヨーロッパ・アフリカ'],
    ['Europe/Stockholm', 'ストックホルム', 'Stockholm', 'ヨーロッパ・アフリカ'],
    ['Europe/Helsinki', 'ヘルシンキ', 'Helsinki', 'ヨーロッパ・アフリカ'],
    ['Europe/Athens', 'アテネ', 'Athens', 'ヨーロッパ・アフリカ'],
    ['Europe/Istanbul', 'イスタンブール', 'Istanbul', 'ヨーロッパ・アフリカ'],
    ['Europe/Moscow', 'モスクワ', 'Moscow', 'ヨーロッパ・アフリカ'],
    ['Africa/Cairo', 'カイロ', 'Cairo', 'ヨーロッパ・アフリカ'],
    ['Africa/Nairobi', 'ナイロビ', 'Nairobi', 'ヨーロッパ・アフリカ'],
    ['Africa/Johannesburg', 'ヨハネスブルグ', 'Johannesburg', 'ヨーロッパ・アフリカ'],
    ['America/New_York', 'ニューヨーク', 'New York', '北アメリカ'],
    ['America/Toronto', 'トロント', 'Toronto', '北アメリカ'],
    ['America/Chicago', 'シカゴ', 'Chicago', '北アメリカ'],
    ['America/Denver', 'デンバー', 'Denver', '北アメリカ'],
    ['America/Phoenix', 'フェニックス', 'Phoenix', '北アメリカ'],
    ['America/Los_Angeles', 'ロサンゼルス', 'Los Angeles', '北アメリカ'],
    ['America/Vancouver', 'バンクーバー', 'Vancouver', '北アメリカ'],
    ['America/Anchorage', 'アンカレッジ', 'Anchorage', '北アメリカ'],
    ['Pacific/Honolulu', 'ホノルル', 'Honolulu', '北アメリカ'],
    ['America/Mexico_City', 'メキシコシティ', 'Mexico City', '北アメリカ'],
    ['America/Sao_Paulo', 'サンパウロ', 'São Paulo', '南アメリカ'],
    ['America/Argentina/Buenos_Aires', 'ブエノスアイレス', 'Buenos Aires', '南アメリカ'],
    ['America/Lima', 'リマ', 'Lima', '南アメリカ'],
    ['Australia/Sydney', 'シドニー', 'Sydney', 'オセアニア'],
    ['Australia/Melbourne', 'メルボルン', 'Melbourne', 'オセアニア'],
    ['Australia/Brisbane', 'ブリスベン', 'Brisbane', 'オセアニア'],
    ['Australia/Perth', 'パース', 'Perth', 'オセアニア'],
    ['Pacific/Auckland', 'オークランド', 'Auckland', 'オセアニア'],
    ['Pacific/Guam', 'グアム', 'Guam', 'オセアニア'],
    ['UTC', '協定世界時（UTC）', 'UTC', 'その他']
  ];
  const ZONE_BY_ID = Object.fromEntries(ZONES.map((z) => [z[0], z]));
  const REGIONS = ['アジア', 'ヨーロッパ・アフリカ', '北アメリカ', '南アメリカ', 'オセアニア', 'その他'];

  // 色のプリセット（色だけを変える）
  const PRESETS = [
    { id: 'night', name: 'ナイト', bgMode: 'solid', bg1: '#0b0b10', bg2: '#0b0b10', fg: '#f4f1ea', sub: '#8f89a6', glow: false },
    { id: 'paper', name: 'ペーパー', bgMode: 'solid', bg1: '#f4f1ea', bg2: '#f4f1ea', fg: '#1d1b18', sub: '#7a746a', glow: false },
    { id: 'scarlet', name: 'スカーレット', bgMode: 'gradient', bg1: '#9c0019', bg2: '#d8252f', fg: '#ffffff', sub: '#ffd0cf', glow: false },
    { id: 'violet', name: 'バイオレット', bgMode: 'gradient', bg1: '#3f0b86', bg2: '#7a2fd0', fg: '#ffffff', sub: '#ddd0ff', glow: false },
    { id: 'terminal', name: 'ターミナル', bgMode: 'solid', bg1: '#020803', bg2: '#020803', fg: '#39ff7a', sub: '#1fa64a', glow: true },
    { id: 'amber', name: 'アンバー', bgMode: 'solid', bg1: '#110900', bg2: '#110900', fg: '#ffb000', sub: '#a66f00', glow: true },
    { id: 'ocean', name: 'オーシャン', bgMode: 'gradient', bg1: '#06223f', bg2: '#0f6a80', fg: '#e8f7ff', sub: '#8fd3e6', glow: false },
    { id: 'sakura', name: 'さくら', bgMode: 'gradient', bg1: '#fff1f4', bg2: '#fbd3df', fg: '#8a2846', sub: '#c4688a', glow: false },
    { id: 'star', name: 'スター', bgMode: 'solid', bg1: '#17130a', bg2: '#17130a', fg: '#ffe066', sub: '#b39a4a', glow: false }
  ];

  // q は Google Fonts の family 指定。jp があるものは日本語も同じ書体で出る
  const FONTS = [
    { id: 'inter', name: 'すっきり', css: '"Inter", "Zen Kaku Gothic New"', q: 'Inter:wght@300;500;800' },
    { id: 'rounded', name: 'まるい', css: '"M PLUS Rounded 1c"', q: 'M+PLUS+Rounded+1c:wght@300;500;800' },
    { id: 'gothic', name: 'ゴシック', css: '"Zen Kaku Gothic New"', q: 'Zen+Kaku+Gothic+New:wght@300;500;900' },
    { id: 'mincho', name: '明朝', css: '"Shippori Mincho"', q: 'Shippori+Mincho:wght@400;500;800' },
    { id: 'mono', name: '等幅', css: '"JetBrains Mono", "Zen Kaku Gothic New"', q: 'JetBrains+Mono:wght@300;500;800' },
    { id: 'digital', name: 'デジタル', css: '"Orbitron", "Zen Kaku Gothic New"', q: 'Orbitron:wght@400;500;800' },
    { id: 'dot', name: 'ドット', css: '"DotGothic16"', q: 'DotGothic16' },
    { id: 'serif', name: 'クラシック', css: '"Playfair Display", "Shippori Mincho"', q: 'Playfair+Display:wght@400;500;800' },
    { id: 'system', name: '端末の標準', css: 'system-ui, -apple-system, "Segoe UI"', q: '' }
  ];
  const FONT_BY_ID = Object.fromEntries(FONTS.map((f) => [f.id, f]));

  const WD_JA = ['日', '月', '火', '水', '木', '金', '土'];
  const WD_EN_S = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const WD_EN_L = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON_EN_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MON_EN_L = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const KAN = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  const DEFAULTS = {
    lang: 'ja',
    tz: 'local',
    showCity: false,
    showOffset: false,
    zones: [],
    hour12: false,
    ampm: true,
    padHour: true,
    timeStyle: 'colon',
    blink: false,
    seconds: true,
    ms: 0,
    smallSec: true,
    date: true,
    dateFmt: 'long',
    weekday: 'short',
    kansuji: false,
    weekendColor: true,
    datePos: 'above',
    dateSize: 16,
    preset: 'night',
    bgMode: 'solid',
    bg1: '#0b0b10',
    bg2: '#0b0b10',
    bgAngle: 160,
    fg: '#f4f1ea',
    sub: '#8f89a6',
    glow: false,
    font: 'inter',
    weight: 500,
    size: 80,
    vpos: 'center',
    hpos: 'center',
    wake: true,
    shift: true,
    brightness: 100,
    night: false,
    nightFrom: 22,
    nightTo: 6,
    nightBright: 30
  };

  /* ================= settings ================= */
  const LOCAL_TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } })();
  const validTZ = (tz) => { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; } };
  const tzOf = (z) => (z === 'local' ? LOCAL_TZ : z);

  function sanitize(o) {
    const s = { ...DEFAULTS };
    for (const k of Object.keys(DEFAULTS)) if (o && k in o && typeof o[k] === typeof DEFAULTS[k]) s[k] = o[k];
    if (!Array.isArray(o && o.zones)) s.zones = [];
    else s.zones = o.zones.filter((z) => typeof z === 'string' && validTZ(z)).slice(0, 4);
    if (s.tz !== 'local' && !validTZ(s.tz)) s.tz = 'local';
    if (!FONT_BY_ID[s.font]) s.font = 'inter';
    return s;
  }
  function load() {
    try { return sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { return sanitize(null); }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
  let S = load();

  /* ================= time parts ================= */
  const fmtCache = new Map();
  function partsIn(tz, date) {
    let f = fmtCache.get(tz);
    if (!f) {
      f = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, hourCycle: 'h23', weekday: 'short',
        year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric'
      });
      fmtCache.set(tz, f);
    }
    const o = {};
    for (const p of f.formatToParts(date)) o[p.type] = p.value;
    return { y: +o.year, mo: +o.month, d: +o.day, h: +o.hour % 24, mi: +o.minute, s: +o.second, wd: WD_EN_S.indexOf(o.weekday), ms: date.getMilliseconds() };
  }
  function offsetMin(tz, date) {
    const p = partsIn(tz, date);
    return Math.round((Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi, p.s) - Math.floor(date.getTime() / 1000) * 1000) / 60000);
  }
  function offsetLabel(min) {
    const a = Math.abs(min);
    return 'UTC' + (min < 0 ? '−' : '+') + Math.floor(a / 60) + (a % 60 ? ':' + pad(a % 60) : '');
  }
  function zoneName(z, lang = S.lang) {
    const id = tzOf(z);
    const hit = ZONE_BY_ID[id];
    if (hit) return lang === 'ja' ? hit[1] : hit[2];
    return id.split('/').pop().replace(/_/g, ' ');
  }

  /* ================= formatting ================= */
  function kanNum(n) { // 1〜99 を 十五 のように
    if (n < 10) return KAN[n];
    const t = Math.floor(n / 10), o = n % 10;
    return (t > 1 ? KAN[t] : '') + '十' + (o ? KAN[o] : '');
  }
  function eraOf(p) {
    const reiwa = p.y > 2019 || (p.y === 2019 && p.mo >= 5);
    const n = reiwa ? p.y - 2018 : p.y - 1988;
    const num = n === 1 ? '元' : (S.kansuji ? kanNum(n) : n);
    return (reiwa ? '令和' : '平成') + num + '年';
  }

  function dateHTML(p, s = S) {
    const ja = s.lang === 'ja';
    const k = ja && s.kansuji;
    const num = (n) => (k ? kanNum(n) : n);
    let body;
    switch (s.dateFmt) {
      case 'short':
        body = ja ? `${num(p.mo)}月${num(p.d)}日` : `${MON_EN_S[p.mo - 1]} ${p.d}`; break;
      case 'slash':
        body = `${p.y}/${pad(p.mo)}/${pad(p.d)}`; break;
      case 'iso':
        body = `${p.y}-${pad(p.mo)}-${pad(p.d)}`; break;
      case 'era':
        if (ja) { body = `${eraOf(p)}${num(p.mo)}月${num(p.d)}日`; break; }
        // falls through: 英語では和暦がないので年月日にする
      default:
        body = ja ? `${k ? String(p.y).split('').map((c) => KAN[c]).join('') : p.y}年${num(p.mo)}月${num(p.d)}日` : `${MON_EN_L[p.mo - 1]} ${p.d}, ${p.y}`;
    }
    if (s.weekday === 'off') return body;
    const wdTxt = ja ? WD_JA[p.wd] + (s.weekday === 'long' ? '曜日' : '') : (s.weekday === 'long' ? WD_EN_L : WD_EN_S)[p.wd];
    const cls = s.weekendColor ? (p.wd === 0 ? ' sun' : p.wd === 6 ? ' sat' : '') : '';
    const wd = `<span class="wd${cls}">${wdTxt}</span>`;
    if (ja) return s.weekday === 'short' ? `${body}（${wd}）` : `${body} ${wd}`;
    return s.dateFmt === 'slash' || s.dateFmt === 'iso' ? `${body} ${wd}` : `${wd}, ${body}`;
  }

  // 12時間表示：日本語は「午後0時」、英語は「12 PM」
  const to12 = (h, ja) => (ja ? h % 12 : h % 12 || 12);

  // zero=true のときは数字をすべて 0 にした「型」を返す（大きさ合わせ用）
  function timeHTML(p, zero = false) {
    const ja = S.lang === 'ja';
    const z = zero ? (t) => t.replace(/\d/g, '0') : (t) => t;
    let h = p.h, ap = '';
    if (S.hour12) {
      if (S.ampm) ap = ja ? (h < 12 ? '午前' : '午後') : (h < 12 ? 'AM' : 'PM');
      h = to12(h, ja);
    }
    const hh = z(S.padHour ? pad(h) : String(h));
    const mm = z(pad(p.mi));
    const ss = z(pad(p.s));
    const ms = S.seconds && S.ms ? '<span class="msep">.</span>' + z(String(p.ms).padStart(3, '0').slice(0, S.ms)) : '';
    let main, secs = '';
    if (S.timeStyle === 'kanji') {
      const U = ja ? ['時', '分', '秒'] : ['h', 'm', 's'];
      const u = (t) => `<span class="u">${t}</span>`;
      main = hh + u(U[0]) + mm + u(U[1]);
      if (S.seconds) secs = ss + ms + u(U[2]);
    } else {
      const sep = `<span class="sep">${S.timeStyle === 'dot' ? '.' : ':'}</span>`;
      main = hh + sep + mm;
      if (S.seconds) secs = sep + ss + ms;
    }
    if (secs && S.smallSec) secs = `<span class="small">${secs}</span>`;
    const apH = ap ? `<span class="ap ${ja ? 'pre' : 'post'}">${ap}</span>` : '';
    return ja ? apH + main + secs : main + secs + apH;
  }

  function shortTime(p) {
    let h = p.h, ap = '';
    const ja = S.lang === 'ja';
    if (S.hour12) { ap = ja ? (h < 12 ? '午前' : '午後') : (h < 12 ? 'AM' : 'PM'); h = to12(h, ja); }
    const t = (S.padHour ? pad(h) : h) + (S.timeStyle === 'dot' ? '.' : ':') + pad(p.mi);
    return ja ? ap + t : t + (ap ? ' ' + ap : '');
  }

  /* ================= elements ================= */
  const root = document.documentElement;
  const stage = $('#stage'), clock = $('#clock'), elTime = $('#time'), elDate = $('#date'), elCity = $('#city'), elZones = $('#zones');
  const meas = $('#measure'), dimEl = $('#dim'), panel = $('#panel'), body = $('#panelBody');
  const fontLink = $('#clockFont');
  const metaTheme = document.querySelector('meta[name="theme-color"]');

  /* ================= apply ================= */
  let lastTime = '', lastTmpl = '', lastDate = '', lastSecKey = -1, needFit = true;

  function applyAll() {
    const r = root.style;
    r.setProperty('--bg1', S.bg1);
    r.setProperty('--bg2', S.bgMode === 'gradient' ? S.bg2 : S.bg1);
    r.setProperty('--bg-angle', S.bgAngle + 'deg');
    r.setProperty('--fg', S.fg);
    r.setProperty('--sub', S.sub);
    const f = FONT_BY_ID[S.font];
    r.setProperty('--clock-font', f.css + ', "Zen Kaku Gothic New", system-ui, sans-serif');
    r.setProperty('--clock-weight', S.weight);
    if (metaTheme) metaTheme.content = S.bg1;
    loadClockFont();

    stage.className = `stage v-${S.vpos} h-${S.hpos}`;
    clock.classList.toggle('glow', S.glow);
    clock.classList.toggle('date-below', S.datePos === 'below');
    elDate.hidden = !S.date;
    elCity.hidden = !(S.showCity || S.showOffset);
    elZones.hidden = !S.zones.length;
    root.lang = S.lang === 'ja' ? 'ja' : 'en';
    if (!S.shift) clock.style.transform = '';

    lastTime = lastTmpl = lastDate = '';
    lastSecKey = -1;
    tick();
    fit();
    schedule();
    updateWake();
  }

  let fontHref = '';
  function loadClockFont() {
    const f = FONT_BY_ID[S.font];
    const href = f.q ? `https://fonts.googleapis.com/css2?family=${f.q}&display=swap` : '';
    if (href === fontHref) return;
    fontHref = href;
    if (href) fontLink.href = href; else fontLink.removeAttribute('href');
    const fam = f.css.split(',')[0];
    if (document.fonts && document.fonts.load) {
      Promise.all([400, S.weight].map((w) => document.fonts.load(`${w} 100px ${fam}`, '0123456789:年月日'))).catch(() => {}).then(() => setTimeout(fit, 50));
    }
  }

  /* ================= tick ================= */
  function tick() {
    const now = new Date();
    const p = partsIn(tzOf(S.tz), now);
    const th = timeHTML(p);
    if (th !== lastTime) { elTime.innerHTML = th; lastTime = th; }
    const tmpl = timeHTML(p, true);
    if (tmpl !== lastTmpl) { lastTmpl = tmpl; needFit = true; }
    elTime.classList.toggle('blink-off', S.blink && S.timeStyle !== 'kanji' && p.s % 2 === 1);

    const secKey = Math.floor(now.getTime() / 1000);
    if (secKey !== lastSecKey) {
      lastSecKey = secKey;
      if (S.date) {
        const dh = dateHTML(p);
        if (dh !== lastDate) { elDate.innerHTML = dh; lastDate = dh; needFit = true; }
      }
      if (S.showCity || S.showOffset) {
        const parts = [];
        if (S.showCity) parts.push(esc(zoneName(S.tz)));
        if (S.showOffset) parts.push(`<span class="off">${offsetLabel(offsetMin(tzOf(S.tz), now))}</span>`);
        const ch = parts.join('');
        if (elCity.innerHTML !== ch) elCity.innerHTML = ch;
      }
      if (S.zones.length) renderZones(now, p);
      updateDim(now);
      elTime.setAttribute('aria-label', `${S.lang === 'ja' ? '現在の時刻' : 'Current time'} ${shortTime(p)}`);
    }
    if (needFit) fit();
  }

  function renderZones(now, mainP) {
    const ja = S.lang === 'ja';
    const mainDay = Date.UTC(mainP.y, mainP.mo - 1, mainP.d);
    const html = S.zones.map((z) => {
      const q = partsIn(z, now);
      const diff = Math.round((Date.UTC(q.y, q.mo - 1, q.d) - mainDay) / 86400000);
      const d = diff > 0 ? (ja ? '翌日' : '+1 day') : diff < 0 ? (ja ? '前日' : '−1 day') : '';
      return `<div class="zone"><span class="zn">${esc(zoneName(z))}</span><span class="zt">${shortTime(q)}</span>${d ? `<span class="zd">${d}</span>` : ''}</div>`;
    }).join('');
    if (elZones.innerHTML !== html) { elZones.innerHTML = html; needFit = true; }
  }

  let raf = 0, tmo = 0;
  function schedule() {
    cancelAnimationFrame(raf);
    clearTimeout(tmo);
    if (document.hidden) return;
    if (S.seconds && S.ms) raf = requestAnimationFrame(() => { tick(); schedule(); });
    else tmo = setTimeout(() => { tick(); schedule(); }, 1000 - (Date.now() % 1000) + 5);
  }

  /* ================= sizing ================= */
  function fit() {
    needFit = false;
    const cs = getComputedStyle(stage);
    const vw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const vh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    if (vw <= 0 || vh <= 0) return;
    meas.innerHTML = lastTmpl;
    const w = meas.offsetWidth || 1, h = meas.offsetHeight || 1;
    const ds = S.dateSize / 100;
    const hasCity = S.showCity || S.showOffset;
    // 時刻の行の高さを 1 としたときの、ほかの行の高さの合計（ざっくり）
    const extra = 1 + (S.date ? ds * 1.45 : 0) + (hasCity ? 0.17 : 0);

    const setSizes = (t) => {
      root.style.setProperty('--t', t.toFixed(2) + 'px');
      const df = Math.max(t * ds, 12);
      elDate.style.fontSize = df + 'px';
      elCity.style.fontSize = Math.max(t * 0.11, 12) + 'px';
      elZones.style.fontSize = Math.min(Math.max(t * Math.max(ds, 0.12) * 0.95, 14), 64) + 'px';
    };
    const widthT = (vw * S.size / 100) * 100 / w;
    let t = Math.min(widthT, (vh * 0.92) * 100 / (h * extra));
    setSizes(t);
    if (S.zones.length) {
      const zh = elZones.offsetHeight + parseFloat(getComputedStyle(elZones).marginTop);
      t = Math.min(t, Math.max(vh * 0.92 - zh, vh * 0.3) * 100 / (h * extra));
      setSizes(t);
    }
    // 日付が横にはみ出すときは日付だけ小さくする
    if (S.date && elDate.scrollWidth > vw) {
      elDate.style.fontSize = (parseFloat(elDate.style.fontSize) * vw / elDate.scrollWidth * 0.98) + 'px';
    }
  }

  /* ================= keep-alive features ================= */
  function updateDim(now) {
    let b = S.brightness;
    if (S.night && S.nightFrom !== S.nightTo) {
      const h = now.getHours();
      const inNight = S.nightFrom < S.nightTo ? h >= S.nightFrom && h < S.nightTo : h >= S.nightFrom || h < S.nightTo;
      if (inNight) b = Math.min(b, S.nightBright);
    }
    const o = (1 - b / 100).toFixed(2);
    if (dimEl.style.opacity !== o) dimEl.style.opacity = o;
  }

  let shiftTimer = 0;
  function startShift() {
    clearInterval(shiftTimer);
    shiftTimer = setInterval(() => {
      if (!S.shift) return;
      const m = Math.min(stage.clientWidth, stage.clientHeight) * 0.02;
      const rnd = () => ((Math.random() * 2 - 1) * m).toFixed(1);
      clock.style.transform = `translate(${rnd()}px, ${rnd()}px)`;
    }, 60000);
  }

  let wakeLock = null, wakeState = 'off';
  async function updateWake() {
    if (!S.wake) {
      if (wakeLock) { try { await wakeLock.release(); } catch (e) {} wakeLock = null; }
      wakeState = 'off';
      return renderWakeState();
    }
    if (!('wakeLock' in navigator)) { wakeState = 'unsupported'; return renderWakeState(); }
    if (wakeLock || document.hidden) return renderWakeState();
    try {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeState = 'on';
      wakeLock.addEventListener('release', () => { wakeLock = null; if (S.wake) wakeState = 'paused'; renderWakeState(); });
    } catch (e) {
      wakeState = 'failed';
    }
    renderWakeState();
  }
  function renderWakeState() {
    const el = $('#wakeState');
    if (!el) return;
    el.textContent = {
      off: '',
      on: '画面を消さない設定が効いています。',
      paused: '一時的に解除されました。画面を触ると戻ります。',
      unsupported: 'このブラウザでは使えません。端末の「自動ロック」の設定で調整してください。',
      failed: 'うまく設定できませんでした（省電力モードなど）。画面を触ると再度試します。'
    }[wakeState];
    el.hidden = !el.textContent;
  }

  /* ================= settings panel ================= */
  const hours = Array.from({ length: 24 }, (_, i) => [i, `${i}時`]);
  const today = () => partsIn(tzOf(S.tz), new Date());

  // 設定の画面の定義。show が false のときは隠す
  const UI = () => [
    { sec: '色', items: [
      { type: 'presets' },
      { type: 'colors' },
      { k: 'bgMode', type: 'seg', label: '背景', opts: [['solid', '単色'], ['gradient', 'グラデーション']] },
      { k: 'bgAngle', type: 'range', label: 'グラデーションの向き', min: 0, max: 360, step: 15, unit: '°', show: () => S.bgMode === 'gradient' },
      { k: 'glow', type: 'toggle', label: '文字を光らせる' }
    ] },
    { sec: '時刻', items: [
      { k: 'hour12', type: 'seg', label: '表示', opts: [[false, '24時間'], [true, '12時間']] },
      { k: 'ampm', type: 'toggle', label: S.lang === 'ja' ? '午前・午後をつける' : 'AM・PM をつける', show: () => S.hour12 },
      { k: 'padHour', type: 'toggle', label: '時を2けたにする（09:05）' },
      { k: 'timeStyle', type: 'seg', label: '区切り', opts: [['colon', '12:34'], ['dot', '12.34'], ['kanji', S.lang === 'ja' ? '12時34分' : '12h34m']] },
      { k: 'blink', type: 'toggle', label: '区切りを点滅させる', show: () => S.timeStyle !== 'kanji' },
      { k: 'seconds', type: 'toggle', label: '秒を表示' },
      { k: 'ms', type: 'seg', label: 'ミリ秒', opts: [[0, 'なし'], [1, '.1'], [2, '.12'], [3, '.123']], show: () => S.seconds },
      { k: 'smallSec', type: 'toggle', label: '秒・ミリ秒を小さくする', show: () => S.seconds }
    ] },
    { sec: '日付・曜日', items: [
      { k: 'date', type: 'toggle', label: '日付を表示' },
      { k: 'dateFmt', type: 'seg', label: '形式', show: () => S.date, opts: (() => {
        const p = today();
        const fmts = S.lang === 'ja' ? ['long', 'short', 'era', 'slash', 'iso'] : ['long', 'short', 'slash', 'iso'];
        return fmts.map((f) => [f, dateHTML(p, { ...S, dateFmt: f, weekday: 'off' })]);
      })() },
      { k: 'weekday', type: 'seg', label: '曜日', show: () => S.date, opts: (() => {
        const w = today().wd;
        return S.lang === 'ja' ? [['off', 'なし'], ['short', WD_JA[w]], ['long', WD_JA[w] + '曜日']] : [['off', 'なし'], ['short', WD_EN_S[w]], ['long', WD_EN_L[w]]];
      })() },
      { k: 'kansuji', type: 'toggle', label: '漢数字にする（十月十五日）', show: () => S.date && S.lang === 'ja' && ['long', 'short', 'era'].includes(S.dateFmt) },
      { k: 'weekendColor', type: 'toggle', label: '土曜を青・日曜を赤にする', show: () => S.date && S.weekday !== 'off' },
      { k: 'datePos', type: 'seg', label: '位置', show: () => S.date, opts: [['above', '時刻の上'], ['below', '時刻の下']] },
      { k: 'dateSize', type: 'range', label: '大きさ（時刻に対して）', min: 6, max: 40, unit: '%', show: () => S.date }
    ] },
    { sec: '言語・地域', items: [
      { k: 'lang', type: 'seg', label: '言語', opts: [['ja', '日本語（漢字）'], ['en', 'English']] },
      { k: 'tz', type: 'tz', label: '地域（タイムゾーン）' },
      { k: 'showCity', type: 'toggle', label: '地域名を表示' },
      { k: 'showOffset', type: 'toggle', label: 'UTC との時差を表示' },
      { type: 'zones' }
    ] },
    { sec: '文字', items: [
      { type: 'fonts' },
      { k: 'weight', type: 'seg', label: '太さ', opts: [[300, '細い'], [500, 'ふつう'], [800, '太い']], show: () => S.font !== 'dot' },
      { k: 'size', type: 'range', label: '時刻の大きさ（画面の幅に対して）', min: 20, max: 100, unit: '%' },
      { k: 'vpos', type: 'seg', label: '縦の位置', opts: [['top', '上'], ['center', '中央'], ['bottom', '下']] },
      { k: 'hpos', type: 'seg', label: '横の位置', opts: [['left', '左'], ['center', '中央'], ['right', '右']] }
    ] },
    { sec: 'ずっと表示する', items: [
      { k: 'wake', type: 'toggle', label: '画面を消さない' },
      { type: 'wakeState' },
      { k: 'shift', type: 'toggle', label: '焼き付き防止（1分ごとに少しずらす）' },
      { k: 'brightness', type: 'range', label: '明るさ', min: 10, max: 100, step: 5, unit: '%' },
      { k: 'night', type: 'toggle', label: '夜は暗くする（この端末の時刻で）' },
      { k: 'nightFrom', type: 'select', label: '暗くする時刻', opts: hours, show: () => S.night, half: true },
      { k: 'nightTo', type: 'select', label: '元に戻す時刻', opts: hours, show: () => S.night, half: true },
      { k: 'nightBright', type: 'range', label: '夜の明るさ', min: 5, max: 100, step: 5, unit: '%', show: () => S.night }
    ] },
    { sec: 'その他', items: [{ type: 'actions' }] }
  ];

  let shows = [];
  function renderPanel() {
    shows = [];
    const scrollTop = body.scrollTop;
    body.innerHTML = UI().map((sec) => `<section class="sec"><h2>${sec.sec}</h2>${sec.items.map(renderItem).join('')}</section>`).join('');
    body.scrollTop = scrollTop;
    syncPanel();
    renderWakeState();
  }

  function renderItem(it) {
    const id = shows.push(it.show || null) - 1;
    const wrap = (html, cls = 'field') => `<div class="${cls}" data-i="${id}">${html}</div>`;
    const v = S[it.k];
    switch (it.type) {
      case 'seg':
        return wrap(`<div class="flabel">${it.label}</div><div class="seg" role="group" aria-label="${esc(it.label)}">${it.opts.map(([val, lbl]) =>
          `<button type="button" data-k="${it.k}" data-v='${esc(JSON.stringify(val))}' aria-pressed="${val === v}">${lbl}</button>`).join('')}</div>`);
      case 'toggle':
        return wrap(`<label class="sw"><span>${it.label}</span><input type="checkbox" data-k="${it.k}"${v ? ' checked' : ''}><span class="knob"></span></label>`);
      case 'range':
        return wrap(`<label><span class="flabel">${it.label}<output>${v}${it.unit || ''}</output></span><input type="range" data-k="${it.k}" data-unit="${it.unit || ''}" min="${it.min}" max="${it.max}" step="${it.step || 1}" value="${v}"></label>`);
      case 'select':
        return wrap(`<label><span class="flabel">${it.label}</span><select data-k="${it.k}" data-num="1">${it.opts.map(([val, lbl]) => `<option value="${val}"${val === v ? ' selected' : ''}>${lbl}</option>`).join('')}</select></label>`);
      case 'tz':
        return wrap(`<label><span class="flabel">${it.label}</span><select data-k="tz">${tzOptions(S.tz, true)}</select></label>`);
      case 'presets':
        return wrap(`<div class="tiles">${PRESETS.map((pr) => `<button type="button" class="tile" data-preset="${pr.id}" aria-pressed="${isPreset(pr)}" style="background:linear-gradient(160deg,${pr.bg1},${pr.bg2});color:${pr.fg}"><span class="tt" style="font-family:${esc(FONT_BY_ID[S.font].css)}, sans-serif">12:34</span><span class="tn" style="color:${pr.sub}">${pr.name}</span></button>`).join('')}</div>`);
      case 'colors': {
        const c = (k, lbl, show) => `<label class="cfield" data-ci="${k}"${show ? '' : ' hidden'}><input type="color" data-k="${k}" value="${S[k]}"><span>${lbl}<span class="hex">${S[k]}</span></span></label>`;
        return wrap(`<div class="colors">${c('bg1', '背景', true)}${c('bg2', '背景（2色目）', S.bgMode === 'gradient')}${c('fg', '時刻', true)}${c('sub', '日付・地域', true)}</div>`);
      }
      case 'fonts':
        return wrap(`<div class="flabel">フォント</div><div class="tiles">${FONTS.map((f) => `<button type="button" class="tile font-tile" data-font="${f.id}" aria-pressed="${S.font === f.id}"><span class="tt" style="font-family:${esc(f.css)}, sans-serif">12:34</span><span class="tn">${f.name}</span></button>`).join('')}</div>`);
      case 'zones': {
        const list = S.zones.map((z, i) => `<li><span>${esc(zoneName(z, 'ja'))}<span class="zoff">${offsetLabel(offsetMin(z, new Date()))}</span></span><button type="button" data-zdel="${i}" aria-label="${esc(zoneName(z, 'ja'))} を消す">×</button></li>`).join('');
        return wrap(`<div class="flabel">ほかの地域の時刻も表示（4つまで）</div>${list ? `<ul class="zlist">${list}</ul>` : ''}${S.zones.length < 4 ? `<select id="zoneAdd" aria-label="地域を追加"><option value="">＋ 地域を追加…</option>${tzOptions('', false)}</select>` : ''}`);
      }
      case 'wakeState':
        return wrap('<p class="note" id="wakeState" hidden></p>', 'field note-wrap');
      case 'actions':
        return wrap(`<div class="btns">${document.fullscreenEnabled ? '<button type="button" class="btn" data-act="fs">全画面にする</button>' : ''}<button type="button" class="btn danger" data-act="reset">設定を最初に戻す</button></div>
          <div class="confirm" id="resetConfirm" role="alertdialog" aria-labelledby="resetMsg" hidden><p id="resetMsg">色・大きさ・地域などの設定をすべて最初の状態に戻します。よろしいですか？</p><div class="btns"><button type="button" class="btn danger-fill" data-act="resetYes">戻す</button><button type="button" class="btn" data-act="resetNo">やめる</button></div></div>
          <p class="about">画面を触ると右上に設定ボタンが出ます。キーボード：<kbd>S</kbd> 設定、<kbd>F</kbd> 全画面、<kbd>Esc</kbd> 閉じる。ダブルクリックでも全画面になります。設定はこの端末のブラウザに保存されます。</p>`, 'field');
      default:
        return '';
    }
  }

  function tzOptions(sel, withLocal) {
    const opt = (val, lbl) => `<option value="${esc(val)}"${val === sel ? ' selected' : ''}>${esc(lbl)}</option>`;
    const now = new Date();
    const off = (id) => { try { return offsetLabel(offsetMin(id, now)); } catch (e) { return ''; } };
    let html = withLocal ? opt('local', `この端末の設定（${zoneName('local', 'ja')}・${off(LOCAL_TZ)}）`) : '';
    for (const reg of REGIONS) {
      html += `<optgroup label="${reg}">${ZONES.filter((z) => z[3] === reg).map((z) => opt(z[0], `${z[1]}（${off(z[0])}）`)).join('')}</optgroup>`;
    }
    if (Intl.supportedValuesOf) {
      try {
        const rest = Intl.supportedValuesOf('timeZone').filter((id) => !ZONE_BY_ID[id]);
        if (sel && sel !== 'local' && !ZONE_BY_ID[sel] && !rest.includes(sel)) rest.unshift(sel);
        html += `<optgroup label="そのほか（英語名）">${rest.map((id) => opt(id, id.replace(/_/g, ' '))).join('')}</optgroup>`;
      } catch (e) {}
    }
    return html;
  }

  const isPreset = (pr) => ['bgMode', 'bg1', 'bg2', 'fg', 'sub', 'glow'].every((k) => (k === 'bg2' && pr.bgMode === 'solid') || S[k] === pr[k]);

  function syncPanel() {
    body.querySelectorAll('[data-i]').forEach((el) => {
      const f = shows[+el.dataset.i];
      el.hidden = !!f && !f();
    });
    body.querySelectorAll('.seg button').forEach((b) => b.setAttribute('aria-pressed', String(JSON.stringify(S[b.dataset.k]) === b.dataset.v)));
    body.querySelectorAll('input[type="checkbox"][data-k]').forEach((c) => { c.checked = !!S[c.dataset.k]; });
    body.querySelectorAll('[data-preset]').forEach((b) => b.setAttribute('aria-pressed', String(isPreset(PRESETS.find((p) => p.id === b.dataset.preset)))));
    body.querySelectorAll('[data-font]').forEach((b) => b.setAttribute('aria-pressed', String(S.font === b.dataset.font)));
    body.querySelectorAll('input[type="color"][data-k]').forEach((c) => {
      if (c.value !== S[c.dataset.k]) c.value = S[c.dataset.k];
      c.parentElement.querySelector('.hex').textContent = S[c.dataset.k];
    });
    const bg2 = body.querySelector('[data-ci="bg2"]');
    if (bg2) bg2.hidden = S.bgMode !== 'gradient';
  }

  // これらを変えると、設定の画面の選択肢そのものが変わる
  const RERENDER = new Set(['lang', 'tz', 'zones', 'font', 'timeStyle']);
  function set(k, v) {
    S[k] = v;
    save();
    applyAll();
    if (RERENDER.has(k)) renderPanel(); else syncPanel();
  }

  body.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.k && b.dataset.v !== undefined) return set(b.dataset.k, JSON.parse(b.dataset.v));
    if (b.dataset.preset) {
      const pr = PRESETS.find((p) => p.id === b.dataset.preset);
      Object.assign(S, { bgMode: pr.bgMode, bg1: pr.bg1, bg2: pr.bg2, fg: pr.fg, sub: pr.sub, glow: pr.glow, preset: pr.id });
      save(); applyAll(); syncPanel();
      return;
    }
    if (b.dataset.font) return set('font', b.dataset.font);
    if (b.dataset.zdel !== undefined) return set('zones', S.zones.filter((_, i) => i !== +b.dataset.zdel));
    if (b.dataset.act === 'fs') return toggleFullscreen();
    // confirm() はホーム画面アプリや埋め込みのブラウザで出ないことがあるので、画面の中で確かめる
    if (b.dataset.act === 'reset' || b.dataset.act === 'resetNo') {
      const box = $('#resetConfirm');
      box.hidden = b.dataset.act === 'resetNo';
      if (!box.hidden) { box.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); box.querySelector('[data-act="resetYes"]').focus(); }
      return;
    }
    if (b.dataset.act === 'resetYes') {
      S = sanitize(null);
      save(); applyAll(); renderPanel();
      toast('設定を最初に戻しました');
    }
  });
  body.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.k) return;
    if (el.type === 'range') {
      el.previousElementSibling.querySelector('output').textContent = el.value + el.dataset.unit;
      S[el.dataset.k] = +el.value;
      save(); applyAll();
    } else if (el.type === 'color') {
      S[el.dataset.k] = el.value;
      save(); applyAll(); syncPanel();
    }
  });
  body.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'zoneAdd') {
      if (el.value && !S.zones.includes(el.value)) set('zones', [...S.zones, el.value]);
      return;
    }
    if (!el.dataset.k) return;
    if (el.type === 'checkbox') set(el.dataset.k, el.checked);
    else if (el.tagName === 'SELECT') set(el.dataset.k, el.dataset.num ? +el.value : el.value);
  });

  // 設定を開いたときだけ、フォント選びの見本用に全部のフォントを読む
  let allFontsLoaded = false;
  function loadAllFonts() {
    if (allFontsLoaded) return;
    allFontsLoaded = true;
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?' + FONTS.filter((f) => f.q).map((f) => 'family=' + f.q.split(':')[0]).join('&') + '&display=swap';
    document.head.appendChild(l);
  }

  function openPanel() {
    loadAllFonts();
    renderPanel();
    panel.hidden = false;
    document.body.classList.add('panel-open');
    document.body.classList.remove('idle');
    $('#setBtn').setAttribute('aria-expanded', 'true');
    $('#closeBtn').focus();
  }
  function closePanel() {
    panel.hidden = true;
    document.body.classList.remove('panel-open');
    $('#setBtn').setAttribute('aria-expanded', 'false');
    poke();
  }

  /* ================= fullscreen / idle / keys ================= */
  function toggleFullscreen() {
    if (!document.fullscreenEnabled) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else document.documentElement.requestFullscreen().catch(() => {});
  }
  if (!document.fullscreenEnabled) $('#fsBtn').hidden = true;
  document.addEventListener('fullscreenchange', () => document.body.classList.toggle('is-fs', !!document.fullscreenElement));

  let idleTimer = 0;
  function poke() {
    document.body.classList.remove('idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { if (panel.hidden) document.body.classList.add('idle'); }, 2800);
    if (S.wake && !wakeLock) updateWake();
  }
  ['pointermove', 'pointerdown', 'keydown', 'wheel'].forEach((ev) => window.addEventListener(ev, poke, { passive: true }));

  $('#setBtn').addEventListener('click', openPanel);
  $('#closeBtn').addEventListener('click', closePanel);
  $('#fsBtn').addEventListener('click', toggleFullscreen);
  stage.addEventListener('dblclick', toggleFullscreen);
  stage.addEventListener('click', () => { if (!panel.hidden && matchMedia('(max-width: 700px)').matches) closePanel(); });

  window.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === 'Escape') { if (!panel.hidden) closePanel(); return; }
    if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
    if (e.key === 's' || e.key === 'S' || e.key === ',') { panel.hidden ? openPanel() : closePanel(); }
    else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });

  if (window.ResizeObserver) new ResizeObserver(() => fit()).observe(stage);
  else window.addEventListener('resize', fit);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { lastSecKey = -1; tick(); updateWake(); }
    schedule();
  });

  /* ================= misc ================= */
  let toastTimer = 0;
  function toast(msg, ms = 2600) {
    const t = $('#toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, ms);
  }

  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  }

  /* ================= start ================= */
  applyAll();
  startShift();
  try {
    if (!localStorage.getItem(SEEN)) {
      localStorage.setItem(SEEN, '1');
      setTimeout(() => toast('画面を触ると、右上に設定ボタンが出ます', 4500), 600);
    }
  } catch (e) {}
})();
