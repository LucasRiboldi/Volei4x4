import { describe, expect, it } from 'vitest';

import { temaClaro, temaEscuro, type Tema } from './tokens';

/**
 * Contraste dos pares de cor, medido.
 *
 * O brief pede WCAG 2.2 AA. Isso nao e algo que se afirme olhando: e uma conta.
 * Este teste faz a conta, entao um token trocado por engano quebra a suite em
 * vez de chegar na tela de alguem que enxerga mal.
 *
 * AA pede 4.5:1 para texto normal e 3:1 para texto grande e para elementos de
 * interface -- borda de campo, indicador de foco, icone que carrega significado.
 */

function luminancia(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const canais = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * canais[0] + 0.7152 * canais[1] + 0.0722 * canais[2];
}

function razao(frente: string, fundo: string): number {
  const a = luminancia(frente);
  const b = luminancia(fundo);
  const [alto, baixo] = a > b ? [a, b] : [b, a];
  return (alto + 0.05) / (baixo + 0.05);
}

/** Os pares que a interface realmente usa. */
function paresDeTexto(t: Tema): [string, string, string][] {
  return [
    ['texto sobre fundo', t.texto, t.fundo],
    ['texto sobre superficie', t.texto, t.superficie],
    ['texto sobre superficieAfundada', t.texto, t.superficieAfundada],
    ['textoSecundario sobre superficie', t.textoSecundario, t.superficie],
    ['textoFraco sobre superficie', t.textoFraco, t.superficie],
    ['textoFraco sobre fundo', t.textoFraco, t.fundo],
    ['sobrePrimaria sobre primaria', t.sobrePrimaria, t.primaria],
    ['sobrePrimaria sobre primariaHover', t.sobrePrimaria, t.primariaHover],
    ['sobreSecundaria sobre secundaria', t.sobreSecundaria, t.secundaria],
    ['sobreAcento sobre acento', t.sobreAcento, t.acento],
    ['erro sobre superficie', t.erro, t.superficie],
    ['erro sobre erroFundo', t.erro, t.erroFundo],
    ['sucesso sobre superficie', t.sucesso, t.superficie],
    ['sucesso sobre sucessoFundo', t.sucesso, t.sucessoFundo],
    ['atencao sobre atencaoFundo', t.atencao, t.atencaoFundo],
    ['info sobre infoFundo', t.info, t.infoFundo],
  ];
}

/** Elementos de interface: 3:1 basta, pela AA. */
function paresDeInterface(t: Tema): [string, string, string][] {
  return [
    ['bordaForte sobre superficie', t.bordaForte, t.superficie],
    ['foco sobre fundo', t.foco, t.fundo],
    ['foco sobre superficie', t.foco, t.superficie],
    ['primaria sobre superficie', t.primaria, t.superficie],
  ];
}

describe.each([
  ['tema claro', temaClaro],
  ['tema escuro', temaEscuro],
])('%s', (_nome, tema) => {
  it.each(paresDeTexto(tema))('texto AA (4.5:1) — %s', (_rotulo, frente, fundo) => {
    expect(razao(frente, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(paresDeInterface(tema))('interface AA (3:1) — %s', (_rotulo, frente, fundo) => {
    expect(razao(frente, fundo)).toBeGreaterThanOrEqual(3);
  });

  it('atencao e erro nao dependem so da cor para se distinguirem', () => {
    // Nao e teste de contraste, e de daltonismo: os dois estados precisam ter
    // luminancia distinta o bastante para nao virarem o mesmo cinza. Quem so
    // enxerga a cor tem tambem icone e texto, garantidos nos componentes.
    const distancia = Math.abs(luminancia(tema.erro) - luminancia(tema.atencao));
    expect(distancia).toBeGreaterThan(0.02);
  });
});
