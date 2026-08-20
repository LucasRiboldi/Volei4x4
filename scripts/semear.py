"""
Popula o banco com jogadores ficticios para desenvolvimento.

Cria a conta, o perfil e envia o avatar de cada um. Idempotente: rodar de novo
nao duplica ninguem -- quem ja existe apenas entra e tem o perfil atualizado.

TODOS os e-mails ficam sob o dominio de teste declarado abaixo, e o nome de
cada jogador leva o sufixo combinado. E o que o documento do projeto pede: dado
ficticio precisa ser reconhecivel a olho, para nunca ser confundido com pessoa
real em producao.

Uso:
  python scripts/gerar-avatares.py     (uma vez, gera as imagens)
  python scripts/semear.py             (cria as contas e envia tudo)

Le a URL e a anon key do .env.local. Nao precisa e nao aceita service_role.
A senha das contas ficticias vem de VOLEI_SENHA_DE_TESTE -- ver abaixo por que
ela nao mora mais neste arquivo.
"""

import json
import os
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PASTA_AVATARES = os.path.join(RAIZ, "scripts", "avatares")

# O que marca a conta como ficticia. Mude aqui se precisar de outro lote.
DOMINIO = "volei4x4-teste.com"

# A senha das contas ficticias NAO fica aqui.
#
# Ela ficou, e isso foi um defeito: este repositorio e publico, as contas
# existem no mesmo projeto Supabase que atende producao, e a aplicacao esta no
# ar sem barreira. Com o dominio previsivel e a senha em texto puro, qualquer
# pessoa entrava como um dos jogadores de demonstracao, via o grupo inteiro e
# podia fazer a avaliacao inicial de todo mundo -- treze contas passam do piso
# de cinco avaliadores e movem o rating de qualquer jogador real para onde
# quiserem. Era um caminho aberto para o unico numero que o produto precisa
# manter honesto.
#
# Agora vem do ambiente. O nome NAO leva o prefixo `EXPO_PUBLIC_` de proposito:
# o Expo embute toda variavel com esse prefixo no bundle da web, o que
# publicaria a senha de novo -- no mesmo lugar, por outra porta.
VARIAVEL_DA_SENHA = "VOLEI_SENHA_DE_TESTE"

JOGADORES = [
    {"slug": "joao",    "nome": "Joao Pereira",     "apelido": "Joao",    "cidade": "Porto Alegre"},
    {"slug": "pedro",   "nome": "Pedro Almeida",    "apelido": "Pedrao",  "cidade": "Porto Alegre"},
    {"slug": "carlos",  "nome": "Carlos Nunes",     "apelido": "Carlinhos", "cidade": "Canoas"},
    {"slug": "rafael",  "nome": "Rafael Moraes",    "apelido": "Rafa",    "cidade": "Porto Alegre"},
    {"slug": "bruno",   "nome": "Bruno Carvalho",   "apelido": "Bruno",   "cidade": "Gravatai"},
    {"slug": "felipe",  "nome": "Felipe Rocha",     "apelido": "Lipe",    "cidade": "Porto Alegre"},
    {"slug": "andre",   "nome": "Andre Tavares",    "apelido": "Dede",    "cidade": "Viamao"},
    {"slug": "marcelo", "nome": "Marcelo Braga",    "apelido": "Marcelo", "cidade": "Canoas"},
    {"slug": "ricardo", "nome": "Ricardo Freitas",  "apelido": "Ricardo", "cidade": "Porto Alegre"},
    {"slug": "daniel",  "nome": "Daniel Siqueira",  "apelido": "Dani",    "cidade": "Alvorada"},
    {"slug": "gabriel", "nome": "Gabriel Antunes",  "apelido": "Gabi",    "cidade": "Porto Alegre"},
    {"slug": "thiago",  "nome": "Thiago Menezes",   "apelido": "Thi",     "cidade": "Sao Leopoldo"},
    {"slug": "eduardo", "nome": "Eduardo Barcelos", "apelido": "Duda",    "cidade": "Porto Alegre"},
]


def ler_env() -> tuple:
    caminho = os.path.join(RAIZ, ".env.local")
    if not os.path.exists(caminho):
        sys.exit("Falta o .env.local. Copie de .env.example e preencha.")

    valores = {}
    with open(caminho, encoding="utf-8") as arquivo:
        for linha in arquivo:
            linha = linha.strip()
            if linha and not linha.startswith("#") and "=" in linha:
                chave, valor = linha.split("=", 1)
                valores[chave.strip()] = valor.strip()

    url = valores.get("EXPO_PUBLIC_SUPABASE_URL")
    chave = valores.get("EXPO_PUBLIC_SUPABASE_ANON_KEY")
    if not url or not chave:
        sys.exit("O .env.local nao tem a URL ou a anon key.")
    return url.rstrip("/"), chave


_senha = None


