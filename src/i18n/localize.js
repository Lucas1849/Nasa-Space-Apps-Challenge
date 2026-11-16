// Liga os dados (data/*.js) ao i18n sem mudar os call sites: define getters nos campos de texto
// que resolvem t('<ns>.<id>.<campo>') no idioma atual. Assim MISSIONS[id].name continua funcionando
// e troca de idioma junto com o resto da tela. O texto em si mora em i18n/pt.js e en.js.
import { t } from './index.js';

function defineText(obj, field, key) {
  Object.defineProperty(obj, field, { enumerable: true, configurable: true, get() { return t(key); } });
}

// Mapa { id: obj }: define getters em `fields` para cada item, chaveando por ${ns}.${id}.${field}.
export function localize(ns, map, fields = ['name']) {
  for (const [id, obj] of Object.entries(map)) {
    for (const f of fields) defineText(obj, f, `${ns}.${id}.${f}`);
  }
  return map;
}

// Lista [{ id, ... }]: igual a localize, mas para arrays (ex.: dilemas).
export function localizeList(ns, list, fields = ['name'], idOf = (o) => o.id) {
  for (const obj of list) {
    const id = idOf(obj);
    for (const f of fields) defineText(obj, f, `${ns}.${id}.${f}`);
  }
  return list;
}

// Opções aninhadas ({ options: [{ label, lesson }] }) de eventos e dilemas, chaveadas por índice.
export function localizeOptions(ns, items, fields = ['label', 'lesson'], idOf = (o) => o.id) {
  for (const item of items) {
    const id = idOf(item);
    (item.options || []).forEach((o, i) => {
      for (const f of fields) defineText(o, f, `${ns}.${id}.opt.${i}.${f}`);
    });
  }
  return items;
}
