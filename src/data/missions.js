// Missões da corrida espacial (ver IDEIA.md). Adicionar missão nova = preencher dados, sem código novo.
// ATENÇÃO: valores FICTÍCIOS, só para balanceamento. Não são requisitos de missões históricas.
//
// needs: o que a espaçonave precisa entregar para a missão contar como cumprida.
//   science     = valor científico mínimo (soma dos instrumentos + bônus da órbita)
//   comms       = capacidade mínima de comunicação efetiva
//   lifeSupport = exige cápsula com suporte de vida
//   lifetime    = anos mínimos de operação (vida útil da órbita + bônus de peças)
// orbit: órbita onde a missão precisa ser executada.
//
// Todas as missões têm os mesmos 3 milestones; só mudam nome e requisito (texto).
// Efeitos possíveis (só 3 tipos): 'funds' (+ verba), 'discount' (% de desconto na loja), 'shield' (proteção contra falha).

const milestones = (ready, launch, done) => [
  { id: 'design_ready', name: 'Projeto pronto', requirement: ready, effect: { type: 'funds', value: 20 } },
  { id: 'launched', name: 'Lançamento', requirement: launch, effect: { type: 'discount', value: 10 } },
  { id: 'mission_complete', name: 'Missão cumprida', requirement: done, effect: { type: 'shield', value: 1 } },
];

export const MISSIONS = {
  first_satellite: {
    id: 'first_satellite',
    name: 'Primeiro satélite',
    difficulty: 'fácil',
    orbit: 'leo',
    goal: 'Colocar um objeto em órbita e provar que ele está lá: basta transmitir um sinal.',
    needs: { science: 2, comms: 2, lifeSupport: false, lifetime: 1 },
    milestones: milestones('Montar um satélite que transmita sinal', 'Lançar em órbita baixa', 'Receber o sinal na Terra'),
  },
  living_being: {
    id: 'living_being',
    name: 'Ser vivo em órbita',
    difficulty: 'médio',
    orbit: 'leo',
    goal: 'Levar um ser vivo à órbita e monitorar seus sinais vitais.',
    needs: { science: 4, comms: 4, lifeSupport: true, lifetime: 1 },
    milestones: milestones('Montar cápsula com suporte de vida', 'Lançar em órbita baixa', 'Manter o passageiro vivo e transmitir dados'),
  },
  weather_watch: {
    id: 'weather_watch',
    name: 'Satélite meteorológico',
    difficulty: 'médio',
    orbit: 'geo',
    goal: 'Observar o clima do mesmo ponto do planeta durante anos.',
    needs: { science: 6, comms: 6, lifeSupport: false, lifetime: 5 },
    milestones: milestones('Montar satélite com câmera e boa antena', 'Lançar em órbita geoestacionária', 'Operar por 5 anos enviando imagens'),
  },
  lunar_probe: {
    id: 'lunar_probe',
    name: 'Sonda lunar',
    difficulty: 'difícil',
    orbit: 'moon',
    goal: 'Chegar à Lua e enviar dados científicos de lá.',
    needs: { science: 8, comms: 5, lifeSupport: false, lifetime: 2 },
    milestones: milestones('Montar sonda com instrumentos científicos', 'Lançar rumo à Lua', 'Enviar dados científicos da Lua'),
  },
  crewed_moon: {
    id: 'crewed_moon',
    name: 'Tripulação na Lua',
    difficulty: 'muito difícil',
    orbit: 'moon',
    goal: 'Levar pessoas à órbita da Lua, com ciência a bordo, e trazê-las de volta.',
    needs: { science: 10, comms: 8, lifeSupport: true, lifetime: 1 },
    milestones: milestones('Montar nave tripulada com instrumentos', 'Lançar rumo à Lua com foguete pesado', 'Operar na Lua e voltar com a tripulação'),
  },
};
