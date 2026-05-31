---
name: cds-pptx
description: "Use this skill when creating PowerPoint presentations (.pptx) for Comptoir des Signaux (CdS). Triggers on: 'CdS', 'Comptoir des Signaux', 'presentation CdS', 'slides CdS', 'deck CdS', or any request for a branded presentation following the CdS visual identity. Double engine: PptxGenJS for creative slides + matplotlib for complex dataviz (radar, heatmap). Includes QA pipeline and complete brand guide."
---

# CdS PPTX v2 : Double Moteur

Ce skill genere des presentations PowerPoint respectant la charte graphique du Comptoir des Signaux.
Il utilise deux moteurs complementaires :

- **PptxGenJS** : slides creatives (ombres, charts natifs, icones, variete de layouts)
- **matplotlib** : dataviz complexes (radar SOCLE, heatmaps de maturite)

> **LANGUE** : Tout le contenu des presentations DOIT etre redige en francais correct
> avec les accents (e, e, e, a, u, c, etc.). Ne JAMAIS omettre les accents.
> Exemples : « Resilience », « strategie », « collectivites territoriales ».

> **LOGOS** : Si le telechargement depuis GitHub echoue (sandbox sans acces reseau),
> utiliser les logos embarques en base64 dans `scripts/logos_b64.py`.
> Importer `LOGO_BLEU_JAUNE_B64` (fond clair) ou `LOGO_JAUNE_BLANC_B64` (fond bleu),
> decoder et utiliser comme source `data:` dans PptxGenJS.

---

## Quick Reference

| Tache | Guide |
|-------|-------|
| Creer une presentation | Lire [pptxgenjs-cds.md](pptxgenjs-cds.md) |
| Generer une dataviz (radar, heatmap) | Lire [dataviz.md](dataviz.md) |
| Consulter la charte complete | Lire [references/brand-guide.md](references/brand-guide.md) |

---

## Palette de couleurs

Hex **SANS** `#` : obligation PptxGenJS.

| Nom | Hex | RGB | Usage |
|-----|-----|-----|-------|
| **Bleu CdS** | `1F519B` | 31, 81, 155 | Couleur principale. Titres, barres, fonds couverture |
| **Or CdS** | `FDC948` | 253, 201, 72 | Accents, sous-titres, mise en valeur |
| **Blanc** | `FFFFFF` | 255, 255, 255 | Texte sur fond bleu, fonds clairs |
| **Gris fonce** | `333333` | 51, 51, 51 | Texte courant sur fond clair |
| **Gris clair** | `F5F5F5` | 245, 245, 245 | Fonds secondaires, lignes alternees |
| Vert | `4CAF50` | 76, 175, 80 | Validation, positif (graphiques) |
| Orange | `FF9800` | 255, 152, 0 | Attention, en cours (graphiques) |
| Rouge | `F44336` | 244, 67, 54 | Alerte, critique (graphiques) |

---

## Typographie

| Element | Police | Taille | Style |
|---------|--------|--------|-------|
| Titre de slide | Open Sans | 36-44pt | Bold |
| Sous-titre | Open Sans | 20-24pt | Bold |
| Texte courant | Open Sans | 14-16pt | Regular |
| Legendes / notes | Open Sans | 10-12pt | Regular, couleur attenuee |
| En-tetes tableau | Open Sans | 12-14pt | Bold, blanc sur bleu |

> **Fallback** : si Open Sans n'est pas disponible, utiliser Calibri (Windows) ou Carlito (Linux).

---

## Logos : URLs de telechargement

### Logos complets (ratio ~4:1)

| Variante | Usage | URL |
|----------|-------|-----|
| **Jaune-Blanc** | Fond bleu/sombre | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Jaune-Blanc.png` |
| **Bleu-Jaune** | Fond clair | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Bleu-Jaune.png` |
| **Bleu-Blanc** | Monochrome | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/logos/CDS-Logo-Bleu-Blanc.png` |
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
| Jaune horizontal | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-jaune-horizontal.png` |
| Bleu horizontal | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-bleu-horizontal.png` |
| Blanc horizontal | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-blanc-horizontal.png` |
| Jaune vertical | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-jaune-vertical.png` |
| Bleu vertical | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-bleu-vertical.png` |
| Blanc vertical | `https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets/bandeaux/Bandeau-motifs-blanc-vertical.png` |

