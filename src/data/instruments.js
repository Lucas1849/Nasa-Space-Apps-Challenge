// Instrumentos científicos. ATENÇÃO: valores FICTÍCIOS/aproximados, só para balanceamento.
// Não representam instrumentos reais da NASA. Unidades arbitrárias do jogo.
// Trade-off central do desafio: mais ciência custa massa, energia, dinheiro e gera mais dados.
// Campos iguais aos de parts.js para a soma de recursos ser uniforme.
// minTech = nível de tecnologia da agência para poder comprar (esperar desbloqueia peças melhores).

import { localize } from '../i18n/localize.js';

// Nomes em i18n (instrument.<id>.name). Aqui ficam só ids e números.
export const INSTRUMENTS = localize('instrument', {
  camera: { id: 'camera', mass: 5, power: 8, powerGen: 0, cost: 10, commsRate: 0, dataRate: 6, science: 4, lifeSupport: false, lifetimeBonus: 0, minTech: 1, visual: 'camera' },
  hires_camera: { id: 'hires_camera', mass: 12, power: 18, powerGen: 0, cost: 28, commsRate: 0, dataRate: 14, science: 9, lifeSupport: false, lifetimeBonus: 0, minTech: 4, visual: 'camera_large' },
  spectrometer: { id: 'spectrometer', mass: 12, power: 20, powerGen: 0, cost: 25, commsRate: 0, dataRate: 4, science: 8, lifeSupport: false, lifetimeBonus: 0, minTech: 3, visual: 'spectro' },
  magnetometer: { id: 'magnetometer', mass: 3, power: 4, powerGen: 0, cost: 8, commsRate: 0, dataRate: 1, science: 3, lifeSupport: false, lifetimeBonus: 0, minTech: 1, visual: 'boom' },
  radio_beacon: { id: 'radio_beacon', mass: 2, power: 2, powerGen: 0, cost: 4, commsRate: 0, dataRate: 1, science: 2, lifeSupport: false, lifetimeBonus: 0, minTech: 1, visual: 'beacon' },
});
