// Requisitos escondidos da missão (IDEIA.md seção 20). No jogo normal o jogador NÃO vê o mínimo de ciência e
// de comunicação da missão: vê só o objetivo e uma pista ("ciência moderada"). Ele descobre de dois jeitos:
//   - Ensaio em solo (barato): diz em palavras se cada requisito atende, está um pouco ou bem abaixo.
//   - Lançar e errar: o relatório mostra os números e eles passam a aparecer e a travar o lançamento.
// Vida útil e suporte de vida ficam visíveis (estão no texto do objetivo). O sandbox mostra tudo.
// Funções puras, sem DOM.
import { MISSIONS } from '../data/missions.js';
import { effectiveTotals } from './resources.js';

export const HIDDEN_KINDS = ['science', 'comms'];
export const NEED_LABELS = { science: 'ciência', comms: 'comunicação' };
// Ids dos checks de checkDesign (sim/simulate.js) que dependem de um mínimo escondido.
export const HIDDEN_CHECK_IDS = ['science', 'mission_comms'];

// Os mínimos desta missão ainda estão escondidos para o jogador? (`hideNeeds` só liga no jogo normal.)
export const isHidden = (player, missionId = player.missionId) =>
  Boolean(player.hideNeeds && missionId && !(player.knownNeeds || {})[missionId]);

// Pista qualitativa do mínimo, para o jogador ter noção sem o número.
const LEVELS = { science: [2, 5], comms: [3, 6] }; // até o 1º valor = baixa; até o 2º = moderada; acima = alta
export function needLevel(kind, value) {
  const [low, mid] = LEVELS[kind];
  return value <= low ? 'baixa' : value <= mid ? 'moderada' : 'alta';
}

// Marca os mínimos da missão como conhecidos. Devolve true se era a primeira vez.
export function learnNeeds(player, missionId) {
  player.knownNeeds = player.knownNeeds || {};
  if (player.knownNeeds[missionId]) return false;
  player.knownNeeds[missionId] = true;
  return true;
}

// Ensaio em solo: compara a nave atual com os mínimos escondidos e responde só em palavras.
export function assessNeeds(player) {
  const mission = MISSIONS[player.missionId];
  const t = effectiveTotals(player);
  const values = { science: t.scienceEffective, comms: t.commsEffective };
  return HIDDEN_KINDS.map((kind) => {
    const need = mission.needs[kind];
    const ratio = need > 0 ? values[kind] / need : 1;
    return {
      kind,
      label: NEED_LABELS[kind],
      ok: ratio >= 1,
      status: ratio >= 1 ? 'atende' : ratio >= 0.75 ? 'está um pouco abaixo' : 'está bem abaixo',
    };
  });
}
