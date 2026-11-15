// Veículos de lançamento. ATENÇÃO: valores FICTÍCIOS, não são foguetes reais.
// maxMass = carga máxima (unidades do jogo); reach = órbitas que consegue atingir.
// minTech = nível de tecnologia da agência para poder usar.
// Trade-off: foguete maior cabe mais carga, mas custa muito mais e exige mais tecnologia.

export const LAUNCHERS = {
  small: { id: 'small', name: 'Lançador pequeno', maxMass: 40, cost: 25, reach: ['leo'], minTech: 1 },
  medium: { id: 'medium', name: 'Lançador médio', maxMass: 120, cost: 50, reach: ['leo', 'geo'], minTech: 3 },
  heavy: { id: 'heavy', name: 'Lançador pesado', maxMass: 300, cost: 110, reach: ['leo', 'geo', 'moon'], minTech: 5 },
};
