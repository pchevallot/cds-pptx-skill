// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Essais de la finalisation du PPTX (sortie.js) et de la ligne de commande (cds-deck.js).
const { test, describe } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { chargerJSZip, resoudreCharte } = require("../charte.js");
const { finaliser, empreinte, peutEcrire } = require("../sortie.js");
const { dossierTemp, rendu } = require("./outils-essai.js");

const BASE = fs.readFileSync(path.join(__dirname, "fixtures", "base.md"), "utf8");
const LIVRABLE = fs.readFileSync(path.join(__dirname, "fixtures", "livrable.md"), "utf8");
const LOGO = fs.readFileSync(path.join(__dirname, "fixtures", "logo-essai.png"));
const CLI = path.join(__dirname, "..", "cds-deck.js");

// Dossier de l'atelier (celui qui porte cds-visuels/), trouvé en remontant ; null sinon.
function atelier() {
  for (let d = __dirname; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "cds-visuels", "charte.js"))) return d;
    if (path.dirname(d) === d) return null;
  }
}
const ATELIER = atelier();
const VERIFIER = ATELIER && path.join(ATELIER, "cds-visuels", "verifier-livrable.py");
const avecAtelier = ATELIER && fs.existsSync(VERIFIER) ? {} : { skip: "atelier introuvable au-dessus de l'essai" };

// Dossier de source dont la recherche ascendante de la charte aboutit à celle de l'atelier.
function dossierSource(fichiers = {}) {
  const d = dossierTemp(fichiers);
  if (ATELIER) {
    fs.mkdirSync(path.join(d, "cds-visuels"));
    fs.writeFileSync(path.join(d, "cds-visuels", "charte.js"),
      `module.exports = require(${JSON.stringify(path.join(ATELIER, "cds-visuels", "charte.js"))});\n`);
  }
  return d;
}

const cli = (args, opts = {}) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8", ...opts });

// Moteur posé dans la skill installée : le dossier de skill par défaut (moteur/..) porte
// une charte, et « charte introuvable » ne peut plus se produire sans --skill ni CDS_SKILL.
const SKILL_PAR_DEFAUT_AVEC_CHARTE = (() => {
  try { resoudreCharte(dossierTemp(), {}); return true; } catch { return false; }
})();
const sansCharteParDefaut = SKILL_PAR_DEFAUT_AVEC_CHARTE ? { skip: "moteur installé dans la skill : sa charte est toujours trouvée" } : {};
const sortieTexte = (r) => r.stdout + r.stderr;

async function lire(buffer) {
  const zip = await chargerJSZip().loadAsync(buffer);
  return { zip, texte: (n) => zip.file(n).async("string") };
}

