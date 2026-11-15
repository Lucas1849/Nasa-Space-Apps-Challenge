// Desenho 2D da espaçonave em SVG, montado a partir das peças compradas.
// Muda em tempo real na oficina: o jogador VÊ a consequência de cada compra.
// Arte própria em formas simples (sem logos ou marcas da NASA).
import { CATALOG } from '../sim/resources.js';
import { LAUNCHERS } from '../data/launchers.js';
import { MISSIONS } from '../data/missions.js';

const NS = 'http://www.w3.org/2000/svg';

function svgEl(tag, attrs = {}) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
}

// Conta quantas peças de cada tipo visual o jogador tem.
function visualCounts(player) {
  const counts = {};
  for (const id of [...player.spacecraft.parts, ...player.spacecraft.instruments]) {
    const v = CATALOG[id]?.visual;
    if (v) counts[v] = (counts[v] || 0) + 1;
  }
  return counts;
}

// Montagem da nave na oficina: cada sistema é um "encaixe" que fica tracejado até ter uma peça.
// Só leitura do que o jogador comprou; NÃO é regra de lançamento (quem trava é checkDesign em
// sim/simulate.js). A nave "inteira" é o kit mínimo de cada sistema, não garantia de sucesso.
export function assemblySlots(player) {
  const owned = [...player.spacecraft.parts, ...player.spacecraft.instruments].map((id) => CATALOG[id]).filter(Boolean);
  const slots = [
    { id: 'power', label: 'Energia', ok: owned.some((i) => i.powerGen > 0) },
    { id: 'comms', label: 'Comunicação', ok: owned.some((i) => i.commsRate > 0) },
    { id: 'science', label: 'Instrumento', ok: player.spacecraft.instruments.length > 0 },
  ];
  if (MISSIONS[player.missionId]?.needs.lifeSupport) slots.push({ id: 'life', label: 'Cápsula', ok: owned.some((i) => i.lifeSupport) });
  slots.push({ id: 'launcher', label: 'Foguete', ok: Boolean(LAUNCHERS[player.spacecraft.launcherId]) });
  return slots;
}

// Encaixe que acabou de ser preenchido ganha a animação de "encaixar" uma vez (por jogador).
const lastFilled = new Map();

const GHOST = { fill: 'none', stroke: '#86a8e6', 'stroke-width': 1.2, 'stroke-dasharray': '4 3', opacity: 0.75 };
function ghostLabel(g, x, y, text, anchor = 'middle') {
  const t = svgEl('text', { x, y, 'text-anchor': anchor, 'font-size': 9, fill: '#a9bde3', class: 'sc-ghost-label' });
  t.textContent = text;
  g.appendChild(t);
}

