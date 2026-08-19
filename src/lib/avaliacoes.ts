import { ATRIBUTOS, type Atributo } from '@/nucleo/atributos';

import { supabase } from './supabase';

/** As oito notas de uma avaliacao. */
export type Notas = Record<Atributo, number>;

/** Uma nota que voce deu a alguem. */
export type MinhaAvaliacao = Notas & {
  avaliado_id: string;
};

const COLUNAS_DE_NOTA = ATRIBUTOS.join(', ');

/**
 * Todas as avaliacoes que VOCE deu.
 *
 * Nao ha filtro por avaliador aqui, e e proposital: a policy de select em
 * `avaliacoes` ja e "so as minhas", entao pedir todas devolve exatamente as
 * minhas. Repetir o filtro no cliente sugeriria que o sigilo depende de o
 * aplicativo estar correto, quando ele e do banco.
 */
export async function listarMinhasAvaliacoes(): Promise<MinhaAvaliacao[]> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select(`avaliado_id, ${COLUNAS_DE_NOTA}`)
    .returns<MinhaAvaliacao[]>();

  if (error) throw error;
  return data ?? [];
}

/** A nota que voce deu a uma pessoa, ou null se ainda nao avaliou. */
export async function buscarMinhaAvaliacaoDe(jogadorId: string): Promise<Notas | null> {
  const { data, error } = await supabase
    .from('avaliacoes')
    .select(COLUNAS_DE_NOTA)
    .eq('avaliado_id', jogadorId)
    .maybeSingle<Notas>();

  if (error) throw error;
  return data;
}

/**
 * Grava ou corrige a sua avaliacao de alguem.
 *
 * `upsert` porque a chave e o par (avaliador, avaliado): a primeira vez insere,
 * as seguintes corrigem. Avaliar de novo nao empilha voto.
 */
export async function salvarAvaliacao(jogadorId: string, notas: Notas): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const eu = sessao.user?.id;
  if (!eu) throw new Error('Você precisa estar logado.');

  // O banco ja recusa pelo check e pela policy, mas errar aqui daria a mensagem
  // crua do Postgres na tela.
  if (eu === jogadorId) throw new Error('Você não pode avaliar a si mesmo.');

  const { error } = await supabase
    .from('avaliacoes')
    .upsert(
      { avaliador_id: eu, avaliado_id: jogadorId, ...notas },
      { onConflict: 'avaliador_id,avaliado_id' }
    );

  if (error) throw error;
}
