import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { mensagemDeErro } from '@/lib/erros';
import { listarJogadores, type Jogador } from '@/lib/jogadores';

export default function Jogadores() {
  const { sessao } = useAuth();
  const meuId = sessao?.user.id;

  // null enquanto a primeira busca nao voltou -- diferente de [], que ja e a
  // resposta "nao ha ninguem cadastrado".
  const [jogadores, setJogadores] = useState<Jogador[] | null>(null);
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (continuaValendo: () => boolean) => {
    try {
      setErro(null);
      const lista = await listarJogadores();
      if (continuaValendo()) setJogadores(lista);
    } catch (e) {
      if (continuaValendo()) {
        setErro(mensagemDeErro(e, 'Não foi possível carregar os jogadores.'));
      }
    }
  }, []);

  // Recarrega ao voltar do perfil, que pode ter mudado nome ou foto sem avisar
  // esta tela.
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
        renderItem={({ item }) => <Linha jogador={item} souEu={item.id === meuId} />}
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

function Linha({ jogador, souEu }: { jogador: Jogador; souEu: boolean }) {
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

      {/*
        O rating e o botao de avaliar entram nas etapas 04 e 05. Ate la a linha
        mostra so quem e a pessoa -- numero inventado aqui viraria uma tela que
        finge funcionar, que e justamente o que o documento do projeto proibe.
      */}
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
