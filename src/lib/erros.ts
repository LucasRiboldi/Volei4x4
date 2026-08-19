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
  { contem: 'Email not confirmed', texto: 'Confirme o e-mail antes de entrar.' },
  { contem: 'Network request failed', texto: 'Sem conexão. Verifique a internet.' },
];

export function mensagemDeErro(erro: unknown, padrao: string): string {
  if (typeof erro === 'object' && erro !== null && 'message' in erro) {
    const { message } = erro as { message?: unknown };
    if (typeof message === 'string') {
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
