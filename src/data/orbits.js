// Órbitas. ATENÇÃO: valores qualitativos simplificados para o jogo.
// commsPenalty = quanto a distância reduz a capacidade de comunicação (0 = nada, 0.5 = metade).
// baseLifetime = anos de vida útil sem manutenção (órbita baixa decai pelo atrito da atmosfera).
// Trade-off: órbita mais distante rende mais ciência em certas missões, mas comunica pior.
// Nome e descrição em i18n (orbit.<id>.name/description).
import { localize } from '../i18n/localize.js';

export const ORBITS = {
  leo: { id: 'leo', commsPenalty: 0, scienceBonus: 0, baseLifetime: 2 },
  geo: { id: 'geo', commsPenalty: 0.2, scienceBonus: 1, baseLifetime: 8 },
  moon: { id: 'moon', commsPenalty: 0.5, scienceBonus: 3, baseLifetime: 4 },
};
localize('orbit', ORBITS, ['name', 'description']);
