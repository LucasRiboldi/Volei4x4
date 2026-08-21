import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { espaco, raio, tema } from '@/design/tema';
import { minhasPartidasParaAvaliar, type PartidaParaAvaliar } from '@/lib/avaliacoes-de-partida';
import { mensagemDeErro } from '@/lib/erros';

/**
 * Quem jogou com voce naquela partida, e quem ainda falta avaliar.
 *
 * A lista sai de `minhasPartidasParaAvaliar`, que so devolve partidas com a
 * janela aberta nas quais voce esteve. Quem nao participou nao chega aqui com
 * conteudo -- e, se chegasse, o banco recusaria a escrita.
 */
export default function AvaliarPartida() {
  const { partida } = useLocalSearchParams<{ partida: string }>();
  const router = useRouter();

  const [dados, setDados] = useState<PartidaParaAvaliar | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(
    async (continuaValendo: () => boolean) => {
      try {
        setErro(null);
        const todas = await minhasPartidasParaAvaliar();
        if (!continuaValendo()) return;
        setDados(todas.find((p) => p.partida.id === partida) ?? null);
      } catch (e) {
        if (continuaValendo()) setErro(mensagemDeErro(e, 'Não foi possível carregar a partida.'));
      } finally {
        if (continuaValendo()) setCarregando(false);
      }
    },
    [partida]
  );

  // Recarrega ao voltar de uma avaliacao, que muda esta lista sem avisar.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      void carregar(() => ativo);
      return () => {
        ativo = false;
      };
    }, [carregar])
  );

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Avaliar' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <ActivityIndicator color={tema.primaria} />
        </View>
      </>
    );
  }

  if (!dados) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Avaliar' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <Text style={estilos.aviso}>
            {erro ?? 'Esta partida não está aberta para avaliação, ou você não jogou nela.'}
          </Text>
        </View>
      </>
    );
  }

  const total = dados.aAvaliar.length;
  const feitas = total - dados.pendentes;
  const fecha = new Date(dados.partida.avaliacao_fecha_em);

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Avaliar a partida' }} />
      <View style={estilos.tela}>
        <FlatList
          contentContainerStyle={estilos.lista}
          data={dados.aAvaliar}
          keyExtractor={(j) => j.jogador_id}
          ListHeaderComponent={
            <View style={estilos.cabecalho}>
              <Text style={estilos.progresso}>
                {feitas} de {total} avaliados
              </Text>
              <Text style={estilos.prazo}>
                Aberto até {fecha.toLocaleDateString('pt-BR')} às{' '}
                {new Date(fecha.getTime() - 1000).toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
              <Text style={estilos.explicacao}>
                Você não precisa avaliar todo mundo. O que salvar fica; o resto simplesmente não
                conta.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Avaliar ${item.nome}`}
              onPress={() =>
                router.push({
                  pathname: '/partida/[partida]/avaliar/[jogador]',
                  params: { partida, jogador: item.jogador_id },
                })
              }
              style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}>
              <Avatar nome={item.nome} fotoUrl={item.foto_url} tamanho={44} />
              <Text style={estilos.nome} numberOfLines={1}>
                {item.nome}
              </Text>
              <Text style={item.jaAvaliei ? estilos.feito : estilos.pendente}>
                {item.jaAvaliei ? '✓ avaliado' : 'avaliar'}
              </Text>
            </Pressable>
          )}
        />
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { backgroundColor: tema.fundo, flex: 1, paddingHorizontal: espaco.n4 },
  centralizado: { alignItems: 'center', justifyContent: 'center', padding: espaco.n6 },
  cabecalho: { gap: espaco.n1, paddingVertical: espaco.n4 },
  progresso: { color: tema.texto, fontSize: 20, fontWeight: '800' },
  prazo: { color: tema.primaria, fontSize: 14, fontWeight: '600' },
  explicacao: { color: tema.textoFraco, fontSize: 13, lineHeight: 19, marginTop: espaco.n1 },
  lista: { gap: espaco.n2, paddingBottom: espaco.n4 },
  cartao: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderRadius: raio.md,
    flexDirection: 'row',
    gap: espaco.n2,
    padding: espaco.n2,
  },
  pressionado: { opacity: 0.7 },
  nome: { color: tema.texto, flex: 1, fontSize: 16, fontWeight: '600' },
  feito: { color: tema.sucesso, fontSize: 13, fontWeight: '700' },
  pendente: { color: tema.primaria, fontSize: 13, fontWeight: '700' },
  aviso: { color: tema.textoFraco, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
