// Planetas em pixel colorido com pontilhado (retícula Bayer), no estilo da referência visual do menu:
// cada objeto é uma grade de quadradinhos com vão entre eles, sombreada como uma esfera iluminada e girando devagar.
// Objetos: galáxia, Júpiter, Marte, Lua, Saturno, nebulosa e Terra. Só desenho (canvas), sem regra de jogo.
// No DOM de teste (sem getContext) devolve o canvas vazio. O laço de animação para quando o canvas sai da tela.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hash = (x, y) => { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); };
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const s = (t) => t * t * (3 - 2 * t);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * s(xf) + (c - a) * s(yf) + (a - b - c + d) * s(xf) * s(yf);
}
const fbm = (x, y) => noise(x, y) * 0.6 + noise(x * 2.1, y * 2.1) * 0.3 + noise(x * 4.3, y * 4.3) * 0.1;
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Esfera: devolve [cor rgb, brilho 0..1] ou null fora do disco. `tex(lon, lat)` dá a cor da superfície.
function sphere(u, v, r, t, speed, tex) {
  const d2 = (u * u + v * v) / (r * r);
  if (d2 >= 1) return null;
  const z = Math.sqrt(1 - d2);
  const nx = u / r, ny = v / r;
  const light = Math.max(0, -0.55 * nx - 0.45 * ny + 0.7 * z);
  const lon = Math.atan2(nx, z) + t * speed;
  return [tex(lon, ny), 0.18 + 0.95 * light];
}

const P = {
  jupiter: [hex('#f1e2c4'), hex('#d39a63'), hex('#b8643a'), hex('#e9c99a')],
  saturn: [hex('#efdcae'), hex('#d8b878')],
  moon: hex('#c9cbd2'), moonDark: hex('#7f838e'),
  mars: hex('#c95a34'), marsDark: hex('#8a301b'),
  ocean: hex('#2d6fd2'), land: hex('#4fae6b'), cloud: hex('#f4f7ff'),
};

const SCENES = {
  jupiter: (u, v, t) => sphere(u, v, 0.9, t, 0.35, (lon, lat) => {
    const band = Math.sin(lat * 9 + fbm(lon * 1.5, lat * 3) * 2.2);
    const i = band > 0.55 ? 0 : band > 0 ? 3 : band > -0.5 ? 1 : 2;
    return P.jupiter[i];
  }),
  mars: (u, v, t) => sphere(u, v, 0.9, t, 0.3, (lon, lat) => {
    if (Math.abs(lat) > 0.86) return P.cloud;
    return fbm(lon * 2 + 3, lat * 2.4) > 0.55 ? P.marsDark : P.mars;
  }),
  moon: (u, v, t) => sphere(u, v, 0.9, t, 0.2, (lon, lat) => (fbm(lon * 2.6 + 9, lat * 2.6) > 0.58 ? P.moonDark : P.moon)),
  earth: (u, v, t) => sphere(u, v, 0.92, t, 0.25, (lon, lat) => {
    if (fbm(lon * 2.2 + t * 0.15, lat * 3.2 + 4) > 0.64) return P.cloud;
    return fbm(lon * 1.6, lat * 1.9) > 0.52 ? P.land : P.ocean;
  }),
  saturn: (u, v, t) => {
    const tilt = -0.32, c = Math.cos(tilt), s = Math.sin(tilt);
    const x = u * c + v * s, y = -u * s + v * c;       // eixo do anel inclinado
    const rr = Math.hypot(x, y * 3.2);                 // anel achatado em perspectiva
    const ring = rr > 0.95 && rr < 1.7 && !(rr > 1.28 && rr < 1.36); // com a divisão de Cassini
    const body = sphere(x, y, 0.7, t, 0.3, (lon, lat) => P.saturn[Math.sin(lat * 9) > 0 ? 0 : 1]);
    if (ring && (y > 0 || !body)) return [P.saturn[rr < 1.28 ? 1 : 0], 1.05 - (rr - 0.95) * 0.45];
    return body;
  },
  galaxy: (u, v, t) => {
    const r = Math.hypot(u, v * 1.6);
    if (r > 1.05) return null;
    const a = Math.atan2(v * 1.6, u);
    const arm = Math.cos(2 * a - Math.log(r + 0.05) * 3.2 - t * 0.4);
    const dens = Math.exp(-r * 2.4) * 1.3 + Math.max(0, arm) * Math.exp(-r * 1.4) * 0.7 + (hash(Math.floor(u * 40), Math.floor(v * 40)) > 0.985 ? 0.8 : 0);
    if (dens < 0.08) return null;
    const k = hash(Math.floor(u * 60), Math.floor(v * 60));
    const col = r < 0.25 ? [255, 244, 230] : k > 0.66 ? [196, 160, 255] : k > 0.33 ? [150, 190, 255] : [255, 170, 210];
    return [col, Math.min(1.1, dens)];
  },
  nebula: (u, v, t) => {
    const f = fbm(u * 2 + t * 0.08, v * 4.5 + 2) * Math.exp(-(u * u * 1.1 + v * v * 4));
    if (f < 0.24 || hash(Math.floor(u * 50), Math.floor(v * 50)) > 0.82) return null;
    const col = mix(hex('#3fbf7f'), hex('#eafff3'), Math.min(1, (f - 0.16) * 2.4));
    return [col, 0.5 + f * 1.2];
  },
};

