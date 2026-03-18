# Guide de marque — Le Comptoir des Signaux

## Identite visuelle

Le Comptoir des Signaux (CdS) est un cabinet de conseil specialise dans la transformation numerique des collectivites territoriales, avec une expertise forte en intelligence artificielle.

Le ton est **professionnel, institutionnel et accessible**. Les presentations doivent inspirer confiance et serieux tout en restant claires pour des elus et cadres territoriaux.

## Palette de couleurs

### Couleurs principales

```
Bleu CdS     #1F519B    rgb(31, 81, 155)     — Confiance, institution, serieux
Or CdS       #D4AF37    rgb(212, 175, 55)    — Excellence, mise en valeur, accent
```

### Couleurs neutres

```
Blanc         #FFFFFF    rgb(255, 255, 255)   — Fonds, texte sur bleu
Gris fonce    #333333    rgb(51, 51, 51)      — Texte courant
Gris clair    #F5F5F5    rgb(245, 245, 245)   — Fonds secondaires
```

### Couleurs fonctionnelles (graphiques et indicateurs uniquement)

```
Vert          #4CAF50    rgb(76, 175, 80)     — Validation, termine, positif
Orange        #FF9800    rgb(255, 152, 0)     — Attention, en cours
Rouge         #F44336    rgb(244, 67, 54)     — Alerte, critique
```

### Ratios de contraste

| Combinaison | Usage | Contraste |
|-------------|-------|-----------|
| Blanc sur Bleu CdS | Titres, en-tetes | Excellent |
| Gris fonce sur Blanc | Texte courant | Excellent |
| Or CdS sur Bleu CdS | Sous-titres, accents | Bon |
| Or CdS sur Blanc | A eviter pour du texte long | Moyen |

## Typographie

### Police principale : Open Sans

Open Sans est une police sans-serif humaniste, lisible et professionnelle. Elle est disponible gratuitement sur Google Fonts.

- **Titres** : Open Sans Bold, 36-44pt
- **Sous-titres** : Open Sans Bold, 20-24pt
- **Corps de texte** : Open Sans Regular, 14-16pt
- **Notes et legendes** : Open Sans Regular, 10-12pt
- **Tableaux** : Open Sans Regular 11-12pt, en-tetes Open Sans Bold 12-14pt

### Polices de substitution

Si Open Sans n'est pas installe sur le systeme :
1. **Calibri** (Windows) — geometrique, tres proche
2. **Carlito** (Linux) — clone metrique de Calibri
3. **Arial** (dernier recours)

### Regles typographiques

- **Alignement** : texte courant a gauche, titres centres
- **Interligne** : 1.2 a 1.5 pour le corps de texte
- **Ne jamais** : utiliser plus de 2 niveaux de taille sur une meme slide
- **Ne jamais** : melanger plusieurs polices (tout en Open Sans)

## Logos

### Variantes disponibles

| Fichier | Description | Fond recommande |
|---------|-------------|-----------------|
| `CDS-Logo-Bleu-Jaune.png` | Version standard : monogramme bleu+jaune, texte bleu+jaune | Fond blanc ou clair |
| `CDS-Logo-Jaune-Blanc.png` | Version claire : monogramme jaune, texte blanc+jaune | Fond bleu CdS |
| `CDS-Logo-Bleu-Blanc.png` | Monochrome bleu : tout en bleu | Fond blanc |
| `CDS-Logo-Noir.png` | Monochrome noir : tout en noir | Fond blanc (impression N&B) |
| `CDS-Logo-Blanc.png` | Monochrome blanc : tout en blanc | Fond tres sombre |

### Monogrammes

Le monogramme est le symbole "CS" entrelace, utilisable seul quand l'espace est contraint (icones, favicons, petits formats).

