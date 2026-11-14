// Peças da espaçonave que NÃO são instrumentos: energia, comunicação, suporte de vida, propulsão.
// ATENÇÃO: valores FICTÍCIOS, em unidades arbitrárias do jogo, só para balanceamento.
// Regra do IDEIA.md: nenhum item é só bônus. Cada peça gera algo e custa massa/energia/dinheiro.
//
// powerGen      = energia gerada; power = energia consumida
// commsRate     = capacidade de transmitir dados por turno
// lifeSupport   = habilita missões com ser vivo a bordo
// lifetimeBonus = anos a mais de vida útil (manutenção de órbita, reserva de energia)
// minTech       = nível de tecnologia da agência para poder comprar (IDEIA.md seção 5)
// visual        = como aparece no desenho da espaçonave (ui/spacecraft.js)

export const PARTS = {
  solar_small: { id: 'solar_small', name: 'Painel solar pequeno', mass: 4, power: 0, powerGen: 15, cost: 8, commsRate: 0, dataRate: 0, science: 0, lifeSupport: false, lifetimeBonus: 0, minTech: 1, visual: 'panel' },
  solar_large: { id: 'solar_large', name: 'Painel solar grande', mass: 10, power: 0, powerGen: 40, cost: 20, commsRate: 0, dataRate: 0, science: 0, lifeSupport: false, lifetimeBonus: 0, minTech: 2, visual: 'panel_large' },
  battery: { id: 'battery', name: 'Bateria', mass: 6, power: 0, powerGen: 8, cost: 10, commsRate: 0, dataRate: 0, science: 0, lifeSupport: false, lifetimeBonus: 1, minTech: 1, visual: 'battery' },
  antenna_basic: { id: 'antenna_basic', name: 'Antena básica', mass: 2, power: 3, powerGen: 0, cost: 6, commsRate: 4, dataRate: 0, science: 0, lifeSupport: false, lifetimeBonus: 0, minTech: 1, visual: 'antenna' },
  antenna_dish: { id: 'antenna_dish', name: 'Antena parabólica', mass: 8, power: 10, powerGen: 0, cost: 22, commsRate: 12, dataRate: 0, science: 0, lifeSupport: false, lifetimeBonus: 0, minTech: 3, visual: 'dish' },
  thruster: { id: 'thruster', name: 'Propulsor de manutenção de órbita', mass: 6, power: 4, powerGen: 0, cost: 14, commsRate: 0, dataRate: 0, science: 0, lifeSupport: false, lifetimeBonus: 3, minTech: 2, visual: 'thruster' },
  life_support: { id: 'life_support', name: 'Cápsula com suporte de vida', mass: 25, power: 15, powerGen: 0, cost: 40, commsRate: 0, dataRate: 1, science: 2, lifeSupport: true, lifetimeBonus: 0, minTech: 2, visual: 'capsule' },
};
