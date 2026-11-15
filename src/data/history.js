// Calendário da corrida espacial (IDEIA.md v3 seção 3): 3 rodadas = 1 ano, começando em 1955 (dois anos de preparação antes do Sputnik, em 1957).
// Os marcos reais foram conferidos nas páginas de história da NASA (links em `source`).
// Usamos só o ano: algumas páginas divergem no dia exato.
// `sides` = ano em que cada lado cumpriu a missão de verdade (null = nunca). O bot do modo solo
// segue estes anos, com variação de um ano para mais ou para menos.
import { localize } from '../i18n/localize.js';

export const START_YEAR = 1955;
export const END_YEAR = 1969;          // Apollo 11: limite da partida
export const ROUNDS_PER_YEAR = 3;
export const MAX_ROUNDS = (END_YEAR - START_YEAR + 1) * ROUNDS_PER_YEAR; // 45 rodadas (teto: a partida acaba antes se alguém completa a escada)

export const yearOf = (round) => START_YEAR + Math.floor((round - 1) / ROUNDS_PER_YEAR);
export const isNewYear = (round) => (round - 1) % ROUNDS_PER_YEAR === 0;

// Cartão "Na história real", mostrado no relatório de sucesso e no fim da partida.
// O texto fica em i18n (real.<id>.text); aqui só anos, lados e fonte.
export const REAL_HISTORY = localize('real', {
  first_satellite: {
    year: 1957,
    sides: { ussr: 1957, usa: 1958 },
    source: 'https://www.nasa.gov/history/explorer-1-overview/',
  },
  living_being: {
    year: 1957,
    sides: { ussr: 1957, usa: 1961 },
    source: 'https://www.nasa.gov/history/a-brief-history-of-animals-in-space/',
  },
  weather_watch: {
    year: 1960,
    sides: { usa: 1960, ussr: null },
    source: 'https://www.nasa.gov/history/90-years-of-our-changing-views-of-earth/',
  },
  lunar_probe: {
    year: 1959,
    sides: { ussr: 1959, usa: 1964 },
    source: 'https://www.nasa.gov/history/60-years-ago-ranger-7-photographs-the-moon/',
  },
  space_station: {
    year: 1971,
    sides: { ussr: 1971, usa: 1973 },
    source: 'https://www.nasa.gov/missions/station/50-years-ago-launch-of-salyut-the-worlds-first-space-station/',
  },
  crewed_moon: {
    year: 1968,
    sides: { usa: 1968, ussr: null },
    source: 'https://www.nasa.gov/mission/apollo-8/',
  },
}, ['text']);
