// Instrumentos científicos. ATENÇÃO: valores FICTÍCIOS/aproximados, só para balanceamento.
// Não representam instrumentos reais da NASA. Unidades arbitrárias do jogo.
// Trade-off central do desafio: mais ciência custa massa, energia, dinheiro e gera mais dados.
// Campos iguais aos de parts.js para a soma de recursos ser uniforme.

export const INSTRUMENTS = {
  camera: { id: 'camera', name: 'Câmera óptica', mass: 5, power: 8, powerGen: 0, cost: 10, commsRate: 0, dataRate: 6, science: 4, lifeSupport: false },
  hires_camera: { id: 'hires_camera', name: 'Câmera de alta resolução', mass: 12, power: 18, powerGen: 0, cost: 28, commsRate: 0, dataRate: 14, science: 9, lifeSupport: false },
  spectrometer: { id: 'spectrometer', name: 'Espectrômetro', mass: 12, power: 20, powerGen: 0, cost: 25, commsRate: 0, dataRate: 4, science: 8, lifeSupport: false },
  magnetometer: { id: 'magnetometer', name: 'Magnetômetro', mass: 3, power: 4, powerGen: 0, cost: 8, commsRate: 0, dataRate: 1, science: 3, lifeSupport: false },
  radio_beacon: { id: 'radio_beacon', name: 'Transmissor de rádio (bip)', mass: 2, power: 2, powerGen: 0, cost: 4, commsRate: 0, dataRate: 1, science: 2, lifeSupport: false },
};
