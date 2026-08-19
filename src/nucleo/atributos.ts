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
 * Quantos jogadores entram numa partida, e quantos ficam em cada time.
 *
 * Oito e quatro nao sao numeros soltos: e deles que saem as 35 divisoes unicas
 * que o motor da etapa 06 vai percorrer inteiras. Quem precisar desses valores
 * le daqui, em vez de repetir o numero e deixar os dois divergirem.
 */
export const TAMANHO_DA_PARTIDA = 8;
export const TAMANHO_DO_TIME = 4;

/**
 * O meio da escala. E o valor com que a tela de avaliar abre, antes de a pessoa
 * mexer em qualquer estrela.
 *
 * O mesmo numero e o prior da media bayesiana do rating -- mas quem manda nesse
 * uso e a migracao `0007_rating.sql`, nao esta constante. Ver abaixo.
 */
export const NOTA_NEUTRA = 3;

// ---------------------------------------------------------------------------
// Onde ficam os pesos do rating
// ---------------------------------------------------------------------------
//
// Nao ficam aqui. Vivem em `supabase/migrations/0007_rating.sql`, junto com o
// prior, o peso do prior e o piso de confianca.
//
// Chegaram a morar neste arquivo, e a decisao foi revertida por duas razoes:
//
//   O rating precisa ser calculado no banco de qualquer forma, porque `avaliacoes`
//   so devolve as linhas de quem pergunta -- o app nao consegue somar voto alheio,
//   e nao deve conseguir.
//
//   Peso no cliente e peso forjavel. Bastaria mexer no proprio bundle para
//   inflar o proprio numero e, na etapa 07, para influenciar os times.
//
// Manter os valores nos dois lugares seria pior que escolher um: eles
// divergiriam em silencio, e o documento do projeto e explicito em nao espalhar
// esses numeros. O custo e que mudar um peso agora pede uma migracao -- em
// troca, a mudanca fica versionada.
