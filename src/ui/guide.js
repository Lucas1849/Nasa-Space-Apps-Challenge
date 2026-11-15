// Orientações para o jogador: "o que fazer agora" em cada tela, com o botão recomendado destacado.
// O jogador liga e desliga as dicas (no HUD ou na tela inicial). A preferência fica no navegador
// (localStorage) e o jogo funciona normalmente se o navegador bloquear o armazenamento.
// Só lê o estado; nenhuma regra de jogo mora aqui.
import { el } from './components.js';
import { icon } from './icons.js';
import { guideOn } from './prefs.js';
import { currentPlayer, SPY_COST } from '../sim/state.js';
import { checkDesign } from '../sim/simulate.js';
import { isHidden } from '../sim/needs.js';
import { REHEARSAL_COST } from '../sim/state.js';
import { isLocked, requiredTech, isDiscovered } from '../sim/resources.js';
import { LAUNCHERS } from '../data/launchers.js';
import { MISSIONS } from '../data/missions.js';
import { ORBITS } from '../data/orbits.js';
import { STAGES } from '../data/stages.js';


// Mesmo que o motor de jogo exige para passar a vez (ver endTurn em sim/actions.js).
export function endTurnBlocker(state) {
  const p = currentPlayer(state);
  if (!p.rolled) return 'Role os dados e ande antes de passar a vez.';
  if (state.pendingDilemma) return 'Resolva a carta de dilema antes de passar a vez.';
  if (p.flight?.pending) return 'Decida o imprevisto do voo antes de passar a vez.';
  if (p.flight && !p.flightAdvanced) return 'Sua nave está em voo: avance uma etapa antes de passar a vez.';
  return null;
}

