// "Fotos" 3D dos itens da oficina: desenhos isométricos sombreados (luz do alto à esquerda, sombra no chão),
// como foto de produto em fundo de estúdio. SVG embutido, sem imagens externas. Só desenho, sem regra de jogo.
// Chaves = campo `visual` de data/parts.js e data/instruments.js; foguetes pelo id de data/launchers.js.

const C30 = Math.cos(Math.PI / 6), S30 = 0.5;
const OX = 80, OY = 64; // origem na tela (viewBox 160×100)
// projeção isométrica: x para a direita-baixo, y para a esquerda-baixo, z para cima
const P = (x, y, z) => [OX + (x - y) * C30, OY + (x + y) * S30 - z];
const pts = (list) => list.map((p) => P(...p).map((n) => n.toFixed(1)).join(',')).join(' ');
const poly = (list, fill, extra = '') => `<polygon points="${pts(list)}" fill="${fill}" ${extra}/>`;

// Caixa com as três faces visíveis: topo claro, lado esquerdo médio, lado direito escuro.
function box(x, y, z, w, d, h, [top, left, right], stroke = 'rgba(0,0,0,.25)') {
  const s = `stroke="${stroke}" stroke-width=".6" stroke-linejoin="round"`;
  return poly([[x, y, z + h], [x + w, y, z + h], [x + w, y + d, z + h], [x, y + d, z + h]], top, s)
    + poly([[x, y + d, z], [x + w, y + d, z], [x + w, y + d, z + h], [x, y + d, z + h]], left, s)
    + poly([[x + w, y, z], [x + w, y + d, z], [x + w, y + d, z + h], [x + w, y, z + h]], right, s);
}
// Cilindro em pé (eixo z), com degradê lateral e tampa.
function cyl(cx, cy, z, r, h, [top, side1, side2], id) {
  const [tx, ty] = P(cx, cy, z + h), [bx, by] = P(cx, cy, z);
  const rx = r * 1.22, ry = r * 0.7;
  return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${side1}"/><stop offset="1" stop-color="${side2}"/></linearGradient></defs>`
    + `<path d="M${tx - rx},${ty} L${bx - rx},${by} A${rx},${ry} 0 0 0 ${bx + rx},${by} L${tx + rx},${ty} Z" fill="url(#${id})" stroke="rgba(0,0,0,.25)" stroke-width=".6"/>`
    + `<ellipse cx="${tx}" cy="${ty}" rx="${rx}" ry="${ry}" fill="${top}" stroke="rgba(0,0,0,.2)" stroke-width=".6"/>`;
}
const shadow = (w = 46, y = 74) => `<ellipse cx="${OX}" cy="${y}" rx="${w}" ry="${w * 0.22}" fill="rgba(0,0,0,.45)" filter="url(#soft)"/>`;
const frame = (body, w, y) => `<svg viewBox="0 0 160 100" class="item-photo-svg" aria-hidden="true" focusable="false">`
  + `<defs><filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>`
  + `<radialGradient id="studio" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#2a2d36"/><stop offset="1" stop-color="#0d0e12"/></radialGradient></defs>`
  + `<rect width="160" height="100" fill="url(#studio)"/>${shadow(w, y)}${body}</svg>`;

const GOLD = ['#f3d27a', '#c99a2e', '#8f6a17'];
const STEEL = ['#e9edf3', '#b9c0cc', '#7d8594'];
const DARK = ['#5a606c', '#3a3f49', '#252830'];
const SOLAR = ['#4d7fe0', '#2f5db8', '#1d3f86'];

