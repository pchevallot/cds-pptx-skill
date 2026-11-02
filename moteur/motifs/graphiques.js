// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motif graphique : barres, courbes et secteurs, en graphiques natifs PptxGenJS
// (modifiables dans PowerPoint). Radar et chaleur sont d'autres motifs. Les
// contrats de `ctx` et du registre sont en tête de rendu.js ; titre, accroche,
// notes et pied « Source : … » sont posés par rendu.js, pas ici.
//
// Journal des versions retenues (octobre 2026). Point de départ unique :
// addBarChartSlide, addLineChartSlide et addPieChartSlide de pptxgenjs-cds.md v2.
//
//   Commun     v2 : cadre blanc à coins arrondis, axes et légende en Open Sans
//              gris foncé, quadrillage horizontal gris clair, légende en bas.
//              Conservés. Abandonné : le titre posé par la fonction (rendu.js le
//              pose), la zone fixe (x 0,8) remplacée par ctx.zone. Ajoutés : les
//              couleurs des séries dans l'ordre BLEU, OR, VERT, ORANGE, ROUGE,
//              reprises au début au-delà de cinq (la v2 laissait PowerPoint
//              choisir au-delà de sa liste) ; la police Open Sans aussi pour les
//              étiquettes de valeur ; tailles de police 12 pt (axes, légende) au
//              lieu de 10 ou 11.
//   Barres     v2 : colonnes verticales. Ajouté : valeurs affichées au-dessus des
//              colonnes quand il y en a douze au plus, sinon l'axe seul.
//   Courbes    v2 : trait de 3 pt, lissé. Le lissage est retiré : il invente des
//              creux entre deux points mesurés. Ajouté : marqueurs ronds, pour
//              lire les points isolés d'une série trouée.
//   Secteurs   v2 : pourcentages et légende en bas, couleurs de la palette. Une
//              couleur par catégorie ; une seule série, sinon DONNEES_INVALIDES et
//              rendu de la première série seule. Pourcentages hors des parts
//              (outEnd) : placés au mieux (bestFit), ils tombaient dans la part,
//              gris foncé sur le bleu, illisibles (exemple complet, tâche 11).
//
// Valeur manquante (null, posée par l'analyseur qui a déjà alerté) : PptxGenJS
// 4.0.1 écrit un point vide, <c:v></c:v>, et ni « null » ni XML cassé ; PowerPoint
// le lit comme un blanc. Le point est transmis tel quel, sans nouvelle alerte.
// Par défaut PptxGenJS pose displayBlanksAs "span", qui relie les points voisins
// par une droite : displayBlanksAs "gap" laisse le trou dans la courbe.
//
// Étiquettes de valeur : sans dataLabelFormatCode PptxGenJS applique #,##0 et
// 12,5 s'afficherait 13 ; le format "General" garde la valeur saisie.
//
// Secteurs : les étiquettes sont des pourcentages (showPercent), le format "General"
// hérité les afficherait en 0,5 ; ils prennent donc "0%" quand toutes les parts
// tombent juste, "0.0%" sinon (R31). Graphique resserré (1,45 fois la hauteur de
// la zone), zone de tracé fixée (layout) pour la place des étiquettes dehors.
//
// Règles propres au motif, posées par le rendu qui continue : plus de cinq séries
// ou de cinq secteurs (deux auraient la même couleur, le cycle est conservé),
// valeur négative ou nulle dans des secteurs.

const g = require("../gabarit.js");

const { COULEURS, POLICE, PALETTE } = g;
const TAILLE_TEXTE = 12;
const VALEURS_AFFICHEES_MAX = 12;
// Largeur du graphique en secteurs, en multiple de la hauteur de la zone.
const LARGEUR_SECTEURS = 1.45;

const couleurs = (n) => Array.from({ length: n }, (_, i) => PALETTE[i % PALETTE.length]);
const estNombre = (v) => typeof v === "number" && Number.isFinite(v);

// Options communes aux trois types : cadre, axes, légende, tout en Open Sans.
function optionsCommunes(zone) {
  return {
    x: zone.x, y: zone.y, w: zone.w, h: zone.h,
    chartArea: { fill: { color: COULEURS.BLANC }, roundedCorners: true },
    plotArea: { fill: { color: COULEURS.BLANC } },
    showTitle: false, displayBlanksAs: "gap",
    showLegend: true, legendPos: "b", legendFontFace: POLICE, legendFontSize: TAILLE_TEXTE, legendColor: COULEURS.GRIS_FONCE,
    dataLabelFormatCode: "General", dataLabelFontFace: POLICE, dataLabelFontSize: TAILLE_TEXTE, dataLabelColor: COULEURS.GRIS_FONCE,
  };
}

