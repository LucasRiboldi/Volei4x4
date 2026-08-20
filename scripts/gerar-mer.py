"""
Gera `docs/mer.html`: o modelo entidade-relacionamento do banco.

Escrito como gerador, e nao como HTML a mao, porque as coordenadas das caixas e
das linhas sao calculadas. Mexer numa tabela nao exige reposicionar o resto no
olho -- basta mudar a definicao abaixo e rodar de novo.

Uso:  python scripts/gerar-mer.py
"""

import html
import os

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SAIDA = os.path.join(RAIZ, "docs", "mer.html")

LARGURA_CAIXA = 330
ALTURA_TITULO = 46
ALTURA_LINHA = 24
PADDING = 12

# (chave, titulo, subtitulo, x, y, estado, colunas)
# coluna = (nome, tipo, marca)  marca: 'pk' | 'fk' | 'pkfk' | ''
TABELAS = [
    ("auth_users", "auth.users", "Supabase Auth — externa", 40, 40, "externa", [
        ("id", "uuid", "pk"),
        ("email", "text", ""),
        ("encrypted_password", "text", ""),
        ("raw_user_meta_data", "jsonb", ""),
    ]),
    ("jogadores", "jogadores", "A pessoa dentro do jogo", 470, 40, "ativa", [
        ("id", "uuid", "pkfk"),
        ("nome", "text", ""),
        ("apelido", "text", ""),
        ("cidade", "text", ""),
        ("foto_url", "text", ""),
        ("admin", "boolean", ""),
        ("criado_em", "timestamptz", ""),
        ("atualizado_em", "timestamptz", ""),
    ]),
    ("storage", "storage.objects", "bucket avatares — externa", 900, 40, "externa", [
        ("name", "text", "pk"),
        ("bucket_id", "text", ""),
    ]),
    ("partidas", "partidas", "Um jogo, com a janela de avaliacao", 40, 430, "ativa", [
        ("id", "uuid", "pk"),
        ("criada_por", "uuid", "fk"),
        ("jogada_em", "timestamptz", ""),
        ("avaliacao_abre_em", "timestamptz", ""),
        ("avaliacao_fecha_em", "timestamptz", ""),
        ("placar_a", "smallint", ""),
        ("placar_b", "smallint", ""),
        ("criado_em", "timestamptz", ""),
    ]),
    ("partida_jogadores", "partida_jogadores", "Quem jogou, e em que time", 40, 760, "ativa", [
        ("partida_id", "uuid", "pkfk"),
        ("jogador_id", "uuid", "pkfk"),
        ("time_da_partida", "char(1) A|B", ""),
        ("rating_no_momento", "numeric", ""),
    ]),
    ("avaliacoes_de_partida", "avaliacoes_de_partida", "A nota, presa a uma partida", 470, 610, "ativa", [
        ("partida_id", "uuid", "pkfk"),
        ("avaliador_id", "uuid", "pkfk"),
        ("avaliado_id", "uuid", "pkfk"),
        ("ataque … equipe", "8 x smallint 1-5", ""),
        ("criado_em", "timestamptz", ""),
        ("atualizado_em", "timestamptz", ""),
    ]),
    ("avaliacoes", "avaliacoes", "Aposentada — escrita revogada", 900, 430, "aposentada", [
        ("avaliador_id", "uuid", "pkfk"),
        ("avaliado_id", "uuid", "pkfk"),
        ("ataque … equipe", "8 x smallint 1-5", ""),
    ]),
    ("autoavaliacoes", "autoavaliacoes", "Sem uso — fora do produto", 900, 640, "inativa", [
        ("jogador_id", "uuid", "pkfk"),
        ("ataque … equipe", "8 x smallint 1-5", ""),
    ]),
]

# (origem, coluna_origem, destino, coluna_destino, rotulo, lado)
# lado: por onde a linha sai/entra -- 'e' esquerda, 'd' direita
RELACOES = [
    ("jogadores", "id", "auth_users", "id", "1 : 1", "e"),
    ("partidas", "criada_por", "jogadores", "id", "N : 1", "d"),
    ("partida_jogadores", "partida_id", "partidas", "id", "N : 1", "e"),
    ("partida_jogadores", "jogador_id", "jogadores", "id", "N : 1", "d"),
    ("avaliacoes_de_partida", "partida_id", "partidas", "id", "N : 1", "e"),
    ("avaliacoes_de_partida", "avaliador_id", "jogadores", "id", "N : 1", "d"),
    ("avaliacoes", "avaliador_id", "jogadores", "id", "N : 1", "d"),
    ("autoavaliacoes", "jogador_id", "jogadores", "id", "1 : 1", "d"),
]

