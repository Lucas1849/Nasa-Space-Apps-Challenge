// Simulação da missão: recebe o jogador e devolve resultado + lista de motivos.
// O relatório precisa EXPLICAR por que deu certo ou errado (é o que a banca avalia).
// Função pura. `rng` injetável para testes.
// ATENÇÃO: regras e números FICTÍCIOS para balanceamento, não modelam física real.
import { effectiveTotals } from './resources.js';
import { isHidden, needLevel } from './needs.js';
import { MISSIONS } from '../data/missions.js';
import { ORBITS } from '../data/orbits.js';
import { LAUNCHERS } from '../data/launchers.js';

export const FAILURE_CHANCE = 0.15; // chance base de falha aleatória de componente (sem escudo)

// Checagens de projeto, sem aleatoriedade. Usadas na oficina (preview) e na simulação.
// `modifiers` vem das decisões em voo (ex.: lifetimeDelta) e só é usado pela simulação.
// Devolve { ok, designOk, checks: [{ id, ok, hard, hidden, text }], totals }.
//   hard = true: impede o sucesso. hard = false ("leve"): só reduz a ciência entregue.
//   hidden = true: o mínimo da missão (ciência e comunicação) ainda é desconhecido para o jogador. O check
//   não trava o lançamento nem mostra o número (sim/needs.js). Com `modifiers.evaluate` (avaliação final
//   da missão, espião) todos os checks valem de verdade, e a falha pós-voo continua igual.
export function checkDesign(player, modifiers = {}) {
  const mission = MISSIONS[player.missionId];
  const t = effectiveTotals(player);
  const orbit = ORBITS[player.spacecraft.orbitId];
  const launcher = LAUNCHERS[player.spacecraft.launcherId];
  const checks = [];
  const add = (id, ok, okText, failText, hard = true) => checks.push({ id, ok, hard, text: ok ? okText : failText });

  add('launcher', Boolean(launcher), `Lançador: ${launcher?.name}.`, 'Nenhum lançador escolhido.');
  add('orbit', Boolean(orbit), `Órbita: ${orbit?.name}.`, 'Nenhuma órbita escolhida.');

  if (launcher && orbit) {
    add('reach', launcher.reach.includes(orbit.id),
      `O ${launcher.name} alcança a ${orbit.name}.`,
      `O ${launcher.name} não alcança a ${orbit.name}. Escolha um lançador maior ou uma órbita mais baixa.`);
    add('mass', t.mass <= launcher.maxMass,
      `Massa ${t.mass}/${launcher.maxMass}: cabe no lançador.`,
      `Massa ${t.mass} excede a capacidade ${launcher.maxMass} do lançador. Tire peças ou use um lançador maior.`);
  }

  if (orbit && mission) {
    add('mission_orbit', orbit.id === mission.orbit,
      `A órbita é a exigida pela missão.`,
      `A missão "${mission.name}" exige a ${ORBITS[mission.orbit].name}, não a ${orbit.name}.`);
  }

  add('power', t.powerBalance >= 0,
    `Energia: gera ${t.powerGen}, consome ${t.powerUse}. Sobra ${t.powerBalance}.`,
    `Energia insuficiente: gera ${t.powerGen}, consome ${t.powerUse}. Adicione geração de energia (painel solar) ou remova instrumentos.`);

  add('comms', t.commsEffective >= t.data,
    `Comunicação ${t.commsEffective} dá conta dos ${t.data} de dados gerados.`,
    `Os instrumentos geram ${t.data} de dados, mas a comunicação efetiva é ${t.commsEffective}${orbit?.commsPenalty ? ` (a ${orbit.name} reduz o sinal em ${orbit.commsPenalty * 100}%)` : ''}. Metade da ciência se perde: melhore a antena.`,
    false);

  if (mission) {
    if (isHidden(player, player.missionId) && !modifiers.evaluate) {
      // Mínimo desconhecido: mostra só o que a nave entrega e a pista, sem o número, e não trava.
      const unknown = (id, label, value, kind) => checks.push({
        id, ok: true, hard: false, hidden: true,
        text: `${label} ${value}: o mínimo desta missão ainda não é conhecido (pista: ${label.toLowerCase()} ${needLevel(kind, mission.needs[kind])}). Faça um ensaio em solo ou lance para descobrir.`,
      });
      unknown('science', 'Ciência', t.scienceEffective, 'science');
      unknown('mission_comms', 'Comunicação', t.commsEffective, 'comms');
    } else {
      add('science', t.scienceEffective >= mission.needs.science,
        `Ciência ${t.scienceEffective}/${mission.needs.science}: atende à missão.`,
        `Ciência ${t.scienceEffective} abaixo do mínimo ${mission.needs.science} da missão. Adicione instrumentos.`);
      add('mission_comms', t.commsEffective >= mission.needs.comms,
        `Comunicação ${t.commsEffective}/${mission.needs.comms}: atende à missão.`,
        `Comunicação ${t.commsEffective} abaixo do mínimo ${mission.needs.comms} da missão.`);
    }
    if (mission.needs.lifeSupport) {
      add('life', t.lifeSupport, 'Suporte de vida a bordo.', 'A missão exige cápsula com suporte de vida.');
    }
    const lifetime = t.lifetime + (modifiers.lifetimeDelta || 0);
    add('lifetime', lifetime >= mission.needs.lifetime,
      `Vida útil ${lifetime} ano(s): atende aos ${mission.needs.lifetime} exigidos.`,
      `Vida útil ${lifetime} ano(s), abaixo dos ${mission.needs.lifetime} que a missão exige.${orbit && orbit.baseLifetime <= 2 ? ` A ${orbit.name} decai rápido pelo atrito da atmosfera;` : ''} peças como o propulsor de manutenção ou a bateria estendem a vida, se você já as descobriu.`);
  }

  // `modifiers.launched`: avaliação depois do voo, o lançamento já foi pago.
  if (!modifiers.launched) {
    add('funds', player.funds >= t.launchCost,
      `Verba ${player.funds} cobre o lançamento (${t.launchCost}).`,
      `Verba ${player.funds} não cobre o custo de lançamento ${t.launchCost}. Jogue mais rodadas no tabuleiro ou use um lançador mais barato.`);
  }

  const hardOk = checks.filter((c) => c.hard).every((c) => c.ok);
  // "Projeto pronto" ignora verba: o projeto está certo, só falta dinheiro para lançar.
  const designOk = checks.filter((c) => c.hard && c.id !== 'funds').every((c) => c.ok);
  return { ok: hardOk, designOk, checks, totals: t };
}

