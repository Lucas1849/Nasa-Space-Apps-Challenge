// Simulação da missão: recebe o jogador e devolve resultado + lista de motivos.
// O relatório precisa EXPLICAR por que deu certo ou errado (é o que a banca avalia).
// Função pura. `rng` injetável para testes.
// ATENÇÃO: regras e números FICTÍCIOS para balanceamento, não modelam física real.
import { effectiveTotals } from './resources.js';
import { isHidden, needLevel } from './needs.js';
import { MISSIONS } from '../data/missions.js';
import { ORBITS } from '../data/orbits.js';
import { LAUNCHERS } from '../data/launchers.js';
// `tr`: `t` é usado como variável local (totais da nave) em funções deste módulo.
import { t as tr } from '../i18n/index.js';

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

  add('launcher', Boolean(launcher), tr('sim.launcher', { name: launcher?.name }), tr('sim.noLauncher'));
  add('orbit', Boolean(orbit), tr('sim.orbit', { name: orbit?.name }), tr('sim.noOrbit'));

  if (launcher && orbit) {
    add('reach', launcher.reach.includes(orbit.id),
      tr('sim.reachOk', { launcher: launcher.name, orbit: orbit.name }),
      tr('sim.reachBad', { launcher: launcher.name, orbit: orbit.name }));
    add('mass', t.mass <= launcher.maxMass,
      tr('sim.massOk', { mass: t.mass, max: launcher.maxMass }),
      tr('sim.massBad', { mass: t.mass, max: launcher.maxMass }));
  }

  if (orbit && mission) {
    add('mission_orbit', orbit.id === mission.orbit,
      tr('sim.orbitOk'),
      tr('sim.orbitBad', { mission: mission.name, req: ORBITS[mission.orbit].name, orbit: orbit.name }));
  }

  add('power', t.powerBalance >= 0,
    tr('sim.powerOk', { gen: t.powerGen, use: t.powerUse, bal: t.powerBalance }),
    tr('sim.powerBad', { gen: t.powerGen, use: t.powerUse }));

  add('comms', t.commsEffective >= t.data,
    tr('sim.commsOk', { comms: t.commsEffective, data: t.data }),
    tr('sim.commsBad', { data: t.data, comms: t.commsEffective, penalty: orbit?.commsPenalty ? tr('sim.commsPenalty', { orbit: orbit.name, n: orbit.commsPenalty * 100 }) : '' }),
    false);

  if (mission) {
    if (isHidden(player, player.missionId) && !modifiers.evaluate) {
      // Mínimo desconhecido: mostra só o que a nave entrega e a pista, sem o número, e não trava.
      const unknown = (id, label, value, kind) => checks.push({
        id, ok: true, hard: false, hidden: true,
        text: tr('sim.unknown', { label, value, labelLower: label.toLowerCase(), hint: needLevel(kind, mission.needs[kind]) }),
      });
      unknown('science', tr('sim.labelScience'), t.scienceEffective, 'science');
      unknown('mission_comms', tr('sim.labelComms'), t.commsEffective, 'comms');
    } else {
      add('science', t.scienceEffective >= mission.needs.science,
        tr('sim.scienceOk', { value: t.scienceEffective, need: mission.needs.science }),
        tr('sim.scienceBad', { value: t.scienceEffective, need: mission.needs.science }));
      add('mission_comms', t.commsEffective >= mission.needs.comms,
        tr('sim.missionCommsOk', { value: t.commsEffective, need: mission.needs.comms }),
        tr('sim.missionCommsBad', { value: t.commsEffective, need: mission.needs.comms }));
    }
    if (mission.needs.lifeSupport) {
      add('life', t.lifeSupport, tr('sim.lifeOk'), tr('sim.lifeBad'));
    }
    const lifetime = t.lifetime + (modifiers.lifetimeDelta || 0);
    add('lifetime', lifetime >= mission.needs.lifetime,
      tr('sim.lifetimeOk', { n: lifetime, need: mission.needs.lifetime }),
      tr('sim.lifetimeBad', { n: lifetime, need: mission.needs.lifetime, decay: orbit && orbit.baseLifetime <= 2 ? tr('sim.lifetimeDecay', { orbit: orbit.name }) : '' }));
  }

  // `modifiers.launched`: avaliação depois do voo, o lançamento já foi pago.
  if (!modifiers.launched) {
    add('funds', player.funds >= t.launchCost,
      tr('sim.fundsOk', { funds: player.funds, cost: t.launchCost }),
      tr('sim.fundsBad', { funds: player.funds, cost: t.launchCost }));
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
        reasons.push(tr('sim.shieldSaved'));
      } else {
        randomFailure = true;
        reasons.push(modifiers.failChance ? tr('sim.riskyFailed') : tr('sim.randomFailed'));
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
    reasons.unshift(tr('sim.missionDone', { n: scienceDelivered }));
    if (!commsOk) reasons.push(tr('sim.commsLost'));
    if (modifiers.sciencePenalty) reasons.push(tr('sim.sciencePenalty', { n: modifiers.sciencePenalty * 100 }));
  }

  return { success, score, reasons, checks, totals, usedShield, scienceDelivered };
}
