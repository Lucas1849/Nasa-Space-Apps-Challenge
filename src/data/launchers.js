// Veículos de lançamento. ATENÇÃO: valores FICTÍCIOS, não são foguetes reais.
// maxMass = carga máxima (unidades do jogo); reach = órbitas que consegue atingir.
// Trade-off: foguete maior cabe mais carga, mas custa muito mais.

export const LAUNCHERS = {
  small: { id: 'small', name: 'Lançador pequeno', maxMass: 40, cost: 20, reach: ['leo'] },
  medium: { id: 'medium', name: 'Lançador médio', maxMass: 120, cost: 50, reach: ['leo', 'geo'] },
  heavy: { id: 'heavy', name: 'Lançador pesado', maxMass: 300, cost: 110, reach: ['leo', 'geo', 'moon'] },
};
