#!/usr/bin/env python3
"""Gera os QR codes dos cartões a partir de desafios.json."""

import json
from pathlib import Path

import qrcode

ROOT = Path(__file__).resolve().parent
DATA = json.loads((ROOT / "desafios.json").read_text(encoding="utf-8"))
OUT = ROOT / "qr"
OUT.mkdir(exist_ok=True)

OLIVE = "#374937"
CREAM = "#fcfbfa"


def save(url: str, name: str) -> None:
    code = qrcode.QRCode(
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=14,
        border=2,
    )
    code.add_data(url)
    code.make(fit=True)
    image = code.make_image(fill_color=OLIVE, back_color=CREAM).convert("RGB")
    image.save(OUT / name)
    print(f"{name}  {url}")


def main() -> None:
    base = DATA["urlBase"].rstrip("/") + "/"
    for mesa in DATA["mesas"]:
        save(f"{base}?mesa={mesa['id']}", f"mesa-{mesa['id']}.png")
    save(DATA["albumUrl"], "album.png")
    save("https://wa.me/5544988256734", "contato.png")


if __name__ == "__main__":
    main()
