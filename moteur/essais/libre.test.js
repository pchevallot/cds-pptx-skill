// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motif libre : module JavaScript de l'auteur, chargé depuis le dossier de la
// source, qui dessine lui-même sa diapositive.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { MOTIFS } = require("../rendu.js");
const libre = require("../libre.js");
const { md, dossierTemp, textes, codes, rendu } = require("./outils-essai.js");

const FIXTURES = path.join(__dirname, "fixtures", "dossier accentué é");
const SOURCE = (chemin) => md("# C", "## Schéma maison", `Diapositive libre : ${chemin}`, "Notes : dit à l'oral");
const tout = async (r) => textes(await r.xml(2)).join(" | ");

test("registre : libre est inscrit dans le registre et exporté", () => {
  assert.strictEqual(typeof MOTIFS.libre, "function");
  assert.strictEqual(libre.MOTIFS.libre, MOTIFS.libre);
});

test("libre : le module dessine son texte, titre et notes déjà posés", async () => {
  const r = await rendu(SOURCE("libre-essai.js"), { dossierSource: FIXTURES });
  assert.deepStrictEqual(r.alertes, []);
  const t = await tout(r);
  assert.ok(t.includes("essai libre"), t);
  assert.ok(t.includes("Schéma maison"), t);
  assert.ok(t.includes("outils manquants : 0"), t);
  assert.ok((await r.notes(2)).includes("dit à l&apos;oral") || (await r.notes(2)).includes("dit à l'oral"));
});

test("libre : chemin relatif résolu depuis le dossier de la source, pas depuis le répertoire du moteur ni depuis le répertoire courant", async () => {
  const origine = process.cwd();
  const ailleurs = fs.mkdtempSync(path.join(os.tmpdir(), "cds-cwd-"));
  try {
    // Répertoire courant = essais/ : un dossierSource relatif y est résolu, et le
    // module n'est ni dans essais/ ni dans le dossier de libre.js.
    process.chdir(__dirname);
    const relatif = await rendu(SOURCE("libre-essai.js"), { dossierSource: path.join("fixtures", "dossier accentué é") });
    assert.deepStrictEqual(relatif.alertes, []);
    assert.ok((await tout(relatif)).includes("essai libre"));
    // Répertoire courant sans rapport : le dossierSource absolu donne le même rendu.
    process.chdir(ailleurs);
    const absolu = await rendu(SOURCE("libre-essai.js"), { dossierSource: FIXTURES });
    assert.deepStrictEqual(absolu.alertes, []);
    assert.strictEqual(await tout(absolu), await tout(relatif));
  } finally {
    process.chdir(origine);
    fs.rmSync(ailleurs, { recursive: true, force: true });
  }
});

test("libre : module introuvable, LIBRE_INTROUVABLE et diapositive titrée et vide", async () => {
  const r = await rendu(SOURCE("absent.js"), { dossierSource: dossierTemp() });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  assert.ok(/absent\.js/.test(r.alertes[0].message), r.alertes[0].message);
  assert.ok(!/\n\s+at /.test(r.alertes[0].message), "pas de pile");
  assert.strictEqual(await tout(r), "Schéma maison");
});

