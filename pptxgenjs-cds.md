# PptxGenJS : Patterns CdS

Guide complet pour creer des presentations brandees Comptoir des Signaux avec PptxGenJS.
Chaque pattern fournit du code JS copier-coller pret a l'emploi.

---

## Setup & Constantes CdS

```javascript
const pptxgen = require("pptxgenjs");
let pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";  // 13.33" x 7.5" : format CdS standard
pres.author = "Comptoir des Signaux";

// ─── Palette CdS (SANS # : obligation PptxGenJS) ───
const CDS = {
  BLEU: "1F519B",
  OR: "FDC948",
  BLANC: "FFFFFF",
  GRIS_FONCE: "333333",
  GRIS_CLAIR: "F5F5F5",
  GRIS_MOYEN: "DDDDDD",
  VERT: "4CAF50",
  ORANGE: "FF9800",
  ROUGE: "F44336",
};
const PALETTE = [CDS.BLEU, CDS.OR, CDS.VERT, CDS.ORANGE, CDS.ROUGE];
const FONT = "Open Sans";

// ─── Factory pour ombres (evite la mutation in-place) ───
const makeShadow = () => ({
  type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15,
});
const makeShadowUp = () => ({
  type: "outer", color: "000000", blur: 4, offset: 2, angle: 270, opacity: 0.10,
});

// ─── URLs des assets GitHub ───
const GITHUB = "https://raw.githubusercontent.com/pchevallot/cds-pptx-skill/main/assets";
const LOGOS = {
  jaune_blanc: `${GITHUB}/logos/CDS-Logo-Jaune-Blanc.png`,
  bleu_jaune:  `${GITHUB}/logos/CDS-Logo-Bleu-Jaune.png`,
  bleu_blanc:  `${GITHUB}/logos/CDS-Logo-Bleu-Blanc.png`,
  noir:        `${GITHUB}/logos/CDS-Logo-Noir.png`,
  blanc:       `${GITHUB}/logos/CDS-Logo-Blanc.png`,
};
const MONOGRAMMES = {
  bleu_jaune:  `${GITHUB}/monogrammes/Monogramme-Bleu-Jaune.png`,
  blanc_jaune: `${GITHUB}/monogrammes/Monogramme-Blanc-Jaune.png`,
  blanc:       `${GITHUB}/monogrammes/Monogramme-Blanc.png`,
  noir:        `${GITHUB}/monogrammes/Monogramme-Noir.png`,
};
const BANDEAUX = {
  jaune_h: `${GITHUB}/bandeaux/Bandeau-motifs-jaune-horizontal.png`,
  bleu_h:  `${GITHUB}/bandeaux/Bandeau-motifs-bleu-horizontal.png`,
  blanc_h: `${GITHUB}/bandeaux/Bandeau-motifs-blanc-horizontal.png`,
  jaune_v: `${GITHUB}/bandeaux/Bandeau-motifs-jaune-vertical.png`,
  bleu_v:  `${GITHUB}/bandeaux/Bandeau-motifs-bleu-vertical.png`,
  blanc_v: `${GITHUB}/bandeaux/Bandeau-motifs-blanc-vertical.png`,
};

// ─── Dimensions utiles ───
const W = 13.33;  // Largeur slide
const H = 7.5;    // Hauteur slide
const MARGIN = 0.5;
const CONTENT_TOP = 1.5;
const CONTENT_W = W - MARGIN * 2;  // 12.33"
const CONTENT_H = H - CONTENT_TOP - MARGIN;  // 5.5"
const BAR_H = 1.0;  // Hauteur barre titre
```

---

## Slide Masters CdS

Definir les masters une seule fois au debut du script.

```javascript
// ─── Master : couverture / section / closing (fond bleu) ───
pres.defineSlideMaster({
  title: "CDS_TITLE",
  background: { color: CDS.BLEU },
  objects: [],
});

// ─── Master : contenu (barre titre bleue + logo) ───
pres.defineSlideMaster({
  title: "CDS_CONTENT",
  background: { color: CDS.BLANC },
  objects: [
    // Barre titre bleue pleine largeur
    { rect: { x: 0, y: 0, w: W, h: BAR_H, fill: { color: CDS.BLEU } } },
    // Logo Jaune-Blanc en haut a droite
    { image: { path: LOGOS.jaune_blanc, x: W - 2.2, y: 0.25, w: 2.0, h: 0.5 } },
  ],
});
```