// Sem lançador escolhido e nenhum liberado: explica que falta tecnologia e como ganhar.
function noLauncherYet(player) {
  if (player.spacecraft.launcherId) return null;
  const all = Object.values(LAUNCHERS).filter((l) => isDiscovered(player, l));
  if (!all.length || !all.every((l) => isLocked(player, l))) return null;
  const need = Math.min(...all.map((l) => requiredTech(player, l)));
  return {
    title: 'Nenhum foguete liberado ainda',
    text: `O foguete mais simples exige tecnologia ${need} e você tem ${player.tech}. Ganhe tecnologia a cada Ano novo, na casa Ano Geofísico Internacional ou construindo um Laboratório. Enquanto isso, compre as peças da nave.`,
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
      return { title: 'Resolva a carta de dilema', text: 'No centro do tabuleiro, escolha uma das opções. Não existe resposta certa: cada uma ganha algo e perde outra coisa.', target: 'dilemma' };
    }
    if (state.dice) {
      return { title: 'Escolha um dos dados', text: 'Olhe as casas à frente do seu peão e escolha o dado que para na melhor casa para você agora.', target: 'die' };
    }
    if (!p.rolled) {
      return { title: 'Comece rolando os dados', text: 'Você rola 2 dados e escolhe qual usar. Cada casa dá algo: verba, tecnologia, peças novas, desconto, uma carta de dilema ou um prédio.', target: 'roll' };
    }
    const pending = state.pendingTile;
    if (pending?.kind === 'build') {
      return { title: 'Terreno livre: construir?', text: 'Um prédio dá vantagem até o fim da partida. Laboratório acelera a tecnologia, Fábrica dá desconto, Controle de missão reduz o risco do voo e Patrocinador rende um pouco de verba. Ou clique em Seguir.', target: 'tile' };
    }
    if (pending?.kind === 'spy') {
      return { title: 'Espionagem', text: `Por ${SPY_COST} de verba você vê em que degrau um rival está e quão pronta está a nave dele. Útil para decidir se lança agora ou se pode esperar.`, target: 'tile' };
    }
    if (pending) {
      return { title: 'Prédio de um rival', text: 'Você pode pagar para usar o prédio. Você ganha o benefício, mas o dono recebe a taxa.', target: 'tile' };
    }
    if (p.flight && !p.flightAdvanced) {
      return { title: 'Sua nave está em voo', text: `Avance o voo para resolver a próxima etapa: ${STAGES[p.flight.plan[p.flight.stageIndex]].name}. Uma etapa por turno.`, target: 'advance' };
    }
    if (!mission) {
      return { title: 'Escada completa', text: 'Você cumpriu todos os degraus. Passe a vez: o vencedor é revelado no fim da rodada.', target: 'end' };
    }
    const design = checkDesign(p);
    if (design.ok && !p.flight && !p.launchedThisTurn) {
      return { title: 'Nave pronta para lançar', text: 'Lance agora ou espere melhorar. Esperar rende tecnologia e peças melhores, mas um rival pode cumprir o degrau antes.', target: 'launch' };
    }
    if (!p.flight && !p.launchedThisTurn) {
      const locked = noLauncherYet(p);
      if (locked) return { ...locked, target: 'workshop' };
      const fail = firstHardFailure(p);
      return {
        title: `Monte a nave: ${mission.name}`,
        text: `${fail ? `Vá à oficina. Falta resolver: ${fail.text}` : 'Vá à oficina e monte a nave do degrau atual.'} Não precisa montar tudo agora: andar pelo tabuleiro rende verba e peças novas.`,
        target: 'workshop',
      };
    }
    return { title: 'Turno concluído', text: 'Você já fez o principal. Passe a vez para ver o resumo do turno.', target: 'end' };
  }

  if (screen === 'workshop') {
    if (!mission) return null;
    const tips = [
      'Etiquetas verdes mostram o que a peça dá. As amarelas, o que ela custa.',
      'Barra vermelha no painel de recursos impede o lançamento. Amarela só reduz a ciência.',
      'Passe o mouse sobre um medidor para ver o que ele significa.',
    ];
    const locked = noLauncherYet(p);
    if (locked) return { ...locked, target: 'launcher', tips };
    if (!p.spacecraft.launcherId) {
      return { title: 'Escolha o foguete', text: 'Comece pelo veículo de lançamento: ele define quanta massa cabe na nave e até que órbita ela chega.', target: 'launcher', tips };
    }
    if (!p.spacecraft.orbitId) {
      return { title: 'Escolha a órbita', text: `A missão "${mission.name}" exige a ${ORBITS[mission.orbit].name}.`, target: 'orbit', tips };
    }
    const fail = firstHardFailure(p);
    if (fail) return { title: 'Resolva os itens em vermelho', text: fail.text, target: 'checks', tips };
    // Projeto fecha nas contas físicas, mas os mínimos de ciência e comunicação ainda são desconhecidos.
    if (isHidden(p) && !p.flight && !p.launchedThisTurn && !p.rehearsedThisTurn) {
      return { title: 'Nave montada, requisitos desconhecidos', text: `A missão pede ciência e comunicação que você ainda não conhece. Faça um ensaio em solo (${REHEARSAL_COST}) para ter uma pista, ou lance e descubra no relatório. Errar ensina: os números aparecem depois.`, target: 'rehearse', tips };
    }
    if (p.flight || p.launchedThisTurn) {
      return { title: 'Nave montada', text: 'O projeto fecha. Você poderá lançar quando a nave atual terminar o voo, ou no próximo turno.', target: 'back', tips };
    }
    if (!state.sandbox && !p.rolled) {
      return { title: 'Projeto pronto', text: 'Ande no tabuleiro antes de lançar: volte e role os dados.', target: 'back', tips };
    }
    return { title: 'Projeto pronto', text: 'Veja o risco de cada etapa ao lado. Lançar agora é mais rápido. Peças reservas e margem de energia deixam o voo mais seguro.', target: 'launch', tips };
  }

  if (screen === 'flight') {
    if (p.flight?.pending) {
      return { title: 'Escolha como reagir', text: 'Compare o risco de cada opção. O número vem da sua nave: margem de massa e energia, peças reservas, dados de falha e o Controle de missão.', target: 'option' };
    }
    return { title: 'Etapa superada', text: state.sandbox ? 'Siga para a próxima etapa.' : 'A próxima etapa acontece no seu próximo turno. A próxima nave só pode ser montada quando esta cumprir a missão.', target: state.sandbox ? 'next' : 'end' };
  }

  if (screen === 'report') {
    const r = p.lastResult;
    if (!r) return null;
    return r.success
      ? { title: 'Degrau cumprido', text: 'Leia o "Por quê" para entender o que funcionou. A próxima missão da escada já está esperando na oficina.', target: 'end' }
      : { title: 'Toda falha ensina', text: 'Leia o "Por quê" e os dados de falha. O sistema que falhou fica mais seguro na próxima tentativa.', target: 'end' };
  }
  return null;
}

// Cartão "Próximo passo" exibido sob o HUD quando as dicas estão ligadas.
export function guideCard(state, screen, player = null) {
  if (!guideOn()) return null;
  const step = nextStep(state, screen, player);
  if (!step) return null;
  return el('div', { class: 'guide-card', role: 'status' }, [
    icon('compass', { size: 22, className: 'guide-icon' }),
    el('div', {}, [
      el('strong', {}, step.title),
      el('p', {}, step.text),
      step.tips?.length ? el('details', { class: 'guide-tips' }, [
        el('summary', {}, 'Mais dicas desta tela'),
        el('ul', {}, step.tips.map((t) => el('li', {}, t))),
      ]) : null,
    ]),
  ]);
}

// Classe que destaca o botão recomendado (só com as dicas ligadas).
export function hl(state, screen, key, player = null) {
  if (!guideOn()) return '';
  return nextStep(state, screen, player)?.target === key ? 'guide-target' : '';
}
