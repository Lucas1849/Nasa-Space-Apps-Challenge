// Oficina de engenharia: o centro do jogo. Comprar/vender peças, escolher lançador e órbita,
// e ver em tempo real se o projeto fecha (massa, energia, dados, ciência, vida útil, verba)
// e qual o risco do voo. É a decisão central: lançar agora ou esperar melhorar.
import { el, button, hud, gauges, checklist, glossary, missionPicker, ITEM_ICONS, panelTitle, outcomeCard } from './components.js';
import { icon } from './icons.js';
import { itemPhotoSvg } from './itemArt.js';
import { guideCard, hl } from './guide.js';
import { spacecraftSvg, assemblySlots } from './spacecraft.js';
import { INSTRUMENTS } from '../data/instruments.js';
import { PARTS } from '../data/parts.js';
import { LAUNCHERS } from '../data/launchers.js';
import { ORBITS } from '../data/orbits.js';
import { MISSIONS } from '../data/missions.js';
import { currentPlayer, REHEARSAL_COST } from '../sim/state.js';
import { atWorkshopTile } from '../board/board.js';
import { isHidden, needLevel } from '../sim/needs.js';
import { priceFor, isLocked, requiredTech, discountFor, isDiscovered, undiscoveredItems, refundFor } from '../sim/resources.js';
import { checkDesign } from '../sim/simulate.js';
import { missionRisk, describeRisk, pct } from '../sim/flight.js';
import { t } from '../i18n/index.js';

// Peças a bordo no desenho anterior (por jogador), para a peça recém-comprada "entrar" com um pulo.
let lastOwned = { playerId: null, counts: {} };

const ownedCount = (player, id) => [...player.spacecraft.instruments, ...player.spacecraft.parts].filter((x) => x === id).length;

// Fora de uma casa de oficina a tela é só de planejamento: ver é livre, agir exige a casa (sim/actions.js, workshopLock).
const AWAY_HINT = () => t('ws.awayHint');

// `canAct` falso trava comprar/vender: na oficina de espectador (ui/spectate.js) ou longe de uma casa de Oficina.
function itemCard(player, item, actions, justBought = false, canAct = true) {
  const owned = ownedCount(player, item.id);
  const price = priceFor(player, item.id);
  const locked = isLocked(player, item);
  const gains = [
    item.powerGen && t('board.offer.power', { n: item.powerGen }),
    item.commsRate && t('board.offer.comms', { n: item.commsRate }),
    item.science && t('board.offer.science', { n: item.science }),
    item.lifetimeBonus && t('board.offer.life', { n: item.lifetimeBonus }),
    item.lifeSupport && t('board.offer.lifeSupport'),
  ].filter(Boolean);
  const costs = [
    t('board.offer.mass', { n: item.mass }),
    item.power && t('board.offer.powerCost', { n: item.power }),
    item.dataRate && t('board.offer.data', { n: item.dataRate }),
  ].filter(Boolean);
  return el('div', { class: `card ${owned ? 'owned' : ''} ${locked ? 'locked' : ''} ${justBought ? 'just-bought' : ''}` }, [
    // "Foto" 3D do item (ui/itemArt.js), para reconhecer a peça antes de ler os números.
    el('span', { class: 'item-photo', 'aria-hidden': 'true', html: itemPhotoSvg(item.visual) }),
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
        ? el('span', { class: 'lock', title: t('ws.lockTitle') }, [icon('lock', { size: 14 }), t('ws.requiresTech', { n: requiredTech(player, item) })])
        : button([t('ws.buy'), el('span', { class: 'price' }, price)], () => actions.buyItem(item.id), { disabled: !canAct || player.funds < price, class: 'small', title: canAct ? '' : AWAY_HINT() }),
      button(t('ws.sell', { n: refundFor(item.id) }), () => actions.sellItem(item.id), { disabled: !canAct || !owned, class: 'small ghost', title: canAct ? t('ws.sellTitle', { n: refundFor(item.id) }) : AWAY_HINT() }),
    ]),
  ]);
}

function choice(label, options, selectedId, onPick, describe, player, cls = '', canAct = true) {
  return el('div', { class: `choice ${cls}` }, [
    el('h2', {}, label),
    el('div', { class: 'row wrap' }, Object.values(options).map((o) => {
      const locked = player && isLocked(player, o);
      const photo = itemPhotoSvg(o.id);
      const optLabel = locked ? [icon('lock', { size: 14 }), t('ws.lockedChoice', { name: o.name, n: requiredTech(player, o) })] : describe(o);
      return button(photo ? [el('span', { class: 'choice-photo', 'aria-hidden': 'true', html: photo }), el('span', {}, [].concat(optLabel))] : optLabel, () => onPick(o.id), {
        class: o.id === selectedId ? 'selected' : '',
        disabled: locked || !canAct,
      });
    })),
  ]);
}

