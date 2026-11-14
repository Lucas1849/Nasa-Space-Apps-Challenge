// Cartas de vitória (proposta do Henrique, IDEIA.md seção 13.2). Sorteadas sem repetição no início.
// Cada carta corresponde a um critério de pontuação do desafio e disputa as mesmas missões das outras.
// ATENÇÃO: metas (15 de ciência, 3 missões, 2 recordes) são CHUTES para testar e balancear.
//
// progress(player, state) => { value, target }. A carta está cumprida quando value >= target.
// counts(missionId, state) => true se cumprir essa missão ajuda a carta (destaque na escolha de missão).
// startBonus = verba extra no início (a Exploradora tem a meta mais cara).

export const EARTH_ORBIT_MISSIONS = ['first_satellite', 'living_being', 'weather_watch'];

const done = (player) => player.completed.map((c) => c.missionId);

export const OBJECTIVES = {
  explorer: {
    id: 'explorer',
    name: 'Exploradora',
    icon: '🧑‍🚀',
    goal: 'Cumprir a missão Tripulação na Lua.',
    profile: 'Uma aposta grande, cara e arriscada.',
    criterion: 'Sucesso da missão',
    startBonus: 40,
    // Progresso = etapas do voo tripulado já superadas (etapas contam, mesmo se a nave falhar depois).
    progress: (p) => ({ value: done(p).includes('crewed_moon') ? 4 : Math.min(3, p.bestStage?.crewed_moon || 0), target: 4 }),
    counts: (missionId) => missionId === 'crewed_moon',
  },
  scientist: {
    id: 'scientist',
    name: 'Científica',
    icon: '🔬',
    goal: 'Somar 15 de ciência entregue em missões cumpridas.',
    profile: 'Instrumentos bons e destinos distantes.',
    criterion: 'Valor científico',
    startBonus: 0,
    progress: (p) => ({ value: p.completed.reduce((s, c) => s + c.science, 0), target: 15 }),
    counts: () => true,
  },
  infrastructure: {
    id: 'infrastructure',
    name: 'Infraestrutura',
    icon: '🛰️',
    goal: 'Cumprir as 3 missões na órbita da Terra: Primeiro satélite, Ser vivo e Satélite meteorológico.',
    profile: 'Missões baratas e confiáveis.',
    criterion: 'Uso eficiente de recursos',
    startBonus: 0,
    progress: (p) => ({ value: done(p).filter((id) => EARTH_ORBIT_MISSIONS.includes(id)).length, target: 3 }),
    counts: (missionId) => EARTH_ORBIT_MISSIONS.includes(missionId),
  },
  pioneer: {
    id: 'pioneer',
    name: 'Pioneira',
    icon: '🏁',
    goal: 'Ser a primeira agência do mundo a cumprir 2 missões quaisquer.',
    profile: 'Lançar cedo e arriscar.',
    criterion: 'Boas decisões (lançar agora ou esperar)',
    startBonus: 0,
    progress: (p, state) => ({ value: Object.values(state.records).filter((r) => r.playerId === p.id).length, target: 2 }),
    counts: (missionId, state) => !state.records[missionId],
  },
};

export function objectiveProgress(player, state) {
  const card = OBJECTIVES[player.objectiveId];
  if (!card) return { value: 0, target: 1, pct: 0, done: false };
  const { value, target } = card.progress(player, state);
  return { value, target, pct: Math.min(1, value / target), done: value >= target };
}

// Sorteia n cartas sem repetição. `rng` injetável para testes.
// No solo não existe Pioneira: sem rivais, ser "o primeiro do mundo" seria automático.
export function drawObjectives(n, rng = Math.random) {
  const deck = Object.keys(OBJECTIVES).filter((id) => n > 1 || id !== 'pioneer');
  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck.slice(0, n);
}