---

## Helpers

```javascript
// Taille adaptative pour titres longs (couverture, section, closing)
function adaptiveFontSize(text) {
  const n = text.length;
  if (n <= 30) return 48;
  if (n <= 50) return 40;
  if (n <= 80) return 34;
  if (n <= 120) return 28;
  return 24;
}

// Ajouter le bandeau decoratif en bas de slide
function addBandeau(slide, variant = "jaune_h") {
  slide.addImage({
    path: BANDEAUX[variant],
    x: 0, y: H - 1.15, w: W, h: 1.15,
  });
}

// Ajouter un logo centre (pour cover/closing)
function addCenteredLogo(slide, variant = "jaune_blanc", h = 1.0) {
  const logoW = h * 4;  // Ratio logo ~4:1
  slide.addImage({
    path: LOGOS[variant],
    x: (W - logoW) / 2, y: 0.5, w: logoW, h: h,
  });
}
```

---

## 1. Cover : `addCoverSlide`

Slide de couverture : fond bleu, logo centre, titre adaptatif, sous-titre Or, date, bandeau.

```javascript
function addCoverSlide(pres, title, subtitle = "", dateStr = "") {
  let slide = pres.addSlide({ masterName: "CDS_TITLE" });

  // Logo centre
  addCenteredLogo(slide, "jaune_blanc", 1.0);

  // Titre : taille adaptative
  slide.addText(title, {
    x: 1, y: 1.9, w: W - 2, h: 2.8,
    fontSize: adaptiveFontSize(title),
    fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle",
  });

  // Sous-titre
  if (subtitle) {
    slide.addText(subtitle, {
      x: 1, y: 4.8, w: W - 2, h: 0.6,
      fontSize: 22, fontFace: FONT, color: CDS.OR, align: "center",
    });
  }

  // Date
  if (dateStr) {
    slide.addText(dateStr, {
      x: 1, y: 5.4, w: W - 2, h: 0.4,
      fontSize: 16, fontFace: FONT, color: CDS.BLANC, align: "center",
    });
  }

  // Bandeau decoratif
  addBandeau(slide, "jaune_h");

  return slide;
}
```

---

## 2. Section divider : `addSectionSlide`

Separateur de section : fond bleu, titre centre, sous-titre Or, pas de logo ni bandeau.

```javascript
function addSectionSlide(pres, title, subtitle = "") {
  let slide = pres.addSlide({ masterName: "CDS_TITLE" });

  slide.addText(title, {
    x: 1, y: 2.0, w: W - 2, h: 2.5,
    fontSize: adaptiveFontSize(title),
    fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle",
  });

  if (subtitle) {
    slide.addText(subtitle, {
      x: 1, y: 4.7, w: W - 2, h: 1.0,
      fontSize: 20, fontFace: FONT, color: CDS.OR, align: "center",
    });
  }

  return slide;
}
```

---

## 3. Content : `addContentSlide`

Slide de contenu texte simple avec barre titre + logo.

```javascript
function addContentSlide(pres, title, content) {
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  // Titre dans la barre bleue
  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  // Contenu texte
  slide.addText(content, {
    x: MARGIN, y: CONTENT_TOP, w: CONTENT_W, h: CONTENT_H,
    fontSize: 16, fontFace: FONT, color: CDS.GRIS_FONCE,
    align: "left", valign: "top",
  });

  return slide;
}
```

---

## 4. Bullets : `addBulletSlide`

Slide avec liste a puces. Utiliser `bullet: true`, jamais de caracteres Unicode.

```javascript
function addBulletSlide(pres, title, bullets) {
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  let textItems = bullets.map((b, i) => ({
    text: b,
    options: {
      bullet: true,
      breakLine: i < bullets.length - 1,
      fontSize: 16, fontFace: FONT, color: CDS.GRIS_FONCE,
      paraSpaceAfter: 8,
    },
  }));

  slide.addText(textItems, {
    x: 0.8, y: CONTENT_TOP, w: W - 1.6, h: CONTENT_H,
    valign: "top",
  });

  return slide;
}
```

---

## 5. Two-column : `addTwoColumnSlide`

Deux colonnes cote a cote : texte/texte, texte/image, ou image/texte.

