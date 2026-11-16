// Relógio do turno em partidas com 2 ou mais agências humanas (Mesmo aparelho e Online). O tempo é escolhido
// antes da partida (60, 90, 120 ou 180 s, ou desligado) e fica em state.turnSeconds, igual para todos no online.
// Quando o tempo acaba, o turno termina sozinho, usando as mesmas ações dos botões e na ordem do turno:
//   1. dilema aberto → escolhe a 1ª opção; casa com decisão (terreno, fornecedor, espião) → segue sem escolher;
//   2. não rolou → rola e anda com o 1º dado (e resolve o que a casa pedir, pelo passo 1);
//   3. nave em voo → avança a etapa; imprevisto → 1ª opção;
//   4. passa a vez.
// O diário registra que o tempo esgotou e o que foi feito, para o jogador entender o que aconteceu.
// Funções puras, sem DOM e sem relógio de verdade: quem conta o tempo é a interface (ui/turnClock.js).
import { currentPlayer, humans, pushLog } from './state.js';
import { rollDice, moveBy, chooseDilemma, skipTile, advanceFlight, chooseStageOption, endTurn } from './actions.js';

export const TURN_SECONDS = 120;                 // padrão
export const TURN_SECONDS_OPTIONS = [0, 60, 90, 120, 180]; // 0 = sem relógio

// Segundos por turno desta partida (sem escolha gravada vale o padrão).
export const turnSecondsOf = (state) => (state.turnSeconds ?? TURN_SECONDS);

// O relógio vale nesta partida? Não no sandbox, não depois do fim e não no solo (contra o bot não há quem esperar).
export const timerApplies = (state) => !state.sandbox && !state.gameOver && humans(state).length >= 2 && turnSecondsOf(state) > 0;

export function timeoutTurn(state, rng = Math.random) {
  if (!timerApplies(state)) return 'Esta partida não tem relógio de turno.';
  const p = currentPlayer(state);
  const done = [];
  for (let guard = 0; guard < 10; guard += 1) {
    if (state.pendingDilemma) { chooseDilemma(state, 0, rng); done.push('dilema: 1ª opção'); continue; }
    if (state.pendingTile) { skipTile(state); done.push('casa sem escolha'); continue; }
    if (!p.rolled) {
      if (!state.dice) rollDice(state, rng);
      moveBy(state, 0, rng);
      done.push(`andou ${state.lastRoll}`);
      continue;
    }
    if (p.flight?.pending) { chooseStageOption(state, 0, rng); done.push('imprevisto do voo: 1ª opção'); continue; }
    if (p.flight && !p.flightAdvanced) { advanceFlight(state, rng); done.push('voo avançou uma etapa'); continue; }
    break;
  }
  pushLog(state, `${p.name}: tempo esgotado (${turnSecondsOf(state)} s). O turno terminou sozinho${done.length ? ` (${done.join(', ')})` : ''}.`);
  return endTurn(state);
}
