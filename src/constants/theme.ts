/** Identidade visual: areia, mar e a bola. Volei de praia. */
export const Cores = {
  fundo: '#0E1B2A',
  fundoCartao: '#17293D',
  fundoCampo: '#0A1420',
  borda: '#24405C',
  texto: '#F2F6FA',
  textoFraco: '#8FA6BF',
  areia: '#E8C07D',
  areiaEscura: '#C79A4F',
  mar: '#2E8BC0',
  perigo: '#D9534F',
  sucesso: '#4CAF7D',
  /** O que aparece dos lados quando a janela e mais larga que a moldura. */
  foraDaMoldura: '#071726',
} as const;

export const Espaco = {
  um: 4,
  dois: 8,
  tres: 16,
  quatro: 24,
  cinco: 32,
  seis: 48,
} as const;

export const Raio = {
  pequeno: 8,
  medio: 12,
  grande: 16,
} as const;

/**
 * Ate onde o conteudo cresce na horizontal.
 *
 * 768 e a largura de tablet. Acima disso o aplicativo para de esticar e passa a
 * ficar centralizado, com o fundo aparecendo dos lados.
 *
 * A razao nao e estetica. As telas foram desenhadas para uma coluna so, com
 * texto e listas de largura confortavel; esticar isso num monitor de 1920
 * produziria linhas longas demais para ler e cartoes com metros de espaco vazio
 * entre a foto e o rating. Limitar e mais barato -- e mais honesto -- do que
 * fingir um layout de desktop que ainda nao existe.
 */
export const LARGURA_MAXIMA = 768;