```javascript
function addTwoColumnSlide(pres, title, left, right) {
  // left/right: { text: "...", bullets: [...], image: "path" }
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const colW = (CONTENT_W - 0.5) / 2;  // 0.5" gap entre colonnes
  const colH = CONTENT_H;

  // Colonne gauche
  if (left.image) {
    slide.addImage({
      path: left.image,
      x: MARGIN, y: CONTENT_TOP, w: colW, h: colH,
      sizing: { type: "contain", w: colW, h: colH },
    });
  } else if (left.bullets) {
    let items = left.bullets.map((b, i) => ({
      text: b,
      options: { bullet: true, breakLine: i < left.bullets.length - 1, fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE, paraSpaceAfter: 6 },
    }));
    slide.addText(items, { x: MARGIN, y: CONTENT_TOP, w: colW, h: colH, valign: "top" });
  } else if (left.text) {
    slide.addText(left.text, {
      x: MARGIN, y: CONTENT_TOP, w: colW, h: colH,
      fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE, valign: "top",
    });
  }

  // Colonne droite
  const rightX = MARGIN + colW + 0.5;
  if (right.image) {
    slide.addImage({
      path: right.image,
      x: rightX, y: CONTENT_TOP, w: colW, h: colH,
      sizing: { type: "contain", w: colW, h: colH },
    });
  } else if (right.bullets) {
    let items = right.bullets.map((b, i) => ({
      text: b,
      options: { bullet: true, breakLine: i < right.bullets.length - 1, fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE, paraSpaceAfter: 6 },
    }));
    slide.addText(items, { x: rightX, y: CONTENT_TOP, w: colW, h: colH, valign: "top" });
  } else if (right.text) {
    slide.addText(right.text, {
      x: rightX, y: CONTENT_TOP, w: colW, h: colH,
      fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE, valign: "top",
    });
  }

  return slide;
}
```

---

## 6. Cards : `addCardsSlide`

2-4 cartes cote a cote avec ombres et barres d'accent colorees. Ideal pour comparer concepts, piliers ou faits cles.

```javascript
function addCardsSlide(pres, title, cards, footnote = "") {
  // cards: [{ title, content, color? }]
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const n = cards.length;
  const gap = 0.3;
  const cardW = (CONTENT_W - gap * (n - 1)) / n;
  const cardTop = 1.6;
  const cardH = 4.6;
  const accentH = 0.07;
  const accentPalette = [CDS.OR, CDS.BLEU, CDS.VERT, CDS.ORANGE, CDS.ROUGE];

  cards.forEach((card, i) => {
    const x = MARGIN + (cardW + gap) * i;
    const color = card.color || accentPalette[i % accentPalette.length];

    // Fond de la carte avec ombre
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: cardTop, w: cardW, h: cardH,
      fill: { color: CDS.GRIS_CLAIR },
      line: { color: CDS.GRIS_MOYEN, width: 1 },
      shadow: makeShadow(),
    });

    // Barre d'accent coloree en haut
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: cardTop, w: cardW, h: accentH,
      fill: { color },
      line: { width: 0 },
    });

    // Titre de la carte
    slide.addText(card.title || "", {
      x: x + 0.25, y: cardTop + 0.3, w: cardW - 0.5, h: 0.5,
      fontSize: 16, fontFace: FONT, bold: true, color: CDS.BLEU,
      align: "center", margin: 0,
    });

    // Contenu de la carte
    if (card.content) {
      slide.addText(card.content, {
        x: x + 0.25, y: cardTop + 0.9, w: cardW - 0.5, h: cardH - 1.2,
        fontSize: 12, fontFace: FONT, color: CDS.GRIS_FONCE,
        align: "left", valign: "top",
      });
    }
  });

  // Note de bas de page
  if (footnote) {
    slide.addText(footnote, {
      x: MARGIN, y: 6.7, w: CONTENT_W, h: 0.4,
      fontSize: 10, fontFace: FONT, italic: true, color: "999999",
    });
  }

  return slide;
}
```

---

## 7. Blocks : `addBlocksSlide`

Blocs empiles avec barres verticales colorees. Ideal pour architectures en couches, processus, categories.

