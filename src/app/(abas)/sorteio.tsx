import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores, Espaco, Raio } from '@/constants/theme';
import { TAMANHO_DA_PARTIDA } from '@/nucleo/atributos';

/**
 * A aba existe desde agora para a navegacao ficar completa, mas a tela de
 * verdade e a etapa 07 -- e ela depende do rating (05) e do motor de
 * balanceamento (06).
 *
 * O que esta aqui e um aviso honesto do que falta, e nao uma lista de jogadores
 * com um botao que nao sorteia. O documento do projeto e explicito: nao criar
 * tela que apenas parece funcionar.
 */
export default function Sorteio() {
  return (
    <SafeAreaView edges={['top']} style={estilos.tela}>
      <Text style={estilos.titulo}>Sorteio</Text>

      <View style={estilos.cartao}>
        <Text style={estilos.emoji}>🏐</Text>
        <Text style={estilos.chamada}>
          Aqui você vai marcar os {TAMANHO_DA_PARTIDA} presentes e receber dois times de{' '}
          {TAMANHO_DA_PARTIDA / 2}.
        </Text>
        <Text style={estilos.explicacao}>
          Ainda falta o que faz o sorteio valer a pena: as avaliações entre jogadores e o
          rating que sai delas. Sem isso, sortear seria só embaralhar nomes.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: Cores.fundo,
    flex: 1,
    paddingHorizontal: Espaco.tres,
  },
  titulo: {
    color: Cores.texto,
    fontSize: 28,
    fontWeight: '800',
    paddingTop: Espaco.tres,
  },
  cartao: {
    alignItems: 'center',
    backgroundColor: Cores.fundoCartao,
    borderRadius: Raio.grande,
    gap: Espaco.dois,
    marginTop: Espaco.quatro,
    padding: Espaco.quatro,
  },
  emoji: {
    fontSize: 48,
  },
  chamada: {
    color: Cores.texto,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  explicacao: {
    color: Cores.textoFraco,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
