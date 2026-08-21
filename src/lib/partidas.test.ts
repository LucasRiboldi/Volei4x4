import { beforeEach, describe, expect, it, vi } from 'vitest';

import { criarDuplo, type Resposta } from './duplo-do-supabase';

const estado = vi.hoisted(() => ({ resposta: null as unknown }));

vi.mock('./supabase', () => ({
  get supabase() {
    return (estado.resposta as { supabase: unknown }).supabase;
  },
}));

function preparar(opcoes: Parameters<typeof criarDuplo>[0]) {
  const duplo = criarDuplo(opcoes);
  estado.resposta = duplo;
  return duplo;
}

/** Uma linha como o PostgREST devolve: vinculo aninhado, numero como texto. */
function linhaDoBanco(sobrescreve: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    jogada_em: '2026-08-19T14:00:00+00:00',
    avaliacao_abre_em: '2026-08-20T03:00:00+00:00',
    avaliacao_fecha_em: '2026-08-21T03:00:00+00:00',
    placar_a: null,
    placar_b: null,
    partida_jogadores: [
      {
        jogador_id: 'j1',
        time_da_partida: 'A',
        // O PostgREST devolve `numeric` como STRING. Nao e detalhe: e por isso
        // que o mapeamento chama Number(), e sem isso a soma de forcas do
        // sorteio viraria concatenacao de texto.
        rating_no_momento: '7.25',
        jogadores: { nome: 'Joao', foto_url: 'http://f/j1.png' },
      },
      {
        jogador_id: 'j2',
        time_da_partida: 'B',
        rating_no_momento: '4.10',
        jogadores: { nome: 'Pedro', foto_url: null },
      },
    ],
    ...sobrescreve,
  };
}

const ok = (data: unknown): Resposta => ({ data, error: null });

describe('listarPartidas', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('achata o vinculo aninhado que o PostgREST devolve', async () => {
    preparar({ tabelas: { partidas: ok([linhaDoBanco()]) } });
    const { listarPartidas } = await import('./partidas');

    const [partida] = await listarPartidas();

    expect(partida.id).toBe('p1');
    expect(partida.jogadores).toHaveLength(2);
    expect(partida.jogadores[0]).toEqual({
      jogador_id: 'j1',
      time_da_partida: 'A',
      rating_no_momento: 7.25,
      nome: 'Joao',
      foto_url: 'http://f/j1.png',
    });
  });

  it('converte o rating de texto para numero', async () => {
    preparar({ tabelas: { partidas: ok([linhaDoBanco()]) } });
    const { listarPartidas } = await import('./partidas');

    const [partida] = await listarPartidas();
    const forca = partida.jogadores.reduce((t, j) => t + j.rating_no_momento, 0);

    // Se o Number() sumisse, isto daria a string '07.254.10'.
    expect(typeof partida.jogadores[0].rating_no_momento).toBe('number');
    expect(forca).toBeCloseTo(11.35, 5);
  });

  it('aguenta escalacao sem o jogador vinculado, em vez de quebrar a tela', async () => {
    // Acontece se a linha de `jogadores` sumir e a de `partida_jogadores` nao.
    const orfa = linhaDoBanco({
      partida_jogadores: [
        { jogador_id: 'j9', time_da_partida: 'A', rating_no_momento: '5', jogadores: null },
      ],
    });
    preparar({ tabelas: { partidas: ok([orfa]) } });
    const { listarPartidas } = await import('./partidas');

    const [partida] = await listarPartidas();

    expect(partida.jogadores[0].nome).toBe('Jogador');
    expect(partida.jogadores[0].foto_url).toBeNull();
  });

  it('devolve lista vazia quando nao ha partida, e nao null', async () => {
    preparar({ tabelas: { partidas: ok(null) } });
    const { listarPartidas } = await import('./partidas');

    await expect(listarPartidas()).resolves.toEqual([]);
  });

  it('propaga o erro do banco em vez de devolver lista vazia', async () => {
    // Devolver [] aqui seria pior que lançar: a tela diria "nenhuma partida"
    // quando o que houve foi uma falha de rede ou de permissao.
    preparar({ tabelas: { partidas: { data: null, error: { message: 'boom' } } } });
    const { listarPartidas } = await import('./partidas');

    await expect(listarPartidas()).rejects.toMatchObject({ message: 'boom' });
  });

  it('le da tabela `partidas`', async () => {
    const duplo = preparar({ tabelas: { partidas: ok([]) } });
    const { listarPartidas } = await import('./partidas');

    await listarPartidas();

    expect(duplo.chamadas.tabela).toEqual(['partidas']);
  });
});

describe('criarPartida', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('chama a funcao do banco, e nao escreve nas tabelas', async () => {
    // A escalacao nao entra por insert direto de proposito: `criar_partida()`
    // recusa time com tamanho errado, id repetido e jogador inexistente. Se um
    // dia isto virar insert, a validacao some junto.
    const duplo = preparar({ rpc: { criar_partida: ok('nova-id') } });
    const { criarPartida } = await import('./partidas');

    const id = await criarPartida(
      { timeA: ['a', 'b', 'c', 'd'], timeB: ['e', 'f', 'g', 'h'], forcaA: 1, forcaB: 1, diferenca: 0 },
      new Date('2026-08-19T14:00:00Z')
    );

    expect(id).toBe('nova-id');
    expect(duplo.chamadas.rpc).toEqual(['criar_partida']);
    expect(duplo.chamadas.tabela).toEqual([]);
  });
});