```javascript
function addBlocksSlide(pres, title, blocks) {
  // blocks: [{ title, content, color? }]
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const n = blocks.length;
  const areaTop = 1.6;
  const areaH = 5.4;
  const blockH = areaH / n;
  const blockGap = 0.15;

  blocks.forEach((block, i) => {
    const color = block.color || PALETTE[i % PALETTE.length];
    const y = areaTop + blockH * i;

    // Fond du bloc avec ombre legere
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.6, y: y + blockGap, w: CONTENT_W + 0.2, h: blockH - blockGap * 2,
      fill: { color: CDS.GRIS_CLAIR, transparency: 50 },
      line: { width: 0 },
      shadow: makeShadow(),
    });

    // Barre verticale d'accent
    slide.addShape(pres.shapes.RECTANGLE, {
      x: 0.65, y: y + blockGap, w: 0.07, h: blockH - blockGap * 2,
      fill: { color },
      line: { width: 0 },
    });

    // Titre du bloc
    slide.addText((block.title || "").toUpperCase(), {
      x: 1.0, y: y + blockGap, w: 11, h: 0.45,
      fontSize: 17, fontFace: FONT, bold: true, color,
      margin: 0,
    });

    // Contenu du bloc
    if (block.content) {
      slide.addText(block.content, {
        x: 1.0, y: y + blockGap + 0.5, w: 11, h: blockH - blockGap * 2 - 0.55,
        fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE,
        valign: "top",
      });
    }
  });

  return slide;
}
```

---

## 8. Stats callout : `addStatsSlide`

Grands chiffres dans des blocs colores pour mettre en valeur des KPI ou metriques cles.

```javascript
function addStatsSlide(pres, title, stats) {
  // stats: [{ value: "95%", label: "Taux de satisfaction", color? }]
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const n = stats.length;
  const gap = 0.4;
  const boxW = (CONTENT_W - gap * (n - 1)) / n;
  const boxH = 3.0;
  const boxTop = 2.5;

  stats.forEach((stat, i) => {
    const x = MARGIN + (boxW + gap) * i;
    const color = stat.color || PALETTE[i % PALETTE.length];

    // Boite avec fond colore + ombre
    slide.addShape(pres.shapes.RECTANGLE, {
      x, y: boxTop, w: boxW, h: boxH,
      fill: { color },
      line: { width: 0 },
      shadow: makeShadow(),
      rectRadius: 0.05,
    });

    // Valeur (grand chiffre)
    slide.addText(stat.value, {
      x, y: boxTop + 0.3, w: boxW, h: 1.8,
      fontSize: 60, fontFace: FONT, bold: true, color: CDS.BLANC,
      align: "center", valign: "middle", margin: 0,
    });

    // Label
    slide.addText(stat.label, {
      x: x + 0.2, y: boxTop + 2.0, w: boxW - 0.4, h: 0.8,
      fontSize: 14, fontFace: FONT, color: CDS.BLANC,
      align: "center", valign: "top", margin: 0,
    });
  });

  return slide;
}
```

---

## 9. Table : `addTableSlide`

Tableau brande : en-tetes bleus, lignes alternees, bordures fines.

```javascript
function addTableSlide(pres, title, headers, rows, colWidths = null) {
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  // Construire les donnees du tableau
  let tableData = [];

  // En-tete
  tableData.push(
    headers.map(h => ({
      text: h,
      options: {
        fill: { color: CDS.BLEU },
        color: CDS.BLANC,
        bold: true,
        fontSize: 13,
        fontFace: FONT,
        align: "center",
        valign: "middle",
      },
    }))
  );

  // Lignes de donnees
  rows.forEach((row, rowIdx) => {
    tableData.push(
      row.map(cell => ({
        text: String(cell),
        options: {
          fill: { color: rowIdx % 2 === 0 ? CDS.BLANC : CDS.GRIS_CLAIR },
          color: CDS.GRIS_FONCE,
          fontSize: 12,
          fontFace: FONT,
          valign: "middle",
        },
      }))
    );
  });

  // Largeurs de colonnes
  const cw = colWidths || headers.map(() => CONTENT_W / headers.length);

  slide.addTable(tableData, {
    x: MARGIN, y: 1.5,
    w: CONTENT_W,
    colW: cw,
    border: { pt: 0.5, color: CDS.GRIS_MOYEN },
    autoPage: true,
    autoPageRepeatHeader: true,
  });

  return slide;
}
```

---

## 10. Native chart : `addChartSlide`

Charts PptxGenJS natifs (BAR, LINE, PIE) aux couleurs CdS. Interactifs dans PowerPoint.

