// Animação da virada de ano: um calendário no meio da tela passa o ano e mostra o que a agência ganhou
// (verba, tecnologia, peça liberada pela pesquisa). Some sozinha e um clique pula (main.js).
// Os ganhos são secretos de cada agência: só aparece no tabuleiro, nunca na tela de troca (yearOverlayKey).
// Só monta DOM a partir de state.yearChange (sim/actions.js, startTurn); nenhuma regra de jogo mora aqui.
import { el } from './components.js';
import { icon } from './icons.js';

// Tempos da animação, devagar o bastante para ler (o calendário vira primeiro e os ganhos entram um a um).
// Se mudar a duração total, ajuste também o `yearFadeOut` do `.year-overlay` em styles/main.css
// (o atraso dele = YEAR_OVERLAY_MS menos o tempo de sumir).
export const YEAR_OVERLAY_MS = 6000;         // some sozinho depois disso (um clique pula antes)
export const YEAR_OVERLAY_REDUCED_MS = 4500; // movimento reduzido: sem animação, só o tempo de leitura
const GAIN_START_S = 1.9;                    // 1º ganho entra depois de o calendário virar
const GAIN_STEP_S = 0.45;                    // intervalo entre um ganho e o seguinte

// Chave que identifica uma virada ainda não mostrada, ou null se não deve aparecer agora.
// `shownKey` é a última chave já animada (guardada em main.js).
export function yearOverlayKey(state, shownKey = null) {
  const yc = state.yearChange;
  if (!yc || state.sandbox || state.gameOver || state.screen !== 'board') return null;
  const current = state.players[state.turn];
  if (!current || current.bot || current.id !== yc.playerId) return null;
  const key = `${yc.round}:${yc.playerId}`;
  return key === shownKey ? null : key;
}

// Origem de cada ganho, para o balão explicar de onde vem o recurso.
function fundsOrigin(yc) {
  const { base, side, sponsor } = yc.parts;
  return [`Orçamento do ano ${base}`, side ? `bônus do lado ${side > 0 ? '+' : ''}${side}` : null, sponsor ? `Patrocinador +${sponsor}` : null]
    .filter(Boolean).join(' · ');
}
function techOrigin(yc) {
  const { base, lab } = yc.techParts;
  return [`Pesquisa do ano ${base}`, lab ? `Laboratório +${lab}` : null].filter(Boolean).join(' · ');
}

// `reduced`: movimento reduzido (sem o ano antigo saindo), só o ano novo e os ganhos.
export function yearOverlayNode(yc, { reduced = false } = {}) {
  const first = yc.round === 1; // abertura da partida: não há ano anterior para sair
  const calendar = el('div', { class: 'year-calendar', 'aria-hidden': 'true' }, [
    el('div', { class: 'cal-top' }, [icon('calendar', { size: 16 }), 'ANO']),
    el('div', { class: 'cal-digits' }, [
      !first && !reduced ? el('span', { class: 'year-old' }, String(yc.year - 1)) : null,
      el('span', { class: 'year-new' }, String(yc.year)),
    ]),
  ]);

  const gains = [
    { cls: 'funds', ic: 'coins', label: 'Verba', value: yc.funds, title: fundsOrigin(yc) },
    { cls: 'tech', ic: 'chip', label: 'Tecnologia', value: yc.tech, title: techOrigin(yc) },
  ].filter((g) => g.value !== 0).map((g, i) => el('span', { class: `gain ${g.cls} ${g.value > 0 ? 'up' : 'down'}`, title: g.title, style: `animation-delay:${GAIN_START_S + i * GAIN_STEP_S}s` }, [
    icon(g.ic, { size: 18 }), `${g.label} `, el('strong', { class: 'num' }, `${g.value > 0 ? '+' : ''}${g.value}`),
  ]));
  if (yc.part) {
    gains.push(el('span', { class: 'gain part', title: 'A pesquisa do ano liberou uma peça nova na oficina.', style: `animation-delay:${GAIN_START_S + gains.length * GAIN_STEP_S}s` }, [
      icon('flask', { size: 18 }), 'Peça liberada ', el('strong', {}, yc.part),
    ]));
  }

  return el('div', { class: 'year-overlay', role: 'status', 'aria-live': 'polite', title: 'Clique para pular' }, [
    el('div', { class: 'year-card' }, [
      el('p', { class: 'eyebrow' }, first ? 'Começa a corrida espacial' : 'Ano novo'),
      calendar,
      el('p', { class: 'hint' }, `Nível de tecnologia ${yc.techLevel}`),
      el('div', { class: 'gains' }, gains),
      el('small', { class: 'hint year-skip' }, 'Clique para continuar'),
    ]),
  ]);
}