// Checagem do projeto enxuta: primeiro o que falta (vermelho impede o lançamento, amarelo só reduz a
// ciência, cinza é desconhecido); o que já está certo fica recolhido em "N itens ok".
function compactChecklist(player) {
  const checks = checkDesign(player).checks;
  const open = checks.filter((c) => c.hidden || !c.ok);
  const done = checks.filter((c) => !c.hidden && c.ok);
  return el('div', { class: 'checks-compact' }, [
    open.length ? checklist(open) : el('p', { class: 'all-ok' }, [icon('check', { size: 16 }), t('ws.allOk')]),
    done.length ? el('details', { class: 'checks-ok' }, [el('summary', {}, t(done.length === 1 ? 'ws.nOk.one' : 'ws.nOk.other', { n: done.length })), checklist(done)]) : null,
  ]);
}

// Risco do voo antes de lançar: etapa por etapa, com o porquê.
function riskPanel(player) {
  const risk = missionRisk(player);
  return el('div', { class: 'panel' }, [
    panelTitle('die', t('ws.riskTitle', { pct: pct(risk.total) })),
    el('ul', { class: 'risk-list' }, risk.stages.map((s) => el('li', {}, [el('strong', {}, s.name), el('small', {}, describeRisk(s.risk))]))),
    el('p', { class: 'hint' }, t('ws.riskHint')),
  ]);
}

// `viewer`/`opts.readOnly`: por padrão a oficina é do jogador da vez e totalmente interativa.
// A tela de espectador (ui/spectate.js) passa a SUA agência com readOnly para você ver as peças,
// o projeto e as dicas da sua nave enquanto espera, sem poder comprar, vender ou lançar.
const launchersCount = (obj) => Object.keys(obj).length;