```javascript
function addBarChartSlide(pres, title, chartData, options = {}) {
  // chartData: [{ name: "Series", labels: [...], values: [...] }]
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  slide.addChart(pres.charts.BAR, chartData, {
    x: 0.8, y: CONTENT_TOP, w: CONTENT_W - 0.6, h: CONTENT_H,
    barDir: options.horizontal ? "bar" : "col",
    chartColors: PALETTE,
    chartArea: { fill: { color: CDS.BLANC }, roundedCorners: true },
    catAxisLabelColor: CDS.GRIS_FONCE,
    valAxisLabelColor: CDS.GRIS_FONCE,
    catAxisLabelFontSize: 11,
    valAxisLabelFontSize: 11,
    catAxisLabelFontFace: FONT,
    valAxisLabelFontFace: FONT,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showValue: options.showValue || false,
    dataLabelPosition: "outEnd",
    dataLabelColor: CDS.GRIS_FONCE,
    showLegend: chartData.length > 1,
    legendPos: "b",
    legendFontSize: 10,
    legendFontFace: FONT,
    showTitle: false,
    ...options,
  });

  return slide;
}

function addLineChartSlide(pres, title, chartData, options = {}) {
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  slide.addChart(pres.charts.LINE, chartData, {
    x: 0.8, y: CONTENT_TOP, w: CONTENT_W - 0.6, h: CONTENT_H,
    chartColors: PALETTE,
    lineSize: 3,
    lineSmooth: true,
    chartArea: { fill: { color: CDS.BLANC }, roundedCorners: true },
    catAxisLabelColor: CDS.GRIS_FONCE,
    valAxisLabelColor: CDS.GRIS_FONCE,
    catAxisLabelFontSize: 11,
    valAxisLabelFontSize: 11,
    catAxisLabelFontFace: FONT,
    valAxisLabelFontFace: FONT,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
    showLegend: chartData.length > 1,
    legendPos: "b",
    legendFontSize: 10,
    legendFontFace: FONT,
    showTitle: false,
    ...options,
  });

  return slide;
}

function addPieChartSlide(pres, title, chartData, options = {}) {
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  slide.addChart(pres.charts.PIE, chartData, {
    x: 2, y: CONTENT_TOP, w: CONTENT_W - 3, h: CONTENT_H,
    chartColors: PALETTE,
    showPercent: true,
    showLegend: true,
    legendPos: "b",
    legendFontSize: 11,
    legendFontFace: FONT,
    showTitle: false,
    ...options,
  });

  return slide;
}
```

---

## 11. Timeline : `addTimelineSlide`

Frise chronologique horizontale avec cercles, lignes et labels. Ideale pour jalons, etapes, planning.

```javascript
function addTimelineSlide(pres, title, steps) {
  // steps: [{ label: "M1", title: "Cadrage", subtitle?: "Jan 2026" }]
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const n = steps.length;
  const lineY = 3.5;
  const startX = 1.2;
  const endX = W - 1.2;
  const stepW = (endX - startX) / (n - 1 || 1);
  const circleR = 0.3;

  // Ligne horizontale
  slide.addShape(pres.shapes.LINE, {
    x: startX, y: lineY, w: endX - startX, h: 0,
    line: { color: CDS.BLEU, width: 3 },
  });

  steps.forEach((step, i) => {
    const cx = n === 1 ? (startX + endX) / 2 : startX + stepW * i;
    const color = PALETTE[i % PALETTE.length];

    // Cercle
    slide.addShape(pres.shapes.OVAL, {
      x: cx - circleR, y: lineY - circleR, w: circleR * 2, h: circleR * 2,
      fill: { color },
      line: { color: CDS.BLANC, width: 3 },
      shadow: makeShadow(),
    });

    // Label dans le cercle
    slide.addText(step.label || String(i + 1), {
      x: cx - circleR, y: lineY - circleR, w: circleR * 2, h: circleR * 2,
      fontSize: 13, fontFace: FONT, bold: true, color: CDS.BLANC,
      align: "center", valign: "middle", margin: 0,
    });

    // Titre au-dessus (alterne haut/bas pour eviter chevauchement)
    const isAbove = i % 2 === 0;
    const titleY = isAbove ? lineY - 1.5 : lineY + 0.6;
    const subtitleY = isAbove ? titleY + 0.4 : titleY + 0.4;

    slide.addText(step.title || "", {
      x: cx - 1.0, y: titleY, w: 2.0, h: 0.4,
      fontSize: 12, fontFace: FONT, bold: true, color: CDS.BLEU,
      align: "center", margin: 0,
    });

    if (step.subtitle) {
      slide.addText(step.subtitle, {
        x: cx - 1.0, y: subtitleY, w: 2.0, h: 0.3,
        fontSize: 10, fontFace: FONT, color: "888888",
        align: "center", margin: 0,
      });
    }
  });

  return slide;
}
```

