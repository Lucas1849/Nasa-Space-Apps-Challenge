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

// Balanceamento (15/11): "Projeto pronto" dava +20 de verba ANTES de lançar e, na prática, devolvia o preço
// das peças (dava para lançar no turno 1). A verba agora vem só depois de lançar (prestígio), quando já não
// paga o foguete desta nave.
import { t } from '../i18n/index.js';
import { localize } from '../i18n/localize.js';

// Milestones: o NOME é compartilhado por todas as missões (milestone.<id>); o REQUISITO é por missão
// (mission.<missionId>.ms.<id>). Getters para trocar com o idioma. Efeitos continuam fixos.
const MILESTONE_EFFECTS = {
  design_ready: { type: 'discount', value: 10 },
  launched: { type: 'funds', value: 10 },
  mission_complete: { type: 'shield', value: 1 },
};
const milestones = (missionId) => Object.keys(MILESTONE_EFFECTS).map((id) => {
  const ms = { id, effect: MILESTONE_EFFECTS[id] };
  Object.defineProperty(ms, 'name', { enumerable: true, get() { return t(`milestone.${id}`); } });
  Object.defineProperty(ms, 'requirement', { enumerable: true, get() { return t(`mission.${missionId}.ms.${id}`); } });
  return ms;
});

// Nome, dificuldade e objetivo em i18n (mission.<id>.name/difficulty/goal). Aqui ficam ids e números.
export const MISSIONS = localize('mission', {
  first_satellite: {
    id: 'first_satellite',
    orbit: 'leo',
    needs: { science: 2, comms: 2, lifeSupport: false, lifetime: 1 },
    kit: ['radio_beacon', 'solar_small', 'antenna_basic', 'small'],
    milestones: milestones('first_satellite'),
  },
  living_being: {
    id: 'living_being',
    orbit: 'leo',
    needs: { science: 4, comms: 4, lifeSupport: true, lifetime: 1 },
    kit: ['life_support', 'solar_large', 'radio_beacon', 'antenna_basic', 'small'],
    milestones: milestones('living_being'),
  },
  weather_watch: {
    id: 'weather_watch',
    orbit: 'geo',
    needs: { science: 6, comms: 6, lifeSupport: false, lifetime: 5 },
    kit: ['camera', 'radio_beacon', 'antenna_dish', 'solar_large', 'medium'],
    milestones: milestones('weather_watch'),
  },
  lunar_probe: {
    id: 'lunar_probe',
    orbit: 'moon',
    needs: { science: 8, comms: 5, lifeSupport: false, lifetime: 2 },
    kit: ['spectrometer', 'antenna_dish', 'solar_large', 'heavy'],
    milestones: milestones('lunar_probe'),
  },
  space_station: {
    id: 'space_station',
    orbit: 'leo',
    needs: { science: 6, comms: 4, lifeSupport: true, lifetime: 5 },
    kit: ['life_support', 'camera', 'thruster', 'antenna_basic', 'solar_large', 'medium'],
    milestones: milestones('space_station'),
  },
  crewed_moon: {
    id: 'crewed_moon',
    orbit: 'moon',
    needs: { science: 10, comms: 8, lifeSupport: true, lifetime: 1 },
    kit: ['life_support', 'spectrometer', 'antenna_dish', 'solar_large', 'heavy'],
    extraStages: ['crew_return'], // voo tripulado só termina com a tripulação de volta (ver data/stages.js)
    milestones: milestones('crewed_moon'),
  },
}, ['name', 'difficulty', 'goal']);
