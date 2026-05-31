# Dataviz CdS : Graphiques matplotlib

Guide pour generer des graphiques aux couleurs CdS via matplotlib,
puis les integrer dans PptxGenJS.

---

## Quand utiliser matplotlib

| Type de graphique | Moteur recommande | Raison |
|---|---|---|
| Bar chart simple | **PptxGenJS natif** | Interactif dans PowerPoint, plus simple |
| Line chart simple | **PptxGenJS natif** | Idem |
| Pie chart simple | **PptxGenJS natif** | Idem |
| **Radar / spider** | **matplotlib** | PptxGenJS RADAR non fiable sur les labels et le rendu polaire |
| **Heatmap** | **matplotlib** | Pas d'equivalent natif dans PptxGenJS |
| Scatter / bubble | **matplotlib** | Meilleur controle des axes et annotations |
| Dataviz complexe | **matplotlib** | Toute visualisation necessitant numpy/scipy |

**Regle** : privilegier PptxGenJS natif quand c'est possible (charts interactifs dans PowerPoint).
Utiliser matplotlib uniquement pour les types de graphiques non supportes ou mal supportes nativement.

---

## Script cds_charts.py

Le script `scripts/cds_charts.py` fournit des fonctions autonomes qui generent des PNG
aux couleurs CdS. Chaque fonction retourne un `Path` vers le fichier genere.

### Dependances

```bash
pip install matplotlib numpy Pillow
```

### API de reference

#### `generate_radar(labels, datasets, title, output_path) -> Path`

Radar SOCLE : format carre, aspect equal, couleurs CdS.

```python
from cds_charts import generate_radar

path = generate_radar(
    labels=["Sensibilisation", "Ouverture", "Connaissance", "La pratique", "Enracinement"],
    datasets=[
        {"label": "Situation actuelle", "values": [3.2, 5.0, 2.1, 4.0, 1.8]},
        {"label": "Cible 2027", "values": [7.5, 8.0, 6.5, 7.0, 6.0], "color": "#FDC948"},
    ],
    title="Radar de maturite SOCLE",
    output_path="radar_socle.png",
)
```

#### `generate_heatmap(data, row_labels, col_labels, title, output_path, vmin, vmax) -> Path`

Heatmap de maturite : grille coloree avec annotations.

```python
from cds_charts import generate_heatmap

path = generate_heatmap(
    data=[
        [7.2, 6.5, 4.0, 3.5, 2.0],
        [5.0, 4.8, 3.2, 2.5, 1.5],
        [8.0, 7.0, 6.0, 5.0, 4.0],
    ],
    row_labels=["DSI", "DRH", "Urbanisme"],
    col_labels=["S", "O", "C", "L", "E"],
    title="Maturite IA par direction",
    output_path="heatmap_maturite.png",
)
```

#### `generate_bar_chart(categories, values, title, output_path, horizontal, color) -> Path`

Bar chart simple aux couleurs CdS.

```python
from cds_charts import generate_bar_chart

path = generate_bar_chart(
    categories=["Cadrage", "Diagnostic", "Cartographie", "Conformite", "Architecture"],
    values=[100, 75, 50, 25, 10],
    title="Avancement par etape (%)",
    output_path="avancement.png",
)
```

#### `generate_grouped_bar(categories, datasets, title, output_path) -> Path`

Bar chart groupe (plusieurs series).

```python
from cds_charts import generate_grouped_bar

path = generate_grouped_bar(
    categories=["DSI", "DRH", "Urbanisme", "Finances"],
    datasets=[
        {"label": "T0", "values": [3, 2, 4, 1]},
        {"label": "T1", "values": [6, 5, 7, 4], "color": "#FDC948"},
    ],
    title="Evolution par direction",
    output_path="evolution.png",
)
```

#### `generate_line_chart(x_labels, datasets, title, output_path) -> Path`

Courbe d'evolution aux couleurs CdS.

```python
from cds_charts import generate_line_chart

path = generate_line_chart(
    x_labels=["Jan", "Fev", "Mar", "Avr", "Mai", "Jun"],
    datasets=[
        {"label": "Score global", "values": [2.1, 2.5, 3.2, 4.0, 4.8, 5.5]},
        {"label": "Cible", "values": [3, 4, 5, 5, 6, 7], "color": "#FDC948"},
    ],
    title="Progression de la maturite",
    output_path="progression.png",
)
```

---

## Integration matplotlib + PptxGenJS

Le workflow est simple : generer le PNG en Python, puis l'inserer dans le script JS.

### Etape 1 : Generer le PNG

```bash
python -c "
from cds_charts import generate_radar
generate_radar(
    ['S','O','C','L','E'],
    [{'label':'T0','values':[3,5,2,4,2]}, {'label':'Cible','values':[8,8,7,8,7]}],
    title='Radar SOCLE',
    output_path='radar.png',
)
print('radar.png genere')
"
```

### Etape 2 : Inserer dans PptxGenJS

```javascript
// Dans le script JS de generation de presentation
let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

// Titre dans la barre bleue
slide.addText("Radar de maturite SOCLE", {
  x: 0.5, y: 0, w: 10.83, h: 1.0,
  fontSize: 24, fontFace: "Open Sans", bold: true, color: "FFFFFF",
  align: "center", valign: "middle", margin: 0,
});

// Image du radar (centree dans la zone de contenu)
slide.addImage({
  path: "radar.png",
  x: 1.5, y: 1.5, w: 10.33, h: 5.5,
  sizing: { type: "contain", w: 10.33, h: 5.5 },
});
```

### Bonnes pratiques

- **DPI 150** : resolution suffisante pour projection, fichier leger
- **`bbox_inches="tight"`** : pas de marges blanches excessives
- **`facecolor="white"`** : fond blanc explicite (pas de transparence)
- **`sizing: { type: "contain" }`** : preserve le ratio du graphique dans PptxGenJS
- **Format carre pour les radars** : `figsize=(8, 8)` + `set_aspect("equal")`

### Palette CdS dans matplotlib

Les fonctions de `cds_charts.py` utilisent automatiquement la palette CdS :

```python
CDS_BLEU    = "#1F519B"
CDS_OR      = "#FDC948"
CDS_VERT    = "#4CAF50"
CDS_ORANGE  = "#FF9800"
CDS_ROUGE   = "#F44336"
```

Pour un graphique matplotlib manuel (hors `cds_charts.py`), toujours utiliser ces couleurs
et respecter les regles :
- Police `sans-serif` (Open Sans si disponible)
- DPI 150, `bbox_inches="tight"`
- Radars : `figsize=(8, 8)`, `set_aspect("equal")`
- Pas de grille lourde (couleur `#CCCCCC`, linewidth 0.5)
