import type { Atributo } from '@/nucleo/atributos';

import { supabase } from './supabase';

/**
 * O rating de um jogador, ja calculado pelo banco.
 *
 * As oito medias vem na escala de estrelas (1 a 5); o `rating` vem de 0 a 10.
 * Nada aqui e calculado no aplicativo -- ver o cabecalho de
 * `supabase/migrations/0007_rating.sql` para o porque.
 */
export type Rating = Record<Atributo, number> & {
  jogador_id: string;
  rating: number;
  /** Quantas pessoas avaliaram. */
  avaliadores: number;
  /**
   * false enquanto o jogador nao tiver avaliadores suficientes. Quando e false,
   * as medias e o rating vem no valor neutro -- de proposito, para numero
   * nenhum na tela carregar informacao de voto individual.
   */
  confiavel: boolean;
};

export async function listarRatings(): Promise<Rating[]> {
  const { data, error } = await supabase.rpc('ratings_dos_jogadores');

  if (error) throw error;
  // Sem os tipos gerados do banco -- que precisariam do Supabase CLI -- o
  // postgrest-js nao sabe o formato de retorno de cada funcao e chuta objeto
  // unico para RPC. Esta devolve conjunto, entao a asercao e a forma honesta:
  // o contrato de verdade esta na migracao.
  return (data ?? []) as Rating[];
}

/** Um mapa por jogador, que e como as telas consomem. */
export async function mapaDeRatings(): Promise<Map<string, Rating>> {
  const lista = await listarRatings();
  return new Map(lista.map((r) => [r.jogador_id, r]));
}
