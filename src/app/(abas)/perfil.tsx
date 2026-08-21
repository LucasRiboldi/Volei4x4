import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { espaco, tema } from '@/design/tema';
import { useAuth } from '@/contexts/auth';
import { sair } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';
import { enviarFotoDePerfil, escolherImagem } from '@/lib/fotos';
import {
  APELIDO_MAXIMO,
  CIDADE_MAXIMA,
  NOME_MAXIMO,
  NOME_MINIMO,
  garantirMeuPerfil,
  salvarPerfil,
} from '@/lib/jogadores';

export default function Perfil() {
  const { sessao } = useAuth();
  const router = useRouter();

  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [cidade, setCidade] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [souAdmin, setSouAdmin] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [saindo, setSaindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        const perfil = await garantirMeuPerfil();
        if (!ativo) return;

        setNome(perfil.nome);
        setApelido(perfil.apelido ?? '');
        setCidade(perfil.cidade ?? '');
        setFotoUrl(perfil.foto_url);
        setSouAdmin(perfil.admin);
      } catch (e) {
        if (ativo) setErro(mensagemDeErro(e, 'Não foi possível carregar seu perfil.'));
      } finally {
        if (ativo) setCarregando(false);
      }
    }

    void carregar();
    return () => {
      ativo = false;
    };
  }, []);

  const nomeValido = nome.trim().length >= NOME_MINIMO;

  async function aoTrocarFoto() {
    setErro(null);
    setAviso(null);
    try {
      const imagem = await escolherImagem();
      // Fechar a galeria sem escolher nada nao e erro que valha uma mensagem.
      if (!imagem) return;

      setEnviandoFoto(true);
      setFotoUrl(await enviarFotoDePerfil(imagem));
      setAviso('Foto atualizada.');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível enviar a foto. Tente de novo.'));
    } finally {
      setEnviandoFoto(false);
    }
  }

  // sair() lanca quando o signOut falha. Ligada crua no onPress, a rejeicao
  // ficaria sem dono e a pessoa seguiria logada sem aviso nenhum.
  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
      // Nao navegamos daqui: o guarda de rota reage a sessao nula.
    } catch (e) {
      Alert.alert('Sair', mensagemDeErro(e, 'Não foi possível sair. Tente de novo.'));
      setSaindo(false);
    }
  }

  async function aoSalvar() {
    if (!nomeValido) return;
    setErro(null);
    setAviso(null);
    setSalvando(true);
    try {
      await salvarPerfil({ nome, apelido, cidade });
      setAviso('Perfil salvo.');
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível salvar. Tente de novo.'));
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={[estilos.tela, estilos.centralizado]}>
        <ActivityIndicator color={tema.primaria} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={estilos.tela}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={estilos.flex}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.cabecalho}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Trocar foto de perfil"
              disabled={enviandoFoto}
              onPress={() => void aoTrocarFoto()}
              style={({ pressed }) => [estilos.alvoDaFoto, pressed && estilos.pressionado]}>
              <Avatar nome={nome} fotoUrl={fotoUrl} tamanho={88} />
              {enviandoFoto ? (
                <View style={estilos.sobreposicaoDaFoto}>
                  <ActivityIndicator color={tema.texto} />
                </View>
              ) : null}
            </Pressable>

            <View style={estilos.identificacao}>
              <Text style={estilos.titulo}>Meu perfil</Text>
              <Text style={estilos.email}>{sessao?.user.email}</Text>
              <Text style={estilos.dicaDaFoto} onPress={() => void aoTrocarFoto()}>
                {fotoUrl ? 'Trocar foto' : 'Adicionar foto'}
              </Text>
            </View>
          </View>

          <View style={estilos.grupo}>
            <Campo
              rotulo="Nome"
              autoCapitalize="words"
              editable={!salvando}
              erro={!nomeValido && nome !== '' ? `Mínimo de ${NOME_MINIMO} letras.` : null}
              maxLength={NOME_MAXIMO}
              onChangeText={setNome}
              placeholder="Seu nome"
              value={nome}
            />
            <Campo
              rotulo="Apelido"
              autoCapitalize="words"
              editable={!salvando}
              maxLength={APELIDO_MAXIMO}
              onChangeText={setApelido}
              placeholder="Como te chamam na quadra"
              value={apelido}
            />
            <Campo
              rotulo="Cidade"
              autoCapitalize="words"
              editable={!salvando}
              maxLength={CIDADE_MAXIMA}
              onChangeText={setCidade}
              placeholder="Onde você joga"
              value={cidade}
            />
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
          {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

          {souAdmin ? (
            <Botao
              titulo="Administração"
              variante="secundario"
              aoTocar={() => router.push('/admin')}
            />
          ) : null}

          <View style={estilos.acoes}>
            <Botao
              titulo="Salvar perfil"
              aoTocar={() => void aoSalvar()}
              carregando={salvando}
              desativado={!nomeValido}
            />
            <Botao
              titulo="Sair da conta"
              variante="secundario"
              aoTocar={() => void aoSair()}
              carregando={saindo}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: tema.fundo,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centralizado: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  conteudo: {
    gap: espaco.n6,
    padding: espaco.n6,
  },
  cabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: espaco.n4,
  },
  alvoDaFoto: {
    position: 'relative',
  },
  sobreposicaoDaFoto: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 44,
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  pressionado: {
    opacity: 0.7,
  },
  identificacao: {
    flex: 1,
    gap: espaco.n1,
  },
  titulo: {
    color: tema.texto,
    fontSize: 26,
    fontWeight: '800',
  },
  email: {
    color: tema.textoFraco,
    fontSize: 14,
  },
  dicaDaFoto: {
    color: tema.primaria,
    fontSize: 14,
    fontWeight: '600',
    marginTop: espaco.n1,
  },
  grupo: {
    gap: espaco.n4,
  },
  acoes: {
    gap: espaco.n2,
  },
  erro: {
    color: tema.erro,
    fontSize: 14,
    fontWeight: '600',
  },
  aviso: {
    color: tema.sucesso,
    fontSize: 14,
    fontWeight: '600',
  },
});
