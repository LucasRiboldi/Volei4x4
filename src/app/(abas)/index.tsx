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
import { espaco, quebras, raio, tema, tipografia } from '@/design/tema';
import { useAuth } from '@/contexts/auth';
import { meusAvaliadosInicialmente } from '@/lib/avaliacao-inicial';
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
  // De quem eu ja fiz a avaliacao inicial -- a que vale uma vez so.
  const [jaAvaliados, setJaAvaliados] = useState<Set<string>>(new Set());
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (continuaValendo: () => boolean) => {
    try {
      setErro(null);
      // Independentes: esperar uma depois da outra triplicaria a espera.
      const [lista, mapa, aAvaliar, iniciais] = await Promise.all([
        listarJogadores(),
        mapaDeRatings(),
        minhasPartidasParaAvaliar(),
        meusAvaliadosInicialmente(),
      ]);
      if (!continuaValendo()) return;

      setJogadores(lista);
      setRatings(mapa);
      setPendentes(aAvaliar.filter((p) => p.pendentes > 0));
      setJaAvaliados(iniciais);
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

  // Com quem eu tenho partida aberta para avaliar agora. Se a pessoa esta aqui,
  // o botao dela leva a avaliacao daquela partida -- e nao a inicial.
  const comPartidaAberta = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const p of pendentes) {
      for (const j of p.aAvaliar) {
        if (!j.jaAvaliei) mapa.set(j.jogador_id, p.partida.id);
      }
    }
    return mapa;
  }, [pendentes]);

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
        placeholderTextColor={tema.textoFraco}
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
            jaAvaliadoInicialmente={jaAvaliados.has(item.id)}
            partidaAberta={comPartidaAberta.get(item.id) ?? null}
            aoAvaliarPartida={(partida) =>
              router.push({
                pathname: '/partida/[partida]/avaliar/[jogador]',
                params: { partida, jogador: item.id },
              })
            }
            aoAvaliarInicial={() =>
              router.push({ pathname: '/avaliar-inicial/[jogador]', params: { jogador: item.id } })
            }
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
  if (carregando) return <ActivityIndicator color={tema.primaria} style={estilos.espera} />;

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
  jaAvaliadoInicialmente,
  partidaAberta,
  aoAvaliarPartida,
  aoAvaliarInicial,
}: {
  jogador: Jogador;
  souEu: boolean;
  rating: Rating | null;
  jaAvaliadoInicialmente: boolean;
  partidaAberta: string | null;
  aoAvaliarPartida: (partida: string) => void;
  aoAvaliarInicial: () => void;
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
          <>
            <Text style={estilos.semRating}>–</Text>
            {/*
              Legenda do traco, e nada alem disso. Aqui aparecia a contagem de
              avaliadores, que era o caminho mais barato para deduzir voto
              alheio: com (contagem, rating) antes e depois de uma partida, a
              media bayesiana se inverte e entrega a nota exata. Ver a 0016.

              Este texto depende so de `confiavel`, entao carrega o mesmo bit que
              o traco ao lado ja carrega -- e nenhum a mais.
            */}
            <Text style={estilos.aindaSemNota}>poucas avaliações</Text>
          </>
        )}

        {/*
          Tres estados, nesta ordem de prioridade:
          partida aberta em comum vence tudo -- e a via normal do produto;
          senao, a inicial, se ainda nao foi feita;
          senao, nada a fazer ate a proxima partida juntos.
        */}
        {souEu ? null : partidaAberta ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Avaliar ${jogador.nome} pela partida`}
            hitSlop={espaco.n2}
            onPress={() => aoAvaliarPartida(partidaAberta)}
            style={({ pressed }) => [estilos.botao, estilos.botaoPartida, pressed && estilos.pressionado]}>
            <Text style={estilos.textoDoBotaoPartida}>avaliar partida</Text>
          </Pressable>
        ) : !jaAvaliadoInicialmente ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Fazer a avaliação inicial de ${jogador.nome}`}
            hitSlop={espaco.n2}
            onPress={aoAvaliarInicial}
            style={({ pressed }) => [estilos.botao, pressed && estilos.pressionado]}>
            <Text style={estilos.textoDoBotao}>avaliar</Text>
          </Pressable>
        ) : (
          <Text style={estilos.aguardando}>após jogarem juntos</Text>
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: tema.fundo,
    flex: 1,
    paddingHorizontal: espaco.n4,
  },
  cabecalho: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: espaco.n2,
    justifyContent: 'space-between',
    paddingTop: espaco.n4,
  },
  titulo: {
    color: tema.texto,
    fontSize: 28,
    fontWeight: '800',
  },
  contagem: {
    color: tema.textoFraco,
    fontSize: 14,
  },
  busca: {
    backgroundColor: tema.superficieAfundada,
    borderColor: tema.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    color: tema.texto,
    fontSize: 15,
    marginTop: espaco.n4,
    minHeight: 44,
    paddingHorizontal: espaco.n4,
  },
  lista: {
    gap: espaco.n2,
    paddingVertical: espaco.n4,
  },
  cartao: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderRadius: raio.md,
    flexDirection: 'row',
    gap: espaco.n4,
    padding: espaco.n2,
  },
  identificacao: {
    flex: 1,
    gap: 2,
  },
  linhaDoNome: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: espaco.n2,
  },
  nome: {
    color: tema.texto,
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  etiqueta: {
    color: tema.primaria,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  detalhe: {
    color: tema.textoFraco,
    fontSize: 13,
  },
  pendencia: {
    backgroundColor: tema.superficie,
    borderColor: tema.primaria,
    borderRadius: raio.lg,
    borderWidth: 1,
    gap: 2,
    marginTop: espaco.n4,
    padding: espaco.n4,
  },
  tituloDaPendencia: { color: tema.primaria, fontSize: 15, fontWeight: '800' },
  textoDaPendencia: { color: tema.texto, fontSize: 14, lineHeight: 20 },
  acaoDaPendencia: { color: tema.primaria, fontSize: 13, fontWeight: '700', paddingTop: espaco.n1 },
  direita: {
    alignItems: 'flex-end',
    gap: 2,
  },
  rating: {
    color: tema.texto,
    fontSize: 22,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  semRating: {
    color: tema.textoFraco,
    fontSize: 22,
    fontWeight: '800',
  },
  aindaSemNota: {
    color: tema.textoFraco,
    fontSize: 12,
  },
  botao: {
    borderColor: tema.primaria,
    borderRadius: raio.sm,
    borderWidth: 1,
    marginTop: espaco.n1,
    paddingHorizontal: espaco.n2,
    paddingVertical: 5,
  },
  botaoPartida: { backgroundColor: tema.primaria, borderColor: tema.primaria },
  textoDoBotao: { color: tema.primaria, fontSize: 12, fontWeight: '700' },
  textoDoBotaoPartida: { color: tema.sobrePrimaria, fontSize: 12, fontWeight: '700' },
  aguardando: { color: tema.textoFraco, fontSize: 11, marginTop: espaco.n1, textAlign: 'right' },
  pressionado: {
    opacity: 0.7,
  },
  espera: {
    marginTop: espaco.n12,
  },
  vazio: {
    color: tema.textoFraco,
    fontSize: 15,
    marginTop: espaco.n12,
    textAlign: 'center',
  },
});
