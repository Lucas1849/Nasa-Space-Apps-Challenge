// Oficina de engenharia: o centro do jogo. Comprar/vender peças, escolher lançador e órbita,
// e ver em tempo real se o projeto fecha (massa, energia, dados, ciência, vida útil, verba).
import { el, button, hud, gauges, designChecklist, glossary, ITEM_ICONS } from './components.js';
import { spacecraftSvg } from './spacecraft.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { PARTS } from '../data/parts.js';
import { LAUNCHERS } from '../data/launchers.js';
import { ORBITS } from '../data/orbits.js';
import { MISSIONS } from '../data/missions.js';
import { currentPlayer } from '../sim/state.js';
import { priceFor } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';

function itemCard(player, item, actions) {
  const owned = [...player.spacecraft.instruments, ...player.spacecraft.parts].filter((id) => id === item.id).length;
  const price = priceFor(player, item.id);
  const gains = [
    item.powerGen && `+${item.powerGen} energia`,
    item.commsRate && `+${item.commsRate} comunicação`,
    item.science && `+${item.science} ciência`,
    item.lifetimeBonus && `+${item.lifetimeBonus} ano(s)`,
    item.lifeSupport && 'suporte de vida',
  ].filter(Boolean);
  const costs = [
    `${item.mass} massa`,
    item.power && `${item.power} energia`,
    item.dataRate && `${item.dataRate} dados`,
  ].filter(Boolean);
  return el('div', { class: `card ${owned ? 'owned' : ''}` }, [
    el('div', { class: 'card-head' }, [
      el('span', { class: 'icon' }, ITEM_ICONS[item.visual] || '🔩'),
      el('strong', {}, item.name),
      owned ? el('span', { class: 'badge' }, `×${owned}`) : null,
    ]),
    el('div', { class: 'pills' }, [
      ...gains.map((g) => el('span', { class: 'pill gain' }, g)),
      ...costs.map((c) => el('span', { class: 'pill lose' }, c)),
    ]),
    el('div', { class: 'row' }, [
      button([el('span', { class: 'price' }, `💰 ${price}`), ' Comprar'], () => actions.buyItem(item.id), { disabled: player.funds < price, class: 'small' }),
      button('Vender', () => actions.sellItem(item.id), { disabled: !owned, class: 'small ghost' }),
    ]),
  ]);
}

function choice(label, options, selectedId, onPick, describe) {
  return el('div', { class: 'choice' }, [
    el('h2', {}, label),
    el('div', { class: 'row wrap' }, Object.values(options).map((o) =>
      button(describe(o), () => onPick(o.id), { class: o.id === selectedId ? 'selected' : '' }))),
  ]);
}

export function workshopScreen(state, actions) {
  const p = currentPlayer(state);
  const mission = MISSIONS[p.missionId];
  const design = checkDesign(p);
  const needs = [
    `ciência ≥ ${mission.needs.science}`,
    `comunicação ≥ ${mission.needs.comms}`,
    `vida útil ≥ ${mission.needs.lifetime} ano(s)`,
    mission.needs.lifeSupport && 'suporte de vida',
  ].filter(Boolean).join(' · ');

  return el('section', { class: 'screen workshop' }, [
    hud(state, p, 'workshop'),
    el('div', { class: 'workshop-grid' }, [
      el('div', {}, [
        el('div', { class: 'spacecraft-box' }, [spacecraftSvg(p), el('span', { class: 'caption' }, `${mission.name} · ${ORBITS[mission.orbit].name} · precisa: ${needs}`)]),
        el('h2', {}, '🔬 Instrumentos científicos'),
        el('div', { class: 'cards' }, Object.values(INSTRUMENTS).map((i) => itemCard(p, i, actions))),
        el('h2', {}, '⚙️ Energia, comunicação, propulsão e suporte de vida'),
        el('div', { class: 'cards' }, Object.values(PARTS).map((i) => itemCard(p, i, actions))),
        choice('🚀 Veículo de lançamento', LAUNCHERS, p.spacecraft.launcherId, actions.chooseLauncher,
          (l) => `${l.name} · carga ${l.maxMass} · 💰 ${l.cost} · ${l.reach.map((r) => ORBITS[r].name.split(' (')[0]).join(', ')}`),
        choice('🪐 Órbita', ORBITS, p.spacecraft.orbitId, actions.chooseOrbit,
          (o) => `${o.name} · ${o.baseLifetime} anos de vida · sinal −${o.commsPenalty * 100}%${o.scienceBonus ? ` · ciência +${o.scienceBonus}` : ''}`),
      ]),
      el('aside', { class: 'side' }, [
        el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, '📊 Painel de recursos'), gauges(p)]),
        el('div', { class: 'panel' }, [el('h3', { style: 'margin-top:0' }, '✅ Checagem do projeto'), designChecklist(p)]),
        el('div', { class: 'row', style: 'margin:0' }, [
          button('🚀 Lançar', () => actions.launch(), { disabled: !design.ok, class: 'primary', title: design.ok ? 'Tudo pronto.' : 'Resolva os itens em vermelho. Os amarelos só reduzem a ciência.' }),
          state.sandbox ? button('Nova partida', () => actions.newGame(), { class: 'ghost' }) : button('← Tabuleiro', () => actions.go('board'), { class: 'ghost' }),
        ]),
        glossary(),
      ]),
    ]),
  ]);
}
