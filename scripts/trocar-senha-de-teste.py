"""
Troca a senha das contas ficticias de demonstracao.

Existe porque a senha dessas contas ficou versionada em `semear.py` durante um
tempo. Tira-la do codigo nao fecha o buraco: ela continua no historico do git,
e e ela que abre as contas ate serem trocadas. Este script e a outra metade da
correcao.

Por que isso importa mesmo sendo "so" conta de teste: as contas ficticias vivem
no MESMO projeto Supabase que atende producao. Treze contas passam do piso de
cinco avaliadores, e quem entrasse nelas moveria o rating de qualquer jogador
real para onde quisesse -- que e justamente o numero que o produto precisa
manter honesto.

Nenhuma das duas senhas mora neste arquivo, pelo mesmo motivo. As duas vem de
fora:

  VOLEI_SENHA_ANTIGA    a que abre as contas hoje
  VOLEI_SENHA_DE_TESTE  a nova, que passa a abrir

Uso:
  VOLEI_SENHA_ANTIGA=... python scripts/trocar-senha-de-teste.py

A nova sai do .env.local, como nos demais scripts. Depois de rodar, a antiga
nao serve mais para nada -- inclusive para quem a leia no historico do git.

Idempotente: conta ja trocada e reconhecida e pulada, entao rodar de novo depois
de uma falha parcial termina o servico em vez de recomecar.

Le a URL e a anon key do .env.local. Nao usa service_role: a troca e feita com a
sessao da propria conta, que e o caminho que qualquer usuario teria.
"""

import json
import os
import sys
import urllib.error
import urllib.request

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(RAIZ, "scripts"))

from semear import DOMINIO, JOGADORES, ler_env, pedir  # noqa: E402

SENHA_MINIMA = 8


def das_variaveis() -> tuple:
    """As duas senhas, do ambiente ou do .env.local. Nunca imprime nenhuma."""
    valores = {}
    caminho = os.path.join(RAIZ, ".env.local")
    if os.path.exists(caminho):
        with open(caminho, encoding="utf-8") as arquivo:
            for linha in arquivo:
                linha = linha.strip()
                if linha and not linha.startswith("#") and "=" in linha:
                    chave, valor = linha.split("=", 1)
                    valores[chave.strip()] = valor.strip()

    antiga = os.environ.get("VOLEI_SENHA_ANTIGA", "").strip() or valores.get("VOLEI_SENHA_ANTIGA", "")
    nova = os.environ.get("VOLEI_SENHA_DE_TESTE", "").strip() or valores.get("VOLEI_SENHA_DE_TESTE", "")

    if not antiga:
        sys.exit("Falta VOLEI_SENHA_ANTIGA -- a senha que abre as contas hoje.")
    if not nova:
        sys.exit("Falta VOLEI_SENHA_DE_TESTE -- a senha nova. Ponha no .env.local.")
    if len(nova) < SENHA_MINIMA:
        sys.exit(f"A senha nova precisa de pelo menos {SENHA_MINIMA} caracteres.")
    if nova == antiga:
        sys.exit("A senha nova e igual a antiga. Nao ha o que trocar.")

    return antiga, nova


def entrar(base: str, anon: str, email: str, senha: str):
    """Devolve o token, ou None se a senha nao serve."""
    status, corpo = pedir(
        f"{base}/auth/v1/token?grant_type=password", "POST",
        {"apikey": anon, "Content-Type": "application/json"},
        {"email": email, "password": senha},
    )
    if status == 200 and corpo and corpo.get("access_token"):
        return corpo["access_token"]
    return None


def trocar(base: str, anon: str, token: str, nova: str) -> str:
    """Troca a senha da conta dona do token. Devolve '' ou o motivo da falha."""
    status, corpo = pedir(
        f"{base}/auth/v1/user", "PUT",
        {"apikey": anon, "Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        {"password": nova},
    )
    if status == 200:
        return ""
    return (corpo or {}).get("msg") or (corpo or {}).get("error_description") or f"HTTP {status}"


def main() -> None:
    base, anon = ler_env()
    antiga, nova = das_variaveis()

    print(f"Trocando a senha de {len(JOGADORES)} contas em {base}\n")

    trocadas, ja_estavam, falharam = 0, 0, []

    for jogador in JOGADORES:
        email = f"{jogador['slug']}@{DOMINIO}"

        token = entrar(base, anon, email, antiga)

        if token is None:
            # A antiga nao serve. Se a nova servir, esta conta ja foi trocada --
            # e o caso de rodar de novo depois de uma falha no meio. Se nenhuma
            # das duas servir, a conta e outro problema, e o script diz qual.
            if entrar(base, anon, email, nova) is not None:
                print(f"  = {email:<34} ja estava com a senha nova")
                ja_estavam += 1
            else:
                print(f"  ! {email:<34} nenhuma das duas senhas entra")
                falharam.append(email)
            continue

        motivo = trocar(base, anon, token, nova)
        if motivo:
            print(f"  ! {email:<34} {motivo}")
            falharam.append(email)
            continue

        # Confere entrando com a nova. Sem isto, um 200 que nao tivesse trocado
        # nada -- ou uma politica de senha que recusasse em silencio -- passaria
        # por sucesso, e a conta ficaria aberta com a senha publica.
        if entrar(base, anon, email, nova) is None:
            print(f"  ! {email:<34} respondeu 200 mas a senha nova nao entra")
            falharam.append(email)
            continue

        print(f"  + {email:<34} trocada e conferida")
        trocadas += 1

    print(f"\n{trocadas} trocadas, {ja_estavam} ja estavam, {len(falharam)} falharam")

    if falharam:
        print("\nFalharam:")
        for email in falharam:
            print(f"  {email}")
        sys.exit(1)

    print("\nA senha antiga nao abre mais nenhuma destas contas.")
    print("Confira que VOLEI_SENHA_DE_TESTE no .env.local e a nova, ou semear.py")
    print("deixa de funcionar.")


if __name__ == "__main__":
    main()
