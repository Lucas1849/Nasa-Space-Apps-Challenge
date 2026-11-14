// Calendário da corrida espacial (IDEIA-v3 seção 3): 3 rodadas = 1 ano, começando em 1957.
// Os marcos reais foram conferidos nas páginas de história da NASA (links em `source`).
// Usamos só o ano: algumas páginas divergem no dia exato.
// `sides` = ano em que cada lado cumpriu a missão de verdade (null = nunca). O bot do modo solo
// segue estes anos, com variação de um ano para mais ou para menos.

export const START_YEAR = 1957;
export const END_YEAR = 1969;          // Apollo 11: limite da partida
export const ROUNDS_PER_YEAR = 3;
export const MAX_ROUNDS = (END_YEAR - START_YEAR + 1) * ROUNDS_PER_YEAR; // 39 rodadas

export const yearOf = (round) => START_YEAR + Math.floor((round - 1) / ROUNDS_PER_YEAR);
export const isNewYear = (round) => (round - 1) % ROUNDS_PER_YEAR === 0;

// Cartão "Na história real", mostrado no relatório de sucesso e no fim da partida.
export const REAL_HISTORY = {
  first_satellite: {
    year: 1957,
    sides: { ussr: 1957, usa: 1958 },
    text: 'Sputnik 1 (URSS, 1957) foi o primeiro satélite artificial: só um transmissor de rádio. Os EUA responderam com o Explorer 1 em 1958, que descobriu os cinturões de radiação de Van Allen.',
    source: 'https://www.nasa.gov/history/explorer-1-overview/',
  },
  living_being: {
    year: 1957,
    sides: { ussr: 1957, usa: 1961 },
    text: 'Sputnik 2 (URSS, 1957) levou a cadela Laika, o primeiro animal em órbita; a cápsula não tinha como voltar. Os EUA puseram o chimpanzé Enos em órbita em 1961 e o trouxeram de volta.',
    source: 'https://www.nasa.gov/history/a-brief-history-of-animals-in-space/',
  },
  weather_watch: {
    year: 1960,
    sides: { usa: 1960, ussr: null },
    text: 'TIROS-1 (EUA, 1960) foi o primeiro satélite meteorológico, em órbita baixa. Em 1966, o ATS-1 fez a primeira foto da Terra a partir da órbita geoestacionária.',
    source: 'https://www.nasa.gov/history/90-years-of-our-changing-views-of-earth/',
  },
  lunar_probe: {
    year: 1959,
    sides: { ussr: 1959, usa: 1964 },
    text: 'Luna 2 (URSS, 1959) foi a primeira espaçonave a atingir a Lua. A Ranger 7 (EUA, 1964) mandou milhares de fotos de perto antes do impacto, que ajudaram a escolher os locais de pouso da Apollo.',
    source: 'https://www.nasa.gov/history/60-years-ago-ranger-7-photographs-the-moon/',
  },
  space_station: {
    year: 1971,
    sides: { ussr: 1971, usa: 1973 },
    text: 'Salyut 1 (URSS, 1971) foi a primeira estação espacial. Os EUA lançaram o Skylab em 1973. Manter gente viva por semanas exige energia contínua e suporte de vida confiável.',
    source: 'https://www.nasa.gov/missions/station/50-years-ago-launch-of-salyut-the-worlds-first-space-station/',
  },
  crewed_moon: {
    year: 1968,
    sides: { usa: 1968, ussr: null },
    text: 'Apollo 8 (EUA, 1968) levou a primeira tripulação à órbita da Lua e a trouxe de volta. O pouso veio com a Apollo 11, em 1969. A URSS nunca levou tripulação à Lua.',
    source: 'https://www.nasa.gov/mission/apollo-8/',
  },
};

export const EPILOGUE = 'Em 1975, a missão Apollo-Soyuz acoplou uma nave americana e uma soviética em órbita. A corrida virou cooperação.';
