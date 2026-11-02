// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Rendu : gabarit, aiguillage par type et par motif, motifs de structure, et
// contrôles de mesure. Les essais de rendu tournent sur une charte d'essai
// (images PNG générées ici) : ils ne dépendent ni de l'atelier ni de la skill
// installée, sauf le dernier, qui se met en skip sans charte réelle.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { analyser } = require("../analyseur.js");
const { controlerMesures } = require("../controles.js");
const { rendre, MOTIFS } = require("../rendu.js");
const gabarit = require("../gabarit.js");
const { resoudreCharte, corrigerPprParRun } = require("../charte.js");
const outils = require("./outils-essai.js");
const { md, EMU, png, charteEssai, dossierTemp, archive, textes, images, rendu, codes, cadres } = outils;
const { largeurPt } = require("../mesure.js");

const FIXTURES = path.join(__dirname, "fixtures");
const BASE = fs.readFileSync(path.join(FIXTURES, "base.md"), "utf8");
const ENTETE = (...cles) => ["---", "titre: Essai", ...cles, "---"];

// ---------------------------------------------------------------------------
// Gabarit
// ---------------------------------------------------------------------------

test("gabarit : page, marges, zones, palette et ombres neuves", () => {
  assert.strictEqual(gabarit.W, 13.33);
  assert.strictEqual(gabarit.H, 7.5);
  assert.strictEqual(gabarit.MARGE, 0.5);
  assert.strictEqual(gabarit.BARRE, 1.0);
  assert.strictEqual(gabarit.POLICE, "Open Sans");
  assert.strictEqual(gabarit.COULEURS.BLEU, "1F519B");
  assert.strictEqual(gabarit.COULEURS.OR, "FDC948");
  const { zoneContenu: z, zoneTitre: t } = gabarit;
  assert.ok(z.y >= gabarit.BARRE && z.x === gabarit.MARGE && Math.abs(z.x + z.w - (gabarit.W - gabarit.MARGE)) < 1e-9);
  assert.ok(z.y + z.h <= gabarit.H - gabarit.MARGE + 1e-9);
  assert.ok(t.y === 0 && t.h === gabarit.BARRE && t.x + t.w < gabarit.W - 2);
  assert.notStrictEqual(gabarit.makeShadow(), gabarit.makeShadow());
});

test("gabarit : dimensions natives lues dans l'en-tête PNG et JPEG", () => {
  const d = dossierTemp({ "logo.png": png(214, 107) });
  assert.deepStrictEqual(gabarit.dimensionsImage(path.join(d, "logo.png")), { largeur: 214, hauteur: 107 });
  // JPEG minimal : SOI, un segment APP0, puis SOF0 qui porte hauteur et largeur.
  const jpeg = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0x2c, 0x02, 0x58, 0x01, 0x01, 0x11, 0x00,
  ]);
  fs.writeFileSync(path.join(d, "photo.jpg"), jpeg);
  assert.deepStrictEqual(gabarit.dimensionsImage(path.join(d, "photo.jpg")), { largeur: 600, hauteur: 300 });
  // Une dimension nulle : illisible, aucun ratio à conserver.
  fs.writeFileSync(path.join(d, "plat.jpg"), Buffer.from(jpeg).fill(0, 13, 15));
  assert.strictEqual(gabarit.dimensionsImage(path.join(d, "plat.jpg")), null);
  fs.writeFileSync(path.join(d, "vide.png"), png(0, 10));
  assert.strictEqual(gabarit.dimensionsImage(path.join(d, "vide.png")), null);
  fs.writeFileSync(path.join(d, "faux.png"), "pas une image");
  assert.strictEqual(gabarit.dimensionsImage(path.join(d, "faux.png")), null);
  assert.strictEqual(gabarit.dimensionsImage(path.join(d, "absent.png")), null);
});

test("gabarit : contenir garde le ratio et centre dans la boîte", () => {
  const r = gabarit.contenir({ largeur: 200, hauteur: 100 }, { x: 1, y: 1, w: 4, h: 4 });
  assert.deepStrictEqual(r, { x: 1, y: 2, w: 4, h: 2 });
});

