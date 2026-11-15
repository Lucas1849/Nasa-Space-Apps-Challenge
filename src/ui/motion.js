// Animações que explicam o que mudou (15/11). Nenhuma regra de jogo mora aqui: só DOM do navegador.
// Princípios (skills game-feel e frontend-design):
//   - animar só o que responde a uma ação do jogador ou mostra uma mudança (verba, peão, voo);
//   - toda animação volta ao estado de repouso e nunca segura o clique (a tela já está certa por baixo);
//   - "reduzir movimento" do sistema desliga tudo (aqui e no CSS).
// Nada aqui roda na importação: os testes com DOM falso (test/dom-stub.mjs) importam as telas sem `window`.

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const STEP_MS = 150; // tempo de cada pulo do peão

// Peão andando casa a casa: um clone sai da casa de origem e pula até a casa final, onde o peão de
// verdade já está (escondido até o clone chegar). Devolve uma Promise que resolve no fim.
export function walkPawn({ playerId, from, steps, total }) {
  const target = document.querySelector(`.gb-pawn[data-pid="${playerId}"]`);
  if (!target || reducedMotion() || steps <= 0 || !target.animate) return Promise.resolve();
  const centerOf = (tileId) => {
    const r = document.querySelector(`[data-tile="${tileId}"]`)?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null;
  };
  const points = [];
  for (let i = 0; i <= steps; i += 1) points.push(centerOf((from + i) % total));
  if (points.some((pt) => !pt)) return Promise.resolve();

  const box = target.getBoundingClientRect();
  const ghost = target.cloneNode(true);
  Object.assign(ghost.style, {
    position: 'fixed', left: '0px', top: '0px', width: `${box.width}px`, height: `${box.height}px`,
    margin: '0', zIndex: '45', pointerEvents: 'none',
  });
  document.body.appendChild(ghost);
  target.style.visibility = 'hidden';

  // Cada casa vira dois quadros: o alto do pulo (no meio do caminho) e a aterrissagem.
  const at = (pt, lift = 0, sx = 1, sy = 1) =>
    `translate(${pt.x - box.width / 2}px, ${pt.y - box.height / 2 - lift}px) scale(${sx}, ${sy})`;
  const frames = [{ transform: at(points[0]) }];
  for (let i = 1; i < points.length; i += 1) {
    const mid = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 };
    frames.push({ transform: at(mid, 22, 0.92, 1.1) });
    frames.push({ transform: at(points[i], 0, i === points.length - 1 ? 1.15 : 1.05, i === points.length - 1 ? 0.85 : 0.95) });
  }
  frames.push({ transform: at(points[points.length - 1]) });

  const anim = ghost.animate(frames, { duration: STEP_MS * steps + 160, easing: 'ease-in-out' });
  const done = () => { ghost.remove(); target.style.visibility = ''; };
  return anim.finished.then(done, done);
}

// Traz um elemento para a tela só se ele estiver (parcialmente) fora dela.
export function scrollIntoViewIfNeeded(node) {
  if (!node || typeof window === 'undefined') return;
  const r = node.getBoundingClientRect();
  const dock = document.querySelector('.turn-dock, .launch-dock')?.getBoundingClientRect().height || 0;
  if (r.top >= 70 && r.bottom <= window.innerHeight - dock) return;
  node.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' });
}

// "+20" / "−8" saindo do número da verba (ou tecnologia) no topo, e o número dá um pulinho.
// `kind` escolhe a cor (funds, tech). Chamado por main.js depois de cada desenho, comparando valores.
export function floatDelta(statNode, delta, kind) {
  if (!statNode || !delta) return;
  const num = statNode.querySelector('.stat-num');
  statNode.classList.remove('bump-up', 'bump-down');
  // força o navegador a reiniciar a animação mesmo com duas mudanças seguidas
  void statNode.offsetWidth;
  statNode.classList.add(delta > 0 ? 'bump-up' : 'bump-down');
  if (reducedMotion()) return;
  const r = (num || statNode).getBoundingClientRect();
  const tag = document.createElement('span');
  tag.className = `float-delta ${kind} ${delta > 0 ? 'up' : 'down'}`;
  tag.textContent = `${delta > 0 ? '+' : '−'}${Math.abs(delta)}`;
  tag.style.left = `${r.left + r.width / 2}px`;
  tag.style.top = `${r.top}px`;
  document.body.appendChild(tag);
  tag.addEventListener('animationend', () => tag.remove());
  setTimeout(() => tag.remove(), 2000); // garantia se a animação não rodar
}

// Número contando do valor antigo até o novo (verba no topo), curto o bastante para não atrasar a leitura.
export function countUp(numNode, from, to, ms = 450) {
  if (!numNode || from === to || reducedMotion() || typeof requestAnimationFrame === 'undefined') return;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - (1 - t) ** 3;
    numNode.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
    else numNode.textContent = String(to); // sempre termina no valor real
  };
  requestAnimationFrame(tick);
}