describe("finaliser", () => {
  test("métadonnées humaines : rien de PptxGenJS, application et gestionnaire posés", async () => {
    const { pres } = await rendu(BASE, {});
    const brut = await pres.write({ outputType: "nodebuffer" });
    const meta = { titre: "Un titre", objet: "Un objet", mots_cles: "a, b", categorie: "Formation",
      commentaires: "Un commentaire", date: "2026-10-29" };
    const { zip, texte } = await lire(await finaliser(brut, meta));
    const core = await texte("docProps/core.xml");
    const app = await texte("docProps/app.xml");
    for (const nom of Object.keys(zip.files).filter((n) => n.startsWith("docProps/") && !zip.files[n].dir)) {
      assert.ok(!/pptxgenjs/i.test(await texte(nom)), `trace de la bibliothèque dans ${nom}`);
    }
    assert.match(core, /<dc:title>Un titre<\/dc:title>/);
    assert.match(core, /<dc:subject>Un objet<\/dc:subject>/);
    assert.match(core, /<dc:creator>Pascal Chevallot ; Comptoir des Signaux<\/dc:creator>/);
    assert.match(core, /<cp:keywords>a, b<\/cp:keywords>/);
    assert.match(core, /<cp:category>Formation<\/cp:category>/);
    assert.match(core, /<dc:description>Un commentaire<\/dc:description>/);
    assert.match(core, /<cp:lastModifiedBy>Pascal Chevallot<\/cp:lastModifiedBy>/);
    assert.match(core, /<dcterms:created xsi:type="dcterms:W3CDTF">2026-10-29T09:00:00Z<\/dcterms:created>/);
    assert.match(core, /<dcterms:modified xsi:type="dcterms:W3CDTF">\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ<\/dcterms:modified>/);
    assert.ok(core.indexOf("<dc:title>") < core.indexOf("<dc:creator>") && core.indexOf("<dc:creator>") < core.indexOf("<cp:lastModifiedBy>"));
    assert.match(app, /<Application>Microsoft Office PowerPoint<\/Application>/);
    assert.match(app, /<Manager>Pascal Chevallot<\/Manager>/);
    assert.match(app, /<Company>Comptoir des Signaux<\/Company>/);
    if (app.includes("<AppVersion>")) assert.ok(app.indexOf("<Manager>") < app.indexOf("<AppVersion>"), "Manager après AppVersion");
    assert.equal((app.match(/<Application>/g) || []).length, 1);
    assert.equal((app.match(/<Manager>/g) || []).length, 1);
  });

  test("le cotraitant s'ajoute à l'auteur", async () => {
    const brut = await (await rendu(BASE, {})).pres.write({ outputType: "nodebuffer" });
    const { texte } = await lire(await finaliser(brut, { cotraitant: "Société Exemple" }));
    assert.match(await texte("docProps/core.xml"), /<dc:creator>Pascal Chevallot ; Comptoir des Signaux ; Société Exemple<\/dc:creator>/);
  });

  test("les caractères XML des valeurs sont échappés", async () => {
    const brut = await (await rendu(BASE, {})).pres.write({ outputType: "nodebuffer" });
    const meta = { titre: 'Eau & énergie <2026> "bilan"', commentaires: "l'un & l'autre", cotraitant: "A&B" };
    const { texte } = await lire(await finaliser(brut, meta));
    const core = await texte("docProps/core.xml");
    assert.match(core, /<dc:title>Eau &amp; énergie &lt;2026&gt; (&quot;|")bilan(&quot;|")<\/dc:title>/);
    assert.match(core, /l('|&apos;)un &amp; l('|&apos;)autre/);
    assert.match(core, /Comptoir des Signaux ; A&amp;B</);
    // Le XML reste lisible : aucune esperluette nue.
    assert.ok(!/&(?!amp;|lt;|gt;|quot;|apos;)/.test(core));
  });

  test("date absente ou invalide : created vaut maintenant moins une heure, jamais vide", async () => {
    const brut = await (await rendu(BASE, {})).pres.write({ outputType: "nodebuffer" });
    for (const date of [undefined, null, "", "pas une date", "2026-13-45"]) {
      const avant = Date.now();
      const { texte } = await lire(await finaliser(brut, { date }));
      const core = await texte("docProps/core.xml");
      const created = /<dcterms:created[^>]*>([^<]+)<\/dcterms:created>/.exec(core);
      assert.ok(created, `created vide pour ${date}`);
      assert.match(created[1], /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
      const ecart = avant - Date.parse(created[1]);
      assert.ok(ecart > 3_590_000 && ecart < 3_620_000, `created attendu à maintenant - 1 h, écart ${ecart} ms (${date})`);
    }
  });

  test("[Content_Types].xml ne garde aucun Override sans partie", async () => {
    const brut = await (await rendu(BASE, {})).pres.write({ outputType: "nodebuffer" });
    const zip = await chargerJSZip().loadAsync(brut);
    const ct = await zip.file("[Content_Types].xml").async("string");
    zip.file("[Content_Types].xml", ct.replace("</Types>",
      '<Override PartName="/ppt/slideMasters/slideMaster9.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/></Types>'));
    const sale = await zip.generateAsync({ type: "nodebuffer" });
    const propre = await lire(await finaliser(sale, {}));
    const apres = await propre.texte("[Content_Types].xml");
    assert.ok(!apres.includes("slideMaster9"));
    const noms = Object.keys(propre.zip.files);
    const overrides = [...apres.matchAll(/<Override\b[^>]*PartName="([^"]+)"/g)].map((m) => m[1]);
    assert.ok(overrides.length > 5, "les Override valides sont conservées");
    for (const p of overrides) assert.ok(noms.includes(p.replace(/^\//, "")), `Override morte : ${p}`);
    // Idempotent.
    const deux = await lire(await finaliser(await finaliser(sale, {}), {}));
    assert.equal(await deux.texte("[Content_Types].xml"), apres);
  });
});

describe("empreinte et peutEcrire", () => {
  test("SHA-256 du contenu", () => {
    const d = dossierTemp({ "a.bin": "abc" });
    assert.equal(empreinte(path.join(d, "a.bin")),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });

  test("fichier absent : on écrit ; présent sans empreinte : seulement avec ecraser", () => {
    const d = dossierTemp({ "x.pptx": "contenu" });
    assert.deepEqual(peutEcrire(path.join(d, "neuf.pptx"), {}), { ok: true });
    const r = peutEcrire(path.join(d, "x.pptx"), {});
    assert.equal(r.ok, false);
    assert.match(r.raison, /ecraser/);
    assert.deepEqual(peutEcrire(path.join(d, "x.pptx"), { ecraser: true }), { ok: true });
  });

  test("empreinte conforme : écrasement permis ; octet modifié : refus, même avec ecraser", () => {
    const d = dossierTemp({ "x.pptx": "contenu" });
    const f = path.join(d, "x.pptx");
    fs.writeFileSync(f + ".empreinte", empreinte(f) + "\n");
    assert.deepEqual(peutEcrire(f, {}), { ok: true });
    fs.writeFileSync(f, "contenu!");
    for (const opts of [{}, { ecraser: true }]) {
      const r = peutEcrire(f, opts);
      assert.equal(r.ok, false);
      assert.match(r.raison, /retouché à la main/);
    }
  });

  test("fichier ~$ présent : refus, même avec ecraser", () => {
    const d = dossierTemp({ "x.pptx": "contenu", "~$x.pptx": "" });
    for (const opts of [{}, { ecraser: true }]) {
      const r = peutEcrire(path.join(d, "x.pptx"), opts);
      assert.equal(r.ok, false);
      assert.match(r.raison, /ouvert/);
    }
    // Verrou de PowerPoint pour un nom long : les deux premiers caractères sont retirés.
    const e = dossierTemp({ "deck.pptx": "c", "~$ck.pptx": "" });
    assert.equal(peutEcrire(path.join(e, "deck.pptx"), { ecraser: true }).ok, false);
    // Même sans fichier de sortie encore écrit.
    const f = dossierTemp({ "~$neuf.pptx": "" });
    assert.equal(peutEcrire(path.join(f, "neuf.pptx"), {}).ok, false);
  });
});

describe("ligne de commande", () => {
  test("alertes, plan, PPTX et empreinte ; code 1 pour la source de base (image absente)", () => {
    const d = dossierSource({ "base.md": BASE });
    const r = cli([path.join(d, "base.md")]);
    assert.equal(r.status, 1, sortieTexte(r));
    assert.match(r.stdout, /ligne \d+ · IMAGE_INTROUVABLE · /);
    assert.match(r.stdout, /1\. couverture : /);
    assert.ok(r.stdout.indexOf("IMAGE_INTROUVABLE") < r.stdout.indexOf("1. couverture"), "alertes avant le plan");
    const pptx = path.join(d, "base.pptx");
    assert.ok(fs.existsSync(pptx));
    assert.equal(fs.readFileSync(pptx + ".empreinte", "utf8").trim(), empreinte(pptx));
    assert.match(fs.readFileSync(pptx + ".plan.txt", "utf8"), /1\. couverture : /);
    assert.equal(r.stderr, "");
  });

  test("alertes triées par ligne puis par code, sans doublon", () => {
    const d = dossierSource({ "base.md": BASE });
    const r = cli([path.join(d, "base.md")]);
    const vues = [...r.stdout.matchAll(/^ligne (\d+) · (\w+) · .*$/gm)];
    assert.ok(vues.length >= 2);
    const cles = vues.map((m) => `${String(m[1]).padStart(6, "0")} ${m[2]}`);
    assert.deepEqual(cles, [...cles].sort());
    assert.equal(new Set(vues.map((m) => m[0])).size, vues.length);
  });

  test("source sans alerte : code 0, aucune ligne d'alerte", () => {
    const d = dossierSource({ "livrable.md": LIVRABLE, "logo-essai.png": LOGO });
    const r = cli([path.join(d, "livrable.md")]);
    assert.equal(r.status, 0, sortieTexte(r));
    assert.ok(!/ligne \d+ · /.test(r.stdout));
    assert.ok(fs.existsSync(path.join(d, "livrable.pptx")));
  });

  test("--sortie, deuxième génération sans retouche écrase, un octet modifié donne le code 3", () => {
    const d = dossierSource({ "base.md": BASE });
    const sortie = path.join(d, "autre.pptx");
    assert.equal(cli([path.join(d, "base.md"), "--sortie", sortie]).status, 1);
    assert.ok(fs.existsSync(sortie));
    assert.ok(!fs.existsSync(path.join(d, "base.pptx")));
    const r2 = cli([path.join(d, "base.md"), "--sortie", sortie]);
    assert.equal(r2.status, 1, sortieTexte(r2));
    const octets = fs.readFileSync(sortie);
    octets[octets.length >> 1] ^= 0xff;
    fs.writeFileSync(sortie, octets);
    const r3 = cli([path.join(d, "base.md"), "--sortie", sortie]);
    assert.equal(r3.status, 3);
    assert.match(sortieTexte(r3), /retouché à la main/);
    assert.deepEqual(fs.readFileSync(sortie), octets, "le fichier retouché n'est pas touché");
    // --ecraser ne passe pas outre une retouche.
    assert.equal(cli([path.join(d, "base.md"), "--sortie", sortie, "--ecraser"]).status, 3);
  });

  test("--ecraser force sans empreinte, jamais par-dessus un fichier ~$", () => {
    const d = dossierSource({ "base.md": BASE, "base.pptx": "autre chose" });
    const r = cli([path.join(d, "base.md")]);
    assert.equal(r.status, 3);
    assert.match(sortieTexte(r), /ecraser/);
    assert.equal(cli([path.join(d, "base.md"), "--ecraser"]).status, 1);
    fs.writeFileSync(path.join(d, "~$base.pptx"), "");
    const v = cli([path.join(d, "base.md"), "--ecraser"]);
    assert.equal(v.status, 3);
    assert.match(sortieTexte(v), /ouvert/);
  });

  test("fichier ~$ présent : code 3", () => {
    const d = dossierSource({ "base.md": BASE, "~$base.pptx": "" });
    const r = cli([path.join(d, "base.md")]);
    assert.equal(r.status, 3);
    assert.ok(!fs.existsSync(path.join(d, "base.pptx")));
  });

  test("--plan n'écrit aucun PPTX, mais rend en mémoire : image absente signalée", () => {
    const d = dossierSource({ "base.md": BASE });
    const r = cli([path.join(d, "base.md"), "--plan"]);
    assert.equal(r.status, 1, sortieTexte(r));
    assert.match(r.stdout, /ligne \d+ · IMAGE_INTROUVABLE · /);
    assert.ok(!/PPTX écrit/.test(r.stdout));
    assert.ok(!fs.existsSync(path.join(d, "base.pptx")));
    assert.ok(!fs.existsSync(path.join(d, "base.pptx.empreinte")));
    assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith(".tmp")), []);
    assert.match(fs.readFileSync(path.join(d, "base.pptx.plan.txt"), "utf8"), /1\. couverture : /);
    assert.match(r.stdout, /2\. section : /);
  });

  test("--plan contrôle les bornes du rendu : cinq cartes, DONNEES_INVALIDES", () => {
    const cartes = ["# Essai", "", "## Cinq cartes", "Cartes :", ..."ABCDE".split("").flatMap((c) => [`### ${c}`, `- ${c}`])].join("\n");
    const d = dossierSource({ "cartes.md": cartes });
    const r = cli([path.join(d, "cartes.md"), "--plan"]);
    assert.equal(r.status, 1, sortieTexte(r));
    assert.match(r.stdout, /ligne 3 · DONNEES_INVALIDES · Cartes : il en faut de 2 à 4/);
    assert.ok(!fs.existsSync(path.join(d, "cartes.pptx")));
  });

  test("--plan sur une retouche : alertes et plan, PPTX retouché intact", () => {
    const d = dossierSource({ "base.md": BASE });
    assert.equal(cli([path.join(d, "base.md")]).status, 1);
    const pptx = path.join(d, "base.pptx");
    fs.appendFileSync(pptx, "retouche");
    const avant = fs.readFileSync(pptx);
    const r = cli([path.join(d, "base.md"), "--plan"]);
    assert.equal(r.status, 1, sortieTexte(r));
    assert.ok(fs.readFileSync(pptx).equals(avant));
  });

  test("source illisible ou absente, option inconnue : code 2", () => {
    const d = dossierSource();
    assert.equal(cli([path.join(d, "absent.md")]).status, 2);
    assert.equal(cli([d]).status, 2);
    assert.equal(cli([]).status, 2);
    fs.writeFileSync(path.join(d, "a.md"), "# T\n");
    assert.equal(cli([path.join(d, "a.md"), "--inconnue"]).status, 2);
  });

  test("charte introuvable (sans --skill, CDS_SKILL vide, hors atelier) : code 2", sansCharteParDefaut, () => {
    const d = dossierTemp({ "base.md": BASE }); // sans cds-visuels, hors atelier
    const r = cli([path.join(d, "base.md")], { env: { ...process.env, CDS_SKILL: "" } });
    assert.equal(r.status, 2, sortieTexte(r));
    assert.match(r.stderr, /Charte CdS introuvable/);
    assert.match(r.stderr, /préciser --skill <dossier de la skill installée> ou CDS_SKILL/);
    assert.ok(!/\n\s+at /.test(r.stderr), "message court, sans pile");
    assert.ok(!fs.existsSync(path.join(d, "base.pptx")));
    // --plan rend aussi : même code 2, et pas de plan écrit.
    const plan = cli([path.join(d, "base.md"), "--plan"], { env: { ...process.env, CDS_SKILL: "" } });
    assert.equal(plan.status, 2, sortieTexte(plan));
    assert.ok(!fs.existsSync(path.join(d, "base.pptx.plan.txt")));
  });

  // Dossier de skill d'essai : seul scripts/logos_b64.py, lu par la charte de repli.
  function skillEssai() {
    const b64 = LOGO.toString("base64");
    const d = dossierTemp();
    fs.mkdirSync(path.join(d, "scripts"));
    fs.writeFileSync(path.join(d, "scripts", "logos_b64.py"),
      `LOGO_BLEU_JAUNE_B64 = "${b64}"\nLOGO_JAUNE_BLANC_B64 = "${b64}"\n`);
    return d;
  }

  test("CDS_SKILL et --skill désignent la charte de repli de la skill (hors atelier)", () => {
    const skill = skillEssai();
    const d = dossierTemp({ "livrable.md": LIVRABLE, "logo-essai.png": LOGO });
    if (!SKILL_PAR_DEFAUT_AVEC_CHARTE) {
      const sansSkill = cli([path.join(d, "livrable.md")], { env: { ...process.env, CDS_SKILL: "" } });
      assert.equal(sansSkill.status, 2, sortieTexte(sansSkill));
    }
    const parEnv = cli([path.join(d, "livrable.md")], { env: { ...process.env, CDS_SKILL: skill } });
    assert.ok([0, 1].includes(parEnv.status), sortieTexte(parEnv));
    assert.ok(fs.existsSync(path.join(d, "livrable.pptx")));
    // --skill l'emporte sur CDS_SKILL (ici un dossier vide qui ferait échouer la charte).
    const vide = dossierTemp();
    const parOption = cli([path.join(d, "livrable.md"), "--skill", skill, "--ecraser"], { env: { ...process.env, CDS_SKILL: vide } });
    assert.ok([0, 1].includes(parOption.status), sortieTexte(parOption));
  });

  test("dossier de sortie absent : créé, avec ou sans --plan ; impossible à créer : code 3, message d'une ligne", () => {
    const d = dossierSource({ "base.md": BASE });
    const sortie = path.join(d, "absent", "sous-dossier", "x.pptx");
    const r = cli([path.join(d, "base.md"), "--sortie", sortie]);
    assert.equal(r.status, 1, sortieTexte(r));
    assert.equal(fs.readFileSync(sortie + ".empreinte", "utf8").trim(), empreinte(sortie));
    const plan = path.join(d, "autre", "y.pptx");
    assert.equal(cli([path.join(d, "base.md"), "--plan", "--sortie", plan]).status, 1);
    assert.ok(fs.existsSync(plan + ".plan.txt") && !fs.existsSync(plan));
    // Le parent demandé est un fichier : le dossier ne peut pas être créé.
    const ko = cli([path.join(d, "base.md"), "--sortie", path.join(d, "base.md", "x.pptx")]);
    assert.equal(ko.status, 3, sortieTexte(ko));
    assert.match(ko.stderr, /Écriture impossible/);
    assert.ok(!/\n\s+at /.test(ko.stderr));
  });

  test("sortie en code 2 (charte introuvable) : le dossier de sortie absent n'est pas créé", () => {
    const d = dossierTemp({ "base.md": BASE }); // sans cds-visuels, hors atelier
    const vide = dossierTemp();
    for (const plan of [[], ["--plan"]]) {
      const sortie = path.join(d, "jamais", "x.pptx");
      const r = cli([path.join(d, "base.md"), "--skill", vide, "--sortie", sortie, ...plan], { env: { ...process.env, CDS_SKILL: "" } });
      assert.equal(r.status, 2, sortieTexte(r));
      assert.ok(!fs.existsSync(path.join(d, "jamais")), `dossier créé malgré le code 2 ${plan}`);
    }
  });

  test(".empreinte qui est un dossier : code 3, et aucun PPTX laissé sans empreinte", () => {
    const d = dossierSource({ "base.md": BASE });
    fs.mkdirSync(path.join(d, "base.pptx.empreinte"));
    const r = cli([path.join(d, "base.md")]);
    assert.equal(r.status, 3, sortieTexte(r));
    assert.ok(!/\n\s+at /.test(r.stderr));
    assert.ok(!fs.existsSync(path.join(d, "base.pptx")), "PPTX écrit sans son empreinte");
    assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith(".tmp")), []);
    fs.writeFileSync(path.join(d, "base.pptx"), "x");
    assert.equal(cli([path.join(d, "base.md"), "--ecraser"]).status, 3);
  });

  test("empreinte impossible à écrire : code 3, l'ancien PPTX et son empreinte restent accordés", () => {
    const d = dossierSource({ "base.md": BASE });
    const pptx = path.join(d, "base.pptx");
    assert.equal(cli([path.join(d, "base.md")]).status, 1);
    const avant = fs.readFileSync(pptx);
    // Empreinte en lecture seule : la garde passe (elle correspond), son écriture échoue.
    fs.chmodSync(pptx + ".empreinte", 0o444);
    fs.appendFileSync(path.join(d, "base.md"), "\n## Une diapositive de plus\n- a\n");
    const r = cli([path.join(d, "base.md")]);
    fs.chmodSync(pptx + ".empreinte", 0o644);
    assert.equal(r.status, 3, sortieTexte(r));
    assert.ok(fs.readFileSync(pptx).equals(avant), "PPTX remplacé malgré l'échec");
    assert.equal(fs.readFileSync(pptx + ".empreinte", "utf8").trim(), empreinte(pptx));
    assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith(".tmp")), []);
  });

  test("sortie qui est un dossier : code 3, aucun .tmp laissé", () => {
    const d = dossierSource({ "base.md": BASE });
    fs.mkdirSync(path.join(d, "base.pptx"));
    const r = cli([path.join(d, "base.md"), "--ecraser"]);
    assert.equal(r.status, 3, sortieTexte(r));
    assert.ok(!fs.existsSync(path.join(d, "base.pptx.tmp")));
    // Le renommage a échoué : l'empreinte écrite juste avant est retirée.
    assert.ok(!fs.existsSync(path.join(d, "base.pptx.empreinte")));
  });

  test("exception imprévue du moteur : code 4, pile sur stderr", () => {
    const d = dossierSource({ "base.md": BASE });
    const r = spawnSync(process.execPath, ["--require", path.join(__dirname, "panne-rendu.js"), CLI, path.join(d, "base.md")], { encoding: "utf8" });
    assert.equal(r.status, 4, sortieTexte(r));
    assert.match(r.stderr, /TypeError: panne simulée du rendu\n\s+at /);
    assert.ok(!fs.existsSync(path.join(d, "base.pptx")));
  });

  test("sortie égale à la source : code 3, même avec --ecraser, source intacte", () => {
    const d = dossierSource({ "base.md": BASE });
    for (const args of [["--sortie", path.join(d, "base.md")], ["--sortie", path.join(d, "base.md"), "--ecraser"], ["--sortie", path.join(d, ".", "base.md"), "--plan"]]) {
      const r = cli([path.join(d, "base.md"), ...args]);
      assert.equal(r.status, 3, sortieTexte(r));
    }
    assert.equal(fs.readFileSync(path.join(d, "base.md"), "utf8"), BASE);
  });

  test("aucun .tmp ne reste après une écriture réussie", () => {
    const d = dossierSource({ "base.md": BASE });
    cli([path.join(d, "base.md")]);
    assert.deepEqual(fs.readdirSync(d).filter((n) => n.endsWith(".tmp")), []);
  });

  test("app.xml : vrais titres de diapositives, Open Sans, compteurs cohérents", async () => {
    const d = dossierSource({ "livrable.md": LIVRABLE, "logo-essai.png": LOGO });
    assert.equal(cli([path.join(d, "livrable.md")]).status, 0);
    const { texte } = await lire(fs.readFileSync(path.join(d, "livrable.pptx")));
    const app = await texte("docProps/app.xml");
    assert.ok(!/Arial|Calibri|Slide \d/.test(app), app);
    const parties = [...app.match(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/)[0].matchAll(/<vt:lpstr>([^<]*)<\/vt:lpstr>/g)].map((m) => m[1]);
    assert.deepEqual(parties, ["Open Sans", "Office Theme", "Un tableau unique des suites", "Pourquoi un tableau unique",
      "Un pilote unique par suite", "Les colonnes qui posent question", "Le parcours d'une suite"].map((t) => t.replace(/'/g, "&apos;")));
    assert.match(app, /<TitlesOfParts><vt:vector size="7"/);
    assert.match(app, /<HeadingPairs><vt:vector size="6"/);
    assert.match(app, /Slide Titles<\/vt:lpstr><\/vt:variant><vt:variant><vt:i4>5<\/vt:i4>/);
    assert.ok(!app.includes(" // "));
  });

  test("titre à coupure « // » : lu comme une espace dans app.xml", async () => {
    const brut = await (await rendu(BASE, {})).pres.write({ outputType: "nodebuffer" });
    const { texte } = await lire(await finaliser(brut, {}, { titres: ["Un titre // coupé", "**Gras** et A & B"] }));
    const app = await texte("docProps/app.xml");
    assert.match(app, /<vt:lpstr>Un titre coupé<\/vt:lpstr><vt:lpstr>Gras et A &amp; B<\/vt:lpstr>/);
  });

  test("le livrable passe verifier-livrable.py (D5)", avecAtelier, () => {
    const d = dossierSource({ "livrable.md": LIVRABLE, "logo-essai.png": LOGO });
    const r = cli([path.join(d, "livrable.md")]);
    assert.equal(r.status, 0, sortieTexte(r));
    const v = spawnSync("python3", [VERIFIER, "--sans-liens", path.join(d, "livrable.pptx")], { encoding: "utf8" });
    assert.equal(v.status, 0, v.stdout + v.stderr);
  });
});
