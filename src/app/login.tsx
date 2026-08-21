import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { espaco, quebras, raio, tema, tipografia } from '@/design/tema';
import { entrarComEmail } from '@/lib/auth';
import { mensagemDeErro } from '@/lib/erros';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeEnviar = email.trim() !== '' && senha !== '';

  async function aoEntrar() {
    if (!podeEnviar) return;
    setErro(null);
    setEntrando(true);
    try {
      await entrarComEmail(email, senha);
      // Nao navegamos daqui: o guarda de rota reage a sessao nova.
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível entrar. Tente de novo.'));
      setEntrando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={estilos.marca}>
          <Text style={estilos.titulo}>Vôlei 4x4</Text>
          <Text style={estilos.subtitulo}>Times equilibrados, sem discussão.</Text>
        </View>

        <View style={estilos.formulario}>
          <Campo
            rotulo="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!entrando}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            value={email}
          />
          <Campo
            rotulo="Senha"
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!entrando}
            onChangeText={setSenha}
            onSubmitEditing={() => void aoEntrar()}
            placeholder="Sua senha"
            returnKeyType="go"
            secureTextEntry
            value={senha}
          />
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </View>

        <View style={estilos.acoes}>
          <Botao
            titulo="Entrar"
            aoTocar={() => void aoEntrar()}
            carregando={entrando}
            desativado={!podeEnviar}
          />
          <Botao
            titulo="Criar conta"
            variante="secundario"
            aoTocar={() => router.push('/cadastro')}
          />
        </View>

        {/*
          O botao do Google entra aqui quando chegar a hora. A camada de
          autenticacao ja isola o provedor, entao sera uma funcao nova em
          src/lib/auth.ts e um botao -- nada alem disso muda.
        */}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    backgroundColor: tema.fundo,
    flex: 1,
  },
  conteudo: {
    flexGrow: 1,
    gap: espaco.n8,
    justifyContent: 'center',
    padding: espaco.n6,
  },
  marca: {
    gap: espaco.n2,
  },
  titulo: {
    color: tema.texto,
    fontSize: 40,
    fontWeight: '800',
    letterSpacing: -1,
  },
  subtitulo: {
    color: tema.primaria,
    fontSize: 16,
  },
  formulario: {
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
});
