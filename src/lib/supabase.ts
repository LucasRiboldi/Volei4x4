import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

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
