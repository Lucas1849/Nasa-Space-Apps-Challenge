// Ícones do jogo: SVG próprios, desenhados para este projeto (sem emojis, sem bibliotecas externas).
// Estilo único: grade 24×24, traço 1.8 com pontas arredondadas, sem preenchimento, cor = currentColor.
// Assim o ícone herda a cor do texto e muda com o tema pelo CSS.
//
// Uso: icon('rocket') devolve um <span class="ic"> com o SVG. icon('rocket', { size: 32, label: 'Foguete' }).
// Para adicionar um ícone: acrescente uma entrada em ICONS com o miolo do SVG (paths, circles...).

const F = 'fill="currentColor" stroke="none"'; // pontos cheios (olhos, pips de dado)

export const ICONS = {
  // ---- tabuleiro
  flag: '<path d="M5 21V4"/><path d="M5 4h12l-2.5 4L17 12H5"/>',
  coins: '<ellipse cx="9" cy="7" rx="5.5" ry="2.6"/><path d="M3.5 7v4c0 1.4 2.5 2.6 5.5 2.6"/><path d="M3.5 11v4c0 1.4 2.5 2.6 5.5 2.6"/><ellipse cx="15" cy="13" rx="5.5" ry="2.6"/><path d="M9.5 13v4.4c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6V13"/>',
  trendDown: '<path d="M3 7l6 6 4-4 8 8"/><path d="M15 17h6v-6"/>',
  card: '<rect x="4" y="3" width="13" height="18" rx="2"/><path d="M17 6.5l3 .8-3.6 13.5-5-1.3"/><path d="M8.3 9.6a2.2 2.2 0 1 1 3 2c-.7.3-1 .8-1 1.4v.5"/><circle cx="10.3" cy="16.6" r=".9" ' + F + '/>',
  flask: '<path d="M9 3h6"/><path d="M10 3v6.2L4.6 18.4A1.7 1.7 0 0 0 6.1 21h11.8a1.7 1.7 0 0 0 1.5-2.6L14 9.2V3"/><path d="M7.2 15h9.6"/>',
  cart: '<path d="M2.5 4h2.3l2.4 10.6a1 1 0 0 0 1 .8h9a1 1 0 0 0 1-.8L20.5 8H6"/><circle cx="9.5" cy="19.2" r="1.5"/><circle cx="17" cy="19.2" r="1.5"/>',
  crane: '<path d="M6 21V5h14"/><path d="M6 5l4-2.5M6 9l4-4M6 13l4-4"/><path d="M17 5v5"/><rect x="15" y="10" width="4" height="3" rx=".5"/><path d="M3 21h7"/>',
  eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  wrench: '<path d="M14.6 6.4a4.2 4.2 0 0 1 5.2-1.6l-2.7 2.7.2 2.2 2.2.2 2.7-2.7a4.2 4.2 0 0 1-5.6 5.3l-7.1 7.1a2 2 0 0 1-2.9-2.9l7.1-7.1a4.2 4.2 0 0 1 .9-3.2z"/>',
  lifebuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
  scissors: '<circle cx="6" cy="7" r="2.8"/><circle cx="6" cy="17" r="2.8"/><path d="M8.3 8.6L20 19M8.3 15.4L20 5"/>',

  // ---- prédios
  factory: '<path d="M3 21V11l5 3v-3l5 3v-3l5 3V4h3v17z"/><path d="M7 18h2M12 18h2"/>',
  console: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/><path d="M6.5 12.5l3-3 3 2 4-4.5"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M3 13h18"/>',

  // ---- etapas do voo e missões
  rocket: '<path d="M12 2.5c3 2.5 4.5 6 4.5 10v3.5h-9v-3.5c0-4 1.5-7.5 4.5-10z"/><circle cx="12" cy="9.5" r="1.6"/><path d="M7.5 12.5l-3 3v3.5l3-1.5M16.5 12.5l3 3v3.5l-3-1.5"/><path d="M10 19.2l2 2.3 2-2.3"/>',
  satellite: '<rect x="9" y="9" width="6" height="6" rx="1"/><path d="M9 12H6.5M15 12h2.5"/><rect x="2" y="9" width="4.5" height="6" rx=".6"/><rect x="17.5" y="9" width="4.5" height="6" rx=".6"/><path d="M12 9V6"/><circle cx="12" cy="4.8" r="1.2"/>',
  orbit: '<circle cx="12" cy="12" r="2.6"/><ellipse cx="12" cy="12" rx="10" ry="4.4" transform="rotate(-25 12 12)"/><circle cx="20.4" cy="8.6" r="1.3" ' + F + '/>',
  dish: '<path d="M4 9.5a8.5 8.5 0 0 0 10.5 10.5z"/><path d="M9.2 14.8l4.6-4.6"/><circle cx="14.6" cy="9.4" r="1.2"/><path d="M16.6 4.2a5 5 0 0 1 3.2 3.2M16.8 1.4a8 8 0 0 1 5.8 5.8"/><path d="M7.5 17.5L5.5 21h6"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z"/>',
  parachute: '<path d="M3 11a9 7.5 0 0 1 18 0z"/><path d="M3 11l8 7.5M21 11l-8 7.5M12 11v7.5"/><rect x="10.3" y="18.5" width="3.4" height="3" rx=".6"/>',
  paw: '<circle cx="6.6" cy="10.4" r="1.8"/><circle cx="10.2" cy="6.6" r="1.8"/><circle cx="14.6" cy="6.6" r="1.8"/><circle cx="18.2" cy="10.4" r="1.8"/><path d="M12.4 12.2c-2.6 0-5.1 3.5-5.1 5.6 0 1.6 1.5 2.3 2.9 1.8a6.4 6.4 0 0 1 4.4 0c1.4.5 2.9-.2 2.9-1.8 0-2.1-2.5-5.6-5.1-5.6z"/>',
  cloud: '<path d="M7 18.5a4.2 4.2 0 0 1-.6-8.4A5.6 5.6 0 0 1 17 8.8a4.9 4.9 0 0 1 0 9.7z"/><path d="M9 21.5l1-1.5M13 21.5l1-1.5"/>',
  station: '<rect x="10" y="9" width="4" height="6" rx="1"/><path d="M10 12H7.2M14 12h2.8"/><rect x="2.2" y="8" width="5" height="8" rx=".6"/><rect x="16.8" y="8" width="5" height="8" rx=".6"/><path d="M12 9V5M12 15v4M10 5h4M10 19h4"/>',
  helmet: '<path d="M5 16v-4a7 7 0 0 1 14 0v4a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3z"/><path d="M8 11.8a4 4 0 0 1 8 0V14H8z"/><path d="M9 21.5h6"/>',

  // ---- peças e instrumentos
  camera: '<path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>',
  telescope: '<path d="M3.5 12.6l12.6-5.8 2 4.4-12.6 5.8z"/><path d="M16.1 6.8l3-1.4 2 4.4-3 1.4"/><path d="M11 14.6L8 21.5M12.2 14l3.2 7.5"/>',
  prism: '<path d="M12 4l7.5 13.5h-15z"/><path d="M1.5 12.5l8-1.2"/><path d="M15.2 11.4l6.8-1.9M15.8 13l6.2.7M16.4 14.6l4.8 3.4"/>',
  magnet: '<path d="M6 3h4v9a2 2 0 0 0 4 0V3h4v9a6 6 0 0 1-12 0z"/><path d="M6 7h4M14 7h4"/>',
  beacon: '<circle cx="12" cy="12" r="2"/><path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8"/>',
  solar: '<rect x="3" y="4" width="18" height="11" rx="1"/><path d="M3 9.5h18M9 4v11M15 4v11"/><path d="M12 15v4M8 21h8"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  battery: '<rect x="2" y="7" width="17" height="10" rx="2"/><path d="M22 10.5v3"/><path d="M6 10v4M9.5 10v4"/>',
  signal: '<path d="M5 20v-3M10 20v-7M15 20V9M20 20V5"/>',
  flame: '<path d="M12 22c4 0 6.5-2.6 6.5-6.3 0-3.8-3-6.2-4-9.7-2 1.5-3 3.6-3 5.6-1.2-.8-1.8-2-2-3.3-2 2-3 4.5-3 7.4 0 3.7 2 6.3 5.5 6.3z"/>',
  capsule: '<path d="M8.5 4h7l3.5 14H5z"/><path d="M4 18h16v2.5H4z"/><circle cx="12" cy="10.5" r="2"/>',
  hexnut: '<path d="M12 2.5l8.2 4.8v9.4L12 21.5l-8.2-4.8V7.3z"/><circle cx="12" cy="12" r="3"/>',

  // ---- recursos (HUD e medidores)
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  chip: '<rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9.5" y="9.5" width="5" height="5" rx=".5"/><path d="M9 3v3M15 3v3M9 18v3M15 18v3M3 9h3M3 15h3M18 9h3M18 15h3"/>',
  shield: '<path d="M12 3l8 3v5.5c0 5-3.4 8.4-8 9.5-4.6-1.1-8-4.5-8-9.5V6z"/>',
  shieldCheck: '<path d="M12 3l8 3v5.5c0 5-3.4 8.4-8 9.5-4.6-1.1-8-4.5-8-9.5V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4" ' + F + '/>',
  atom: '<circle cx="12" cy="12" r="1.6" ' + F + '/><ellipse cx="12" cy="12" rx="10" ry="4"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="10" ry="4" transform="rotate(120 12 12)"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  weight: '<path d="M6.5 8h11l2.5 13H4z"/><circle cx="12" cy="5" r="2.5"/>',
  hourglass: '<path d="M7 3h10v3.2a5 5 0 0 1-5 5 5 5 0 0 1 5 5V21H7v-4.8a5 5 0 0 1 5-5 5 5 0 0 1-5-5z"/>',
  planet: '<circle cx="12" cy="12" r="5.5"/><path d="M5.2 14.6C2.6 17 2.6 19 4.6 19.5s6.3-1.2 10.4-4.3 6.6-7.1 5.8-8.9c-.5-1.2-2.2-1.3-4.3-.4"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-6"/><path d="M3 18h18"/>',
  clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2.8h6V4"/><path d="M8.5 12.5l2.2 2.2 4.3-4.4"/>',
  die: '<rect x="4" y="4" width="16" height="16" rx="3.5"/><circle cx="9" cy="9" r="1.2" ' + F + '/><circle cx="12" cy="12" r="1.2" ' + F + '/><circle cx="15" cy="15" r="1.2" ' + F + '/>',

  // ---- eventos do voo
  comet: '<circle cx="16" cy="8" r="4"/><path d="M13.2 10.8L4 20M12.2 7.4L5.5 14.1M16.6 12L10 18.6"/>',

  // ---- pessoas, lados e agência
  wings: '<path d="M2 8.5c3.5 0 6.5 1.8 10 6.5 3.5-4.7 6.5-6.5 10-6.5"/><path d="M5 12.5c2.5 0 4.6 1.2 7 4.3 2.4-3.1 4.5-4.3 7-4.3"/><circle cx="12" cy="6" r="1.8"/>',
  star: '<path d="M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z"/>',
  robot: '<rect x="5" y="8" width="14" height="11" rx="2.5"/><path d="M12 8V4.5"/><circle cx="12" cy="3.6" r="1"/><circle cx="9.3" cy="13" r="1.3" ' + F + '/><circle cx="14.7" cy="13" r="1.3" ' + F + '/><path d="M9.5 16.5h5M3 12v3M21 12v3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  building: '<path d="M4 21V5l8-2v18M12 8l8 2.2V21"/><path d="M2 21h20M7 8h2M7 12h2M7 16h2M15 13h2M15 17h2"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5.2a3 3 0 0 0 3 4.2M16 6h2.8a3 3 0 0 1-3 4.2"/><path d="M12 13v4"/><path d="M8 21h8l-1-4H9z"/>',
  ladder: '<path d="M7 3v18M17 3v18M7 7h10M7 12h10M7 17h10"/>',
  medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.6 10.6L6 3h4l2 5 2-5h4l-2.6 7.6"/><path d="M12 12.6l.8 1.6 1.7.2-1.2 1.2.3 1.7-1.6-.8-1.6.8.3-1.7-1.2-1.2 1.7-.2z"/>',
  coop: '<circle cx="9" cy="12" r="5.5"/><circle cx="15" cy="12" r="5.5"/>',

  // ---- interface
  book: '<path d="M5 4h10a3 3 0 0 1 3 3v14H8a3 3 0 0 1-3-3z"/><path d="M5 18a3 3 0 0 1 3-3h10"/>',
  bookOpen: '<path d="M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z"/>',
  scroll: '<path d="M6 3h12v14.5a3.5 3.5 0 0 1-3.5 3.5H6a3 3 0 0 1-3-3v-1h12"/><path d="M6 3v13M9 8h6M9 12h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  alert: '<path d="M12 3.5l9.5 17h-19z"/><path d="M12 10v5"/><circle cx="12" cy="17.8" r=".9" ' + F + '/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.4 1 1.1 1 1.8v.3h5v-.3c0-.7.4-1.4 1-1.8A6 6 0 0 0 12 3z"/>',
  testTube: '<path d="M14.5 3l6.5 6.5M16 4.5L6.2 14.3a3.5 3.5 0 1 0 5 5L21 9.5"/><path d="M8.7 11.8h6.6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  tag: '<path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.4"/>',
  arrowUp: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  arrowLeft: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.6 8.4l-2.1 5.1-5.1 2.1 2.1-5.1z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><circle cx="12" cy="7.8" r=".9" ' + F + '/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1.1" ' + F + '/><circle cx="4.5" cy="12" r="1.1" ' + F + '/><circle cx="4.5" cy="18" r="1.1" ' + F + '/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3.5V8h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 20.5V16h-4.5"/>',
};

