// Configuracao do eslint, em formato flat -- o unico que o eslint 9 aceita.
//
// ---------------------------------------------------------------------------
// Por que existe, se o projeto passou meses sem lint
// ---------------------------------------------------------------------------
//
// A decisao registrada era "sem script de lint", e o motivo estava certo: o
// `expo lint` do template nao traz eslint como dependencia e, ao rodar, grava
// as deps no `package.json` sem tocar no lockfile -- o que quebra o `npm ci`, e
// `npm ci` e o que a Vercel roda. A propria decisao ja dizia a saida: "se
// adotarmos eslint, sera com lockfile no commit". E o que este commit faz.
//
// O que faltava sem ele: a unica analise estatica era o `tsc`, e o `tsc` deixa
// passar coisa como `?? 0` num valor que deveria ser o meio da escala -- foi um
// achado de auditoria, nao de ferramenta.

const expo = require('eslint-config-expo/flat');

module.exports = [
  ...expo,
  {
    ignores: ['dist/*', '.expo/*', 'node_modules/*', 'scripts/avatares/*'],
  },
  {
    // Escopado a TypeScript de proposito: o plugin `@typescript-eslint` so esta
    // registrado nos blocos de TS do eslint-config-expo. Um objeto sem `files`
    // vale para tudo, inclusive para os `.js` de configuracao, e ali o plugin
    // nao existe -- o eslint recusa a config inteira nesse caso.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Variavel nao usada e erro, com uma saida: o prefixo `_` marca "sei que
      // nao uso, e e de proposito" -- o caso dos parametros posicionais que o
      // React Native passa e a gente ignora.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    rules: {
      // Promessa solta e o defeito mais caro deste projeto: um `signOut()` sem
      // `await` deixa a pessoa logada achando que saiu, e a rejeicao morre sem
      // dono. O codigo ja usa `void` de proposito onde nao da para esperar.
      'no-void': 'off',

      // `console.log` esquecido vai para o bundle. `warn` e `error` ficam --
      // `mensagemDeErro` usa `console.warn` em desenvolvimento, de proposito.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Os scripts existem para falar com quem os roda: `finalizar-build.mjs`
    // imprime o que conferiu, e e essa saida que diz se o build saiu completo.
    // Aviso que nunca se pretende consertar vira ruido, e ruido treina a gente
    // a ignorar a ferramenta.
    files: ['scripts/**'],
    rules: { 'no-console': 'off' },
  },
];
