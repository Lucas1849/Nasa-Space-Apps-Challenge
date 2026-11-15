// Oficina de engenharia: o centro do jogo. Comprar/vender peças, escolher lançador e órbita,
// e ver em tempo real se o projeto fecha (massa, energia, dados, ciência, vida útil, verba)
// e qual o risco do voo. É a decisão central: lançar agora ou esperar melhorar.
import { el, button, hud, gauges, designChecklist, glossary, missionPicker, ITEM_ICONS, panelTitle, outcomeCard } from './components.js';
import { icon } from './icons.js';
import { guideCard, hl } from './guide.js';
import { spacecraftSvg } from './spacecraft.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { PARTS } from '../data/parts.js';
import { LAUNCHERS } from '../data/launchers.js';
import { ORBITS } from '../data/orbits.js';
import { MISSIONS } from '../data/missions.js';
import { currentPlayer, REHEARSAL_COST } from '../sim/state.js';
import { isHidden, needLevel } from '../sim/needs.js';
import { priceFor, isLocked, requiredTech, discountFor, isDiscovered, undiscoveredItems } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { missionRisk, describeRisk, pct } from '../sim/flight.js';

function itemCard(player, item, actions) {
  const owned = [...player.spacecraft.instruments, ...player.spacecraft.parts].filter((id) => id === item.id).length;
  const price = priceFor(player, item.id);
  const locked = isLocked(player, item);
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
  return el('div', { class: `card ${owned ? 'owned' : ''} ${locked ? 'locked' : ''}` }, [
    el('div', { class: 'card-head' }, [
      el('span', { class: 'icon' }, icon(ITEM_ICONS[item.visual] || 'hexnut', { size: 22 })),
      el('strong', {}, item.name),
      owned ? el('span', { class: 'badge' }, `×${owned}`) : null,
    ]),
    el('div', { class: 'pills' }, [
      ...gains.map((g) => el('span', { class: 'pill gain' }, g)),
      ...costs.map((c) => el('span', { class: 'pill lose' }, c)),
    ]),
    el('div', { class: 'row' }, [
      locked
        ? el('span', { class: 'lock', title: 'Ganhe tecnologia esperando, no Laboratório ou nas casas de cooperação científica.' }, [icon('lock', { size: 14 }), `exige tecnologia ${requiredTech(player, item)}`])
        : button(['Comprar por', el('span', { class: 'price' }, price)], () => actions.buyItem(item.id), { disabled: player.funds < price, class: 'small' }),
      button('Vender', () => actions.sellItem(item.id), { disabled: !owned, class: 'small ghost' }),
    ]),
  ]);
}

function choice(label, options, selectedId, onPick, describe, player, cls = '') {
  return el('div', { class: `choice ${cls}` }, [
    el('h2', {}, label),
    el('div', { class: 'row wrap' }, Object.values(options).map((o) => {
      const locked = player && isLocked(player, o);
      return button(locked ? [icon('lock', { size: 14 }), `${o.name}: exige tecnologia ${requiredTech(player, o)}`] : describe(o), () => onPick(o.id), {
        class: o.id === selectedId ? 'selected' : '',
        disabled: locked,
      });
    })),
  ]);
}

// Risco do voo antes de lançar: etapa por etapa, com o porquê.
function riskPanel(player) {
  const risk = missionRisk(player);
  return el('div', { class: 'panel' }, [
    panelTitle('die', `Risco do voo: ${pct(risk.total)}`),
    el('ul', { class: 'risk-list' }, risk.stages.map((s) => el('li', {}, [el('strong', {}, s.name), el('small', {}, describeRisk(s.risk))]))),
    el('p', { class: 'hint' }, 'Sem contar imprevistos das casas. Margem de massa e energia, antenas e bateria reservas, dados de falha e o Controle de missão reduzem o risco. Cada proteção salva uma etapa que falharia.'),
  ]);
}

