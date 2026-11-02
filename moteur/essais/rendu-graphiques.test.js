// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motif graphique : barres, courbes, secteurs en graphiques natifs. Charte
// d'essai en mémoire : aucun fichier de l'atelier ni de la skill n'est lu.
const test = require("node:test");
const assert = require("node:assert");
const gabarit = require("../gabarit.js");
const { MOTIFS } = require("../rendu.js");
const outils = require("./outils-essai.js");

const { md, textes, codes, graphiques } = outils;

// Source dont la diapositive 2 porte le graphique ; renvoie aussi le XML du premier graphique.
async function rendu(type, tableau, apres = []) {
  const r = await outils.rendu(md("# G", "## Données", `Graphique : ${type}`, ...tableau, ...apres));
  const [chart] = await graphiques(r.zip);
  return { ...r, chart, nCharts: (await graphiques(r.zip)).length, t: textes(await r.xml(2)) };
}

const BARRES = ["| Poste | 2025 | 2026 |", "|---|---|---|", "| Eau | 10 | 12,5 |", "| Énergie | 20 | 22 |", "| Déchets | 30 | 28 |"];
const valeurs = (chart) => [...chart.matchAll(/<c:val>.*?<\/c:val>/gs)].map((m) => [...m[0].matchAll(/<c:v>([^<]*)<\/c:v>/g)].map((v) => v[1]));
const couleursSeries = (chart) => [...chart.matchAll(/<c:ser>.*?<c:spPr>.*?<a:srgbClr val="([0-9A-F]{6})"/gs)].map((m) => m[1]);

test("registre : le motif graphique est inscrit", () => {
  assert.strictEqual(typeof MOTIFS.graphique, "function");
});

test("barres : 2 séries et 3 catégories, un graphique natif aux couleurs de la charte", async () => {
  const r = await rendu("barres", BARRES);
  assert.strictEqual(r.nCharts, 1);
  assert.match(r.chart, /<c:barChart>/);
  for (const c of ["Eau", "Énergie", "Déchets"]) assert.ok(r.chart.includes(`<c:v>${c}</c:v>`), c);
  for (const s of ["2025", "2026"]) assert.ok(r.chart.includes(`<c:v>${s}</c:v>`), s);
  assert.deepStrictEqual(couleursSeries(r.chart), ["1F519B", "FDC948"]);
  assert.deepStrictEqual(codes(r), []);
});

test("barres : la virgule décimale donne 12.5 dans le XML", async () => {
  const r = await rendu("barres", BARRES);
  assert.deepStrictEqual(valeurs(r.chart)[1], ["12.5", "22", "28"]);
});

test("étiquettes : format General, 12,5 n'est pas arrondi à 13", async () => {
  const r = await rendu("barres", BARRES);
  const formats = [...r.chart.matchAll(/<c:dLbls>.*?<\/c:dLbls>/gs)].map((m) => /<c:numFmt formatCode="([^"]*)"/.exec(m[0])?.[1]);
  assert.ok(formats.length > 0);
  assert.ok(formats.every((f) => f === "General"), formats.join("|"));
});

test("secteurs : pourcentages au format 0% si toutes les parts sont entières, 0.0% sinon", async () => {
  const formats = (chart) => [...chart.matchAll(/<c:numFmt formatCode="([^"]*)"/g)].map((m) => m[1]);
  const entieres = await rendu("secteurs", ["| Part | Budget |", "|---|---|", "| A | 38 |", "| B | 24 |", "| C | 22 |", "| D | 16 |"]);
  assert.ok(formats(entieres.chart).length > 0 && formats(entieres.chart).every((f) => f === "0%"), formats(entieres.chart).join("|"));
  const tiers = await rendu("secteurs", ["| Part | Budget |", "|---|---|", "| A | 1 |", "| B | 2 |"]);
  assert.ok(formats(tiers.chart).length > 0 && formats(tiers.chart).every((f) => f === "0.0%"), formats(tiers.chart).join("|"));
});

