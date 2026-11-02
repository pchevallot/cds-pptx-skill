---
name: cds-pptx
description: "Produit une présentation PowerPoint (.pptx) à la charte de Comptoir des Signaux (CdS) depuis une source Markdown, par un moteur sans IA : couverture, sections, seize motifs (cartes, chiffres clés, schémas, graphiques natifs, radar, carte de chaleur, icônes, citation, prompt, décodage, image, diapositive libre), métadonnées humaines, alertes par numéro de ligne. Déclencheurs : « deck CdS », « présentation CdS », « slides CdS », « Comptoir des Signaux », toute présentation à la charte CdS."
---

# cds-pptx v3 : une source Markdown, un moteur

Tu écris le fond et tu choisis la forme. Le moteur `moteur/cds-deck.js` met en page à la charte,
mesure chaque texte en Open Sans, pose logos, bandeau et métadonnées, et signale ce qui cloche
par numéro de ligne. Ton travail est éditorial : tu n'écris pas de code PptxGenJS.

Pour maintenir un ancien générateur v2 en JavaScript, lire `references/v2-motifs-historiques.md`.

## Cheminement

1. Écrire le fond : une idée par diapositive, un titre qui la dit.
2. Choisir un motif par idée (guide ci-dessous).
3. Écrire la source `deck.md` selon [grammaire.md](grammaire.md), dans le dossier du projet, à
   côté des images et du logo officiel du destinataire (demandé ou pris sur son site, jamais
   dessiné). `moteur/exemple.md` montre tous les motifs.
4. `node moteur/cds-deck.js deck.md --plan` : rendu en mémoire, mêmes alertes que la génération
   et plan, sans PPTX. Corriger la source, relancer, puis générer sans `--plan`.
5. Contrôle visuel, puis, dans l'atelier, `python3 cds-visuels/verifier-livrable.py --slides N deck.pptx`,
   où N compte chaque `#` et chaque `##` de la source.

Toute correction se fait dans la source et se régénère en quelques secondes.

## Choisir le motif

| Contenu | Motif |
|---|---|
| Un raisonnement, une liste d'idées | puces (sans directive) |
| Avant et après, deux options | deux colonnes (deux `###`) |
| 2 à 4 idées de même rang | `Cartes :` |
| Couches, catégories empilées | `Blocs :` |
| 2 à 4 chiffres qui frappent | `Chiffres clés :` |
| Comparer, suivre une évolution, des parts | `Graphique : barres`, `courbes`, `secteurs` |
| Données détaillées | tableau |
| Étapes, boucle, organisation, jalons, décision | `Schéma :` processus, cycle, hiérarchie, chronologie, logigramme |
| Maturité sur plusieurs dimensions | `Radar :` |
| Deux listes croisées (métiers et tâches) | `Carte de chaleur :` |
| 4 à 6 principes ou règles | `Icônes :` |
| Une parole de terrain | `Citation :` |
| Un prompt à copier, puis son explication | `Prompt :`, puis `Décodage :` |
| Une capture, une photo | image |

Varie les motifs : le même trois fois de suite déclenche une alerte. Un chiffre affiché cite sa
source (`Source :`, document et page). Une diapositive libre (`Diapositive libre : module.js`) se
justifie quand la forme porte le sens (matrice, recouvrement, escalier) et qu'aucun motif ne la
rend ; sinon un motif existant, même imparfait. Le contenu reste dans la source.

## Commande

```bash
node moteur/cds-deck.js deck.md [--sortie deck.pptx] [--plan] [--ecraser] [--skill dossier]
```

À côté de la sortie : `deck.pptx.empreinte` (sauf `--plan`) et `deck.pptx.plan.txt`, une ligne par
diapositive, écrit en code 0 ou 1, jamais en code 2, 3 ou 4.

| Code | Sens |
|---|---|
| 0 | aucune alerte |
| 1 | alertes, PPTX écrit (sauf `--plan`) |
| 2 | argument invalide, source absente ou illisible, charte introuvable |
| 3 | écriture refusée : retouche, fichier ouvert, sortie égale à la source |
| 4 | erreur imprévue du moteur |

