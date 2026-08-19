"""
Gera os arquivos da marca a partir do simbolo.

Produz os PNG que o SVG nao cobre: favicon, icone do app e os tamanhos de PWA.
O simbolo e desenhado aqui em codigo, e nao convertido do SVG, porque converter
exigiria uma dependencia de rasterizacao so para isto.

Uso:  python scripts/gerar-marca.py
"""

import math
import os
from PIL import Image, ImageDraw

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, "assets", "marca")

MAR = (26, 106, 143)
AREIA = (253, 247, 238)

# 8x, e reduz no fim: o antisserrilhado sai do proprio downscale.
ESCALA = 8


def desenhar(lado: int, fundo=None) -> Image.Image:
    g = lado * ESCALA
    img = Image.new("RGBA", (g, g), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    if fundo is not None:
        d.rectangle([(0, 0), (g, g)], fill=fundo)

    margem = g * 0.03
    d.ellipse([(margem, margem), (g - margem, g - margem)], fill=MAR)

    traco = int(g * 0.085)

    def arco(cx, cy, raio, de, ate):
        """Um pedaco de circunferencia, em coordenadas relativas ao lado."""
        pontos = []
        for i in range(61):
            a = math.radians(de + (ate - de) * i / 60)
            pontos.append((cx + raio * math.cos(a), cy + raio * math.sin(a)))
        d.line(pontos, fill=AREIA, width=traco, joint="curve")

    # Duas costuras que atravessam a bola de ponta a ponta, curvando em sentidos
    # opostos -- e o gesto minimo que faz um circulo virar bola de volei. Uma
    # terceira ajudaria numa bola grande e viraria borrao a 24px, entao ficam
    # duas.
    arco(-g * 0.16, g * 0.50, g * 0.66, -45, 45)
    arco(g * 1.16, g * 0.50, g * 0.66, 135, 225)

    # A linha que corta as duas: a rede, e o que separa os dois lados da quadra.
    d.line([(g * 0.13, g * 0.72), (g * 0.87, g * 0.28)], fill=AREIA, width=traco)

    return img.resize((lado, lado), Image.LANCZOS)


def main() -> None:
    os.makedirs(DESTINO, exist_ok=True)

    # Transparente: para uso sobre qualquer fundo.
    for lado in (192, 512):
        caminho = os.path.join(DESTINO, f"icone-{lado}.png")
        desenhar(lado).save(caminho, "PNG", optimize=True)
        print(f"  icone-{lado}.png")

    # Com fundo: o iOS nao respeita transparencia no icone da tela inicial.
    caminho = os.path.join(DESTINO, "apple-touch-icon.png")
    desenhar(180, fundo=AREIA).save(caminho, "PNG", optimize=True)
    print("  apple-touch-icon.png")

    # Favicon multi-resolucao: o navegador escolhe o tamanho que precisa.
    favicon = os.path.join(DESTINO, "favicon.ico")
    desenhar(64).save(favicon, sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    print("  favicon.ico")

    # O que o app usa como icone e splash.
    desenhar(1024, fundo=AREIA).save(os.path.join(DESTINO, "icone-app.png"), "PNG", optimize=True)
    print("  icone-app.png")

    print(f"\nMarca gerada em {DESTINO}")


if __name__ == "__main__":
    main()
