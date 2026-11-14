// Prédios da agência (IDEIA.md seção 5). Constrói ao cair num terreno livre; depois sobe o nível
// de qualquer lugar, sem precisar de outra casa. Rival que cai no terreno pode pagar para usar o prédio.
// ATENÇÃO: custos e efeitos FICTÍCIOS para balanceamento.
//
// perLevel = efeito por nível. useEffect = o que o rival ganha ao pagar a taxa de uso (uma vez).

export const MAX_LEVEL = 3;
export const BUILD_COST = 15;          // nível 1
export const UPGRADE_COST_STEP = 15;   // nível 2 custa 30, nível 3 custa 45 (custo sobe para frear bola de neve)
export const CATCHUP_UPGRADE_DISCOUNT = 0.5; // quem está em último paga metade no upgrade
export const USE_FEE = 6;              // taxa paga ao dono para usar o prédio dele

export const BUILDINGS = {
  lab: {
    id: 'lab', name: 'Laboratório', icon: '🧪',
    effect: '+1 de tecnologia a cada Ano novo, por nível.',
    useEffect: { tech: 1 }, useText: '+1 de tecnologia',
  },
  factory: {
    id: 'factory', name: 'Fábrica', icon: '🏭',
    effect: '−10% no preço das peças, por nível.',
    useEffect: { discount: 20 }, useText: '20% de desconto na próxima compra',
  },
  control: {
    id: 'control', name: 'Controle de missão', icon: '🎛️',
    effect: '−3% de risco em cada etapa do voo, por nível.',
    useEffect: { shield: 1 }, useText: '1 proteção contra falha',
  },
  sponsor: {
    id: 'sponsor', name: 'Patrocinador', icon: '🤝',
    effect: '+10 de verba a cada Ano novo, por nível (fraco de propósito).',
    useEffect: { funds: 8 }, useText: '+8 de verba',
  },
};

export const upgradeCost = (level) => (level === 0 ? BUILD_COST : UPGRADE_COST_STEP * (level + 1));
