// DOM mínimo para testar as telas sem navegador: monta a árvore de elementos que ui/components.js
// cria com document.createElement e deixa procurar texto, botões e classes. Não é um arquivo de teste
// (o npm test só roda *.test.mjs); os testes de interface fazem `import './dom-stub.mjs'` antes de
// importar qualquer módulo de src/ui.

export class Node {
  constructor(tag) { this.tag = tag; this.children = []; this.attrs = {}; this.className = ''; this.text = ''; this.disabled = false; this.innerHTML = ''; }
  appendChild(c) { this.children.push(c); return c; }
  addEventListener() {}
  setAttribute(k, v) { this.attrs[k] = v; }
  get textContent() { return this.text + this.children.map((c) => c.textContent).join(' '); }
  set textContent(v) { this.text = v; this.children = []; }
}

globalThis.document = {
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  createTextNode: (s) => { const n = new Node('#text'); n.text = s; return n; },
};

// Ações de mentira: qualquer chamada vira um nada (só a renderização interessa).
export const noActions = new Proxy({}, { get: () => () => {} });

export function walk(node, visit) {
  visit(node);
  node.children.forEach((c) => walk(c, visit));
}

// Textos de todos os elementos com a `className` dada (procura por palavra da classe).
export function textsOf(root, className) {
  const out = [];
  const re = new RegExp(`(^|\\s)${className}(\\s|$)`);
  walk(root, (n) => { if (re.test(n.className)) out.push(n.textContent.replace(/\s+/g, ' ').trim()); });
  return out;
}
