---
name: cds-pptx
description: "Use this skill when creating PowerPoint presentations (.pptx) for Le Comptoir des Signaux (CdS). Triggers on: 'CdS', 'Comptoir des Signaux', 'presentation CdS', 'slides CdS', 'deck CdS', or any request for a branded presentation following the CdS visual identity. This skill provides the complete brand guide (colors, typography, layout rules, logos) and a standalone Python script for generating CdS-branded PPTX files."
---

# CdS PPTX — Charte graphique Comptoir des Signaux

Ce skill fournit tout le nécessaire pour créer des présentations PowerPoint respectant la charte graphique du Comptoir des Signaux.

> **LANGUE** : Tout le contenu des présentations DOIT être rédigé en français correct
> avec les accents (é, è, ê, à, ù, ç, etc.). Ne JAMAIS omettre les accents.
> Exemples : « Résilience », « stratégie », « collectivités territoriales », « télécommunication ».

> **LOGOS** : Si le téléchargement depuis GitHub échoue (sandbox sans accès réseau),
> utiliser les logos embarqués en base64 dans `scripts/logos_b64.py`.
> Importer `LOGO_BLEU_JAUNE_B64` (fond clair) ou `LOGO_JAUNE_BLANC_B64` (fond bleu),
> décoder avec `base64.b64decode()` et écrire dans un fichier temporaire avant insertion.

## Palette de couleurs

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Bleu CdS** | `#1F519B` | 31, 81, 155 | Couleur principale. Titres, barres, fonds de slides de couverture |
| **Or CdS** | `#FDC948` | 253, 201, 72 | Couleur secondaire. Accents, sous-titres, mise en valeur |
| **Blanc** | `#FFFFFF` | 255, 255, 255 | Texte sur fond bleu, fonds clairs |
| **Gris fonce** | `#333333` | 51, 51, 51 | Texte courant sur fond clair |
| **Gris clair** | `#F5F5F5` | 245, 245, 245 | Fonds secondaires, lignes alternees de tableaux |

### Regles d'utilisation des couleurs

- **Fond de slide de couverture** : Bleu CdS (`#1F519B`) avec texte blanc et accents or
- **Fond de slides de contenu** : Blanc (`#FFFFFF`) avec texte gris fonce
- **Barre de titre** : Rectangle pleine largeur en Bleu CdS, texte blanc, hauteur ~1"
- **En-tetes de tableaux** : Fond Bleu CdS, texte blanc, gras
- **Liens et accents** : Or CdS (`#FDC948`)
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

- **Slides de contenu** : logo clair **Jaune-Blanc** dans la barre titre bleue, en haut a droite, hauteur 0.5", marge 0.2" du bord
- **Slide de couverture** : logo clair (Jaune-Blanc) centre, hauteur 1.2"
- **Ratio du logo** : ~4:1 (largeur = hauteur x 4)
- **IMPORTANT** : sur fond bleu, toujours utiliser la variante Jaune-Blanc (jamais Bleu-Jaune dont le texte bleu serait invisible)

### Bandeau de motifs

- **Slides de couverture et de cloture** : bandeau jaune horizontal en bas de slide
- **Ratio preserve** : ne JAMAIS etirer le bandeau — toujours calculer la hauteur a partir du ratio reel de l'image
- La methode `_add_bandeau()` du script gere automatiquement le ratio
- Hauteur max : 1.2" pour ne pas empieter sur le contenu

### Tableaux

- En-tete : fond Bleu CdS, texte blanc gras, centre
- Lignes alternees : blanc / Gris clair (`#F5F5F5`)
- Bordures : fines, gris clair
- Padding interne : suffisant pour la lisibilite

## Script Python — Boite a outils

Un script autonome est disponible dans `scripts/cds_pptx.py`. Il fournit une classe `CdsPptxBuilder` avec des methodes reutilisables :

