"""
Semeia partidas e avaliacoes ficticias, para o rating sair do valor neutro.

REVERSIVEL. Tudo o que este script cria fica marcado, e `--desfazer` remove
exatamente isso e nada mais:

  - As partidas criadas aqui tem `jogada_em` num intervalo proprio, listado em
    `scripts/.semeadura.json` junto com os ids gerados.
  - So participam contas do dominio de teste (`@volei4x4-teste.com`). A sua
    conta e a de qualquer pessoa real nunca entram numa partida ficticia, e
    portanto nunca recebem nem dao nota.

Por que isso importa: o rating de um jogador real ficaria contaminado por voto
inventado, e nao haveria como separar depois.

Uso:
  python scripts/semear-avaliacoes.py            cria
  python scripts/semear-avaliacoes.py --desfazer apaga o que foi criado

Le a URL e a anon key do .env.local. Nao usa service_role. A senha das contas
ficticias vem de VOLEI_SENHA_DE_TESTE.
"""

import datetime
import json
import os
import random
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REGISTRO = os.path.join(RAIZ, "scripts", ".semeadura.json")

DOMINIO = "volei4x4-teste.com"

# A senha das contas ficticias vem do ambiente, e nao daqui -- ver o comentario
# longo em `semear.py`, que explica o defeito que isso corrigiu. O nome nao leva
# o prefixo `EXPO_PUBLIC_` porque o Expo embutiria a senha no bundle da web.
VARIAVEL_DA_SENHA = "VOLEI_SENHA_DE_TESTE"

# Quantas partidas semear. Com 4 partidas de 8 jogadores, cada participante
# recebe nota de 7 pessoas por partida -- o suficiente para cruzar o piso de
# confianca, que e 5 avaliadores distintos.
PARTIDAS = 4

ATRIBUTOS = ["ataque", "defesa", "passe", "saque", "bloqueio", "agilidade", "leitura", "equipe"]

# Cada jogador ficticio tem um "nivel" proprio, e as notas oscilam em volta
# dele. Sem isso todo mundo sairia com o mesmo rating e o sorteio nao teria o
# que equilibrar -- que e justamente o que se quer observar.
random.seed(4)


def ler_env():
    caminho = os.path.join(RAIZ, ".env.local")
    if not os.path.exists(caminho):
        sys.exit("Falta o .env.local.")
    valores = {}
    with open(caminho, encoding="utf-8") as f:
        for linha in f:
            linha = linha.strip()
            if linha and not linha.startswith("#") and "=" in linha:
                c, v = linha.split("=", 1)
                valores[c.strip()] = v.strip()
    return valores["EXPO_PUBLIC_SUPABASE_URL"].rstrip("/"), valores["EXPO_PUBLIC_SUPABASE_ANON_KEY"]


_senha = None


def senha_de_teste():
    """
    A senha das contas ficticias, do ambiente ou do .env.local.

    Sem valor padrao: um padrao no codigo seria de novo uma senha versionada.
    """
    global _senha
    if _senha:
        return _senha

    valor = os.environ.get(VARIAVEL_DA_SENHA, "").strip()

    if not valor:
        caminho = os.path.join(RAIZ, ".env.local")
        if os.path.exists(caminho):
            with open(caminho, encoding="utf-8") as f:
                for linha in f:
                    linha = linha.strip()
                    if linha.startswith(f"{VARIAVEL_DA_SENHA}="):
                        valor = linha.split("=", 1)[1].strip()
                        break

    if not valor:
        sys.exit(
            f"Falta {VARIAVEL_DA_SENHA}. Defina no ambiente ou no .env.local -- "
            "e a mesma senha com que as contas de demonstracao foram criadas."
        )

    _senha = valor
    return _senha


def pedir(url, metodo, cabec, corpo=None):
    dados = json.dumps(corpo).encode("utf-8") if corpo is not None else None
    req = urllib.request.Request(url, data=dados, method=metodo)
    for n, v in cabec.items():
        req.add_header(n, v)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            txt = r.read().decode("utf-8")
            return r.status, (json.loads(txt) if txt.strip() else None)
    except urllib.error.HTTPError as e:
        txt = e.read().decode("utf-8")
        try:
            return e.code, json.loads(txt)
        except json.JSONDecodeError:
            return e.code, {"raw": txt}


def entrar(base, anon, email):
    st, c = pedir(f"{base}/auth/v1/token?grant_type=password", "POST",
                  {"apikey": anon, "Content-Type": "application/json"},
                  {"email": email, "password": senha_de_teste()})
    if st != 200 or not c.get("access_token"):
        return None, None
    return c["access_token"], c["user"]["id"]


