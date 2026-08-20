import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Estrelas } from '@/components/estrelas';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { avaliarInicialmente, minhaAvaliacaoInicialDe, type Notas } from '@/lib/avaliacao-inicial';
import { mensagemDeErro } from '@/lib/erros';
import { listarJogadores, type Jogador } from '@/lib/jogadores';
import { ATRIBUTOS, NOTA_NEUTRA, ROTULO } from '@/nucleo/atributos';

function notasIniciais(): Notas {
  return Object.fromEntries(ATRIBUTOS.map((a) => [a, NOTA_NEUTRA])) as Notas;
}

/**
 * A avaliacao inicial de alguem -- a que nao depende de partida.
 *
 * Diferente da pos-partida em um ponto que a tela precisa deixar claro: esta
 * vale uma vez so. Depois de salva, aquela pessoa so volta a ser avaliavel
 * depois de uma partida que voces dois jogaram.
 */
export default function AvaliarInicial() {
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
          minhaAvaliacaoInicialDe(jogador),
        ]);
        if (!ativo) return;

        setPessoa(lista.find((j) => j.id === jogador) ?? null);
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
      await avaliarInicialmente(jogador, notas);
      router.back();
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar. Você já avaliou esta pessoa?'));
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

          {jaAvaliei ? (
            <View style={estilos.jaFeito}>
              <Text style={estilos.tituloDoAviso}>Você já fez sua avaliação inicial</Text>
              <Text style={estilos.textoDoAviso}>
                Ela vale uma vez só. Para avaliar {nome} de novo, é preciso jogarem uma partida
                juntos — aí a avaliação abre no dia seguinte.
              </Text>
            </View>
          ) : (
            <View style={estilos.aviso}>
              <Text style={estilos.tituloDoAviso}>Primeira impressão</Text>
              <Text style={estilos.textoDoAviso}>
                Esta avaliação vale <Text style={estilos.forte}>uma vez só</Text> e não pode ser
                corrigida. Depois dela, {nome} só volta a ser avaliável depois de uma partida que
                vocês dois jogarem.
              </Text>
            </View>
          )}

          <View style={estilos.caracteristicas}>
            {ATRIBUTOS.map((atributo) => (
              <Estrelas
                key={atributo}
                rotulo={ROTULO[atributo]}
                valor={notas[atributo]}
                desativado={salvando || jaAvaliei}
                aoMudar={(valor) => setNotas((atual) => ({ ...atual, [atributo]: valor }))}
              />
            ))}
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </ScrollView>

        <View style={estilos.acoes}>
          {jaAvaliei ? (
            <Botao titulo="Voltar" variante="secundario" aoTocar={() => router.back()} />
          ) : (
            <Botao
              titulo="Salvar avaliação"
              aoTocar={() => void aoSalvar()}
              carregando={salvando}
            />
          )}
        </View>
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { backgroundColor: Cores.fundo, flex: 1 },
  centralizado: { alignItems: 'center', justifyContent: 'center' },
  conteudo: { gap: Espaco.quatro, padding: Espaco.tres },
  cabecalho: {
    alignItems: 'center',
    backgroundColor: Cores.fundoCartao,
    borderRadius: Raio.grande,
    flexDirection: 'row',
    gap: Espaco.tres,
    padding: Espaco.tres,
  },
  identificacao: { flex: 1, gap: 2 },
  nome: { color: Cores.texto, fontSize: 20, fontWeight: '700' },
  apelido: { color: Cores.textoFraco, fontSize: 14 },
  aviso: {
    backgroundColor: Cores.fundoCartao,
    borderColor: Cores.areia,
    borderLeftWidth: 3,
    borderRadius: Raio.pequeno,
    gap: Espaco.um,
    padding: Espaco.tres,
  },
  jaFeito: {
    backgroundColor: Cores.fundoCartao,
    borderColor: Cores.borda,
    borderLeftWidth: 3,
    borderRadius: Raio.pequeno,
    gap: Espaco.um,
    padding: Espaco.tres,
  },
  tituloDoAviso: { color: Cores.texto, fontSize: 15, fontWeight: '700' },
  textoDoAviso: { color: Cores.textoFraco, fontSize: 13, lineHeight: 19 },
  forte: { color: Cores.areia, fontWeight: '700' },
  caracteristicas: { gap: Espaco.tres },
  erro: { color: Cores.perigo, fontSize: 14, fontWeight: '600' },
  acoes: { padding: Espaco.tres },
});