// `assembly`: modo oficina, com os encaixes vazios tracejados e a peça nova encaixando.
export function spacecraftSvg(player, { assembly = false } = {}) {
  const c = visualCounts(player);
  const svg = svgEl('svg', { viewBox: '0 0 320 220', class: `spacecraft${assembly ? ' assembling' : ''}`, role: 'img', 'aria-label': 'Desenho da espaçonave' });
  const slots = assembly ? assemblySlots(player) : [];
  const slotOk = Object.fromEntries(slots.map((sl) => [sl.id, sl.ok]));
  const before = lastFilled.get(player.id);
  const fresh = new Set(before ? slots.filter((sl) => sl.ok && !before.has(sl.id)).map((sl) => sl.id) : []);
  if (assembly) lastFilled.set(player.id, new Set(slots.filter((sl) => sl.ok).map((sl) => sl.id)));
  // Cada sistema desenha dentro do seu grupo (para a animação de encaixe e os testes).
  const layer = (id) => { const g = svgEl('g', { class: `sc-part sc-${id}${fresh.has(id) ? ' snap-in' : ''}` }); svg.appendChild(g); return g; };
  const ghosts = svgEl('g', { class: 'sc-ghosts' });

  // Fundo: estrelas discretas
  for (let i = 0; i < 18; i++) {
    svg.appendChild(svgEl('circle', { cx: (i * 53) % 320, cy: (i * 37) % 220, r: 0.8, fill: '#ffffff', opacity: 0.5 }));
  }

  const cx = 160, cy = 110;
  const hasCapsule = c.capsule > 0;
  const busW = hasCapsule ? 70 : 50, busH = hasCapsule ? 60 : 44;

  // Painéis solares: pequenos (asas curtas) e grandes (asas longas), empilhados
  const gPower = layer('power');
  const panels = (c.panel || 0) + (c.panel_large || 0);
  let offset = 0;
  const drawWing = (len, idx) => {
    const y = cy - busH / 2 + 6 + (idx % 3) * 14;
    const h = 11;
    for (const dir of [-1, 1]) {
      const x = dir === -1 ? cx - busW / 2 - len : cx + busW / 2;
      gPower.appendChild(svgEl('rect', { x, y, width: len, height: h, fill: '#1e5fb3', stroke: '#9fd0ff', 'stroke-width': 1, rx: 1 }));
      for (let s = 1; s < len / 10; s++) gPower.appendChild(svgEl('line', { x1: x + s * 10, y1: y, x2: x + s * 10, y2: y + h, stroke: '#0b1020', 'stroke-width': 0.6 }));
    }
  };
  for (let i = 0; i < (c.panel_large || 0); i++) drawWing(70, offset++);
  for (let i = 0; i < (c.panel || 0); i++) drawWing(40, offset++);

  // Propulsor (atrás/embaixo)
  const gThr = layer('thruster');
  if (c.thruster) {
    gThr.appendChild(svgEl('path', { d: `M${cx - 10},${cy + busH / 2} L${cx - 16},${cy + busH / 2 + 16} L${cx + 16},${cy + busH / 2 + 16} L${cx + 10},${cy + busH / 2} Z`, fill: '#6b7280', stroke: '#cbd5e1' }));
    gThr.appendChild(svgEl('ellipse', { cx, cy: cy + busH / 2 + 20, rx: 8, ry: 5, fill: '#fb923c', opacity: 0.8 }));
  }

  // Corpo (bus) ou cápsula
  const gBus = layer(hasCapsule ? 'life' : 'bus');
  if (hasCapsule) {
    gBus.appendChild(svgEl('path', { d: `M${cx - busW / 2},${cy + busH / 2} L${cx - busW / 2 + 10},${cy - busH / 2} L${cx + busW / 2 - 10},${cy - busH / 2} L${cx + busW / 2},${cy + busH / 2} Z`, fill: '#d1d5db', stroke: '#f9fafb', 'stroke-width': 1.5 }));
    gBus.appendChild(svgEl('circle', { cx, cy: cy - 6, r: 8, fill: '#7dd3fc', stroke: '#f9fafb' })); // janela
  } else {
    gBus.appendChild(svgEl('rect', { x: cx - busW / 2, y: cy - busH / 2, width: busW, height: busH, fill: '#c9a227', stroke: '#f5e6a3', 'stroke-width': 1.5, rx: 3 })); // manta térmica dourada
    gBus.appendChild(svgEl('rect', { x: cx - busW / 2 + 6, y: cy - busH / 2 + 6, width: busW - 12, height: busH - 12, fill: 'none', stroke: '#8a6d1a', 'stroke-dasharray': '3 2' }));
  }

  // Baterias: caixas laterais no corpo
  const gBat = layer('power'); // na frente do corpo, mas encaixa junto com a energia
  for (let i = 0; i < Math.min(c.battery || 0, 3); i++) {
    gBat.appendChild(svgEl('rect', { x: cx + busW / 2 - 8, y: cy + busH / 2 - 10 - i * 9, width: 10, height: 7, fill: '#16a34a', stroke: '#bbf7d0' }));
  }

  // Antenas no topo
  const gComms = layer('comms');
  let top = cy - busH / 2;
  if (c.dish) {
    for (let i = 0; i < Math.min(c.dish, 2); i++) {
      const ax = cx + (i === 0 ? 0 : 22);
      gComms.appendChild(svgEl('line', { x1: ax, y1: top, x2: ax, y2: top - 14, stroke: '#e5e7eb', 'stroke-width': 2 }));
      gComms.appendChild(svgEl('path', { d: `M${ax - 16},${top - 14} Q${ax},${top - 30} ${ax + 16},${top - 14} Z`, fill: '#f3f4f6', stroke: '#9ca3af' }));
      gComms.appendChild(svgEl('line', { x1: ax, y1: top - 14, x2: ax, y2: top - 24, stroke: '#9ca3af' }));
    }
  }
  if (c.antenna) {
    for (let i = 0; i < Math.min(c.antenna, 3); i++) {
      const ax = cx - 18 - i * 7;
      gComms.appendChild(svgEl('line', { x1: ax, y1: top, x2: ax, y2: top - 22, stroke: '#e5e7eb', 'stroke-width': 1.5 }));
      gComms.appendChild(svgEl('circle', { cx: ax, cy: top - 23, r: 2, fill: '#f87171' }));
    }
  }

  // Instrumentos na frente (embaixo do corpo): caixinhas coloridas
  const instruments = [];
  for (let i = 0; i < (c.camera_large || 0); i++) instruments.push({ w: 16, h: 12, fill: '#7c3aed' });
  for (let i = 0; i < (c.camera || 0); i++) instruments.push({ w: 10, h: 10, fill: '#a78bfa' });
  for (let i = 0; i < (c.spectro || 0); i++) instruments.push({ w: 14, h: 9, fill: '#f472b6' });
  for (let i = 0; i < (c.beacon || 0); i++) instruments.push({ w: 6, h: 6, fill: '#f87171' });
  const gSci = layer('science');
  let ix = cx - (instruments.reduce((a, b) => a + b.w + 3, 0) - 3) / 2;
  for (const it of instruments.slice(0, 8)) {
    gSci.appendChild(svgEl('rect', { x: ix, y: cy + busH / 2 - 2, width: it.w, height: it.h, fill: it.fill, stroke: '#f9fafb', 'stroke-width': 0.8, rx: 1 }));
    if (it.fill.startsWith('#a7') || it.fill === '#7c3aed') gSci.appendChild(svgEl('circle', { cx: ix + it.w / 2, cy: cy + busH / 2 - 2 + it.h / 2, r: it.w / 4, fill: '#0b1020' })); // lente
    ix += it.w + 3;
  }

  // Magnetômetro: haste (boom) lateral longa
  if (c.boom) {
    gSci.appendChild(svgEl('line', { x1: cx + busW / 2, y1: cy - busH / 2 + 2, x2: cx + busW / 2 + 60, y2: cy - busH / 2 - 20, stroke: '#9ca3af', 'stroke-width': 1.5 }));
    gSci.appendChild(svgEl('circle', { cx: cx + busW / 2 + 60, cy: cy - busH / 2 - 20, r: 4, fill: '#fbbf24' }));
  }

  // Lançador escolhido: silhueta no canto, tamanho conforme a classe
  const launcher = LAUNCHERS[player.spacecraft.launcherId];
  const gLaunch = layer('launcher');
  if (launcher) {
    const h = { small: 50, medium: 75, heavy: 100 }[launcher.id] || 50;
    const rx = 292, base = 205;
    gLaunch.appendChild(svgEl('rect', { x: rx - 7, y: base - h, width: 14, height: h, fill: '#e5e7eb', rx: 3 }));
    gLaunch.appendChild(svgEl('path', { d: `M${rx - 7},${base - h} L${rx},${base - h - 12} L${rx + 7},${base - h} Z`, fill: '#ef4444' }));
    gLaunch.appendChild(svgEl('path', { d: `M${rx - 7},${base} L${rx - 14},${base + 6} L${rx - 7},${base - 12} Z`, fill: '#ef4444' }));
    gLaunch.appendChild(svgEl('path', { d: `M${rx + 7},${base} L${rx + 14},${base + 6} L${rx + 7},${base - 12} Z`, fill: '#ef4444' }));
    const label = svgEl('text', { x: rx, y: 216, 'text-anchor': 'middle', 'font-size': 8, fill: '#9aa5c7' });
    label.textContent = launcher.name.replace('Lançador ', '');
    gLaunch.appendChild(label);
  }

  if (assembly) {
    // Encaixes vazios: o contorno tracejado mostra onde a próxima peça vai entrar.
    const bx = cx - busW / 2, by = cy - busH / 2;
    if (!slotOk.power) {
      for (const x of [bx - 46, cx + busW / 2 + 6]) ghosts.appendChild(svgEl('rect', { x, y: by + 6, width: 40, height: 12, rx: 1, ...GHOST }));
      ghostLabel(ghosts, bx - 26, by + 32, 'energia');
    }
    if (!slotOk.comms) {
      ghosts.appendChild(svgEl('line', { x1: cx, y1: by, x2: cx, y2: by - 14, ...GHOST }));
      ghosts.appendChild(svgEl('path', { d: `M${cx - 16},${by - 14} Q${cx},${by - 30} ${cx + 16},${by - 14} Z`, ...GHOST }));
      ghostLabel(ghosts, cx + 22, by - 20, 'comunicação', 'start');
    }
    if (!slotOk.science) {
      ghosts.appendChild(svgEl('rect', { x: cx - 15, y: by + busH - 2, width: 30, height: 12, rx: 1, ...GHOST }));
      ghostLabel(ghosts, cx, by + busH + 22, 'instrumento');
    }
    if (slotOk.life === false) {
      const w = 74, h = 62;
      ghosts.appendChild(svgEl('path', { d: `M${cx - w / 2},${cy + h / 2} L${cx - w / 2 + 10},${cy - h / 2} L${cx + w / 2 - 10},${cy - h / 2} L${cx + w / 2},${cy + h / 2} Z`, ...GHOST }));
      ghostLabel(ghosts, cx - w / 2 - 4, cy + h / 2 + 2, 'cápsula', 'end');
    }
    if (!slotOk.launcher) {
      const rx = 292, base = 205, h = 60;
      ghosts.appendChild(svgEl('path', { d: `M${rx - 7},${base} L${rx - 7},${base - h} L${rx},${base - h - 12} L${rx + 7},${base - h} L${rx + 7},${base} Z`, ...GHOST }));
      ghostLabel(ghosts, rx, 216, 'foguete');
    }
    svg.appendChild(ghosts);
    return svg;
  }

  // Vazio: dica
  if (!panels && !instruments.length && !c.antenna && !c.dish && !hasCapsule) {
    const t = svgEl('text', { x: cx, y: cy + busH / 2 + 30, 'text-anchor': 'middle', 'font-size': 10, fill: '#9aa5c7' });
    t.textContent = 'Compre peças para montar a espaçonave';
    svg.appendChild(t);
  }

  return svg;
}
