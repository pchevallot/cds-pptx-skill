# CdS PPTX Skill v2 : double moteur PowerPoint, Comptoir des Signaux

Skill pour Claude Code (et autres outils IA) permettant de generer des presentations PowerPoint respectant la charte graphique du **Comptoir des Signaux**.

**v2** : double moteur **PptxGenJS** (slides creatives) + **matplotlib** (dataviz complexes).

## Contenu du repository

```
cds-pptx-skill/
├── SKILL.md                     # Point d'entree du skill (routing, palette, QA)
├── pptxgenjs-cds.md             # Guide PptxGenJS : 15 patterns de slides
├── dataviz.md                   # Guide matplotlib : radar, heatmap, bar, line
├── references/
│   └── brand-guide.md           # Guide de marque complet
├── scripts/
│   ├── cds_charts.py            # Fonctions matplotlib autonomes (PNG)
│   └── logos_b64.py             # Logos embarques en base64 (fallback reseau)
└── assets/
    ├── logos/                   # 5 variantes du logo CdS
    ├── monogrammes/             # 4 variantes du monogramme
    └── bandeaux/                # 6 bandeaux de motifs decoratifs
```

## Architecture double moteur

| Moteur | Usage | Fichier |
|--------|-------|---------|
| **PptxGenJS** | Slides creatives : cover, section, cards, blocks, stats, timeline, table, chart natif, quote, icon grid, image+text, closing | `pptxgenjs-cds.md` |
| **matplotlib** | Dataviz complexes : radar SOCLE, heatmap de maturite, scatter, bubble | `dataviz.md` + `scripts/cds_charts.py` |

Le workflow pour les dataviz : generer le PNG en Python via `cds_charts.py`, puis l'inserer dans PptxGenJS via `addImage()`.

## Installation

### Pour Claude Code (CLI)

```bash
git clone https://github.com/pchevallot/cds-pptx-skill.git
# Windows
xcopy /E /I cds-pptx-skill %USERPROFILE%\.claude\skills\cds-pptx
# macOS / Linux
cp -r cds-pptx-skill ~/.claude/skills/cds-pptx
```

### Pour Claude Web / Claude Desktop (Projects)

1. Creer un nouveau **Project** dans Claude
2. Copier `SKILL.md` dans les **Custom Instructions**
3. Ajouter `pptxgenjs-cds.md` et `dataviz.md` comme fichiers de reference
4. Ajouter `references/brand-guide.md` en complement
5. Joindre `scripts/cds_charts.py` et `scripts/logos_b64.py`

### Dependances

```bash
# PptxGenJS (obligatoire)
npm install -g pptxgenjs

# matplotlib (pour les dataviz)
pip install matplotlib numpy Pillow

# Optionnel : icones pour le pattern Icon Grid
npm install -g react-icons react react-dom sharp
```

## Charte graphique : Resume

### Couleurs

| Nom | Hex | Usage |
|-----|-----|-------|
| Bleu CdS | `#1F519B` | Couleur principale (titres, barres, fonds couverture) |
| Or CdS | `#FDC948` | Accents, sous-titres, mise en valeur |
| Blanc | `#FFFFFF` | Texte sur fond bleu, fonds clairs |
| Gris fonce | `#333333` | Texte courant |
| Gris clair | `#F5F5F5` | Fonds secondaires, lignes alternees |

### Typographie

**Open Sans** partout (fallback : Calibri sur Windows, Carlito sur Linux).

### 15 patterns de slides disponibles

1. Cover : couverture fond bleu + bandeau
2. Section divider : separateur fond bleu
3. Content : texte simple
4. Bullets : liste a puces
5. Two-column : deux colonnes
6. Cards : 2-4 cartes avec ombres
7. Blocks : blocs empiles avec barres d'accent
8. Stats callout : grands chiffres KPI
9. Table : tableau brande
10. Bar/Line/Pie chart : charts natifs PptxGenJS
11. Timeline : frise chronologique
12. Icon grid : grille d'icones
13. Quote : citation sur fond bleu
14. Image + text : image et texte cote a cote
15. Closing : slide de cloture + bandeau

### Pipeline QA integre

Chaque presentation passe par un cycle obligatoire :
1. Generation du .pptx
2. Conversion en images (LibreOffice + pdftoppm)
3. Inspection visuelle via subagent
4. Boucle fix-and-verify jusqu'a zero defaut

## Licence

Ce dépôt est publié sous **licences multiples**, parce qu'il mélange trois natures
de contenu. Le détail figure dans [`LICENSES.fr.md`](./LICENSES.fr.md).

| Nature | Licence | Périmètre |
|---|---|---|
| **Code logiciel** | [EUPL 1.2](./LICENSE) | `scripts/cds_charts.py`, `references/set_ooxml_metadata.py`, extraits de code des guides |
| **Contenus et méthode** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr) | `SKILL.md`, `pptxgenjs-cds.md`, `dataviz.md`, `references/brand-guide.md`, `README.md` |
| **Identité visuelle et marque** | **Tous droits réservés** | `assets/`, `scripts/logos_b64.py`, la dénomination « COMPTOIR DES SIGNAUX » |

> **Réserve de marque.** « COMPTOIR DES SIGNAUX » est une marque verbale française
> enregistrée le 21/06/2024 sous le numéro **5036143**, classes 38, 41 et 42, au nom de
> COMPTOIR DES SIGNAUX, SAS. Les logos, monogrammes et bandeaux, y compris leur version
> base64 dans `scripts/logos_b64.py`, sont protégés au titre du droit d'auteur. Vous
> pouvez réutiliser le code et la méthode **en y substituant votre propre identité
> visuelle**. Voir [`assets/LICENCE-MARQUE.md`](./assets/LICENCE-MARQUE.md).

GitHub affiche un libellé de licence unique, déduit du fichier `LICENSE` : il annoncera
« EUPL-1.2 » pour tout le dépôt. Cette détection ne sait pas lire les régimes multiples,
c'est le tableau ci-dessus qui fait foi.

Ce choix est celui déjà retenu pour [`comptoir-des-harnais`](https://github.com/pchevallot/comptoir-des-harnais),
étendu d'un troisième régime que ce dépôt impose : il est fait de marque.

Les dépendances (PptxGenJS, matplotlib, NumPy, Pillow) restent régies par leurs propres
licences. Aucun fichier de police n'est distribué : **Open Sans** est seulement prescrite.
