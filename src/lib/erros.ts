/**
 * Texto para mostrar na tela a partir do que foi lancado.
 *
 * O erro do Supabase nao e um Error: e um objeto com `message`, e a mensagem
 * vem em ingles. As que a pessoa realmente encontra estao traduzidas aqui --
 * as demais caem no texto padrao, porque mensagem crua de API na tela nao
 * ajuda ninguem.
 */
const TRADUCOES: { contem: string; texto: string }[] = [
  { contem: 'Invalid login credentials', texto: 'E-mail ou senha incorretos.' },
  { contem: 'User already registered', texto: 'Já existe uma conta com esse e-mail.' },
  { contem: 'Password should be at least', texto: 'A senha é curta demais.' },
  { contem: 'Unable to validate email', texto: 'Esse e-mail não parece válido.' },
  { contem: 'is invalid', texto: 'Esse e-mail não parece válido.' },
  { contem: 'Email not confirmed', texto: 'Confirme o e-mail antes de entrar.' },
  { contem: 'Network request failed', texto: 'Sem conexão. Verifique a internet.' },
  // O SMTP embutido do Supabase manda pouquissimos e-mails por hora. Com
  // confirmacao de e-mail ligada, cada cadastro gasta um -- e a cota estoura
  // rapido durante o desenvolvimento. Sem a traducao, isso chegava na tela como
  // "tente de novo", que e o conselho errado: tentar de novo nao resolve.
  { contem: 'rate limit', texto: 'Limite de e-mails do servidor atingido. Tente daqui a pouco.' },
  { contem: 'over_email_send', texto: 'Limite de e-mails do servidor atingido. Tente daqui a pouco.' },
  { contem: 'Database error', texto: 'O banco recusou o cadastro. Verifique se as migrações foram aplicadas.' },
];

export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (typeof erro === 'object' && erro !== null && 'message' in erro) {
    const { message } = erro as { message?: unknown };
    if (typeof message === 'string') {
      // Em desenvolvimento a mensagem crua vai para o console. Sem isto, um erro
      // sem traducao chega como o texto padrao e nada mais -- foi assim que um
      // "limite de e-mails excedido" virou "tente de novo" na tela, que era o
      // conselho errado e escondia a causa.
      if (__DEV__) console.warn('[erro]', message);

      const conhecida = TRADUCOES.find((t) => message.includes(t.contem));
      if (conhecida) return conhecida.texto;
    }
  }
  return padrao;
}

/** Validacao de e-mail suficiente para a tela; quem decide de verdade e o servidor. */
export function emailParece(valido: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valido.trim());
}
