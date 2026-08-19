import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Cores, Espaco, Raio } from '@/constants/theme';

type Props = {
  titulo: string;
  aoTocar: () => void;
  variante?: 'principal' | 'secundario';
  carregando?: boolean;
  desativado?: boolean;
  estilo?: ViewStyle;
};

export function Botao({
  titulo,
  aoTocar,
  variante = 'principal',
  carregando = false,
  desativado = false,
  estilo,
}: Props) {
  const bloqueado = desativado || carregando;
  const secundario = variante === 'secundario';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: bloqueado, busy: carregando }}
      disabled={bloqueado}
      onPress={aoTocar}
      style={({ pressed }) => [
        estilos.base,
        secundario ? estilos.secundario : estilos.principal,
        bloqueado && estilos.bloqueado,
        pressed && !bloqueado && estilos.pressionado,
        estilo,
      ]}>
      {carregando ? (
        <ActivityIndicator color={secundario ? Cores.texto : Cores.fundo} />
      ) : (
        <Text style={[estilos.titulo, secundario && estilos.tituloSecundario]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: Raio.medio,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Espaco.quatro,
  },
  principal: {
    backgroundColor: Cores.areia,
  },
  secundario: {
    backgroundColor: 'transparent',
    borderColor: Cores.borda,
    borderWidth: 1,
  },
  bloqueado: {
    opacity: 0.45,
  },
  pressionado: {
    opacity: 0.75,
  },
  titulo: {
    color: Cores.fundo,
    fontSize: 16,
    fontWeight: '700',
  },
  tituloSecundario: {
    color: Cores.texto,
  },
});
