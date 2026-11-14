// Linha do tempo da corrida espacial. Cada rodada do jogo é um ano, de 1957 (Sputnik) a 1969 (Apollo 11).
// Os marcos reais abaixo foram conferidos nas páginas de história da NASA (links em `source`).
// Usamos só o ano: algumas páginas divergem no dia exato (fuso horário, data do lançamento × da chegada).

export const START_YEAR = 1957;
export const END_YEAR = 1969;
export const MAX_ROUNDS = END_YEAR - START_YEAR + 1; // 13 rodadas

export const yearOf = (round) => START_YEAR + round - 1;

// Cartão "Na história real", mostrado no relatório de sucesso e no fim da partida.
export const REAL_HISTORY = {
  first_satellite: {
    year: 1957,
    text: 'Sputnik 1 (URSS, 1957) foi o primeiro satélite artificial. Não levava instrumentos científicos, só um transmissor de rádio. Os EUA responderam com o Explorer 1 em 1958.',
    source: 'https://www.nasa.gov/history/65-years-ago-sputnik-ushers-in-the-space-age/',
  },
  living_being: {
    year: 1957,
    text: 'Sputnik 2 (URSS, 1957) levou a cadela Laika, o primeiro animal em órbita. A cápsula não tinha como voltar e ela não sobreviveu: suporte de vida e retorno eram problemas ainda sem solução.',
    source: 'https://www.nasa.gov/history/a-brief-history-of-animals-in-space/',
  },
  weather_watch: {
    year: 1966,
    text: 'TIROS-1 (EUA, 1960) foi o primeiro satélite meteorológico, em órbita baixa. Em 1966, o ATS-1 fez a primeira foto da Terra a partir da órbita geoestacionária.',
    source: 'https://www.nasa.gov/history/90-years-of-our-changing-views-of-earth/',
  },
  lunar_probe: {
    year: 1959,
    text: 'Luna 2 (URSS, 1959) foi a primeira espaçonave a atingir a Lua.',
    source: 'https://science.nasa.gov/moon/missions/',
  },
  crewed_moon: {
    year: 1968,
    text: 'Apollo 8 (EUA, 1968) levou a primeira tripulação à órbita da Lua e a trouxe de volta. O pouso veio com a Apollo 11, em 1969.',
    source: 'https://www.nasa.gov/mission/apollo-8/',
  },
};

export const EPILOGUE = 'Em 1975, a missão Apollo-Soyuz acoplou uma nave americana e uma soviética em órbita. A corrida virou cooperação.';
