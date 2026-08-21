import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { espaco, quebras, raio, tema, tipografia } from '@/design/tema';
import { useAuth } from '@/contexts/auth';
import { mensagemDeErro } from '@/lib/erros';
import { listarPartidas, type EscalacaoDaPartida } from '@/lib/partidas';
import { estadoDaAvaliacao, type EstadoDaAvaliacao } from '@/nucleo/janela';

const SELO: Record<EstadoDaAvaliacao, { texto: string; cor: string }> = {
  'ainda-nao': { texto: 'Avaliações amanhã', cor: tema.primaria },
  aberta: { texto: 'Avaliações abertas', cor: tema.sucesso },
  encerrada: { texto: 'Avaliações encerradas', cor: tema.textoFraco },
};

export default function Partidas() {
  const router = useRouter();
  const { sessao } = useAuth();
  const meuId = sessao?.user.id;

  const [partidas, setPartidas] = useState<EscalacaoDaPartida[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (continuaValendo: () => boolean) => {
    try {
      setErro(null);
      const lista = await listarPartidas();
      if (continuaValendo()) setPartidas(lista);
    } catch (e) {
      if (continuaValendo()) setErro(mensagemDeErro(e, 'Não foi possível carregar as partidas.'));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      void carregar(() => ativo);
      return () => {
        ativo = false;
      };
    }, [carregar])
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Partidas' }} />
      <View style={estilos.tela}>
        {partidas === null ? (
          <ActivityIndicator color={tema.primaria} style={estilos.espera} />
        ) : (
          <FlatList
            contentContainerStyle={estilos.lista}
            data={partidas}
            keyExtractor={(p) => p.id}
            ListEmptyComponent={
              <Text style={estilos.vazio}>
                {erro ?? 'Suas primeiras partidas aparecerão aqui, depois do primeiro sorteio.'}
              </Text>
            }
            renderItem={({ item }) => {
              const estado = estadoDaAvaliacao(item);
              const selo = SELO[estado];
              const euJoguei = item.jogadores.some((j) => j.jogador_id === meuId);
              const podeAvaliar = estado === 'aberta' && euJoguei;

              return (
                <Pressable
                  accessibilityRole={podeAvaliar ? 'button' : 'summary'}
                  disabled={!podeAvaliar}
                  onPress={() =>
                    router.push({
                      pathname: '/partida/[partida]/avaliar',
                      params: { partida: item.id },
                    })
                  }
                  style={({ pressed }) => [estilos.carta, pressed && podeAvaliar && estilos.pressionado]}>
                  <View style={estilos.topo}>
                    <Text style={estilos.data}>
                      {new Date(item.jogada_em).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </Text>
                    <Text style={[estilos.selo, { color: selo.cor }]}>{selo.texto}</Text>
                  </View>

                  {(['A', 'B'] as const).map((t) => (
                    <View key={t} style={estilos.time}>
                      <Text style={estilos.nomeDoTime}>Time {t}</Text>
                      <View style={estilos.avatares}>
                        {item.jogadores
                          .filter((j) => j.time_da_partida === t)
                          .map((j) => (
                            <Avatar key={j.jogador_id} nome={j.nome} fotoUrl={j.foto_url} tamanho={28} />
                          ))}
                      </View>
                      <Text style={estilos.placar}>
                        {(t === 'A' ? item.placar_a : item.placar_b) ?? '–'}
                      </Text>
                    </View>
                  ))}

                  {podeAvaliar ? <Text style={estilos.chamada}>Avaliar quem jogou →</Text> : null}
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { backgroundColor: tema.fundo, flex: 1, paddingHorizontal: espaco.n4 },
  espera: { marginTop: espaco.n12 },
  lista: { gap: espaco.n2, paddingVertical: espaco.n4 },
  vazio: { color: tema.textoFraco, fontSize: 15, lineHeight: 22, marginTop: espaco.n12, textAlign: 'center' },
  carta: { backgroundColor: tema.superficie, borderRadius: raio.lg, gap: espaco.n2, padding: espaco.n4 },
  pressionado: { opacity: 0.7 },
  topo: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  data: { color: tema.texto, fontSize: 16, fontWeight: '800', textTransform: 'uppercase' },
  selo: { fontSize: 12, fontWeight: '700' },
  time: { alignItems: 'center', flexDirection: 'row', gap: espaco.n2 },
  nomeDoTime: { color: tema.textoFraco, fontSize: 12, fontWeight: '700', width: 52 },
  avatares: { flexDirection: 'row', flex: 1, gap: 2 },
  placar: { color: tema.texto, fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '800' },
  chamada: { color: tema.primaria, fontSize: 13, fontWeight: '700', paddingTop: espaco.n1 },
});
