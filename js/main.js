(() => {
  const CFG = window.STORE;
  const API = 'https://api.github.com/';
  const TTL = 9e5;
  const DAY = 864e5;
  const PLAT = { windows: 'Windows', linux: 'Linux', android: 'Android', other: 'Other files' };
  const KNOWN = ['windows', 'linux', 'android'];
  const RANK = ['.exe', '.msi', '.apk', '.appimage', '.deb', '.rpm', '.zip', '.tar.gz'];
  const MODES = ['auto', 'light', 'dark'];
  const G = {
    windows: '<path d="M3 5.4 10.6 4.3v7.2H3zM11.6 4.2 21 2.9v8.6h-9.4zM3 12.5h7.6v7.2L3 18.6zM11.6 12.5H21v8.6l-9.4-1.3z"/>',
    linux: '<path fill-rule="evenodd" d="M12 2.8c-2.1 0-3.5 1.7-3.5 4 0 1.7-.7 2.8-1.7 4.4C5.7 13.1 5 14.9 5 16.9c0 2.6 2.7 4.3 7 4.3s7-1.7 7-4.3c0-2-.7-3.8-1.8-5.7-1-1.6-1.7-2.7-1.7-4.4 0-2.3-1.4-4-3.5-4zM12 10.4c1.6 0 3 2.4 3 5.2 0 1.9-1.3 2.9-3 2.9s-3-1-3-2.9c0-2.8 1.4-5.2 3-5.2z"/>',
    android: '<path fill-rule="evenodd" d="M4.5 17.5a7.5 7.5 0 0 1 15 0zM8.5 14a1 1 0 1 0 2 0 1 1 0 0 0-2 0zm5 0a1 1 0 1 0 2 0 1 1 0 0 0-2 0z"/><path d="M8 11.5 6.5 9M16 11.5 17.5 9" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
  };
  const S = { q: '', plat: null, host: null, open: null, tag: null, chan: 'all', vq: '', ready: false, busy: false, next: false, y: 0 };
  const net = { ok: 0, fail: 0, t: 0, until: 0, left: Infinity, cap: 0, bad: false };
  let APPS = [], sig = '', mode = 'auto';

  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lc = s => String(s).toLowerCase();
  const slug = s => lc(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const title = s => s.replace(/[-_.]+/g, ' ').trim().replace(/\b[a-z]/g, c => c.toUpperCase());
  const TUNE = Object.fromEntries(Object.entries(CFG.tune || {}).map(([k, v]) => [lc(k), v]));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
    del: k => { try { localStorage.removeItem(k); } catch {} }
  };
  const token = () => store.get('gh-token') || '';
  const mq = matchMedia('(prefers-color-scheme:dark)');
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const date = d => d ? fmt.format(new Date(d)) : '';
  const stamp = t => {
    const d = new Date(t), hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? hm : `${date(d)} ${hm}`;
  };
  const size = b => b > 1048576 ? (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const arch = n => /arm64|aarch64/i.test(n) ? 'arm64' : /x86_64|x64|amd64/i.test(n) ? 'x64' : /armeabi|armv7/i.test(n) ? 'arm' : /x86|i686|ia32/i.test(n) ? 'x86' : /universal/i.test(n) ? 'universal' : '';
  const rank = n => { const i = RANK.findIndex(x => lc(n).endsWith(x)); return i < 0 ? 99 : i; };
  const byRank = (x, y) => rank(x.n) - rank(y.n);
  const ext = n => RANK.find(x => lc(n).endsWith(x)) || lc(n).match(/\.[a-z0-9]+$/)?.[0] || '';
  const latestOf = app => app.rel.find(r => !r.pre) || app.rel[0];
  const glyph = p => `<svg class="g" viewBox="0 0 24 24" aria-hidden="true">${G[p]}</svg>`;
  const ico = app => `<span class="ico" style="--h:${app.hue}" aria-hidden="true">${app.icon ? `<img src="${esc(app.icon)}" alt="" loading="lazy">` : `<b>${esc(app.mono)}</b>`}</span>`;
  const mono = s => {
    const w = s.replace(/([a-z])([A-Z])/g, '$1 $2').match(/[A-Za-z0-9]+/g) || ['?'];
    return (w[0][0] + (w.length > 1 ? w.at(-1)[0] : '')).toUpperCase();
  };

  const brief = s => {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    s = (s.match(/^.*?[.!?](?=\s|$)/)?.[0] || s).replace(/[.!\s]+$/, '');
    return s.length > 80 ? s.slice(0, 80).replace(/\s+\S*$/, '') + '…' : s;
  };

  const plat = n => /\.(sig|blockmap|ya?ml|json|sha\d+|md5|asc|txt)$/i.test(n) ? 'other'
    : /\.(apk|aab)$/i.test(n) ? 'android'
    : /\.(ipa|dmg|pkg)$|darwin|macos|osx|(^|[-_.])(mac|ios)([-_.]|$)/i.test(n) ? 'other'
    : /\.(exe|msi|msix)$|windows|win32|win64|(^|[-_.])win([-_.]|$)/i.test(n) ? 'windows'
    : /\.(appimage|deb|rpm|flatpak|snap)$|linux/i.test(n) ? 'linux'
    : /android/i.test(n) ? 'android' : null;

  const sniff = () => {
    const s = `${navigator.userAgentData?.platform || ''} ${navigator.userAgent}`;
    return /android/i.test(s) ? 'android' : /iphone|ipad|ipod|mac/i.test(s) ? null : /win/i.test(s) ? 'windows' : /linux|x11|cros/i.test(s) ? 'linux' : null;
  };

  const best = r => {
    const files = r.assets.filter(a => KNOWN.includes(a.p));
    const kinds = [...new Set(files.map(a => a.p))];
    const want = [S.plat, S.host].find(p => kinds.includes(p)) || (kinds.length === 1 ? kinds[0] : null);
    return want ? files.filter(a => a.p === want).sort(byRank)[0] : null;
  };

  const quota = r => {
    const left = r.headers.get('x-ratelimit-remaining');
    if (left == null) return;
    net.left = Math.min(net.left, +left);
    net.cap = +r.headers.get('x-ratelimit-limit') || 0;
    if ((r.status === 403 || r.status === 429) && +left === 0) net.until = r.headers.get('x-ratelimit-reset') * 1000;
  };

  async function gh(path, slim, o = {}) {
    const key = 'gh:' + path, tk = token();
    let c = null;
    try { c = JSON.parse(store.get(key)); } catch {}
    const age = c ? Date.now() - c.t : Infinity;
    const keep = () => { if (c) net.t = Math.max(net.t, c.t); return c ? c.d : null; };
    if (o.stale) return keep();
    const fresh = c && !o.force && age < TTL;
    const idle = c && o.mark && c.m === o.mark && !c.d?.length && age < DAY && !(o.force && tk);
    if (fresh || idle) return keep();
    if (net.until > Date.now()) { net.fail++; return keep(); }
    const save = v => { store.set(key, JSON.stringify(v)); net.ok++; net.t = Date.now(); return v.d; };
    const call = auth => fetch(API + path, { headers: { Accept: 'application/vnd.github+json', ...(c?.e ? { 'If-None-Match': c.e } : {}), ...(auth && tk ? { Authorization: 'Bearer ' + tk } : {}) } });
    try {
      let r = await call(true);
      if (r.status === 401 && tk) { net.bad = true; r = await call(false); }
      quota(r);
      if (r.status === 304 && c) return save({ ...c, t: Date.now(), m: o.mark });
      if (r.status === 404) return save({ t: Date.now(), m: o.mark, d: null });
      if (!r.ok) throw r.status;
      return save({ t: Date.now(), e: r.headers.get('etag'), m: o.mark, d: slim(await r.json()) });
    } catch {
      net.fail++;
      return keep();
    }
  }

  async function pool(items, fn) {
    const out = [];
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(6, items.length) }, async () => {
      while (i < items.length) { const k = i++; out[k] = await fn(items[k]); }
    }));
    return out;
  }

  const slimRepo = r => ({ repo: r.full_name, about: r.description, pushed: r.pushed_at });
  const slimRepos = d => d.filter(r => !r.fork && !r.archived).map(slimRepo);
  const slimReleases = d => d.filter(r => !r.draft).map(r => ({
    tag: r.tag_name, name: r.name, pre: r.prerelease, date: r.published_at || r.created_at,
    body: r.body, url: r.html_url, zip: r.zipball_url,
    assets: r.assets.map(a => ({ n: a.name, s: a.size, c: a.download_count, u: a.browser_download_url }))
  }));

  async function collect(o) {
    const lists = await Promise.all([
      ...(CFG.owners || []).map(n => gh(`users/${n}/repos?per_page=100&sort=pushed`, slimRepos, o)),
      ...(CFG.repos || []).map(r => gh('repos/' + r, d => [slimRepo(d)], o))
    ]);
    const seen = new Set((CFG.hide || []).map(lc));
    const repos = lists.flat().filter(r => r && !seen.has(lc(r.repo)) && seen.add(lc(r.repo)));
    const rels = await pool(repos, r => gh(`repos/${r.repo}/releases?per_page=100`, slimReleases, { ...o, mark: r.pushed }));
    return repos.map((r, i) => ({ repo: r.repo, about: r.about, rel: rels[i] })).filter(a => a.rel?.length);
  }

  function shape(data) {
    const ids = new Set();
    return data.map(r => {
      for (const x of r.rel) for (const a of x.assets) a.p = plat(a.n);
      const rel = r.rel.filter(x => x.assets.some(a => KNOWN.includes(a.p)));
      if (!rel.length) return null;
      const [owner, raw] = r.repo.split('/'), t = TUNE[lc(r.repo)] || {};
      let id = slug(raw) || slug(owner) || 'app';
      if (ids.has(id)) id = slug(r.repo);
      ids.add(id);
      const app = { id, repo: r.repo, rel, name: t.name || title(raw), about: brief(t.about ?? r.about), icon: t.icon };
      app.hue = t.hue ?? [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
      app.mono = mono(app.name);
      const files = rel.flatMap(x => x.assets);
      app.platforms = KNOWN.filter(p => latestOf(app).assets.some(a => a.p === p));
      for (const a of files) a.p ||= app.platforms.length === 1 ? app.platforms[0] : 'other';
      app.gets = files.reduce((n, a) => n + (a.p === 'other' ? 0 : a.c || 0), 0);
      return app;
    }).filter(Boolean).sort((x, y) => new Date(latestOf(y).date) - new Date(latestOf(x).date));
  }

  function md(src) {
    const inline = s => esc(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    let out = '', ul = false;
    for (const line of src.replace(/\r/g, '').replace(/<!--[\s\S]*?-->/g, '').split('\n')) {
      const li = line.match(/^\s*[-*+]\s+(.*)/), h = line.match(/^#{1,6}\s+(.*)/);
      if (li) { out += (ul ? '' : '<ul>') + `<li>${inline(li[1])}</li>`; ul = true; continue; }
      if (ul) { out += '</ul>'; ul = false; }
      if (h) out += `<h4>${inline(h[1])}</h4>`;
      else if (line.trim()) out += `<p>${inline(line)}</p>`;
    }
    return out + (ul ? '</ul>' : '');
  }

  const list = $('#list'), q = $('#q'), home = $('#home'), page = $('#page'), hero = $('#hero'), empty = $('#empty'), prefs = $('#prefs'), det = $('#detect'), syncBtn = $('#sync');

  function icon() {
    const d = mode === 'auto' ? mq.matches : mode === 'dark';
    const [b, i, a] = d ? ['#2a2130', '#efe9da', '#7fcbb3'] : ['#f3efe3', '#2f2333', '#3f9a82'];
    $('#icon').href = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${b}"/><rect x="8" y="9" width="4" height="13.5" rx="1.2" fill="${i}"/><rect x="13.5" y="12" width="4" height="10.5" rx="1.2" fill="${a}"/><rect x="20.5" y="10" width="4" height="12.5" rx="1.2" fill="${i}" transform="rotate(-12 20.5 22.5)"/><rect x="6" y="23.5" width="20" height="2.5" rx="1.25" fill="${i}"/></svg>`);
  }

  function cell(app) {
    const r = latestOf(app), a = best(r), b = $('.quick', app.li);
    b.href = a ? a.u : '#/' + app.id;
    b.textContent = a ? 'Get' : 'View';
    b.setAttribute('aria-label', a ? `Download ${app.name} ${r.tag} for ${PLAT[a.p]}` : `View ${app.name}`);
  }

  function feature() {
    const [a, b, c] = APPS;
    if (!a) { hero.innerHTML = ''; return; }
    const r = latestOf(a), f = best(r), to = `#/${a.id}`;
    const stand = (x, cls) => x ? `<a class="${cls}" href="#/${x.id}" tabindex="-1" title="${esc(x.name)}">${ico(x)}</a>` : '';
    hero.style.setProperty('--h', a.hue);
    hero.innerHTML = `<div><p class="label">Latest release · ${date(r.date)}</p><h1><a href="${to}">${esc(a.name)}</a></h1>${
      a.about ? `<p class="lead">${esc(a.about)}</p>` : ''}<p class="acts">${
      f ? `<a class="cta" href="${esc(f.u)}">${glyph(f.p)}Get ${esc(r.tag)} for ${PLAT[f.p]}</a><a class="more" href="${to}">All versions</a>`
        : `<a class="cta" href="${to}">View ${esc(r.tag)}</a><span class="plats">${a.platforms.map(glyph).join('')}</span>`
    }</p></div><div class="shelf" aria-hidden="true">${stand(b, 'm')}${stand(a, 'l')}${stand(c, 'm lean')}</div>`;
  }

  function panel(app) {
    const rel = app.rel, mixed = rel.some(r => r.pre) && rel.some(r => !r.pre);
    page.style.setProperty('--h', app.hue);
    page.innerHTML = `<a class="back" href="#/"><svg class="s" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6"/></svg>All apps</a><header class="phead">${ico(app)}<div><h1>${esc(app.name)}</h1>${
      app.about ? `<p>${esc(app.about)}</p>` : ''}<p class="meta">${app.platforms.map(p => `<span>${glyph(p)}${PLAT[p]}</span>`).join('')}${
      app.gets ? `<span>${app.gets.toLocaleString()} downloads</span>` : ''}<a href="https://github.com/${esc(app.repo)}" target="_blank" rel="noopener">${esc(app.repo)} ↗</a></p></div></header><div class="split"><aside class="rail"><h3 class="label">Versions</h3>${
      rel.length > 6 ? `<input class="vq" type="search" placeholder="Filter versions" aria-label="Filter versions" value="${esc(S.vq)}">` : ''}${
      mixed ? `<div class="chips">${[['all', 'All'], ['stable', 'Stable'], ['pre', 'Pre-release']].map(([c, t]) => `<button data-c="${c}" aria-pressed="${S.chan === c}">${t}</button>`).join('')}</div>` : ''
    }<ol class="vers"></ol></aside><article class="rel"></article></div>`;
    rail(app);
    detail(app);
  }

  function rail(app) {
    const ol = $('.vers', page);
    if (!ol) return;
    const f = lc(S.vq.trim()), latest = latestOf(app);
    ol.innerHTML = app.rel
      .filter(r => (S.chan === 'all' || (S.chan === 'pre') === r.pre) && (!f || lc(`${r.tag} ${r.name || ''}`).includes(f)))
      .map(r => `<li><button data-tag="${esc(r.tag)}" aria-current="${r.tag === S.tag}"><span>${esc(r.tag)}</span><em>${r === latest ? 'Latest' : r.pre ? 'Pre' : ''}</em><time>${date(r.date)}</time></button></li>`)
      .join('') || '<li class="state">No versions</li>';
  }

  function detail(app) {
    const box = $('.rel', page);
    if (!box) return;
    const r = app.rel.find(x => x.tag === S.tag) || latestOf(app), main = best(r);
    const of = p => r.assets.filter(a => a.p === p).sort(byRank);
    const kinds = [...new Set([S.plat, S.host, ...KNOWN])].filter(p => of(p).length);
    box.innerHTML = `<header><h2>${esc(r.tag)}</h2><p>${date(r.date)} · ${r.pre ? 'Pre-release' : 'Stable'}${r.name && r.name !== r.tag ? ' · ' + esc(r.name) : ''}</p></header><div class="dls">${
      kinds.map(p => { const a = of(p)[0]; return `<a class="dl${a === main ? ' on' : ''}" href="${esc(a.u)}">${glyph(p)}<span><b>${PLAT[p]}</b><small>${[ext(a.n), arch(a.n), size(a.s)].filter(Boolean).join(' · ')}</small></span></a>`; }).join('')}</div>${
      r.body ? `<section class="notes"><h3 class="label">What’s new</h3>${md(r.body)}</section>` : ''}<section class="files"><h3 class="label">All files</h3>${
      [...kinds, 'other'].filter(p => of(p).length).map(p => `<div class="group"><h4>${PLAT[p]}</h4>${of(p).map(a =>
        `<a class="file" href="${esc(a.u)}"><span>${esc(a.n)}</span><span>${arch(a.n)}</span><span>${size(a.s)}</span><span>${(a.c || 0).toLocaleString()} ↓</span></a>`).join('')}</div>`).join('')
    }</section><p class="links"><a href="${esc(r.url)}" target="_blank" rel="noopener">Release page ↗</a><a href="${esc(r.zip)}">Source .zip</a></p>`;
  }

  function match(app) {
    if (S.plat && !app.platforms.includes(S.plat)) return null;
    const toks = lc(S.q).split(/\s+/).filter(Boolean);
    const hay = lc([app.name, app.repo, app.about, ...app.platforms.map(p => PLAT[p])].join(' '));
    const rest = toks.filter(t => !hay.includes(t));
    if (!rest.length) return [];
    const hits = app.rel.filter(r => { const h = lc(`${r.tag} ${r.name || ''}`); return rest.every(t => h.includes(t)); });
    return hits.length ? hits.slice(0, 6) : null;
  }

  function update() {
    const lead = APPS.length > 2 && !S.q.trim() && !S.plat;
    const lim = net.until > Date.now();
    let n = 0;
    hero.hidden = !lead;
    APPS.forEach((app, i) => {
      const hits = match(app);
      if (hits) n++;
      app.li.hidden = !hits;
      $('.hits', app.li).innerHTML = (hits || []).map(r => `<a href="#/${app.id}/${encodeURIComponent(r.tag)}">${esc(r.tag)}</a>`).join('');
    });
    $('#count').textContent = !APPS.length ? '' : n === APPS.length ? (n === 1 ? '1 app' : `${n} apps`) : `${n} of ${APPS.length}`;
    empty.innerHTML = APPS.length ? 'Nothing matches.'
      : lim ? `GitHub’s hourly limit is used up until ${stamp(net.until)}.${token() ? '' : '<button class="btn" data-prefs>Add a token</button>'}`
      : net.ok ? 'No Windows, Linux or Android releases yet.' : 'GitHub is out of reach.';
    empty.hidden = n > 0 || !S.ready;
  }

  function route(again) {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let tag = null;
    try { tag = decodeURIComponent(parts.slice(1).join('/')) || null; } catch {}
    const app = (parts[0] && (APPS.find(a => a.id === parts[0]) || APPS.find(a => a.id.startsWith(parts[0])))) || null;
    const changed = app !== S.open;
    if (changed && !again) { S.chan = 'all'; S.vq = ''; }
    S.open = app;
    S.tag = app ? (app.rel.some(r => r.tag === tag) ? tag : latestOf(app).tag) : null;
    home.hidden = !!app;
    page.hidden = !app;
    document.title = app ? `${app.name} · ${CFG.name}` : CFG.name;
    if (app && changed) { panel(app); if (!again) scrollTo(0, 0); }
    else if (app) { rail(app); detail(app); }
    else if (changed && !again) scrollTo(0, S.y);
  }

  function render(again) {
    list.classList.toggle('again', !!again);
    list.innerHTML = '';
    APPS.forEach((app, i) => {
      const li = app.li = document.createElement('li'), r = latestOf(app);
      li.className = 'app hue';
      li.style.cssText = `--h:${app.hue};--i:${i}`;
      li.innerHTML = `<a class="tile" href="#/${app.id}">${ico(app)}<span class="name">${esc(app.name)}</span><span class="brief">${esc(app.about)}</span></a><div class="hits"></div><div class="foot"><span class="plats" role="img" aria-label="${app.platforms.map(p => PLAT[p]).join(', ')}">${app.platforms.map(glyph).join('')}</span><span class="ver">${esc(r.tag)}</span><a class="quick"></a></div>`;
      list.append(li);
      cell(app);
    });
    const chips = KNOWN.map(p => [p, APPS.filter(a => a.platforms.includes(p)).length]).filter(([, n]) => n);
    if (!chips.some(([p]) => p === S.plat)) S.plat = null;
    $('#plats').innerHTML = chips.length ? `<button data-p="" aria-pressed="${!S.plat}">All</button>` + chips.map(([p, n]) => `<button data-p="${p}" aria-pressed="${S.plat === p}">${glyph(p)}${PLAT[p]}<sup>${n}</sup></button>`).join('') : '';
    feature();
    S.open = null;
    update();
    route(again);
  }

  function draw(d, again) {
    const s = JSON.stringify(d);
    if (s === sig) return;
    sig = s;
    APPS = shape(d);
    render(again);
  }

  function status() {
    const lim = net.until > Date.now();
    const base = !net.t ? 'GitHub unreachable' : (net.fail ? (net.ok ? 'Partly synced ' : 'Saved copy ') : 'Synced ') + stamp(net.t);
    const text = lim ? (net.t ? base + ' · limit resets ' : 'GitHub limit resets ') + stamp(net.until) : net.bad ? base + ' · token rejected' : base;
    $('#state').textContent = text;
    $('#when').textContent = net.t ? stamp(net.t) : 'Sync';
    syncBtn.title = text;
    $('#quota').textContent = net.cap ? `${net.left.toLocaleString()} of ${net.cap.toLocaleString()} GitHub requests left` : '';
  }

  async function sync(force) {
    if (S.busy) { S.next = true; return; }
    S.busy = true;
    root.classList.add('busy');
    syncBtn.disabled = true;
    Object.assign(net, { ok: 0, fail: 0, left: Infinity, cap: 0, bad: false });
    const now = await collect({ force });
    S.ready = true;
    if (now.length || !APPS.length) draw(now, APPS.length > 0);
    S.busy = false;
    root.classList.remove('busy');
    syncBtn.disabled = false;
    $('main').removeAttribute('aria-busy');
    update();
    status();
    if (S.next) { S.next = false; sync(true); }
  }

  function theme(m) {
    mode = m;
    if (m === 'auto') delete root.dataset.theme;
    else root.dataset.theme = m;
    store.set('theme', m);
    for (const b of $('#modes').children) b.setAttribute('aria-pressed', b.dataset.m === m);
    icon();
  }

  function detect(on) {
    S.host = on ? sniff() : null;
    det.setAttribute('aria-pressed', on);
    $('#sense').textContent = on
      ? `${S.host ? PLAT[S.host] : 'Not a Windows, Linux or Android device'} · stays on this device`
      : 'Reads your browser’s platform to put matching files first. Stays on this device.';
    store.set('detect', on ? '1' : '0');
    APPS.forEach(cell);
    feature();
    if (S.open) detail(S.open);
  }

  function tokenState(msg) {
    const t = token();
    $('#tstate').textContent = msg || (t ? `A token ending ${t.slice(-4)} is saved in this browser.` : 'No token saved.');
    $('#tdrop').hidden = !t;
  }

  async function saveToken(v) {
    v = v.trim();
    if (!v) return;
    tokenState('Checking with GitHub…');
    let note = 'Saved.';
    try {
      const r = await fetch(API + 'rate_limit', { headers: { Accept: 'application/vnd.github+json', Authorization: 'Bearer ' + v } });
      if (r.status === 401) return tokenState('GitHub rejected this token. Nothing was saved.');
      const cap = r.ok ? (await r.json()).rate?.limit : 0;
      if (cap) note = `Saved. ${cap.toLocaleString()} requests an hour.`;
    } catch { note = 'Saved, but GitHub could not be reached to check it.'; }
    store.set('gh-token', v);
    if (token() !== v) return tokenState('This browser blocked storage, so the token was not saved.');
    $('#token').value = '';
    net.until = 0;
    tokenState(note);
    sync(true);
  }

  $('#plats').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    S.plat = b.dataset.p && S.plat !== b.dataset.p ? b.dataset.p : null;
    for (const x of b.parentNode.children) x.setAttribute('aria-pressed', (x.dataset.p || null) === S.plat);
    update();
    APPS.forEach(cell);
  });

  home.addEventListener('click', () => { S.y = scrollY; });

  page.addEventListener('click', e => {
    const app = S.open, v = e.target.closest('[data-tag]'), c = e.target.closest('[data-c]');
    if (!app) return;
    if (v) {
      S.tag = v.dataset.tag;
      history.replaceState(null, '', `#/${app.id}/${encodeURIComponent(S.tag)}`);
      for (const b of page.querySelectorAll('[data-tag]')) b.setAttribute('aria-current', b === v);
      detail(app);
    } else if (c) {
      S.chan = c.dataset.c;
      for (const b of c.parentNode.children) b.setAttribute('aria-pressed', b === c);
      rail(app);
    }
  });

  page.addEventListener('input', e => {
    if (e.target.matches('.vq') && S.open) { S.vq = e.target.value; rail(S.open); }
  });

  q.addEventListener('input', () => {
    S.q = q.value;
    if (S.open) location.hash = '#/';
    update();
  });

  document.addEventListener('click', e => {
    if (e.target.closest('[data-prefs]')) { tokenState(); prefs.showModal(); }
    else if (e.target.closest('[data-close]') || e.target === prefs) prefs.close();
  });

  $('#modes').addEventListener('click', e => { const b = e.target.closest('[data-m]'); if (b) theme(b.dataset.m); });
  $('#tform').addEventListener('submit', e => { e.preventDefault(); saveToken($('#token').value); });
  $('#tdrop').addEventListener('click', () => { store.del('gh-token'); tokenState('Token removed.'); });
  syncBtn.addEventListener('click', () => sync(true));
  det.addEventListener('click', () => detect(det.getAttribute('aria-pressed') !== 'true'));
  mq.addEventListener('change', icon);

  addEventListener('keydown', e => {
    if (prefs.open) return;
    const f = document.activeElement, typing = /INPUT|TEXTAREA/.test(f.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); q.focus(); }
    else if (e.key === 'Escape') {
      if (f === q && q.value) { q.value = S.q = ''; update(); }
      else if (S.open) location.hash = '#/';
      else f.blur();
    }
  });

  addEventListener('hashchange', () => route());

  async function boot() {
    const old = await collect({ stale: true });
    if (old.length) draw(old, false);
    sync(false);
  }

  document.title = CFG.name;
  $('#site').textContent = CFG.name;
  theme(MODES.includes(store.get('theme')) ? store.get('theme') : 'auto');
  detect(store.get('detect') === '1');
  boot();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
