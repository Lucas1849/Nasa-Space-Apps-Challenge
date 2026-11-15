// Risco de cada etapa do voo, calculado pelos atributos da nave e explicado parcela por parcela.
// É aqui que o jogador vê que o trade-off feito na oficina mudou o resultado (IDEIA.md seção 7):
//   "18%: risco base 8% · carga perto do limite +10%"
// Funções puras, sem DOM. ATENÇÃO: números FICTÍCIOS para balanceamento.
import { effectiveTotals } from './resources.js';
import { MISSIONS } from '../data/missions.js';
import { FLIGHT_EVENTS, resolveOption } from '../data/events.js';
import {
  STAGES, FLIGHT_PLANS, SYSTEM_NAMES, FAILURE_DATA_BONUS, MAX_FAILURE_DATA, MIN_RISK, MAX_RISK,
  REVIEW_COST, REVIEW_RISK_CUT,
} from '../data/stages.js';

export const CONTROL_RISK_CUT = 0.03; // por nível do Controle de missão

// Sequência de etapas da missão (ex.: ['ascent', 'transfer', 'lunar_arrival', 'crew_return']).
export function flightPlan(missionId) {
  const mission = MISSIONS[missionId];
  if (!mission) return [];
  return [...FLIGHT_PLANS[mission.orbit], ...(mission.extraStages || [])];
}

const count = (player, ids) => [...player.spacecraft.parts, ...player.spacecraft.instruments]
  .filter((id) => ids.includes(id)).length;

// Risco de uma etapa. `extra` = { failChance, label } (decisão do evento) e { riskCut, cutLabel } (revisão paga).
// Devolve { total, parts: [{ text, value }] }. value positivo aumenta o risco, negativo reduz.
export function stageRisk(player, stageId, extra = {}) {
  const stage = STAGES[stageId];
  const t = effectiveTotals(player);
  const parts = [{ text: `risco base da etapa "${stage.name}"`, value: stage.baseRisk }];
  const add = (text, value) => parts.push({ text, value });

  switch (stage.system) {
    case 'launch':
      if (t.maxMass && t.mass > 0.85 * t.maxMass) add(`carga perto do limite do foguete (${t.mass}/${t.maxMass})`, 0.10);
      if (player.launchRisk) add('defeito conhecido que não foi corrigido', player.launchRisk);
      break;
    case 'power':
      if (t.powerBalance < 5) add(`energia sem margem (sobra ${t.powerBalance})`, 0.10);
      if (count(player, ['battery'])) add('bateria de reserva', -0.05);
      break;
    case 'comms':
      if (t.commsEffective < t.data) add(`antena sobrecarregada (${t.data} de dados para ${t.commsEffective} de comunicação)`, 0.10);
      if (count(player, ['antenna_basic', 'antenna_dish']) >= 2) add('antena reserva (redundância)', -0.05);
      break;
    case 'life':
      if (t.powerBalance < 10) add(`suporte de vida com pouca energia sobrando (${t.powerBalance})`, 0.10);
      break;
    default:
      break;
  }

  const fd = Math.min(player.failureData?.[stage.system] || 0, MAX_FAILURE_DATA);
  if (fd) add(`dados de falha anteriores em ${SYSTEM_NAMES[stage.system]} (${fd})`, -FAILURE_DATA_BONUS * fd);
  const control = player.buildings?.control || 0;
  if (control) add(`Controle de missão nível ${control}`, -CONTROL_RISK_CUT * control);
  if (extra.failChance) add(extra.label || 'decisão arriscada', extra.failChance);
  if (extra.riskCut) add(extra.cutLabel || 'revisão extra', -extra.riskCut);

  const sum = parts.reduce((s, p) => s + p.value, 0);
  const total = Math.round(Math.min(MAX_RISK, Math.max(MIN_RISK, sum)) * 100) / 100;
  return { total, parts };
}

export const pct = (x) => `${Math.round(x * 100)}%`;

// "18%: risco base 8% · carga perto do limite +10%"
export function describeRisk(risk) {
  const items = risk.parts.map((p, i) => (i === 0 ? `${p.text} ${pct(p.value)}` : `${p.text} ${p.value > 0 ? '+' : '−'}${pct(Math.abs(p.value))}`));
  return `${pct(risk.total)}: ${items.join(' · ')}`;
}

// A nave que está voando. Ao lançar, a nave sai da oficina (p.spacecraft fica livre para montar
// a próxima) e vai para p.flight.craft. Risco e avaliação final usam esta "visão" do jogador.
export function flyer(player) {
  if (!player.flight) return player;
  return { ...player, missionId: player.flight.missionId, spacecraft: player.flight.craft };
}

// Opções do jogador numa etapa do voo. Não existe "abortar" (IDEIA.md v3 seção 7): se a etapa falhar,
// a nave tenta uma missão de consolação. Com imprevisto: as 2 opções do evento.
// Sem imprevisto: seguir ou gastar a reserva de verba para reduzir o risco.
// Cada opção já traz o risco calculado e explicado, para o jogador decidir vendo o porquê.
export function stageOptions(player, pending) {
  const ship = flyer(player);
  const { stageId, eventId } = pending;
  if (eventId) {
    const event = FLIGHT_EVENTS[eventId];
    return event.options.map((opt) => {
      const effect = resolveOption(opt, ship) || {};
      return {
        kind: 'event',
        label: opt.label,
        effect,
        risk: stageRisk(ship, stageId, { failChance: effect.failChance, label: 'decisão arriscada no imprevisto' }),
        lesson: opt.lesson,
        disabled: effect.funds < 0 && player.funds < -effect.funds, // não dá para pagar a opção
      };
    });
  }
  return [
    { kind: 'go', label: 'Seguir com a etapa', effect: {}, risk: stageRisk(ship, stageId), lesson: null },
    {
      kind: 'review',
      label: `Gastar a reserva: revisão extra (${REVIEW_COST} de verba)`,
      effect: { funds: -REVIEW_COST },
      risk: stageRisk(ship, stageId, { riskCut: REVIEW_RISK_CUT, cutLabel: 'revisão extra paga' }),
      disabled: player.funds < REVIEW_COST,
      lesson: 'Revisões e testes extras custam dinheiro, mas pegam defeitos antes que virem falhas.',
    },
  ];
}

// Chance de concluir o voo inteiro sem decisões arriscadas (produto das etapas). Usada na oficina
// para mostrar o risco ANTES de lançar: é a decisão "lanço agora ou espero melhorar".
export function missionRisk(player) {
  const plan = flightPlan(player.missionId);
  const stages = plan.map((id) => ({ id, name: STAGES[id].name, risk: stageRisk(player, id) }));
  const success = stages.reduce((s, st) => s * (1 - st.risk.total), 1);
  return { stages, total: Math.round((1 - success) * 100) / 100 };
}