export function workshopScreen(state, actions, viewer = null, opts = {}) {
  const p = viewer ?? currentPlayer(state);
  const readOnly = Boolean(opts.readOnly);
  // Ver é livre, agir exige a casa: o espectador nunca age; o jogador da vez só age numa casa de Oficina (ou no sandbox).
  const canAct = !readOnly && (state.sandbox || atWorkshopTile(p));
  const back = state.sandbox ? button([icon('refresh', { size: 16 }), t('ws.newGame')], () => actions.newGame(), { class: 'ghost' }) : button([icon('arrowLeft', { size: 16 }), readOnly ? t('ws.backSpectate') : t('ws.backBoard')], () => actions.go('board'), { class: `ghost ${hl(state, 'workshop', 'back', p)}` });

  if (!p.missionId) {
    return el('section', { class: 'screen workshop' }, [
      hud(state, p, 'workshop', actions),
      state.sandbox ? el('h2', {}, t('ws.pickMission')) : el('h2', {}, t('ws.ladderComplete')),
      el('p', { class: 'hint' }, state.sandbox ? t('ws.sandboxHint') : t('ws.noSteps')),
      state.sandbox ? missionPicker(state, p, actions) : null,
      el('div', { class: 'row' }, [back]),
    ]);
  }

  // Com a nave em voo a oficina fica fechada (jogo normal): a próxima nave e o kit do próximo degrau só
  // aparecem quando esta cumprir a missão (sim/actions.js, completeMission).
  if (p.flight && !state.sandbox) {
    const flying = MISSIONS[p.flight.missionId];
    return el('section', { class: 'screen workshop' }, [
      hud(state, p, 'workshop', actions),
      el('div', { class: 'panel flight-wait' }, [
        panelTitle('satellite', t('ws.closedTitle')),
        el('p', {}, t('ws.closedP1', { name: flying.name })),
        el('p', { class: 'hint' }, t('ws.closedP2')),
        el('p', { class: 'hint' }, t('ws.closedP3', { n: p.flight.stageIndex + 1, total: p.flight.plan.length })),
      ]),
      el('div', { class: 'row' }, [back]),
    ]);
  }

  const mission = MISSIONS[p.missionId];
  const design = checkDesign(p);
  // Mínimos de ciência e comunicação escondidos (sim/needs.js): só a pista, sem o número.
  const hidden = isHidden(p);
  const needs = [
    hidden ? t('ws.need.science', { hint: needLevel('science', mission.needs.science) }) : t('ws.need.scienceMin', { n: mission.needs.science }),
    hidden ? t('ws.need.comms', { hint: needLevel('comms', mission.needs.comms) }) : t('ws.need.commsMin', { n: mission.needs.comms }),
    t('ws.need.lifetime', { n: mission.needs.lifetime }),
    mission.needs.lifeSupport && t('ws.need.lifeSupport'),
  ].filter(Boolean).join(' · ');
  const blocked = p.flight ? t('ws.blocked.inFlight')
    : !readOnly && !canAct ? t('ws.blocked.planning')
    : !state.sandbox && !p.rolled ? t('ws.blocked.move')
      : !state.sandbox && p.launchedThisTurn ? t('ws.blocked.once')
        : null;
  const discount = discountFor(p);
  // Só aparece o que o jogador já descobriu (sim/resources.js); o resto é revelado pelo tabuleiro.
  const known = (items) => Object.values(items).filter((item) => isDiscovered(p, item));
  const launchers = Object.fromEntries(known(LAUNCHERS).map((l) => [l.id, l]));
  const instruments = known(INSTRUMENTS);
  const parts = known(PARTS);
  const noBlueprints = !state.sandbox && !launchersCount(launchers) && !instruments.length && !parts.length;
  const moreToDiscover = !state.sandbox && undiscoveredItems(p).length > 0;
  const prevCounts = lastOwned.playerId === p.id ? lastOwned.counts : {};
  const counts = Object.fromEntries([...instruments, ...parts].map((item) => [item.id, ownedCount(p, item.id)]));
  const bought = new Set(Object.keys(counts).filter((id) => counts[id] > (prevCounts[id] ?? counts[id])));
  lastOwned = { playerId: p.id, counts };
  const card = (item) => itemCard(p, item, actions, bought.has(item.id), canAct);

  return el('section', { class: `screen workshop${readOnly ? ' read-only' : ''}` }, [
    hud(state, p, 'workshop', actions),
    readOnly ? el('p', { class: 'hint with-icon spectate-note' }, [icon('eye', { size: 16 }), t('ws.spectateNote')]) : null,
    // Modo planejamento entra no mesmo cartão da dica (um aviso só por tela).
    guideCard(state, 'workshop', p, readOnly || canAct ? null : { tag: t('ws.planningTitle'), text: t('ws.planningText') }),
    state.sandbox ? el('details', { class: 'swap' }, [el('summary', {}, t('ws.swapMission')), missionPicker(state, p, actions)]) : null,
    el('div', { class: 'workshop-grid' }, [
      el('div', {}, [
        assemblyBox(p, design, bought.size > 0, t('ws.caption', { mission: mission.name, orbit: ORBITS[mission.orbit].name, needs })),
        discount ? el('p', { class: 'hint with-icon' }, [icon('tag', { size: 16 }), t('ws.discount', { n: discount })]) : null,
        choice(t('ws.launcher'), launchers, p.spacecraft.launcherId, actions.chooseLauncher,
          (l) => t('ws.launcherDesc', { name: l.name, maxMass: l.maxMass, cost: l.cost, reach: l.reach.map((r) => ORBITS[r].name.split(' (')[0]).join(', ') }), p, hl(state, 'workshop', 'launcher', p), canAct),
        // No jogo normal a órbita é a da missão e já vem escolhida (ver setMission em sim/actions.js).
        state.sandbox
          ? choice(t('ws.orbit'), ORBITS, p.spacecraft.orbitId, actions.chooseOrbit,
            (o) => t('ws.orbitDesc', { name: o.name, life: o.baseLifetime, p: o.commsPenalty * 100, sci: o.scienceBonus ? t('ws.orbitSci', { n: o.scienceBonus }) : '', req: o.id === mission.orbit ? t('ws.orbitReq') : '' }), null, hl(state, 'workshop', 'orbit', p), canAct)
          : null,
        instruments.length ? el('h2', {}, t('ws.instruments')) : null,
        instruments.length ? el('div', { class: 'cards' }, instruments.map(card)) : null,
        parts.length ? el('h2', {}, t('ws.parts')) : null,
        parts.length ? el('div', { class: 'cards' }, parts.map(card)) : null,
        noBlueprints ? el('p', { class: 'hint with-icon' }, [icon('cart', { size: 16 }), t('ws.noBlueprints')]) : (moreToDiscover ? el('p', { class: 'hint with-icon' }, [icon('cart', { size: 16 }), t('ws.moreBlueprints')]) : null),
      ]),
      el('aside', { class: 'side' }, [
        el('div', { class: 'panel' }, [panelTitle('gauge', t('ws.resourcesPanel')), gauges(p)]),
        el('div', { class: `panel ${hl(state, 'workshop', 'checks', p)}` }, [panelTitle('clipboard', t('ws.checksPanel')), compactChecklist(p)]),
        // Só o resultado do que foi feito AQUI (ensaio em solo); o da casa do tabuleiro já apareceu lá.
        state.outcome?.where === 'workshop' ? outcomeCard(state, p) : null,
        design.ok ? riskPanel(p) : null,
        glossary(),
      ]),
    ]),
    launchDock(state, p, design, blocked, hidden, back, actions, readOnly, canAct),
  ]);
}