---

## 12. Icon grid : `addIconGridSlide`

Grille d'icones (2x3 ou 2x2) avec texte. Necessite react-icons + sharp pour les icones en base64 PNG.

```javascript
// Prerequis : npm install -g react-icons react react-dom sharp
//
// Generer les icones en base64 avant d'appeler cette fonction :
//   const iconData = await iconToBase64Png(FaChartLine, "#1F519B", 256);

function addIconGridSlide(pres, title, items) {
  // items: [{ icon: "base64data...", label: "Label", desc: "Description" }]
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const cols = Math.min(3, items.length);
  const rows = Math.ceil(items.length / cols);
  const cellW = CONTENT_W / cols;
  const cellH = CONTENT_H / rows;
  const iconSize = 0.6;

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * cellW;
    const y = CONTENT_TOP + row * cellH;

    // Cercle de fond pour l'icone
    const circleSize = iconSize + 0.3;
    const circleX = x + (cellW - circleSize) / 2;
    slide.addShape(pres.shapes.OVAL, {
      x: circleX, y: y + 0.2, w: circleSize, h: circleSize,
      fill: { color: CDS.BLEU, transparency: 10 },
      line: { width: 0 },
    });

    // Icone
    if (item.icon) {
      slide.addImage({
        data: item.icon,
        x: x + (cellW - iconSize) / 2, y: y + 0.35, w: iconSize, h: iconSize,
      });
    }

    // Label
    slide.addText(item.label || "", {
      x: x + 0.15, y: y + iconSize + 0.6, w: cellW - 0.3, h: 0.4,
      fontSize: 14, fontFace: FONT, bold: true, color: CDS.BLEU,
      align: "center", margin: 0,
    });

    // Description
    if (item.desc) {
      slide.addText(item.desc, {
        x: x + 0.15, y: y + iconSize + 1.0, w: cellW - 0.3, h: cellH - iconSize - 1.4,
        fontSize: 11, fontFace: FONT, color: CDS.GRIS_FONCE,
        align: "center", valign: "top", margin: 0,
      });
    }
  });

  return slide;
}
```

### Helper : generer des icones base64

```javascript
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const sharp = require("sharp");

function renderIconSvg(IconComponent, color = "#1F519B", size = 256) {
  return ReactDOMServer.renderToStaticMarkup(
    React.createElement(IconComponent, { color, size: String(size) })
  );
}

async function iconToBase64Png(IconComponent, color = "#1F519B", size = 256) {
  const svg = renderIconSvg(IconComponent, color, size);
  const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return "image/png;base64," + pngBuffer.toString("base64");
}
```

---

## 13. Quote : `addQuoteSlide`

Citation sur fond bleu avec grands guillemets Or.

```javascript
function addQuoteSlide(pres, quote, attribution = "") {
  let slide = pres.addSlide({ masterName: "CDS_TITLE" });

  // Guillemet ouvrant (grand, decoratif)
  slide.addText("\u00AB", {
    x: 1.5, y: 1.5, w: 1.5, h: 1.5,
    fontSize: 120, fontFace: "Georgia", color: CDS.OR,
    align: "left", valign: "top", margin: 0,
  });

  // Citation
  slide.addText(quote, {
    x: 2.0, y: 2.5, w: W - 4, h: 2.5,
    fontSize: 24, fontFace: FONT, italic: true, color: CDS.BLANC,
    align: "left", valign: "middle",
  });

  // Guillemet fermant
  slide.addText("\u00BB", {
    x: W - 3, y: 4.3, w: 1.5, h: 1.5,
    fontSize: 120, fontFace: "Georgia", color: CDS.OR,
    align: "right", valign: "top", margin: 0,
  });

  // Attribution
  if (attribution) {
    slide.addText(attribution, {
      x: 2.0, y: 5.5, w: W - 4, h: 0.5,
      fontSize: 16, fontFace: FONT, color: CDS.OR,
      align: "right", margin: 0,
    });
  }

  return slide;
}
```

---

## 14. Image + text : `addImageTextSlide`

Image a gauche ou droite avec texte a cote.

