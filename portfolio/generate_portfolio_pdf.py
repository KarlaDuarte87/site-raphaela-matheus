from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / "portfolio" / "screenshots"
OUT = ROOT / "portfolio" / "karla-duarte-case-raphaela-matheus.pdf"

OLIVE = colors.HexColor("#374937")
OLIVE_MID = colors.HexColor("#587458")
OLIVE_LIGHT = colors.HexColor("#e3ebe3")
CREAM = colors.HexColor("#fcfbfa")
GOLD = colors.HexColor("#c5a059")
TEXT = colors.HexColor("#445b44")

PAGE_W, PAGE_H = A4
MARGIN = 40
CONTENT_W = PAGE_W - MARGIN * 2


def register_fonts() -> None:
    d = Path("/usr/share/fonts/truetype/dejavu")
    pdfmetrics.registerFont(TTFont("Serif", str(d / "DejaVuSerif.ttf")))
    pdfmetrics.registerFont(TTFont("SerifBold", str(d / "DejaVuSerif-Bold.ttf")))
    pdfmetrics.registerFont(TTFont("Sans", str(d / "DejaVuSans.ttf")))
    pdfmetrics.registerFont(TTFont("SansBold", str(d / "DejaVuSans-Bold.ttf")))


def bg(c: canvas.Canvas) -> None:
    c.setFillColor(CREAM)
    c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)


def img(c: canvas.Canvas, name: str, x: float, y: float, w: float, h: float) -> None:
    path = SHOTS / name
    if path.exists():
        c.drawImage(ImageReader(str(path)), x, y, w, h, mask="auto", preserveAspectRatio=True, anchor="sw")


def asset_img(c: canvas.Canvas, rel_path: str, x: float, y: float, w: float, h: float) -> None:
    path = ROOT / rel_path
    if path.exists():
        c.drawImage(ImageReader(str(path)), x, y, w, h, mask="auto", preserveAspectRatio=True, anchor="sw")


def title_block(c: canvas.Canvas, kicker: str, heading: str, y: float) -> float:
    c.setFillColor(OLIVE_MID)
    c.setFont("Sans", 9)
    c.drawString(MARGIN, y, kicker.upper())
    c.setFillColor(OLIVE)
    c.setFont("SerifBold", 22)
    c.drawString(MARGIN, y - 26, heading)
    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(MARGIN, y - 36, MARGIN + 44, y - 36)
    return y - 52


def text_block(c: canvas.Canvas, lines: list[str], x: float, y: float, size: float = 9.5, leading: int = 14) -> float:
    t = c.beginText(x, y)
    t.setFont("Sans", size)
    t.setFillColor(TEXT)
    t.setLeading(leading)
    for line in lines:
        t.textLine(line)
    c.drawText(t)
    return y - leading * len(lines)


def bullets(c: canvas.Canvas, items: list[str], x: float, y: float) -> float:
    for item in items:
        c.setFillColor(GOLD)
        c.circle(x + 3, y + 2, 2, fill=1, stroke=0)
        y = text_block(c, [item], x + 14, y + 4, leading=13) - 5
    return y


def screenshot_page(c: canvas.Canvas, kicker: str, heading: str, screenshot: str,
                    details: list[str], full_width: bool = True) -> None:
    bg(c)
    y = title_block(c, kicker, heading, PAGE_H - 44)

    if full_width:
        shot_h = PAGE_H - 44 - 52 - len(details) * 14 - 60
        shot_h = min(shot_h, 420)
        img(c, screenshot, MARGIN, y - shot_h - 10, CONTENT_W, shot_h)
        y = y - shot_h - 24
    else:
        shot_w = CONTENT_W * 0.55
        shot_h = min(380, PAGE_H - 120)
        img(c, screenshot, MARGIN, y - shot_h, shot_w, shot_h)
        bullets(c, details, MARGIN + shot_w + 20, y - 20)
        return

    bullets(c, details, MARGIN, y)


# ── P1: Capa ────────────────────────────────────────────────────
def draw_cover_qr(c: canvas.Canvas, rel_path: str, x: float, y: float, size: float, label: str) -> None:
    asset_img(c, rel_path, x, y, size, size)
    c.setFillColor(OLIVE_MID)
    c.setFont("Sans", 7)
    c.drawCentredString(x + size / 2, y - 12, label)