test("secteurs : zone de tracé réduite (place des étiquettes), graphique resserré vers sa légende", async () => {
  const r = await rendu("secteurs", ["| Part | Budget |", "|---|---|", "| A | 50 |", "| B | 30 |", "| C | 20 |"]);
  assert.match(r.chart, /<c:plotArea>\s*<c:layout>\s*<c:manualLayout>/);
  const [cadre] = outils.cadres(/<p:graphicFrame>.*?<\/p:graphicFrame>/s.exec(await r.xml(2))[0]);
  assert.ok(cadre.w < gabarit.zoneContenu.w - 2, JSON.stringify(cadre));
  assert.ok(Math.abs(cadre.x + cadre.w / 2 - gabarit.W / 2) < 0.01, "centré");
});

test("police : Open Sans pour les axes, la légende et les étiquettes", async () => {
  const r = await rendu("barres", BARRES);
  const polices = new Set([...r.chart.matchAll(/<a:latin typeface="([^"]+)"/g)].map((m) => m[1]));
  assert.deepStrictEqual([...polices], ["Open Sans"]);
});

test("courbes : trait non lissé, une couleur par série", async () => {
  const r = await rendu("courbes", BARRES);
  assert.match(r.chart, /<c:lineChart>/);
  assert.doesNotMatch(r.chart, /<c:smooth val="1"\/>/);
  assert.deepStrictEqual(couleursSeries(r.chart), ["1F519B", "FDC948"]);
});

test("couleurs : au-delà de cinq séries, on reprend au début", async () => {
  const tete = "| X | A | B | C | D | E | F |";
  const r = await rendu("courbes", [tete, "|---|---|---|---|---|---|---|", "| a | 1 | 2 | 3 | 4 | 5 | 6 |", "| b | 2 | 3 | 4 | 5 | 6 | 7 |"]);
  assert.deepStrictEqual(couleursSeries(r.chart), ["1F519B", "FDC948", "4CAF50", "FF9800", "F44336", "1F519B"]);
});

test("secteurs : une couleur par catégorie, pourcentages affichés", async () => {
  const r = await rendu("secteurs", ["| Part | Budget |", "|---|---|", "| A | 50 |", "| B | 30 |", "| C | 20 |"]);
  assert.match(r.chart, /<c:pieChart>/);
  assert.match(r.chart, /<c:showPercent val="1"\/>/);
  const pts = [...r.chart.matchAll(/<c:dPt>.*?<a:srgbClr val="([0-9A-F]{6})"/gs)].map((m) => m[1]);
  assert.deepStrictEqual(pts, ["1F519B", "FDC948", "4CAF50"]);
  assert.deepStrictEqual(codes(r), []);
});

test("secteurs : pourcentages hors des parts, gris foncé sur le fond blanc (lisibles sur toute couleur)", async () => {
  const r = await rendu("secteurs", ["| Part | Budget |", "|---|---|", "| A | 50 |", "| B | 30 |", "| C | 20 |"]);
  // Une étiquette par part (<c:dLbl>) ; la position par défaut de la série, que PptxGenJS fixe à ctr, ne sert pas.
  const parts = [...r.chart.matchAll(/<c:dLbl>.*?<\/c:dLbl>/gs)].map((m) => m[0]);
  const positions = parts.map((x) => /<c:dLblPos val="([^"]+)"\/>/.exec(x)?.[1]);
  assert.strictEqual(positions.length, 3);
  assert.ok(positions.every((p) => p === "outEnd"), positions.join("|"));
  assert.match(r.chart, /<c:dLbls>.*?<a:srgbClr val="333333"\/>/s);
});

test("secteurs à 2 séries : DONNEES_INVALIDES, première série seule, jamais d'exception", async () => {
  const r = await rendu("secteurs", ["| Part | 2025 | 2026 |", "|---|---|---|", "| A | 50 | 60 |", "| B | 50 | 40 |"]);
  assert.deepStrictEqual(codes(r).map((c) => c[1]), ["DONNEES_INVALIDES"]);
  assert.match(r.alertes[0].message, /une seule série/);
  assert.strictEqual(r.nCharts, 1);
  assert.deepStrictEqual(valeurs(r.chart), [["50", "50"]]);
  assert.ok(!r.chart.includes("<c:v>2026</c:v>"));
});