test("libre : l'export n'est pas une fonction", async () => {
  const dossier = dossierTemp({ "objet.js": "module.exports = { a: 1 };" });
  const r = await rendu(SOURCE("objet.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  assert.ok(/fonction/.test(r.alertes[0].message), r.alertes[0].message);
});

test("libre : erreur synchrone, message sans pile", async () => {
  const dossier = dossierTemp({ "boum.js": "module.exports = () => { throw new Error('cassé exprès'); };" });
  const r = await rendu(SOURCE("boum.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  assert.ok(r.alertes[0].message.includes("cassé exprès"));
  assert.ok(!/\n\s+at /.test(r.alertes[0].message));
});

test("libre : promesse résolue attendue, promesse rejetée alertée", async () => {
  const dossier = dossierTemp({
    "async-ok.js": "module.exports = async (s) => { await null; s.addText('tard', { x: 1, y: 2, w: 2, h: 0.5 }); };",
    "async-ko.js": "module.exports = async () => { await null; throw new Error('rejet exprès'); };",
  });
  const ok = await rendu(SOURCE("async-ok.js"), { dossierSource: dossier });
  assert.deepStrictEqual(ok.alertes, []);
  assert.ok((await tout(ok)).includes("tard"));
  const ko = await rendu(SOURCE("async-ko.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(ko), [[2, "LIBRE_INTROUVABLE"]]);
  assert.ok(ko.alertes[0].message.includes("rejet exprès"));
});

test("libre : un module qui dessine puis lève laisse la diapositive titrée et vide", async () => {
  const dossier = dossierTemp({
    "partiel.js": "module.exports = (s) => { s.addText('contenu partiel', { x: 1, y: 2, w: 3, h: 0.5 }); throw new Error('tard'); };",
  });
  const r = await rendu(SOURCE("partiel.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  const t = await tout(r);
  assert.ok(!t.includes("contenu partiel"), t);
  assert.ok(t.includes("Schéma maison"));
});

test("libre : sans _slideObjects, alerte quand même et pas de plantage", async () => {
  const dossier = dossierTemp({ "boum.js": "module.exports = () => { throw new Error('x'); };" });
  const slide = {};
  const alertes = [];
  await libre.MOTIFS.libre(null, { libre: { chemin: "boum.js" }, ligne: 1 }, {
    slide, dossierSource: dossier, alerter: (c, m) => alertes.push([c, m]),
    charte: {}, gabarit: { makeShadow() {} }, mesure: {}, motifs: {},
  });
  assert.strictEqual(alertes[0][0], "LIBRE_INTROUVABLE");
});

test("libre : un module modifié est relu à la génération suivante du même processus", async () => {
  const dossier = dossierTemp({ "v.js": "module.exports = (s) => s.addText('version un', { x: 1, y: 2, w: 3, h: 0.5 });" });
  const a = await rendu(SOURCE("v.js"), { dossierSource: dossier });
  assert.ok((await tout(a)).includes("version un"));
  fs.writeFileSync(path.join(dossier, "v.js"), "module.exports = (s) => s.addText('version deux', { x: 1, y: 2, w: 3, h: 0.5 });");
  const b = await rendu(SOURCE("v.js"), { dossierSource: dossier });
  const t = await tout(b);
  assert.ok(t.includes("version deux") && !t.includes("version un"), t);
});

// Le module ajoute un média ou un graphique puis lève : ni la ressource ni la
// relation de la diapositive ne doivent rester dans le PPTX.
const nomsArchive = (r) => Object.keys(r.zip.files);
const relsDiapo = (r) => r.zip.file("ppt/slides/_rels/slide2.xml.rels").async("string");

test("libre : une image ajoutée puis une erreur ne laissent ni média ni relation", async () => {
  const { uri } = require("./outils-essai.js");
  const dossier = dossierTemp({
    "image.js": `module.exports = (s) => { s.addImage({ data: ${JSON.stringify(uri(20, 10))}, x: 1, y: 2, w: 2, h: 1 }); throw new Error("après l'image"); };`,
  });
  const r = await rendu(SOURCE("image.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  assert.deepStrictEqual(nomsArchive(r).filter((n) => /^ppt\/media\/image-2-/.test(n)), []);
  assert.ok(!/image/i.test(await relsDiapo(r)), await relsDiapo(r));
  assert.ok(!(await r.xml(2)).includes("<p:pic>"));
});

test("libre : un graphique ajouté puis une erreur ne laissent ni graphique ni relation", async () => {
  const dossier = dossierTemp({
    "graphique.js": `module.exports = (s, cds) => {
      s.addChart("bar", [{ name: "a", labels: ["x", "y"], values: [1, 2] }], { x: 1, y: 2, w: 4, h: 3 });
      throw new Error("après le graphique");
    };`,
  });
  const r = await rendu(SOURCE("graphique.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  assert.deepStrictEqual(nomsArchive(r).filter((n) => /^ppt\/(charts|embeddings)\//.test(n) && !r.zip.files[n].dir), []);
  assert.ok(!/chart/i.test(await relsDiapo(r)), await relsDiapo(r));
  assert.ok(!(await r.xml(2)).includes("graphicFrame"));
});

// ---------------------------------------------------------------------------
// Zone et composition (conception § 6)
// ---------------------------------------------------------------------------

const gabarit = require("../gabarit.js");
const { cadres } = require("./outils-essai.js");
const MOTEUR = path.join(__dirname, "..");

// Cadres posés par le module : ni le titre (dans la barre) ni l'accroche.
const cadresDuModule = (xml) => cadres(xml).filter((c) => c.y > gabarit.BARRE && Math.abs(c.y - gabarit.zoneAccroche.y) > 1e-3);

test("libre : sous une accroche, le module de l'exemple dessine dans cds.zone, sous l'accroche", async () => {
  const source = md("# C", "## Valeur et effort", "Accroche : Commencer par les gains rapides.", "Diapositive libre : exemple-libre.js");
  const r = await rendu(source, { dossierSource: MOTEUR });
  assert.deepStrictEqual(r.alertes, []);
  const z = gabarit.zoneSousAccroche;
  const poses = cadresDuModule(await r.xml(2));
  assert.ok(poses.length >= 4, JSON.stringify(poses));
  for (const c of poses) {
    assert.ok(c.y >= z.y - 1e-3 && c.y + c.h <= z.y + z.h + 1e-3, `hors de la zone sous l'accroche : ${JSON.stringify(c)}`);
  }
});

test("libre : cds.zone est une copie de la zone du motif, cds porte pres, meta, dossierSource et alerter", async () => {
  const dossier = dossierTemp();
  fs.writeFileSync(path.join(dossier, "zone.js"), `module.exports = (s, cds) => {
      const z = cds.zone;
      s.addText(\`zone \${z.x} \${z.y} \${z.w} \${z.h}\`, { x: z.x, y: z.y, w: 5, h: 0.5 });
      const source = cds.dossierSource === ${JSON.stringify(dossier)} ? "ok" : "autre";
      s.addText(\`meta \${cds.meta.titre} ; source \${source} ; pres \${typeof cds.pres.addSlide}\`, { x: z.x, y: z.y + 1, w: 8, h: 0.5 });
      cds.zone.y = 0;
      cds.alerter("DONNEES_INVALIDES", "alerte du module");
    };`);
  const r = await rendu(md("---", "titre: Essai libre", "---", "# C", "## Zone", "Accroche : Une phrase.", "Diapositive libre : zone.js"), { dossierSource: dossier });
  assert.deepStrictEqual(r.alertes.map((a) => [a.ligne, a.code, a.message]), [[5, "DONNEES_INVALIDES", "alerte du module"]]);
  const z = gabarit.zoneSousAccroche;
  const t = await tout(r);
  assert.ok(t.includes(`zone ${z.x} ${z.y} ${z.w} ${z.h}`), t);
  assert.ok(t.includes("meta Essai libre ; source ok ; pres function"), t);
  assert.strictEqual(z.y, 1.8, "la zone du gabarit n'est pas touchée");
});

test("libre : cds.composer rend un motif du registre dans la zone, nom inconnu alerté", async () => {
  const dossier = dossierTemp({
    "compose.js": `module.exports = (s, cds) => cds.composer("puces", { ...cds.diapo, blocs: [{ texte: "puce composée", niveau: 1, numero: null }] });`,
    "inconnu.js": `module.exports = (s, cds) => cds.composer("rosace", cds.diapo);`,
  });
  const r = await rendu(SOURCE("compose.js"), { dossierSource: dossier });
  assert.deepStrictEqual(r.alertes, []);
  assert.ok((await tout(r)).includes("puce composée"));
  const ko = await rendu(SOURCE("inconnu.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(ko), [[2, "LIBRE_INTROUVABLE"]]);
  assert.match(ko.alertes[0].message, /rosace/);
});

test("libre : cds.composer refuse le motif libre lui-même, sans récursion", { timeout: 10000 }, async () => {
  const dossier = dossierTemp({ "boucle.js": `module.exports = (s, cds) => cds.composer("libre", cds.diapo);` });
  const r = await rendu(SOURCE("boucle.js"), { dossierSource: dossier });
  assert.deepStrictEqual(codes(r), [[2, "LIBRE_INTROUVABLE"]]);
  assert.match(r.alertes[0].message, /composer : motif libre non composable/);
});