// Nave em montagem: o desenho ganha cada sistema comprado e os encaixes vazios ficam tracejados.
// Embaixo, uma trilha de sistemas (energia, comunicação, instrumento, cápsula, foguete). "Inteira" é
// o kit mínimo de cada sistema; quem decide se pode lançar continua sendo checkDesign.
function assemblyBox(p, design, pulse, caption) {
  const slots = assemblySlots(p);
  const done = slots.filter((sl) => sl.ok).length;
  const whole = done === slots.length;
  const status = !whole ? t('ws.assemblyProgress', { done, total: slots.length })
    : design.ok ? t('ws.assemblyReady') : t('ws.assemblyCheck');
  return el('div', { class: `spacecraft-box${pulse ? ' build-pulse' : ''}${whole ? ' whole' : ''}${whole && design.ok ? ' ready' : ''}` }, [
    el('div', { class: 'assembly-bar', role: 'group', 'aria-label': `${status}.` }, [
      el('strong', { class: 'assembly-status' }, [whole ? icon('check', { size: 14 }) : null, status]),
      el('ol', { class: 'assembly-steps' }, slots.map((sl) => el('li', { class: sl.ok ? 'ok' : '', title: sl.ok ? t('ws.slotInstalled', { label: sl.label }) : t('ws.slotMissing', { label: sl.label }) }, sl.label))),
    ]),
    spacecraftSvg(p, { assembly: true }),
    el('span', { class: 'caption' }, caption),
  ]);
}

// Barra fixa da oficina: o estado do projeto numa frase e o Lançar sempre à vista (antes ficava no fim
// de uma coluna longa, depois do painel, da checagem e do risco).
// `readOnly`: na oficina de espectador a barra mostra o estado do projeto, mas sem lançar nem
// ensaiar (não é a sua vez) — só o botão de voltar a assistir.
function launchDock(state, p, design, blocked, hidden, back, actions, readOnly = false, canAct = true) {
  const firstFail = checkDesign(p).checks.find((c) => !c.hidden && !c.ok && c.hard);
  const status = !design.ok
    ? [icon('x', { size: 16 }), firstFail ? t('ws.lackFirst', { text: firstFail.text }) : t('ws.notClosed')]
    : blocked || hidden ? [icon(blocked ? 'alert' : 'eye', { size: 16 }), [
      blocked || t('ws.ready'),
      hidden ? t('ws.unknownMins') : null,
    ].filter(Boolean).join(' ')]
      : [icon('check', { size: 16 }), t('ws.ready')];
  const ready = design.ok && !blocked;
  return el('div', { class: `launch-dock ${ready && !readOnly ? 'ready' : ''}`, role: 'region', 'aria-label': t('ws.launchAria') }, [
    el('p', { class: `dock-status ${design.ok ? (blocked ? 'warn' : 'ok') : 'bad'}` }, status),
    el('div', { class: 'row dock-buttons' }, [
      back,
      !readOnly && hidden && !p.flight ? button([icon('testTube', { size: 18 }), t('ws.rehearse', { cost: REHEARSAL_COST })], () => actions.rehearse(), {
        disabled: !canAct || p.rehearsedThisTurn || p.funds < REHEARSAL_COST,
        class: `ghost ${hl(state, 'workshop', 'rehearse')}`,
        title: p.rehearsedThisTurn ? t('ws.rehearseOnce') : t('ws.rehearseTitle', { cost: REHEARSAL_COST }),
      }) : null,
      readOnly ? null : button([icon('rocket', { size: 18 }), t('ws.launch')], () => actions.launch(), { disabled: !ready, class: `primary ${ready ? 'launch-ready' : ''} ${hl(state, 'workshop', 'launch')}`, title: blocked || (design.ok ? (hidden ? t('ws.launchHiddenTitle') : t('ws.launchReadyTitle')) : t('ws.launchFixTitle')) }),
    ]),
  ]);
}
