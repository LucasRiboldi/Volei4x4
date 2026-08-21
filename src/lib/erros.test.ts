import { describe, expect, it } from 'vitest';

import { emailParece, mensagemDeErro } from './erros';

/**
 * As mensagens que a pessoa le quando algo da errado.
 *
 * Parece detalhe de tela e nao e: o erro do Supabase chega em ingles, e sem
 * traducao ele vira o texto padrao -- que costuma ser "tente de novo". Foi
 * exatamente assim que um "limite de e-mails excedido" virou um conselho
 * errado, porque tentar de novo nao resolvia. Cada caso abaixo e um erro que
 * alguem realmente encontrou.
 */
describe('mensagemDeErro', () => {
  it('traduz credenciais invalidas, que e o erro mais comum de todos', () => {
    expect(mensagemDeErro({ message: 'Invalid login credentials' }, 'padrao')).toBe(
      'E-mail ou senha incorretos.'
    );
  });

  it('traduz o limite de e-mails, onde "tente de novo" seria o conselho errado', () => {
    expect(mensagemDeErro({ message: 'email rate limit exceeded' }, 'padrao')).toBe(
      'Limite de e-mails do servidor atingido. Tente daqui a pouco.'
    );
    // O mesmo caso chega com outro texto dependendo do endpoint.
    expect(mensagemDeErro({ message: 'over_email_send_rate_limit' }, 'padrao')).toBe(
      'Limite de e-mails do servidor atingido. Tente daqui a pouco.'
    );
  });

  it('casa por trecho, e nao por igualdade -- a mensagem do Supabase varia no fim', () => {
    expect(mensagemDeErro({ message: 'Password should be at least 8 characters' }, 'padrao')).toBe(
      'A senha é curta demais.'
    );
  });

  it('cai no padrao quando nao conhece o erro, em vez de mostrar ingles cru', () => {
    expect(mensagemDeErro({ message: 'Some brand new failure' }, 'Nao deu.')).toBe('Nao deu.');
  });

  it('aguenta o que nao e erro do Supabase sem quebrar', () => {
    // O erro do Supabase nao e um Error: e um objeto com `message`. Mas nem
    // tudo o que chega aqui e uma coisa ou outra -- um `throw null` de uma
    // biblioteca qualquer nao pode derrubar a tela de erro.
    for (const entrada of [null, undefined, 'texto solto', 42, {}, { message: 123 }]) {
      expect(mensagemDeErro(entrada, 'padrao')).toBe('padrao');
    }
  });

  it('aceita um Error de verdade, que e o que o proprio codigo lanca', () => {
    expect(mensagemDeErro(new Error('Network request failed'), 'padrao')).toBe(
      'Sem conexão. Verifique a internet.'
    );
  });
});

describe('emailParece', () => {
  it('aceita o que tem cara de e-mail', () => {
    for (const bom of ['a@b.co', 'lucas.riboldi@gmail.com', 'joao@volei4x4-teste.com']) {
      expect(emailParece(bom)).toBe(true);
    }
  });

  it('recusa o que claramente nao e', () => {
    for (const ruim of ['', 'sem-arroba', 'a@b', 'a@@b.co', 'a b@c.co', '@b.co', 'a@.co']) {
      expect(emailParece(ruim)).toBe(false);
    }
  });

  it('ignora espaco em volta, que e o que o teclado do celular costuma acrescentar', () => {
    expect(emailParece('  joao@exemplo.com  ')).toBe(true);
  });
});
