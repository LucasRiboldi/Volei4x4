import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { espaco, raio, tema } from '@/design/tema';
import { mensagemDeErro } from '@/lib/erros';
import { listarJogadores, type Jogador } from '@/lib/jogadores';
import { criarPartida } from '@/lib/partidas';
import { mapaDeRatings, type Rating } from '@/lib/ratings';
import { RATING_NEUTRO, TAMANHO_DA_PARTIDA } from '@/nucleo/atributos';
import { sortearTimes, type Divisao, type ModoDeEquilibrio } from '@/nucleo/sorteio';

const MODOS: { valor: ModoDeEquilibrio; rotulo: string }[] = [
  { valor: 'muito-equilibrado', rotulo: 'Equilíbrio' },
  { valor: 'equilibrado', rotulo: 'Meio-termo' },
  { valor: 'mais-aleatorio', rotulo: 'Variedade' },
];

export default function Sorteio() {
  const [jogadores, setJogadores] = useState<Jogador[] | null>(null);
  const [ratings, setRatings] = useState<Map<string, Rating>>(new Map());
  const [escolhidos, setEscolhidos] = useState<Set<string>>(new Set());
  const [modo, setModo] = useState<ModoDeEquilibrio>('equilibrado');
  const [divisao, setDivisao] = useState<Divisao | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async (continuaValendo: () => boolean) => {
    try {
      setErro(null);
      const [lista, mapa] = await Promise.all([listarJogadores(), mapaDeRatings()]);
      if (!continuaValendo()) return;
      setJogadores(lista);
      setRatings(mapa);
    } catch (e) {
      if (continuaValendo()) setErro(mensagemDeErro(e, 'Não foi possível carregar os jogadores.'));
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

  const total = escolhidos.size;
  const completo = total === TAMANHO_DA_PARTIDA;

  function alternar(id: string) {
    setAviso(null);
    setEscolhidos((atual) => {
      const proximo = new Set(atual);
      if (proximo.has(id)) proximo.delete(id);
      // Sem passar de oito: bloquear aqui evita o erro depois do toque.
      else if (proximo.size < TAMANHO_DA_PARTIDA) proximo.add(id);
      return proximo;
    });
  }

  function aoSortear() {
    if (!completo) return;
    setErro(null);
    setAviso(null);

    const comRating = [...escolhidos].map((id) => ({
      id,
      // Quem ainda nao tem avaliadores suficientes entra pelo valor neutro que o
      // banco devolve. Chutar outro numero aqui inventaria diferenca que nao existe.
      //
      // O `??` cobre outro caso: alguem que nao veio no mapa -- um cadastro
      // entre esta busca e a da lista. Ali o neutro tambem e a resposta certa.
      // Era zero, que e o piso da escala: aquela pessoa entraria como o pior
      // jogador possivel e desequilibraria os times sem aviso.
      rating: ratings.get(id)?.rating ?? RATING_NEUTRO,
    }));

    setDivisao(sortearTimes(comRating, modo));
  }

  async function aoRegistrar() {
    if (!divisao) return;
    setErro(null);
    setSalvando(true);
    try {
      await criarPartida(divisao);
      setAviso('Partida registrada. As avaliações abrem amanhã.');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível registrar a partida.'));
    } finally {
      setSalvando(false);
    }
  }

  if (jogadores === null) {
    return (
      <SafeAreaView edges={['top']} style={[estilos.tela, estilos.centralizado]}>
        <ActivityIndicator color={tema.primaria} />
      </SafeAreaView>
    );
  }

  if (divisao) {
    return (
      <SafeAreaView edges={['top']} style={estilos.tela}>
        <ScrollView contentContainerStyle={estilos.resultado}>
          <Text style={estilos.titulo}>Times definidos</Text>

          <CartaDoTime
            nome="Time A"
            ids={divisao.timeA}
            forca={divisao.forcaA}
            jogadores={jogadores}
          />
          <CartaDoTime
            nome="Time B"
            ids={divisao.timeB}
            forca={divisao.forcaB}
            jogadores={jogadores}
          />

          <View style={estilos.diferenca}>
            <Text style={estilos.rotuloDaDiferenca}>Diferença entre os times</Text>
            <Text style={estilos.valorDaDiferenca}>{divisao.diferenca.toFixed(2)}</Text>
            <Text style={estilos.explicacao}>
              A força é uma estimativa a partir das avaliações do grupo, não uma medida exata.
            </Text>
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
          {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

          <View style={estilos.acoes}>
            <Botao
              titulo="Registrar partida"
              aoTocar={() => void aoRegistrar()}
              carregando={salvando}
              desativado={aviso !== null}
            />
            <Botao titulo="Sortear de novo" variante="secundario" aoTocar={aoSortear} />
            <Botao
              titulo="Mudar quem joga"
              variante="secundario"
              aoTocar={() => {
                setDivisao(null);
                setAviso(null);
              }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={estilos.tela}>
      <View style={estilos.cabecalho}>
        <Text style={estilos.titulo}>Sorteio</Text>
        <Text style={estilos.contagem}>
          {total} de {TAMANHO_DA_PARTIDA}
        </Text>
      </View>

      <View style={estilos.modos}>
        {MODOS.map((m) => (
          <Pressable
            key={m.valor}
            accessibilityRole="button"
            accessibilityState={{ selected: modo === m.valor }}
            onPress={() => setModo(m.valor)}
            style={[estilos.modo, modo === m.valor && estilos.modoAtivo]}>
            <Text style={[estilos.textoDoModo, modo === m.valor && estilos.textoDoModoAtivo]}>
              {m.rotulo}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        contentContainerStyle={estilos.lista}
        data={jogadores}
        keyExtractor={(j) => j.id}
        ListEmptyComponent={<Text style={estilos.vazio}>Ninguém cadastrado ainda.</Text>}
        renderItem={({ item }) => (
          <LinhaDePresenca
            jogador={item}
            rating={ratings.get(item.id) ?? null}
            marcado={escolhidos.has(item.id)}
            bloqueado={!escolhidos.has(item.id) && completo}
            aoTocar={() => alternar(item.id)}
          />
        )}
      />

      <View style={estilos.rodape}>
        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        <Botao
          titulo={completo ? 'Sortear times' : `Escolha mais ${TAMANHO_DA_PARTIDA - total}`}
          aoTocar={aoSortear}
          desativado={!completo}
        />
      </View>
    </SafeAreaView>
  );
}

function LinhaDePresenca({
  jogador,
  rating,
  marcado,
  bloqueado,
  aoTocar,
}: {
  jogador: Jogador;
  rating: Rating | null;
  marcado: boolean;
  bloqueado: boolean;
  aoTocar: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado, disabled: bloqueado }}
      accessibilityLabel={jogador.nome}
      disabled={bloqueado}
      onPress={aoTocar}
      style={({ pressed }) => [
        estilos.presenca,
        marcado && estilos.presencaMarcada,
        bloqueado && estilos.presencaBloqueada,
        pressed && estilos.pressionado,
      ]}>
      <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
        {marcado ? <Text style={estilos.marca}>✓</Text> : null}
      </View>

      <Avatar nome={jogador.nome} fotoUrl={jogador.foto_url} tamanho={36} />

      <Text style={estilos.nome} numberOfLines={1}>
        {jogador.apelido || jogador.nome}
      </Text>

      <Text style={rating?.confiavel ? estilos.rating : estilos.semRating}>
        {rating?.confiavel ? rating.rating.toFixed(1) : '–'}
      </Text>
    </Pressable>
  );
}

function CartaDoTime({
  nome,
  ids,
  forca,
  jogadores,
}: {
  nome: string;
  ids: string[];
  forca: number;
  jogadores: Jogador[];
}) {
  const doTime = ids
    .map((id) => jogadores.find((j) => j.id === id))
    .filter((j): j is Jogador => j !== undefined)
    // Alfabetica, e nao a ordem de escolha: a ordem de escolha e o ranking.
    .sort((a, b) => a.nome.localeCompare(b.nome));

  return (
    <View style={estilos.carta}>
      <View style={estilos.tituloDaCarta}>
        <Text style={estilos.nomeDoTime}>{nome}</Text>
        <Text style={estilos.forca}>{forca.toFixed(2)}</Text>
      </View>
      {doTime.map((j) => (
        <View key={j.id} style={estilos.jogadorDoTime}>
          <Avatar nome={j.nome} fotoUrl={j.foto_url} tamanho={32} />
          <Text style={estilos.nomeNoTime} numberOfLines={1}>
            {j.nome}
          </Text>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { backgroundColor: tema.fundo, flex: 1, paddingHorizontal: espaco.n4 },
  centralizado: { alignItems: 'center', justifyContent: 'center' },
  cabecalho: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: espaco.n4,
  },
  titulo: { color: tema.texto, fontSize: 28, fontWeight: '800' },
  contagem: { color: tema.primaria, fontSize: 15, fontWeight: '700' },
  modos: { flexDirection: 'row', gap: espaco.n2, marginTop: espaco.n4 },
  modo: {
    backgroundColor: tema.superficie,
    borderColor: tema.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    flex: 1,
    paddingVertical: espaco.n2,
  },
  modoAtivo: { backgroundColor: tema.primaria, borderColor: tema.primaria },
  textoDoModo: { color: tema.textoFraco, fontSize: 13, fontWeight: '700', textAlign: 'center' },
  textoDoModoAtivo: { color: tema.sobrePrimaria },
  lista: { gap: espaco.n2, paddingVertical: espaco.n4 },
  presenca: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: 'transparent',
    borderRadius: raio.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: espaco.n2,
    padding: espaco.n2,
  },
  presencaMarcada: { borderColor: tema.primaria },
  presencaBloqueada: { opacity: 0.4 },
  pressionado: { opacity: 0.7 },
  caixa: {
    alignItems: 'center',
    borderColor: tema.borda,
    borderRadius: 4,
    borderWidth: 2,
    height: 22,
    justifyContent: 'center',
    width: 22,
  },
  caixaMarcada: { backgroundColor: tema.primaria, borderColor: tema.primaria },
  marca: { color: tema.sobrePrimaria, fontSize: 14, fontWeight: '900' },
  nome: { color: tema.texto, flex: 1, fontSize: 15, fontWeight: '600' },
  rating: { color: tema.texto, fontSize: 16, fontVariant: ['tabular-nums'], fontWeight: '800' },
  semRating: { color: tema.textoFraco, fontSize: 16, fontWeight: '800' },
  rodape: { gap: espaco.n2, paddingBottom: espaco.n4 },
  vazio: { color: tema.textoFraco, marginTop: espaco.n12, textAlign: 'center' },
  resultado: { gap: espaco.n4, paddingBottom: espaco.n6, paddingTop: espaco.n4 },
  carta: { backgroundColor: tema.superficie, borderRadius: raio.lg, gap: espaco.n2, padding: espaco.n4 },
  tituloDaCarta: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  nomeDoTime: { color: tema.primaria, fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  forca: { color: tema.texto, fontSize: 20, fontVariant: ['tabular-nums'], fontWeight: '800' },
  jogadorDoTime: { alignItems: 'center', flexDirection: 'row', gap: espaco.n2 },
  nomeNoTime: { color: tema.texto, flex: 1, fontSize: 16, fontWeight: '600' },
  diferenca: { alignItems: 'center', gap: espaco.n1, paddingVertical: espaco.n2 },
  rotuloDaDiferenca: { color: tema.textoFraco, fontSize: 13 },
  valorDaDiferenca: { color: tema.texto, fontSize: 32, fontVariant: ['tabular-nums'], fontWeight: '800' },
  explicacao: { color: tema.textoFraco, fontSize: 12, textAlign: 'center' },
  acoes: { gap: espaco.n2 },
  erro: { color: tema.erro, fontSize: 14, fontWeight: '600' },
  aviso: { color: tema.sucesso, fontSize: 14, fontWeight: '600' },
});
