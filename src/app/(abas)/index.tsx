import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { minhasPartidasParaAvaliar, type PartidaParaAvaliar } from '@/lib/avaliacoes-de-partida';
import { mensagemDeErro } from '@/lib/erros';
import { listarJogadores, type Jogador } from '@/lib/jogadores';
import { mapaDeRatings, type Rating } from '@/lib/ratings';

export default function Jogadores() {
  const { sessao } = useAuth();
  const router = useRouter();
  const meuId = sessao?.user.id;

  // null enquanto a primeira busca nao voltou -- diferente de [], que ja e a
  // resposta "nao ha ninguem cadastrado".
  const [jogadores, setJogadores] = useState<Jogador[] | null>(null);
  const [pendentes, setPendentes] = useState<PartidaParaAvaliar[]>([]);
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (continuaValendo: () => boolean) => {
    try {
      setErro(null);
      // Independentes: esperar uma depois da outra triplicaria a espera.
      const [lista, mapa, aAvaliar] = await Promise.all([
        listarJogadores(),
        mapaDeRatings(),
        minhasPartidasParaAvaliar(),
      ]);
      if (!continuaValendo()) return;

      setJogadores(lista);
      setRatings(mapa);
      setPendentes(aAvaliar.filter((p) => p.pendentes > 0));
    } catch (e) {
      if (continuaValendo()) {
        setErro(mensagemDeErro(e, 'Não foi possível carregar os jogadores.'));
      }
    }
  }, []);

  // Recarrega ao voltar do perfil ou de uma avaliacao, que mudam esta tela sem
  // avisar.
  useFocusEffect(
    useCallback(() => {
      let ativo = true;
      void carregar(() => ativo);
      return () => {
        ativo = false;
      };
    }, [carregar])
  );

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (termo === '') return jogadores ?? [];

    return (jogadores ?? []).filter((j) =>
      `${j.nome} ${j.apelido ?? ''}`.toLowerCase().includes(termo)
    );
  }, [jogadores, busca]);

  return (
    <SafeAreaView edges={['top']} style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Jogadores</Text>
        <Text style={estilos.contagem}>
          {jogadores === null
            ? ' '
            : `${jogadores.length} ${jogadores.length === 1 ? 'cadastrado' : 'cadastrados'}`}
        </Text>
      </View>

      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setBusca}
        placeholder="Buscar por nome ou apelido"
        placeholderTextColor={Cores.textoFraco}
        style={estilos.busca}
        value={busca}
      />

      {pendentes.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/partida/[partida]/avaliar',
              params: { partida: pendentes[0].partida.id },
            })
          }
          style={({ pressed }) => [estilos.pendencia, pressed && estilos.pressionado]}>
          <Text style={estilos.tituloDaPendencia}>Avaliações abertas</Text>
          <Text style={estilos.textoDaPendencia}>
            {pendentes[0].pendentes}{' '}
            {pendentes[0].pendentes === 1 ? 'jogador aguarda' : 'jogadores aguardam'} sua avaliação
            da última partida.
          </Text>
          <Text style={estilos.acaoDaPendencia}>Avaliar agora →</Text>
        </Pressable>
      ) : null}

      <FlatList
        contentContainerStyle={estilos.lista}
        data={filtrados}
        keyExtractor={(j) => j.id}
        ListEmptyComponent={
          <Vazio
            carregando={jogadores === null && erro === null}
            erro={erro}
            buscando={busca.trim() !== ''}
          />
        }
        renderItem={({ item }) => (
          <Linha
            jogador={item}
            souEu={item.id === meuId}
            rating={ratings.get(item.id) ?? null}
          />
        )}
      />
    </SafeAreaView>
  );
}

function Vazio({
  carregando,
  erro,
  buscando,
}: {
  carregando: boolean;
  erro: string | null;
  buscando: boolean;
}) {
  if (carregando) return <ActivityIndicator color={Cores.areia} style={estilos.espera} />;

  return (
    <Text style={estilos.vazio}>
      {erro ?? (buscando ? 'Ninguém com esse nome.' : 'Ninguém cadastrado ainda.')}
    </Text>
  );
}

