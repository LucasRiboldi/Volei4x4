/**
 * Os tokens do design system.
 *
 * Esta e a unica fonte de cor, espaco, raio, sombra e tipografia do aplicativo.
 * Nenhuma tela escreve `#RRGGBB` nem `margin: 13`: se um valor nao existe aqui,
 * ele nao deveria estar sendo usado.
 *
 * A paleta vem de quadra de areia -- ceu, mar, areia quente e sol --, sem virar
 * praia de desenho animado. O azul manda; a areia sustenta; o sol e so o acento,
 * usado com parcimonia para nao virar decoracao.
 */

// ---------------------------------------------------------------------------
// Cores cruas
//
// Nao usar direto nas telas: use os papeis semanticos mais abaixo. Uma cor crua
// nao diz para que serve, e e por isso que ela nao sobrevive a troca de tema.
// ---------------------------------------------------------------------------

const paleta = {
  // Mar aberto, do raso ao fundo.
  mar900: '#0A2A3D',
  mar800: '#0E3B52',
  mar700: '#14506D',
  mar600: '#1A6A8F',
  mar500: '#2286B4',
  mar400: '#4BA5CE',
  mar300: '#84C4E0',
  mar200: '#BCDFEF',
  mar100: '#E3F2F9',

  // Areia, da seca a molhada.
  areia700: '#8A6A3C',
  areia600: '#B08A4E',
  areia500: '#D2A860',
  areia400: '#E4C288',
  areia300: '#EFD9B0',
  areia200: '#F7EBD6',
  areia100: '#FDF7EE',

  // Sol -- o acento. Aparece pouco, e por isso funciona.
  sol500: '#F08A24',
  sol400: '#F5A94B',

  // Neutros com um toque quente, para nao brigar com a areia.
  pedra900: '#1B1F24',
  pedra800: '#2C3238',
  pedra700: '#454D56',
  pedra600: '#646C75',
  pedra500: '#939BA4',
  pedra400: '#8B939B',
  pedra300: '#DDE1E5',
  pedra200: '#EDEFF2',
  pedra100: '#F7F8FA',
  branco: '#FFFFFF',

  // Funcionais. Mesma linguagem: dessaturados o bastante para conviver.
  verde600: '#1E7346',
  verde500: '#6FD79B',
  verde100: '#E6F5EC',
  ambar600: '#845808',
  ambar500: '#D69A22',
  ambar100: '#FCF2DE',
  vermelho600: '#C0392F',
  vermelho500: '#FF9187',
  vermelho100: '#FBE9E7',
} as const;

// ---------------------------------------------------------------------------
// Papeis
//
// A tela pede `superficie`, e nao `branco`. E o que faz o tema escuro ser uma
// troca de mapa, e nao uma cacada por hexadecimal espalhado.
// ---------------------------------------------------------------------------

export type Tema = {
  fundo: string;
  superficie: string;
  superficieElevada: string;
  superficieAfundada: string;

  primaria: string;
  primariaHover: string;
  primariaAtiva: string;
  sobrePrimaria: string;

  secundaria: string;
  secundariaHover: string;
  sobreSecundaria: string;

  acento: string;
  sobreAcento: string;

  texto: string;
  textoSecundario: string;
  textoFraco: string;
  sobreEscuro: string;

  borda: string;
  bordaForte: string;
  foco: string;

  sucesso: string;
  sucessoFundo: string;
  atencao: string;
  atencaoFundo: string;
  erro: string;
  erroFundo: string;
  info: string;
  infoFundo: string;
};

export const temaClaro: Tema = {
  fundo: paleta.areia100,
  superficie: paleta.branco,
  superficieElevada: paleta.branco,
  superficieAfundada: paleta.pedra100,

  primaria: paleta.mar600,
  primariaHover: paleta.mar700,
  primariaAtiva: paleta.mar800,
  sobrePrimaria: paleta.branco,

  secundaria: paleta.areia300,
  secundariaHover: paleta.areia400,
  sobreSecundaria: paleta.pedra900,

  acento: paleta.sol500,
  // Texto escuro sobre o laranja: branco sobre esse tom da 2.5:1, longe do AA.
  sobreAcento: paleta.pedra900,

  texto: paleta.pedra900,
  textoSecundario: paleta.pedra700,
  textoFraco: paleta.pedra600,
  sobreEscuro: paleta.branco,

  borda: paleta.pedra300,
  bordaForte: paleta.pedra400,
  foco: paleta.mar500,

  sucesso: paleta.verde600,
  sucessoFundo: paleta.verde100,
  atencao: paleta.ambar600,
  atencaoFundo: paleta.ambar100,
  erro: paleta.vermelho600,
  erroFundo: paleta.vermelho100,
  info: paleta.mar600,
  infoFundo: paleta.mar100,
};

