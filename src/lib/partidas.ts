import { estadoDaAvaliacao, type EstadoDaAvaliacao } from '@/nucleo/janela';
import type { Divisao } from '@/nucleo/sorteio';

import { supabase } from './supabase';

// A regra da janela e pura e vive em `src/nucleo/janela.ts`, sem conhecer rede.
// Reexportada aqui para as telas importarem de um lugar so.
export { estadoDaAvaliacao, type EstadoDaAvaliacao };

export type Partida = {
  id: string;
  jogada_em: string;
  avaliacao_abre_em: string;
  avaliacao_fecha_em: string;
  placar_a: number | null;
  placar_b: number | null;
};

export type EscalacaoDaPartida = Partida & {
  jogadores: {
    jogador_id: string;
    time_da_partida: 'A' | 'B';
    rating_no_momento: number;
    nome: string;
    foto_url: string | null;
  }[];
};

/** Registra a partida com os times sorteados. Devolve o id criado. */
export async function criarPartida(divisao: Divisao, jogadaEm: Date = new Date()): Promise<string> {
  const { data, error } = await supabase.rpc('criar_partida', {
    p_jogada_em: jogadaEm.toISOString(),
    p_time_a: divisao.timeA,
    p_time_b: divisao.timeB,
  });

  if (error) throw error;
  return data as string;
}

/** As partidas mais recentes, com a escalacao de cada uma. */
export async function listarPartidas(limite = 20): Promise<EscalacaoDaPartida[]> {
  const { data, error } = await supabase
    .from('partidas')
    .select(
      `id, jogada_em, avaliacao_abre_em, avaliacao_fecha_em, placar_a, placar_b,
       partida_jogadores ( jogador_id, time_da_partida, rating_no_momento,
                           jogadores ( nome, foto_url ) )`
    )
    .order('jogada_em', { ascending: false })
    .limit(limite);

  if (error) throw error;

  // O PostgREST devolve o vinculo aninhado; a tela quer uma lista simples.
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    jogada_em: p.jogada_em,
    avaliacao_abre_em: p.avaliacao_abre_em,
    avaliacao_fecha_em: p.avaliacao_fecha_em,
    placar_a: p.placar_a,
    placar_b: p.placar_b,
    jogadores: (p.partida_jogadores ?? []).map((pj: any) => ({
      jogador_id: pj.jogador_id,
      time_da_partida: pj.time_da_partida,
      rating_no_momento: Number(pj.rating_no_momento),
      nome: pj.jogadores?.nome ?? 'Jogador',
      foto_url: pj.jogadores?.foto_url ?? null,
    })),
  }));
}

export async function salvarPlacar(
  partidaId: string,
  placarA: number,
  placarB: number
): Promise<void> {
  const { error } = await supabase
    .from('partidas')
    .update({ placar_a: placarA, placar_b: placarB })
    .eq('id', partidaId);

  if (error) throw error;
}