| Fichier | Fond recommande |
|---------|-----------------|
| `Monogramme-Bleu-Jaune.png` | Fond blanc ou clair |
| `Monogramme-Blanc-Jaune.png` | Fond bleu |
| `Monogramme-Blanc.png` | Fond bleu ou sombre |
| `Monogramme-Noir.png` | Fond blanc (impression) |

### Bandeaux de motifs

Motifs decoratifs repetant le monogramme CdS. Utilisables comme :
- Bordure decorative en bas de slide de couverture
- Element graphique de separation
- Fond attenue (avec transparence)

Disponibles en 3 couleurs (bleu, blanc, jaune) x 2 orientations (horizontal, vertical).

> **Note sur les noms de fichiers** : les fichiers verticaux utilisent l'orthographe corrigee `vertical` (et non `vertcial`).

### Regles de placement du logo

#### Slide de couverture
- Logo **Jaune-Blanc** (pour fond bleu)
- Centre horizontalement
- Position haute (top ~0.8")
- Hauteur : 1.2" (largeur automatique ~4.8" selon ratio 4:1)

#### Slides de contenu
- Logo **Jaune-Blanc** (visible sur la barre titre bleue)
- En haut a droite, dans la barre titre bleue
- Hauteur : 0.5" (largeur ~2.0")
- Marge droite : 0.2" du bord
- Position verticale : 0.25" du haut
- Ne doit pas chevaucher le texte du titre
- **Note** : ne jamais utiliser Bleu-Jaune dans la barre bleue (le texte bleu est invisible sur fond bleu)

## Mise en page des slides

### Format
- **Ratio** : 16:9 (widescreen)
- **Dimensions** : 13.333" x 7.5"

### Zones

```
+--[ 13.333" ]------------------------------------+
|                                                   | 0.25"
| [ Barre titre — pleine largeur, h=1" ]  [Logo]  |
|                                                   | 0.5"
|  0.5" |  Zone de contenu (12.333" x 5.5")  | 0.5"|
|       |                                     |     |
|       |                                     |     |
|       |                                     |     |
|  0.5" |                                     | 0.5"|
+---------------------------------------------------+
                                                 0.5"
```

### Barre de titre
- Rectangle pleine largeur (`x=0, y=0, w=13.333", h=1"`)
- Fond : Bleu CdS (`#1F519B`)
- Bordure : Bleu CdS (pas de bordure visible)
- Texte : blanc, Open Sans Bold, 24pt, centre verticalement et horizontalement

### Zone de contenu
- Debut : `y = 1.5"` (sous la barre de titre + marge)
- Largeur utile : `12.333"` (marges de 0.5" de chaque cote)
- Hauteur utile : `5.5"` (jusqu'a 0.5" du bas)

### Tableaux
- **En-tetes** : fond Bleu CdS, texte blanc, Open Sans Bold 12-14pt, centre
- **Lignes paires** : fond blanc
- **Lignes impaires** : fond Gris clair (`#F5F5F5`)
- **Bordures** : fines (0.5pt), gris clair
- **Cellules** : Open Sans Regular 11-12pt, gris fonce
- **Indicateurs couleur** : vert/orange/rouge pour les statuts (voir couleurs fonctionnelles)

## Anti-patterns — A eviter

1. **Pas de ligne d'accent sous les titres** — signature typique des slides IA
2. **Pas de fond degrade** — rester sur aplats de couleur
3. **Pas de texte or sur fond blanc** pour des paragraphes longs (contraste insuffisant)
4. **Pas de polices multiples** — tout en Open Sans
5. **Pas de couleurs hors palette** sauf graphiques de donnees
6. **Pas de logo deforme** — toujours respecter le ratio d'origine
7. **Pas de monogramme a la place du logo complet** sur les presentations (sauf contrainte d'espace)

> **Note** : les slides avec uniquement du texte (listes a puces, listes numerotees, paragraphes) sont tout a fait acceptables. Elles doivent toujours comporter la barre de titre bleue et le logo CdS en haut a droite.
