/**
 * A janela de avaliacao pos-partida.
 *
 * A regra: a avaliacao NAO abre 24h apos o jogo. Ela abre na virada para o dia
 * seguinte a data da partida, e fecha na virada seguinte. Partida as 08:00 e
 * partida as 22:30 do mesmo dia tem exatamente a mesma janela.
 *
 * Este modulo nao fala com rede nem le o relogio por conta propria: o instante
 * entra como argumento. E o que permite testar as viradas de dia sem depender
 * de esperar a meia-noite chegar.
 */

export type LimitesDaJanela = {
  avaliacao_abre_em: string;
  avaliacao_fecha_em: string;
};

export type EstadoDaAvaliacao = 'ainda-nao' | 'aberta' | 'encerrada';

/**
 * Em que ponto da vida a janela daquela partida esta.
 *
 * Serve a interface. Quem autoriza de verdade e o banco, que refaz esta mesma
 * comparacao antes de aceitar qualquer avaliacao -- relogio de aparelho
 * adiantado nao abre janela nenhuma.
 */
export function estadoDaAvaliacao(
  partida: LimitesDaJanela,
  agora: Date = new Date()
): EstadoDaAvaliacao {
  const abre = new Date(partida.avaliacao_abre_em);
  const fecha = new Date(partida.avaliacao_fecha_em);

  if (agora < abre) return 'ainda-nao';
  if (agora >= fecha) return 'encerrada';
  return 'aberta';
}
