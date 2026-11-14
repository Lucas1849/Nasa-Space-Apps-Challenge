// Órbitas. ATENÇÃO: valores qualitativos simplificados para o jogo.
// commsPenalty = quanto a distância reduz a capacidade de comunicação (0 = nada, 0.5 = metade).
// Trade-off: órbita mais distante rende mais ciência em certas missões, mas comunica pior.

export const ORBITS = {
  leo: { id: 'leo', name: 'Órbita baixa (LEO)', description: 'Perto da Terra: comunicação fácil, cobertura limitada.', commsPenalty: 0, scienceBonus: 0 },
  geo: { id: 'geo', name: 'Órbita geoestacionária (GEO)', description: 'Alta e fixa sobre um ponto: ótima cobertura, lançamento mais caro.', commsPenalty: 0.2, scienceBonus: 1 },
  moon: { id: 'moon', name: 'Órbita lunar', description: 'Longe da Terra: comunicação difícil, ciência inédita.', commsPenalty: 0.5, scienceBonus: 3 },
};
