// Missões da corrida espacial (ver IDEIA.md). Adicionar missão nova = preencher dados, sem código novo.
// ATENÇÃO: valores FICTÍCIOS, só para balanceamento. Não são requisitos de missões históricas.
//
// needs: o que a espaçonave precisa entregar para a missão contar como cumprida.
//   science     = valor científico mínimo (soma dos instrumentos + bônus da órbita)
//   comms       = capacidade mínima de comunicação efetiva
//   lifeSupport = exige cápsula com suporte de vida
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
    needs: { science: 2, comms: 2, lifeSupport: false },
    milestones: milestones('Montar um satélite que transmita sinal', 'Lançar em órbita baixa', 'Receber o sinal na Terra'),
  },
  living_being: {
    id: 'living_being',
    name: 'Ser vivo em órbita',
    difficulty: 'médio',
    orbit: 'leo',
    needs: { science: 4, comms: 4, lifeSupport: true },
    milestones: milestones('Montar cápsula com suporte de vida', 'Lançar em órbita baixa', 'Manter o passageiro vivo e transmitir dados'),
  },
  lunar_probe: {
    id: 'lunar_probe',
    name: 'Sonda lunar',
    difficulty: 'difícil',
    orbit: 'moon',
    needs: { science: 8, comms: 5, lifeSupport: false },
    milestones: milestones('Montar sonda com instrumentos científicos', 'Lançar rumo à Lua', 'Enviar dados científicos da Lua'),
  },
};
