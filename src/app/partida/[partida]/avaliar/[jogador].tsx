import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Estrelas } from '@/components/estrelas';
import { espaco, raio, tema } from '@/design/tema';
import { avaliarNaPartida, minhasNotasNaPartida, type Notas } from '@/lib/avaliacoes-de-partida';
import { mensagemDeErro } from '@/lib/erros';
import { listarJogadores, type Jogador } from '@/lib/jogadores';
import { ATRIBUTOS, NOTA_NEUTRA, ROTULO } from '@/nucleo/atributos';

/** Todas as caracteristicas no meio da escala: o ponto de partida neutro. */
function notasIniciais(): Notas {
  return Object.fromEntries(ATRIBUTOS.map((a) => [a, NOTA_NEUTRA])) as Notas;
}

export default function Avaliar() {
  // O generic com a string da rota devolveria string | string[], porque o
  // codegen nao distingue [jogador] de [...jogador]. Segmento simples e sempre
  // um valor so, entao o formato de params e o que descreve a rota de verdade.
  const { partida, jogador } = useLocalSearchParams<{ partida: string; jogador: string }>();
  const router = useRouter();

  const [pessoa, setPessoa] = useState<Jogador | null>(null);
  const [notas, setNotas] = useState<Notas>(notasIniciais);
  const [jaAvaliei, setJaAvaliei] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const [lista, minhas] = await Promise.all([
          listarJogadores(),
          minhasNotasNaPartida(partida),
        ]);
        if (!ativo) return;

        setPessoa(lista.find((j) => j.id === jogador) ?? null);

        // Abre com o que voce deu nesta partida, para o segundo toque ser
        // correcao e nao chute novo.
        const minha = minhas.get(jogador);
        if (minha) {
          setNotas(minha);
          setJaAvaliei(true);
        }
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e, 'Não foi possível abrir a avaliação.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [partida, jogador]);

  async function aoSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      await avaliarNaPartida(partida, jogador, notas);
      // A lista recarrega sozinha ao voltar a ter foco.
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar. A janela de avaliação pode ter fechado.'));
      setSalvando(false);
    }
  }

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

  const nome = pessoa?.nome ?? 'Jogador';

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: nome }} />
      <View style={estilos.tela}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.cabecalho}>
            <Avatar nome={nome} fotoUrl={pessoa?.foto_url} tamanho={64} />
            <View style={estilos.identificacao}>
              <Text style={estilos.nome}>{nome}</Text>
              {pessoa?.apelido ? <Text style={estilos.apelido}>{pessoa.apelido}</Text> : null}
            </View>
          </View>

          <View style={estilos.caracteristicas}>
            {ATRIBUTOS.map((atributo) => (
              <Estrelas
                key={atributo}
                rotulo={ROTULO[atributo]}
                valor={notas[atributo]}
                desativado={salvando}
                aoMudar={(valor) => setNotas((atual) => ({ ...atual, [atributo]: valor }))}
              />
            ))}
          </View>

          <Text style={estilos.aviso}>
            Como foi o jogo dele nesta partida? Ninguém vê a nota que você deu — nem a pessoa
            avaliada. O que o grupo enxerga é a média de todo mundo. Dá para corrigir enquanto a
            janela estiver aberta.
          </Text>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </ScrollView>

        <View style={estilos.acoes}>
          <Botao
            titulo={jaAvaliei ? 'Atualizar avaliação' : 'Salvar avaliação'}
            aoTocar={() => void aoSalvar()}
            carregando={salvando}
          />
        </View>
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: tema.fundo,
    flex: 1,
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    gap: espaco.n6,
    padding: espaco.n4,
  },
  cabecalho: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderRadius: raio.lg,
    flexDirection: 'row',
    gap: espaco.n4,
    padding: espaco.n4,
  },
  identificacao: {
    flex: 1,
    gap: 2,
  },
  nome: {
    color: tema.texto,
    fontSize: 20,
    fontWeight: '700',
  },
  apelido: {
    color: tema.textoFraco,
    fontSize: 14,
  },
  caracteristicas: {
    gap: espaco.n4,
  },
  aviso: {
    color: tema.textoFraco,
    fontSize: 13,
    lineHeight: 19,
  },
  erro: {
    color: tema.erro,
    fontSize: 14,
    fontWeight: '600',
  },
  acoes: {
    padding: espaco.n4,
  },
});
