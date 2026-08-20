import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

/**
 * Tira qualquer espaco em branco do valor, inclusive no meio.
 *
 * Nem URL nem JWT contem espaco, entao remover e sempre seguro. E necessario
 * porque colar a chave num painel web -- o da Vercel, por exemplo -- costuma
 * trazer quebras de linha junto, quando o campo de origem quebrou o texto na
 * exibicao.
 *
 * O sintoma disso e traicoeiro: a variavel existe, entao o aplicativo sobe e a
 * tela de login aparece normalmente; mas toda chamada volta 401, porque um JWT
 * com `\n` no meio nao e um JWT. Foi exatamente o que aconteceu no primeiro
 * deploy, e custou um bom tempo de investigacao.
 */
function limpar(valor: string | undefined): string | undefined {
  return valor?.replace(/\s+/g, '') || undefined;
}

const url = limpar(process.env.EXPO_PUBLIC_SUPABASE_URL);
const anonKey = limpar(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

if (!url || !anonKey) {
  throw new Error(
    'Faltam EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copie .env.example para .env.local e preencha os dois valores.'
  );
}

// O pre-render da web roda este modulo no Node, onde nao existe `window` -- e o
// AsyncStorage da web e o localStorage. Sem esta guarda o cliente de auth lanca
// "window is not defined" ao inicializar, fora de qualquer try, e derruba o
// processo inteiro em vez de degradar.
const noServidor = typeof window === 'undefined';

export const supabase = createClient(url, anonKey, {
  auth: {
    // Sem storage no servidor: nao ha sessao para guardar num render que
    // termina em HTML.
    storage: noServidor ? undefined : AsyncStorage,
    autoRefreshToken: !noServidor,
    persistSession: !noServidor,
    // Nao ha URL de navegador para inspecionar no app nativo.
    detectSessionInUrl: false,
  },
});
