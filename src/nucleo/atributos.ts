/**
 * Os atributos de jogo, a escala das notas e o peso de cada um no rating.
 *
 * Este arquivo e a unica fonte desses numeros. O documento do projeto pede
 * pesos configuraveis e proibe espalha-los pelo codigo -- experimentar outro
 * modelo de rating deve ser mexer aqui, e em nenhum outro lugar.
 */

export const ATRIBUTOS = [
  'ataque',
  'defesa',
  'passe',
  'saque',
  'bloqueio',
  'agilidade',
  'leitura',
  'equipe',
] as const;

export type Atributo = (typeof ATRIBUTOS)[number];

/** O que aparece na tela para cada atributo. */
export const ROTULO: Record<Atributo, string> = {
  ataque: 'Ataque',
  defesa: 'Defesa',
  passe: 'Passe',
  saque: 'Saque',
  bloqueio: 'Bloqueio',
  agilidade: 'Agilidade',
  leitura: 'Leitura de jogo',
  equipe: 'Trabalho em equipe',
};

/** A nota que a pessoa da, em estrelas. */
export const NOTA_MINIMA = 1;
export const NOTA_MAXIMA = 5;

/**
 * Peso de cada atributo no rating final. Somam 1.
 *
 * Os valores sao a sugestao inicial do documento. Mudar aqui muda o rating de
 * todo mundo na proxima leitura -- o rating nao e gravado, e sempre calculado.
 */
export const PESOS: Record<Atributo, number> = {
  ataque: 0.2,
  defesa: 0.2,
  passe: 0.15,
  saque: 0.1,
  bloqueio: 0.1,
  agilidade: 0.1,
  leitura: 0.1,
  equipe: 0.05,
};

/**
 * Prior da media bayesiana: o meio da escala de estrelas.
 *
 * Uma nota so nao pode mandar no rating. Enquanto ha poucos votos o valor fica
 * puxado para o meio, e vai soltando conforme a amostra cresce. E o que da
 * resistencia a avaliacao injusta sem precisar de estatistica complicada.
 */
export const PRIOR = 3;

/** Quanto o prior vale, em votos equivalentes. */
export const PESO_DO_PRIOR = 5;

/** A partir de quantos avaliadores o rating passa a ser considerado firme. */
export const PISO_DE_CONFIANCA = 5;

// Verificacao de sanidade: peso que nao soma 1 desloca a escala do rating
// inteiro sem avisar. Barato conferir no import.
const soma = Object.values(PESOS).reduce((a, b) => a + b, 0);
if (Math.abs(soma - 1) > 1e-9) {
  throw new Error(`Os pesos dos atributos precisam somar 1, mas somam ${soma}.`);
}
