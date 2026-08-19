import { useRouter } from 'expo-router';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Estrelas } from '@/components/estrelas';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { mensagemDeErro } from '@/lib/erros';
import {
  APELIDO_MAXIMO,
  CIDADE_MAXIMA,
  NOME_MAXIMO,
  NOME_MINIMO,
  buscarMinhaAutoavaliacao,
  garantirMeuPerfil,
  salvarAutoavaliacao,
  salvarPerfil,
  type Notas,
} from '@/lib/jogadores';
import { ATRIBUTOS, PRIOR, ROTULO } from '@/nucleo/atributos';

/** Todas as caracteristicas no meio da escala: o ponto de partida neutro. */
function notasIniciais(): Notas {
  return Object.fromEntries(ATRIBUTOS.map((a) => [a, PRIOR])) as Notas;
}

export default function Perfil() {
  const router = useRouter();
  const { sessao } = useAuth();

  const [nome, setNome] = useState('');
  const [apelido, setApelido] = useState('');
  const [cidade, setCidade] = useState('');
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [notas, setNotas] = useState<Notas>(notasIniciais);
  const [jaSeAutoavaliou, setJaSeAutoavaliou] = useState(false);

  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let ativo = true;

    async function carregar() {
      try {
        // Independentes entre si: esperar uma depois da outra dobraria a espera.
        const [perfil, auto] = await Promise.all([
          garantirMeuPerfil(),
          buscarMinhaAutoavaliacao(),
        ]);
        if (!ativo) return;

        setNome(perfil.nome);
        setApelido(perfil.apelido ?? '');
        setCidade(perfil.cidade ?? '');
        setFotoUrl(perfil.foto_url);
        if (auto) {
          setNotas(auto);
          setJaSeAutoavaliou(true);
        }
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

  async function aoSalvar() {
    if (!nomeValido) return;
    setErro(null);
    setAviso(null);
    setSalvando(true);
    try {
      // As duas escritas sao em tabelas diferentes e o PostgREST nao abre
      // transacao entre elas. Em serie de proposito: se a segunda falhar, a
      // pessoa ve o erro com o perfil ja salvo, que e o menos ruim dos dois.
      await salvarPerfil({ nome, apelido, cidade });
      await salvarAutoavaliacao(notas);
      setJaSeAutoavaliou(true);
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
        <ActivityIndicator color={Cores.areia} />
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
            <Avatar nome={nome} fotoUrl={fotoUrl} tamanho={72} />
            <View style={estilos.identificacao}>
              <Text style={estilos.titulo}>Meu perfil</Text>
              <Text style={estilos.email}>{sessao?.user.email}</Text>
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

          <View style={estilos.cartao}>
            <Text style={estilos.tituloDaSecao}>Suas características</Text>
            <Text style={estilos.explicacao}>
              {jaSeAutoavaliou
                ? 'Esta é a sua autoavaliação. Ela vale menos que as notas que o pessoal te dá, e vai perdendo peso conforme você é avaliado.'
                : 'Dê uma nota inicial para si mesmo. Ela serve de ponto de partida enquanto o pessoal ainda não te avaliou.'}
            </Text>

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
          </View>

          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
          {aviso ? <Text style={estilos.aviso}>{aviso}</Text> : null}

          <View style={estilos.acoes}>
            <Botao
              titulo="Salvar perfil"
              aoTocar={() => void aoSalvar()}
              carregando={salvando}
              desativado={!nomeValido}
            />
            <Botao titulo="Voltar" variante="secundario" aoTocar={() => router.back()} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: Cores.fundo,
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
    gap: Espaco.quatro,
    padding: Espaco.quatro,
  },
  cabecalho: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Espaco.tres,
  },
  identificacao: {
    flex: 1,
    gap: Espaco.um,
  },
  titulo: {
    color: Cores.texto,
    fontSize: 26,
    fontWeight: '800',
  },
  email: {
    color: Cores.textoFraco,
    fontSize: 14,
  },
  grupo: {
    gap: Espaco.tres,
  },
  cartao: {
    backgroundColor: Cores.fundoCartao,
    borderRadius: Raio.grande,
    gap: Espaco.dois,
    padding: Espaco.tres,
  },
  tituloDaSecao: {
    color: Cores.texto,
    fontSize: 18,
    fontWeight: '700',
  },
  explicacao: {
    color: Cores.textoFraco,
    fontSize: 13,
    lineHeight: 19,
  },
  caracteristicas: {
    gap: Espaco.tres,
    marginTop: Espaco.dois,
  },
  acoes: {
    gap: Espaco.dois,
  },
  erro: {
    color: Cores.perigo,
    fontSize: 14,
    fontWeight: '600',
  },
  aviso: {
    color: Cores.sucesso,
    fontSize: 14,
    fontWeight: '600',
  },
});
