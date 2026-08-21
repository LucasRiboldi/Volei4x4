import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { espaco, tema } from '@/design/tema';
import { mensagemDeErro } from '@/lib/erros';
import {
  APELIDO_MAXIMO,
  CIDADE_MAXIMA,
  NOME_MAXIMO,
  NOME_MINIMO,
  listarJogadores,
  salvarPerfil,
  type Jogador,
} from '@/lib/jogadores';

/**
 * Edicao do perfil de outra pessoa, pelo administrador.
 *
 * A foto nao entra aqui: o arquivo vive numa pasta amarrada ao uid de quem
 * envia, e a policy do Storage recusa escrita fora dela. Deixar o botao na tela
 * so produziria um erro no toque. Cada um troca a propria foto.
 */
export default function EditarJogador() {
  const { jogador } = useLocalSearchParams<{ jogador: string }>();
  const router = useRouter();

  const [pessoa, setPessoa] = useState<Jogador | null>(null);
  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [cidade, setCidade] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const lista = await listarJogadores();
        if (!ativo) return;

        const alvo = lista.find((j) => j.id === jogador) ?? null;
        setPessoa(alvo);
        if (alvo) {
          setNome(alvo.nome);
          setApelido(alvo.apelido ?? '');
          setCidade(alvo.cidade ?? '');
        }
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e, 'Não foi possível carregar o jogador.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, [jogador]);

  const nomeValido = nome.trim().length >= NOME_MINIMO;

  async function aoSalvar() {
    if (!nomeValido) return;
    setErro(null);
    setAviso(null);
    setSalvando(true);
    try {
      await salvarPerfil({ nome, apelido, cidade, jogadorId: jogador });
      setAviso('Perfil atualizado.');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar. Você é administrador?'));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Editar' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <ActivityIndicator color={tema.primaria} />
        </View>
      </>
    );
  }

  if (!pessoa) {
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: 'Editar' }} />
        <View style={[estilos.tela, estilos.centralizado]}>
          <Text style={estilos.aviso}>Jogador não encontrado.</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: pessoa.nome }} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.tela}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.cabecalho}>
            <Avatar nome={pessoa.nome} fotoUrl={pessoa.foto_url} tamanho={64} />
            <Text style={estilos.explicacao}>
              A foto só quem troca é a própria pessoa — o arquivo fica numa pasta amarrada ao
              usuário dela.
            </Text>
          </View>

          <View style={estilos.grupo}>
            <Campo
              rotulo="Nome"
              autoCapitalize="words"
              editable={!salvando}
              erro={!nomeValido && nome !== '' ? `Mínimo de ${NOME_MINIMO} letras.` : null}
              maxLength={NOME_MAXIMO}
              onChangeText={setNome}
              placeholder="Nome"
              value={nome}
            />
            <Campo
              rotulo="Apelido"
              autoCapitalize="words"
              editable={!salvando}
              maxLength={APELIDO_MAXIMO}
              onChangeText={setApelido}
              placeholder="Apelido"
              value={apelido}
            />
            <Campo
              rotulo="Cidade"
              autoCapitalize="words"
              editable={!salvando}
              maxLength={CIDADE_MAXIMA}
              onChangeText={setCidade}
              placeholder="Cidade"
              value={cidade}
            />
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
          {aviso ? <Text style={estilos.ok}>{aviso}</Text> : null}

          <View style={estilos.acoes}>
            <Botao
              titulo="Salvar"
              aoTocar={() => void aoSalvar()}
              carregando={salvando}
              desativado={!nomeValido}
            />
            <Botao titulo="Voltar" variante="secundario" aoTocar={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { backgroundColor: tema.fundo, flex: 1 },
  centralizado: { alignItems: 'center', justifyContent: 'center' },
  conteudo: { gap: espaco.n6, padding: espaco.n4 },
  cabecalho: { alignItems: 'center', flexDirection: 'row', gap: espaco.n4 },
  explicacao: { color: tema.textoFraco, flex: 1, fontSize: 13, lineHeight: 19 },
  grupo: { gap: espaco.n4 },
  acoes: { gap: espaco.n2 },
  aviso: { color: tema.textoFraco, textAlign: 'center' },
  erro: { color: tema.erro, fontSize: 14, fontWeight: '600' },
  ok: { color: tema.sucesso, fontSize: 14, fontWeight: '600' },
});
