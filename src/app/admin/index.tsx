import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { espaco, raio, tema } from '@/design/tema';
import { useAuth } from '@/contexts/auth';
import { mensagemDeErro } from '@/lib/erros';
import { listarJogadores, type Jogador } from '@/lib/jogadores';

/**
 * A lista de quem o administrador pode editar.
 *
 * A tela some para quem nao e admin, mas isso e conveniencia, nao seguranca:
 * quem decide de verdade e a policy de update no banco, que casa com zero
 * linhas para os demais. Interface escondida nao protege nada.
 */
export default function Administracao() {
  const router = useRouter();
  const { sessao } = useAuth();
  const [jogadores, setJogadores] = useState<Jogador[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async (continuaValendo: () => boolean) => {
    try {
      setErro(null);
      const lista = await listarJogadores();
      if (continuaValendo()) setJogadores(lista);
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

  const souAdmin = jogadores?.find((j) => j.id === sessao?.user.id)?.admin ?? false;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Administração' }} />
      <View style={estilos.tela}>
        {jogadores === null ? (
          <ActivityIndicator color={tema.primaria} style={estilos.espera} />
        ) : !souAdmin ? (
          <Text style={estilos.aviso}>Esta área é só para administradores.</Text>
        ) : (
          <FlatList
            contentContainerStyle={estilos.lista}
            data={jogadores}
            keyExtractor={(j) => j.id}
            ListHeaderComponent={
              <Text style={estilos.explicacao}>
                Toque em alguém para corrigir nome, apelido ou cidade. As avaliações continuam
                privadas — nem o administrador as vê.
              </Text>
            }
            renderItem={({ item }) => (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Editar ${item.nome}`}
                onPress={() =>
                  router.push({ pathname: '/editar/[jogador]', params: { jogador: item.id } })
                }
                style={({ pressed }) => [estilos.cartao, pressed && estilos.pressionado]}>
                <Avatar nome={item.nome} fotoUrl={item.foto_url} tamanho={40} />
                <View style={estilos.identificacao}>
                  <Text style={estilos.nome} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  <Text style={estilos.detalhe} numberOfLines={1}>
                    {[item.apelido, item.cidade].filter(Boolean).join(' · ') || 'sem detalhes'}
                  </Text>
                </View>
                {item.admin ? <Text style={estilos.etiqueta}>admin</Text> : null}
              </Pressable>
            )}
          />
        )}
        {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
      </View>
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { backgroundColor: tema.fundo, flex: 1, paddingHorizontal: espaco.n4 },
  espera: { marginTop: espaco.n12 },
  aviso: { color: tema.textoFraco, marginTop: espaco.n12, textAlign: 'center' },
  explicacao: { color: tema.textoFraco, fontSize: 13, lineHeight: 19, paddingVertical: espaco.n4 },
  lista: { gap: espaco.n2, paddingBottom: espaco.n4 },
  cartao: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderRadius: raio.md,
    flexDirection: 'row',
    gap: espaco.n2,
    padding: espaco.n2,
  },
  pressionado: { opacity: 0.7 },
  identificacao: { flex: 1, gap: 2 },
  nome: { color: tema.texto, fontSize: 16, fontWeight: '700' },
  detalhe: { color: tema.textoFraco, fontSize: 13 },
  etiqueta: { color: tema.primaria, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  erro: { color: tema.erro, fontSize: 14, fontWeight: '600', paddingBottom: espaco.n4 },
});
