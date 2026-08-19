import { estadoDaAvaliacao } from '@/nucleo/janela';
import { ATRIBUTOS, type Atributo } from '@/nucleo/atributos';

import { supabase } from './supabase';
import { listarPartidas, type EscalacaoDaPartida } from './partidas';

export type Notas = Record<Atributo, number>;

const COLUNAS_DE_NOTA = ATRIBUTOS.join(', ');

/** Uma partida sua, com o que falta avaliar nela. */
export type PartidaParaAvaliar = {
  partida: EscalacaoDaPartida;
  /** Os outros participantes -- voce nao entra. */
  aAvaliar: { jogador_id: string; nome: string; foto_url: string | null; jaAvaliei: boolean }[];
  pendentes: number;
};

/** As notas que eu dei numa partida, por avaliado. */
export async function minhasNotasNaPartida(partidaId: string): Promise<Map<string, Notas>> {
  const { data, error } = await supabase
    .from('avaliacoes_de_partida')
    .select(`avaliado_id, ${COLUNAS_DE_NOTA}`)
    .eq('partida_id', partidaId);

  if (error) throw error;

  const mapa = new Map<string, Notas>();
  for (const linha of (data ?? []) as any[]) {
    const { avaliado_id, ...notas } = linha;
    mapa.set(avaliado_id, notas as Notas);
  }
  return mapa;
}

/**
 * Grava ou corrige a avaliacao de alguem numa partida.
 *
 * As quatro condicoes do documento -- participacao dos dois, pessoas
 * diferentes, janela aberta -- sao verificadas pela policy do banco, nao aqui.
 * Esta funcao so monta a requisicao; se algo estiver errado, o banco recusa.
 */
export async function avaliarNaPartida(
  partidaId: string,
  jogadorId: string,
  notas: Notas
): Promise<void> {
  const { data: sessao } = await supabase.auth.getUser();
  const eu = sessao.user?.id;
  if (!eu) throw new Error('Você precisa estar logado.');

  const { error } = await supabase
    .from('avaliacoes_de_partida')
    .upsert(
      { partida_id: partidaId, avaliador_id: eu, avaliado_id: jogadorId, ...notas },
      { onConflict: 'partida_id,avaliador_id,avaliado_id' }
    );

  if (error) throw error;
}

/**
 * As partidas com avaliacao aberta das quais eu participei, e o que falta em
 * cada uma.
 *
 * Filtra pelo estado da janela no aparelho apenas para montar a tela. Quem
 * autoriza e o banco -- relogio adiantado nao abre janela nenhuma.
 */
export async function minhasPartidasParaAvaliar(
  agora: Date = new Date()
): Promise<PartidaParaAvaliar[]> {
  const { data: sessao } = await supabase.auth.getUser();
  const eu = sessao.user?.id;
  if (!eu) throw new Error('Você precisa estar logado.');

  const partidas = await listarPartidas(50);
  const abertas = partidas.filter(
    (p) =>
      estadoDaAvaliacao(p, agora) === 'aberta' &&
      p.jogadores.some((j) => j.jogador_id === eu)
  );

  const resultado: PartidaParaAvaliar[] = [];
  for (const partida of abertas) {
    const minhas = await minhasNotasNaPartida(partida.id);
    const aAvaliar = partida.jogadores
      .filter((j) => j.jogador_id !== eu)
      .map((j) => ({
        jogador_id: j.jogador_id,
        nome: j.nome,
        foto_url: j.foto_url,
        jaAvaliei: minhas.has(j.jogador_id),
      }));

    resultado.push({
      partida,
      aAvaliar,
      pendentes: aAvaliar.filter((j) => !j.jaAvaliei).length,
    });
  }

  return resultado;
}
