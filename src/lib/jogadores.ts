import { ATRIBUTOS, type Atributo } from '@/nucleo/atributos';

import { supabase } from './supabase';

export type Jogador = {
  id: string;
  nome: string;
  apelido: string | null;
  cidade: string | null;
  foto_url: string | null;
};

/** As oito notas, no formato em que vao e voltam do banco. */
export type Notas = Record<Atributo, number>;

const COLUNAS = 'id, nome, apelido, cidade, foto_url';
const COLUNAS_DE_NOTA = ATRIBUTOS.join(', ');

export const NOME_MINIMO = 2;
export const NOME_MAXIMO = 60;
export const APELIDO_MAXIMO = 30;
export const CIDADE_MAXIMA = 60;

/**
 * O perfil de quem esta logado.
 *
 * Devolve null so se o gatilho de cadastro nao tiver rodado -- o que seria um
 * defeito, nao um estado normal. Quem chama decide como reagir.
 */
export async function buscarMeuPerfil(): Promise<Jogador | null> {
  const { data: sessao } = await supabase.auth.getUser();
  const id = sessao.user?.id;
  if (!id) throw new Error('Você precisa estar logado.');

  const { data, error } = await supabase
    .from('jogadores')
    .select(COLUNAS)
    .eq('id', id)
    .maybeSingle<Jogador>();

  if (error) throw error;
  return data;
}

export async function salvarPerfil(entrada: {
  nome: string;
  apelido: string;
  cidade: string;
}): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const id = sessao.user?.id;
  if (!id) throw new Error('Você precisa estar logado.');

  // Campo opcional em branco vira null, e nao string vazia: o banco fica com um
  // valor so para "nao informado", em vez de dois que significam a mesma coisa.
  const { error } = await supabase
    .from('jogadores')
    .update({
      nome: entrada.nome.trim(),
      apelido: entrada.apelido.trim() || null,
      cidade: entrada.cidade.trim() || null,
    })
    .eq('id', id);

  if (error) throw error;
}

/** Null quando a pessoa ainda nao se autoavaliou. */
export async function buscarMinhaAutoavaliacao(): Promise<Notas | null> {
  const { data: sessao } = await supabase.auth.getUser();
  const id = sessao.user?.id;
  if (!id) throw new Error('Você precisa estar logado.');

  const { data, error } = await supabase
    .from('autoavaliacoes')
    .select(COLUNAS_DE_NOTA)
    .eq('jogador_id', id)
    .maybeSingle<Notas>();

  if (error) throw error;
  return data;
}

export async function salvarAutoavaliacao(notas: Notas): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const id = sessao.user?.id;
  if (!id) throw new Error('Você precisa estar logado.');

  // upsert porque a autoavaliacao e uma linha so por jogador, que a pessoa
  // revisita: a primeira vez insere, as seguintes corrigem.
  const { error } = await supabase
    .from('autoavaliacoes')
    .upsert({ jogador_id: id, ...notas }, { onConflict: 'jogador_id' });

  if (error) throw error;
}
