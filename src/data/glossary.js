// Glossário dos recursos do jogo, em linguagem simples (valor educacional pedido pelo desafio).
// Usado na tela inicial e no painel da oficina.

import { localizeList } from '../i18n/localize.js';

// Termo e texto em i18n (glossary.<id>.term/text). Aqui ficam só os ids, na ordem de exibição.
export const GLOSSARY = localizeList('glossary', [
  { id: 'mass' },
  { id: 'energy' },
  { id: 'data' },
  { id: 'comms' },
  { id: 'science' },
  { id: 'funds' },
  { id: 'lifetime' },
  { id: 'tech' },
  { id: 'risk' },
  { id: 'failure_data' },
], ['term', 'text']);
