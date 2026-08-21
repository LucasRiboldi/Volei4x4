import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { espaco, quebras, raio, tema, tipografia } from '@/design/tema';
import { criarConta, SENHA_MINIMA } from '@/lib/auth';
import { emailParece, mensagemDeErro } from '@/lib/erros';

export default function Cadastro() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  // So reclamamos de campo depois da primeira tentativa: avisar enquanto a
  // pessoa ainda esta digitando o e-mail e so barulho.
  const [tentou, setTentou] = useState(false);

  const nomeValido = nome.trim().length >= 2;
  const emailValido = emailParece(email);
  const senhaValida = senha.length >= SENHA_MINIMA;
  const tudoValido = nomeValido && emailValido && senhaValida;

  async function aoCriar() {
    setTentou(true);
    if (!tudoValido) return;

    setErro(null);
    setCriando(true);
    try {
      const sessao = await criarConta({ nome, email, senha });

      // Com confirmacao de e-mail ligada no Supabase, o cadastro nao devolve
      // sessao: a pessoa precisa confirmar antes. Sem ela, ja entra direto e
      // quem navega e o guarda de rota.
      if (sessao === null) {
        router.replace('/login');
        setErro('Conta criada. Confirme o e-mail e entre.');
      }
    } catch (e) {
      setErro(mensagemDeErro(e, 'Não foi possível criar a conta. Tente de novo.'));
      setCriando(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={estilos.tela}>
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View>
          <Text style={estilos.titulo}>Criar conta</Text>
          <Text style={estilos.subtitulo}>
            Depois você completa o perfil e suas características de jogo.
          </Text>
        </View>

        <View style={estilos.formulario}>
          <Campo
            rotulo="Nome"
            autoCapitalize="words"
            autoComplete="name"
            editable={!criando}
            erro={tentou && !nomeValido ? 'Informe seu nome.' : null}
            onChangeText={setNome}
            placeholder="Como te chamam na quadra"
            value={nome}
          />
          <Campo
            rotulo="E-mail"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            editable={!criando}
            erro={tentou && !emailValido ? 'E-mail inválido.' : null}
            inputMode="email"
            onChangeText={setEmail}
            placeholder="voce@exemplo.com"
            value={email}
          />
          <Campo
            rotulo="Senha"
            autoCapitalize="none"
            autoComplete="new-password"
            editable={!criando}
            erro={tentou && !senhaValida ? `Mínimo de ${SENHA_MINIMA} caracteres.` : null}
            onChangeText={setSenha}
            onSubmitEditing={() => void aoCriar()}
            placeholder={`Pelo menos ${SENHA_MINIMA} caracteres`}
            returnKeyType="go"
            secureTextEntry
            value={senha}
          />
          {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
        </View>

        <View style={estilos.acoes}>
          <Botao titulo="Criar conta" aoTocar={() => void aoCriar()} carregando={criando} />
          <Botao titulo="Já tenho conta" variante="secundario" aoTocar={() => router.back()} />
        </View>
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
  titulo: {
    color: tema.texto,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitulo: {
    color: tema.textoFraco,
    fontSize: 15,
    marginTop: espaco.n2,
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
