// Oficina de engenharia: o centro do jogo. Comprar/vender peças, escolher lançador e órbita,
// e ver em tempo real se o projeto fecha (massa, energia, dados, ciência, verba).
import { el, button, resourceBar, checklist } from './components.js';
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
  const stats = [
    `massa ${item.mass}`,
    item.power ? `usa ${item.power} energia` : null,
    item.powerGen ? `gera ${item.powerGen} energia` : null,
    item.dataRate ? `${item.dataRate} dados` : null,
    item.commsRate ? `comunica ${item.commsRate}` : null,
    item.science ? `ciência ${item.science}` : null,
    item.lifeSupport ? 'suporte de vida' : null,
  ].filter(Boolean).join(' · ');
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, [el('strong', {}, item.name), owned ? el('span', { class: 'badge' }, `×${owned}`) : null]),
    el('div', { class: 'card-stats' }, stats),
    el('div', { class: 'row' }, [
      button(`Comprar (${price})`, () => actions.buyItem(item.id), { disabled: player.funds < price }),
      button('Vender', () => actions.sellItem(item.id), { disabled: !owned }),
    ]),
  ]);
}

function choice(label, options, selectedId, onPick, describe) {
  return el('div', { class: 'choice' }, [
    el('h3', {}, label),
    el('div', { class: 'row wrap' }, Object.values(options).map((o) =>
      button(describe(o), () => onPick(o.id), { class: o.id === selectedId ? 'selected' : '' }))),
  ]);
}

export function workshopScreen(state, actions) {
  const p = currentPlayer(state);
  const mission = MISSIONS[p.missionId];
  const design = checkDesign(p);

  return el('section', { class: 'screen workshop' }, [
    el('header', { class: 'turn-header' }, [
      el('h1', {}, `Oficina — ${p.name}`),
      el('p', {}, [`Missão: `, el('strong', {}, mission.name), ` (${ORBITS[mission.orbit].name}). Precisa de ciência ≥ ${mission.needs.science}, comunicação ≥ ${mission.needs.comms}${mission.needs.lifeSupport ? ', suporte de vida' : ''}.`]),
    ]),
    el('div', { class: 'workshop-grid' }, [
      el('div', { class: 'col' }, [
        el('h2', {}, 'Instrumentos científicos'),
        el('div', { class: 'cards' }, Object.values(INSTRUMENTS).map((i) => itemCard(p, i, actions))),
        el('h2', {}, 'Energia, comunicação e suporte de vida'),
        el('div', { class: 'cards' }, Object.values(PARTS).map((i) => itemCard(p, i, actions))),
        choice('Veículo de lançamento', LAUNCHERS, p.spacecraft.launcherId, actions.chooseLauncher,
          (l) => `${l.name} — carga ${l.maxMass}, custo ${l.cost}, alcança ${l.reach.map((r) => ORBITS[r].name.split(' (')[0]).join(', ')}`),
        choice('Órbita', ORBITS, p.spacecraft.orbitId, actions.chooseOrbit,
          (o) => `${o.name} — ${o.description}`),
      ]),
      el('aside', { class: 'col side' }, [
        el('h2', {}, 'Painel de recursos'),
        resourceBar(p),
        el('h2', {}, 'Checagem do projeto'),
        checklist(p),
        el('div', { class: 'row' }, [
          button('🚀 Lançar', () => actions.launch(), { disabled: !design.ok, class: 'primary' }),
          button('← Voltar ao tabuleiro', () => actions.go('board')),
        ]),
      ]),
    ]),
  ]);
}
