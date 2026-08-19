"""
Gera os avatares dos jogadores ficticios.

Imagem inventada, e nao foto de pessoa real: sao dados de demonstracao, e usar
rosto de alguem em banco de teste seria pedir problema. Cada jogador ganha um
circulo de cor propria com as iniciais.

Uso:  python scripts/gerar-avatares.py
Saida: scripts/avatares/<slug>.png
"""

import hashlib
import os
from PIL import Image, ImageDraw, ImageFont

TAMANHO = 256
PASTA = os.path.join(os.path.dirname(__file__), "avatares")

# As mesmas doze cores para todo mundo, escolhidas para contrastar com texto
# claro. O jogador sempre cai na mesma, porque o indice sai do hash do nome.
CORES = [
    (198, 93, 59), (58, 124, 165), (76, 143, 111), (168, 88, 140),
    (191, 148, 60), (86, 106, 176), (176, 79, 79), (60, 140, 140),
    (140, 106, 60), (110, 96, 168), (72, 132, 88), (166, 104, 72),
]


def iniciais(nome: str) -> str:
    partes = [p for p in nome.split() if p]
    if len(partes) == 1:
        return partes[0][:2].upper()
    return (partes[0][0] + partes[-1][0]).upper()


def cor_de(nome: str) -> tuple:
    n = int(hashlib.md5(nome.encode("utf-8")).hexdigest(), 16)
    return CORES[n % len(CORES)]


def fonte(tamanho: int):
    # Fonte do sistema quando houver; a embutida do PIL como ultimo recurso,
    # para o script nao quebrar em maquina sem as fontes do Windows.
    for caminho in (
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    ):
        if os.path.exists(caminho):
            return ImageFont.truetype(caminho, tamanho)
    return ImageFont.load_default()


def gerar(nome: str, destino: str) -> None:
    # 4x e depois reduz: o circulo sai com a borda lisa, sem serrilhado.
    escala = 4
    lado = TAMANHO * escala
    img = Image.new("RGB", (lado, lado), (14, 27, 42))
    desenho = ImageDraw.Draw(img)
    desenho.ellipse([(0, 0), (lado - 1, lado - 1)], fill=cor_de(nome))

    texto = iniciais(nome)
    f = fonte(int(lado * 0.38))
    caixa = desenho.textbbox((0, 0), texto, font=f)
    desenho.text(
        ((lado - (caixa[2] - caixa[0])) / 2 - caixa[0],
         (lado - (caixa[3] - caixa[1])) / 2 - caixa[1]),
        texto,
        font=f,
        fill=(242, 246, 250),
    )

    img.resize((TAMANHO, TAMANHO), Image.LANCZOS).save(destino, "PNG", optimize=True)


def main() -> None:
    from semear import JOGADORES  # a lista vive num lugar so

    os.makedirs(PASTA, exist_ok=True)
    for jogador in JOGADORES:
        destino = os.path.join(PASTA, jogador["slug"] + ".png")
        gerar(jogador["nome"], destino)
        print(f"  {jogador['nome']:<22} -> {os.path.basename(destino)}")

    print(f"\n{len(JOGADORES)} avatares em {PASTA}")


if __name__ == "__main__":
    main()