def senha_de_teste() -> str:
    """
    A senha das contas ficticias, vinda do ambiente ou do .env.local.

    Sem valor padrao de proposito: um padrao no codigo volta a ser exatamente o
    que este arquivo deixou de ter. Se faltar, o script para e explica -- e nao
    semeia meia base com uma senha que ninguem sabe qual e.
    """
    global _senha
    if _senha:
        return _senha

    valor = os.environ.get(VARIAVEL_DA_SENHA, "").strip()

    if not valor:
        caminho = os.path.join(RAIZ, ".env.local")
        if os.path.exists(caminho):
            with open(caminho, encoding="utf-8") as arquivo:
                for linha in arquivo:
                    linha = linha.strip()
                    if linha.startswith(f"{VARIAVEL_DA_SENHA}="):
                        valor = linha.split("=", 1)[1].strip()
                        break

    if not valor:
        sys.exit(
            f"Falta {VARIAVEL_DA_SENHA}. Defina no ambiente ou no .env.local,\n"
            "com uma senha de pelo menos 8 caracteres que voce nao use em mais nada.\n"
            "Ela abre as contas de demonstracao, que vivem no mesmo banco que o app real."
        )

    _senha = valor
    return _senha


def pedir(url: str, metodo: str, cabecalhos: dict, corpo=None, bruto: bool = False):
    dados = corpo if bruto else (json.dumps(corpo).encode("utf-8") if corpo is not None else None)
    req = urllib.request.Request(url, data=dados, method=metodo)
    for nome, valor in cabecalhos.items():
        req.add_header(nome, valor)
    try:
        with urllib.request.urlopen(req, timeout=45) as r:
            texto = r.read().decode("utf-8")
            return r.status, (json.loads(texto) if texto.strip() else None)
    except urllib.error.HTTPError as e:
        texto = e.read().decode("utf-8")
        try:
            return e.code, json.loads(texto)
        except json.JSONDecodeError:
            return e.code, {"raw": texto}


def entrar_ou_criar(base: str, anon: str, jogador: dict):
    """Devolve (token, uid, 'criado'|'existente') ou (None, None, motivo)."""
    email = f"{jogador['slug']}@{DOMINIO}"
    cabec = {"apikey": anon, "Content-Type": "application/json"}

    status, corpo = pedir(
        f"{base}/auth/v1/signup", "POST", cabec,
        {"email": email, "password": senha_de_teste(), "data": {"nome": jogador["nome"]}},
    )

    if status == 200 and corpo and corpo.get("access_token"):
        return corpo["access_token"], corpo["user"]["id"], "criado"

    # Ja existe, ou o projeto exige confirmacao de e-mail: tenta entrar.
    status, corpo = pedir(
        f"{base}/auth/v1/token?grant_type=password", "POST", cabec,
        {"email": email, "password": senha_de_teste()},
    )
    if status == 200 and corpo and corpo.get("access_token"):
        return corpo["access_token"], corpo["user"]["id"], "existente"

    return None, None, (corpo or {}).get("msg") or (corpo or {}).get("error_description") or f"HTTP {status}"


def gravar_perfil(base: str, anon: str, token: str, uid: str, jogador: dict) -> str:
    cabec = {
        "apikey": anon,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    status, corpo = pedir(
        f"{base}/rest/v1/jogadores", "POST", cabec,
        {"id": uid, "nome": jogador["nome"], "apelido": jogador["apelido"], "cidade": jogador["cidade"]},
    )
    if status not in (200, 201, 204):
        return f"perfil falhou: {corpo}"
    return ""


def enviar_avatar(base: str, anon: str, token: str, uid: str, jogador: dict) -> str:
    origem = os.path.join(PASTA_AVATARES, jogador["slug"] + ".png")
    if not os.path.exists(origem):
        return "sem avatar (rode gerar-avatares.py)"

    with open(origem, "rb") as arquivo:
        binario = arquivo.read()

    # A primeira pasta e o uid: e o que a policy do Storage exige para aceitar
    # a escrita, e o que impede um jogador de sobrescrever o avatar de outro.
    caminho = f"{uid}/avatar.png"
    status, corpo = pedir(
        f"{base}/storage/v1/object/avatares/{caminho}",
        "POST",
        {
            "apikey": anon,
            "Authorization": f"Bearer {token}",
            "Content-Type": "image/png",
            "x-upsert": "true",
        },
        binario,
        bruto=True,
    )
    if status not in (200, 201):
        return f"avatar falhou: {corpo}"

    url = f"{base}/storage/v1/object/public/avatares/{caminho}"
    status, corpo = pedir(
        f"{base}/rest/v1/jogadores?id=eq.{uid}", "PATCH",
        {"apikey": anon, "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        {"foto_url": url},
    )
    if status not in (200, 204):
        return f"foto_url falhou: {corpo}"
    return ""


def main() -> None:
    base, anon = ler_env()
    print(f"Projeto: {base}")
    print(f"Dominio dos ficticios: @{DOMINIO}\n")

    ok, falhas = 0, []
    for jogador in JOGADORES:
        token, uid, situacao = entrar_ou_criar(base, anon, jogador)
        if not token:
            falhas.append(f"{jogador['nome']}: {situacao}")
            print(f"  {jogador['nome']:<22} FALHOU  {situacao}")
            continue

        erro = gravar_perfil(base, anon, token, uid, jogador) or enviar_avatar(
            base, anon, token, uid, jogador
        )
        if erro:
            falhas.append(f"{jogador['nome']}: {erro}")
            print(f"  {jogador['nome']:<22} PARCIAL {erro}")
        else:
            ok += 1
            print(f"  {jogador['nome']:<22} ok      ({situacao})")

    print(f"\n{ok}/{len(JOGADORES)} jogadores prontos")
    if falhas:
        print("\nFalhas:")
        for f in falhas:
            print(f"  - {f}")
        sys.exit(1)


if __name__ == "__main__":
    main()
