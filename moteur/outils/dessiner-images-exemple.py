#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
# SPDX-License-Identifier: EUPL-1.2
"""Dessine les deux images de l'exemple complet (exemple.md), sans aucune marque
réelle : formes simples et texte inventé, en bleu, or et gris de la charte (le
vert et l'orange restent aux graphiques de données).

  essais/fixtures/logo-exemple.png    logo d'un organisme fictif (logo_client)
  essais/fixtures/image-exemple.png   illustration d'un poste de travail (motif image)

Lancement, depuis n'importe quel dossier :
  python3 -P outils/dessiner-images-exemple.py
Demande Pillow (10.1 ou plus, pour la police par défaut à taille choisie). Les
fichiers existants sont remplacés.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

BLEU = (31, 81, 155)
OR = (253, 201, 72)
GRIS_CLAIR = (245, 245, 245)
GRIS_MOYEN = (221, 221, 221)
GRIS_FONCE = (51, 51, 51)
BLANC = (255, 255, 255)

FIXTURES = Path(__file__).resolve().parent.parent / "essais" / "fixtures"


def police(taille):
    return ImageFont.load_default(size=taille)


def logo(chemin):
    """Logo fictif : une pastille bleue à vague or, et le nom de l'organisme."""
    img = Image.new("RGB", (900, 300), BLANC)
    d = ImageDraw.Draw(img)
    d.ellipse((30, 40, 250, 260), fill=BLEU)
    for i, y in enumerate((120, 160, 200)):
        d.arc((60, y - 40, 220, y + 40), start=200, end=340, fill=OR if i != 1 else BLANC, width=14)
    d.text((290, 70), "ORGANISME", font=police(72), fill=BLEU)
    d.text((290, 155), "EXEMPLE", font=police(72), fill=GRIS_FONCE)
    d.rectangle((292, 240, 760, 248), fill=OR)
    img.save(chemin, optimize=True)


def poste(chemin):
    """Poste de travail : écran à tableau de bord, clavier, tasse."""
    img = Image.new("RGB", (1500, 1000), GRIS_CLAIR)
    d = ImageDraw.Draw(img)
    # Bureau
    d.rectangle((0, 760, 1500, 1000), fill=GRIS_MOYEN)
    # Écran et pied
    d.rounded_rectangle((250, 120, 1250, 700), radius=24, fill=GRIS_FONCE)
    d.rounded_rectangle((280, 150, 1220, 670), radius=10, fill=BLANC)
    d.rectangle((700, 700, 800, 780), fill=GRIS_FONCE)
    d.rounded_rectangle((580, 770, 920, 800), radius=10, fill=GRIS_FONCE)
    # Barre de titre du tableau de bord
    d.rectangle((280, 150, 1220, 210), fill=BLEU)
    d.text((310, 162), "Tableau de bord du service", font=police(32), fill=BLANC)
    # Barres
    base = 620
    for i, (h, c) in enumerate(((180, BLEU), (260, OR), (220, BLEU), (320, OR), (290, GRIS_FONCE))):
        x = 330 + i * 95
        d.rectangle((x, base - h, x + 60, base), fill=c)
    d.line((310, base, 820, base), fill=GRIS_FONCE, width=3)
    # Indicateurs
    for i, (val, c) in enumerate((("92 %", BLEU), ("4 j", GRIS_FONCE), ("18", BLEU))):
        y = 250 + i * 135
        d.rounded_rectangle((880, y, 1180, y + 110), radius=14, fill=GRIS_CLAIR, outline=c, width=5)
        d.text((910, y + 25), val, font=police(56), fill=c)
    # Clavier
    d.rounded_rectangle((420, 830, 1080, 940), radius=14, fill=BLANC, outline=GRIS_FONCE, width=3)
    for r in range(3):
        for k in range(12):
            x = 445 + k * 52
            y = 848 + r * 30
            d.rectangle((x, y, x + 40, y + 20), fill=GRIS_MOYEN)
    # Tasse
    d.rounded_rectangle((1200, 820, 1300, 940), radius=12, fill=OR)
    d.arc((1270, 845, 1340, 915), start=270, end=90, fill=OR, width=12)
    img.save(chemin, optimize=True)


def main():
    FIXTURES.mkdir(parents=True, exist_ok=True)
    for nom, dessin in (("logo-exemple.png", logo), ("image-exemple.png", poste)):
        chemin = FIXTURES / nom
        dessin(chemin)
        print(f"{chemin.name} : {chemin.stat().st_size} octets")


if __name__ == "__main__":
    main()
