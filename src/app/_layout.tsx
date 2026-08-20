// Vem do proprio expo-router, e nao de `@react-navigation/native`: aquele
// pacote nao e dependencia direta deste projeto, e importa-lo daria erro de
// tipo mesmo estando presente em node_modules por via transitiva.
import { DarkTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Cores, LARGURA_MAXIMA } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';

/**
 * O tema do navegador.
 *
 * Existe por um motivo especifico: o react-navigation pinta o fundo das telas
 * com a cor do tema dele, e o padrao e um cinza claro (#f2f2f2). Como o
 * conteudo agora para na largura de tablet, esse cinza ficava aparecendo dos
 * lados numa janela larga -- e nenhuma View colocada por cima resolvia, porque
 * o cinza vem de dentro do navegador, abaixo das nossas telas.
 *
 * Trocar o tema e o unico jeito de alcancar aquela cor.
 */
const temaDaNavegacao = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Cores.foraDaMoldura,
    card: Cores.fundoCartao,
    text: Cores.texto,
    border: Cores.borda,
    primary: Cores.areia,
  },
};

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
        contentStyle: {
          backgroundColor: Cores.fundo,
          // A moldura. O conteudo para de esticar na largura de tablet e passa
          // a ficar centralizado, com o fundo escuro aparecendo dos lados.
          //
          // `width: '100%'` precisa vir junto do `maxWidth`: sem ele o
          // container encolhe ate o tamanho do conteudo em vez de ocupar o
          // limite.
          //
          // O limite nao e estetico. As telas foram desenhadas em uma coluna,
          // com listas e texto de largura confortavel; esticar isso num monitor
          // de 1920 daria linhas longas demais e cartoes com um vao enorme
          // entre a foto e o rating.
          width: '100%',
          maxWidth: LARGURA_MAXIMA,
          alignSelf: 'center',
        },
      }}
    />
  );
}

export default function LayoutRaiz() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <ThemeProvider value={temaDaNavegacao}>
        <GuardaDeRota />
      </ThemeProvider>
    </AuthProvider>
  );
}