```javascript
function addImageTextSlide(pres, title, imagePath, text, imageRight = false) {
  let slide = pres.addSlide({ masterName: "CDS_CONTENT" });

  slide.addText(title, {
    x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
    fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle", margin: 0,
  });

  const imgW = 5.5;
  const imgH = CONTENT_H;
  const txtW = CONTENT_W - imgW - 0.5;  // 0.5" gap

  const imgX = imageRight ? MARGIN + txtW + 0.5 : MARGIN;
  const txtX = imageRight ? MARGIN : MARGIN + imgW + 0.5;

  // Image avec ombre
  slide.addImage({
    path: imagePath,
    x: imgX, y: CONTENT_TOP, w: imgW, h: imgH,
    sizing: { type: "contain", w: imgW, h: imgH },
    shadow: makeShadow(),
  });

  // Texte
  if (typeof text === "string") {
    slide.addText(text, {
      x: txtX, y: CONTENT_TOP, w: txtW, h: imgH,
      fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE,
      align: "left", valign: "top",
    });
  } else if (Array.isArray(text)) {
    // Bullets
    let items = text.map((b, i) => ({
      text: b,
      options: { bullet: true, breakLine: i < text.length - 1, fontSize: 14, fontFace: FONT, color: CDS.GRIS_FONCE, paraSpaceAfter: 6 },
    }));
    slide.addText(items, { x: txtX, y: CONTENT_TOP, w: txtW, h: imgH, valign: "top" });
  }

  return slide;
}
```

---

## 15. Closing : `addClosingSlide`

Slide de cloture : fond bleu, logo centre, message "Merci", contact Or, bandeau.

```javascript
function addClosingSlide(pres, text = "Merci de votre attention", contact = "") {
  let slide = pres.addSlide({ masterName: "CDS_TITLE" });

  // Logo centre
  addCenteredLogo(slide, "jaune_blanc", 1.0);

  // Texte de cloture : taille adaptative
  slide.addText(text, {
    x: 1, y: 1.9, w: W - 2, h: 2.2,
    fontSize: adaptiveFontSize(text),
    fontFace: FONT, bold: true, color: CDS.BLANC,
    align: "center", valign: "middle",
  });

  // Contact
  if (contact) {
    slide.addText(contact, {
      x: 1, y: 4.2, w: W - 2, h: 1.5,
      fontSize: 16, fontFace: FONT, color: CDS.OR,
      align: "center",
    });
  }

  // Bandeau decoratif
  addBandeau(slide, "jaune_h");

  return slide;
}
```

---

## Integrer une dataviz matplotlib

Pour les graphiques complexes (radar SOCLE, heatmap), generer un PNG via `cds_charts.py` puis l'inserer :

```javascript
// 1. Generer le PNG en Python (voir dataviz.md)
// python -c "from cds_charts import generate_radar; ..."

// 2. L'inserer dans une slide contenu
let slide = pres.addSlide({ masterName: "CDS_CONTENT" });
slide.addText("Radar de maturite SOCLE", {
  x: MARGIN, y: 0, w: W - 2.5, h: BAR_H,
  fontSize: 24, fontFace: FONT, bold: true, color: CDS.BLANC,
  align: "center", valign: "middle", margin: 0,
});
slide.addImage({
  path: "radar.png",
  x: 1.5, y: CONTENT_TOP, w: CONTENT_W - 2, h: CONTENT_H,
  sizing: { type: "contain", w: CONTENT_W - 2, h: CONTENT_H },
});
```

---

## Sauvegarde

```javascript
// Toujours a la fin du script
pres.writeFile({ fileName: "presentation_cds.pptx" })
  .then(() => console.log("Presentation generee avec succes"))
  .catch(err => console.error("Erreur :", err));
```

---

## Rappel des pieges PptxGenJS

1. **Jamais de `#` dans les couleurs hex** : `"1F519B"` et non `"#1F519B"`
2. **Jamais reutiliser un objet options** : utiliser `makeShadow()` (factory) pour chaque appel
3. **Bullets** : toujours `bullet: true`, jamais de `"•"` Unicode
4. **Multi-ligne** : toujours `breakLine: true` entre les elements d'un array de texte
5. **Ombres** : `opacity` en nombre (0-1), jamais encodee dans la couleur hex
6. **Offset d'ombre** : toujours positif (valeurs negatives corrompent le fichier)
7. **ROUNDED_RECTANGLE** : ne pas combiner avec des overlays rectangulaires (coins non couverts)
