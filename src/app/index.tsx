import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Cores, Espaco } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { sair } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';

/**
 * Provisoria. A navegacao de tres abas -- Perfil, Jogadores e Sorteio -- entra
 * na etapa 03, quando existir o que colocar dentro delas.
 */
export default function Inicio() {
  const { sessao } = useAuth();
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  // sair() lanca quando o signOut falha. Ligada crua no onPress, a rejeicao
  // ficaria sem dono e a pessoa seguiria logada sem aviso nenhum.
  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
    } catch (e) {
      Alert.alert('Sair', mensagemDeErro(e, 'Não foi possível sair. Tente de novo.'));
      setSaindo(false);
    }
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={estilos.tela}>
      <View style={estilos.conteudo}>
        <Text style={estilos.titulo}>Vôlei 4x4</Text>
        <Text style={estilos.texto}>Você está logado como {sessao?.user.email}.</Text>
        <Text style={estilos.nota}>
          Etapa 02 concluída: perfil e autoavaliação. As próximas etapas trazem a lista de
          jogadores, as avaliações, o rating e o sorteio.
        </Text>
      </View>
      <View style={estilos.acoes}>
        <Botao titulo="Meu perfil" aoTocar={() => router.push('/perfil')} />
        <Botao
          titulo="Sair"
          variante="secundario"
          aoTocar={() => void aoSair()}
          carregando={saindo}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: Cores.fundo,
    flex: 1,
    justifyContent: 'space-between',
    padding: Espaco.quatro,
  },
  conteudo: {
    flex: 1,
    gap: Espaco.tres,
    justifyContent: 'center',
  },
  titulo: {
    color: Cores.texto,
    fontSize: 32,
    fontWeight: '800',
  },
  texto: {
    color: Cores.areia,
    fontSize: 16,
  },
  nota: {
    color: Cores.textoFraco,
    fontSize: 14,
    lineHeight: 21,
  },
  acoes: {
    gap: Espaco.dois,
  },
});
