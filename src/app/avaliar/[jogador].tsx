import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Estrelas } from '@/components/estrelas';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { buscarMinhaAvaliacaoDe, salvarAvaliacao, type Notas } from '@/lib/avaliacoes';
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
  const { jogador } = useLocalSearchParams<{ jogador: string }>();
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
        const [lista, minha] = await Promise.all([
          listarJogadores(),
          buscarMinhaAvaliacaoDe(jogador),
        ]);
        if (!ativo) return;

        setPessoa(lista.find((j) => j.id === jogador) ?? null);

        // Abre com o que voce deu da ultima vez, para a avaliacao ser correcao
        // e nao chute novo a cada rodada.
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
  }, [jogador]);

  async function aoSalvar() {
    setErro(null);
    setSalvando(true);
    try {
      await salvarAvaliacao(jogador, notas);
      // A lista recarrega sozinha ao voltar a ter foco.
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar a avaliação.'));
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Avaliar' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <ActivityIndicator color={Cores.areia} />
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
            Ninguém vê a nota que você deu — nem a pessoa avaliada. O que o grupo enxerga é a
            média de todo mundo. Dá para voltar aqui e mudar quando quiser.
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
    backgroundColor: Cores.fundo,
    flex: 1,
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    gap: Espaco.quatro,
    padding: Espaco.tres,
  },
  cabecalho: {
    alignItems: 'center',
    backgroundColor: Cores.fundoCartao,
    borderRadius: Raio.grande,
    flexDirection: 'row',
    gap: Espaco.tres,
    padding: Espaco.tres,
  },
  identificacao: {
    flex: 1,
    gap: 2,
  },
  nome: {
    color: Cores.texto,
    fontSize: 20,
    fontWeight: '700',
  },
  apelido: {
    color: Cores.textoFraco,
    fontSize: 14,
  },
  caracteristicas: {
    gap: Espaco.tres,
  },
  aviso: {
    color: Cores.textoFraco,
    fontSize: 13,
    lineHeight: 19,
  },
  erro: {
    color: Cores.perigo,
    fontSize: 14,
    fontWeight: '600',
  },
  acoes: {
    padding: Espaco.tres,
  },
});
