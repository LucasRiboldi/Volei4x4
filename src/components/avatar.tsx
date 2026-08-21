import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';

import { espaco, tema } from '@/design/tema';

type Props = {
  nome: string;
  fotoUrl?: string | null;
  tamanho?: number;
};

/** As iniciais, quando nao ha foto. Duas letras no maximo. */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return '?';
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

export function Avatar({ nome, fotoUrl, tamanho = 64 }: Props) {
  const forma = {
    borderRadius: tamanho / 2,
    height: tamanho,
    width: tamanho,
  };

  if (fotoUrl) {
    return <Image source={{ uri: fotoUrl }} style={[estilos.foto, forma]} contentFit="cover" />;
  }

  return (
    <View style={[estilos.vazio, forma]}>
      <Text style={[estilos.iniciais, { fontSize: tamanho * 0.36 }]}>{iniciais(nome)}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  foto: {
    backgroundColor: tema.superficie,
  },
  vazio: {
    alignItems: 'center',
    backgroundColor: tema.superficie,
    borderColor: tema.borda,
    borderWidth: 1,
    justifyContent: 'center',
    padding: espaco.n1,
  },
  iniciais: {
    color: tema.primaria,
    fontWeight: '700',
  },
});
