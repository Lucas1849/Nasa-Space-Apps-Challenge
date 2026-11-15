// Orientações para o jogador: "o que fazer agora" em cada tela, com o botão recomendado destacado.
// O jogador liga e desliga as dicas (no HUD ou na tela inicial). A preferência fica no navegador
// (localStorage) e o jogo funciona normalmente se o navegador bloquear o armazenamento.
// Só lê o estado; nenhuma regra de jogo mora aqui.
import { el } from './components.js';
import { icon } from './icons.js';
import { guideOn } from './prefs.js';
import { currentPlayer, SPY_COST, SABOTAGE_COST } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';
import { isHidden } from '../sim/needs.js';
import { REHEARSAL_COST } from '../sim/state.js';
import { isLocked, requiredTech, isDiscovered } from '../sim/resources.js';
import { LAUNCHERS } from '../data/launchers.js';
import { nameOf } from '../sim/resources.js';
import { MISSIONS } from '../data/missions.js';
import { ORBITS } from '../data/orbits.js';
import { STAGES } from '../data/stages.js';
import { t } from '../i18n/index.js';


// Mesmo que o motor de jogo exige para passar a vez (ver endTurn em sim/actions.js).
export function endTurnBlocker(state) {
  const p = currentPlayer(state);
  if (!p.rolled) return t('gd.block.roll');
  if (state.pendingDilemma) return t('gd.block.dilemma');
  if (p.flight?.pending) return t('gd.block.flightPending');
  if (p.flight && !p.flightAdvanced) return t('gd.block.advance');
  return null;
}

// Sem lançador escolhido e nenhum liberado: explica que falta tecnologia e como ganhar.
function noLauncherYet(player) {
  if (player.spacecraft.launcherId) return null;
  const all = Object.values(LAUNCHERS).filter((l) => isDiscovered(player, l));
  if (!all.length) {
    return { title: t('gd.noLauncher.noBpTitle'), text: t('gd.noLauncher.noBpText') };
  }
  if (!all.every((l) => isLocked(player, l))) return null;
  const need = Math.min(...all.map((l) => requiredTech(player, l)));
  return {
    title: t('gd.noLauncher.lockedTitle'),
    text: t('gd.noLauncher.lockedText', { need, tech: player.tech }),
  };
}

// Primeiro item vermelho da checagem do projeto (o que impede o lançamento).
function firstHardFailure(player) {
  return checkDesign(player).checks.find((c) => !c.ok && c.hard);
}

// Próximo passo recomendado: { title, text, target, tips[] }.
// `target` é a chave do botão que a tela destaca (ver hl() abaixo).
// `player` opcional: por padrão é o jogador da vez, mas a oficina de espectador
// (ui/spectate.js) passa a SUA própria agência para ver as dicas dela, não as do rival.
export function nextStep(state, screen, player = null) {
  const p = player ?? currentPlayer(state);
  if (!p) return null;
  const mission = MISSIONS[p.missionId];

  if (screen === 'board') {
    if (state.pendingDilemma) {
      return { title: t('gd.board.dilemma.t'), text: t('gd.board.dilemma.x'), target: 'dilemma' };
    }
    if (state.dice) {
      return { title: t('gd.board.die.t'), text: t('gd.board.die.x'), target: 'die' };
    }
    if (!p.rolled) {
      return { title: t('gd.board.roll.t'), text: t('gd.board.roll.x'), target: 'roll' };
    }
    const pending = state.pendingTile;
    if (pending?.kind === 'build') {
      return { title: t('gd.board.build.t'), text: t('gd.board.build.x'), target: 'tile' };
    }
    if (pending?.kind === 'spy') {
      return { title: t('gd.board.spy.t'), text: t('gd.board.spy.x', { spy: SPY_COST, sabotage: SABOTAGE_COST }), target: 'tile' };
    }
    if (pending?.kind === 'supplier') {
      return { title: t('gd.board.supplier.t'), text: t('gd.board.supplier.x'), target: 'tile' };
    }
    if (pending) {
      return { title: t('gd.board.rival.t'), text: t('gd.board.rival.x'), target: 'tile' };
    }
    if (p.flight && !p.flightAdvanced) {
      return { title: t('gd.board.flight.t'), text: t('gd.board.flight.x', { stage: STAGES[p.flight.plan[p.flight.stageIndex]].name }), target: 'advance' };
    }
    if (!mission) {
      return { title: t('gd.board.ladderDone.t'), text: t('gd.board.ladderDone.x'), target: 'end' };
    }
    const design = checkDesign(p);
    if (design.ok && !p.flight && !p.launchedThisTurn) {
      return { title: t('gd.board.launchReady.t'), text: t('gd.board.launchReady.x'), target: 'launch' };
    }
    if (!p.flight && !p.launchedThisTurn) {
      const locked = noLauncherYet(p);
      if (locked) return { ...locked, target: 'workshop' };
      const fail = firstHardFailure(p);
      return {
        title: t('gd.board.buildShip.t', { mission: mission.name }),
        text: t('gd.board.buildShip.x', { lead: fail ? t('gd.board.buildShip.fail', { text: fail.text }) : t('gd.board.buildShip.ok') }),
        target: 'workshop',
      };
    }
    return { title: t('gd.board.done.t'), text: t('gd.board.done.x'), target: 'end' };
  }

  if (screen === 'workshop') {
    if (!mission) return null;
    const tips = [t('gd.ws.tip1'), t('gd.ws.tip2'), t('gd.ws.tip3')];
    const locked = noLauncherYet(p);
    if (locked) return { ...locked, target: 'launcher', tips };
    if (!p.spacecraft.launcherId) {
      return { title: t('gd.ws.launcher.t'), text: t('gd.ws.launcher.x'), target: 'launcher', tips };
    }
    if (!p.spacecraft.orbitId) {
      return { title: t('gd.ws.orbit.t'), text: t('gd.ws.orbit.x', { mission: mission.name, orbit: ORBITS[mission.orbit].name }), target: 'orbit', tips };
    }
    const fail = firstHardFailure(p);
    if (fail) return { title: t('gd.ws.fail.t'), text: fail.text, target: 'checks', tips };
    // Projeto fecha nas contas físicas, mas os mínimos de ciência e comunicação ainda são desconhecidos.
    if (isHidden(p) && !p.flight && !p.launchedThisTurn && !p.rehearsedThisTurn) {
      return { title: t('gd.ws.hidden.t'), text: t('gd.ws.hidden.x', { cost: REHEARSAL_COST }), target: 'rehearse', tips };
    }
    if (p.flight || p.launchedThisTurn) {
      return { title: t('gd.ws.built.t'), text: t('gd.ws.built.x'), target: 'back', tips };
    }
    if (!state.sandbox && !p.rolled) {
      return { title: t('gd.ws.ready.t'), text: t('gd.ws.ready.moveX'), target: 'back', tips };
    }
    return { title: t('gd.ws.ready.t'), text: t('gd.ws.ready.x'), target: 'launch', tips };
  }

  if (screen === 'flight') {
    if (p.flight?.pending) {
      return { title: t('gd.fl.react.t'), text: t('gd.fl.react.x'), target: 'option' };
    }
    return { title: t('gd.fl.passed.t'), text: state.sandbox ? t('gd.fl.passed.sandbox') : t('gd.fl.passed.turn'), target: state.sandbox ? 'next' : 'end' };
  }

  if (screen === 'report') {
    const r = p.lastResult;
    if (!r) return null;
    return r.success
      ? { title: t('gd.rep.success.t'), text: t('gd.rep.success.x'), target: 'end' }
      : { title: t('gd.rep.fail.t'), text: t('gd.rep.fail.x'), target: 'end' };
  }
  return null;
}

