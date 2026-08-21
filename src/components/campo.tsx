import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { espaco, quebras, raio, tema, tipografia } from '@/design/tema';

type Props = TextInputProps & {
  rotulo: string;
  erro?: string | null;
};

export function Campo({ rotulo, erro, style, ...resto }: Props) {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={tema.textoFraco}
        style={[estilos.campo, erro ? estilos.campoComErro : null, style]}
        {...resto}
      />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espaco.n2,
  },
  rotulo: {
    color: tema.textoFraco,
    fontSize: 14,
    fontWeight: '600',
  },
  campo: {
    backgroundColor: tema.superficieAfundada,
    borderColor: tema.borda,
    borderRadius: raio.sm,
    borderWidth: 1,
    color: tema.texto,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: espaco.n4,
  },
  campoComErro: {
    borderColor: tema.erro,
  },
  erro: {
    color: tema.erro,
    fontSize: 13,
  },
});
