import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

/**
 * Configuracao do vitest.
 *
 * Ate agora nao existia: os testes viviam em `src/nucleo/` e em `src/design/`,
 * que importam por caminho relativo e nao dependem de nada do ambiente. Passou
 * a ser necessaria quando `src/lib/` entrou na suite, por duas razoes.
 *
 * O ALIAS `@/`. Os modulos de `lib` importam `@/nucleo/...`, que o TypeScript
 * resolve pelo `paths` do tsconfig e o vitest, sozinho, nao. Sem isto o teste
 * quebra no import, e nao na asercao.
 *
 * O `__DEV__`. E uma global que o React Native injeta no bundle e que o Node
 * nao tem. `mensagemDeErro` a consulta para decidir se joga a mensagem crua no
 * console -- e um `ReferenceError` ali derrubaria o teste por um motivo que nao
 * tem nada a ver com o que se quer verificar.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  define: {
    __DEV__: 'false',
  },
});