def page_cover(c: canvas.Canvas) -> None:
    bg(c)

    hero_h = 280
    asset_img(c, "assets/couple-landscape.jpeg", 0, PAGE_H - hero_h, PAGE_W, hero_h)
    c.setFillColor(colors.Color(0.145, 0.188, 0.145, alpha=0.38))
    c.rect(0, PAGE_H - hero_h, PAGE_W, hero_h, fill=1, stroke=0)

    c.setFillColor(OLIVE_MID)
    c.setFont("Sans", 10)
    c.drawString(MARGIN, PAGE_H - 318, "CASE DE PORTFOLIO")

    c.setFillColor(OLIVE)
    c.setFont("SerifBold", 28)
    c.drawString(MARGIN, PAGE_H - 362, "Raphaela & Matheus")
    c.setFont("Serif", 22)
    c.drawString(MARGIN, PAGE_H - 392, "Site de Casamento")

    c.setStrokeColor(GOLD)
    c.setLineWidth(1)
    c.line(MARGIN, PAGE_H - 412, MARGIN + 56, PAGE_H - 412)

    text_block(c, [
        "Projeto institucional e experiencial para casamento, com foco em elegancia,",
        "organizacao das informacoes e uma navegacao sensivel ao contexto dos convidados.",
        "",
        "Entregas principais:",
        "- Site completo com lista de presentes e Pix",
        "- Convite digital com experiencia imersiva",
        "- Pagina exclusiva para padrinhos",
        "- Adaptacoes responsivas e compatibilidade mobile",
    ], MARGIN, PAGE_H - 448, size=10.5, leading=16)

    c.setFillColor(OLIVE)
    c.roundRect(MARGIN, 86, 240, 74, 16, fill=1, stroke=0)
    c.setFillColor(CREAM)
    c.setFont("SansBold", 11)
    c.drawString(MARGIN + 18, 130, "Karla Duarte")
    c.setFont("Sans", 10)
    c.drawString(MARGIN + 18, 112, "Desenvolvimento e direcao visual")
    c.drawString(MARGIN + 18, 96, "raphaelazanin.com.br")

    qr_size = 76
    qr_gap = 14
    qr_row_w = qr_size * 3 + qr_gap * 2
    qr_x = PAGE_W - MARGIN - qr_row_w
    qr_y = 88

    draw_cover_qr(c, "assets/qrcode-site.png", qr_x, qr_y, qr_size, "Site")
    draw_cover_qr(c, "assets/qrcode-convite.png", qr_x + qr_size + qr_gap, qr_y, qr_size, "Convite")
    draw_cover_qr(c, "assets/padrinhos/qrcode-padrinhos.png", qr_x + (qr_size + qr_gap) * 2, qr_y, qr_size, "Padrinhos")


# ── P2: Visão geral ───────────────────────────────────────────
def page_overview(c: canvas.Canvas) -> None:
    bg(c)
    y = title_block(c, "Visao geral", "Sobre o projeto", PAGE_H - 44)

    y = text_block(c, [
        "Projeto web completo para o casamento de Raphaela e Matheus, publicado em",
        "dominio proprio. Tres experiencias distintas para convidados, confirmacao",
        "de presenca e padrinhos/madrinhas com orientacoes exclusivas.",
    ], MARGIN, y)

    y -= 8
    y = bullets(c, [
        "Site principal com historia, recepcao, presentes (Pix + lista), hospedagem e mapa",
        "Convite digital com envelope animado, musica, contagem regressiva e RSVP",
        "Manual dos padrinhos com dress code, paleta, parallax e QR code",
        "Responsivo: desktop, Android e iPhone (parallax adaptado por dispositivo)",
    ], MARGIN, y)

    img(c, "home-full.png", MARGIN, 50, CONTENT_W, 280)


