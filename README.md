# Space Mission Design Game — The Goats

Jogo 2D gratuito, no navegador, para o desafio **Space Mission Design Game** do NASA Space Apps
Challenge 2026. O jogador monta uma missão espacial com recursos limitados: cada peça rende ciência,
mas custa massa, energia, dinheiro e dados. Vence a agência que completar primeiro a escada de
missões do seu lado na corrida espacial (1957–1969).

> Designing a Free 2D Space Mission Game that will work on browsers. Our idea is making space
> mission design accessible for any person that wants to have that experience.

## Jogar

**Jeito mais fácil (sem instalar nada):** baixe o arquivo [`dist/jogo.html`](dist/jogo.html)
(botão "Download raw file" no GitHub) e abra com dois cliques. É o jogo inteiro num arquivo só.

> Abrir o `index.html` com dois cliques **não funciona** (tela em branco): o navegador bloqueia
> módulos JavaScript abertos direto do disco. Use o `dist/jogo.html` ou um servidor:

```bash
git clone https://github.com/Lucas1849/Nasa-Space-Apps-Challenge.git
cd Nasa-Space-Apps-Challenge
npm start        # ou: python -m http.server 8000
# abrir http://localhost:8000
```

## Como funciona

1. **Lados e escadas:** cada agência é sorteada para EUA ou URSS e precisa cumprir 4 missões em
   sequência. No solo, o rival é um bot que segue as datas reais da corrida espacial.
2. **Tabuleiro:** role 2 dados e escolha um. Cartas de dilema, prédios, espionagem.
3. **Oficina de engenharia** (o centro do jogo): monte a nave do degrau atual. O painel mostra os
   limites e o risco do voo antes de lançar.
4. **Voo em etapas e relatório:** uma etapa por turno, com imprevistos; o relatório **explica por
   que** deu certo ou errado e compara com a história real.

1 a 4 agências no mesmo computador, com tela de troca para esconder o estado de cada uma.

## Desenvolver

```bash
npm test         # testes das regras (Node ≥ 18, sem dependências)
npm run build    # gera dist/jogo.html (rodar e commitar depois de mudar src/)
```

- Conceito do jogo: [`IDEIA.md`](IDEIA.md)
- Arquitetura e como adicionar missões, peças e regras: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- Plano de tarefas e divisão por área: [`docs/TAREFAS.md`](docs/TAREFAS.md)
- Regras do evento e prazos: [`docs/regras-do-evento.md`](docs/regras-do-evento.md)
- Rascunho da submissão: [`SUBMISSION.md`](SUBMISSION.md)

Fluxo Git: `git pull` → branch `nome/assunto` → PR pequeno → merge. Nada direto na `main`.

## Aviso sobre os dados

Todos os números do jogo (massa, energia, custos, capacidades) são **fictícios**, criados para o
balanceamento, e não representam foguetes, instrumentos ou missões reais. As referências da NASA
usadas como base de design estão listadas em `SUBMISSION.md`.