// ---------------------------------------------------------------------------
// Rendu de base.md
// ---------------------------------------------------------------------------

test("base.md : une diapositive par diapo, plan, titre de couverture, tableau", async () => {
  const r = await rendu(BASE);
  assert.strictEqual(r.noms.length, r.doc.diapos.length);
  assert.strictEqual(r.noms.length, 8);
  assert.deepStrictEqual(r.plan.map((p) => [p.numero, p.motif]), [
    [1, "couverture"], [2, "section"], [3, "puces"], [4, "deux-colonnes"],
    [5, "tableau"], [6, "schema"], [7, "schema"], [8, "image"],
  ]);
  assert.strictEqual(r.plan[2].titre, "Un pilote unique par suite");
  assert.ok(textes(await r.xml(1)).includes("Le tableau unique des suites"));
  // Le tableau est la 5e diapositive de base.md.
  assert.match(await r.xml(5), /<a:tbl>/);
  assert.doesNotMatch(await r.xml(3), /<a:tbl>/);
});

test("base.md : chaque texte de la source se retrouve dans sa diapositive", async () => {
  const r = await rendu(BASE);
  const de = async (n) => textes(await r.xml(n)).join(" ");
  const couv = await de(1);
  assert.ok(couv.includes("CODIR du 29/10/2026") && couv.includes("Direction générale"));
  assert.ok(!couv.includes("Auteur"));
  assert.ok((await de(2)).includes("Un seul endroit pour savoir qui fait quoi, et pour quand"));
  const pilote = await de(3);
  for (const t of ["Un pilote unique par suite", "Une suite sans pilote nommé n'est pas une suite.",
    "Une seule personne, nommée", "les autres sont contributeurs ou informés", "Une date prévue au jour près"]) {
    assert.ok(pilote.includes(t), t);
  }
  const colonnes = await de(4);
  for (const t of ["Aujourd'hui", "Demain", "Les suites sont dispersées", "Un tableau unique, repris à chaque réunion"]) {
    assert.ok(colonnes.includes(t), t);
  }
  const tableau = await de(5);
  for (const t of ["Colonne", "Ce qu'on y écrit", "Pilote", "JJ/MM/AAAA"]) assert.ok(tableau.includes(t), t);
  assert.ok((await r.notes(3)).includes("Insister sur le pilote unique"));
});

test("motif absent du registre : réserve légendée, sans exception ni alerte", async () => {
  const doc = analyser(md("# C", "## Un motif à venir", "- a"));
  doc.diapos[1].motif = "fantome";
  const r = await rendre(doc, { dossierSource: dossierTemp(), charte: charteEssai() });
  const { xml } = await archive(r.pres);
  const t = textes(await xml(2));
  assert.ok(t.includes("Motif fantome non disponible") && t.includes("Un motif à venir"), t.join(" | "));
  assert.deepStrictEqual(r.alertes, []);
});

test("registre : les trois motifs de structure sont inscrits", () => {
  for (const m of ["puces", "deux-colonnes", "tableau"]) assert.strictEqual(typeof MOTIFS[m], "function", m);
});

// ---------------------------------------------------------------------------
// Ce que pose rendu.js autour du motif
// ---------------------------------------------------------------------------

test("titre : « // » devient un vrai retour à la ligne, échappement du XML", async () => {
  const r = await rendu(md("# C", "## L'avant & l'après // <ce qui change>", "- a"));
  const xml = await r.xml(2);
  const t = textes(xml);
  assert.ok(t.includes("L'avant & l'après") && t.includes("<ce qui change>"), t.join(" | "));
  assert.ok(!t.some((x) => x.includes("//")));
  assert.match(xml, /&amp;/);
});

