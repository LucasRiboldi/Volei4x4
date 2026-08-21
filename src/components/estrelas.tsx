import { Pressable, StyleSheet, Text, View } from 'react-native';

import { espaco, quebras, raio, tema, tipografia } from '@/design/tema';
import { NOTA_MAXIMA, NOTA_MINIMA } from '@/nucleo/atributos';

type Props = {
  rotulo: string;
  valor: number;
  aoMudar: (valor: number) => void;
  desativado?: boolean;
};

const ESTRELAS = Array.from(
  { length: NOTA_MAXIMA - NOTA_MINIMA + 1 },
  (_, i) => NOTA_MINIMA + i
);

/**
 * Uma caracteristica, de 1 a 5 estrelas.
 *
 * Cada estrela e um alvo de toque proprio, e nao um slider: em 5 posicoes o
 * toque direto e mais preciso que arrastar, e funciona igual no navegador e no
 * celular sem depender de gesto.
 */
export function Estrelas({ rotulo, valor, aoMudar, desativado = false }: Props) {
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityLabel={rotulo}
      accessibilityValue={{ min: NOTA_MINIMA, max: NOTA_MAXIMA, now: valor }}
      style={estilos.bloco}>
      <View style={estilos.linha}>
        <Text style={estilos.rotulo}>{rotulo}</Text>
        <Text style={estilos.valor}>{valor}</Text>
      </View>

      <View style={estilos.estrelas}>
        {ESTRELAS.map((nota) => {
          const cheia = nota <= valor;
          return (
            <Pressable
              key={nota}
              accessibilityRole="button"
              accessibilityLabel={`${rotulo}: ${nota} de ${NOTA_MAXIMA}`}
              disabled={desativado}
              hitSlop={espaco.n2}
              onPress={() => aoMudar(nota)}
              style={({ pressed }) => [estilos.alvo, pressed && estilos.pressionado]}>
              <Text style={[estilos.estrela, cheia ? estilos.cheia : estilos.vazia]}>
                {cheia ? '\u2605' : '\u2606'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: {
    gap: espaco.n1,
  },
  linha: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rotulo: {
    color: tema.texto,
    fontSize: 15,
    fontWeight: '600',
  },
  valor: {
    color: tema.textoFraco,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  estrelas: {
    flexDirection: 'row',
    gap: espaco.n1,
  },
  alvo: {
    paddingVertical: espaco.n1,
    paddingRight: espaco.n2,
  },
  pressionado: {
    opacity: 0.6,
  },
  estrela: {
    fontSize: 30,
    lineHeight: 36,
  },
  cheia: {
    color: tema.primaria,
  },
  vazia: {
    color: tema.bordaForte,
  },
});
