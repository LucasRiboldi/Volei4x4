import { ActivityIndicator, Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { espaco, raio, tema } from '@/design/tema';

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
        <ActivityIndicator color={secundario ? tema.texto : tema.sobrePrimaria} />
      ) : (
        <Text style={[estilos.titulo, secundario && estilos.tituloSecundario]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: raio.md,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: espaco.n6,
  },
  principal: {
    backgroundColor: tema.primaria,
  },
  secundario: {
    backgroundColor: 'transparent',
    borderColor: tema.borda,
    borderWidth: 1,
  },
  bloqueado: {
    opacity: 0.45,
  },
  pressionado: {
    opacity: 0.75,
  },
  titulo: {
    color: tema.sobrePrimaria,
    fontSize: 16,
    fontWeight: '700',
  },
  tituloSecundario: {
    color: tema.texto,
  },
});