export function workshopScreen(state, actions) {
  const p = currentPlayer(state);
  const back = state.sandbox ? button([icon('refresh', { size: 16 }), 'Nova partida'], () => actions.newGame(), { class: 'ghost' }) : button([icon('arrowLeft', { size: 16 }), 'Voltar ao tabuleiro'], () => actions.go('board'), { class: `ghost ${hl(state, 'workshop', 'back')}` });

  if (!p.missionId) {
    return el('section', { class: 'screen workshop' }, [
      hud(state, p, 'workshop', actions),
      state.sandbox ? el('h2', {}, 'Escolha a missão antes de projetar a nave') : el('h2', {}, 'Sua escada está completa'),
      el('p', { class: 'hint' }, state.sandbox
        ? 'O desafio começa pelos requisitos: cada missão exige uma órbita, ciência, comunicação e vida útil diferentes.'
        : 'Não há mais degraus para projetar. O vencedor é revelado no fim da rodada.'),
      state.sandbox ? missionPicker(state, p, actions) : null,
      el('div', { class: 'row' }, [back]),
    ]);
  }

  const mission = MISSIONS[p.missionId];
  const design = checkDesign(p);
  // Mínimos de ciência e comunicação escondidos (sim/needs.js): só a pista, sem o número.
  const hidden = isHidden(p);
  const needs = [
    hidden ? `ciência ${needLevel('science', mission.needs.science)}` : `ciência ≥ ${mission.needs.science}`,
    hidden ? `comunicação ${needLevel('comms', mission.needs.comms)}` : `comunicação ≥ ${mission.needs.comms}`,
    `vida útil ≥ ${mission.needs.lifetime} ano(s)`,
    mission.needs.lifeSupport && 'suporte de vida',
  ].filter(Boolean).join(' · ');
  const blocked = p.flight ? 'Você já tem uma nave em voo: monte esta para depois.'
    : !state.sandbox && !p.rolled ? 'Ande no tabuleiro antes de lançar.'
      : !state.sandbox && p.launchedThisTurn ? 'Só um lançamento por turno.'
        : null;
  const discount = discountFor(p);
  // Só aparece o que o jogador já descobriu (sim/resources.js); o resto é revelado pelo tabuleiro.
  const known = (items) => Object.values(items).filter((item) => isDiscovered(p, item));
  const launchers = Object.fromEntries(known(LAUNCHERS).map((l) => [l.id, l]));
  const instruments = known(INSTRUMENTS);
  const parts = known(PARTS);
  const moreToDiscover = !state.sandbox && undiscoveredItems(p).length > 0;

  return el('section', { class: 'screen workshop' }, [
    hud(state, p, 'workshop', actions),
    guideCard(state, 'workshop'),
    p.flight ? el('p', { class: 'banner' }, `Sua nave da missão "${MISSIONS[p.flight.missionId].name}" está em voo. Você já pode montar a do próximo degrau: "${mission.name}". Se o voo falhar, a oficina volta para o degrau atual.`) : null,
    state.sandbox ? el('details', { class: 'swap' }, [el('summary', {}, 'Trocar de missão'), missionPicker(state, p, actions)]) : null,
    el('div', { class: 'workshop-grid' }, [
      el('div', {}, [
        el('div', { class: 'spacecraft-box' }, [spacecraftSvg(p), el('span', { class: 'caption' }, `${mission.name} · ${ORBITS[mission.orbit].name} · precisa: ${needs}`)]),
        discount ? el('p', { class: 'hint with-icon' }, [icon('tag', { size: 16 }), `Desconto ativo: ${discount}% (Fábrica e eventos).`]) : null,
        choice('Veículo de lançamento', launchers, p.spacecraft.launcherId, actions.chooseLauncher,
          (l) => `${l.name}: carga ${l.maxMass}, custa ${l.cost}, alcança ${l.reach.map((r) => ORBITS[r].name.split(' (')[0]).join(', ')}`, p, hl(state, 'workshop', 'launcher')),
        // No jogo normal a órbita é a da missão e já vem escolhida (ver setMission em sim/actions.js).
        state.sandbox
          ? choice('Órbita', ORBITS, p.spacecraft.orbitId, actions.chooseOrbit,
            (o) => `${o.name}: ${o.baseLifetime} anos de vida, sinal −${o.commsPenalty * 100}%${o.scienceBonus ? `, ciência +${o.scienceBonus}` : ''}${o.id === mission.orbit ? ' (exigida pela missão)' : ''}`, null, hl(state, 'workshop', 'orbit'))
          : null,
        instruments.length ? el('h2', {}, 'Instrumentos científicos') : null,
        instruments.length ? el('div', { class: 'cards' }, instruments.map((i) => itemCard(p, i, actions))) : null,
        parts.length ? el('h2', {}, 'Energia, comunicação, propulsão e suporte de vida') : null,
        parts.length ? el('div', { class: 'cards' }, parts.map((i) => itemCard(p, i, actions))) : null,
        moreToDiscover ? el('p', { class: 'hint with-icon' }, [icon('cart', { size: 16 }), 'Há mais peças para descobrir: na Feira de fornecedores, no Ano Geofísico Internacional e a cada Ano novo.']) : null,
      ]),
      el('aside', { class: 'side' }, [
        el('div', { class: 'panel' }, [panelTitle('gauge', 'Painel de recursos'), gauges(p)]),
        el('div', { class: `panel ${hl(state, 'workshop', 'checks')}` }, [panelTitle('clipboard', 'Checagem do projeto'), designChecklist(p)]),
        design.ok ? riskPanel(p) : null,
        blocked && design.ok ? el('p', { class: 'hint' }, blocked) : null,
        hidden && design.ok ? el('p', { class: 'hint with-icon' }, [icon('eye', { size: 16 }), 'Você ainda não sabe se a nave atende aos mínimos da missão. Faça um ensaio em solo ou lance e descubra: errar também ensina.']) : null,
        outcomeCard(state, p),
        el('div', { class: 'row', style: 'margin:0' }, [
          button([icon('rocket', { size: 18 }), 'Lançar'], () => actions.launch(), { disabled: !design.ok || Boolean(blocked), class: `primary ${hl(state, 'workshop', 'launch')}`, title: blocked || (design.ok ? (hidden ? 'Os mínimos de ciência e comunicação ainda são desconhecidos: você descobre ao lançar.' : 'Tudo pronto.') : 'Resolva os itens em vermelho. Os amarelos só reduzem a ciência.') }),
          hidden && !p.flight ? button([icon('testTube', { size: 18 }), `Ensaio em solo (${REHEARSAL_COST})`], () => actions.rehearse(), {
            disabled: p.rehearsedThisTurn || p.funds < REHEARSAL_COST,
            class: `ghost ${hl(state, 'workshop', 'rehearse')}`,
            title: p.rehearsedThisTurn ? 'Só um ensaio por turno.' : `Por ${REHEARSAL_COST} de verba, diz em palavras se a nave atende aos mínimos da missão. Não gasta foguete.`,
          }) : null,
          back,
        ]),
        glossary(),
      ]),
    ]),
  ]);
}