function Linha({
  jogador,
  souEu,
  rating,
}: {
  jogador: Jogador;
  souEu: boolean;
  rating: Rating | null;
}) {
  const detalhe = [jogador.apelido, jogador.cidade].filter(Boolean).join(' · ');

  return (
    <View style={estilos.cartao}>
      <Avatar nome={jogador.nome} fotoUrl={jogador.foto_url} tamanho={48} />

      <View style={estilos.identificacao}>
        <View style={estilos.linhaDoNome}>
          <Text style={estilos.nome} numberOfLines={1}>
            {jogador.nome}
          </Text>
          {souEu ? <Text style={estilos.etiqueta}>você</Text> : null}
        </View>
        {detalhe ? (
          <Text style={estilos.detalhe} numberOfLines={1}>
            {detalhe}
          </Text>
        ) : null}
      </View>

      <View style={estilos.direita}>
        {/*
          O rating so aparece com avaliadores suficientes. Abaixo do piso o
          banco devolve o valor neutro, e mostra-lo como se fosse medido seria
          mentira -- alem de, com poucos votos, deixar deduzir voto individual.
        */}
        {rating?.confiavel ? (
          <Text style={estilos.rating}>{rating.rating.toFixed(1)}</Text>
        ) : (
          <Text style={estilos.semRating}>–</Text>
        )}

        <Text style={estilos.avaliadores}>
          {rating && rating.avaliadores > 0
            ? `${rating.avaliadores} ${rating.avaliadores === 1 ? 'avaliador' : 'avaliadores'}`
            : 'sem avaliações'}
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: Cores.fundo,
    flex: 1,
    paddingHorizontal: Espaco.tres,
  },
  cabecalho: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: Espaco.dois,
    justifyContent: 'space-between',
    paddingTop: Espaco.tres,
  },
  titulo: {
    color: Cores.texto,
    fontSize: 28,
    fontWeight: '800',
  },
  contagem: {
    color: Cores.textoFraco,
    fontSize: 14,
  },
  busca: {
    backgroundColor: Cores.fundoCampo,
    borderColor: Cores.borda,
    borderRadius: Raio.pequeno,
    borderWidth: 1,
    color: Cores.texto,
    fontSize: 15,
    marginTop: Espaco.tres,
    minHeight: 44,
    paddingHorizontal: Espaco.tres,
  },
  lista: {
    gap: Espaco.dois,
    paddingVertical: Espaco.tres,
  },
  cartao: {
    alignItems: 'center',
    backgroundColor: Cores.fundoCartao,
    borderRadius: Raio.medio,
    flexDirection: 'row',
    gap: Espaco.tres,
    padding: Espaco.dois,
  },
  identificacao: {
    flex: 1,
    gap: 2,
  },
  linhaDoNome: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: Espaco.dois,
  },
  nome: {
    color: Cores.texto,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  etiqueta: {
    color: Cores.areia,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detalhe: {
    color: Cores.textoFraco,
    fontSize: 13,
  },
  pendencia: {
    backgroundColor: Cores.fundoCartao,
    borderColor: Cores.areia,
    borderRadius: Raio.grande,
    borderWidth: 1,
    gap: 2,
    marginTop: Espaco.tres,
    padding: Espaco.tres,
  },
  tituloDaPendencia: { color: Cores.areia, fontSize: 15, fontWeight: '800' },
  textoDaPendencia: { color: Cores.texto, fontSize: 14, lineHeight: 20 },
  acaoDaPendencia: { color: Cores.mar, fontSize: 13, fontWeight: '700', paddingTop: Espaco.um },
  direita: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rating: {
    color: Cores.texto,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  semRating: {
    color: Cores.borda,
    fontSize: 22,
    fontWeight: '800',
  },
  avaliadores: {
    color: Cores.textoFraco,
    fontSize: 12,
  },
  pressionado: {
    opacity: 0.7,
  },
  espera: {
    marginTop: Espaco.seis,
  },
  vazio: {
    color: Cores.textoFraco,
    fontSize: 15,
    marginTop: Espaco.seis,
    textAlign: 'center',
  },
});