function solarGrid(x, y, z, w, d, cols, rows) {
  let lines = '';
  for (let i = 1; i < cols; i++) { const a = P(x + (w * i) / cols, y, z), b = P(x + (w * i) / cols, y + d, z); lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  for (let j = 1; j < rows; j++) { const a = P(x, y + (d * j) / rows, z), b = P(x + w, y + (d * j) / rows, z); lines += `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`; }
  return `<g stroke="rgba(190,215,255,.55)" stroke-width=".5">${lines}</g>`;
}

const ART = {
  panel: () => frame(box(-6, -6, 0, 12, 12, 8, STEEL) + box(-30, -20, 14, 60, 40, 2.5, SOLAR) + solarGrid(-30, -20, 16.5, 60, 40, 6, 4), 40, 76),
  panel_large: () => frame(box(-9, -9, 0, 18, 18, 22, GOLD)
    + box(-52, -12, 12, 40, 24, 2, SOLAR) + solarGrid(-52, -12, 14, 40, 24, 5, 3)
    + box(12, -12, 12, 40, 24, 2, SOLAR) + solarGrid(12, -12, 14, 40, 24, 5, 3), 54, 78),
  battery: () => frame(box(-20, -14, 0, 40, 28, 26, ['#7fd39a', '#3f9a5d', '#2a6b40']) + box(-20, -14, 10, 40, 28, 6, DARK)
    + cyl(-8, -2, 26, 5, 5, ['#f2f2f2', '#c9c9c9', '#7a7a7a'], 'bt1') + cyl(9, -2, 26, 5, 5, ['#f2f2f2', '#c9c9c9', '#7a7a7a'], 'bt2'), 40, 76),
  antenna: () => frame(box(-12, -12, 0, 24, 24, 14, STEEL)
    + `<g stroke="#e9edf3" stroke-width="1.6" stroke-linecap="round"><line x1="${P(0, 0, 14).join(',').replace(',', '" y1="')}" x2="${P(-14, 8, 46)[0]}" y2="${P(-14, 8, 46)[1]}"/><line x1="${P(0, 0, 14)[0]}" y1="${P(0, 0, 14)[1]}" x2="${P(16, -8, 44)[0]}" y2="${P(16, -8, 44)[1]}"/><line x1="${P(0, 0, 14)[0]}" y1="${P(0, 0, 14)[1]}" x2="${P(4, 12, 40)[0]}" y2="${P(4, 12, 40)[1]}"/></g>`
    + `<g fill="none" stroke="#7fb3ff" stroke-width="1.2" opacity=".8"><path d="M110 30a14 14 0 0 1 0 20"/><path d="M116 25a22 22 0 0 1 0 30"/></g>`, 30, 76),
  dish: () => {
    const [cx, cy] = P(0, 0, 34);
    return frame(box(-8, -8, 0, 16, 16, 18, DARK) + cyl(0, 0, 18, 3, 12, STEEL, 'ds1')
      + `<defs><radialGradient id="dsh" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#c9ced8"/><stop offset="1" stop-color="#6c7383"/></radialGradient></defs>`
      + `<ellipse cx="${cx}" cy="${cy}" rx="38" ry="18" fill="url(#dsh)" stroke="rgba(0,0,0,.3)" stroke-width=".8" transform="rotate(-22 ${cx} ${cy})"/>`
      + `<line x1="${cx}" y1="${cy}" x2="${cx + 8}" y2="${cy - 22}" stroke="#e9edf3" stroke-width="1.4"/><circle cx="${cx + 8}" cy="${cy - 23}" r="3" fill="${GOLD[0]}"/>`, 42, 78);
  },
  thruster: () => {
    const [x, y] = P(0, 0, 30);
    return frame(box(-14, -14, 26, 28, 28, 16, GOLD)
      + `<defs><linearGradient id="noz" x1="0" x2="1"><stop offset="0" stop-color="#d7dbe2"/><stop offset=".45" stop-color="#8a909d"/><stop offset="1" stop-color="#3c414b"/></linearGradient></defs>`
      + `<path d="M${x - 9},${y + 4} L${x - 22},${y + 34} Q${x},${y + 44} ${x + 22},${y + 34} L${x + 9},${y + 4} Z" fill="url(#noz)" stroke="rgba(0,0,0,.35)" stroke-width=".7"/>`
      + `<ellipse cx="${x}" cy="${y + 36}" rx="22" ry="7" fill="#1c1f26" stroke="#5d6370" stroke-width=".8"/>`
      + `<ellipse cx="${x}" cy="${y + 38}" rx="12" ry="3.5" fill="#ff9d4d" opacity=".55" filter="url(#soft)"/>`, 34, 82);
  },
  capsule: () => {
    const [x, y] = P(0, 0, 8);
    return frame(`<defs><linearGradient id="cap" x1="0" x2="1"><stop offset="0" stop-color="#eef1f6"/><stop offset=".55" stop-color="#b8bfcb"/><stop offset="1" stop-color="#6f7787"/></linearGradient></defs>`
      + `<path d="M${x - 32},${y} L${x - 13},${y - 46} Q${x},${y - 52} ${x + 13},${y - 46} L${x + 32},${y} Q${x},${y + 14} ${x - 32},${y} Z" fill="url(#cap)" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>`
      + `<ellipse cx="${x}" cy="${y}" rx="32" ry="10" fill="#3a3f49" stroke="#7d8594" stroke-width=".8"/>`
      + `<ellipse cx="${x - 6}" cy="${y - 26}" rx="6" ry="5" fill="#1d3f86" stroke="#e9edf3" stroke-width="1"/>`
      + `<path d="M${x - 16},${y - 14} Q${x},${y - 10} ${x + 16},${y - 14}" fill="none" stroke="#8f6a17" stroke-width="1.5"/>`, 40, 80);
  },
  camera: () => {
    const [x, y] = P(16, -2, 14);
    return frame(box(-20, -14, 0, 30, 28, 24, DARK)
      + `<defs><radialGradient id="lens" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#9fc4ff"/><stop offset=".5" stop-color="#2b4a8a"/><stop offset="1" stop-color="#0b1426"/></radialGradient></defs>`
      + `<ellipse cx="${x + 6}" cy="${y - 2}" rx="13" ry="15" fill="#2a2e37" stroke="#7d8594" stroke-width="1"/><ellipse cx="${x + 9}" cy="${y - 3}" rx="9" ry="11" fill="url(#lens)"/>`
      + `<circle cx="${x + 6}" cy="${y - 7}" r="2.2" fill="#fff" opacity=".85"/>`, 36, 76);
  },
  camera_large: () => {
    const a = P(-30, 10, 16), b = P(34, -14, 40);
    return frame(box(-14, -6, 0, 24, 18, 14, DARK)
      + `<defs><linearGradient id="tube" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f3f7"/><stop offset=".6" stop-color="#aeb5c2"/><stop offset="1" stop-color="#5f6676"/></linearGradient></defs>`
      + `<g transform="rotate(-24 ${(a[0] + b[0]) / 2} ${(a[1] + b[1]) / 2})"><rect x="${(a[0] + b[0]) / 2 - 42}" y="${(a[1] + b[1]) / 2 - 11}" width="84" height="22" rx="4" fill="url(#tube)" stroke="rgba(0,0,0,.3)" stroke-width=".8"/>`
      + `<rect x="${(a[0] + b[0]) / 2 + 30}" y="${(a[1] + b[1]) / 2 - 13}" width="12" height="26" rx="3" fill="#3a3f49"/><ellipse cx="${(a[0] + b[0]) / 2 + 42}" cy="${(a[1] + b[1]) / 2}" rx="4" ry="11" fill="#2b4a8a"/>`
      + `<rect x="${(a[0] + b[0]) / 2 - 10}" y="${(a[1] + b[1]) / 2 - 11}" width="5" height="22" fill="${GOLD[1]}"/></g>`, 46, 78);
  },
  spectro: () => {
    const t = P(0, 0, 24);
    return frame(box(-22, -16, 0, 44, 32, 22, STEEL) + box(-22, -16, 8, 44, 32, 4, GOLD)
      + `<defs><linearGradient id="prism" x1="0" x2="1"><stop offset="0" stop-color="#e6f2ff" stop-opacity=".95"/><stop offset="1" stop-color="#8fb3e8" stop-opacity=".8"/></linearGradient><linearGradient id="rain" x1="0" x2="1"><stop offset="0" stop-color="#ff5d5d"/><stop offset=".25" stop-color="#ffc857"/><stop offset=".5" stop-color="#6ee0a0"/><stop offset=".75" stop-color="#5ea8ff"/><stop offset="1" stop-color="#b48cff"/></linearGradient></defs>`
      + `<polygon points="${t[0] - 13},${t[1] + 2} ${t[0] + 13},${t[1] + 2} ${t[0]},${t[1] - 22}" fill="url(#prism)" stroke="#fff" stroke-width=".8"/>`
      + `<line x1="${t[0] - 40}" y1="${t[1] - 16}" x2="${t[0] - 6}" y2="${t[1] - 9}" stroke="#fff" stroke-width="1.6"/>`
      + `<polygon points="${t[0] + 5},${t[1] - 9} ${t[0] + 46},${t[1] - 20} ${t[0] + 46},${t[1] + 4}" fill="url(#rain)" opacity=".9"/>`, 40, 76);
  },
  boom: () => {
    const a = P(6, 0, 18), b = P(56, -18, 30);
    return frame(box(-24, -12, 0, 26, 24, 22, GOLD)
      + `<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" stroke="#d7dbe2" stroke-width="2.4" stroke-linecap="round"/>`
      + `<g stroke="#8a909d" stroke-width=".8">${[0.25, 0.5, 0.75].map((k) => `<line x1="${a[0] + (b[0] - a[0]) * k - 3}" y1="${a[1] + (b[1] - a[1]) * k - 2}" x2="${a[0] + (b[0] - a[0]) * k + 3}" y2="${a[1] + (b[1] - a[1]) * k + 2}"/>`).join('')}</g>`
      + `<defs><radialGradient id="sens" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#fff"/><stop offset=".5" stop-color="#c4a0ff"/><stop offset="1" stop-color="#4b2f86"/></radialGradient></defs>`
      + `<circle cx="${b[0]}" cy="${b[1]}" r="7" fill="url(#sens)" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>`, 44, 78);
  },
  beacon: () => {
    const c = P(0, 0, 26);
    return frame(`<defs><radialGradient id="ball" cx=".35" cy=".3" r=".75"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c3c9d4"/><stop offset="1" stop-color="#5f6676"/></radialGradient></defs>`
      + `<g stroke="#e9edf3" stroke-width="1.3" stroke-linecap="round"><line x1="${c[0] - 6}" y1="${c[1] + 8}" x2="${c[0] - 46}" y2="${c[1] + 26}"/><line x1="${c[0] - 2}" y1="${c[1] + 10}" x2="${c[0] - 30}" y2="${c[1] + 32}"/><line x1="${c[0] + 4}" y1="${c[1] + 10}" x2="${c[0] + 22}" y2="${c[1] + 34}"/><line x1="${c[0] + 7}" y1="${c[1] + 8}" x2="${c[0] + 44}" y2="${c[1] + 28}"/></g>`
      + `<circle cx="${c[0]}" cy="${c[1]}" r="15" fill="url(#ball)" stroke="rgba(0,0,0,.25)" stroke-width=".7"/>`
      + `<g fill="none" stroke="#7fb3ff" stroke-width="1.2" opacity=".85"><path d="M${c[0] + 22} ${c[1] - 16}a12 12 0 0 1 8 10"/><path d="M${c[0] + 26} ${c[1] - 24}a20 20 0 0 1 12 16"/></g>`, 40, 78);
  },
};

// Foguetes: o tamanho cresce com o lançador (pequeno, médio, pesado com propulsores laterais).
function rocket(scale, boosters) {
  const x = 80, base = 84, h = 70 * scale, w = 13 * scale;
  const body = `<defs><linearGradient id="rkb${scale}" x1="0" x2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#d3d8e1"/><stop offset="1" stop-color="#8b93a3"/></linearGradient></defs>`;
  const one = (cx, hh, ww) => `<path d="M${cx - ww / 2},${base} L${cx - ww / 2},${base - hh * 0.72} Q${cx},${base - hh - 4} ${cx + ww / 2},${base - hh * 0.72} L${cx + ww / 2},${base} Z" fill="url(#rkb${scale})" stroke="rgba(0,0,0,.3)" stroke-width=".7"/>`
    + `<rect x="${cx - ww / 2}" y="${base - hh * 0.5}" width="${ww}" height="${Math.max(2, hh * 0.06)}" fill="#c4473a"/><rect x="${cx - ww / 2}" y="${base - hh * 0.25}" width="${ww}" height="${Math.max(2, hh * 0.05)}" fill="#20242c"/>`;
  const fins = `<path d="M${x - w / 2},${base - 14 * scale} L${x - w / 2 - 9 * scale},${base} L${x - w / 2},${base} Z M${x + w / 2},${base - 14 * scale} L${x + w / 2 + 9 * scale},${base} L${x + w / 2},${base} Z" fill="#c4473a" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>`;
  const side = boosters ? one(x - w * 0.95, h * 0.55, w * 0.55) + one(x + w * 0.95, h * 0.55, w * 0.55) : '';
  return `<svg viewBox="0 0 160 100" class="item-photo-svg" aria-hidden="true" focusable="false"><defs><filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3"/></filter><radialGradient id="studio" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#2a2d36"/><stop offset="1" stop-color="#0d0e12"/></radialGradient></defs><rect width="160" height="100" fill="url(#studio)"/>${shadow(22 * scale + (boosters ? 10 : 0), 86)}${body}${side}${fins}${one(x, h, w)}</svg>`;
}
const LAUNCHERS = { small: () => rocket(0.75, false), medium: () => rocket(1, false), heavy: () => rocket(1.08, true) };

// SVG da "foto" do item, ou '' se não houver desenho para ele.
export function itemPhotoSvg(key) {
  const fn = ART[key] || LAUNCHERS[key];
  return fn ? fn() : '';
}

// ---------------------------------------------------------------------------------------------
// "Fotos" dos prédios da agência (data/buildings.js), no mesmo estilo isométrico: aparecem nos
// botões de construir do terreno e no quadrado da casa depois de construído. Só desenho.
const CONCRETE = ['#f1f2f4', '#c7ccd4', '#8e96a3'];
const BRICK = ['#e3a07f', '#b9603f', '#7f3b25'];
const GLASS = ['#a9cbff', '#5786d6', '#2d4f93'];
const ROOF = ['#6b717c', '#4a505a', '#30353d'];

// Fileira de janelas na face esquerda (plano y = yf) ou direita (plano x = xf) de uma caixa.
function windowsLeft(x0, x1, yf, z0, z1, n, color) {
  const w = (x1 - x0) / n; let s = '';
  for (let i = 0; i < n; i++) s += poly([[x0 + w * i + w * 0.2, yf, z0], [x0 + w * i + w * 0.8, yf, z0], [x0 + w * i + w * 0.8, yf, z1], [x0 + w * i + w * 0.2, yf, z1]], color, 'opacity=".9"');
  return s;
}
function windowsRight(y0, y1, xf, z0, z1, n, color) {
  const w = (y1 - y0) / n; let s = '';
  for (let i = 0; i < n; i++) s += poly([[xf, y0 + w * i + w * 0.2, z0], [xf, y0 + w * i + w * 0.8, z0], [xf, y0 + w * i + w * 0.8, z1], [xf, y0 + w * i + w * 0.2, z1]], color, 'opacity=".75"');
  return s;
}
const ground = (w, d) => poly([[-w, -d, 0], [w, -d, 0], [w, d, 0], [-w, d, 0]], '#3b4250', 'opacity=".55"');

// Cada prédio cresce com o nível (1 a 3, data/buildings.js MAX_LEVEL): mais largo, mais alto, mais peças.
const BUILDING_PHOTOS = {
  // Laboratório: bloco com cúpula de observatório; nv.2 ganha anexo, nv.3 ganha andar e segunda cúpula.
  lab: (lv) => {
    const w = [0, 34, 46, 50][lv], h = [0, 13, 16, 26][lv], r = [0, 12, 16, 19][lv];
    const x0 = -w / 2 - 6, y0 = -16, d = 32;
    let out = ground(40, 26);
    if (lv >= 3) out += box(x0 + w - 2, -12, 0, 16, 24, 14, CONCRETE) + windowsRight(-8, 8, x0 + w + 14, 5, 10, 2, '#9ff0c4');
    out += box(x0, y0, 0, w, d, h, CONCRETE) + windowsLeft(x0 + 3, x0 + w - 3, y0 + d, 4, Math.min(h - 3, 11), Math.round(w / 9), '#9ff0c4')
      + windowsRight(y0 + 4, y0 + d - 4, x0 + w, 4, Math.min(h - 3, 11), 3, '#9ff0c4');
    if (lv >= 3) out += windowsLeft(x0 + 3, x0 + w - 3, y0 + d, 15, 22, Math.round(w / 9), '#9ff0c4');
    if (lv >= 2 && lv < 3) out += box(x0 + w, -8, 0, 14, 18, 8, CONCRETE);
    const [cx, cy] = P(x0 + w * 0.62, 0, h);
    out += `<defs><radialGradient id="dome" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#d4d9e1"/><stop offset="1" stop-color="#7e8694"/></radialGradient></defs>`
      + `<path d="M${cx - r},${cy} A${r} ${r} 0 0 1 ${cx + r},${cy} A${r} ${r * 0.45} 0 0 1 ${cx - r},${cy} Z" fill="url(#dome)" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>`
      + `<path d="M${cx - 2.5},${cy - r + 1} L${cx + 2.5},${cy - r + 1} L${cx + 3.5},${cy + 3} L${cx - 3.5},${cy + 3} Z" fill="#20242c"/>`
      + `<line x1="${cx}" y1="${cy - 4}" x2="${cx + r * 0.6}" y2="${cy - r - 4}" stroke="#d7dbe2" stroke-width="2" stroke-linecap="round"/>`;
    if (lv >= 3) {
      const [ax, ay] = P(x0 + 8, 0, h);
      out += `<path d="M${ax - 8},${ay} A8 8 0 0 1 ${ax + 8},${ay} A8 3.6 0 0 1 ${ax - 8},${ay} Z" fill="url(#dome)" stroke="rgba(0,0,0,.3)" stroke-width=".6"/>`;
    }
    return out;
  },
  // Fábrica: um galpão de dente de serra por nível; chaminé mais alta e, no nv.3, uma segunda.
  factory: (lv) => {
    const bay = 22, W = bay * lv, x0 = -W / 2 - 4;
    let roof = '';
    for (let i = 0; i < lv; i++) {
      const a = x0 + i * bay, b = a + bay;
      roof += poly([[a, -16, 16], [b, -16, 16], [b, 16, 16], [a, 16, 16]], ROOF[0]);
      roof += poly([[a, -16, 16], [a, 16, 16], [a, 16, 27], [a, -16, 27]], '#8fc1ff', 'stroke="rgba(0,0,0,.25)" stroke-width=".6"');
      roof += poly([[a, -16, 27], [a, 16, 27], [b, 16, 16], [b, -16, 16]], ROOF[1], 'stroke="rgba(0,0,0,.25)" stroke-width=".6"');
      roof += poly([[a, 16, 16], [b, 16, 16], [a, 16, 27]], BRICK[1], 'stroke="rgba(0,0,0,.25)" stroke-width=".6"');
    }
    const chimneys = lv >= 3 ? [[x0 + W - 8, 36], [x0 + 10, 31]] : [[x0 + W - 6, [0, 33, 36][lv]]];
    let out = ground(44, 24);
    for (const [x, ch] of chimneys) out += cyl(x, -12, 0, 4, ch, ['#9a5a43', '#b9603f', '#6e321f'], `chim${x}`.replace(/[^a-z0-9]/gi, ''));
    out += box(x0, -16, 0, W, 32, 16, BRICK) + windowsLeft(x0 + 4, x0 + W - 4, 16, 4, 11, lv * 2, '#ffd77a') + roof;
    for (const [x, ch] of chimneys) {
      const [sx, sy] = P(x, -12, ch);
      out += `<g fill="#d9dde4" opacity=".75"><circle cx="${sx + 2}" cy="${sy - 6}" r="4.5"/><circle cx="${sx + 8}" cy="${sy - 12}" r="5.5"/><circle cx="${sx + 15}" cy="${sy - 17}" r="4"/></g>`;
    }
    return out;
  },
  // Controle de missão: um andar de telas por nível; parabólica a partir do nv.2, segunda antena no nv.3.
  control: (lv) => {
    const w = [0, 32, 40, 44][lv], h = [0, 12, 20, 28][lv];
    const x0 = -w / 2, y0 = -w / 2;
    let out = ground(38, 30) + box(x0, y0, 0, w, w, h, CONCRETE);
    for (let f = 0; f < lv; f++) {
      out += windowsLeft(x0 + 3, x0 + w - 3, y0 + w, 3 + f * 8, 8 + f * 8, Math.round(w / 9), '#7fd1ff')
        + windowsRight(y0 + 3, y0 + w - 3, x0 + w, 3 + f * 8, 8 + f * 8, Math.round(w / 11), '#7fd1ff');
    }
    const [mx, my] = P(x0 + w - 6, y0 + 6, h);
    out += `<line x1="${mx}" y1="${my}" x2="${mx}" y2="${my - 18}" stroke="#d7dbe2" stroke-width="1.4"/><circle cx="${mx}" cy="${my - 19}" r="2.2" fill="#ff5b4f"/>`;
    if (lv >= 2) {
      const rx = lv >= 3 ? 20 : 15;
      const [cx, cy] = P(x0 + w / 2 - 2, y0 + w / 2 + 2, h + 10);
      out += cyl(x0 + w / 2 - 2, y0 + w / 2 + 2, h, 2.5, 10, CONCRETE, `cmast${lv}`)
        + `<defs><radialGradient id="cdsh" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".6" stop-color="#c9ced8"/><stop offset="1" stop-color="#6c7383"/></radialGradient></defs>`
        + `<ellipse cx="${cx}" cy="${cy - 4}" rx="${rx}" ry="${rx * 0.45}" fill="url(#cdsh)" stroke="rgba(0,0,0,.3)" stroke-width=".7" transform="rotate(-20 ${cx} ${cy - 4})"/>`;
    }
    if (lv >= 3) {
      const [bx, by] = P(x0 - 10, y0 + w - 4, 8);
      out += box(x0 - 16, y0 + w - 10, 0, 10, 10, 6, CONCRETE)
        + `<ellipse cx="${bx}" cy="${by - 3}" rx="9" ry="4" fill="url(#cdsh)" stroke="rgba(0,0,0,.3)" stroke-width=".6" transform="rotate(-20 ${bx} ${by - 3})"/>`;
    }
    return out;
  },
  // Patrocinador: torre de vidro que sobe a cada nível; placa dourada no nv.2 e torre vizinha no nv.3.
  sponsor: (lv) => {
    const th = [0, 16, 26, 36][lv];
    let out = ground(34, 28) + box(-28, -22, 0, 56, 44, 5, CONCRETE) + box(-12, -12, 5, 24, 24, th, GLASS);
    const lines = []; for (let z = 12; z < 5 + th; z += 7) lines.push(z);
    out += `<g stroke="rgba(255,255,255,.35)" stroke-width=".5">${lines.map((z) => { const a = P(-12, 12, z), b = P(12, 12, z), c = P(12, -12, z); return `<polyline fill="none" points="${a.join(',')} ${b.join(',')} ${c.join(',')}"/>`; }).join('')}</g>`;
    if (lv >= 3) out += box(14, -4, 5, 11, 14, 18, GLASS);
    if (lv >= 2) {
      const [cx, cy] = P(0, 0, 5 + th + 11);
      out += `<defs><radialGradient id="coin" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff3c4"/><stop offset=".55" stop-color="#f0c24b"/><stop offset="1" stop-color="#9a7215"/></radialGradient></defs>`
        + `<line x1="${cx}" y1="${cy + 9}" x2="${cx}" y2="${cy + 3}" stroke="#7d8594" stroke-width="2"/>`
        + `<ellipse cx="${cx}" cy="${cy - 5}" rx="${lv >= 3 ? 10 : 8}" ry="${lv >= 3 ? 10 : 8}" fill="url(#coin)" stroke="rgba(0,0,0,.3)" stroke-width=".7"/>`
        + `<path d="M${cx} ${cy - 11}l1.8 3.8 4.1.5-3 2.8.8 4.1-3.7-2-3.7 2 .8-4.1-3-2.8 4.1-.5z" fill="#9a7215" opacity=".8" transform="translate(0 ${lv >= 3 ? 0 : 1})"/>`;
    }
    return out;
  },
};

// SVG da "foto" do prédio no nível dado (1 a 3). `bare`: sem o fundo de estúdio (sobre a casa do tabuleiro).
export function buildingPhotoSvg(id, { bare = false, level = 1 } = {}) {
  const fn = BUILDING_PHOTOS[id];
  if (!fn) return '';
  const body = fn(Math.min(3, Math.max(1, level)));
  return `<svg viewBox="${bare ? '22 2 116 86' : '0 0 160 100'}" class="building-photo-svg" aria-hidden="true" focusable="false">`
    + `<defs><filter id="soft" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="3"/></filter>`
    + `<radialGradient id="studio" cx=".5" cy=".35" r=".75"><stop offset="0" stop-color="#2a2d36"/><stop offset="1" stop-color="#0d0e12"/></radialGradient></defs>`
    + `${bare ? '' : '<rect width="160" height="100" fill="url(#studio)"/>'}${shadow(44, 80)}${body}</svg>`;
}
