import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';

import { Cores } from '@/constants/theme';

/**
 * As tres areas do aplicativo.
 *
 * Os icones sao emoji, e nao uma biblioteca de icones, por uma razao registrada
 * no plano: nada aqui pode exigir modulo nativo, senao o caminho barato de
 * virar aplicativo pelo Expo Go acaba. Emoji renderiza igual em navegador,
 * Android e iOS, sem dependencia nenhuma.
 */
export default function LayoutDasAbas() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Cores.areia,
        tabBarInactiveTintColor: Cores.textoFraco,
        tabBarStyle: {
          backgroundColor: Cores.fundoCartao,
          borderTopColor: Cores.borda,
        },
        sceneStyle: { backgroundColor: Cores.fundo },
      }}>
      {/* `index` e a lista de jogadores: e a tela que abre ao entrar. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Jogadores',
          tabBarIcon: ({ color }) => <Icone simbolo="👥" cor={color} />,
        }}
      />
      <Tabs.Screen
        name="sorteio"
        options={{
          title: 'Sorteio',
          tabBarIcon: ({ color }) => <Icone simbolo="🏐" cor={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <Icone simbolo="👤" cor={color} />,
        }}
      />
    </Tabs>
  );
}

function Icone({ simbolo, cor }: { simbolo: string; cor: ColorValue }) {
  return <Text style={{ color: cor, fontSize: 20 }}>{simbolo}</Text>;
}
