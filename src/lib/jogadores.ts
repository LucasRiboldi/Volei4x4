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
 * O perfil de quem esta logado, ou null se a linha ainda nao existe.
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

/**
 * O perfil de quem esta logado, criando a linha se ela faltar.
 *
 * A via normal e o gatilho `ao_criar_usuario` do banco, que insere o jogador
 * junto com a conta. Mas ele mora em `auth.users`, e instalar gatilho ali
 * depende de um privilegio que nem todo projeto do Supabase concede. Sem esta
 * rede, um projeto onde o gatilho nao entrou deixaria a pessoa logada e sem
 * perfil -- conta que existe, jogador que nao.
 *
 * Inserir aqui e seguro porque a policy `jogadores_cria_o_proprio` amarra a
 * linha ao dono: ninguem cria perfil para terceiro, mesmo chamando a API na
 * mao.
 */
export async function garantirMeuPerfil(): Promise<Jogador> {
  const existente = await buscarMeuPerfil();
  if (existente) return existente;

  const { data: sessao } = await supabase.auth.getUser();
  const usuario = sessao.user;
  if (!usuario) throw new Error('Você precisa estar logado.');

  // A mesma ordem de preferencia do gatilho, para o nome sair igual pelos dois
  // caminhos.
  const metadados = usuario.user_metadata ?? {};
  const nome =
    [metadados.nome, metadados.full_name, metadados.name]
      .map((v) => (typeof v === 'string' ? v.trim() : ''))
      .find((v) => v !== '') ??
    usuario.email?.split('@')[0] ??
    'Jogador';

  const { data, error } = await supabase
    .from('jogadores')
    .insert({ id: usuario.id, nome: nome.slice(0, NOME_MAXIMO) })
    .select(COLUNAS)
    .single<Jogador>();

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
