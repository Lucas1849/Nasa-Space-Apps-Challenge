# Space Mission Design Game — The Goats

Jogo 2D gratuito, no navegador, para o desafio **Space Mission Design Game** do NASA Space Apps
Challenge 2026. O jogador monta uma missão espacial com recursos limitados: cada peça rende ciência,
mas custa massa, energia, dinheiro e dados. Ganha quem cumprir a própria missão primeiro.

> Designing a Free 2D Space Mission Game that will work on browsers. Our idea is making space
> mission design accessible for any person that wants to have that experience.

## Jogar

```bash
git clone https://github.com/Lucas1849/Nasa-Space-Apps-Challenge.git
cd Nasa-Space-Apps-Challenge
npm start        # ou: python -m http.server 8000
# abrir http://localhost:8000
```

Não precisa instalar nada além de Python ou Node para servir os arquivos.

## Como funciona

1. **Tabuleiro** (estilo Banco Imobiliário): jogue o dado para conseguir verba.
2. **Oficina de engenharia** (o centro do jogo): compre instrumentos e peças, escolha lançador e
   órbita. O painel mostra em tempo real se o projeto fecha.
3. **Lançamento e relatório**: o jogo simula e **explica por que** deu certo ou errado.

1 a 4 jogadores no mesmo computador, cada um com uma missão da corrida espacial.

## Desenvolver

```bash
npm test         # testes das regras (Node ≥ 18, sem dependências)
```

- Conceito do jogo: [`IDEIA.md`](IDEIA.md)
- Arquitetura e como adicionar missões, peças e regras: [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md)
- Plano de tarefas e divisão por área: [`docs/TAREFAS.md`](docs/TAREFAS.md)
- Regras do evento e prazos: [`docs/regras-do-evento.md`](docs/regras-do-evento.md)
- Rascunho da submissão: [`SUBMISSION.md`](SUBMISSION.md)

Fluxo Git: `git pull` → branch `nome/assunto` → PR pequeno → revisão de outra pessoa → merge.
Nada direto na `main`.

## Aviso sobre os dados

Todos os números do jogo (massa, energia, custos, capacidades) são **fictícios**, criados para o
balanceamento, e não representam foguetes, instrumentos ou missões reais. As referências da NASA
usadas como base de design estão listadas em `SUBMISSION.md`.