CORES = {
    "ativa": ("#1A6A8F", "#FFFFFF", "#DDE1E5"),
    "externa": ("#646C75", "#FFFFFF", "#DDE1E5"),
    "aposentada": ("#845808", "#FDF9F0", "#E8D9B8"),
    "inativa": ("#8B939B", "#F7F8FA", "#DDE1E5"),
}


def altura(tab):
    return ALTURA_TITULO + len(tab[6]) * ALTURA_LINHA + PADDING


def por_chave(chave):
    return next(t for t in TABELAS if t[0] == chave)


def y_da_coluna(tab, nome):
    """Centro vertical da linha daquela coluna."""
    for i, (n, _, _) in enumerate(tab[6]):
        if n == nome:
            return tab[4] + ALTURA_TITULO + i * ALTURA_LINHA + ALTURA_LINHA / 2
    return tab[4] + ALTURA_TITULO


def caixa(tab):
    chave, titulo, sub, x, y, estado, colunas = tab
    borda, fundo, linha_cor = CORES[estado]
    h = altura(tab)
    tracejado = ' stroke-dasharray="6 4"' if estado in ("externa", "inativa", "aposentada") else ""

    p = [f'<g class="tabela" data-tabela="{chave}">']
    p.append(
        f'<rect x="{x}" y="{y}" width="{LARGURA_CAIXA}" height="{h}" rx="10" '
        f'fill="{fundo}" stroke="{borda}" stroke-width="2"{tracejado}/>'
    )
    p.append(f'<rect x="{x}" y="{y}" width="{LARGURA_CAIXA}" height="{ALTURA_TITULO}" rx="10" fill="{borda}"/>')
    p.append(f'<rect x="{x}" y="{y+ALTURA_TITULO-10}" width="{LARGURA_CAIXA}" height="10" fill="{borda}"/>')
    p.append(
        f'<text x="{x+14}" y="{y+21}" class="titulo">{html.escape(titulo)}</text>'
        f'<text x="{x+14}" y="{y+37}" class="sub">{html.escape(sub)}</text>'
    )

    for i, (nome, tipo, marca) in enumerate(colunas):
        ly = y + ALTURA_TITULO + i * ALTURA_LINHA
        if i % 2 == 1:
            p.append(f'<rect x="{x+1}" y="{ly}" width="{LARGURA_CAIXA-2}" height="{ALTURA_LINHA}" fill="#00000006"/>')
        etiqueta = {"pk": "PK", "fk": "FK", "pkfk": "PK FK", "": ""}[marca]
        if etiqueta:
            p.append(f'<text x="{x+14}" y="{ly+16}" class="marca">{etiqueta}</text>')
        p.append(f'<text x="{x+66}" y="{ly+16}" class="coluna">{html.escape(nome)}</text>')
        p.append(f'<text x="{x+LARGURA_CAIXA-14}" y="{ly+16}" class="tipo">{html.escape(tipo)}</text>')

    p.append("</g>")
    return "\n".join(p)


def ligacao(rel):
    o, co, d, cd, rotulo, lado = rel
    to, td = por_chave(o), por_chave(d)
    y1, y2 = y_da_coluna(to, co), y_da_coluna(td, cd)

    if lado == "d":
        x1 = to[3] + LARGURA_CAIXA
        x2 = td[3] + LARGURA_CAIXA
        desvio = max(x1, x2) + 40 + (abs(y1 - y2) % 3) * 16
        caminho = f"M {x1} {y1} H {desvio} V {y2} H {x2}"
        tx, ty = desvio + 6, (y1 + y2) / 2
        ancora = "start"
    else:
        x1 = to[3]
        x2 = td[3]
        desvio = min(x1, x2) - 30 - (abs(y1 - y2) % 3) * 14
        caminho = f"M {x1} {y1} H {desvio} V {y2} H {x2}"
        tx, ty = desvio - 6, (y1 + y2) / 2
        ancora = "end"

    return (
        f'<path d="{caminho}" class="rel" marker-end="url(#seta)"/>'
        f'<text x="{tx}" y="{ty}" class="cardinalidade" text-anchor="{ancora}">{rotulo}</text>'
    )


