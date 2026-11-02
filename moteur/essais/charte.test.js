// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { resoudreCharte, chargerPptxGenJS, chargerJSZip } = require("../charte.js");
const { dossierTemp } = require("./outils-essai.js");

// Recherche ascendante d'un fichier depuis un dossier de départ.
function remonter(depart, relatif) {
  let d = depart;
  for (;;) {
    const c = path.join(d, relatif);
    if (fs.existsSync(c)) return c;
    const p = path.dirname(d);
    if (p === d) return null;
    d = p;
  }
}

const charteAtelier = remonter(__dirname, path.join("cds-visuels", "charte.js"));
const dossierSkill = process.env.CDS_SKILL || path.join(os.homedir(), ".claude", "skills", "cds-pptx");
const skillPresente = fs.existsSync(path.join(dossierSkill, "assets"));
const scriptLogos = path.join(dossierSkill, "scripts", "logos_b64.py");

test("atelier : la charte est trouvée en remontant", { skip: !charteAtelier }, () => {
  const c = resoudreCharte(__dirname);
  assert.strictEqual(c.origine, "atelier");
  assert.ok(fs.existsSync(c.LOGOS.jaune_blanc));
});

test("skill : repli sur assets/ de la skill", { skip: !skillPresente }, () => {
  const tmp = dossierTemp();
  const c = resoudreCharte(tmp, { dossierSkill });
  assert.strictEqual(c.origine, "skill");
  assert.ok(Math.abs(c.hauteurPour(c.BANDEAUX.jaune_h, 13.33) - 1.71) < 0.01);
});

test("base64 : repli sur les logos embarqués", { skip: !fs.existsSync(scriptLogos) }, () => {
  const tmp = dossierTemp();
  const faux = path.join(tmp, "skill");
  fs.mkdirSync(path.join(faux, "scripts"), { recursive: true });
  fs.copyFileSync(scriptLogos, path.join(faux, "scripts", "logos_b64.py"));
  const src = dossierTemp();
  const c = resoudreCharte(src, { dossierSkill: faux });
  assert.strictEqual(c.origine, "base64");
  assert.ok(c.LOGOS.jaune_blanc.startsWith("data:image/png;base64,"));
  assert.deepStrictEqual(Object.keys(c.BANDEAUX), []);
  assert.ok(Math.abs(c.hauteurPour(c.LOGOS.jaune_blanc, 3.99) - 1) < 0.001);
});

test("vendor : PptxGenJS et JSZip se chargent sans réseau", () => {
  const P = chargerPptxGenJS();
  const p = new P();
  assert.strictEqual(typeof p.addSlide, "function");
  assert.strictEqual(typeof chargerJSZip().loadAsync, "function");
});

test("atelier défaillant : repli signalé par un avertissement", { skip: !fs.existsSync(scriptLogos) }, () => {
  const tmp = dossierTemp();
  fs.mkdirSync(path.join(tmp, "cds-visuels"));
  fs.writeFileSync(path.join(tmp, "cds-visuels", "charte.js"), 'throw new Error("asset manquant");');
  const c = resoudreCharte(tmp, { dossierSkill });
  assert.ok(["skill", "base64"].includes(c.origine));
  assert.ok(c.avertissement && c.avertissement.includes("charte.js") && c.avertissement.includes("asset manquant"));
});