// Faces do dado (pips cheios). Posições na grade 24×24.
const PIPS = {
  1: [[12, 12]],
  2: [[8, 8], [16, 16]],
  3: [[7.5, 7.5], [12, 12], [16.5, 16.5]],
  4: [[8, 8], [16, 8], [8, 16], [16, 16]],
  5: [[7.5, 7.5], [16.5, 7.5], [12, 12], [7.5, 16.5], [16.5, 16.5]],
  6: [[8, 7], [16, 7], [8, 12], [16, 12], [8, 17], [16, 17]],
};

function svgMarkup(inner, size) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${inner}</svg>`;
}

// Devolve um <span class="ic"> com o ícone. `label` vira texto acessível (senão o ícone é decorativo).
export function icon(name, { size = 18, label = null, className = '' } = {}) {
  const inner = ICONS[name] || ICONS.hexnut;
  const span = document.createElement('span');
  span.className = `ic ${className}`.trim();
  span.innerHTML = svgMarkup(inner, size);
  if (label) {
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', label);
    span.title = label;
  }
  return span;
}

// Face do dado como SVG (1 a 6).
export function dieFace(n, { size = 48, className = '' } = {}) {
  const pips = (PIPS[n] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.7" ${F}/>`).join('');
  const span = document.createElement('span');
  span.className = `ic die-face ${className}`.trim();
  span.setAttribute('role', 'img');
  span.setAttribute('aria-label', `dado ${n}`);
  span.innerHTML = svgMarkup(`<rect x="3" y="3" width="18" height="18" rx="4"/>${pips}`, size);
  return span;
}

// Ícone grande para a animação de lançamento (string, usada fora do DOM do jogo).
export const rocketSvg = (size) => svgMarkup(ICONS.rocket, size);
