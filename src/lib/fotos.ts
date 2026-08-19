import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

const BUCKET = 'avatares';

/** O que o bucket aceita. Precisa casar com `allowed_mime_types` da migracao 0005. */
const TIPOS_ACEITOS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

/**
 * Abre a galeria e devolve a imagem escolhida, ou null se a pessoa desistir.
 *
 * `expo-image-picker` existe dentro do Expo Go, entao usar daqui nao fecha o
 * caminho de virar aplicativo depois -- que e a regra registrada no plano.
 */
export async function escolherImagem(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) {
    throw new Error('Precisamos da permissão de acesso às fotos para trocar seu avatar.');
  }

  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // Recorte quadrado: o avatar e sempre exibido em circulo, entao deixar a
    // pessoa enquadrar evita cabeca cortada.
    allowsEditing: true,
    aspect: [1, 1],
    // A imagem e reduzida antes de subir. Foto de celular passa de 3 MB com
    // facilidade, e um avatar exibido a 72 pixels nao precisa disso.
    quality: 0.7,
  });

  if (resultado.canceled) return null;
  return resultado.assets[0] ?? null;
}

/** Descobre a extensao a partir do nome, do mime ou da propria URI. */
function extensaoDe(imagem: ImagePicker.ImagePickerAsset): string {
  const doMime = imagem.mimeType?.split('/')[1]?.toLowerCase();
  if (doMime && TIPOS_ACEITOS[doMime]) return doMime === 'jpeg' ? 'jpg' : doMime;

  const daUri = imagem.uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (daUri && TIPOS_ACEITOS[daUri]) return daUri === 'jpeg' ? 'jpg' : daUri;

  return 'jpg';
}

/**
 * Sobe a imagem e devolve a URL publica.
 *
 * O caminho e `<uid>/avatar.<ext>`, e a primeira pasta ser o uid e o que faz a
 * policy do Storage funcionar: quem envia so alcanca a propria pasta.
 *
 * `upsert` porque cada pessoa tem um avatar so -- trocar a foto substitui, em
 * vez de acumular arquivo orfao a cada troca.
 */
export async function enviarFotoDePerfil(
  imagem: ImagePicker.ImagePickerAsset
): Promise<string> {
  const { data: sessao } = await supabase.auth.getUser();
  const id = sessao.user?.id;
  if (!id) throw new Error('Você precisa estar logado.');

  const extensao = extensaoDe(imagem);
  const caminho = `${id}/avatar.${extensao}`;
  const tipo = TIPOS_ACEITOS[extensao];

  // O picker devolve uma URI (file:// no celular, blob:/data: na web). O fetch
  // resolve as duas formas, e o ArrayBuffer e o que o supabase-js aceita em
  // ambas as plataformas -- passar o objeto do FormData funciona so em uma.
  const resposta = await fetch(imagem.uri);
  const conteudo = await resposta.arrayBuffer();

  if (conteudo.byteLength === 0) {
    throw new Error('A imagem escolhida chegou vazia. Tente outra.');
  }

  const { error: erroDoEnvio } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, conteudo, { contentType: tipo, upsert: true });

  if (erroDoEnvio) throw erroDoEnvio;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(caminho);

  // O caminho nao muda quando a foto e trocada, entao a URL tambem nao -- e o
  // navegador serviria a imagem velha do cache. O parametro derruba isso.
  const url = `${data.publicUrl}?v=${Date.now()}`;

  const { error: erroDoPerfil } = await supabase
    .from('jogadores')
    .update({ foto_url: url })
    .eq('id', id);

  if (erroDoPerfil) throw erroDoPerfil;

  return url;
}