PAGES = [
    ("Site principal", "Hero — Boas-vindas", "home-hero.png", [
        "Logo personalizada RM com data 01/11/2026",
        "Mensagem de boas-vindas do casal",
        "Navbar fixa com scroll suave entre secoes",
    ]),
    ("Site principal", "Parallax — foto do casal", "home-parallax-1.png", [
        "Wallpaper fixo no viewport com foto couple-portrait",
        "Janela transparente (.photo-window) revela a foto enquanto o conteudo rola",
        "Tecnica compativel com desktop e iPhone",
    ]),
    ("Site principal", "O Casal — Nossa historia", "home-casal.png", [
        "Foto circular com borda dourada dupla",
        "Historia do relacionamento desde 2014",
        "Tipografia serifada elegante (Cormorant Garamond)",
    ]),
    ("Site principal", "Parallax — transicao entre secoes", "home-parallax-2.png", [
        "Segunda janela parallax entre O Casal e Recepcao",
        "Mesma foto fixa continua visivel durante a rolagem",
    ]),
    ("Site principal", "Recepcao — Buffet Vivaro", "home-recepcao.png", [
        "Cerimonia: 16h30 | Padrinhos: 16h00",
        "Endereco completo com cards informativos",
    ]),
    ("Site principal", "Parallax — cena Vivaro", "home-parallax-vivaro.png", [
        "Troca automatica para foto couple-landscape ao rolar",
        "Wallpaper alternado via classe is-vivaro-scene no body",
        "Transicao suave de opacidade entre cenas",
    ]),
    ("Site principal", "Lista de Presentes + Pix", "home-presentes.png", [
        "QR Code Pix fixo acima da lista de presentes",
        "Grid dinamico carregado via JSON",
        "Ordenacao (A-Z, preco) e paginacao (12 por pagina)",
        "Modal por item com QR Code e valor sugerido",
    ]),
    ("Site principal", "Hospedagem e Saloes", "home-hospedagem.png", [
        "Mapa interativo Leaflet com pins por categoria",
        "Filtros: hoteis, saloes, cerimonia",
        "Cards com galeria, precos, WhatsApp e Google Maps",
        "Lightbox para ampliar fotos",
    ]),
    ("Convite digital", "Capa do envelope", "convite-cover.png", [
        "Abertura animada: aba do envelope sobe com lacre",
        "Transicao suave para o conteudo principal",
        "Musica de fundo com toggle (compativel iOS)",
    ]),
    ("Convite digital", "Conteudo completo", "convite-full.png", [
        "Polaroids com fotos do casal",
        "Contagem regressiva ao vivo",
        "Calendario visual com dia destacado",
        "Formulario RSVP integrado (Google Apps Script)",
        "Personalizacao por convidado via URL (?para=nome)",
    ]),
    ("Manual padrinhos", "Capa", "padrinhos-hero.png", [
        "Pagina exclusiva com navbar dedicada",
        "Logo hero + titulo Manual dos Padrinhos",
        "URL: raphaelazanin.com.br/padrinhos/",
    ]),
    ("Manual padrinhos", "Mensagem", "padrinhos-mensagem.png", [
        "Versiculo Eclesiastico 6:14",
        "Texto de carinho sobre o papel dos padrinhos",
        '"Voces aceitam ser nossos padrinhos?"',
    ]),
    ("Manual padrinhos", "Traje feminino", "padrinhos-traje-feminino.png", [
        "Vestido longo, tecidos sem estampa, cor Verde Oliva",
        "Paleta visual com 4 tons de referencia",
    ]),
    ("Manual padrinhos", "Parallax — madrinhas", "padrinhos-parallax-madrinhas.png", [
        "Foto de inspiracao em verde oliva como wallpaper fixo",
        "Ativada ao rolar pela janela data-scene=madrinhas",
        "Mesma tecnica do site principal (wallpaper + photo-window)",
    ]),
    ("Manual padrinhos", "Traje masculino", "padrinhos-traje-masculino.png", [
        "Camisa branca, gravata enviada, terno Cinza Grafite",
        "Paleta visual de referencia",
    ]),
    ("Manual padrinhos", "Parallax — padrinhos", "padrinhos-parallax-padrinhos.png", [
        "Foto de inspiracao dos padrinhos como wallpaper fixo",
        "Troca de cena ao passar pela segunda photo-window",
    ]),
    ("Manual padrinhos", "Informacoes do dia", "padrinhos-informacoes.png", [
        "Data, horarios, local e Google Maps",
        "Layout alinhado com secao Recepcao do site principal",
        "Botao Ver no Google Maps integrado",
    ]),
]


