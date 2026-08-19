import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Cores } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';

/**
 * Mantem a rota coerente com o estado de login: quem nao tem sessao vai para o
 * login, e quem tem nao consegue voltar para ele.
 */
function GuardaDeRota() {
  const { sessao, carregando } = useAuth();
  const segmentos = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (carregando) return;

    const primeiro = segmentos[0];
    const emRotaPublica = primeiro === 'login' || primeiro === 'cadastro';

    if (!sessao && !emRotaPublica) {
      router.replace('/login');
    } else if (sessao && emRotaPublica) {
      router.replace('/');
    }
  }, [sessao, carregando, segmentos, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Sem isto o fundo branco do navegador pisca entre uma tela e outra.
        contentStyle: { backgroundColor: Cores.fundo },
      }}
    />
  );
}

export default function LayoutRaiz() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <GuardaDeRota />
    </AuthProvider>
  );
}