**Garde d'écrasement.** L'empreinte SHA-256 du PPTX produit est écrite dans `.empreinte`. Si le
PPTX ne lui correspond plus, il a été retouché : le moteur refuse de l'écraser, `--ecraser`
compris. Pour régénérer quand même, renommer le PPTX, ou supprimer l'empreinte puis relancer avec
`--ecraser`. Un deck ouvert dans PowerPoint est refusé aussi.

## Installation

- Node 24. PptxGenJS et JSZip sont embarqués dans `moteur/vendor/` : rien à installer pour les
  motifs courants.
- Icônes : `npm install` dans `moteur/` (react, react-dom, react-icons et sharp, facultatifs).
- Radar et carte de chaleur : Python 3 avec matplotlib et numpy, désigné par `CDS_PYTHON`.

```bash
python3 -m venv moteur/.venv              # ou, si ensurepip manque : uv venv moteur/.venv
moteur/.venv/bin/pip install matplotlib numpy   # ou : uv pip install -p moteur/.venv matplotlib numpy
export CDS_PYTHON="$PWD/moteur/.venv/bin/python"
```

- Charte : le moteur cherche `cds-visuels/charte.js` en remontant depuis la source (atelier),
  puis `assets/` de la skill. Quand le moteur n'est pas posé dans la skill, une source hors de
  l'atelier demande `--skill dossier` (ou `CDS_SKILL`), sinon code 2. Le dossier est celui de la
  skill installée, qui contient `assets/` et `scripts/` (`~/.claude/skills/cds-pptx`), jamais une
  copie de travail.

Sans Python ni icônes, le deck sort quand même : alerte `DEPENDANCE_ABSENTE` et réserve légendée.

## Contrôle visuel

Le moteur garantit la mesure : débordement, coupure des titres, marges, ratio des logos,
métadonnées. L'œil juge la composition. Relis une planche contact à la première génération d'un
deck et à chaque diapositive libre, pas à chaque correction de texte.

1. PDF par `soffice --headless --convert-to pdf` (ou OnlyOffice), images par `pdftoppm -png -r 60`
   (ou PyMuPDF), assemblées en planche.
2. Relire en supposant des défauts : vides mal répartis, alignements, contraste, lisibilité au
   fond de la salle, titres mal coupés, accents, logo du destinataire. Un regard neuf en trouve
   davantage.
3. Corriger la source, régénérer, relire les diapositives touchées.

## Charte

Palette, hex sans `#` : bleu `1F519B` (principale), or `FDC948` (accents), blanc `FFFFFF`, gris
foncé `333333` (texte), gris clair `F5F5F5` (fonds) ; vert `4CAF50`, orange `FF9800` et rouge
`F44336` réservés aux données et aux signaux nommés par la source (`Cartes : rouge, orange, vert`,
grammaire.md). Police Open Sans.

Logos : jaune et blanc sur fond bleu (barre de titre, couverture), bleu et jaune sur fond clair,
ratio natif (3,99:1) conservé par `hauteurPour()` ; bandeau de motifs pleine largeur de 1,71
pouce. Le moteur les pose. Un module libre les prend dans `cds.charte` (`LOGOS.jaune_blanc`,
`BANDEAUX.jaune_h`), jamais par un chemin construit ni par une URL.

## À surveiller

Le moteur tient la plupart de ces règles ; une diapositive libre et le choix des mots restent à toi.

1. Pas de ligne d'accent sous les titres : signature des diapositives générées.
2. Pas de texte or sur fond blanc pour un paragraphe : contraste insuffisant.
3. Pas de logo bleu et jaune sur fond bleu : prendre le jaune et blanc.
4. Pas de logo déformé : toujours son ratio natif.
5. Pas de couleur hors palette, sauf graphiques de données.
6. Pas le même motif sur toutes les diapositives.
7. Un titre de plus d'une ligne se coupe à la main, au bloc de sens, par ` // ` : jamais un mot
   seul en dernière ligne, un article séparé de son nom, un mot coupé. Le moteur propose, tu choisis.
8. Pas de citation anglaise à l'écran : la traduction, sans guillemets ; l'original vérifié en
   `Pied :`, avec sa source et sa date.

---

<!-- SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot -->
<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->

Contenu sous [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr).
Le moteur et les extraits de code sont sous [EUPL 1.2](./LICENSE).
Les logos et l'identité visuelle de Comptoir des Signaux sont réservés :
voir [`LICENSES.fr.md`](./LICENSES.fr.md).
