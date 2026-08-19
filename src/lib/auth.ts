import type { Session } from '@supabase/supabase-js';

import { supabase } from './supabase';

/**
 * A camada de autenticacao.
 *
 * O resto do aplicativo fala com estas funcoes e nunca com o provedor. E isso
 * que permite acrescentar "Entrar com Google" depois mexendo so neste arquivo:
 * jogadores, avaliacoes, rating, partidas e sorteio nao sabem -- nem devem
 * saber -- como a pessoa entrou.
 *
 * A senha e responsabilidade do Supabase Auth, que guarda hash e nunca o texto
 * puro. Escrever hash na mao seria o ponto mais arriscado do projeto, e nao ha
 * o que ganhar com isso.
 */

export type DadosDoCadastro = {
  nome: string;
  email: string;
  senha: string;
};

export const SENHA_MINIMA = 8;

/** Cria a conta. O perfil de jogador nasce por gatilho, no banco. */
export async function criarConta({ nome, email, senha }: DadosDoCadastro): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(),
    password: senha,
    // O gatilho do banco le este metadado para preencher o nome do jogador.
    options: { data: { nome: nome.trim() } },
  });

  if (error) throw error;
  return data.session;
}

export async function entrarComEmail(email: string, senha: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password: senha,
  });

  if (error) throw error;
  return data.session;
}

export async function sair(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
