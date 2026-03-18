# CdS PPTX Skill — Charte graphique PowerPoint du Comptoir des Signaux

Skill pour Claude Code (et autres outils IA) permettant de generer des presentations PowerPoint respectant la charte graphique du **Comptoir des Signaux**.

## Contenu du repository

```
cds-pptx-skill/
├── SKILL.md                     # Skill Claude Code (charte + regles)
├── references/
│   └── brand-guide.md           # Guide de marque detaille
├── scripts/
│   └── cds_pptx.py              # Script Python autonome
└── assets/
    ├── logos/                   # 5 variantes du logo CdS
    ├── monogrammes/             # 4 variantes du monogramme
    └── bandeaux/                # 6 bandeaux de motifs decoratifs
```

## Installation

### Pour Claude Code (CLI)

Copier le dossier dans vos skills Claude Code :

```bash
# Cloner le repo
git clone https://github.com/pchevallot/cds-pptx-skill.git

# Copier dans le dossier skills
# Windows
xcopy /E /I cds-pptx-skill %USERPROFILE%\.claude\skills\cds-pptx

# macOS / Linux
cp -r cds-pptx-skill ~/.claude/skills/cds-pptx
```

Le skill sera automatiquement detecte par Claude Code lors de la prochaine session.

### Pour Claude Web / Claude Desktop (Projects)

1. Creer un nouveau **Project** dans Claude
2. Copier-coller le contenu de `SKILL.md` dans les **Custom Instructions** du projet
3. Copier-coller le contenu de `references/brand-guide.md` en complement
4. Joindre le script `scripts/cds_pptx.py` comme fichier de reference

### Pour un collegue

Partager ce lien : **https://github.com/pchevallot/cds-pptx-skill**

Le collegue peut :
- **Claude Code** : cloner + copier dans `~/.claude/skills/cds-pptx/`
- **Claude Web** : copier `SKILL.md` dans les instructions d'un Project
- **Autre outil IA** : utiliser le script `cds_pptx.py` directement

## Utilisation du script Python

### Prerequis

```bash
pip install python-pptx requests
```

### Generer une demo

```bash
python scripts/cds_pptx.py
# -> Cree demo_cds_presentation.pptx (6 slides)
```

### Utiliser comme module

```python
from cds_pptx import CdsPptxBuilder

builder = CdsPptxBuilder()

# Couverture (fond bleu, logo clair centre)
builder.add_cover("Titre", "Sous-titre")

# Slide de contenu (barre titre bleue, logo en haut a droite)
builder.add_content_slide("Mon titre", "Texte du contenu...")

# Liste a puces
builder.add_bullet_slide("Prochaines etapes", ["Point 1", "Point 2", "Point 3"])

# Tableau (en-tetes bleus, lignes alternees)
builder.add_table_slide("Resultats", ["Col A", "Col B"], [["val1", "val2"]])

# Graphique (image PNG/JPG)
builder.add_chart_slide("Evolution", "chemin/vers/graphique.png")

# Slide de section (fond bleu, separation visuelle)
builder.add_section_slide("Partie 2", "Sous-titre optionnel")

# Slide de cloture
builder.add_closing_slide("Merci", "contact@cds.com")

# Sauvegarder
builder.save("ma_presentation.pptx")
```

## Charte graphique — Resume

### Couleurs

| Nom | Hex | Usage |
|-----|-----|-------|
| Bleu CdS | `#1F519B` | Couleur principale (titres, barres, fonds couverture) |
| Or CdS | `#D4AF37` | Accents, sous-titres, mise en valeur |
| Blanc | `#FFFFFF` | Texte sur fond bleu, fonds clairs |
| Gris fonce | `#333333` | Texte courant |
| Gris clair | `#F5F5F5` | Fonds secondaires, lignes alternees |

### Typographie

**Open Sans** partout (fallback : Calibri sur Windows, Carlito sur Linux).

| Element | Taille | Style |
|---------|--------|-------|
| Titre de slide | 36-44pt | Bold |
| Sous-titre | 20-24pt | Bold |
| Texte courant | 14-16pt | Regular |
| Tableaux | 11-13pt | Regular / Bold (en-tetes) |

### Logos

| Variante | Fond |
|----------|------|
| Bleu-Jaune | Fond clair (standard) |
| Jaune-Blanc | Fond bleu (couverture) |
| Bleu-Blanc | Fond blanc (monochrome) |
| Noir | Impression N&B |
| Blanc | Fond tres sombre |

## Licence

Usage interne Le Comptoir des Signaux. Les logos et la charte graphique sont la propriete du Comptoir des Signaux.
