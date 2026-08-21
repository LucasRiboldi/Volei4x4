// Vem do proprio expo-router, e nao de `@react-navigation/native`: aquele
// pacote nao e dependencia direta deste projeto, e importa-lo daria erro de
// tipo mesmo estando presente em node_modules por via transitiva.
import { DefaultTheme, Stack, ThemeProvider, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { quebras, tema } from '@/design/tema';
import { AuthProvider, useAuth } from '@/contexts/auth';

/**
 * O tema do navegador.
 *
 * Existe por um motivo especifico: o react-navigation pinta o fundo das telas
 * com a cor do tema dele, e nenhuma View colocada por cima alcanca essa cor --
 * ela vem de dentro do navegador, abaixo das nossas telas. Como o conteudo para
 * na largura de tablet, e essa cor que aparece dos lados numa janela larga.
 *
 * Trocar o tema e o unico jeito de chegar la.
 *
 * A base e `DefaultTheme`, e nao `DarkTheme`: as telas passaram a usar a paleta
 * clara, e a base escura deixaria cor escura vazando em tudo o que o
 * react-navigation pinta sozinho e nos nao sobrescrevemos aqui.
 */
const temaDaNavegacao = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: tema.superficieAfundada,
    card: tema.superficie,
    text: tema.texto,
    border: tema.borda,
    primary: tema.primaria,
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
          backgroundColor: tema.fundo,
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
          maxWidth: quebras.larguraMaxima,
          alignSelf: 'center',
        },
      }}
    />
  );
}

export default function LayoutRaiz() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <ThemeProvider value={temaDaNavegacao}>
        <GuardaDeRota />
      </ThemeProvider>
    </AuthProvider>
  );
}
