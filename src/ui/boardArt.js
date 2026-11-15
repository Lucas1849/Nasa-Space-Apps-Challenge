// Arte própria do tabuleiro, em SVG desenhado à mão (sem emojis, sem imagens externas, sem logos).
// Estilo: jogo de tabuleiro impresso dos anos 60 — traço de tinta único, sem preenchimento, cantos retos.
// Todos os ícones usam viewBox 0 0 32 32 e herdam a cor da tinta via `currentColor`.

const icon = (body, extra = '') =>
  `<svg viewBox="0 0 32 32" class="ink-icon" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" ${extra}>${body}</svg>`;

export const TILE_ART = {
  // Largada: bandeira de largada com a seta do sentido do jogo
  start: icon('<path d="M9 28V4"/><path d="M9 5h14l-3.5 4.5L23 14H9"/><path d="M14 22h12m-4-4 4 4-4 4"/>'),
  // Terreno: lote demarcado com estaca de agrimensor
  lot: icon('<path d="M5 24 16 18l11 6-11 6z" stroke-dasharray="2.2 2.2"/><path d="M16 5v15"/><path d="M16 6h7l-2 2.5 2 2.5h-7"/>'),
  // Verba: cédula com selo
  funds: icon('<rect x="4" y="9" width="24" height="14" rx="1.5"/><circle cx="16" cy="16" r="3.6"/><path d="M8 13v6M24 13v6"/>'),
  // Crise: jornal com gráfico caindo
  crisis: icon('<path d="M6 6h18v20H8a2 2 0 0 1-2-2z"/><path d="M24 10h3v14a2 2 0 0 1-2 2"/><path d="M9 10h11M9 13h7"/><path d="m9 17 4 3 3-2 5 5m0-3v3h-3"/>'),
  // Evento: duas cartas com interrogação
  event: icon('<rect x="5" y="7" width="15" height="21" rx="1.5" transform="rotate(-8 12 17)"/><rect x="12" y="5" width="15" height="21" rx="1.5"/><path d="M17.5 12.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.8"/><path d="M20 20.5h.01"/>'),
  // Espionagem: chapéu e óculos
  spy: icon('<path d="M4 15h24"/><path d="M8 15c1-5 2-8 4-8 1.5 0 2.5 1 4 1s2.5-1 4-1c2 0 3 3 4 8"/><circle cx="11" cy="22" r="3.5"/><circle cx="21" cy="22" r="3.5"/><path d="M14.5 22h3"/>'),
  // Tecnologia: átomo
  tech: icon('<ellipse cx="16" cy="16" rx="12" ry="4.6"/><ellipse cx="16" cy="16" rx="12" ry="4.6" transform="rotate(60 16 16)"/><ellipse cx="16" cy="16" rx="12" ry="4.6" transform="rotate(120 16 16)"/><circle cx="16" cy="16" r="1.4" fill="currentColor"/>'),
  // Feira de fornecedores: caixote de madeira
  shop: icon('<path d="M5 11h22v15H5z"/><path d="M5 16h22M5 21h22"/><path d="M9 11 12 5h8l3 6"/>'),
  // Oficina de reparos: chave inglesa
  repair: icon('<path d="M20.5 5.5a6 6 0 0 0-6.7 8.2L5.6 21.9a2.1 2.1 0 0 0 3 3l8.2-8.2a6 6 0 0 0 8.2-6.7l-3.6 3.6-3.4-.6-.6-3.4z"/>'),
  // Choque do Sputnik: a esfera com as quatro antenas
  catchup: icon('<circle cx="13" cy="13" r="6"/><path d="M17.5 17 28 27M15.5 18.5 23 29M18.5 15.5 29 22.5M16.8 17.8 26 30.5"/><path d="M9 11c1-1.6 2.4-2.4 4-2.4"/>'),
};

// Prédios construídos nos terrenos
export const BUILDING_ART = {
  lab: icon('<path d="M12 4h8M13.5 4v8L6 25a2 2 0 0 0 1.8 3h16.4A2 2 0 0 0 26 25l-7.5-13V4"/><path d="M9.5 19h13"/><circle cx="14" cy="23" r="1"/><circle cx="18.5" cy="24.5" r=".8"/>'),
  factory: icon('<path d="M4 27V15l6 4v-4l6 4v-4l6 4V6h5v21z"/><path d="M8 23h3M14 23h3M20 23h3"/>'),
  control: icon('<rect x="4" y="6" width="24" height="15" rx="1.5"/><path d="M8 17l4-5 3 3 4-6 5 8"/><path d="M11 25h10M16 21v4"/>'),
  sponsor: icon('<ellipse cx="16" cy="9" rx="9" ry="3.2"/><path d="M7 9v5c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2V9"/><path d="M7 14v5c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2v-5"/><path d="M7 19v4c0 1.8 4 3.2 9 3.2s9-1.4 9-3.2v-4"/>'),
};

