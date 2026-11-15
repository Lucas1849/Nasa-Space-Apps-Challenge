// Requisitos escondidos da missão (IDEIA.md seção 20). No jogo normal o jogador NÃO vê o mínimo de ciência e
// de comunicação da missão: vê só o objetivo e uma pista ("ciência moderada"). Ele descobre de dois jeitos:
//   - Ensaio em solo (barato): diz em palavras se cada requisito atende, está um pouco ou bem abaixo.
//   - Lançar e errar: o relatório mostra os números e eles passam a aparecer e a travar o lançamento.
// Vida útil e suporte de vida ficam visíveis (estão no texto do objetivo). O sandbox mostra tudo.
// Funções puras, sem DOM.
import { MISSIONS } from '../data/missions.js';
import { effectiveTotals } from './resources.js';
import { t as tr } from '../i18n/index.js'; // `tr`: `t` é usado como variável local (totais da nave)

export const HIDDEN_KINDS = ['science', 'comms'];
// Rótulos em i18n (needs.label.<kind>); getters para trocar com o idioma.
export const NEED_LABELS = {
  get science() { return tr('needs.label.science'); },
  get comms() { return tr('needs.label.comms'); },
};
// Ids dos checks de checkDesign (sim/simulate.js) que dependem de um mínimo escondido.
export const HIDDEN_CHECK_IDS = ['science', 'mission_comms'];

// Os mínimos desta missão ainda estão escondidos para o jogador? (`hideNeeds` só liga no jogo normal.)
export const isHidden = (player, missionId = player.missionId) =>
  Boolean(player.hideNeeds && missionId && !(player.knownNeeds || {})[missionId]);

// Pista qualitativa do mínimo, para o jogador ter noção sem o número.
const LEVELS = { science: [2, 5], comms: [3, 6] }; // até o 1º valor = baixa; até o 2º = moderada; acima = alta
export function needLevel(kind, value) {
  const [low, mid] = LEVELS[kind];
  return value <= low ? tr('needs.level.low') : value <= mid ? tr('needs.level.mid') : tr('needs.level.high');
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
      status: ratio >= 1 ? tr('needs.status.ok') : ratio >= 0.75 ? tr('needs.status.slightly') : tr('needs.status.far'),
    };
  });
}
