(() => {
  'use strict';
  const LEVEL_XP = 1000;
  const STEP_XP = 100; // XP per +/- click
  const KEY = 'power999.v1';
  const $ = (id) => document.getElementById(id);
  const rootStyle = getComputedStyle(document.documentElement);

  // ---------- state ----------
  let state = { progress: {}, custom: [] };
  try { state = Object.assign(state, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* ignore corrupt data */ }
  const save = () => localStorage.setItem(KEY, JSON.stringify(state));

  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function normalize(c) {
    if (!c || typeof c.name !== 'string' || !c.name.trim()) throw new Error('Every card needs a "name".');
    const maxXP = Math.max(LEVEL_XP, Math.round((Number(c.maxXP) || 5000) / LEVEL_XP) * LEVEL_XP);
    return {
      id: c.id ? slug(c.id) : slug(c.name),
      name: c.name.trim(),
      shortDesc: String(c.shortDesc || ''),
      maxXP,
      color: String(c.color || 'green').trim(),
      icon: String(c.icon || '⚡').trim(),
      iconUrl: /^https?:\/\//i.test(String(c.iconUrl || '').trim()) ? String(c.iconUrl).trim() : '',
      parts: Array.isArray(c.parts) ? c.parts.map(String) : []
    };
  }

  // There are no built-in cards: every card comes from the user's own imports (stored locally).
  function allCards() {
    const map = new Map();
    state.custom.forEach((c) => { const n = normalize(c); n.custom = true; map.set(n.id, n); });
    return [...map.values()];
  }

  const prog = (id) => (state.progress[id] ||= { xp: 0, done: [] });

  // ---------- colors / icons ----------
  function resolveColor(color) {
    const v = rootStyle.getPropertyValue('--color-card-glow-' + color.toLowerCase()).trim();
    return v || color;
  }
  // Icon priority: iconUrl (if given and it loads) -> icon (bundled slug / image path / emoji) -> ⚡
  function iconNode(card, hex) {
    const box = document.createElement('div');
    box.className = 'icon';
    const tries = [];
    if (card.iconUrl) tries.push(() => imgEl(card.iconUrl));
    tries.push(() => builtinIcon(card.icon, hex));
    tries.push(() => '⚡');
    const next = () => {
      const make = tries.shift();
      const out = make();
      if (typeof out === 'string') { box.textContent = out; return; }
      if (out instanceof HTMLImageElement) {
        out.onerror = () => { out.remove(); next(); };
        box.replaceChildren(out);
      } else box.replaceChildren(out);
    };
    next();
    return box;
  }
  function builtinIcon(ic, hex) {
    if (/^https?:\/\/|^\.{0,2}\//.test(ic) || /\.(png|svg|jpe?g|webp)$/i.test(ic)) return imgEl(ic);
    if (/^[a-z0-9.\-]+$/i.test(ic) && ic.length > 1) {
      const d = (window.ICONS || {})[ic.toLowerCase()];
      if (d) {
        const wrap = document.createElement('span');
        wrap.innerHTML = `<svg viewBox="0 0 24 24" role="img" aria-hidden="true"><path d="${d}"/></svg>`;
        return wrap.firstChild;
      }
      const h = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : 'ffffff'; // not bundled: Simple Icons CDN
      return imgEl(`https://cdn.simpleicons.org/${ic.toLowerCase()}/${h}`);
    }
    return ic;
  }
  function imgEl(src) {
    const img = new Image();
    img.referrerPolicy = 'no-referrer';
    img.alt = ''; img.loading = 'lazy'; img.src = src;
    return img;
  }

  // ---------- sounds (synthesized with Web Audio, no files) ----------
  let muted = localStorage.getItem(KEY + '.muted') === '1';
  let actx = null;
  function tone(freq, start, dur, type = 'square', vol = .06, slideTo = null) {
    const t = actx.currentTime + start;
    const o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(actx.destination); o.start(t); o.stop(t + dur + .02);
  }
  function zap(dur = .35) {
    const n = actx.sampleRate * dur, buf = actx.createBuffer(1, n, actx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
    const src = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
    f.type = 'highpass'; f.frequency.value = 1800; g.gain.value = .25;
    src.buffer = buf; src.connect(f).connect(g).connect(actx.destination); src.start();
  }
  const SFX = {
    up:    () => tone(520, 0, .07, 'square', .05, 780),
    down:  () => tone(420, 0, .07, 'square', .05, 280),
    check: () => { tone(660, 0, .06, 'triangle', .08); tone(990, .06, .09, 'triangle', .08); },
    uncheck: () => tone(400, 0, .08, 'triangle', .06, 250),
    level: () => { zap(.4); [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, .08 + i * .07, .18, 'sawtooth', .06)); },
    max:   () => { zap(.6); [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => tone(f, i * .09, .35, 'sawtooth', .07)); }
  };
  function sfx(name) {
    if (muted) return;
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === 'suspended') actx.resume();
      SFX[name]();
    } catch (e) { /* audio unavailable */ }
  }

  // ---------- cards ----------
  const cardsEl = $('cards');
  const views = new Map();

  function build(card) {
    const p = prog(card.id);
    const hex = resolveColor(card.color);
    const el = document.createElement('article');
    el.className = 'card' + (card.custom ? ' custom' : '');
    el.style.setProperty('--glow', hex);

    const head = document.createElement('div');
    head.className = 'card-head';
    const titles = document.createElement('div');
    titles.className = 'titles';
    titles.innerHTML = '<div class="name"></div><div class="desc"></div>';
    titles.children[0].textContent = card.name;
    titles.children[1].textContent = card.shortDesc;
    const lv = document.createElement('div');
    lv.className = 'lv';
    head.append(iconNode(card, hex), titles, lv);

    const row = document.createElement('div');
    row.className = 'xprow';
    row.innerHTML = '<button class="xpbtn" title="-100 XP">−</button><div class="xptrack"><div class="xpfill"></div><div class="xptext"></div></div><button class="xpbtn" title="+100 XP">+</button>';
    const [minus, plus] = row.querySelectorAll('button');
    const fill = row.querySelector('.xpfill');
    const text = row.querySelector('.xptext');
    const total = document.createElement('p');
    total.className = 'total';

    el.append(head, row, total);

    let partsLabel = null, boxes = [];
    if (card.parts.length) {
      const d = document.createElement('details');
      partsLabel = document.createElement('summary');
      const ul = document.createElement('ul');
      ul.className = 'parts';
      card.parts.forEach((txt, i) => {
        const li = document.createElement('li');
        li.style.setProperty('--i', i);
        const lab = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = p.done.includes(i);
        cb.addEventListener('change', () => togglePart(card, i, cb.checked));
        const sp = document.createElement('span');
        sp.textContent = `${i + 1}. ${txt}`;
        lab.append(cb, sp);
        li.append(lab);
        ul.append(li);
        boxes.push(cb);
      });
      d.append(partsLabel, ul);
      el.append(d);
    }

    if (card.custom) {
      const del = document.createElement('button');
      del.className = 'del danger'; del.textContent = '✕'; del.title = 'Remove imported card';
      del.onclick = () => {
        if (!confirm(`Remove "${card.name}"?`)) return;
        state.custom = state.custom.filter((c) => normalize(c).id !== card.id);
        save(); render();
      };
      el.append(del);
    }

    minus.onclick = () => { sfx('down'); changeXP(card, -STEP_XP); };
    plus.onclick = () => { sfx('up'); changeXP(card, STEP_XP); };

    views.set(card.id, { card, el, lv, fill, text, total, partsLabel, boxes, hex });
    refreshCard(card.id);
    return el;
  }

  function refreshCard(id) {
    const v = views.get(id), p = prog(id), c = v.card;
    const lvl = Math.floor(p.xp / LEVEL_XP), maxLvl = c.maxXP / LEVEL_XP;
    const into = lvl >= maxLvl ? LEVEL_XP : p.xp % LEVEL_XP;
    v.lv.innerHTML = `LV ${lvl}<small>/ ${maxLvl}</small>`;
    v.fill.style.width = (into / LEVEL_XP * 100) + '%';
    v.text.textContent = lvl >= maxLvl ? 'MAX' : `${into} / ${LEVEL_XP} XP`;
    v.total.textContent = `${p.xp.toLocaleString()} / ${c.maxXP.toLocaleString()} XP`;
    v.el.classList.toggle('maxed', p.xp >= c.maxXP);
    if (v.partsLabel) v.partsLabel.textContent = `QUESTS ${p.done.length}/${c.parts.length}`;
  }

  function partXP(card) { return Math.round(card.maxXP / card.parts.length); }

  function setXP(card, newXP) {
    const p = prog(card.id);
    const before = Math.floor(p.xp / LEVEL_XP);
    p.xp = Math.max(0, Math.min(card.maxXP, newXP));
    const after = Math.floor(p.xp / LEVEL_XP);
    save();
    refreshCard(card.id);
    updateGlobal();
    if (after > before) levelUp(card, after);
  }

  function changeXP(card, delta) { setXP(card, prog(card.id).xp + delta); }

  function togglePart(card, i, on) {
    sfx(on ? 'check' : 'uncheck');
    const p = prog(card.id);
    p.done = p.done.filter((x) => x !== i);
    if (on) p.done.push(i);
    setXP(card, p.xp + (on ? 1 : -1) * partXP(card));
  }

  // ---------- global bar ----------
  function updateGlobal() {
    const cards = [...views.values()].map((v) => v.card);
    const xp = cards.reduce((s, c) => s + prog(c.id).xp, 0);
    const max = cards.reduce((s, c) => s + c.maxXP, 0);
    const lvl = Math.floor(xp / LEVEL_XP), into = xp % LEVEL_XP;
    $('totalXP').textContent = xp.toLocaleString();
    $('globalLvl').textContent = 'LVL ' + lvl;
    $('globalFill').style.width = (into / LEVEL_XP * 100) + '%';
    $('globalText').textContent = `${into} / ${LEVEL_XP} XP to next level`;
    $('goalText').textContent = `Total mastery: ${xp.toLocaleString()} / ${max.toLocaleString()} XP (${max ? Math.floor(xp / max * 100) : 0}%)`;
    const prev = updateGlobal.lvl;
    updateGlobal.lvl = lvl;
    return prev !== undefined && lvl > prev ? lvl : null;
  }

  // ---------- VFX ----------
  const cv = $('bolts'), ctx = cv.getContext('2d');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let bolts = [];
  function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); }
  addEventListener('resize', resize); resize();

  function path(x1, y1, x2, y2, disp, out) {
    if (disp < 4) { out.push([x2, y2]); return; }
    const mx = (x1 + x2) / 2 + (Math.random() - .5) * disp;
    const my = (y1 + y2) / 2 + (Math.random() - .5) * disp;
    path(x1, y1, mx, my, disp / 2, out);
    path(mx, my, x2, y2, disp / 2, out);
  }
  function makeBolt(x1, y1, x2, y2, color, width = 3, branches = true) {
    const pts = [[x1, y1]];
    path(x1, y1, x2, y2, Math.hypot(x2 - x1, y2 - y1) * .5, pts);
    const b = { segs: [pts], color, width, life: 1, decay: .035 };
    if (branches) {
      for (let i = 0; i < 3; i++) {
        const s = pts[Math.floor(Math.random() * pts.length * .8)];
        const a = Math.random() * Math.PI * 2, l = 60 + Math.random() * 140;
        const bp = [s];
        path(s[0], s[1], s[0] + Math.cos(a) * l, s[1] + Math.sin(a) * l, l * .6, bp);
        b.segs.push(bp);
      }
    }
    bolts.push(b);
  }
  function draw() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    bolts = bolts.filter((b) => (b.life -= b.decay) > 0);
    for (const b of bolts) {
      const flick = Math.random() > .25 ? 1 : .35;
      b.segs.forEach((pts, i) => {
        const w = i ? b.width * .5 : b.width;
        for (const [lw, col, blur] of [[w * 3, b.color, 30], [w, '#fff', 8]]) {
          ctx.globalAlpha = b.life * flick;
          ctx.strokeStyle = col; ctx.shadowColor = b.color; ctx.shadowBlur = blur; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
          for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
          ctx.stroke();
        }
      });
    }
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
    requestAnimationFrame(draw);
  }
  draw();

  function strike(cx, cy, color, n = 8) {
    for (let i = 0; i < n; i++) {
      setTimeout(() => {
        const fromTop = i % 2 === 0;
        const sx = cx + (Math.random() - .5) * innerWidth * .8;
        if (fromTop) makeBolt(sx, 0, cx + (Math.random() - .5) * 120, cy, color, 3);
        else { const a = Math.random() * Math.PI * 2, l = 150 + Math.random() * 250;
          makeBolt(cx, cy, cx + Math.cos(a) * l, cy + Math.sin(a) * l, color, 2.5); }
      }, i * 70);
    }
  }

  function levelUp(card, lvl, isGlobal) {
    sfx(lvl * LEVEL_XP >= card.maxXP ? 'max' : 'level');
    const v = views.get(card.id);
    const r = v.el.getBoundingClientRect();
    const color = v.hex;
    if (!reduce) {
      strike(r.left + r.width / 2, r.top + r.height / 2, color);
      v.el.classList.remove('levelup'); void v.el.offsetWidth; v.el.classList.add('levelup');
      v.lv.classList.remove('pop'); void v.lv.offsetWidth; v.lv.classList.add('pop');
      $('flash').classList.remove('go'); void $('flash').offsetWidth; $('flash').classList.add('go');
      cardsEl.classList.remove('shake'); void cardsEl.offsetWidth; cardsEl.classList.add('shake');
    }
    const b = document.createElement('div');
    b.className = 'banner';
    b.style.setProperty('--c', color);
    b.innerHTML = '<b>LEVEL UP!</b><span></span>';
    b.querySelector('span').textContent = `${card.name} → LV ${lvl}`;
    document.body.append(b);
    setTimeout(() => b.remove(), 2100);
  }

  // ambient lightning on the title
  function ambient() {
    if (!reduce && !document.hidden) {
      const h = document.querySelector('h1').getBoundingClientRect();
      const x = h.left + Math.random() * h.width;
      const left = Math.random() > .5;
      makeBolt(x, 0, left ? x - 80 - Math.random() * 120 : x + 80 + Math.random() * 120, h.bottom + 10, '#ffe44d', 1.8, false);
    }
    setTimeout(ambient, 3000 + Math.random() * 5000);
  }
  ambient();

  // ---------- render / toolbar ----------
  function render() {
    views.clear(); cardsEl.innerHTML = '';
    const cards = allCards();
    cards.forEach((c) => cardsEl.append(build(c)));
    $('empty').hidden = cards.length > 0;
    updateGlobal();
  }

  $('btnExport').onclick = () => {
    const data = { exportedAt: new Date().toISOString(), progress: state.progress, custom: state.custom };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    a.download = 'power-level-backup.json'; a.click(); URL.revokeObjectURL(a.href);
  };
  const btnSound = $('btnSound');
  const paintSound = () => { btnSound.textContent = muted ? '🔇 SOUND OFF' : '🔊 SOUND ON'; };
  btnSound.onclick = () => {
    muted = !muted; localStorage.setItem(KEY + '.muted', muted ? '1' : '0'); paintSound(); sfx('up');
  };
  paintSound();
  $('btnReset').onclick = () => {
    if (confirm('Reset ALL progress? Your cards stay.')) { state.progress = {}; save(); render(); }
  };
  const dlg = $('importDlg');
  $('btnImport').onclick = () => { $('importErr').textContent = ''; dlg.showModal(); };
  $('importCancel').onclick = () => dlg.close();
  $('importOk').onclick = () => {
    try {
      let data = JSON.parse($('importText').value);
      let restored = null;
      if (data && !Array.isArray(data) && Array.isArray(data.custom)) { // full backup from EXPORT
        restored = data.progress && typeof data.progress === 'object' ? data.progress : null;
        data = data.custom;
      }
      const list = (Array.isArray(data) ? data : [data]).map(normalize);
      list.forEach((n) => {
        const i = state.custom.findIndex((c) => normalize(c).id === n.id);
        if (i >= 0) state.custom[i] = n; else state.custom.push(n); // replace in place, keep order
      });
      if (restored) Object.assign(state.progress, restored);
      save(); render(); $('importText').value = ''; dlg.close();
    } catch (e) { $('importErr').textContent = 'Invalid JSON: ' + e.message; }
  };

  // ---------- PWA ----------
  let installEvt = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('btnInstall').hidden = false; });
  addEventListener('appinstalled', () => { $('btnInstall').hidden = true; installEvt = null; });
  $('btnInstall').onclick = async () => {
    if (!installEvt) return;
    installEvt.prompt(); await installEvt.userChoice; installEvt = null; $('btnInstall').hidden = true;
  };
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    navigator.serviceWorker.register('sw.js').catch(() => { /* offline mode unavailable */ });
  }
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); // ask browser not to evict progress

  render();
})();
