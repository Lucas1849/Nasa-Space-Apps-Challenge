// Tela de espectador do modo online (Fase 4 do PLANO-SALAS.md): fora da sua vez você
// acompanha o PALCO PÚBLICO do jogador da vez — dados, casas, peões e o que ele fez
// (a ação e a variação de recursos) — e vê os SEUS próprios painéis: recursos, objetivos,
// diário e um atalho para a sua oficina em modo leitura. O que é sigiloso do jogador da vez
// (a oficina dele, a escada, os rivais, as decisões pendentes) fica escondido.
// Não entra em SCREENS: é um override do render em main.js quando a partida online não está
// na sua vez. A trava de turno (net.dispatch) já barra qualquer ação; aqui nem renderizamos
// os botões de jogada.
import {
  el, button, hud, avatar, sideBadge, outcomeCard, logPanel, milestoneTrack, ladderPanel, sidePanel, MISSION_ICONS,
} from './components.js';
import { icon } from './icons.js';
import { boardTile, RING_STYLE } from './board.js';
import { ORBIT_ART, dieSvg } from './boardArt.js';
import { TILES } from '../board/board.js';
import { currentPlayer } from '../sim/state.js';
import { MISSIONS } from '../data/missions.js';

// Em que ponto do turno o jogador da vez está (público, sem revelar número nenhum).
function phaseText(state, current) {
  if (!current.rolled) return 'vai rolar os dados';
  if (state.dice) return 'escolhendo o dado';
  if (state.pendingDilemma) return 'resolvendo uma carta de dilema';
  if (state.pendingTile) return 'resolvendo a casa onde parou';
  if (current.flight && !current.flightAdvanced) return 'cuidando do voo da nave';
  return 'cuidando da nave';
}

// Faixa do topo: quem está jogando e em que fase do turno (nada sigiloso).
function banner(state, current) {
  return el('div', { class: 'panel spectate-banner' }, [
    avatar(current, 44),
    el('div', { class: 'spectate-who' }, [
      el('strong', {}, `Vez de ${current.name}`),
      el('span', { class: 'chip' }, sideBadge(current)),
      el('small', { class: 'hint' }, `${current.name} está ${phaseText(state, current)}.`),
    ]),
    el('span', { class: 'spacer' }),
    el('span', { class: 'chip spectating-chip' }, [icon('eye', { size: 15 }), 'Assistindo']),
  ]);
}

// Miolo do tabuleiro em modo leitura: só o resultado dos dados (sem botões) e o cartão de
// resultado do jogador da vez (a ação que ele tomou e a variação de recursos). Usa a mesma
// arte do tabuleiro de verdade (ui/boardArt.js) para o espectador ver a mesma coisa.
function spectateCenter(state, current) {
  let dice;
  if (state.dice) {
    dice = el('div', { class: 'gb-dice' }, [
      el('div', { class: 'gb-dice-row' }, state.dice.map((d) => el('span', { class: 'gb-die', html: dieSvg(d) }))),
      el('span', { class: 'gb-caption' }, `${current.name} rolou — escolhendo o dado`),
    ]);
  } else if (!current.rolled) {
    dice = el('div', { class: 'gb-dice' }, [
      el('span', { class: 'gb-die idle', html: dieSvg(0) }),
      el('span', { class: 'gb-caption' }, `Vez de ${current.name} — aguardando a rolagem`),
    ]);
  } else {
    dice = el('div', { class: 'gb-dice' }, [
      el('span', { class: 'gb-die', html: dieSvg(state.lastRoll) }),
      el('span', { class: 'gb-caption' }, `${current.name} andou ${state.lastRoll} casa${state.lastRoll > 1 ? 's' : ''}`),
    ]);
  }
  return el('div', { class: 'panel ring-center gb-center' }, [
    el('span', { class: 'center-orbits', 'aria-hidden': 'true', html: ORBIT_ART }),
    dice,
    outcomeCard(state, current),
  ]);
}

// Painel "Seus objetivos": a missão do degrau atual e os marcos, só leitura.
function myObjectives(state, me) {
  if (me.flight) {
    const f = me.flight;
    return sidePanel('mission', 'satellite', `Sua nave em voo: ${MISSIONS[f.missionId].name}`, [
      el('p', { class: 'hint' }, `Etapa ${f.stageIndex + 1} de ${f.plan.length}. Você avança o voo na sua vez.`),
    ], { hint: `Etapa ${f.stageIndex + 1} de ${f.plan.length}` });
  }
  if (!me.missionId) {
    return sidePanel('mission', 'flag', 'Sua escada está completa', [
      el('p', { class: 'hint' }, 'O vencedor é revelado no fim da rodada.'),
    ], { hint: 'Todos os degraus cumpridos' });
  }
  return sidePanel('mission', MISSION_ICONS[me.missionId] || 'rocket', MISSIONS[me.missionId].name, [
    el('p', { class: 'hint' }, MISSIONS[me.missionId].goal),
    milestoneTrack(me),
  ], { hint: 'Seu objetivo atual' });
}

// `actions` aqui é o conjunto de espectador (ver main.js): só navegação local e o botão de dicas.
export function spectateScreen(state, me, actions) {
  const current = currentPlayer(state);
  return el('section', { class: 'screen board-screen spectating' }, [
    hud(state, me, 'board', actions),
    banner(state, current),
    el('div', { class: 'board-layout' }, [
      el('div', {}, [
        // Mesmo console do tabuleiro (ui/board.js), só para leitura: casas e o miolo com o dado do jogador da vez.
        el('div', { class: 'board-gadget' }, [
          el('div', { class: 'gadget-screen gameboard' }, [
            el('div', { class: 'ring ring-16', style: RING_STYLE }, [...TILES.map((t, i) => boardTile(state, t, i, current, false)), spectateCenter(state, current)]),
          ]),
        ]),
        el('div', { class: 'row action-bar' }, [
          button([icon('wrench', { size: 18 }), 'Minha oficina'], () => actions.openWorkshop(), {}),
        ]),
        el('p', { class: 'hint action-hint' }, 'Você está assistindo: pode ver sua oficina e seus objetivos, mas só joga na sua vez.'),
      ]),
      el('div', { class: 'side-stack' }, [
        myObjectives(state, me),
        ladderPanel(state, me),
        logPanel(state, me),
      ]),
    ]),
  ]);
}
