import { vi } from 'vitest';

/**
 * Um duplo do cliente do Supabase, para os testes de `src/lib/`.
 *
 * Existe por duas razoes. `src/lib/` era a camada mais exposta do projeto sem
 * uma linha de verificacao, enquanto o nucleo puro tinha dezenove testes. E
 * importar `./supabase` de verdade num teste lanca no proprio import: o modulo
 * exige as variaveis de ambiente e cai antes de qualquer asercao.
 *
 * O QUE ELE IMITA e a forma do postgrest-js, e nao o comportamento do Postgres:
 * uma cadeia em que todo metodo devolve a propria cadeia, e o `await` no fim
 * entrega `{ data, error }`.
 *
 * O QUE ELE NAO PROVA, e nao deve fingir provar: RLS, policy, grant, tipo de
 * coluna. Essas garantias sao do banco e so se provam contra o banco, com
 * requisicao direta -- e e assim que estao verificadas, em `docs/estado.md`. Um
 * duplo que "passasse" numa policy daria uma confianca falsa, que e pior que
 * nenhuma.
 *
 * O que se prova aqui e o que o TypeScript faz com a resposta: o achatamento do
 * vinculo aninhado, a conversao de numero que chega como texto, e o que
 * acontece quando um campo falta.
 */

export type Resposta = { data: unknown; error: unknown };

type Cadeia = PromiseLike<Resposta> & Record<string, (...args: unknown[]) => Cadeia>;

/**
 * Uma cadeia nova por consulta -- nao reaproveitada de proposito, para a
 * resposta de uma tabela nao vazar na consulta seguinte.
 */
function cadeia(resposta: Resposta, registrar: (metodo: string, corpo: unknown) => void): Cadeia {
  const alvo: Record<string, unknown> = {
    then: (aceita: (r: Resposta) => unknown) => Promise.resolve(resposta).then(aceita),
  };

  const proxy: Cadeia = new Proxy(alvo, {
    get(obj, chave) {
      if (chave in obj) return obj[chave as string];
      // select, eq, order, limit, insert, upsert, returns, maybeSingle,
      // single: todos devolvem a propria cadeia, como no postgrest-js.
      return (...args: unknown[]) => {
        // O que foi ESCRITO importa para o teste: e onde se ve o nome que a
        // funcao escolheu, ou se um campo em branco virou null. Ler o corpo da
        // escrita e a unica forma de afirmar isso sem espiar a implementacao.
        if (chave === 'insert' || chave === 'update' || chave === 'upsert') {
          registrar(chave as string, args[0]);
        }
        return proxy;
      };
    },
  }) as Cadeia;

  return proxy;
}

export function criarDuplo(opcoes: {
  /** O usuario logado, ou null para simular sessao ausente. */
  usuario?: { id: string } | null;
  /** A resposta de cada tabela consultada, por nome. Vale para toda consulta. */
  tabelas?: Record<string, Resposta>;
  /**
   * Respostas em ordem, para quando o mesmo modulo consulta a mesma tabela mais
   * de uma vez e as respostas precisam diferir -- `garantirMeuPerfil()` procura
   * o perfil e, nao achando, insere. A ultima resposta vale para as chamadas
   * seguintes, para o teste nao precisar contar quantas vezes exatamente.
   */
  sequencias?: Record<string, Resposta[]>;
  /** A resposta de cada funcao chamada por `rpc`, por nome. */
  rpc?: Record<string, Resposta>;
}) {
  const { usuario = { id: 'eu' }, tabelas = {}, sequencias = {}, rpc = {} } = opcoes;
  const vazio: Resposta = { data: [], error: null };
  const consumidas: Record<string, number> = {};

  /** O que foi consultado, para o teste poder afirmar que foi na tabela certa. */
  const chamadas = { tabela: [] as string[], rpc: [] as string[] };

  /** O corpo de cada escrita, na ordem: `{ metodo, tabela, corpo }`. */
  const escritas: { metodo: string; tabela: string; corpo: unknown }[] = [];

  const supabase = {
    from: vi.fn((nome: string) => {
      chamadas.tabela.push(nome);

      const anotar = (metodo: string, corpo: unknown) =>
        escritas.push({ metodo, tabela: nome, corpo });

      const fila = sequencias[nome];
      if (fila && fila.length > 0) {
        const i = Math.min(consumidas[nome] ?? 0, fila.length - 1);
        consumidas[nome] = (consumidas[nome] ?? 0) + 1;
        return cadeia(fila[i], anotar);
      }

      return cadeia(tabelas[nome] ?? vazio, anotar);
    }),
    rpc: vi.fn((nome: string) => {
      chamadas.rpc.push(nome);
      return cadeia(rpc[nome] ?? vazio, (metodo, corpo) =>
        escritas.push({ metodo, tabela: nome, corpo })
      );
    }),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: usuario }, error: null })),
    },
  };

  return { supabase, chamadas, escritas };
}
