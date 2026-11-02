#!/usr/bin/env python3
# SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
# SPDX-License-Identifier: EUPL-1.2
"""Génère open-sans-largeurs.json : largeur de chaque caractère, en em, pour
Open Sans Regular et Bold, mesurée par PIL à 1 000 unités.

Usage : python3 -P mesurer-open-sans.py <dossier des polices> [sortie.json]

Le dossier doit contenir OpenSans-Regular.ttf et OpenSans-Bold.ttf. Il reste un
argument : il n'est écrit ni dans le JSON ni dans le moteur. La table ignore le
crénage (largeur par caractère).

`-P` plutôt que `-I` : `-I` désactive le site utilisateur, où PIL est installé."""
import json
import os
import sys

from PIL import ImageFont

TAILLE = 1000
EXTRA = "’‘“”«»…œŒ–€  "


def caracteres():
    cars = [chr(c) for c in range(0x20, 0x7F)]
    cars += [chr(c) for c in range(0xA0, 0x100)]
    cars += list(EXTRA)
    return sorted(set(cars))


def table(chemin, cars):
    police = ImageFont.truetype(chemin, TAILLE)
    return {c: round(police.getlength(c) / TAILLE, 4) for c in cars}


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    dossier = sys.argv[1]
    sortie = sys.argv[2] if len(sys.argv) > 2 else os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "open-sans-largeurs.json")
    cars = caracteres()
    reg = table(os.path.join(dossier, "OpenSans-Regular.ttf"), cars)
    gras = table(os.path.join(dossier, "OpenSans-Bold.ttf"), cars)
    data = {
        "regulier": reg,
        "gras": gras,
        "defaut": {"regulier": reg["n"], "gras": gras["n"]},
    }
    with open(sortie, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=0)
        f.write("\n")
    print(f"{len(cars)} caractères, écrit dans {os.path.basename(sortie)}")


main()