---

## Matrice de routage moteur

| Type de slide | Moteur | Fichier de reference |
|---|---|---|
| Cover, section, closing | PptxGenJS | [pptxgenjs-cds.md](pptxgenjs-cds.md) |
| Content, bullets, two-column | PptxGenJS | [pptxgenjs-cds.md](pptxgenjs-cds.md) |
| Cards, blocks, stats callouts | PptxGenJS | [pptxgenjs-cds.md](pptxgenjs-cds.md) |
| Tables, charts natifs (bar/pie/line) | PptxGenJS | [pptxgenjs-cds.md](pptxgenjs-cds.md) |
| Timeline, icon grid, quote, image+text | PptxGenJS | [pptxgenjs-cds.md](pptxgenjs-cds.md) |
| Radar SOCLE (polaire, 5 dimensions) | matplotlib → PNG → PptxGenJS | [dataviz.md](dataviz.md) |
| Heatmap de maturite | matplotlib → PNG → PptxGenJS | [dataviz.md](dataviz.md) |
| Dataviz complexe (scatter, bubble) | matplotlib → PNG → PptxGenJS | [dataviz.md](dataviz.md) |

---

## Schémas Excalidraw (croquis manuscrit, optionnel)

Pour un schéma au rendu « croquis à la main » (utile en atelier grand public ou
pour dédramatiser un mécanisme), la skill `excalidraw-diagram` génère un PNG
rebrandé CdS que l'on insère ici via `addImage` (comme un PNG matplotlib).
**Pas de fusion de skills** : Excalidraw produit l'image, cds-pptx l'assemble.

Workflow, quand l'utiliser, et leçons d'installation (version esm.sh à épingler,
accents validés) : voir `~/.claude/skills/excalidraw-diagram/CDS-INTEGRATION.md`.

Pour un public technique, préférer en général les schémas PptxGenJS natifs
(rendu net, cohérent avec le reste du deck).

---

## Comportement attendu

> **IMPORTANT** : Quand l'utilisateur demande une presentation, tu DOIS :
> 1. Comprendre le contenu specifique qu'il souhaite presenter
> 2. Ecrire un script JS (PptxGenJS) qui genere exactement les slides de SON contenu
> 3. Si des dataviz complexes sont necessaires, generer d'abord les PNG via `cds_charts.py`
> 4. **Varier les layouts** : ne JAMAIS utiliser le meme pattern sur toutes les slides
> 5. Appliquer systematiquement la charte CdS (couleurs, Open Sans, logos, mise en page)
> 6. Executer le pipeline QA avant de declarer succes

---

## Design de slides : Regles de choix de pattern

| Type de contenu | Pattern recommande |
|---|---|
| Texte libre, paragraphes simples | `addContentSlide` |
| Liste de points | `addBulletSlide` |
| Deux contenus cote a cote | `addTwoColumnSlide` |
| Couches, categories, processus | `addBlocksSlide` |
| Comparaison 2-4 elements | `addCardsSlide` |
| KPI, metriques cles | `addStatsSlide` |
| Donnees tabulaires | `addTableSlide` |
| Bar/Line/Pie chart | `addBarChartSlide` / `addLineChartSlide` / `addPieChartSlide` |
| Jalons, planning | `addTimelineSlide` |
| Features avec icones | `addIconGridSlide` |
| Citation, verbatim | `addQuoteSlide` |
| Image illustrative + texte | `addImageTextSlide` |
| Radar de maturite | matplotlib `generate_radar()` → PNG → `addImage` |
| Heatmap | matplotlib `generate_heatmap()` → PNG → `addImage` |

---

## Pipeline QA (obligatoire)

**Assumer qu'il y a des problemes. Le premier rendu n'est presque jamais correct.**

### Etape 1 : Generation du .pptx

```bash
node generate_presentation.js
```

### Etape 2 : Conversion en images

```bash
python scripts/office/soffice.py --headless --convert-to pdf output.pptx
pdftoppm -jpeg -r 150 output.pdf slide
```