test("source : pied « Source : … » posé par le rendu, une seule fois", async () => {
  const r = await rendu(md("# C", "## Les suites", "- a", "Source : compte rendu du 28/10, p. 2"));
  const t = textes(await r.xml(2)).filter((x) => x.includes("compte rendu du 28/10"));
  assert.deepStrictEqual(t, ["Source : compte rendu du 28/10, p. 2"]);
});

// Zones de texte du pied de diapositive : celles qui commencent dans la marge basse.
const pieds = (xml) => outils.formes(xml).filter((f) => f.y >= gabarit.zonePied.y - 1e-3 && f.textes.length);

test("pied : « Pied : » seul, en italique gris dans la marge basse, à gauche", async () => {
  const r = await rendu(md("# C", "## A", "- a", "Pied : Traduit de l'anglais ; original en notes."));
  assert.deepStrictEqual(r.alertes, []);
  const [p, ...autres] = pieds(await r.xml(2));
  assert.deepStrictEqual(autres, []);
  assert.deepStrictEqual(p.textes, ["Traduit de l'anglais ; original en notes."]);
  assert.deepStrictEqual(p.couleurs, ["777777"]);
  assert.ok(Math.abs(p.x - gabarit.zonePied.x) < 1e-3);
  assert.match(await r.xml(2), /<a:rPr[^>]* i="1"[^>]*>(?:(?!<\/a:r>).)*Traduit de l/s);
});

test("pied et source : le pied à gauche, la source à droite, sans recouvrement, même taille", async () => {
  const r = await rendu(md("# C", "## A", "- a", "Pied : Traduit de l'anglais.", "Source : rapport annuel 2025, page 12"));
  assert.deepStrictEqual(r.alertes, []);
  const xml = await r.xml(2);
  const [p, s] = pieds(xml).sort((a, b) => a.x - b.x);
  assert.deepStrictEqual([p.textes, s.textes], [["Traduit de l'anglais."], ["Source : rapport annuel 2025, page 12"]]);
  const z = gabarit.zonePied;
  assert.ok(Math.abs(p.x - z.x) < 1e-3 && Math.abs(s.x + s.w - (z.x + z.w)) < 1e-3, JSON.stringify([p, s]));
  assert.ok(p.x + p.w <= s.x + 1e-3, "recouvrement");
  assert.deepStrictEqual(p.tailles, s.tailles);
  assert.match(xml, /algn="r"[^>]*>(?:(?!<\/p:sp>).)*Source : rapport annuel/s);
});

test("pied trop long : TEXTE_TROP_LONG, le pied reste rendu", async () => {
  const long = "un pied de diapositive délibérément bavard qui ne tient pas dans la marge basse ".repeat(5);
  const r = await rendu(md("# C", "## A", "- a", `Pied : ${long}`, "Source : rapport, p. 3"));
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
  assert.match(r.alertes[0].message, /^Pied trop long .*: le raccourcir\.$/);
  const s = await rendu(md("# C", "## A", "- a", `Source : ${long}${long}`));
  assert.match(s.alertes[0].message, /^Source trop longue .*: la raccourcir\.$/);
});

test("notes : lignes jointes par un retour à la ligne", async () => {
  const r = await rendu(md("# C", "## A", "- a", "Notes : première idée", "seconde idée"));
  const notes = await r.notes(2);
  assert.ok(notes.includes("première idée") && notes.includes("seconde idée"));
});

test("avertissement de charte : DEPENDANCE_ABSENTE à la ligne 0", async () => {
  const charte = charteEssai({ avertissement: "Charte de l'atelier inutilisable, repli sur skill" });
  const r = await rendu(md("# C", "## A", "- a"), { charte });
  assert.deepStrictEqual(r.alertes, [{ ligne: 0, code: "DEPENDANCE_ABSENTE", message: charte.avertissement }]);
});

test("clôture : texte et contact rendus sur fond bleu", async () => {
  const r = await rendu(md("# C", "## A", "- a", "# Merci de votre attention", "Clôture :", "Pascal Chevallot", "contact@exemple.fr"));
  assert.strictEqual(r.plan[2].motif, "cloture");
  const t = textes(await r.xml(3)).join(" ");
  assert.ok(t.includes("Merci de votre attention") && t.includes("contact@exemple.fr"));
});

