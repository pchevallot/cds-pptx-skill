---
name: cds-pptx
description: "Use this skill when creating PowerPoint presentations (.pptx) for Le Comptoir des Signaux (CdS). Triggers on: 'CdS', 'Comptoir des Signaux', 'presentation CdS', 'slides CdS', 'deck CdS', or any request for a branded presentation following the CdS visual identity. This skill provides the complete brand guide (colors, typography, layout rules, logos) and a standalone Python script for generating CdS-branded PPTX files."
---

# CdS PPTX — Charte graphique Comptoir des Signaux

Ce skill fournit tout le necessaire pour creer des presentations PowerPoint respectant la charte graphique du Comptoir des Signaux.

## Palette de couleurs

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Bleu CdS** | `#1F519B` | 31, 81, 155 | Couleur principale. Titres, barres, fonds de slides de couverture |
| **Or CdS** | `#D4AF37` | 212, 175, 55 | Couleur secondaire. Accents, sous-titres, mise en valeur |
| **Blanc** | `#FFFFFF` | 255, 255, 255 | Texte sur fond bleu, fonds clairs |
| **Gris fonce** | `#333333` | 51, 51, 51 | Texte courant sur fond clair |
| **Gris clair** | `#F5F5F5` | 245, 245, 245 | Fonds secondaires, lignes alternees de tableaux |

### Regles d'utilisation des couleurs

- **Fond de slide de couverture** : Bleu CdS (`#1F519B`) avec texte blanc et accents or
- **Fond de slides de contenu** : Blanc (`#FFFFFF`) avec texte gris fonce
- **Barre de titre** : Rectangle pleine largeur en Bleu CdS, texte blanc, hauteur ~1"
- **En-tetes de tableaux** : Fond Bleu CdS, texte blanc, gras
- **Liens et accents** : Or CdS (`#D4AF37`)
- **Ne jamais utiliser** de couleurs hors palette sauf pour des graphiques de donnees (vert validation `#4CAF50`, orange attention `#FF9800`, rouge alerte `#F44336`)

## Typographie

| Element | Police | Taille | Style |
|---------|--------|--------|-------|
| Titre de slide | Open Sans | 36-44pt | Bold |
| Sous-titre | Open Sans | 20-24pt | Bold |
| Texte courant | Open Sans | 14-16pt | Regular |
| Legendes / notes | Open Sans | 10-12pt | Regular, couleur attenuee |
| En-tetes tableau | Open Sans | 12-14pt | Bold, blanc sur bleu |
| Contenu tableau | Open Sans | 11-12pt | Regular |

> **Fallback** : si Open Sans n'est pas disponible, utiliser Calibri (Windows) ou Carlito (Linux).

## Logos — URLs de telechargement

Les logos sont heberges sur GitHub. Utiliser les URLs `raw.githubusercontent.com` pour les telecharger dans les scripts.

### Logos complets (ratio ~4:1)

| Variante | Usage | URL |
|----------|-------|-----|
| **Bleu-Jaune** | Standard, fond clair | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Bleu-Jaune.png` |
| **Jaune-Blanc** | Fond bleu/sombre | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Jaune-Blanc.png` |
| **Bleu-Blanc** | Monochrome bleu | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Bleu-Blanc.png` |
| **Noir** | Impression N&B | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Noir.png` |
| **Blanc** | Fond tres sombre | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Blanc.png` |

### Monogrammes (ratio ~1:1)

| Variante | URL |
|----------|-----|
| **Bleu-Jaune** | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/monogrammes/Monogramme-Bleu-Jaune.png` |
| **Blanc-Jaune** | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/monogrammes/Monogramme-Blanc-Jaune.png` |
| **Blanc** | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/monogrammes/Monogramme-Blanc.png` |
| **Noir** | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/monogrammes/Monogramme-Noir.png` |

### Bandeaux de motifs

| Variante | URL |
|----------|-----|
| Bleu horizontal | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-bleu-horizontal.png` |
| Blanc horizontal | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-blanc-horizontal.png` |
| Jaune horizontal | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-jaune-horizontal.png` |
| Bleu vertical | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-bleu-vertical.png` |
| Blanc vertical | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-blanc-vertical.png` |
| Jaune vertical | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-jaune-vertical.png` |

## Mise en page

### Dimensions

- **Format** : 16:9 widescreen (13.333" x 7.5")
- **Marges minimales** : 0.5" sur tous les cotes
- **Espacement entre blocs** : 0.3" - 0.5"

### Structure type d'une slide

```
+--------------------------------------------------+
| [Barre titre bleue #1F519B, h=1"]   [Logo 0.5"]  |
|                                                    |
|  Zone de contenu                                   |
|  (debut a 1.5" du haut)                           |
|  (largeur utile : ~12.333")                       |
|  (hauteur utile : ~5.5")                          |
|                                                    |
+--------------------------------------------------+
```

### Regles de placement du logo

- **Slides de contenu** : logo standard (Bleu-Jaune) en haut a droite, hauteur 0.5", marge 0.2" du bord
- **Slide de couverture** : logo clair (Jaune-Blanc) centre, hauteur 1.2"
- **Ratio du logo** : ~4:1 (largeur = hauteur x 4)

### Tableaux

- En-tete : fond Bleu CdS, texte blanc gras, centre
- Lignes alternees : blanc / Gris clair (`#F5F5F5`)
- Bordures : fines, gris clair
- Padding interne : suffisant pour la lisibilite

## Script Python

Un script autonome est disponible dans `scripts/cds_pptx.py`. Il fournit une classe `CdsPptxBuilder` qui :

1. Telecharge automatiquement les logos depuis GitHub (avec cache local)
2. Applique la charte graphique CdS (couleurs, polices, mise en page)
3. Genere un fichier `.pptx` valide

### Utilisation

```bash
pip install python-pptx requests
python scripts/cds_pptx.py
```

### Integration dans du code

```python
from cds_pptx import CdsPptxBuilder

builder = CdsPptxBuilder()

# Slide de couverture
builder.add_cover("Titre principal", "Sous-titre ou nom du client")

# Slide de contenu avec titre
builder.add_content_slide("Mon titre", "Texte du contenu...")

# Slide avec tableau
builder.add_table_slide("Titre", headers=["Col1", "Col2"], rows=[["a", "b"], ["c", "d"]])

# Sauvegarder
builder.save("ma_presentation.pptx")
```

Lire [references/brand-guide.md](references/brand-guide.md) pour les specifications detaillees.

## Checklist avant livraison

- [ ] Police Open Sans utilisee partout (pas d'Arial, pas de Calibri)
- [ ] Couleurs exclusivement issues de la palette CdS
- [ ] Logo correct selon le fond (Bleu-Jaune sur clair, Jaune-Blanc sur bleu)
- [ ] Barre de titre bleue sur toutes les slides de contenu
- [ ] Marges respectees (0.5" minimum)
- [ ] Texte align a gauche (sauf titres centres)
- [ ] Tableaux avec en-tetes bleus et lignes alternees
