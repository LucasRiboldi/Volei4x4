import { ATRIBUTOS, type Atributo } from '@/nucleo/atributos';

import { supabase } from './supabase';

export type Notas = Record<Atributo, number>;

const COLUNAS_DE_NOTA = ATRIBUTOS.join(', ');

/**
 * A avaliacao inicial: uma por par, sem depender de partida.
 *
 * Existe para o grupo conseguir arrancar. Sem ela, ninguem tem rating ate
 * jogar, e o sorteio da primeira partida sai no acaso.
 *
 * Depois dessa, aquele par so volta a se avaliar apos uma partida que os dois
 * jogaram. Quem garante o "uma vez" e a chave primaria da tabela, e nao uma
 * checagem aqui: nao ha como inserir a segunda, nem chamando a API na mao.
 */

/** De quem VOCE ja fez a avaliacao inicial. */
export async function meusAvaliadosInicialmente(): Promise<Set<string>> {
  const { data, error } = await supabase.from('avaliacoes_iniciais').select('avaliado_id');

  if (error) throw error;
  return new Set((data ?? []).map((linha: { avaliado_id: string }) => linha.avaliado_id));
}

/** A nota que voce deu na inicial, ou null. Serve para a tela abrir preenchida. */
export async function minhaAvaliacaoInicialDe(jogadorId: string): Promise<Notas | null> {
  const { data, error } = await supabase
    .from('avaliacoes_iniciais')
    .select(COLUNAS_DE_NOTA)
    .eq('avaliado_id', jogadorId)
    .maybeSingle<Notas>();

  if (error) throw error;
  return data;
}

/**
 * Grava a avaliacao inicial.
 *
 * Sem `upsert`: a tabela nao tem policy de update, entao tentar sobrescrever
 * seria recusado. A segunda chamada para o mesmo par falha na chave primaria,
 * e isso e o comportamento desejado -- e o que faz "uma vez" ser uma vez.
 */
export async function avaliarInicialmente(jogadorId: string, notas: Notas): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const eu = sessao.user?.id;
  if (!eu) throw new Error('Você precisa estar logado.');

  if (eu === jogadorId) throw new Error('Você não pode avaliar a si mesmo.');

  const { error } = await supabase
    .from('avaliacoes_iniciais')
    .insert({ avaliador_id: eu, avaliado_id: jogadorId, ...notas });

  if (error) throw error;
}
