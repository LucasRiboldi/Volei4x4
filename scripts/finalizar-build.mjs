/**
 * Acrescenta ao `dist/index.html` o que o Expo nao coloca sozinho.
 *
 * Por que isto existe, e nao um `+html.tsx`:
 *
 *   O `app/+html.tsx` do Expo Router so e usado quando a web e exportada em
 *   modo `static`. Este projeto exporta em `single` -- SPA --, porque o app
 *   inteiro fica atras de login e nao ha o que pre-renderizar. Nesse modo o
 *   Expo monta o HTML a partir de um template proprio e ignora o `+html.tsx`.
 *   Cheguei a escrever um, e ele nao teve efeito nenhum: o head saiu com o
 *   viewport padrao, e nao com o meu.
 *
 * O que precisa estar no HTML e nao pode esperar o JavaScript:
 *
 *   - o manifest, sem o qual nao ha "adicionar a tela inicial";
 *   - o icone do iOS, que ignora o manifest;
 *   - `viewport-fit=cover`, para o conteudo alcancar as bordas em tela com
 *     entalhe;
 *   - a cor de fundo, senao ha um lampejo branco antes de o app montar;
 *   - o idioma, que o leitor de tela usa para escolher a pronuncia.
 *
 * Roda depois do `expo export`. Idempotente: se as marcas ja estiverem la, sai
 * sem mexer.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ARQUIVO = 'dist/index.html';
const MARCA = 'volei4x4-finalizado';

if (!existsSync(ARQUIVO)) {
  console.error(`Nao encontrei ${ARQUIVO}. Rode o export antes.`);
  process.exit(1);
}

let html = readFileSync(ARQUIVO, 'utf8');

if (html.includes(MARCA)) {
  console.log('index.html ja finalizado; nada a fazer.');
  process.exit(0);
}

const acrescimo = `
    <!-- ${MARCA} -->
    <link rel="manifest" href="/manifest.json" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Vôlei 4x4" />
    <meta name="description" content="Times equilibrados para o vôlei de areia do seu grupo." />
    <style>
      /* Evita o lampejo branco entre o HTML chegar e o app montar. */
      html, body, #root { background-color: #FDF7EE; }
      body { overscroll-behavior-y: none; }
      /* Quem pediu menos movimento no sistema recebe menos movimento aqui. */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      }
    </style>
  </head>`;

const antes = html;

html = html.replace('</head>', acrescimo);
// O padrao do Expo bloqueia o zoom por `shrink-to-fit`; trocamos por um que
// alcanca as bordas sem impedir a pessoa de ampliar o texto.
html = html.replace(
  'content="width=device-width, initial-scale=1, shrink-to-fit=no"',
  'content="width=device-width, initial-scale=1, viewport-fit=cover"'
);
html = html.replace('<html lang="en">', '<html lang="pt-BR">');

if (html === antes) {
  console.error('Nada foi substituido -- o template do Expo mudou. Confira o script.');
  process.exit(1);
}

writeFileSync(ARQUIVO, html, 'utf8');

// Confere o que realmente ficou no arquivo, em vez de confiar no replace.
const conferir = readFileSync(ARQUIVO, 'utf8');
const exigido = [
  ['manifest', 'rel="manifest"'],
  ['icone do iOS', 'apple-touch-icon'],
  ['viewport com viewport-fit', 'viewport-fit=cover'],
  ['idioma pt-BR', '<html lang="pt-BR">'],
];

let faltou = false;
for (const [nome, trecho] of exigido) {
  const ok = conferir.includes(trecho);
  console.log(`  ${ok ? 'ok   ' : 'FALTA'} ${nome}`);
  if (!ok) faltou = true;
}

if (faltou) process.exit(1);
console.log('index.html finalizado.');