function optionsAxes() {
  return {
    catAxisLabelColor: COULEURS.GRIS_FONCE, catAxisLabelFontFace: POLICE, catAxisLabelFontSize: TAILLE_TEXTE,
    valAxisLabelColor: COULEURS.GRIS_FONCE, valAxisLabelFontFace: POLICE, valAxisLabelFontSize: TAILLE_TEXTE,
    valGridLine: { color: "E2E8F0", size: 0.5 },
    catGridLine: { style: "none" },
  };
}

const jeux = (gr) => gr.series.map((s) => ({ name: s.nom, labels: gr.categories, values: s.valeurs }));

function pasAssezDeCouleurs(ctx, quoi, n) {
  if (n > PALETTE.length) {
    ctx.alerter("DONNEES_INVALIDES", `${quoi} : ${n} pour ${PALETTE.length} couleurs, deux auraient la même couleur. Rendu avec le cycle des couleurs.`);
  }
}

function barres(pres, gr, ctx) {
  pasAssezDeCouleurs(ctx, "Barres", gr.series.length);
  const total = gr.categories.length * gr.series.length;
  ctx.slide.addChart(pres.charts.BAR, jeux(gr), {
    ...optionsCommunes(ctx.zone), ...optionsAxes(),
    barDir: "col", barGrouping: "clustered", barGapWidthPct: 60,
    chartColors: couleurs(gr.series.length),
    showValue: total <= VALEURS_AFFICHEES_MAX, dataLabelPosition: "outEnd",
    showLegend: gr.series.length > 1,
  });
}

function courbes(pres, gr, ctx) {
  pasAssezDeCouleurs(ctx, "Courbes", gr.series.length);
  ctx.slide.addChart(pres.charts.LINE, jeux(gr), {
    ...optionsCommunes(ctx.zone), ...optionsAxes(),
    chartColors: couleurs(gr.series.length),
    lineSize: 3, lineSmooth: false, lineDataSymbol: "circle", lineDataSymbolSize: 8,
    showLegend: gr.series.length > 1,
  });
}

function secteurs(pres, gr, ctx) {
  if (gr.series.length > 1) {
    const ignorees = gr.series.slice(1).map((s) => `« ${s.nom} »`).join(", ");
    ctx.alerter("DONNEES_INVALIDES", `Secteurs : une seule série est possible, la source en a ${gr.series.length}. Rendu de la première série seule ; non rendues : ${ignorees}.`);
  }
  const serie = gr.series[0];
  pasAssezDeCouleurs(ctx, "Secteurs", gr.categories.length);
  if (serie.valeurs.some((v) => estNombre(v) && v <= 0)) {
    ctx.alerter("DONNEES_INVALIDES", "Secteurs : une valeur négative ou nulle ne se représente pas en part. Rendu tel quel.");
  }
  // Parts toutes entières (en pour cent) : « 38% » ; sinon une décimale.
  const lues = serie.valeurs.filter(estNombre);
  const somme = lues.reduce((a, b) => a + b, 0);
  const entieres = somme > 0 && lues.every((v) => Math.abs((v / somme) * 100 - Math.round((v / somme) * 100)) < 1e-9);
  // Graphique resserré au centre de la zone, la légende près du disque ; la zone
  // de tracé laisse autour du disque la place des étiquettes posées dehors.
  const z = ctx.zone;
  const w = Math.min(z.w, z.h * LARGEUR_SECTEURS);
  ctx.slide.addChart(pres.charts.PIE, [{ name: serie.nom, labels: gr.categories, values: serie.valeurs }], {
    ...optionsCommunes({ ...z, x: z.x + (z.w - w) / 2, w }),
    layout: { x: 0.1, y: 0.1, w: 0.62, h: 0.8 },
    chartColors: couleurs(gr.categories.length),
    showPercent: true, showValue: false, dataLabelFormatCode: entieres ? "0%" : "0.0%", dataLabelPosition: "outEnd",
    dataBorder: { pt: 1, color: COULEURS.BLANC },
    showLegend: true, legendPos: "r",
  });
}

const TYPES = { barres, courbes, secteurs };

function graphique(pres, d, ctx) {
  const gr = d.graphique;
  if (!gr || !TYPES[gr.type]) {
    g.reserve(ctx.slide, ctx.zone, gr ? `Type de graphique « ${gr.type} » non disponible` : "Graphique sans données", ctx);
    return;
  }
  const sansValeur = !gr.categories.length || !gr.series.length || !gr.series.some((s) => s.valeurs.some(estNombre));
  if (sansValeur) {
    // L'analyseur a déjà alerté sur les cellules illisibles ou le tableau absent.
    g.reserve(ctx.slide, ctx.zone, "Graphique sans valeur numérique", ctx);
    return;
  }
  TYPES[gr.type](pres, gr, ctx);
}

module.exports = { MOTIFS: { graphique } };
