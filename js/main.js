(() => {
  const CFG = window.STORE;
  const API = 'https://api.github.com/';
  const TTL = 9e5;
  const DAY = 864e5;
  const PLAT = { windows: 'Windows', linux: 'Linux', macos: 'macOS', android: 'Android', ios: 'iOS', other: 'Other' };
  const KNOWN = Object.keys(PLAT).filter(p => p !== 'other');
  const RANK = ['.exe', '.msi', '.apk', '.appimage', '.deb', '.rpm', '.dmg', '.zip', '.tar.gz'];
  const MODES = ['auto', 'light', 'dark'];
  const S = { q: '', plat: null, host: null, open: null, tag: null, chan: 'all', vq: '', ready: false };
  const net = { ok: 0, fail: 0, t: 0 };
  let APPS = [], sig = '', lastKey = '', mode = 'auto';

  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const lc = s => String(s).toLowerCase();
  const slug = s => lc(s).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const title = s => s.replace(/[-_.]+/g, ' ').trim().replace(/\b[a-z]/g, c => c.toUpperCase());
  const TUNE = Object.fromEntries(Object.entries(CFG.tune || {}).map(([k, v]) => [lc(k), v]));
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch {} }
  };
  const mq = matchMedia('(prefers-color-scheme:dark)');
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const dark = () => (mode === 'auto' ? mq.matches : mode === 'dark');
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const date = d => d ? fmt.format(new Date(d)) : '';
  const stamp = t => {
    const d = new Date(t), hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toDateString() === new Date().toDateString() ? hm : `${date(d)} ${hm}`;
  };
  const size = b => b > 1048576 ? (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const arch = n => /arm64|aarch64/i.test(n) ? 'arm64' : /x86_64|x64|amd64/i.test(n) ? 'x64' : /armeabi|armv7/i.test(n) ? 'arm' : /x86|i686|ia32/i.test(n) ? 'x86' : /universal/i.test(n) ? 'universal' : '';
  const rank = n => { const i = RANK.findIndex(x => lc(n).endsWith(x)); return i < 0 ? 99 : i; };
  const latestOf = app => app.rel.find(r => !r.pre) || app.rel[0];
  const byLi = node => APPS.find(a => a.li === node.closest('.app'));

  const brief = s => {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    s = (s.match(/^.*?[.!?](?=\s|$)/)?.[0] || s).replace(/[.!\s]+$/, '');
    return s.length > 80 ? s.slice(0, 80).replace(/\s+\S*$/, '') + '…' : s;
  };

  const plat = n => /\.(sig|blockmap|ya?ml|json|sha\d+|md5|asc|txt)$/i.test(n) ? 'other'
    : /\.(apk|aab)$/i.test(n) ? 'android'
    : /\.ipa$/i.test(n) ? 'ios'
    : /\.(dmg|pkg)$|darwin|macos|osx/i.test(n) ? 'macos'
    : /\.(exe|msi|msix)$|windows|win32|win64|(^|[-_.])win([-_.]|$)/i.test(n) ? 'windows'
    : /\.(appimage|deb|rpm|flatpak|snap)$|linux/i.test(n) ? 'linux'
    : /android/i.test(n) ? 'android' : null;

  const sniff = () => {
    const s = `${navigator.userAgentData?.platform || ''} ${navigator.userAgent}`;
    return /android/i.test(s) ? 'android' : /iphone|ipad|ipod/i.test(s) ? 'ios' : /win/i.test(s) ? 'windows' : /mac/i.test(s) ? 'macos' : /linux|x11|cros/i.test(s) ? 'linux' : null;
  };

  const best = r => {
    const files = r.assets.filter(a => a.p !== 'other');
    const kinds = [...new Set(files.map(a => a.p))];
    const want = [S.plat, S.host].find(p => kinds.includes(p)) || (kinds.length === 1 ? kinds[0] : null);
    return want ? files.filter(a => a.p === want).sort((x, y) => rank(x.n) - rank(y.n))[0] : null;
  };

  async function gh(path, slim, stale, mark) {
    const key = 'gh:' + path;
    let c = null;
    try { c = JSON.parse(store.get(key)); } catch {}
    const age = c ? Date.now() - c.t : Infinity;
    if (c && (stale || age < TTL || (mark && c.m === mark && !c.d?.length && age < DAY))) {
      net.t = Math.max(net.t, c.t);
      return c.d;
    }
    if (stale) return null;
    const save = v => { store.set(key, JSON.stringify(v)); net.ok++; net.t = Date.now(); return v.d; };
    try {
      const r = await fetch(API + path, { headers: { Accept: 'application/vnd.github+json', ...(c?.e ? { 'If-None-Match': c.e } : {}) } });
      if (r.status === 304 && c) return save({ ...c, t: Date.now(), m: mark });
      if (r.status === 404) return save({ t: Date.now(), m: mark, d: null });
      if (!r.ok) throw r.status;
      return save({ t: Date.now(), e: r.headers.get('etag'), m: mark, d: slim(await r.json()) });
    } catch {
      net.fail++;
      if (c) net.t = Math.max(net.t, c.t);
      return c ? c.d : null;
    }
  }

  const slimRepo = r => ({ repo: r.full_name, about: r.description, pushed: r.pushed_at });
  const slimRepos = d => d.filter(r => !r.fork && !r.archived).map(slimRepo);
  const slimReleases = d => d.filter(r => !r.draft).map(r => ({
    tag: r.tag_name, name: r.name, pre: r.prerelease, date: r.published_at || r.created_at,
    body: r.body, url: r.html_url, zip: r.zipball_url,
    assets: r.assets.map(a => ({ n: a.name, s: a.size, c: a.download_count, u: a.browser_download_url }))
  }));

  async function collect(stale) {
    const lists = await Promise.all([
      ...(CFG.owners || []).map(o => gh(`users/${o}/repos?per_page=100&sort=pushed`, slimRepos, stale)),
      ...(CFG.repos || []).map(r => gh('repos/' + r, d => [slimRepo(d)], stale))
    ]);
    const seen = new Set((CFG.hide || []).map(lc));
    const repos = lists.flat().filter(r => r && !seen.has(lc(r.repo)) && seen.add(lc(r.repo)));
    const rels = await Promise.all(repos.map(r => gh(`repos/${r.repo}/releases?per_page=100`, slimReleases, stale, r.pushed)));
    return repos.map((r, i) => ({ repo: r.repo, about: r.about, rel: rels[i] })).filter(a => a.rel?.length);
  }

  function shape(data) {
    const ids = new Set();
    return data.map(r => {
      const [owner, raw] = r.repo.split('/'), t = TUNE[lc(r.repo)] || {};
      let id = slug(raw) || slug(owner) || 'app';
      if (ids.has(id)) id = slug(r.repo);
      ids.add(id);
      const app = { id, repo: r.repo, rel: r.rel, name: t.name || title(raw), about: brief(t.about ?? r.about) };
      app.hue = t.hue ?? [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
      const files = app.rel.flatMap(x => x.assets);
      for (const a of files) a.p = plat(a.n);
      const now = KNOWN.filter(p => latestOf(app).assets.some(a => a.p === p));
      app.platforms = now.length ? now : KNOWN.filter(p => files.some(a => a.p === p));
      for (const a of files) a.p ||= app.platforms.length === 1 ? app.platforms[0] : 'other';
      return app;
    }).sort((x, y) => new Date(latestOf(y).date) - new Date(latestOf(x).date));
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

  function tint(h) {
    root.classList.toggle('tinted', h != null);
    if (h != null) root.style.setProperty('--h', h);
    else root.style.removeProperty('--h');
  }

  function icon() {
    const d = dark(), h = S.open?.hue;
    const [b, i] = d ? ['#2a2130', '#efe9da'] : ['#f3efe3', '#2f2333'];
    const a = h == null ? (d ? '#7fcbb3' : '#3f9a82') : `oklch(${d ? 78 : 58}% .11 ${h})`;
    $('#icon').href = 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${b}"/><rect x="8" y="9" width="4" height="13.5" rx="1.2" fill="${i}"/><rect x="13.5" y="12" width="4" height="10.5" rx="1.2" fill="${a}"/><rect x="20.5" y="10" width="4" height="12.5" rx="1.2" fill="${i}" transform="rotate(-12 20.5 22.5)"/><rect x="6" y="23.5" width="20" height="2.5" rx="1.25" fill="${i}"/></svg>`);
  }

  function cell(app) {
    const r = latestOf(app), a = best(r), q = $('.quick', app.li);
    q.hidden = !a;
    if (a) { q.href = a.u; q.title = `Download ${app.name} ${r.tag} for ${PLAT[a.p]}`; q.setAttribute('aria-label', q.title); }
  }

  function panel(app) {
    const rel = app.rel, mixed = rel.some(r => r.pre) && rel.some(r => !r.pre);
    $('.inner', app.li).innerHTML = `<div class="split"><aside class="rail">${
      rel.length > 6 ? `<input class="vq" type="search" placeholder="Filter versions" aria-label="Filter versions" value="${esc(S.vq)}">` : ''}${
      mixed ? `<div class="chips">${[['all', 'All'], ['stable', 'Stable'], ['pre', 'Pre-release']].map(([c, t]) => `<button data-c="${c}" aria-pressed="${S.chan === c}">${t}</button>`).join('')}</div>` : ''
    }<ol class="vers"></ol></aside><article class="rel"></article></div>`;
    rail(app);
    detail(app);
  }

  function rail(app) {
    const ol = $('.vers', app.li);
    if (!ol) return;
    const q = lc(S.vq.trim()), latest = latestOf(app);
    ol.innerHTML = app.rel
      .filter(r => (S.chan === 'all' || (S.chan === 'pre') === r.pre) && (!q || lc(`${r.tag} ${r.name || ''}`).includes(q)))
      .map(r => `<li><button data-tag="${esc(r.tag)}" aria-current="${r.tag === S.tag}"><span>${esc(r.tag)}</span><em>${r === latest ? 'Latest' : r.pre ? 'Pre' : ''}</em><time>${date(r.date)}</time></button></li>`)
      .join('') || '<li class="state">No versions</li>';
  }

  function detail(app) {
    const box = $('.rel', app.li);
    if (!box) return;
    const r = app.rel.find(x => x.tag === S.tag) || latestOf(app), main = best(r);
    const order = [...new Set([S.plat, S.host, ...Object.keys(PLAT)])].filter(p => r.assets.some(a => a.p === p));
    box.innerHTML = `<header><h3>${esc(r.tag)}</h3><p>${date(r.date)} · ${r.pre ? 'Pre-release' : 'Stable'}${r.name && r.name !== r.tag ? ' · ' + esc(r.name) : ''}</p></header>${
      main ? `<a class="get" href="${esc(main.u)}"><span>Download for ${PLAT[main.p]}</span><span>${esc(main.n)} · ${size(main.s)}</span></a>` : ''}${
      order.map(p => `<section class="group"><h4>${PLAT[p]}</h4>${r.assets.filter(a => a.p === p).sort((x, y) => rank(x.n) - rank(y.n)).map(a =>
        `<a class="file" href="${esc(a.u)}"><span>${esc(a.n)}</span><span>${arch(a.n)}</span><span>${size(a.s)}</span><span>${a.c.toLocaleString()} ↓</span></a>`).join('')}</section>`).join('')}${
      r.assets.length ? '' : '<p class="state">No files attached to this release.</p>'}${
      r.body ? `<div class="notes">${md(r.body)}</div>` : ''
    }<p class="links"><a href="${esc(r.url)}" target="_blank" rel="noopener">Release page ↗</a><a href="${esc(r.zip)}">Source .zip</a><a href="https://github.com/${esc(app.repo)}" target="_blank" rel="noopener">Repository ↗</a></p>`;
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
    const res = APPS.map(match), key = res.map(r => r ? 1 : 0).join('');
    const paint = () => {
      let n = 0;
      APPS.forEach((app, i) => {
        const hits = res[i];
        app.li.hidden = !hits;
        if (hits) n++;
        $('.hits', app.li).innerHTML = (hits || []).map(r => `<a href="#/${app.id}/${encodeURIComponent(r.tag)}">${esc(r.tag)}</a>`).join('');
      });
      $('#count').textContent = !APPS.length ? '' : n === APPS.length ? (n === 1 ? '1 app' : `${n} apps`) : `${n} of ${APPS.length}`;
      $('#empty').textContent = APPS.length ? 'Nothing matches.' : net.ok ? 'No releases yet.' : 'GitHub is out of reach.';
      $('#empty').hidden = n > 0 || !S.ready;
    };
    if (key !== lastKey && lastKey && document.startViewTransition && !still) document.startViewTransition(paint);
    else paint();
    lastKey = key;
  }

  function route(again) {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let tag = null;
    try { tag = decodeURIComponent(parts.slice(1).join('/')) || null; } catch {}
    const app = (parts[0] && (APPS.find(a => a.id === parts[0]) || APPS.find(a => a.id.startsWith(parts[0])))) || null;
    const changed = app !== S.open;
    if (changed && !again) { S.chan = 'all'; S.vq = ''; }
    S.open = app;
    S.tag = tag || (app ? latestOf(app).tag : null);
    for (const a of APPS) {
      const on = a === app;
      a.li.classList.toggle('open', on);
      $('.row', a.li).setAttribute('aria-expanded', on);
      $('.panel', a.li).inert = !on;
    }
    if (app) {
      if (changed) {
        panel(app);
        if (!again) setTimeout(() => {
          const t = app.li.getBoundingClientRect().top;
          if (S.open === app && (t < 0 || t > innerHeight * .4)) scrollTo({ top: scrollY + t - 16, behavior: still ? 'auto' : 'smooth' });
        }, 720);
      } else { rail(app); detail(app); }
    }
    tint(app?.hue);
    icon();
  }

  const list = $('#list'), q = $('#q'), tb = $('#theme'), det = $('#detect');

  function render(again) {
    list.classList.toggle('again', !!again);
    list.innerHTML = '';
    APPS.forEach((app, i) => {
      const li = app.li = document.createElement('li'), r = latestOf(app);
      li.className = 'app';
      li.style.cssText = `--h:${app.hue};--i:${i};view-transition-name:a-${app.id}`;
      li.innerHTML = `<div class="head"><button class="row" aria-expanded="false"><span class="idx">${String(i + 1).padStart(2, '0')}</span><span class="what"><span class="name">${esc(app.name)}</span><span class="brief">${esc(app.about)}</span></span><span class="plats">${app.platforms.map(p => PLAT[p]).join(' · ')}</span><span class="ver"><b>${esc(r.tag)}</b><time>${date(r.date)}</time></span></button><a class="quick" hidden>↓</a></div><div class="hits"></div><div class="panel" inert><div class="inner"></div></div>`;
      list.append(li);
      cell(app);
    });
    const chips = KNOWN.map(p => [p, APPS.filter(a => a.platforms.includes(p)).length]).filter(([, n]) => n);
    if (!chips.some(([p]) => p === S.plat)) S.plat = null;
    $('#plats').innerHTML = chips.map(([p, n]) => `<button data-p="${p}" aria-pressed="${S.plat === p}">${PLAT[p]}<sup>${n}</sup></button>`).join('');
    S.open = null;
    lastKey = '';
    update();
    route(again);
  }

  function theme(m) {
    mode = m;
    if (m === 'auto') delete root.dataset.theme;
    else root.dataset.theme = m;
    store.set('theme', m);
    tb.textContent = m;
    tb.setAttribute('aria-label', 'Theme: ' + m);
    icon();
  }

  function detect(on) {
    S.host = on ? sniff() : null;
    det.setAttribute('aria-pressed', on);
    $('#sense').textContent = on
      ? `${S.host ? PLAT[S.host] : 'Not recognised'} · stays on this device`
      : 'Reads your browser’s platform to put matching files first. Stays on this device.';
    store.set('detect', on ? '1' : '0');
    APPS.forEach(cell);
    if (S.open) detail(S.open);
  }

  $('#plats').addEventListener('click', e => {
    const b = e.target.closest('[data-p]');
    if (!b) return;
    S.plat = S.plat === b.dataset.p ? null : b.dataset.p;
    for (const x of b.parentNode.children) x.setAttribute('aria-pressed', x.dataset.p === S.plat);
    update();
    APPS.forEach(cell);
    if (S.open) detail(S.open);
  });

  list.addEventListener('click', e => {
    const app = byLi(e.target);
    if (!app) return;
    if (e.target.closest('.row')) { location.hash = S.open === app ? '#/' : '#/' + app.id; return; }
    const v = e.target.closest('[data-tag]'), c = e.target.closest('[data-c]');
    if (v) {
      S.tag = v.dataset.tag;
      history.replaceState(null, '', `#/${app.id}/${encodeURIComponent(S.tag)}`);
      for (const b of app.li.querySelectorAll('[data-tag]')) b.setAttribute('aria-current', b === v);
      detail(app);
    } else if (c) {
      S.chan = c.dataset.c;
      for (const b of c.parentNode.children) b.setAttribute('aria-pressed', b === c);
      rail(app);
    }
  });

  list.addEventListener('input', e => {
    if (e.target.matches('.vq')) { S.vq = e.target.value; rail(byLi(e.target)); }
  });
  list.addEventListener('mouseover', e => { const app = byLi(e.target); if (app) tint(app.hue); });
  list.addEventListener('mouseleave', () => tint(S.open?.hue));
  q.addEventListener('input', () => { S.q = q.value; update(); });
  tb.addEventListener('click', () => theme(MODES[(MODES.indexOf(mode) + 1) % MODES.length]));
  det.addEventListener('click', () => detect(det.getAttribute('aria-pressed') !== 'true'));
  mq.addEventListener('change', icon);

  addEventListener('keydown', e => {
    const f = document.activeElement, typing = /INPUT|TEXTAREA/.test(f.tagName);
    if (e.key === '/' && !typing) { e.preventDefault(); q.focus(); }
    else if (e.key === 'Escape') {
      if (f === q && q.value) { q.value = S.q = ''; update(); }
      else if (S.open) location.hash = '#/';
      else f.blur();
    } else if (/^Arrow(Down|Up)$/.test(e.key) && (f === q || f.matches('.row'))) {
      const rows = [...list.querySelectorAll('.app:not([hidden]) .row')];
      const i = rows.indexOf(f) + (e.key === 'ArrowDown' ? 1 : -1);
      e.preventDefault();
      (i < 0 ? q : rows[i] || f).focus();
    }
  });

  addEventListener('hashchange', () => route());

  async function boot() {
    const draw = (d, again) => {
      const s = JSON.stringify(d);
      if (s === sig) return;
      sig = s;
      APPS = shape(d);
      render(again);
    };
    const old = await collect(true);
    if (old.length) draw(old, false);
    const now = await collect(false);
    S.ready = true;
    if (now.length || !APPS.length) draw(now, APPS.length > 0);
    $('main').removeAttribute('aria-busy');
    update();
    $('#sync').textContent = !net.t ? 'GitHub unreachable' : (net.fail ? (net.ok ? 'Partly synced ' : 'Saved copy · ') : 'Synced ') + stamp(net.t);
  }

  document.title = CFG.name;
  $('#site').textContent = CFG.name;
  theme(MODES.includes(store.get('theme')) ? store.get('theme') : 'auto');
  detect(store.get('detect') === '1');
  boot();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