test("cellule n.c. : l'analyseur alerte une fois, à la ligne de la cellule, le deck est généré", async () => {
  const source = md("# G", "## Données", "Graphique : barres", "| Poste | 2026 |", "|---|---|", "| Eau | 10 |", "| Énergie | n.c. |", "| Déchets | 30 |");
  const r = await outils.rendu(source);
  const ligne = source.split("\n").findIndex((l) => l.includes("n.c.")) + 1;
  const dn = [...r.doc.alertes, ...r.alertes].filter((a) => a.code === "DONNEES_INVALIDES");
  assert.deepStrictEqual(dn.map((a) => a.ligne), [ligne]);
  assert.deepStrictEqual(r.alertes, [], "le rendu ne réémet pas l'alerte");
  const [chart] = await graphiques(r.zip);
  assert.doesNotMatch(chart, /null|NaN|undefined/);
  assert.deepStrictEqual(valeurs(chart)[0].filter((v) => v !== ""), ["10", "30"]);
  assert.strictEqual(valeurs(chart)[0].length, 3);
});

test("courbe trouée : le point manquant ne casse pas le XML", async () => {
  const r = await rendu("courbes", ["| Mois | Tickets |", "|---|---|", "| Jan | 4 |", "| Fév | n.c. |", "| Mar | 6 |"]);
  assert.match(r.chart, /<c:lineChart>/);
  assert.doesNotMatch(r.chart, /null|NaN|undefined/);
  assert.deepStrictEqual(valeurs(r.chart)[0], ["4", "", "6"]);
  assert.match(r.chart, /<c:dispBlanksAs val="gap"\/>/);
});

test("aucune valeur numérique : réserve légendée, pas de graphique", async () => {
  const r = await rendu("barres", ["| Poste | 2026 |", "|---|---|", "| Eau | n.c. |", "| Énergie | n.c. |"]);
  assert.strictEqual(r.nCharts, 0);
  assert.ok(r.t.some((x) => x.includes("Graphique sans valeur numérique")), r.t.join("|"));
  assert.deepStrictEqual(r.alertes, []);
});

test("graphique dans la zone du contenu, sous l'accroche quand il y en a une", async () => {
  const r = await outils.rendu(md("# G", "## Données", "Graphique : barres", "Accroche : Un message", ...BARRES));
  const xml = await r.xml(2);
  const cadre = outils.cadres(/<p:graphicFrame>.*?<\/p:graphicFrame>/s.exec(xml)[0])[0];
  assert.ok(cadre.y >= gabarit.zoneSousAccroche.y - 1e-3, JSON.stringify(cadre));
  outils.dansLesMarges(xml);
});

test("plus de cinq séries : DONNEES_INVALIDES, le graphique est rendu", async () => {
  const r = await rendu("courbes", ["| X | A | B | C | D | E | F |", "|---|---|---|---|---|---|---|", "| a | 1 | 2 | 3 | 4 | 5 | 6 |"]);
  assert.deepStrictEqual(codes(r).map((c) => c[1]), ["DONNEES_INVALIDES"]);
  assert.strictEqual(r.nCharts, 1);
});

test("plus de cinq secteurs : DONNEES_INVALIDES, le graphique est rendu", async () => {
  const lignes = ["a", "b", "c", "d", "e", "f"].map((c) => `| ${c} | 10 |`);
  const r = await rendu("secteurs", ["| Part | Budget |", "|---|---|", ...lignes]);
  assert.deepStrictEqual(codes(r).map((c) => c[1]), ["DONNEES_INVALIDES"]);
  assert.strictEqual(r.nCharts, 1);
});

test("secteurs : valeur négative ou nulle, DONNEES_INVALIDES, le graphique est rendu", async () => {
  const r = await rendu("secteurs", ["| Part | Budget |", "|---|---|", "| A | 50 |", "| B | 0 |", "| C | -5 |"]);
  assert.deepStrictEqual(codes(r).map((c) => c[1]), ["DONNEES_INVALIDES"]);
  assert.strictEqual(r.nCharts, 1);
});

test("graphique absent du Document : réserve légendée proprement, sans exception", async () => {
  const r = await outils.rendu(md("# G", "## Données", "Graphique : barres", ...BARRES), { avant: (doc) => { doc.diapos[1].graphique = null; } });
  assert.ok(textes(await r.xml(2)).includes("Graphique sans données"));
});