// Peão: um foguetinho de corrida, pintado com a cor da agência.
export function pawnSvg(color, letter) {
  return `<svg viewBox="0 0 24 34" class="pawn-svg" aria-hidden="true">
    <path d="M12 1.5c4.5 3.6 6.5 9 6.5 15.5v8h-13v-8c0-6.5 2-11.9 6.5-15.5z" fill="${color}" stroke="#1f2a3a" stroke-width="1.4"/>
    <path d="M5.5 19 1.5 26v4l4-2.5M18.5 19l4 7v4l-4-2.5" fill="${color}" stroke="#1f2a3a" stroke-width="1.4" stroke-linejoin="round"/>
    <circle cx="12" cy="12" r="3.4" fill="#f4ecd8" stroke="#1f2a3a" stroke-width="1.2"/>
    <text x="12" y="13.6" text-anchor="middle" font-size="4.6" font-family="Oswald, sans-serif" font-weight="700" fill="#1f2a3a">${letter}</text>
    <path d="M8 25.5 9.5 31h5l1.5-5.5" fill="#d06a2c" stroke="#1f2a3a" stroke-width="1.2"/>
  </svg>`;
}

// Dado com pips de verdade.
const PIPS = {
  1: [[16, 16]],
  2: [[10, 10], [22, 22]],
  3: [[10, 10], [16, 16], [22, 22]],
  4: [[10, 10], [22, 10], [10, 22], [22, 22]],
  5: [[10, 10], [22, 10], [16, 16], [10, 22], [22, 22]],
  6: [[10, 9], [22, 9], [10, 16], [22, 16], [10, 23], [22, 23]],
};
export function dieSvg(n) {
  const pips = (PIPS[n] || []).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6" fill="#1f2a3a"/>`).join('');
  return `<svg viewBox="0 0 32 32" class="die-svg" aria-label="dado ${n || ''}"><rect x="1.5" y="1.5" width="29" height="29" rx="5" fill="#fbf7ec" stroke="#1f2a3a" stroke-width="1.6"/>${n ? pips : '<path d="M12 12a4 4 0 1 1 5.5 3.7c-1 .4-1.5 1.2-1.5 2.1V19M16 23h.01" fill="none" stroke="#1f2a3a" stroke-width="2" stroke-linecap="round"/>'}</svg>`;
}

// Diagrama de órbitas do miolo do tabuleiro: Terra, órbita baixa, geoestacionária,
// trajetória de transferência e a Lua. Fica por trás dos dados, em tinta clara.
export const ORBIT_ART = `<svg viewBox="0 0 400 300" class="orbit-art" aria-hidden="true" fill="none" stroke="currentColor">
  <circle cx="150" cy="160" r="26" stroke-width="2"/>
  <path d="M124 160h52M128 147c14 4 30 4 44 0M128 173c14-4 30-4 44 0M150 134c-10 16-10 36 0 52M150 134c10 16 10 36 0 52" stroke-width="1"/>
  <circle cx="150" cy="160" r="44" stroke-width="1.2"/>
  <circle cx="150" cy="160" r="86" stroke-width="1.2" stroke-dasharray="5 5"/>
  <path d="M106 160c0 50 100 72 200 40" stroke-width="1.2" stroke-dasharray="2 5"/>
  <circle cx="330" cy="190" r="14" stroke-width="1.6"/>
  <path d="M322 184a6 6 0 0 1 6 2M334 195a4 4 0 0 0 4-3" stroke-width="1"/>
  <text x="150" y="112" text-anchor="middle" font-size="9" fill="currentColor" stroke="none" font-family="Courier Prime, monospace">LEO</text>
  <text x="150" y="70" text-anchor="middle" font-size="9" fill="currentColor" stroke="none" font-family="Courier Prime, monospace">GEO</text>
  <text x="330" y="222" text-anchor="middle" font-size="9" fill="currentColor" stroke="none" font-family="Courier Prime, monospace">LUA</text>
</svg>`;

// Cores de impressão para as agências (peões e terrenos), no lugar dos tons neon da interface.
export const PRINT_COLORS = ['#2b5d9b', '#d9a21b', '#3f7d4e', '#b8392b'];