# ── Página mobile ───────────────────────────────────────────────
def page_mobile(c: canvas.Canvas) -> None:
    bg(c)
    y = title_block(c, "Responsividade", "Versao mobile", PAGE_H - 44)

    text_block(c, [
        "Layout adaptado para smartphones com menu hamburguer,",
        "cards empilhados e parallax compativel com iPhone (wallpaper fixo).",
    ], MARGIN, y, size=10)

    mw = (CONTENT_W - 24) / 3
    img(c, "home-mobile.png", MARGIN, 50, mw, 420)
    img(c, "convite-mobile.png", MARGIN + mw + 12, 50, mw, 420)
    img(c, "padrinhos-mobile.png", MARGIN + (mw + 12) * 2, 50, mw, 420)

    labels = ["Home", "Convite", "Padrinhos"]
    for i, label in enumerate(labels):
        c.setFillColor(OLIVE_MID)
        c.setFont("Sans", 8)
        c.drawString(MARGIN + i * (mw + 12) + mw / 2 - 15, 38, label)


# ── Stack técnico ───────────────────────────────────────────────
def page_stack(c: canvas.Canvas) -> None:
    bg(c)
    y = title_block(c, "Implementacao", "Stack tecnico", PAGE_H - 44)

    sections = [
        ("Front-end", [
            "HTML5 semantico + Tailwind CSS (CDN, config custom olive/cream/gold)",
            "JavaScript vanilla — sem frameworks",
            "Google Fonts: Cormorant Garamond + Montserrat",
            "Leaflet.js para mapa interativo",
        ]),
        ("Funcionalidades", [
            "Lista de presentes dinamica (JSON + sort + paginacao + modal Pix)",
            "Mapa com filtros, markers, tooltips, galeria e lightbox",
            "Parallax via wallpaper fixo + photo-window (desktop e iOS)",
            "RSVP com Google Apps Script + personalizacao por URL",
            "Contagem regressiva, auto-scroll, musica de fundo",
        ]),
        ("Deploy", [
            "GitHub Pages + dominio proprio (raphaelazanin.com.br)",
            "Site estatico — zero backend, zero custo de servidor",
            "Open Graph para preview no WhatsApp",
        ]),
        ("Design System", [
            "Paleta: olive (#374937), cream (#fcfbfa), gold (#c5a059)",
            "Gold line, cards rounded-2xl, botoes pill, couple photo circular",
            "Photo window para efeito parallax imersivo",
        ]),
    ]
    for sec_title, items in sections:
        c.setFillColor(OLIVE)
        c.setFont("SerifBold", 13)
        c.drawString(MARGIN, y, sec_title)
        y -= 18
        y = bullets(c, items, MARGIN, y)
        y -= 8


# ── Encerramento ────────────────────────────────────────────────
def page_closing(c: canvas.Canvas) -> None:
    bg(c)
    y = title_block(c, "Resultado", "Projeto entregue", PAGE_H - 44)

    text_block(c, [
        "Tres experiencias web publicadas, identidade visual coesa,",
        "navegacao intuitiva e compatibilidade testada em desktop, Android e iPhone.",
    ], MARGIN, y, size=10.5)

    img(c, "padrinhos-full.png", MARGIN, 55, CONTENT_W, 300)

    c.setFillColor(OLIVE)
    c.setFont("SerifBold", 28)
    c.drawString(MARGIN, 380, "Karla Duarte")
    c.setFont("Sans", 11)
    c.setFillColor(TEXT)
    c.drawString(MARGIN, 358, "Desenvolvimento front-end  |  Design  |  UX")


def main() -> None:
    register_fonts()
    c = canvas.Canvas(str(OUT), pagesize=A4)
    c.setTitle("Portfolio — Raphaela & Matheus")
    c.setAuthor("Karla Duarte")

    page_cover(c)
    c.showPage()
    page_overview(c)
    c.showPage()

    for kicker, heading, shot, details in PAGES:
        screenshot_page(c, kicker, heading, shot, details, full_width=True)
        c.showPage()

    page_mobile(c)
    c.showPage()
    page_stack(c)
    c.showPage()
    page_closing(c)

    c.save()
    total = 2 + len(PAGES) + 3
    print(f"PDF gerado: {OUT}")
    print(f"Paginas: {total}")


if __name__ == "__main__":
    main()
