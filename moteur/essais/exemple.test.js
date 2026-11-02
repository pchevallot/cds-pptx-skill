// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// L'exemple complet (exemple.md), que la skill publie comme modèle : il exerce
// chaque motif et chaque type de schéma, et sort sans alerte.
//
// La génération passe par cds-deck.js, dans une copie temporaire de l'exemple
// et des fichiers qu'il cite (logo client, image, module libre) : rien n'est
// écrit dans le dossier du moteur.
//   - CDS_PYTHON défini et skill trouvée (CDS_SKILL, sinon ~/.claude/skills/cds-pptx,
//     avec scripts/cds_charts.py) : code 0, aucune alerte ;
//   - sinon : seules des alertes DEPENDANCE_ABSENTE sont admises (radar, carte de
//     chaleur ou icônes sans leur outil), code 1 s'il y en a, 0 sinon.
// Charte : assets/ de la skill quand elle est là ; à défaut, celle de l'atelier
// trouvée en remontant depuis l'essai ; sans l'une ni l'autre, skip.
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { analyser } = require("../analyseur.js");
const { chargerJSZip } = require("../charte.js");
const { dossierTemp } = require("./outils-essai.js");

const MOTEUR = path.join(__dirname, "..");
const EXEMPLE = path.join(MOTEUR, "exemple.md");
const CLI = path.join(MOTEUR, "cds-deck.js");
const SKILL = process.env.CDS_SKILL || path.join(os.homedir(), ".claude", "skills", "cds-pptx");
const AVEC_ASSETS = fs.existsSync(path.join(SKILL, "assets"));
const AVEC_SCRIPTS = fs.existsSync(path.join(SKILL, "scripts", "cds_charts.py"));
const COMPLET = Boolean(process.env.CDS_PYTHON) && AVEC_ASSETS && AVEC_SCRIPTS;

function atelier() {
  for (let d = __dirname; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "cds-visuels", "charte.js"))) return d;
    if (path.dirname(d) === d) return null;
  }
}
const ATELIER = atelier();
const sansCharte = AVEC_ASSETS || ATELIER ? false : "ni skill installée ni atelier : aucune charte";

const MOTIFS = ["puces", "deux-colonnes", "tableau", "schema", "image", "cartes", "blocs", "chiffres",
  "graphique", "radar", "chaleur", "icones", "citation", "prompt", "decodage", "libre"];

// Titres « # » et « ## » de la source, lus sans l'analyseur : hors en-tête et hors bloc de code.
function titresSource(texte) {
  const lignes = texte.split("\n");
  let i = 0;
  if (lignes[0].trim() === "---") {
    i = lignes.findIndex((l, j) => j > 0 && l.trim() === "---") + 1;
  }
  let enCode = false;
  let n = 0;
  for (; i < lignes.length; i++) {
    const l = lignes[i].trim();
    if (/^(```|~~~)/.test(l)) { enCode = !enCode; continue; }
    if (!enCode && /^#{1,2}\s/.test(l)) n++;
  }
  return n;
}

// Copie de l'exemple et des fichiers qu'il cite, chemins relatifs gardés.
function copieExemple() {
  const texte = fs.readFileSync(EXEMPLE, "utf8");
  const doc = analyser(texte);
  const cites = [doc.meta.logo_client, ...doc.diapos.map((d) => d.image && d.image.chemin),
    ...doc.diapos.map((d) => d.libre && d.libre.chemin)].filter(Boolean);
  const d = dossierTemp({ "exemple.md": texte });
  for (const relatif of cites) {
    const cible = path.join(d, relatif);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.copyFileSync(path.join(MOTEUR, relatif), cible);
  }
  if (!AVEC_ASSETS) {
    // Pas de skill : la charte de l'atelier, par un relais que la recherche ascendante trouve.
    fs.mkdirSync(path.join(d, "cds-visuels"));
    fs.writeFileSync(path.join(d, "cds-visuels", "charte.js"),
      `module.exports = require(${JSON.stringify(path.join(ATELIER, "cds-visuels", "charte.js"))});\n`);
  }
  return d;
}

test("exemple.md exerce chaque motif, chaque schéma, couverture, sections et clôture", () => {
  const doc = analyser(fs.readFileSync(EXEMPLE, "utf8"));
  const contenus = doc.diapos.filter((d) => d.type === "contenu");
  assert.deepStrictEqual(MOTIFS.filter((m) => !contenus.some((d) => d.motif === m)), [], "motifs absents");
  const schemas = new Set(contenus.filter((d) => d.schema).map((d) => d.schema.type));
  assert.deepStrictEqual(["processus", "cycle", "hierarchie", "chronologie", "logigramme"].filter((t) => !schemas.has(t)), [],
    "types de schéma absents");
  const graphiques = new Set(contenus.filter((d) => d.motif === "graphique").map((d) => d.graphique.type));
  assert.deepStrictEqual(["barres", "courbes", "secteurs"].filter((t) => !graphiques.has(t)), [], "graphiques absents");
  assert.deepStrictEqual(["couverture", "section", "cloture"].filter((t) => !doc.diapos.some((d) => d.type === t)), []);
  assert.ok(contenus.some((d) => d.pied && d.source), "aucune diapositive avec Pied : et Source :");
  assert.ok(contenus.some((d) => d.motif === "cartes" && d.couleurs), "aucunes cartes en couleurs de signal");
  assert.ok(contenus.some((d) => d.motif === "cartes" && !d.couleurs), "aucunes cartes en rotation par défaut");
  assert.ok(contenus.some((d) => d.motif === "libre" && d.accroche), "aucune diapositive libre sous une accroche");
  for (const cle of ["titre", "objet", "mots_cles", "categorie", "commentaires", "client", "date", "logo_client"]) {
    assert.ok(doc.meta[cle], `en-tête sans ${cle}`);
  }
  assert.deepStrictEqual(doc.alertes, []);
});

test("cds-deck.js exemple.md : autant de diapositives que de titres # et ##, sans alerte hors dépendance",
  { skip: sansCharte, timeout: 240000 }, async () => {
    const d = copieExemple();
    const env = { ...process.env, CDS_SKILL: AVEC_ASSETS ? SKILL : "" };
    const r = spawnSync(process.execPath, [CLI, path.join(d, "exemple.md")], { encoding: "utf8", env, timeout: 230000 });
    const sortie = r.stdout + r.stderr;
    const alertes = sortie.split("\n").filter((l) => /^ligne \d+ · [A-Z_]+ · /.test(l));
    const codes = alertes.map((l) => l.split(" · ")[1]);

    if (COMPLET) {
      assert.deepStrictEqual(alertes, [], sortie);
      assert.strictEqual(r.status, 0, sortie);
    } else {
      assert.deepStrictEqual(codes.filter((c) => c !== "DEPENDANCE_ABSENTE"), [], sortie);
      assert.strictEqual(r.status, alertes.length ? 1 : 0, sortie);
    }

    const zip = await chargerJSZip().loadAsync(fs.readFileSync(path.join(d, "exemple.pptx")));
    const diapos = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
    const attendu = titresSource(fs.readFileSync(EXEMPLE, "utf8"));
    assert.ok(attendu >= 29, `exemple trop court : ${attendu} titres`);
    assert.strictEqual(diapos.length, attendu);
  });