def main():
    largura = max(t[3] + LARGURA_CAIXA for t in TABELAS) + 130
    alto = max(t[4] + altura(t) for t in TABELAS) + 60

    svg = [
        f'<svg viewBox="0 0 {largura} {alto}" xmlns="http://www.w3.org/2000/svg" '
        f'role="img" aria-label="Modelo entidade-relacionamento do banco">',
        '<defs><marker id="seta" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
        'markerHeight="7" orient="auto-start-reverse">'
        '<path d="M 0 0 L 10 5 L 0 10 z" fill="#646C75"/></marker></defs>',
    ]
    svg += [ligacao(r) for r in RELACOES]
    svg += [caixa(t) for t in TABELAS]
    svg.append("</svg>")

    os.makedirs(os.path.dirname(SAIDA), exist_ok=True)
    with open(SAIDA, "w", encoding="utf-8") as f:
        f.write(PAGINA.replace("{{SVG}}", "\n".join(svg)))

    print(f"MER gerado: {SAIDA}")
    print(f"  {len(TABELAS)} tabelas, {len(RELACOES)} relacoes, {largura}x{alto}")


PAGINA = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Vôlei 4x4 — MER do banco</title>
<style>
  :root {
    --fundo: #FDF7EE; --superficie: #FFFFFF; --texto: #1B1F24;
    --fraco: #646C75; --borda: #DDE1E5; --mar: #1A6A8F; --areia: #845808;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; padding: 24px;
    background: var(--fundo); color: var(--texto);
    font: 15px/1.5 -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 1500px; margin: 0 auto; }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.4px; }
  .aviso { color: var(--fraco); margin: 0 0 20px; max-width: 70ch; }
  .quadro {
    background: var(--superficie); border: 1px solid var(--borda);
    border-radius: 14px; padding: 16px; overflow-x: auto;
  }
  svg { display: block; min-width: 1000px; width: 100%; height: auto; }
  .titulo { fill: #fff; font-size: 15px; font-weight: 700; }
  .sub { fill: #ffffffcc; font-size: 11px; }
  .coluna { fill: var(--texto); font-size: 12.5px; }
  .tipo { fill: var(--fraco); font-size: 11px; text-anchor: end; }
  .marca { fill: var(--mar); font-size: 10px; font-weight: 700; letter-spacing: 0.4px; }
  .rel { fill: none; stroke: #646C75; stroke-width: 1.6; }
  .cardinalidade { fill: var(--fraco); font-size: 11px; font-weight: 600; }
  .legenda { display: flex; flex-wrap: wrap; gap: 18px; margin: 18px 0 0; padding: 0; list-style: none; }
  .legenda li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--fraco); }
  .amostra { width: 26px; height: 14px; border-radius: 4px; border: 2px solid; }
  section { margin-top: 32px; }
  h2 { font-size: 18px; margin: 0 0 10px; }
  table { border-collapse: collapse; width: 100%; background: var(--superficie);
          border: 1px solid var(--borda); border-radius: 10px; overflow: hidden; }
  th, td { text-align: left; padding: 9px 12px; border-bottom: 1px solid var(--borda); font-size: 13.5px; }
  th { background: #F7F8FA; font-weight: 700; }
  tr:last-child td { border-bottom: 0; }
  code { background: #F1F3F5; padding: 1px 5px; border-radius: 4px; font-size: 12.5px; }
  footer { margin-top: 32px; color: var(--fraco); font-size: 12.5px; }
</style>
</head>
<body>
<main>
  <h1>Vôlei 4x4 — modelo do banco</h1>
  <p class="aviso">
    Gerado por <code>scripts/gerar-mer.py</code> a partir das migrações em
    <code>supabase/migrations/</code>. As colunas foram conferidas contra o banco real.
    Para atualizar, edite o script e rode de novo — não edite este HTML à mão.
  </p>

  <div class="quadro">
    {{SVG}}
  </div>

  <ul class="legenda">
    <li><span class="amostra" style="border-color:#1A6A8F;background:#fff"></span> em uso</li>
    <li><span class="amostra" style="border-color:#646C75;background:#fff;border-style:dashed"></span> externa (Supabase)</li>
    <li><span class="amostra" style="border-color:#845808;background:#FDF9F0;border-style:dashed"></span> aposentada</li>
    <li><span class="amostra" style="border-color:#8B939B;background:#F7F8FA;border-style:dashed"></span> sem uso</li>
    <li><strong>PK</strong> chave primária &nbsp; <strong>FK</strong> chave estrangeira</li>
  </ul>

  <section>
    <h2>Quem pode ler e escrever o quê</h2>
    <p class="aviso">
      A autorização não está na interface: está em policies de RLS. Esconder um botão
      não protege nada — um <code>curl</code> com a chave pública bate na mesma parede.
    </p>
    <table>
      <tr><th>Tabela</th><th>Ler</th><th>Escrever</th></tr>
      <tr>
        <td><code>jogadores</code></td>
        <td>qualquer pessoa autenticada</td>
        <td>o próprio perfil, ou o administrador.<br>
            A coluna <code>admin</code> não é gravável pela API — o <em>grant</em> é por
            coluna, então ninguém se promove.</td>
      </tr>
      <tr>
        <td><code>partidas</code></td>
        <td>qualquer pessoa autenticada</td>
        <td>criação só por <code>criar_partida()</code>;<br>
            placar só por quem jogou aquela partida</td>
      </tr>
      <tr>
        <td><code>partida_jogadores</code></td>
        <td>qualquer pessoa autenticada</td>
        <td>ninguém — nasce dentro de <code>criar_partida()</code></td>
      </tr>
      <tr>
        <td><code>avaliacoes_de_partida</code></td>
        <td><strong>apenas as notas que você deu</strong></td>
        <td>só se: você jogou, o avaliado jogou a mesma partida,<br>
            vocês são pessoas diferentes, e a janela está aberta</td>
      </tr>
      <tr>
        <td><code>avaliacoes</code></td>
        <td>apenas as suas</td>
        <td>revogada — substituída pela avaliação por partida</td>
      </tr>
      <tr>
        <td><code>autoavaliacoes</code></td>
        <td>apenas a sua</td>
        <td>a sua — mas nenhuma tela escreve nela</td>
      </tr>
    </table>
  </section>

  <section>
    <h2>Funções do banco</h2>
    <table>
      <tr><th>Função</th><th>O que faz</th><th>Quem executa</th></tr>
      <tr><td><code>ratings_dos_jogadores()</code></td>
          <td>agrega as notas em rating, com média bayesiana e piso de confiança</td>
          <td><code>authenticated</code></td></tr>
      <tr><td><code>criar_partida()</code></td>
          <td>grava partida e escalação numa transação; recusa time que não tenha 4</td>
          <td><code>authenticated</code></td></tr>
      <tr><td><code>avaliacao_esta_aberta()</code></td>
          <td>compara <code>now()</code> com a janela gravada</td>
          <td><code>authenticated</code></td></tr>
      <tr><td><code>participou_da_partida()</code></td>
          <td>apoio das policies de avaliação</td>
          <td><code>authenticated</code></td></tr>
      <tr><td><code>e_admin()</code></td>
          <td>apoio da policy de edição de perfil</td>
          <td><code>authenticated</code></td></tr>
      <tr><td><code>marcar_atualizado_em()</code></td>
          <td>gatilho: mantém <code>atualizado_em</code> verdadeiro</td>
          <td>ninguém — só gatilhos</td></tr>
      <tr><td><code>criar_jogador_do_novo_usuario()</code></td>
          <td>criaria o perfil no cadastro — <strong>o gatilho não está instalado</strong>;
              quem cria hoje é o app, no primeiro acesso</td>
          <td>ninguém</td></tr>
    </table>
  </section>

  <section>
    <h2>Três decisões que o desenho registra</h2>
    <table>
      <tr><th>Decisão</th><th>Por quê</th></tr>
      <tr>
        <td>A identidade fica em <code>auth.users</code>, e o jogador em
            <code>jogadores</code></td>
        <td>o e-mail nunca é chave de nada. Trocar de e-mail, ou passar a entrar pelo
            Google, não mexe em nenhum dado do jogo.</td>
      </tr>
      <tr>
        <td><code>rating_no_momento</code> fica congelado em
            <code>partida_jogadores</code></td>
        <td>o rating de hoje não explica um time montado há três semanas.</td>
      </tr>
      <tr>
        <td>A janela de avaliação é <strong>gravada</strong>, não calculada</td>
        <td><code>at time zone</code> não é imutável — regra de fuso muda por lei. E a
            janela combinada não deveria se mover depois.</td>
      </tr>
    </table>
  </section>

  <footer>
    Vôlei 4x4 — diagrama gerado a partir das migrações. Se ele divergir do banco,
    o banco está certo e este arquivo está velho: rode <code>python scripts/gerar-mer.py</code>.
  </footer>
</main>
</body>
</html>
"""

if __name__ == "__main__":
    main()