// Dicas contextuais (Etapa 5): cada uma aparece uma única vez, no momento em que o jogador chega nela
// (sim/actions.js, raiseTip). Explicam só aquilo, sem despejar o resto das regras.
const TIPS = {
  blueprint: (item) => ({ title: t('gd.tip.blueprint.t', { of: item ? t('gd.tip.blueprint.of', { name: nameOf(item) }) : '' }), text: t('gd.tip.blueprint.x') }),
  workshop: () => ({ title: t('gd.tip.workshop.t'), text: t('gd.tip.workshop.x') }),
  part: () => ({ title: t('gd.tip.part.t'), text: t('gd.tip.part.x') }),
  launch: () => ({ title: t('gd.tip.launch.t'), text: t('gd.tip.launch.x') }),
};

function tipCard(state) {
  const tip = state.tip;
  if (!tip || !TIPS[tip.id] || tip.playerId !== currentPlayer(state)?.id) return null;
  const card = TIPS[tip.id](tip.item);
  return el('div', { class: 'guide-card guide-tip', role: 'status' }, [
    icon('compass', { size: 22, className: 'guide-icon' }),
    el('div', {}, [el('span', { class: 'tip-tag' }, t('gd.tip.firstTime')), el('strong', {}, card.title), el('p', {}, card.text)]),
  ]);
}

// Cartão "Próximo passo" exibido sob o HUD quando as dicas estão ligadas.
export function guideCard(state, screen, player = null) {
  if (!guideOn()) return null;
  const tip = tipCard(state);
  const step = nextStep(state, screen, player);
  if (tip) return el('div', { class: 'guide-stack' }, [tip, step ? stepCard(step) : null]);
  return step ? stepCard(step) : null;
}

function stepCard(step) {
  return el('div', { class: 'guide-card', role: 'status' }, [
    icon('compass', { size: 22, className: 'guide-icon' }),
    el('div', {}, [
      el('strong', {}, step.title),
      el('p', {}, step.text),
      step.tips?.length ? el('details', { class: 'guide-tips' }, [
        el('summary', {}, t('gd.moreTips')),
        el('ul', {}, step.tips.map((tip) => el('li', {}, tip))),
      ]) : null,
    ]),
  ]);
}

// Classe que destaca o botão recomendado (só com as dicas ligadas).
export function hl(state, screen, key, player = null) {
  if (!guideOn()) return '';
  return nextStep(state, screen, player)?.target === key ? 'guide-target' : '';
}