// Simula o lançamento e a operação.
// `modifiers` = consequências da decisão em voo: { sciencePenalty, failChance, lifetimeDelta }.
// `randomFailure: false` desliga a falha aleatória única: no jogo com voo em etapas, o risco
// já foi sorteado etapa por etapa (sim/flight.js) e aqui só sobra a avaliação final da operação.
// Devolve { success, score, reasons, checks, totals, usedShield, scienceDelivered }.
export function simulate(player, { rng = Math.random, modifiers = {}, randomFailure: allowRandom = true } = {}) {
  const { ok, checks, totals } = checkDesign(player, { ...modifiers, evaluate: true });
  const reasons = checks.filter((c) => !c.ok && c.hard).map((c) => c.text);
  let usedShield = false;

  // Falha aleatória só acontece se o projeto estava certo; escudo protege uma vez.
  let randomFailure = false;
  if (ok && allowRandom) {
    const chance = FAILURE_CHANCE + (modifiers.failChance || 0);
    if (rng() < chance) {
      if ((player.shields || 0) > 0) {
        usedShield = true;
        reasons.push('Um componente falhou, mas a redundância do projeto (proteção) salvou a missão.');
      } else {
        randomFailure = true;
        reasons.push(modifiers.failChance
          ? 'A decisão arriscada em voo custou caro: falha de componente durante a operação.'
          : 'Falha aleatória de componente durante a operação. Proteções contra falha (eventos e milestones) evitariam isso.');
      }
    }
  }

  const success = ok && !randomFailure;
  const commsOk = checks.find((c) => c.id === 'comms')?.ok ?? true;
  let scienceDelivered = commsOk ? totals.scienceEffective : Math.floor(totals.scienceEffective / 2);
  if (modifiers.sciencePenalty) scienceDelivered = Math.floor(scienceDelivered * (1 - modifiers.sciencePenalty));

  // Pontuação: premia ciência entregue, verba poupada e massa enxuta (uso eficiente de recursos).
  const fundsLeft = modifiers.launched ? player.funds : player.funds - totals.launchCost;
  const score = success
    ? scienceDelivered * 10 + Math.max(0, fundsLeft) + Math.max(0, (totals.maxMass || 0) - totals.mass)
    : 0;

  if (success) {
    reasons.unshift(`Missão cumprida: ${scienceDelivered} de ciência entregue.`);
    if (!commsOk) reasons.push('Metade da ciência se perdeu por falta de comunicação.');
    if (modifiers.sciencePenalty) reasons.push(`A decisão em voo custou ${modifiers.sciencePenalty * 100}% da ciência.`);
  }

  return { success, score, reasons, checks, totals, usedShield, scienceDelivered };
}
