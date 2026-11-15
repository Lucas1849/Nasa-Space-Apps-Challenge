// Missões da corrida espacial (ver IDEIA.md). Adicionar missão nova = preencher dados, sem código novo.
// ATENÇÃO: valores FICTÍCIOS, só para balanceamento. Não são requisitos de missões históricas.
//
// needs: o que a espaçonave precisa entregar para a missão contar como cumprida.
//   science     = valor científico mínimo (soma dos instrumentos + bônus da órbita)
//   comms       = capacidade mínima de comunicação efetiva
//   lifeSupport = exige cápsula com suporte de vida
//   lifetime    = anos mínimos de operação (vida útil da órbita + bônus de peças)
// orbit: órbita onde a missão precisa ser executada (define as etapas do voo, ver data/stages.js).
// extraStages: etapas a mais no fim do voo (ex.: retorno da tripulação).
// kit: peças e lançador que o degrau revela ao começar (ids de data/parts.js, instruments.js e launchers.js).
//   É o mínimo para o degrau fechar, para ninguém ficar travado esperando a sorte do tabuleiro.
//   As casas do tabuleiro, a tecnologia e o Ano novo revelam os extras e as alternativas.
// Cada jogador cumpre cada missão no máximo uma vez. O primeiro do mundo leva o recorde.
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
    kit: ['radio_beacon', 'solar_small', 'antenna_basic', 'small'],
    milestones: milestones('Montar um satélite que transmita sinal', 'Lançar em órbita baixa', 'Receber o sinal na Terra'),
  },
  living_being: {
    id: 'living_being',
    name: 'Ser vivo em órbita',
    difficulty: 'médio',
    orbit: 'leo',
    goal: 'Levar um ser vivo à órbita e monitorar seus sinais vitais.',
    needs: { science: 4, comms: 4, lifeSupport: true, lifetime: 1 },
    kit: ['life_support', 'solar_large', 'radio_beacon', 'antenna_basic', 'small'],
    milestones: milestones('Montar cápsula com suporte de vida', 'Lançar em órbita baixa', 'Manter o passageiro vivo e transmitir dados'),
  },
  weather_watch: {
    id: 'weather_watch',
    name: 'Satélite meteorológico',
    difficulty: 'médio',
    orbit: 'geo',
    goal: 'Observar o clima do mesmo ponto do planeta durante anos.',
    needs: { science: 6, comms: 6, lifeSupport: false, lifetime: 5 },
    kit: ['camera', 'radio_beacon', 'antenna_dish', 'solar_large', 'medium'],
    milestones: milestones('Montar satélite com câmera e boa antena', 'Lançar em órbita geoestacionária', 'Operar por 5 anos enviando imagens'),
  },
  lunar_probe: {
    id: 'lunar_probe',
    name: 'Sonda lunar',
    difficulty: 'difícil',
    orbit: 'moon',
    goal: 'Chegar à Lua e enviar dados científicos de lá.',
    needs: { science: 8, comms: 5, lifeSupport: false, lifetime: 2 },
    kit: ['spectrometer', 'antenna_dish', 'solar_large', 'heavy'],
    milestones: milestones('Montar sonda com instrumentos científicos', 'Lançar rumo à Lua', 'Enviar dados científicos da Lua'),
  },
  space_station: {
    id: 'space_station',
    name: 'Estação espacial',
    difficulty: 'difícil',
    orbit: 'leo',
    goal: 'Manter uma estação com gente a bordo em órbita baixa por anos: energia contínua e suporte de vida.',
    needs: { science: 6, comms: 4, lifeSupport: true, lifetime: 5 },
    kit: ['life_support', 'camera', 'thruster', 'antenna_basic', 'solar_large', 'medium'],
    milestones: milestones('Montar estação com suporte de vida e energia de sobra', 'Lançar em órbita baixa', 'Operar com tripulação por 5 anos'),
  },
  crewed_moon: {
    id: 'crewed_moon',
    name: 'Tripulação na Lua',
    difficulty: 'muito difícil',
    orbit: 'moon',
    goal: 'Levar pessoas à órbita da Lua, com ciência a bordo, e trazê-las de volta.',
    needs: { science: 10, comms: 8, lifeSupport: true, lifetime: 1 },
    kit: ['life_support', 'spectrometer', 'antenna_dish', 'solar_large', 'heavy'],
    extraStages: ['crew_return'], // voo tripulado só termina com a tripulação de volta (ver data/stages.js)
    milestones: milestones('Montar nave tripulada com instrumentos', 'Lançar rumo à Lua com foguete pesado', 'Operar na Lua e voltar com a tripulação'),
  },
};
