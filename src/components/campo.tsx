import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { Cores, Espaco, Raio } from '@/constants/theme';

type Props = TextInputProps & {
  rotulo: string;
  erro?: string | null;
};

export function Campo({ rotulo, erro, style, ...resto }: Props) {
  return (
    <View style={estilos.bloco}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={Cores.textoFraco}
        style={[estilos.campo, erro ? estilos.campoComErro : null, style]}
        {...resto}
      />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: Espaco.dois,
  },
  rotulo: {
    color: Cores.textoFraco,
    fontSize: 14,
    fontWeight: '600',
  },
  campo: {
    backgroundColor: Cores.fundoCampo,
    borderColor: Cores.borda,
    borderRadius: Raio.pequeno,
    borderWidth: 1,
    color: Cores.texto,
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: Espaco.tres,
  },
  campoComErro: {
    borderColor: Cores.perigo,
  },
  erro: {
    color: Cores.perigo,
    fontSize: 13,
  },
});
