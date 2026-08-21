/**
 * O tema em vigor, e a porta de entrada dos tokens para as telas.
 *
 * As telas importam daqui e nunca de `tokens.ts` direto. A diferenca importa: o
 * arquivo de tokens define DOIS temas, e quem escolhe qual esta valendo e este
 * modulo. Uma tela que importasse `temaClaro` pelo nome amarraria a escolha em
 * dezessete lugares.
 *
 * ---------------------------------------------------------------------------
 * Por que claro, e o que acontece com o escuro
 * ---------------------------------------------------------------------------
 *
 * `app.json` declara `userInterfaceStyle: "light"` e fundo `#FDF7EE` desde
 * sempre; as telas e que vinham pintando escuro, com a paleta antiga de
 * `src/constants/theme.ts`. Era essa a contradicao -- o manifesto prometia uma
 * coisa e o aplicativo entregava outra.
 *
 * `temaEscuro` continua definido e continua coberto pelos testes de contraste.
 * Nao e codigo morto: e a metade escura de um par que precisa existir inteiro
 * para o dia em que houver alternancia de tema. O que NAO existe hoje e a
 * alternancia, e por isso este arquivo aponta para um so.
 *
 * Trocar para escuro, ou passar a seguir o sistema, e mexer aqui -- e so aqui.
 */

import { temaClaro } from './tokens';

export const tema = temaClaro;

export {
  alvoMinimo,
  camada,
  duracao,
  espaco,
  quebras,
  raio,
  sombra,
  tipografia,
  type Tema,
} from './tokens';
