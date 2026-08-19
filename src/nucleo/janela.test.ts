import { describe, expect, it } from 'vitest';

import { estadoDaAvaliacao, type LimitesDaJanela } from './janela';

/**
 * Os cinco cenarios temporais do documento.
 *
 * Partida em 19/08/2026. A janela vai da virada para 20/08 ate a virada para
 * 21/08, no fuso da aplicacao -- America/Sao_Paulo, que em agosto e UTC-3.
 *
 * Os instantes abaixo estao em UTC de proposito: e assim que o banco devolve, e
 * testar na conversao e o unico jeito de pegar erro de fuso. 00:00 em Sao Paulo
 * e 03:00 em UTC.
 */
const PARTIDA: LimitesDaJanela & { jogada_em: string } = {
  jogada_em: '2026-08-19T23:00:00Z',
  avaliacao_abre_em: '2026-08-20T03:00:00Z', // 20/08 00:00 em Sao Paulo
  avaliacao_fecha_em: '2026-08-21T03:00:00Z', // 21/08 00:00 em Sao Paulo
};

/** Um instante do fuso da aplicacao, escrito como o brasileiro le. */
function emSaoPaulo(iso: string): Date {
  return new Date(`${iso}-03:00`);
}

describe('janela de avaliacao', () => {
  it('cenario 1: 19/08 as 23:59 -- ainda nao abriu', () => {
    expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo('2026-08-19T23:59:59'))).toBe('ainda-nao');
  });

  it('cenario 2: 20/08 as 00:00 -- abre exatamente na virada', () => {
    expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo('2026-08-20T00:00:00'))).toBe('aberta');
  });

  it('cenario 3: 20/08 as 15:00 -- aberta', () => {
    expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo('2026-08-20T15:00:00'))).toBe('aberta');
  });

  it('cenario 4: 20/08 as 23:59 -- ainda aberta', () => {
    expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo('2026-08-20T23:59:59'))).toBe('aberta');
  });

  it('cenario 5: 21/08 as 00:00 -- encerrada exatamente na virada', () => {
    expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo('2026-08-21T00:00:00'))).toBe('encerrada');
  });

  it('a janela nao depende do horario da partida', () => {
    // O documento e explicito: partida as 08:00 e partida as 22:30 do mesmo dia
    // tem a mesma janela. Nao sao "24h apos o jogo".
    const cedo = { ...PARTIDA, jogada_em: '2026-08-19T11:00:00Z' }; // 08:00 em SP
    const tarde = { ...PARTIDA, jogada_em: '2026-08-20T01:30:00Z' }; // 22:30 em SP

    const durante = emSaoPaulo('2026-08-20T12:00:00');
    expect(estadoDaAvaliacao(cedo, durante)).toBe('aberta');
    expect(estadoDaAvaliacao(tarde, durante)).toBe('aberta');
  });

  it('o dia da partida inteiro fica bloqueado', () => {
    for (const hora of ['00:00:00', '08:00:00', '20:00:00', '23:30:00']) {
      expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo(`2026-08-19T${hora}`))).toBe('ainda-nao');
    }
  });

  it('depois da janela segue encerrada, sem reabrir', () => {
    for (const dia of ['2026-08-21', '2026-08-25', '2026-12-31']) {
      expect(estadoDaAvaliacao(PARTIDA, emSaoPaulo(`${dia}T12:00:00`))).toBe('encerrada');
    }
  });
});
