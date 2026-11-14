// Gera `dist/jogo.html`: o jogo inteiro num arquivo só, que abre com dois cliques (sem servidor).
// Por quê: o navegador bloqueia módulos ES abertos direto do disco (file://), e quem baixa o
// projeto e clica no index.html vê a tela em branco. Este arquivo serve para mandar o jogo para
// a equipe, para os juízes ou para jogar offline.
//
// Uso: npm run build   (Node, sem dependências)
//
// Como funciona: percorre os imports a partir de src/main.js, embrulha cada módulo numa função
// que devolve os seus exports e troca os imports por leituras desse registro. O CSS vai inline.
// Suporta só os formatos usados no projeto: `import { a, b as c } from './x.js'`,
// `import * as x from './x.js'` e `export function|const|let|class nome`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const entry = join(root, 'src', 'main.js');
const key = (abs) => relative(root, abs).split('\\').join('/');

const IMPORT_RE = /^import\s+([\s\S]*?)\s+from\s+'([^']+)';?[ \t]*$/gm;
const EXPORT_RE = /^export\s+(?:async\s+)?(function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

const modules = new Map(); // chave -> código transformado
const visiting = new Set();

function load(abs) {
  const id = key(abs);
  if (modules.has(id)) return;
  if (visiting.has(id)) throw new Error(`Import circular envolvendo ${id}`);
  visiting.add(id);
  let code = readFileSync(abs, 'utf8');

  const deps = [];
  code = code.replace(IMPORT_RE, (_, what, spec) => {
    const depAbs = resolve(dirname(abs), spec);
    deps.push(depAbs);
    const dep = JSON.stringify(key(depAbs));
    const star = what.match(/^\*\s+as\s+([\w$]+)$/);
    if (star) return `const ${star[1]} = __mods[${dep}];`;
    const named = what.match(/^\{([\s\S]*)\}$/);
    if (!named) throw new Error(`Import não suportado em ${id}: ${what}`);
    const list = named[1].split(',').map((s) => s.trim()).filter(Boolean)
      .map((s) => s.replace(/^([\w$]+)\s+as\s+([\w$]+)$/, '$1: $2'));
    return `const { ${list.join(', ')} } = __mods[${dep}];`;
  });
  if (/^\s*import\s/m.test(code)) throw new Error(`Import não reconhecido em ${id}`);

  const exported = [];
  code = code.replace(EXPORT_RE, (m, kind, name) => {
    exported.push(name);
    return m.replace(/^export\s+/, '');
  });
  if (/^export\s/m.test(code)) throw new Error(`Export não suportado em ${id}`);

  deps.forEach(load); // dependências entram antes
  visiting.delete(id);
  modules.set(id, `// ---- ${id}\n__mods[${JSON.stringify(id)}] = (() => {\n${code}\nreturn { ${exported.join(', ')} };\n})();`);
}

load(entry);

const css = readFileSync(join(root, 'src', 'styles', 'main.css'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const js = `(() => {\n'use strict';\nconst __mods = {};\n${[...modules.values()].join('\n\n')}\n})();`;

const out = html
  .replace(/<link rel="stylesheet" href="src\/styles\/main\.css">/, () => `<style>\n${css}\n</style>`)
  .replace(/<script type="module" src="src\/main\.js"><\/script>/, () => `<script>\n${js.replace(/<\/script/gi, '<\\/script')}\n</script>`);
if (/<script type="module"|<link rel="stylesheet" href="src\//.test(out)) throw new Error('index.html mudou: ajuste os padrões do build.');

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'jogo.html'), out);
console.log(`dist/jogo.html gerado: ${modules.size} módulos, ${(out.length / 1024).toFixed(0)} KB.`);
