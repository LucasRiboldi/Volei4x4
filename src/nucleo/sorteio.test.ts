import { describe, expect, it } from 'vitest';

import { gerarDivisoes, sortearTimes, type JogadorComRating } from './sorteio';

/** Oito jogadores com os ratings informados, com ids previsiveis. */
function time(...ratings: number[]): JogadorComRating[] {
  return ratings.map((rating, i) => ({ id: `j${i + 1}`, rating }));
}

describe('gerarDivisoes', () => {
  it('produz exatamente 35 divisoes', () => {
    // C(7,3) = 35. Sao 70 formas de escolher 4 entre 8, mas trocar time A por B
    // da a mesma partida -- por isso metade.
    expect(gerarDivisoes(time(1, 2, 3, 4, 5, 6, 7, 8))).toHaveLength(35);
  });

  it('nao repete divisao', () => {
    const divisoes = gerarDivisoes(time(1, 2, 3, 4, 5, 6, 7, 8));
    // Ordenar dentro do time mata a ordem; o par de times identifica a divisao.
    const chaves = divisoes.map((d) => [...d.timeA].sort().join(',') + '|' + [...d.timeB].sort().join(','));
    expect(new Set(chaves).size).toBe(35);
  });

  it('poe todo mundo em algum time, sem sobra nem repeticao', () => {
    for (const d of gerarDivisoes(time(1, 2, 3, 4, 5, 6, 7, 8))) {
      expect(d.timeA).toHaveLength(4);
      expect(d.timeB).toHaveLength(4);
      expect(new Set([...d.timeA, ...d.timeB]).size).toBe(8);
    }
  });

  it('recusa quantidade diferente de oito', () => {
    expect(() => gerarDivisoes(time(1, 2, 3, 4))).toThrow(/exatamente 8/);
    expect(() => gerarDivisoes(time(1, 2, 3, 4, 5, 6, 7, 8, 9))).toThrow(/exatamente 8/);
  });

  it('calcula forca e diferenca corretamente', () => {
    const d = gerarDivisoes(time(10, 1, 1, 1, 1, 1, 1, 1))[0];
    expect(d.forcaA + d.forcaB).toBeCloseTo(17, 5);
    expect(d.diferenca).toBeCloseTo(Math.abs(d.forcaA - d.forcaB), 5);
    expect(d.diferenca).toBeGreaterThanOrEqual(0);
  });
});

describe('sortearTimes', () => {
  // Caso 1 do documento: ratings muito diferentes, times ainda equilibrados.
  it('equilibra mesmo com ratings distantes', () => {
    const jogadores = time(10, 9.5, 9, 8.5, 3, 2.5, 2, 1.5);
    const somaTotal = 46;

    // Com sorte no pior caso possivel, ainda assim o recorte so contem as
    // melhores divisoes -- por isso o teste roda o modo mais rigoroso.
    for (const sorte of [0, 0.25, 0.5, 0.75, 0.999]) {
      const d = sortearTimes(jogadores, 'muito-equilibrado', () => sorte);
      expect(d.forcaA + d.forcaB).toBeCloseTo(somaTotal, 5);
      // A divisao perfeita aqui e 23 x 23; aceitamos folga pequena.
      expect(d.diferenca).toBeLessThanOrEqual(1);
    }
  });

  // Caso 2: ratings praticamente iguais, varias combinacoes igualmente validas.
  it('acha diferenca zero quando todos sao iguais', () => {
    const d = sortearTimes(time(5, 5, 5, 5, 5, 5, 5, 5), 'equilibrado', () => 0.5);
    expect(d.diferenca).toBe(0);
  });

  // Caso 5: sortear de novo pode dar times diferentes, mantendo o equilibrio.
  it('varia os times conforme a sorte, sem perder o equilibrio', () => {
    const jogadores = time(8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5);

    const vistos = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const d = sortearTimes(jogadores, 'mais-aleatorio', () => i / 20);
      vistos.add([...d.timeA].sort().join(','));
      // Mesmo no modo mais solto, o recorte impede escalacao absurda.
      expect(d.diferenca).toBeLessThanOrEqual(3);
    }

    expect(vistos.size).toBeGreaterThan(1);
  });

  it('o modo mais rigoroso nunca e pior que o mais solto', () => {
    const jogadores = time(9, 8, 7, 6, 5, 4, 3, 2);

    const rigoroso = Math.max(
      ...[0, 0.3, 0.6, 0.9].map((s) => sortearTimes(jogadores, 'muito-equilibrado', () => s).diferenca)
    );
    const solto = Math.max(
      ...[0, 0.3, 0.6, 0.9].map((s) => sortearTimes(jogadores, 'mais-aleatorio', () => s).diferenca)
    );

    expect(rigoroso).toBeLessThanOrEqual(solto);
  });

  it('sempre devolve dois times de quatro, com os oito jogadores', () => {
    const jogadores = time(6, 5, 9, 2, 7, 4, 8, 3);
    for (const sorte of [0, 0.5, 0.99]) {
      const d = sortearTimes(jogadores, 'equilibrado', () => sorte);
      expect(d.timeA).toHaveLength(4);
      expect(d.timeB).toHaveLength(4);
      expect(new Set([...d.timeA, ...d.timeB])).toEqual(
        new Set(jogadores.map((j) => j.id))
      );
    }
  });

  it('nao trava quando ha divisao com diferenca zero', () => {
    // Diferenca zero levaria o peso ao infinito sem o epsilon, e o sorteio
    // ficaria preso na primeira divisao empatada.
    const jogadores = time(1, 1, 1, 1, 1, 1, 1, 1);
    const d = sortearTimes(jogadores, 'equilibrado', () => 0.999);
    expect(d.diferenca).toBe(0);
    expect(d.timeA).toHaveLength(4);
  });
});
