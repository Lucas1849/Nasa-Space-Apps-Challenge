// Oficina de engenharia: o centro do jogo. Comprar/vender peças, escolher lançador e órbita,
// e ver em tempo real se o projeto fecha (massa, energia, dados, ciência, vida útil, verba).
import { el, button, resourceBar, designChecklist, glossary } from './components.js';
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
    item.powerGen ? `+${item.powerGen} energia` : null,
    item.commsRate ? `+${item.commsRate} comunicação` : null,
    item.science ? `+${item.science} ciência` : null,
    item.lifetimeBonus ? `+${item.lifetimeBonus} ano(s) de vida` : null,
    item.lifeSupport ? 'suporte de vida' : null,
  ].filter(Boolean).join(' · ');
  const costs = [
    `massa ${item.mass}`,
    item.power ? `usa ${item.power} energia` : null,
    item.dataRate ? `gera ${item.dataRate} dados` : null,
  ].filter(Boolean).join(' · ');
  return el('div', { class: 'card' }, [
    el('div', { class: 'card-title' }, [el('strong', {}, item.name), owned ? el('span', { class: 'badge' }, `×${owned}`) : null]),
    el('div', { class: 'card-stats gain' }, `Ganha: ${gains || '—'}`),
    el('div', { class: 'card-stats lose' }, `Custa: ${costs}`),
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
  const needs = [
    `ciência ≥ ${mission.needs.science}`,
    `comunicação ≥ ${mission.needs.comms}`,
    `vida útil ≥ ${mission.needs.lifetime} ano(s)`,
    mission.needs.lifeSupport ? 'suporte de vida' : null,
  ].filter(Boolean).join(', ');

  return el('section', { class: 'screen workshop' }, [
    el('header', { class: 'turn-header' }, [
      el('h1', {}, `Oficina — ${p.name}`),
      el('p', {}, [`Missão: `, el('strong', {}, mission.name), ` (${ORBITS[mission.orbit].name}). ${mission.goal} Precisa de ${needs}.`]),
    ]),
    el('div', { class: 'workshop-grid' }, [
      el('div', { class: 'col' }, [
        el('div', { class: 'spacecraft-box' }, spacecraftSvg(p)),
        el('h2', {}, 'Instrumentos científicos'),
        el('div', { class: 'cards' }, Object.values(INSTRUMENTS).map((i) => itemCard(p, i, actions))),
        el('h2', {}, 'Energia, comunicação, propulsão e suporte de vida'),
        el('div', { class: 'cards' }, Object.values(PARTS).map((i) => itemCard(p, i, actions))),
        choice('Veículo de lançamento', LAUNCHERS, p.spacecraft.launcherId, actions.chooseLauncher,
          (l) => `${l.name} — carga ${l.maxMass}, custo ${l.cost}, alcança ${l.reach.map((r) => ORBITS[r].name.split(' (')[0]).join(', ')}`),
        choice('Órbita', ORBITS, p.spacecraft.orbitId, actions.chooseOrbit,
          (o) => `${o.name} — ${o.description} Vida útil base: ${o.baseLifetime} anos.`),
      ]),
      el('aside', { class: 'col side' }, [
        el('h2', {}, 'Painel de recursos'),
        resourceBar(p),
        el('h2', {}, 'Checagem do projeto'),
        designChecklist(p),
        el('div', { class: 'row' }, [
          button('🚀 Lançar', () => actions.launch(), { disabled: !design.ok, class: 'primary', title: design.ok ? 'Tudo pronto.' : 'Resolva os itens em vermelho. Os amarelos só reduzem a ciência.' }),
          state.sandbox ? null : button('← Voltar ao tabuleiro', () => actions.go('board')),
          state.sandbox ? button('Nova partida', () => actions.newGame()) : null,
        ]),
        glossary(),
      ]),
    ]),
  ]);
}