test("clôture : le texte de « Clôture : » est rendu entre le titre et le contact", async () => {
  const r = await rendu(md("# C", "## A", "- a", "# Merci", "Clôture : à bientôt", "contact@exemple.fr"));
  const t = textes(await r.xml(3));
  assert.ok(t.includes("à bientôt") && t.includes("contact@exemple.fr"), t.join(" | "));
  assert.deepStrictEqual(r.alertes, []);
});

test("fond bleu : contact trop long, TEXTE_TROP_LONG à la ligne de la clôture", async () => {
  const contact = Array.from({ length: 10 }, (_, i) => `Une longue ligne de contact numéro ${i + 1}, qui ne s'arrête pas avant d'avoir tout dit sur l'intervenant`);
  const r = await rendu(md("# C", "## A", "- a", "# Merci", "Clôture :", ...contact));
  assert.deepStrictEqual(r.alertes.map((a) => [a.ligne, a.code]), [[4, "TEXTE_TROP_LONG"]]);
});

test("liste numérotée, niveaux et gras : numéros automatiques, astérisques retirés", async () => {
  const r = await rendu(md("# C", "## Étapes", "1. Une **première** étape", "2. Une seconde", "   - un détail"));
  const xml = await r.xml(2);
  assert.match(xml, /<a:buAutoNum type="arabicPeriod"/);
  assert.ok(!textes(xml).some((x) => x.includes("**")));
  assert.match(xml, /<a:rPr[^>]*b="1"[^>]*>(?:(?!<\/a:r>).)*<a:t>première<\/a:t>/s);
  // Trois runs dans le premier paragraphe, et un seul <a:pPr>, en tête (schéma OOXML).
  const paragraphes = xml.match(/<a:p>.*?<\/a:p>/gs);
  const premier = paragraphes.find((p) => p.includes("première"));
  assert.strictEqual((premier.match(/<a:r>/g) || []).length, 3);
  for (const p of paragraphes) assert.ok((p.match(/<a:pPr[ >/]/g) || []).length <= 1 && !/<\/a:r>\s*<a:pPr/.test(p), p.slice(0, 200));
});

