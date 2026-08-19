import { TAMANHO_DA_PARTIDA, TAMANHO_DO_TIME } from './atributos';

/**
 * O motor de balanceamento.
 *
 * Nao importa React, nao fala com rede e nao le relogio: recebe jogadores com
 * rating, devolve dois times. E o que permite testa-lo sozinho, com entrada
 * escolhida a dedo, sem subir aplicativo nem banco.
 */

export type JogadorComRating = {
  id: string;
  rating: number;
};

export type Divisao = {
  timeA: string[];
  timeB: string[];
  forcaA: number;
  forcaB: number;
  /** Sempre positiva. E o que se quer minimizar. */
  diferenca: number;
};

export type ModoDeEquilibrio = 'muito-equilibrado' | 'equilibrado' | 'mais-aleatorio';

/**
 * Quantas das melhores divisoes entram no sorteio.
 *
 * O modo nao escolhe a melhor divisao sempre -- isso daria os mesmos times toda
 * semana. Ele decide o tamanho do bolo de onde se sorteia: quanto maior, mais
 * variedade e menos equilibrio.
 */
const RECORTE: Record<ModoDeEquilibrio, number> = {
  'muito-equilibrado': 3,
  equilibrado: 8,
  'mais-aleatorio': 20,
};

/** Fonte de aleatoriedade, injetavel para o teste poder ser deterministico. */
export type Aleatorio = () => number;

/**
 * Todas as divisoes possiveis de 8 jogadores em dois times de 4.
 *
 * Sao exatamente 35, e nao 70: trocar o time A pelo B da a mesma partida. A
 * simetria morre fixando o primeiro jogador sempre no time A -- sobra escolher
 * 3 companheiros entre os 7 restantes, e C(7,3) = 35.
 */
export function gerarDivisoes(jogadores: JogadorComRating[]): Divisao[] {
  if (jogadores.length !== TAMANHO_DA_PARTIDA) {
    throw new Error(`O sorteio precisa de exatamente ${TAMANHO_DA_PARTIDA} jogadores.`);
  }

  const [ancora, ...resto] = jogadores;
  const divisoes: Divisao[] = [];

  // Tres indices crescentes entre os 7 restantes: cada combinacao e uma divisao.
  for (let i = 0; i < resto.length; i++) {
    for (let j = i + 1; j < resto.length; j++) {
      for (let k = j + 1; k < resto.length; k++) {
        const a = [ancora, resto[i], resto[j], resto[k]];
        const escolhidos = new Set([resto[i].id, resto[j].id, resto[k].id]);
        const b = resto.filter((jogador) => !escolhidos.has(jogador.id));

        const forcaA = soma(a);
        const forcaB = soma(b);

        divisoes.push({
          timeA: a.map((jogador) => jogador.id),
          timeB: b.map((jogador) => jogador.id),
          forcaA: arredondar(forcaA),
          forcaB: arredondar(forcaB),
          diferenca: arredondar(Math.abs(forcaA - forcaB)),
        });
      }
    }
  }

  return divisoes;
}

function soma(time: JogadorComRating[]): number {
  return time.reduce((total, jogador) => total + jogador.rating, 0);
}

/** Duas casas bastam: o rating tem duas, e somar oito nao merece mais. */
function arredondar(valor: number): number {
  return Math.round(valor * 100) / 100;
}

/**
 * Escolhe uma divisao entre as melhores, com peso.
 *
 * Divisao mais equilibrada tem mais chance, mas nao e certeza -- e isso que faz
 * os times variarem de uma semana para a outra sem desandar o equilibrio.
 */
export function sortearTimes(
  jogadores: JogadorComRating[],
  modo: ModoDeEquilibrio = 'equilibrado',
  aleatorio: Aleatorio = Math.random
): Divisao {
  const ordenadas = gerarDivisoes(jogadores).sort((x, y) => x.diferenca - y.diferenca);
  const candidatas = ordenadas.slice(0, RECORTE[modo]);

  // Peso inversamente proporcional a diferenca. O epsilon existe porque
  // diferenca zero e comum -- times empatados -- e dividir por zero levaria o
  // peso ao infinito, o que travaria o sorteio na primeira divisao empatada.
  const epsilon = 0.01;
  const pesos = candidatas.map((d) => 1 / (d.diferenca + epsilon));
  const total = pesos.reduce((a, b) => a + b, 0);

  let alvo = aleatorio() * total;
  for (let i = 0; i < candidatas.length; i++) {
    alvo -= pesos[i];
    if (alvo <= 0) return candidatas[i];
  }

  // So chega aqui por erro de arredondamento no ultimo passo.
  return candidatas[candidatas.length - 1];
}

export { TAMANHO_DA_PARTIDA, TAMANHO_DO_TIME };