export const temaEscuro: Tema = {
  fundo: paleta.mar900,
  superficie: paleta.mar800,
  superficieElevada: paleta.mar700,
  superficieAfundada: '#08222F',

  primaria: paleta.mar400,
  primariaHover: paleta.mar300,
  primariaAtiva: paleta.mar200,
  sobrePrimaria: paleta.mar900,

  secundaria: paleta.mar700,
  secundariaHover: paleta.mar600,
  sobreSecundaria: paleta.areia200,

  acento: paleta.sol400,
  sobreAcento: paleta.mar900,

  texto: paleta.areia100,
  textoSecundario: paleta.mar200,
  textoFraco: paleta.mar300,
  sobreEscuro: paleta.branco,

  borda: paleta.mar700,
  bordaForte: paleta.mar400,
  foco: paleta.mar300,

  sucesso: paleta.verde500,
  sucessoFundo: '#123425',
  atencao: paleta.ambar500,
  atencaoFundo: '#3A2C0E',
  erro: paleta.vermelho500,
  erroFundo: '#3B1A17',
  info: paleta.mar300,
  infoFundo: paleta.mar800,
};

// ---------------------------------------------------------------------------
// Espaco
//
// Escala fixa. Um valor fora dela e quase sempre alinhamento no olho, que some
// na primeira tela diferente.
// ---------------------------------------------------------------------------

export const espaco = {
  n1: 4,
  n2: 8,
  n3: 12,
  n4: 16,
  n5: 20,
  n6: 24,
  n8: 32,
  n10: 40,
  n12: 48,
  n16: 64,
} as const;

// ---------------------------------------------------------------------------
// Raio
// ---------------------------------------------------------------------------

export const raio = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ---------------------------------------------------------------------------
// Tipografia
//
// Uma familia so. A escala tem menos degraus do que o normal de proposito:
// cada degrau precisa ter um trabalho claro, senao vira decisao no olho.
// ---------------------------------------------------------------------------

export const tipografia = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.8 },
  h1: { fontSize: 27, lineHeight: 34, fontWeight: '800', letterSpacing: -0.5 },
  h2: { fontSize: 21, lineHeight: 28, fontWeight: '700', letterSpacing: -0.2 },
  h3: { fontSize: 17, lineHeight: 24, fontWeight: '700', letterSpacing: 0 },
  corpoGrande: { fontSize: 17, lineHeight: 26, fontWeight: '400', letterSpacing: 0 },
  corpo: { fontSize: 15, lineHeight: 22, fontWeight: '400', letterSpacing: 0 },
  corpoPequeno: { fontSize: 13, lineHeight: 19, fontWeight: '400', letterSpacing: 0 },
  legenda: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.1 },
  rotulo: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.6 },
  numero: { fontSize: 21, lineHeight: 26, fontWeight: '800', letterSpacing: -0.3 },
} as const;

// ---------------------------------------------------------------------------
// Sombras
//
// Poucas e leves. O brief pede hierarquia por contraste e borda, nao por
// sombra pesada -- e sombra forte em tema escuro nao aparece de qualquer forma.
// ---------------------------------------------------------------------------

export const sombra = {
  nenhuma: {},
  sutil: {
    shadowColor: paleta.pedra900,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  media: {
    shadowColor: paleta.pedra900,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
} as const;

// ---------------------------------------------------------------------------
// Alvo de toque
//
// 44 e o minimo que a WCAG 2.2 AA aceita para alvo de ponteiro. Botao, estrela
// e item de lista respeitam isso, mesmo quando o desenho parece menor.
// ---------------------------------------------------------------------------

export const alvoMinimo = 44;

export const quebras = {
  celular: 0,
  celularGrande: 414,
  tablet: 768,
  desktop: 1024,
  larguraMaxima: 720,
} as const;

export const duracao = {
  rapida: 120,
  media: 200,
  lenta: 320,
  sorteio: 1100,
} as const;

export const camada = {
  base: 0,
  cabecalho: 10,
  navegacao: 20,
  modal: 30,
  aviso: 40,
} as const;
