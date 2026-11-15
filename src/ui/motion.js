// Animações que explicam o que mudou (15/11). Nenhuma regra de jogo mora aqui: só DOM do navegador.
// Princípios (skills game-feel e frontend-design):
//   - animar só o que responde a uma ação do jogador ou mostra uma mudança (verba, peão, voo);
//   - toda animação volta ao estado de repouso e nunca segura o clique (a tela já está certa por baixo);
//   - "reduzir movimento" do sistema desliga tudo (aqui e no CSS).
// Nada aqui roda na importação: os testes com DOM falso (test/dom-stub.mjs) importam as telas sem `window`.

export const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const STEP_MS = 340; // tempo de cada casa do peão (mais lento para dar para acompanhar o foguete)

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
  ghost.classList.add('pawn-ghost'); // a chama acende enquanto o foguete anda (CSS .pawn-ghost .rk-flame)
  Object.assign(ghost.style, {
    position: 'fixed', left: '0px', top: '0px', width: `${box.width}px`, height: `${box.height}px`,
    margin: '0', zIndex: '45', pointerEvents: 'none',
  });
  document.body.appendChild(ghost);
  target.style.visibility = 'hidden';

  // O foguete aponta para onde vai: o desenho aponta para cima, então soma 90° ao ângulo do trecho.
  const angle = (a, b) => (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
  const at = (pt, rot, lift = 0) =>
    `translate(${pt.x - box.width / 2}px, ${pt.y - box.height / 2 - lift}px) rotate(${rot}deg)`;
  const frames = [{ transform: at(points[0], angle(points[0], points[1])), offset: 0 }];
  for (let i = 1; i < points.length; i += 1) {
    const rot = angle(points[i - 1], points[i]);
    const mid = { x: (points[i - 1].x + points[i].x) / 2, y: (points[i - 1].y + points[i].y) / 2 };
    frames.push({ transform: at(mid, rot, 6), offset: (i - 0.5) / steps });
    frames.push({ transform: at(points[i], rot), offset: i / steps });
  }
  const last = points[points.length - 1];
  frames.push({ transform: at(last, 0) }); // pousa de pé

  // Rastro de fumaça em pixel atrás do foguete enquanto ele anda.
  const smoke = setInterval(() => {
    const r = ghost.getBoundingClientRect();
    puff(r.left + r.width / 2, r.top + r.height / 2, 1, 'smoke-puff');
  }, 60);
  const anim = ghost.animate(frames, { duration: STEP_MS * steps + 260, easing: 'ease-in-out' });
  const done = () => {
    clearInterval(smoke);
    ghost.remove();
    target.style.visibility = '';
    puff(last.x, last.y + box.height / 2 - 4, 7, 'land-puff'); // poeira do pouso
    const tile = document.querySelector(`[data-tile="${(from + steps) % total}"]`);
    if (tile) { tile.classList.add('tile-landed'); setTimeout(() => tile.classList.remove('tile-landed'), 700); }
  };
  return anim.finished.then(done, done);
}

// Partículas de pixel (fumaça, poeira, faíscas) num ponto da tela; somem sozinhas.
export function puff(x, y, count, cls) {
  if (reducedMotion() || typeof document === 'undefined') return;
  for (let i = 0; i < count; i += 1) {
    const p = document.createElement('span');
    p.className = `px-particle ${cls}`;
    p.style.left = `${x + (Math.random() - 0.5) * 8}px`;
    p.style.top = `${y + (Math.random() - 0.5) * 8}px`;
    p.style.setProperty('--dx', `${(Math.random() - 0.5) * (cls === 'land-puff' ? 46 : 14)}px`);
    p.style.setProperty('--dy', `${cls === 'land-puff' ? -6 - Math.random() * 10 : 4 + Math.random() * 10}px`);
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 900);
  }
}

// Moedinhas voando da casa onde o jogador parou até a verba no topo (ganho de verba).
export function flyCoins(fromNode, toNode, count = 5) {
  if (!fromNode || !toNode || reducedMotion() || !document.body.animate) return;
  const a = fromNode.getBoundingClientRect(), b = toNode.getBoundingClientRect();
  const sx = a.left + a.width / 2, sy = a.top + a.height / 2, ex = b.left + 22, ey = b.top + b.height / 2;
  for (let i = 0; i < count; i += 1) {
    const c = document.createElement('span');
    c.className = 'px-coin';
    document.body.appendChild(c);
    const lift = 60 + Math.random() * 50;
    c.animate([
      { transform: `translate(${sx}px, ${sy}px) scale(.6)`, opacity: 0 },
      { transform: `translate(${(sx + ex) / 2 + (Math.random() - 0.5) * 40}px, ${Math.min(sy, ey) - lift}px) scale(1.1)`, opacity: 1, offset: 0.5 },
      { transform: `translate(${ex}px, ${ey}px) scale(.7)`, opacity: 0.9 },
    ], { duration: 700 + i * 90, delay: i * 70, easing: 'cubic-bezier(.3,.7,.4,1)', fill: 'both' }).finished.then(() => c.remove(), () => c.remove());
  }
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
