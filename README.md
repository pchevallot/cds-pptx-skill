# CdS PPTX Skill v2 — Double moteur PowerPoint du Comptoir des Signaux

Skill pour Claude Code (et autres outils IA) permettant de generer des presentations PowerPoint respectant la charte graphique du **Comptoir des Signaux**.

**v2** : double moteur **PptxGenJS** (slides creatives) + **matplotlib** (dataviz complexes).

## Contenu du repository

```
cds-pptx-skill/
├── SKILL.md                     # Point d'entree du skill (routing, palette, QA)
├── pptxgenjs-cds.md             # Guide PptxGenJS — 15 patterns de slides
├── dataviz.md                   # Guide matplotlib — radar, heatmap, bar, line
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

## Charte graphique — Resume

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

1. Cover — couverture fond bleu + bandeau
2. Section divider — separateur fond bleu
3. Content — texte simple
4. Bullets — liste a puces
5. Two-column — deux colonnes
6. Cards — 2-4 cartes avec ombres
7. Blocks — blocs empiles avec barres d'accent
8. Stats callout — grands chiffres KPI
9. Table — tableau brande
10. Bar/Line/Pie chart — charts natifs PptxGenJS
11. Timeline — frise chronologique
12. Icon grid — grille d'icones
13. Quote — citation sur fond bleu
14. Image + text — image et texte cote a cote
15. Closing — slide de cloture + bandeau

### Pipeline QA integre

Chaque presentation passe par un cycle obligatoire :
1. Generation du .pptx
2. Conversion en images (LibreOffice + pdftoppm)
3. Inspection visuelle via subagent
4. Boucle fix-and-verify jusqu'a zero defaut

## Licence

Usage interne Le Comptoir des Signaux. Les logos et la charte graphique sont la propriete du Comptoir des Signaux.
