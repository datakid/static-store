window.QR = (() => {
  const L = [[7, 1, 19], [10, 1, 34], [15, 1, 55], [20, 1, 80], [26, 1, 108], [18, 2, 68], [20, 2, 78], [24, 2, 97], [30, 2, 116], [18, 2, 68, 2, 69], [20, 4, 81], [24, 2, 92, 2, 93], [26, 4, 107]];
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 285; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => a && b ? EXP[LOG[a] + LOG[b]] : 0;
  const gen = n => {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const r = new Array(g.length + 1).fill(0);
      g.forEach((c, j) => { r[j] ^= c; r[j + 1] ^= mul(c, EXP[i]); });
      g = r;
    }
    return g;
  };
  const rs = (data, n) => {
    const g = gen(n), r = new Array(n).fill(0);
    for (const d of data) {
      const f = d ^ r.shift();
      r.push(0);
      for (let i = 0; i < n; i++) r[i] ^= mul(g[i + 1], f);
    }
    return r;
  };
  const MASKS = [
    (r, c) => (r + c) % 2 === 0,
    r => r % 2 === 0,
    (r, c) => c % 3 === 0,
    (r, c) => (r + c) % 3 === 0,
    (r, c) => ((r >> 1) + ((c / 3) | 0)) % 2 === 0,
    (r, c) => r * c % 2 + r * c % 3 === 0,
    (r, c) => (r * c % 2 + r * c % 3) % 2 === 0,
    (r, c) => ((r + c) % 2 + r * c % 3) % 2 === 0
  ];

  const penalty = (Q, N) => {
    let s = 0, dark = 0;
    for (let a = 0; a < 2; a++) for (let i = 0; i < N; i++) {
      let run = 0, prev = null, h = '';
      for (let j = 0; j < N; j++) {
        const v = a ? Q[j][i] : Q[i][j];
        h += v ? 1 : 0;
        if (v === prev) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else { run = 1; prev = v; }
      }
      s += 40 * (h.match(/(?=10111010000|00001011101)/g) || []).length;
    }
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
      if (Q[r][c]) dark++;
      if (r < N - 1 && c < N - 1 && Q[r][c] === Q[r + 1][c] && Q[r][c] === Q[r][c + 1] && Q[r][c] === Q[r + 1][c + 1]) s += 3;
    }
    return s + 10 * Math.floor(Math.abs(dark * 100 / (N * N) - 50) / 5);
  };

  function make(text) {
    const bytes = [...new TextEncoder().encode(text)];
    let v = 0;
    for (; v < L.length; v++) { const [, n1, d1, n2 = 0, d2 = 0] = L[v]; if (n1 * d1 + n2 * d2 >= bytes.length + (v < 9 ? 2 : 3)) break; }
    if (v === L.length) return null;
    const ver = v + 1, [ec, n1, d1, n2 = 0, d2 = 0] = L[v], cap = n1 * d1 + n2 * d2;
    const bits = [];
    const put = (x, n) => { for (let i = n - 1; i >= 0; i--) bits.push(x >> i & 1); };
    put(4, 4);
    put(bytes.length, ver < 10 ? 8 : 16);
    bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => a << 1 | b, 0));
    for (let p = 0; data.length < cap; p ^= 1) data.push(p ? 17 : 236);
    const blocks = [], ecs = [];
    let k = 0;
    [[n1, d1], [n2, d2]].forEach(([n, d]) => { for (let i = 0; i < n; i++) { const b = data.slice(k, k += d); blocks.push(b); ecs.push(rs(b, ec)); } });
    const out = [];
    for (let i = 0; i < Math.max(d1, d2); i++) blocks.forEach(b => { if (i < b.length) out.push(b[i]); });
    for (let i = 0; i < ec; i++) ecs.forEach(e => out.push(e[i]));

    const N = ver * 4 + 17;
    const M = Array.from({ length: N }, () => new Array(N).fill(false));
    const F = Array.from({ length: N }, () => new Array(N).fill(false));
    const set = (r, c, on) => { M[r][c] = on; F[r][c] = true; };
    const finder = (r, c) => {
      for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
        const y = r + i, x = c + j;
        if (y < 0 || x < 0 || y >= N || x >= N) continue;
        const ring = Math.max(Math.abs(i - 3), Math.abs(j - 3));
        set(y, x, ring !== 2 && ring !== 4);
      }
    };
    finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
    for (let i = 8; i < N - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const last = ver * 4 + 10, A = ver < 2 ? [] : ver < 7 ? [6, last] : [6, (6 + last) / 2, last];
    for (const r of A) for (const c of A) {
      if ((r < 9 && c < 9) || (r < 9 && c > N - 10) || (r > N - 10 && c < 9)) continue;
      for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1);
    }
    for (let i = 0; i < 9; i++) { if (!F[8][i]) set(8, i, false); if (!F[i][8]) set(i, 8, false); }
    for (let i = 0; i < 8; i++) { set(8, N - 1 - i, false); set(N - 1 - i, 8, false); }
    set(N - 8, 8, true);
    if (ver >= 7) {
      let b = ver;
      for (let i = 0; i < 12; i++) b = b << 1 ^ (b >> 11) * 0x1F25;
      const vi = ver << 12 | b;
      for (let i = 0; i < 18; i++) { const on = (vi >> i & 1) === 1, a = N - 11 + i % 3, c = (i / 3) | 0; set(a, c, on); set(c, a, on); }
    }
    let idx = 0;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      const up = ((right + 1) & 2) === 0;
      for (let vert = 0; vert < N; vert++) for (let j = 0; j < 2; j++) {
        const x = right - j, y = up ? N - 1 - vert : vert;
        if (F[y][x]) continue;
        M[y][x] = idx < out.length * 8 && (out[idx >> 3] >> (7 - (idx & 7)) & 1) === 1;
        idx++;
      }
    }
    const format = (Q, m) => {
      const d = 8 | m;
      let b = d;
      for (let i = 0; i < 10; i++) b = b << 1 ^ (b >> 9) * 0x537;
      const f = (d << 10 | b) ^ 0x5412, bit = i => (f >> i & 1) === 1;
      for (let i = 0; i < 6; i++) Q[i][8] = bit(i);
      Q[7][8] = bit(6); Q[8][8] = bit(7); Q[8][7] = bit(8);
      for (let i = 9; i < 15; i++) Q[8][14 - i] = bit(i);
      for (let i = 0; i < 8; i++) Q[8][N - 1 - i] = bit(i);
      for (let i = 8; i < 15; i++) Q[N - 15 + i][8] = bit(i);
      Q[N - 8][8] = true;
    };
    let best = null, low = Infinity;
    MASKS.forEach((fn, m) => {
      const Q = M.map((row, r) => row.map((on, c) => F[r][c] ? on : on !== fn(r, c)));
      format(Q, m);
      const p = penalty(Q, N);
      if (p < low) { low = p; best = Q; }
    });
    return { n: N, m: best };
  }

  return text => {
    const q = make(text);
    if (!q) return '';
    let d = '';
    q.m.forEach((row, r) => row.forEach((on, c) => { if (on) d += `M${c} ${r}h1v1h-1z`; }));
    const s = q.n + 8;
    return `<svg viewBox="-4 -4 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="QR code"><rect x="-4" y="-4" width="${s}" height="${s}" fill="#fff"/><path d="${d}" fill="#141214"/></svg>`;
  };
})();