Cree `slide-01.jpg`, `slide-02.jpg`, etc.

### Etape 3 : Inspection visuelle via subagent

Utiliser un subagent avec ce prompt :

```
Inspecter visuellement ces slides. Assumer qu'il y a des problemes : les trouver.

Chercher :
- Elements qui se chevauchent (texte a travers des formes, lignes a travers des mots)
- Texte coupe ou debordant des limites
- Elements trop proches (< 0.3" de gap) ou crampes
- Espacement inegal (grande zone vide d'un cote, dense de l'autre)
- Marges insuffisantes depuis les bords (< 0.5")
- Colonnes ou elements similaires non alignes
- Texte a faible contraste
- Accents manquants dans le texte francais
- Logo absent ou mal positionne

Pour chaque slide, lister les problemes trouves, meme mineurs.

Lire et analyser ces images :
1. /path/to/slide-01.jpg (Attendu : [description])
2. /path/to/slide-02.jpg (Attendu : [description])

Signaler TOUS les problemes trouves.
```

### Etape 4 : Boucle fix-and-verify

1. Corriger les problemes identifies
2. Reconvertir en images les slides affectees
3. Re-inspecter
4. Repeter jusqu'a ce qu'un pass complet ne revele aucun nouveau probleme

**Ne JAMAIS declarer succes sans au moins un cycle fix+verify.**

---

## Anti-patterns : A ne JAMAIS faire

### Charte graphique
1. **Jamais de ligne d'accent sous les titres** : signature typique des slides IA
2. **Jamais de texte or sur fond blanc** pour des paragraphes longs (contraste insuffisant)
3. **Jamais de logo Bleu-Jaune sur fond bleu** : utiliser Jaune-Blanc
4. **Jamais de logo deforme** : toujours respecter le ratio 4:1
5. **Jamais de couleurs hors palette** sauf graphiques de donnees
6. **Jamais le meme layout sur toutes les slides** : varier les patterns !

### PptxGenJS
7. **Jamais de `#` dans les couleurs hex** : `"1F519B"` pas `"#1F519B"`
8. **Jamais reutiliser un objet options** : `makeShadow()` pour chaque appel
9. **Jamais de bullets Unicode** : utiliser `bullet: true`
10. **Jamais encoder l'opacite dans le hex** : utiliser `opacity: 0.15`
11. **Jamais d'offset d'ombre negatif** : corromprait le fichier
12. **Jamais de `ROUNDED_RECTANGLE` avec overlay rectangulaire** : coins non couverts

### Dataviz
13. **Jamais de radar en format rectangulaire** : `figsize=(8, 8)` + `set_aspect("equal")`
14. **Jamais oublier `bbox_inches="tight"`** dans les savefig matplotlib

---

## Dependances

### Obligatoires

```bash
npm install -g pptxgenjs
pip install matplotlib numpy Pillow
```

### Optionnelles

```bash
# Icones (pour le pattern Icon Grid)
npm install -g react-icons react react-dom sharp

# QA visuelle (conversion en images)
# LibreOffice (soffice) + Poppler (pdftoppm)
```

---

## Checklist avant livraison

- [ ] Police Open Sans utilisee partout (pas d'Arial, pas de Calibri)
- [ ] Couleurs exclusivement issues de la palette CdS (hex SANS `#`)
- [ ] Logo Jaune-Blanc sur barre titre bleue et slides de couverture
- [ ] Bandeau de motifs sur couverture et cloture (ratio preserve)
- [ ] Barre de titre bleue sur toutes les slides de contenu
- [ ] Marges respectees (0.5" minimum)
- [ ] Texte aligne a gauche (sauf titres centres)
- [ ] Tableaux avec en-tetes bleus et lignes alternees
- [ ] Layouts varies (pas le meme pattern partout)
- [ ] Ombres sur les cards et blocs (via `makeShadow()`)
- [ ] Accents francais presents partout
- [ ] Pipeline QA execute (au moins un cycle fix+verify)
- [ ] Pas de ligne d'accent sous les titres
- [ ] factory `makeShadow()` utilisee (jamais de reutilisation d'objet)

Lire [references/brand-guide.md](references/brand-guide.md) pour les specifications detaillees.