// Canvas animado com um ou mais objetos. `items`: [{ kind, x, y, size }] em fração da área (0..1).
// `ambient` clareia o lado da sombra (miniaturas pequenas precisam, senão só a parte iluminada aparece);
// `minCell` é o menor quadradinho em pixels.
export function pixelSpace({ items, width = 320, height = 200, cells = 56, fps = 12, label = '', ambient = 0, minCell = 3 }) {
  const canvas = document.createElement('canvas');
  canvas.className = 'pixel-space';
  canvas.setAttribute('aria-hidden', 'true');
  if (label) canvas.title = label;
  if (typeof canvas.getContext !== 'function' || typeof window === 'undefined') return canvas;
  const ctx = canvas.getContext('2d');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const born = performance.now();
  let attached = false;
  let last = 0;

  const draw = (now) => {
    const t = (now - born) / 1000;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round((canvas.clientWidth || width) * dpr), h = Math.round((canvas.clientHeight || height) * dpr);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.clearRect(0, 0, w, h);
    const cell = Math.max(minCell, Math.round(Math.min(w, h) / cells));
    const gap = Math.max(1, Math.round(cell * 0.18));
    const cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
    for (let gy = 0; gy < rows; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const px = (gx + 0.5) * cell, py = (gy + 0.5) * cell;
        let hit = null;
        for (const it of items) {
          const half = (it.size * Math.min(w, h)) / 2;
          const u = (px - it.x * w) / half, v = (py - it.y * h) / half;
          if (Math.abs(u) > 2 || Math.abs(v) > 2) continue;
          const res = SCENES[it.kind](u, v, t);
          if (res) { hit = res; break; }
        }
        if (!hit) continue;
        const [col, raw] = hit;
        const bright = raw + ambient;
        const threshold = (BAYER[(gy & 3) * 4 + (gx & 3)] + 0.5) / 16;
        if (bright < threshold * 0.85) continue; // retícula: na sombra os quadradinhos rareiam
        const k = Math.min(1.15, 0.35 + bright * 0.8);
        ctx.fillStyle = `rgb(${col.map((c) => Math.min(255, Math.round(c * k))).join(',')})`;
        ctx.fillRect(gx * cell, gy * cell, cell - gap, cell - gap);
      }
    }
  };
  const loop = (now) => {
    if (canvas.isConnected) attached = true;
    else if (attached || now - born > 2000) return; // saiu da tela: encerra o laço
    if (now - last >= 1000 / fps && !document.hidden) { last = now; draw(now); }
    requestAnimationFrame(loop);
  };
  draw(born);
  if (!reduced) requestAnimationFrame(loop);
  return canvas;
}