test("tableau : rangée trop longue signalée, cellule manquante complétée", async () => {
  const r = await rendu(md("# C", "## T", "| A | B |", "|---|---|", "| 1 | 2 | 3 |", "| 4 |"));
  assert.deepStrictEqual(r.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"]]);
  const t = textes(await r.xml(2));
  assert.ok(t.includes("4") && !t.includes("3"));
});

// Largeurs des colonnes (gridCol, en pouces) et taille du texte d'un tableau rendu.
function grilleTableau(xml) {
  const colonnes = [...xml.matchAll(/<a:gridCol w="(\d+)"/g)].map((m) => m[1] / EMU);
  const taille = Number(/<a:tbl>.*?<a:rPr[^>]* sz="(\d+)"/s.exec(xml)[1]) / 100;
  return { colonnes, taille };
}

test("tableau : un en-tête d'un seul mot long garde sa colonne au moins aussi large que lui", async () => {
  const long = "une cellule longue qui réclame toute la place disponible et même davantage encore";
  const r = await rendu(md("# C", "## T", "| Horaire | Détail | Remarque |", "|---|---|---|", `| 9 h | ${long} | ${long} |`));
  assert.deepStrictEqual(r.alertes, []);
  const { colonnes, taille } = grilleTableau(await r.xml(2));
  const mot = largeurPt("Horaire", { taille, gras: true }) / 72 + 0.2;
  assert.ok(colonnes[0] >= mot - 1e-3, `colonne de ${colonnes[0].toFixed(3)} pouce pour un mot de ${mot.toFixed(3)} à ${taille} pt`);
  assert.ok(Math.abs(colonnes.reduce((a, b) => a + b, 0) - gabarit.zoneContenu.w) < 1e-3);
});

test("tableau : des mots trop larges même à la taille minimale, TEXTE_TROP_LONG", async () => {
  const mot = "Anticonstitutionnellement";
  const r = await rendu(md("# C", "## T", `| ${Array(8).fill(mot).join(" | ")} |`, `|${"---|".repeat(8)}`, `| ${Array(8).fill("a").join(" | ")} |`));
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
  assert.match(r.alertes[0].message, /mot plus large que sa colonne/);
  assert.strictEqual(grilleTableau(await r.xml(2)).taille, gabarit.TAILLES.tableau.min);
});

test("tableau : un mot en gras dans le corps garde sa colonne au moins aussi large que lui en gras", async () => {
  const long = "une cellule longue qui réclame toute la place disponible et même davantage encore";
  const r = await rendu(md("# C", "## T", "| A | B | C |", "|---|---|---|", `| **Accompagnement** | ${long} | ${long} |`));
  assert.deepStrictEqual(r.alertes, []);
  const { colonnes, taille } = grilleTableau(await r.xml(2));
  const mot = largeurPt("Accompagnement", { taille, gras: true }) / 72 + 0.2;
  assert.ok(colonnes[0] >= mot - 1e-3, `colonne de ${colonnes[0].toFixed(3)} pouce pour un mot gras de ${mot.toFixed(3)} à ${taille} pt`);
});

test("tableau : des mots en gras trop larges même à la taille minimale, TEXTE_TROP_LONG", async () => {
  // Six mots longs en gras et « Horaire » : tiennent en maigre à 10 pt, pas en gras.
  const mot = "**Anticonstitutionnellement**";
  const r = await rendu(md("# C", "## T", `| ${Array(7).fill("a").join(" | ")} |`, `|${"---|".repeat(7)}`, `| ${Array(6).fill(mot).join(" | ")} | Horaire |`));
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
  assert.match(r.alertes[0].message, /mot plus large que sa colonne/);
});

test("deux colonnes réduites à une : DONNEES_INVALIDES et rendu sur toute la largeur", async () => {
  const r = await rendu(md("# C", "## Seule", "### Gauche", "- a"));
  assert.deepStrictEqual(r.alertes.map((a) => a.code), ["DONNEES_INVALIDES"]);
  assert.ok(textes(await r.xml(2)).includes("Gauche"));
});

test("puces trop longues pour la zone : TEXTE_TROP_LONG, le deck reste rendu", async () => {
  const longue = "une puce délibérément longue qui revient encore et encore sur le même propos ".repeat(4);
  const r = await rendu(md("# C", "## Trop", ...Array.from({ length: 14 }, () => `- ${longue}`)));
  assert.deepStrictEqual(r.alertes.map((a) => [a.ligne, a.code]), [[2, "TEXTE_TROP_LONG"]]);
  assert.strictEqual(r.noms.length, 2);
});

// ---------------------------------------------------------------------------
// Logo client sur la couverture
// ---------------------------------------------------------------------------

// Bandeau et logo aux ratios natifs de la charte (bandeau 1453 x 186, logo 4:1) : la
// place du logo client dépend de la hauteur réelle du bandeau.
const CHARTE_RATIOS = charteEssai({ hauteurPour: (c, largeur) => largeur / (largeur > 10 ? 1453 / 186 : 4) });

test("logo client : une image de plus sur la couverture, ratio conservé", async () => {
  const source = md(...ENTETE("logo_client: logo client.png"), "# Couverture", "Sous-titre");
  const sans = await rendu(md(...ENTETE(), "# Couverture", "Sous-titre"), { charte: CHARTE_RATIOS });
  const dossierSource = dossierTemp({ "logo client.png": png(300, 100) });
  const avec = await rendu(source, { dossierSource, charte: CHARTE_RATIOS });
  assert.strictEqual(images(await avec.xml(1)), images(await sans.xml(1)) + 1);
  assert.deepStrictEqual(avec.alertes, []);
  // Boîte de 7 x 3,2 cm : un logo 3:1 y prend toute la largeur, 7 cm.
  const ext = [...(await avec.xml(1)).matchAll(/<p:pic>.*?<a:ext cx="(\d+)" cy="(\d+)"\/>/gs)].map((m) => [+m[1], +m[2]]);
  const EMU_CM = 360000;
  assert.ok(ext.some(([cx, cy]) => Math.abs(cx - 7 * EMU_CM) < 2000 && Math.abs(cx / cy - 3) < 0.01), JSON.stringify(ext));
});

test("logo client : sa pastille reste à 0,3 pouce au moins du bandeau, logo haut comme logo large", async () => {
  const charte = CHARTE_RATIOS;
  for (const [w, h] of [[300, 100], [100, 100], [100, 300]]) {
    const dossierSource = dossierTemp({ "logo.png": png(w, h) });
    const r = await rendu(md(...ENTETE("logo_client: logo.png"), "# Couverture", "Sous-titre", "Ligne de date"), { dossierSource, charte });
    const xml = await r.xml(1);
    const bandeau = [...xml.matchAll(/<p:pic>.*?<\/p:pic>/gs)].map((m) => cadres(m[0])[0]).find((c) => c.w > gabarit.W - 0.01);
    const pastille = [...xml.matchAll(/<p:sp>.*?<\/p:sp>/gs)].map((m) => m[0]).filter((sp) => /prst="roundRect"/.test(sp)).map((sp) => cadres(sp)[0])[0];
    assert.ok(bandeau.y - (pastille.y + pastille.h) >= 0.3 - 1e-6, `${w}x${h} : ${JSON.stringify({ pastille, bandeau })}`);
  }
});

test("logo client introuvable : IMAGE_INTROUVABLE, couverture sans logo client", async () => {
  const sans = await rendu(md(...ENTETE(), "# Couverture"));
  const r = await rendu(md(...ENTETE("logo_client: absent.png"), "# Couverture"));
  assert.deepStrictEqual(r.alertes.map((a) => a.code), ["IMAGE_INTROUVABLE"]);
  assert.match(r.alertes[0].message, /absent\.png/);
  assert.strictEqual(images(await r.xml(1)), images(await sans.xml(1)));
});

// ---------------------------------------------------------------------------
// controlerMesures
// ---------------------------------------------------------------------------

const mesures = (...lignes) => controlerMesures(analyser(md("# Couverture", ...lignes)));
const codesMesure = (liste) => liste.map((a) => [a.ligne, a.code]);
const TITRE_120 = "Un tableau unique des suites pour savoir enfin qui fait quoi et pour quand, repris à chaque réunion de direction".padEnd(120, ".");

test("titre de 120 caractères sans « // » : TITRE_A_COUPER, avec une coupure proposée", () => {
  assert.strictEqual(TITRE_120.length, 120);
  const liste = mesures(`## ${TITRE_120}`, "- a");
  assert.deepStrictEqual(codesMesure(liste), [[2, "TITRE_A_COUPER"]]);
  assert.match(liste[0].message, / \/\/ /);
});

test("titre court, ou coupé par « // » sans mot orphelin : aucune alerte", () => {
  assert.deepStrictEqual(mesures("## Un pilote unique par suite", "- a"), []);
  assert.deepStrictEqual(mesures("## Un tableau unique des suites // repris à chaque réunion de direction", "- a"), []);
});

test("mot orphelin après la coupure : TITRE_ORPHELIN", () => {
  assert.deepStrictEqual(codesMesure(mesures("## Un tableau unique des suites // partagé", "- a")), [[2, "TITRE_ORPHELIN"]]);
});

test("titre qui ne tient pas même au minimum : TEXTE_TROP_LONG", () => {
  const liste = mesures(`## ${"Un titre beaucoup trop long pour la barre ".repeat(6)}`, "- a");
  assert.ok(codesMesure(liste).some(([l, c]) => l === 2 && c === "TEXTE_TROP_LONG"), JSON.stringify(liste));
});

test("accroche trop longue : TEXTE_TROP_LONG", () => {
  const liste = mesures("## Court", `Accroche : ${"une accroche qui ne tient pas sur la ligne prévue ".repeat(5)}`, "- a");
  assert.deepStrictEqual(codesMesure(liste), [[2, "TEXTE_TROP_LONG"]]);
  assert.match(liste[0].message, /sur une ligne/);
});

// Accroche faite de « mot » répétés, la plus longue qui tient sur une ligne en gras à `taille`.
function accrochePour(taille) {
  let texte = "Une accroche";
  while (largeurPt(`${texte} mot`, { taille, gras: true }) / 72 <= gabarit.zoneAccroche.w) texte += " mot";
  return texte;
}
const tailleAccroche = async (accroche) => {
  const r = await rendu(md("# C", "## A", `Accroche : ${accroche}`, "- a"));
  const forme = outils.formes(await r.xml(2)).find((f) => f.textes.join("") === accroche);
  return forme.tailles[0];
};

test("accroche : 18 pt fixe, 16 pt en repli, jamais entre deux ni en dessous", async () => {
  assert.strictEqual(await tailleAccroche(accrochePour(18)), 18);
  // Tient à 17 pt mais pas à 18 : le repli est 16 pt, pas 17.
  const a17 = accrochePour(17);
  assert.ok(largeurPt(a17, { taille: 18, gras: true }) / 72 > gabarit.zoneAccroche.w);
  assert.strictEqual(await tailleAccroche(a17), 16);
  assert.deepStrictEqual(mesures("## A", `Accroche : ${a17}`, "- a"), []);
  // Tient à 15 pt mais pas à 16 : TEXTE_TROP_LONG, le rendu reste à 16 pt.
  const a15 = accrochePour(15);
  assert.ok(largeurPt(a15, { taille: 16, gras: true }) / 72 > gabarit.zoneAccroche.w);
  assert.deepStrictEqual(codesMesure(mesures("## A", `Accroche : ${a15}`, "- a")), [[2, "TEXTE_TROP_LONG"]]);
  assert.strictEqual(await tailleAccroche(a15), 16);
});

test("couverture et section : titre long sans « // » mesuré dans sa boîte", () => {
  const doc = analyser(md(`# ${"Une couverture au titre très long qui court"} sur deux lignes au moins`, "## A", "- a"));
  assert.deepStrictEqual(codesMesure(controlerMesures(doc)), [[1, "TITRE_A_COUPER"]]);
  assert.deepStrictEqual(controlerMesures(analyser(BASE)), []);
});

test("correctif <a:pPr> du bundle : appliqué une fois, refusé si l'expression manque ou se répète", () => {
  const cible = 'n=Te(r,!1),i+=n.replace("<a:pPr></a:pPr>","")';
  assert.strictEqual(corrigerPprParRun(`a;${cible};b`), 'a;n=Te(r,!1),i+=0<e?"":n.replace("<a:pPr></a:pPr>","");b');
  assert.throws(() => corrigerPprParRun("a;b"), /correctif <a:pPr>/);
  assert.throws(() => corrigerPprParRun(`${cible};${cible}`), /en double/);
});

// ---------------------------------------------------------------------------
// Avec la charte réelle (atelier ou skill), si elle est trouvée
// ---------------------------------------------------------------------------

let charteReelle = null;
try { charteReelle = resoudreCharte(FIXTURES); } catch { charteReelle = null; }

test("base.md avec la charte réelle : rendu sans alerte", { skip: !charteReelle }, async () => {
  // La photo de la dernière diapositive : un en-tête JPEG de 600 x 300 suffit à la mise en page.
  const photo = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00,
    0xff, 0xc0, 0x00, 0x0b, 0x08, 0x01, 0x2c, 0x02, 0x58, 0x01, 0x01, 0x11, 0x00,
  ]);
  const r = await rendu(BASE, { charte: charteReelle, dossierSource: dossierTemp({ "photo.jpg": photo }) });
  assert.strictEqual(r.noms.length, 8);
  assert.deepStrictEqual(r.alertes, []);
});