def cabec(anon, token, extra=None):
    c = {"apikey": anon, "Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    if extra:
        c.update(extra)
    return c


def jogadores_de_teste(base, anon, token):
    """So os ficticios. Descobre pelo e-mail, entrando em cada um."""
    st, c = pedir(f"{base}/rest/v1/jogadores?select=id,nome", "GET", cabec(anon, token))
    if st != 200:
        sys.exit(f"Nao consegui listar jogadores: {c}")
    return {j["id"]: j["nome"] for j in c}


def criar():
    base, anon = ler_env()

    if os.path.exists(REGISTRO):
        sys.exit(f"Ja existe semeadura em {REGISTRO}. Rode --desfazer antes.")

    # Descobre quem sao os ficticios entrando em cada conta do dominio de teste.
    from semear import JOGADORES

    contas = []
    for j in JOGADORES:
        token, uid = entrar(base, anon, f"{j['slug']}@{DOMINIO}")
        if token:
            contas.append({"slug": j["slug"], "nome": j["nome"], "id": uid, "token": token})

    if len(contas) < 8:
        sys.exit(f"Preciso de 8 contas de teste, encontrei {len(contas)}. Rode semear.py antes.")

    print(f"{len(contas)} jogadores ficticios disponiveis")

    # Nivel de cada um, entre 2.0 e 4.5 na escala de estrelas.
    nivel = {c["id"]: round(random.uniform(2.0, 4.5), 2) for c in contas}

    registro = {"criado_em": datetime.datetime.now().isoformat(), "partidas": [], "jogadores": []}
    registro["jogadores"] = [{"id": c["id"], "nome": c["nome"], "nivel": nivel[c["id"]]} for c in contas]

    for n in range(PARTIDAS):
        # Todas datadas de ONTEM, de proposito: a janela abre na virada do dia
        # seguinte, entao ela esta aberta agora e as notas entram pela policy
        # normal -- sem precisar afrouxar nada no banco para semear.
        #
        # O efeito colateral e que as quatro aparecem como "avaliacoes abertas"
        # ate a virada de amanha. E realista, e some sozinho.
        dia = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=1)
        oito = random.sample(contas, 8)
        criador = oito[0]

        st, pid = pedir(f"{base}/rest/v1/rpc/criar_partida", "POST",
                        cabec(anon, criador["token"]),
                        {"p_jogada_em": dia.isoformat(),
                         "p_time_a": [c["id"] for c in oito[:4]],
                         "p_time_b": [c["id"] for c in oito[4:]]})
        if st != 200:
            sys.exit(f"criar_partida falhou: {pid}")

        registro["partidas"].append({"id": pid, "jogada_em": dia.isoformat()})
        print(f"  partida {n+1}/{PARTIDAS}: {pid}")

    salvar(registro)
    print(f"Registro salvo em {REGISTRO}")

    # As notas entram na mesma execucao: a janela dessas partidas esta aberta.
    notas()


def notas():
    """Insere as notas nas partidas semeadas."""
    base, anon = ler_env()
    registro = carregar()
    print("\nGravando as avaliacoes...")

    from semear import JOGADORES
    contas = []
    for j in JOGADORES:
        token, uid = entrar(base, anon, f"{j['slug']}@{DOMINIO}")
        if token:
            contas.append({"id": uid, "token": token, "nome": j["nome"]})
    por_id = {c["id"]: c for c in contas}
    nivel = {j["id"]: j["nivel"] for j in registro["jogadores"]}

    total, falhas = 0, 0
    for p in registro["partidas"]:
        st, escalacao = pedir(
            f"{base}/rest/v1/partida_jogadores?partida_id=eq.{p['id']}&select=jogador_id",
            "GET", cabec(anon, contas[0]["token"]))
        ids = [x["jogador_id"] for x in escalacao]

        for avaliador in ids:
            if avaliador not in por_id:
                continue
            for avaliado in ids:
                if avaliado == avaliador:
                    continue
                base_nota = nivel.get(avaliado, 3)
                notas_dict = {}
                for a in ATRIBUTOS:
                    v = round(random.gauss(base_nota, 0.7))
                    notas_dict[a] = max(1, min(5, v))

                st, c = pedir(f"{base}/rest/v1/avaliacoes_de_partida", "POST",
                              cabec(anon, por_id[avaliador]["token"],
                                    {"Prefer": "resolution=merge-duplicates"}),
                              {"partida_id": p["id"], "avaliador_id": avaliador,
                               "avaliado_id": avaliado, **notas_dict})
                if st in (200, 201, 204):
                    total += 1
                else:
                    falhas += 1
                    if falhas <= 2:
                        print(f"  recusado: {c}")

    print(f"\n{total} avaliacoes gravadas, {falhas} recusadas")
    if falhas:
        print("Recusas em massa significam janela fechada. Ver o cabecalho.")


def desfazer():
    base, anon = ler_env()
    registro = carregar()

    from semear import JOGADORES
    token, _ = entrar(base, anon, f"{JOGADORES[0]['slug']}@{DOMINIO}")
    if not token:
        sys.exit("Nao consegui entrar com uma conta de teste.")

    # Apagar a partida leva junto escalacao e avaliacoes, por cascata. Mas nao ha
    # policy de delete em `partidas` -- de proposito. Por isso o desfazer emite o
    # SQL em vez de fingir que consegue.
    ids = ", ".join(f"'{p['id']}'" for p in registro["partidas"])
    print("Nao existe policy de DELETE em `partidas`, e isso e deliberado:")
    print("apagar partida nao e acao do produto.\n")
    print("Para desfazer, rode no SQL Editor:\n")
    print(f"  delete from public.partidas where id in ({ids});\n")
    print("A escalacao e as avaliacoes somem junto, por cascata.")
    print(f"Depois apague {REGISTRO}.")


def salvar(r):
    with open(REGISTRO, "w", encoding="utf-8") as f:
        json.dump(r, f, indent=2, ensure_ascii=False)


def carregar():
    if not os.path.exists(REGISTRO):
        sys.exit(f"Nao ha registro em {REGISTRO}. Nada foi semeado.")
    with open(REGISTRO, encoding="utf-8") as f:
        return json.load(f)


if __name__ == "__main__":
    if "--desfazer" in sys.argv:
        desfazer()
    elif "--notas" in sys.argv:
        notas()
    else:
        criar()
