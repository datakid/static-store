(() => {
  const { name: SITE, apps: APPS } = window.STORE;
  const API = 'https://api.github.com/repos/';
  const TTL = 9e5;
  const PLAT = { android: 'Android', windows: 'Windows', linux: 'Linux', macos: 'macOS', other: 'Other' };
  const RANK = ['.exe', '.msi', '.apk', '.appimage', '.deb', '.rpm', '.dmg', '.zip', '.tar.gz'];
  const S = { q: '', plat: null, open: null, tag: null, chan: 'all', vq: '' };

  const root = document.documentElement;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ua = navigator.userAgent;
  const HOST = /android/i.test(ua) ? 'android' : /win/i.test(ua) ? 'windows' : /mac/i.test(ua) ? 'macos' : /linux|x11/i.test(ua) ? 'linux' : null;
  const still = matchMedia('(prefers-reduced-motion:reduce)').matches;
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  const date = d => d ? fmt.format(new Date(d)) : '';
  const size = b => b > 1048576 ? (b / 1048576).toFixed(b > 104857600 ? 0 : 1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB';
  const arch = n => /arm64|aarch64/i.test(n) ? 'arm64' : /x86_64|x64|amd64/i.test(n) ? 'x64' : /armeabi|armv7/i.test(n) ? 'arm' : /x86|i686|ia32/i.test(n) ? 'x86' : /universal/i.test(n) ? 'universal' : '';
  const rank = n => { const i = RANK.findIndex(x => n.toLowerCase().endsWith(x)); return i < 0 ? 99 : i; };
  const latestOf = app => app.rel?.find(r => !r.pre) || app.rel?.[0];
  const about = app => app.about || app.info?.about || '';
  const byLi = node => APPS.find(a => a.li === node.closest('.app'));

  const classify = (n, app) => {
    if (/\.(sig|blockmap|ya?ml|json|sha256|sha512|asc|txt)$/i.test(n)) return 'other';
    if (/\.(apk|aab)$/i.test(n)) return 'android';
    if (/\.(dmg|pkg)$|darwin|macos|osx/i.test(n)) return 'macos';
    if (/\.(exe|msi|msix)$|windows|win32|win64|(^|[-_.])win([-_.]|$)/i.test(n)) return 'windows';
    if (/\.(appimage|deb|rpm)$|linux/i.test(n)) return 'linux';
    return app.platforms.length === 1 ? app.platforms[0] : 'other';
  };

  const sorted = (app, r) => r.assets.map(a => ({ ...a, p: classify(a.n, app) }));

  const best = (app, r) => {
    const list = sorted(app, r).filter(a => a.p !== 'other');
    const want = [S.plat, HOST].find(p => p && list.some(a => a.p === p));
    return list.filter(a => !want || a.p === want).sort((x, y) => rank(x.n) - rank(y.n))[0];
  };

  async function gh(path, slim) {
    const key = 'gh:' + path;
    let c = null;
    try { c = JSON.parse(localStorage.getItem(key)); } catch {}
    if (c && Date.now() - c.t < TTL) return c.d;
    const save = v => { try { localStorage.setItem(key, JSON.stringify(v)); } catch {} return v.d; };
    try {
      const r = await fetch(API + path, { headers: { Accept: 'application/vnd.github+json', ...(c?.e ? { 'If-None-Match': c.e } : {}) } });
      if (r.status === 304 && c) return save({ ...c, t: Date.now() });
      if (r.status === 404) return save({ t: Date.now(), d: null });
      if (!r.ok) throw r.status;
      return save({ t: Date.now(), e: r.headers.get('etag'), d: slim(await r.json()) });
    } catch { return c ? c.d : null; }
  }

  const slimReleases = d => d.filter(r => !r.draft).map(r => ({
    tag: r.tag_name, name: r.name, pre: r.prerelease, date: r.published_at || r.created_at,
    body: r.body, url: r.html_url, zip: r.zipball_url,
    assets: r.assets.map(a => ({ n: a.name, s: a.size, c: a.download_count, u: a.browser_download_url }))
  }));

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
  }

  function cell(app) {
    const r = latestOf(app), q = $('.quick', app.li);
    $('.ver', app.li).innerHTML = r ? `<b>${esc(r.tag)}</b><time>${date(r.date)}</time>` : `<time>${app.rel ? 'Unreleased' : '—'}</time>`;
    const a = r && best(app, r);
    q.hidden = !a;
    if (a) { q.href = a.u; q.title = `Download ${app.name} ${r.tag} for ${PLAT[a.p]}`; q.setAttribute('aria-label', q.title); }
  }

  function panel(app) {
    const box = $('.inner', app.li), rel = app.rel;
    const head = `<div class="about"><p>${esc(about(app))}</p><a class="ext" href="https://github.com/${esc(app.repo)}" target="_blank" rel="noopener">GitHub ↗</a></div>`;
    if (!rel || !rel.length) {
      box.innerHTML = head + `<p class="state">${rel === undefined ? 'Loading' : rel ? 'No releases published yet.' : 'Releases unavailable right now.'}</p>`;
      return;
    }
    const mixed = rel.some(r => r.pre) && rel.some(r => !r.pre);
    box.innerHTML = head + `<div class="split"><aside class="rail">${
      rel.length > 6 ? `<input class="vq" type="search" placeholder="Filter versions" aria-label="Filter versions" value="${esc(S.vq)}">` : ''}${
      mixed ? `<div class="chips">${[['all', 'All'], ['stable', 'Stable'], ['pre', 'Pre-release']].map(([c, t]) => `<button data-c="${c}" aria-pressed="${S.chan === c}">${t}</button>`).join('')}</div>` : ''
    }<ol class="vers"></ol></aside><article class="rel"></article></div>`;
    rail(app);
    detail(app);
  }

  function rail(app) {
    const ol = $('.vers', app.li);
    if (!ol) return;
    const q = S.vq.trim().toLowerCase(), latest = latestOf(app);
    ol.innerHTML = app.rel
      .filter(r => (S.chan === 'all' || (S.chan === 'pre') === r.pre) && (!q || `${r.tag} ${r.name || ''}`.toLowerCase().includes(q)))
      .map(r => `<li><button data-tag="${esc(r.tag)}" aria-current="${r.tag === S.tag}"><span>${esc(r.tag)}</span><em>${r === latest ? 'Latest' : r.pre ? 'Pre' : ''}</em><time>${date(r.date)}</time></button></li>`)
      .join('') || '<li class="state">No versions</li>';
  }

  function detail(app) {
    const box = $('.rel', app.li);
    if (!box) return;
    const r = app.rel.find(x => x.tag === S.tag) || latestOf(app);
    const assets = sorted(app, r), main = best(app, r);
    const order = [...new Set([S.plat, HOST, 'windows', 'linux', 'android', 'macos', 'other'])].filter(p => p && assets.some(a => a.p === p));
    box.innerHTML = `<header><h3>${esc(r.tag)}</h3><p>${date(r.date)} · ${r.pre ? 'Pre-release' : 'Stable'}${r.name && r.name !== r.tag ? ' · ' + esc(r.name) : ''}</p></header>${
      main ? `<a class="get" href="${esc(main.u)}"><span>Download for ${PLAT[main.p]}</span><span>${esc(main.n)} · ${size(main.s)}</span></a>` : ''}${
      order.map(p => `<section class="group"><h4>${PLAT[p]}</h4>${assets.filter(a => a.p === p).sort((x, y) => rank(x.n) - rank(y.n)).map(a =>
        `<a class="file" href="${esc(a.u)}"><span>${esc(a.n)}</span><span>${arch(a.n)}</span><span>${size(a.s)}</span><span>${a.c.toLocaleString()} ↓</span></a>`).join('')}</section>`).join('')}${
      assets.length ? '' : '<p class="state" style="padding:1.5rem 0 0">No files attached to this release.</p>'}${
      r.body ? `<div class="notes">${md(r.body)}</div>` : ''
    }<p class="links"><a href="${esc(r.url)}" target="_blank" rel="noopener">Release page ↗</a><a href="${esc(r.zip)}">Source .zip</a></p>`;
  }

  function match(app) {
    if (S.plat && ![...app.platforms, ...(app.soon || [])].includes(S.plat)) return null;
    const toks = S.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = [app.name, app.repo, about(app), ...app.platforms.map(p => PLAT[p])].join(' ').toLowerCase();
    const rest = toks.filter(t => !hay.includes(t));
    if (!rest.length) return [];
    const hits = (app.rel || []).filter(r => { const h = `${r.tag} ${r.name || ''}`.toLowerCase(); return rest.every(t => h.includes(t)); });
    return hits.length ? hits.slice(0, 6) : null;
  }

  let lastKey = '';
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
      $('#count').textContent = n === APPS.length ? `${n} apps` : `${n} of ${APPS.length}`;
      $('#empty').hidden = n > 0;
    };
    if (key !== lastKey && lastKey && document.startViewTransition && !still) document.startViewTransition(paint);
    else paint();
    lastKey = key;
  }

  function route() {
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    let tag = null;
    try { tag = decodeURIComponent(parts.slice(1).join('/')) || null; } catch {}
    const app = APPS.find(a => a.id === parts[0]) || null, changed = app !== S.open;
    if (changed) { S.chan = 'all'; S.vq = ''; }
    S.open = app;
    S.tag = tag || latestOf(app || {})?.tag || null;
    for (const a of APPS) {
      const on = a === app;
      a.li.classList.toggle('open', on);
      $('.row', a.li).setAttribute('aria-expanded', on);
      $('.panel', a.li).inert = !on;
    }
    if (app) {
      if (changed) {
        panel(app);
        setTimeout(() => {
          const t = app.li.getBoundingClientRect().top;
          if (S.open === app && (t < 0 || t > innerHeight * .4)) scrollTo({ top: scrollY + t - 16, behavior: still ? 'auto' : 'smooth' });
        }, 720);
      } else { rail(app); detail(app); }
    }
    tint(app?.hue);
  }

  async function load(app) {
    const [rel, info] = await Promise.all([
      gh(app.repo + '/releases?per_page=100', slimReleases),
      gh(app.repo, d => ({ about: d.description }))
    ]);
    app.rel = rel;
    app.info = info;
    cell(app);
    if (S.open === app) { S.tag ||= latestOf(app)?.tag || null; panel(app); }
    update();
  }

  const list = $('#list'), q = $('#q');
  document.title = SITE;
  $('.mark').textContent = SITE;

  APPS.forEach((app, i) => {
    app.hue ??= [...app.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
    const li = app.li = document.createElement('li');
    li.className = 'app';
    li.style.cssText = `--h:${app.hue};--i:${i};view-transition-name:a-${app.id}`;
    const plats = [...app.platforms.map(p => PLAT[p]), ...(app.soon || []).map(p => `<s>${PLAT[p]} soon</s>`)].join(' · ');
    li.innerHTML = `<div class="head"><button class="row" aria-expanded="false"><span class="idx">${String(i + 1).padStart(2, '0')}</span><span class="name">${esc(app.name)}</span><span class="plats">${plats}</span><span class="ver"><i class="dots"></i></span></button><a class="quick" hidden>↓</a></div><div class="hits"></div><div class="panel" inert><div class="inner"></div></div>`;
    list.append(li);
  });

  $('#plats').innerHTML = Object.keys(PLAT)
    .map(p => [p, APPS.filter(a => [...a.platforms, ...(a.soon || [])].includes(p)).length])
    .filter(([, n]) => n)
    .map(([p, n]) => `<button data-p="${p}" aria-pressed="false">${PLAT[p]}<sup>${n}</sup></button>`).join('');

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

  $('#theme').addEventListener('click', () => {
    localStorage.theme = root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  });

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

  addEventListener('hashchange', route);
  update();
  route();
  Promise.all(APPS.map(load)).then(() => {
    $('#sync').textContent = APPS.every(a => a.rel === null) ? 'GitHub unreachable' : 'Synced ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });
})();
