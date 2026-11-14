// Lados da Guerra Fria e escadas de missões (IDEIA.md v3 seção 2). A win con é completar a escada do
// próprio lado: cada degrau é uma nave nova; tecnologia, prédios, verba e bônus persistem.
// Agências são do jogador; o lado só define a escada, uma vantagem pequena e uma fraqueza pequena.
// ATENÇÃO: vantagens e fraquezas FICTÍCIAS, para balanceamento. Sem bandeiras nem marcas.
//
// launcherTech = ajuste no nível de tecnologia exigido pelos lançadores (−1 = foguetes fortes cedo).
// A ordem e o degrau final da URSS estão "a definir" na v3; aqui o final é a Lua para os dois lados
// (a corrida à Lua). Mudar a escada é só trocar a lista.

export const SIDES = {
  usa: {
    id: 'usa',
    name: 'EUA',
    icon: '🦅',
    ladder: ['first_satellite', 'living_being', 'lunar_probe', 'crewed_moon'],
    focus: 'Foguete pesado e suporte de vida',
    advantage: 'Mais verba: +20 no início e +5 por ano.',
    weakness: 'Foguetes grandes chegam mais tarde: lançadores exigem +1 de tecnologia.',
    startFunds: 20,
    yearlyBonus: 5,
    launcherTech: 1,
  },
  ussr: {
    id: 'ussr',
    name: 'URSS',
    icon: '⭐',
    ladder: ['first_satellite', 'living_being', 'space_station', 'crewed_moon'],
    focus: 'Vida no espaço e energia contínua',
    advantage: 'Foguetes fortes cedo: lançadores exigem −1 de tecnologia.',
    weakness: 'Orçamento mais apertado: −5 de verba por ano.',
    startFunds: 0,
    yearlyBonus: -5,
    launcherTech: -1,
  },
};

export const STEP_BONUS_FIRST = 20; // primeiro do lado a cumprir o degrau
export const STEP_BONUS_LATER = 8;  // quem cumpre depois, no mesmo lado, leva menos

export const ladderOf = (player) => SIDES[player.side]?.ladder || [];

// Lados sorteados de forma equilibrada: 1 jogador = um lado (o bot fica com o outro);
// 2 = lados diferentes; 3 ou 4 = 2 contra 1 ou 2 contra 2.
export function drawSides(n, rng = Math.random) {
  const first = rng() < 0.5 ? 'usa' : 'ussr';
  const other = first === 'usa' ? 'ussr' : 'usa';
  const sides = Array.from({ length: n }, (_, i) => (i % 2 === 0 ? first : other));
  for (let i = sides.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [sides[i], sides[j]] = [sides[j], sides[i]];
  }
  return sides;
}
