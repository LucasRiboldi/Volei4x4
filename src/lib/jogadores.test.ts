import { beforeEach, describe, expect, it, vi } from 'vitest';

import { criarDuplo, type Resposta } from './duplo-do-supabase';

const estado = vi.hoisted(() => ({ duplo: null as unknown }));

vi.mock('./supabase', () => ({
  get supabase() {
    return (estado.duplo as { supabase: unknown }).supabase;
  },
}));

const ok = (data: unknown): Resposta => ({ data, error: null });

const criado = ok({
  id: 'u1', nome: 'devolvido', apelido: null, cidade: null, foto_url: null, admin: false,
});

/**
 * Monta o cenario "a conta existe, o perfil nao" e devolve o nome que
 * `garantirMeuPerfil()` decidiu gravar.
 *
 * ---------------------------------------------------------------------------
 * O que estes casos protegem
 * ---------------------------------------------------------------------------
 *
 * O perfil nasce por DOIS caminhos: o gatilho `ao_criar_usuario`, no banco, e
 * esta funcao, no aplicativo. O gatilho e a via preferida, mas instala-lo em
 * `auth.users` exige um privilegio que nem todo projeto do Supabase concede --
 * e a 0013 tolera essa falha de proposito.
 *
 * Ou seja: os dois caminhos rodam de verdade, em projetos diferentes. Se a
 * ordem de preferencia do nome divergir entre eles, a mesma pessoa nasce
 * chamada de um jeito onde o gatilho funciona e de outro onde nao funciona, e
 * ninguem descobre por que. A ordem esta escrita duas vezes, aqui e no SQL, e
 * estes casos sao o que impede as duas de se separarem em silencio.
 */
// `null` quer dizer "conta sem e-mail". Nao da para usar `undefined` aqui: um
// `undefined` explicito aciona o valor padrao do parametro, e o caso testado
// nunca aconteceria -- foi assim que este teste passou verde errado uma vez.
async function nomeGravado(metadata: Record<string, unknown>, email: string | null = 'fulano@exemplo.com') {
  const duplo = criarDuplo({
    usuario: { id: 'u1', user_metadata: metadata, email: email ?? undefined } as unknown as { id: string },
    // A busca nao acha; o insert seguinte devolve a linha criada.
    sequencias: { jogadores: [ok(null), criado] },
  });
  estado.duplo = duplo;

  const { garantirMeuPerfil } = await import('./jogadores');
  await garantirMeuPerfil();

  const insercao = duplo.escritas.find((e) => e.metodo === 'insert');
  return (insercao?.corpo as { nome: string }).nome;
}

describe('garantirMeuPerfil: a ordem de preferencia do nome', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('prefere `nome`, que e o que o cadastro por e-mail manda', async () => {
    expect(await nomeGravado({ nome: 'Lucas', full_name: 'Nao Eu', name: 'Nem Eu' })).toBe('Lucas');
  });

  it('cai em `full_name` quando nao ha `nome` -- e o que o OAuth costuma mandar', async () => {
    expect(await nomeGravado({ full_name: 'Lucas Riboldi', name: 'Nem Eu' })).toBe('Lucas Riboldi');
  });

  it('cai em `name` depois disso', async () => {
    expect(await nomeGravado({ name: 'Lucas R' })).toBe('Lucas R');
  });

  it('usa o trecho antes do @ quando nao ha metadado nenhum', async () => {
    expect(await nomeGravado({}, 'joao.pereira@exemplo.com')).toBe('joao.pereira');
  });

  it('usa "Jogador" como ultimo recurso -- jogador sem nome quebraria as listas', async () => {
    expect(await nomeGravado({}, null)).toBe('Jogador');
  });

  it('trata metadado em branco como ausente, e nao como nome vazio', async () => {
    // O `nullif(trim(...), '')` do SQL faz exatamente isto. Sem o mesmo cuidado
    // aqui, um espaco no cadastro viraria um jogador chamado " ".
    expect(await nomeGravado({ nome: '   ', full_name: 'Segundo' })).toBe('Segundo');
  });

  it('apara o espaco em volta', async () => {
    expect(await nomeGravado({ nome: '  Lucas  ' })).toBe('Lucas');
  });

  it('corta em 60 caracteres, que e o limite da coluna', async () => {
    const gravado = await nomeGravado({ nome: 'a'.repeat(200) });
    expect(gravado).toHaveLength(60);
  });

  it('ignora metadado que nao e texto', async () => {
    expect(await nomeGravado({ nome: 42, full_name: 'Valido' })).toBe('Valido');
  });
});

describe('garantirMeuPerfil: os dois desfechos', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('nao insere nada quando o perfil ja existe', async () => {
    const existente = { id: 'u1', nome: 'Ja Existo', apelido: null, cidade: null, foto_url: null, admin: false };
    const duplo = criarDuplo({ usuario: { id: 'u1' }, tabelas: { jogadores: ok(existente) } });
    estado.duplo = duplo;

    const { garantirMeuPerfil } = await import('./jogadores');
    const perfil = await garantirMeuPerfil();

    expect(perfil.nome).toBe('Ja Existo');
    expect(duplo.escritas).toEqual([]);
  });

  it('exige sessao', async () => {
    estado.duplo = criarDuplo({ usuario: null, tabelas: { jogadores: ok(null) } });

    const { garantirMeuPerfil } = await import('./jogadores');
    await expect(garantirMeuPerfil()).rejects.toThrow('Você precisa estar logado.');
  });
});

describe('salvarPerfil', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('grava campo opcional em branco como null, e nao como string vazia', async () => {
    // Dois valores para "nao informado" seriam duas maneiras de a mesma coisa
    // aparecer na tela, e um `where cidade is null` que erra metade das vezes.
    const duplo = criarDuplo({ usuario: { id: 'u1' }, tabelas: { jogadores: ok(null) } });
    estado.duplo = duplo;

    const { salvarPerfil } = await import('./jogadores');
    await salvarPerfil({ nome: '  Lucas  ', apelido: '   ', cidade: '' });

    expect(duplo.escritas[0].corpo).toEqual({ nome: 'Lucas', apelido: null, cidade: null });
  });

  it('nao manda `admin` junto -- promover nao passa por aqui', async () => {
    // O grant em `jogadores` e por coluna, e `admin` fica de fora. Mandar o
    // campo faria o Postgres recusar a requisicao inteira, como aconteceu com
    // o upsert do script de semeadura.
    const duplo = criarDuplo({ usuario: { id: 'u1' }, tabelas: { jogadores: ok(null) } });
    estado.duplo = duplo;

    const { salvarPerfil } = await import('./jogadores');
    await salvarPerfil({ nome: 'Lucas', apelido: 'Lu', cidade: 'Esteio' });

    expect(duplo.escritas[0].corpo).not.toHaveProperty('admin');
    expect(duplo.escritas[0].corpo).not.toHaveProperty('id');
  });

  it('exige sessao quando nao recebe jogadorId', async () => {
    estado.duplo = criarDuplo({ usuario: null });

    const { salvarPerfil } = await import('./jogadores');
    await expect(salvarPerfil({ nome: 'A', apelido: '', cidade: '' })).rejects.toThrow(
      'Você precisa estar logado.'
    );
  });
});
