import { beforeEach, describe, expect, it, vi } from 'vitest';

import { criarDuplo, type Resposta } from './duplo-do-supabase';

const estado = vi.hoisted(() => ({ duplo: null as unknown }));

vi.mock('./supabase', () => ({
  get supabase() {
    return (estado.duplo as { supabase: unknown }).supabase;
  },
}));

function preparar(opcoes: Parameters<typeof criarDuplo>[0]) {
  const duplo = criarDuplo(opcoes);
  estado.duplo = duplo;
  return duplo;
}

const ok = (data: unknown): Resposta => ({ data, error: null });

const AGORA = new Date('2026-08-20T15:00:00Z');

/**
 * Uma partida com a janela posicionada em relacao a AGORA.
 *
 * `quem` sao os participantes. A ordem importa pouco; quem esta na lista jogou.
 */
function partida(id: string, janela: 'aberta' | 'ainda-nao' | 'encerrada', quem: string[]) {
  const dia = 24 * 60 * 60 * 1000;
  const marcos = {
    aberta: [-dia / 2, +dia / 2],
    'ainda-nao': [+dia, +2 * dia],
    encerrada: [-2 * dia, -dia],
  }[janela];

  return {
    id,
    jogada_em: new Date(AGORA.getTime() - dia).toISOString(),
    avaliacao_abre_em: new Date(AGORA.getTime() + marcos[0]).toISOString(),
    avaliacao_fecha_em: new Date(AGORA.getTime() + marcos[1]).toISOString(),
    placar_a: null,
    placar_b: null,
    partida_jogadores: quem.map((j, i) => ({
      jogador_id: j,
      time_da_partida: i < quem.length / 2 ? 'A' : 'B',
      rating_no_momento: '5',
      jogadores: { nome: j.toUpperCase(), foto_url: null },
    })),
  };
}

describe('minhasPartidasParaAvaliar', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('so devolve partida com a janela ABERTA', async () => {
    preparar({
      usuario: { id: 'eu' },
      tabelas: {
        partidas: ok([
          partida('aberta', 'aberta', ['eu', 'a']),
          partida('amanha', 'ainda-nao', ['eu', 'b']),
          partida('velha', 'encerrada', ['eu', 'c']),
        ]),
        avaliacoes_de_partida: ok([]),
      },
    });
    const { minhasPartidasParaAvaliar } = await import('./avaliacoes-de-partida');

    const lista = await minhasPartidasParaAvaliar(AGORA);

    expect(lista.map((p) => p.partida.id)).toEqual(['aberta']);
  });

  it('ignora partida aberta de que eu nao participei', async () => {
    preparar({
      usuario: { id: 'eu' },
      tabelas: {
        partidas: ok([
          partida('minha', 'aberta', ['eu', 'a']),
          partida('dos-outros', 'aberta', ['b', 'c']),
        ]),
        avaliacoes_de_partida: ok([]),
      },
    });
    const { minhasPartidasParaAvaliar } = await import('./avaliacoes-de-partida');

    const lista = await minhasPartidasParaAvaliar(AGORA);

    expect(lista.map((p) => p.partida.id)).toEqual(['minha']);
  });

  it('nao me poe na lista de quem eu tenho que avaliar', async () => {
    // Ninguem se autoavalia -- o banco recusa com um check, e a tela nao pode
    // oferecer uma acao que vai ser recusada.
    preparar({
      usuario: { id: 'eu' },
      tabelas: {
        partidas: ok([partida('p', 'aberta', ['eu', 'a', 'b', 'c'])]),
        avaliacoes_de_partida: ok([]),
      },
    });
    const { minhasPartidasParaAvaliar } = await import('./avaliacoes-de-partida');

    const [item] = await minhasPartidasParaAvaliar(AGORA);

    expect(item.aAvaliar.map((j) => j.jogador_id)).toEqual(['a', 'b', 'c']);
    expect(item.pendentes).toBe(3);
  });

  it('marca quem eu ja avaliei e conta so o que falta', async () => {
    preparar({
      usuario: { id: 'eu' },
      tabelas: {
        partidas: ok([partida('p', 'aberta', ['eu', 'a', 'b', 'c'])]),
        avaliacoes_de_partida: ok([
          { avaliado_id: 'a', ataque: 4, defesa: 4, passe: 4, saque: 4, bloqueio: 4, agilidade: 4, leitura: 4, equipe: 4 },
        ]),
      },
    });
    const { minhasPartidasParaAvaliar } = await import('./avaliacoes-de-partida');

    const [item] = await minhasPartidasParaAvaliar(AGORA);

    expect(item.aAvaliar.find((j) => j.jogador_id === 'a')?.jaAvaliei).toBe(true);
    expect(item.aAvaliar.find((j) => j.jogador_id === 'b')?.jaAvaliei).toBe(false);
    expect(item.pendentes).toBe(2);
  });

  it('exige sessao, e diz isso em portugues', async () => {
    preparar({ usuario: null, tabelas: { partidas: ok([]) } });
    const { minhasPartidasParaAvaliar } = await import('./avaliacoes-de-partida');

    await expect(minhasPartidasParaAvaliar(AGORA)).rejects.toThrow('Você precisa estar logado.');
  });

  it('a virada da janela e exata: no instante em que fecha, ja fechou', async () => {
    const p = partida('p', 'aberta', ['eu', 'a']);
    const fecha = new Date(p.avaliacao_fecha_em);
    preparar({
      usuario: { id: 'eu' },
      tabelas: { partidas: ok([p]), avaliacoes_de_partida: ok([]) },
    });
    const { minhasPartidasParaAvaliar } = await import('./avaliacoes-de-partida');

    const umPoucoAntes = new Date(fecha.getTime() - 1);
    expect(await minhasPartidasParaAvaliar(umPoucoAntes)).toHaveLength(1);
    // No instante exato ja esta fechada: a comparacao e `agora >= fecha`.
    expect(await minhasPartidasParaAvaliar(fecha)).toHaveLength(0);
  });
});

describe('minhasNotasNaPartida', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('separa o avaliado das oito notas', async () => {
    preparar({
      tabelas: {
        avaliacoes_de_partida: ok([
          { avaliado_id: 'a', ataque: 5, defesa: 4, passe: 3, saque: 2, bloqueio: 1, agilidade: 3, leitura: 4, equipe: 5 },
        ]),
      },
    });
    const { minhasNotasNaPartida } = await import('./avaliacoes-de-partida');

    const mapa = await minhasNotasNaPartida('p1');

    expect(mapa.get('a')).toEqual({
      ataque: 5, defesa: 4, passe: 3, saque: 2, bloqueio: 1, agilidade: 3, leitura: 4, equipe: 5,
    });
    // `avaliado_id` era a chave, e nao pode continuar entre as notas.
    expect(mapa.get('a')).not.toHaveProperty('avaliado_id');
  });
});