- `add_cover(title, subtitle)` — slide de couverture (fond bleu, logo clair centre)
- `add_content_slide(title, content)` — slide texte avec barre titre + logo
- `add_bullet_slide(title, bullets)` — slide avec liste a puces
- `add_table_slide(title, headers, rows)` — slide avec tableau formate
- `add_chart_slide(title, image_path)` — slide avec graphique (image PNG/JPG)
- `add_radar_slide(title, labels, datasets, chart_title)` — slide avec diagramme radar matplotlib (ratio carre garanti)
- `add_section_slide(title, subtitle)` — slide de separation (fond bleu)
- `add_closing_slide(text, contact)` — slide de cloture (avec bandeau decoratif)

### Comportement attendu

> **IMPORTANT** : la fonction `main()` du script est un simple exemple de demonstration.
> Ne JAMAIS generer les slides d'exemple a la place du contenu demande par l'utilisateur.
>
> Quand l'utilisateur demande une presentation, tu DOIS :
> 1. Comprendre le contenu specifique qu'il souhaite presenter
> 2. Ecrire un script Python qui utilise la classe `CdsPptxBuilder` pour creer
>    exactement les slides correspondant a SON contenu
> 3. Appliquer systematiquement la charte CdS (couleurs, Open Sans, logos, mise en page)
>
> Le script est une boite a outils, pas un generateur de demo.

### Dependances

```bash
pip install python-pptx requests matplotlib numpy Pillow
```

### Exemple d'integration

```python
from cds_pptx import CdsPptxBuilder

builder = CdsPptxBuilder()

# Adapter les slides au contenu reel de l'utilisateur
builder.add_cover("Titre de la presentation", "Sous-titre ou client")
builder.add_bullet_slide("Points cles", ["Premier point", "Deuxieme point"])
builder.add_table_slide("Resultats", ["Indicateur", "Valeur"], [["Taux", "85%"]])
builder.add_closing_slide("Merci", "contact@comptoirdessignaux.com")

builder.save("ma_presentation.pptx")
```

Lire [references/brand-guide.md](references/brand-guide.md) pour les specifications detaillees.

## Diagrammes radar — Regles imperatives

> **Toujours utiliser `add_radar_slide()`** pour les diagrammes radar au lieu de generer
> manuellement un graphique matplotlib puis l'inserer avec `add_chart_slide()`.
>
> La methode `add_radar_slide()` garantit :
> - Format carre (`figsize=(8, 8)`) pour un radar non deforme
> - `ax.set_aspect("equal")` pour un cercle parfait
> - Couleurs CdS automatiques (Bleu, Or, Rouge, Vert, Orange)
> - Legende positionnee hors du graphique (pas de chevauchement)
> - DPI 150 pour une image nette

### Exemple d'utilisation

```python
builder.add_radar_slide(
    title="Comparatif des dimensions",
    labels=["Axe 1", "Axe 2", "Axe 3", "Axe 4", "Axe 5"],
    datasets=[
        {"label": "Situation actuelle", "values": [3, 5, 2, 4, 6]},
        {"label": "Cible", "values": [8, 9, 7, 8, 9], "color": "#FDC948"},
    ],
    chart_title="Radar de maturite",
)
```

### Si tu dois generer un graphique matplotlib manuellement

- **Toujours** utiliser `figsize=(8, 8)` pour les radars (carre)
- **Toujours** appeler `ax.set_aspect("equal")`
- **Toujours** sauvegarder avec `dpi=150, bbox_inches="tight"`
- **Toujours** placer la legende avec `bbox_to_anchor` hors de la zone du graphique
- **Ne jamais** utiliser `figsize=(10, 6)` ou tout autre format rectangulaire pour un radar

## Checklist avant livraison

- [ ] Police Open Sans utilisee partout (pas d'Arial, pas de Calibri)
- [ ] Couleurs exclusivement issues de la palette CdS
- [ ] Logo Jaune-Blanc sur barre titre bleue et slides de couverture (jamais Bleu-Jaune sur fond bleu)
- [ ] Bandeau de motifs non deforme sur couverture et cloture (ratio preserve)
- [ ] Barre de titre bleue sur toutes les slides de contenu
- [ ] Marges respectees (0.5" minimum)
- [ ] Texte align a gauche (sauf titres centres)
- [ ] Tableaux avec en-tetes bleus et lignes alternees
