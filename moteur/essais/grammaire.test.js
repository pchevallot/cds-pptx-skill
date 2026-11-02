// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// La référence de la grammaire (grammaire.md, à côté du moteur) tient ses
// promesses : chaque bloc ```markdown est un deck complet, copiable tel quel.
//
//   - ensemble, les exemples montrent chaque motif, chaque schéma, chaque
//     graphique, la couverture, une section, la clôture et l'en-tête ;
//   - chacun, écrit dans un dossier temporaire, passe `cds-deck.js --plan` (rendu
//     en mémoire, bornes comprises) sans autre alerte que META_MANQUANTE et
//     LOGO_CLIENT_ABSENT (un exemple court n'a pas d'en-tête). DEPENDANCE_ABSENTE
//     n'est admise que pour la fonctionnalité dont l'outil manque : icônes sans
//     react, react-dom, react-icons ou sharp ; radar et carte de chaleur sans
//     CDS_PYTHON ou sans scripts/cds_charts.py dans le dossier de la skill.
// Charte : assets/ de la skill, sinon celle de l'atelier par recherche ascendante ;
// sans l'une ni l'autre, skip.
// Une image, un logo ou un module libre cité par un exemple est copié depuis
// essais/fixtures/ ou le dossier du moteur, à son chemin relatif.
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { analyser } = require("../analyseur.js");
const { MOTIFS } = require("../rendu.js");
const { dossierTemp } = require("./outils-essai.js");

const MOTEUR = path.join(__dirname, "..");
const GRAMMAIRE = path.join(MOTEUR, "..", "grammaire.md");
const CLI = path.join(MOTEUR, "cds-deck.js");
const FIXTURES = path.join(__dirname, "fixtures");
const ADMISES = ["META_MANQUANTE", "LOGO_CLIENT_ABSENT"];

const SKILL = process.env.CDS_SKILL || path.join(os.homedir(), ".claude", "skills", "cds-pptx");
const AVEC_ASSETS = fs.existsSync(path.join(SKILL, "assets"));
// Dossier de skill vu par le moteur : SKILL passé par CDS_SKILL, sinon le parent du moteur.
const DOSSIER_SKILL = AVEC_ASSETS ? SKILL : path.join(MOTEUR, "..");
const AVEC_PYTHON = Boolean(process.env.CDS_PYTHON) && fs.existsSync(path.join(DOSSIER_SKILL, "scripts", "cds_charts.py"));
const AVEC_ICONES = ["react", "react-dom", "react-icons", "sharp"].every((m) => {
  try { require.resolve(m, { paths: [MOTEUR] }); return true; } catch { return false; }
});

function atelier() {
  for (let d = __dirname; ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, "cds-visuels", "charte.js"))) return d;
    if (path.dirname(d) === d) return null;
  }
}
const ATELIER = atelier();
const sansCharte = AVEC_ASSETS || ATELIER ? false : "ni skill installée ni atelier : aucune charte";

// Blocs ```markdown (ou ````markdown, pour un exemple qui contient lui-même un
// bloc de code) : { ligne, texte }, ligne du délimiteur ouvrant dans grammaire.md.
function exemples(texte) {
  const blocs = [];
  const lignes = texte.split("\n");
  for (let i = 0; i < lignes.length; i++) {
    const ouvrant = /^(`{3,})markdown\s*$/.exec(lignes[i]);
    if (!ouvrant) continue;
    const fin = lignes.findIndex((l, j) => j > i && l.trim() === ouvrant[1]);
    assert.ok(fin > 0, `grammaire.md, ligne ${i + 1} : bloc markdown sans délimiteur de fermeture`);
    blocs.push({ ligne: i + 1, texte: lignes.slice(i + 1, fin).join("\n") + "\n" });
    i = fin;
  }
  return blocs;
}

const BLOCS = fs.existsSync(GRAMMAIRE) ? exemples(fs.readFileSync(GRAMMAIRE, "utf8")) : [];

// Le bloc dans un dossier temporaire neuf, avec les fichiers qu'il cite.
function copie(bloc) {
  const doc = analyser(bloc.texte);
  const cites = [doc.meta.logo_client, ...doc.diapos.map((d) => d.image && d.image.chemin),
    ...doc.diapos.map((d) => d.libre && d.libre.chemin)].filter(Boolean);
  const d = dossierTemp({ "deck.md": bloc.texte });
  for (const relatif of cites) {
    const origine = [path.join(FIXTURES, path.basename(relatif)), path.join(MOTEUR, relatif)].find((c) => fs.existsSync(c));
    assert.ok(origine, `grammaire.md, ligne ${bloc.ligne} : « ${relatif} » n'a pas de fixture à copier`);
    const cible = path.join(d, relatif);
    fs.mkdirSync(path.dirname(cible), { recursive: true });
    fs.copyFileSync(origine, cible);
  }
  if (!AVEC_ASSETS && ATELIER) {
    // Pas de skill : la charte de l'atelier, par un relais que la recherche ascendante trouve.
    fs.mkdirSync(path.join(d, "cds-visuels"));
    fs.writeFileSync(path.join(d, "cds-visuels", "charte.js"),
      `module.exports = require(${JSON.stringify(path.join(ATELIER, "cds-visuels", "charte.js"))});\n`);
  }
  return d;
}

function lancer(dossier, ...options) {
  const env = { ...process.env, CDS_SKILL: AVEC_ASSETS ? SKILL : "" };
  const r = spawnSync(process.execPath, [CLI, path.join(dossier, "deck.md"), ...options], { encoding: "utf8", env, timeout: 60000 });
  const sortie = r.stdout + r.stderr;
  const alertes = sortie.split("\n").filter((l) => /^ligne \d+ · [A-Z_]+ · /.test(l))
    .map((l) => { const [, code, ...message] = l.split(" · "); return { code, message: message.join(" · ") }; });
  return { statut: r.status, sortie, alertes };
}

// Admise : alerte d'en-tête, ou dépendance absente pour la seule fonctionnalité dont l'outil manque.
function admise({ code, message }) {
  if (ADMISES.includes(code)) return true;
  if (code !== "DEPENDANCE_ABSENTE") return false;
  if (/radars et cartes de chaleur remplacés/.test(message)) return !AVEC_PYTHON;
  if (/^Icônes non rendues/.test(message)) return !AVEC_ICONES;
  return false;
}

test("grammaire.md montre chaque motif, chaque schéma et chaque graphique", () => {
  assert.ok(BLOCS.length >= 20, `grammaire.md : ${BLOCS.length} exemples, un par directive attendu`);
  const docs = BLOCS.map((b) => analyser(b.texte));
  const diapos = docs.flatMap((d) => d.diapos);
  const contenus = diapos.filter((d) => d.type === "contenu");
  assert.deepStrictEqual(Object.keys(MOTIFS).filter((m) => !contenus.some((d) => d.motif === m)), [], "motifs sans exemple");
  const schemas = new Set(contenus.filter((d) => d.schema).map((d) => d.schema.type));
  assert.deepStrictEqual(["processus", "cycle", "hierarchie", "chronologie", "logigramme"].filter((t) => !schemas.has(t)), [],
    "schémas sans exemple");
  const graphiques = new Set(contenus.filter((d) => d.motif === "graphique").map((d) => d.graphique.type));
  assert.deepStrictEqual(["barres", "courbes", "secteurs"].filter((t) => !graphiques.has(t)), [], "graphiques sans exemple");
  assert.deepStrictEqual(["couverture", "section", "cloture"].filter((t) => !diapos.some((d) => d.type === t)), []);
  assert.ok(docs.some((d) => d.meta.titre && d.meta.logo_client), "aucun exemple d'en-tête complet");
});

test("chaque exemple de grammaire.md passe cds-deck.js --plan sans alerte hors en-tête et outil absent",
  { skip: sansCharte, timeout: 240000 }, () => {
    for (const bloc of BLOCS) {
      const d = copie(bloc);
      const r = lancer(d, "--plan");
      const ou = `grammaire.md, exemple de la ligne ${bloc.ligne}\n${r.sortie}`;
      assert.deepStrictEqual(r.alertes.filter((a) => !admise(a)), [], ou);
      assert.strictEqual(r.statut, r.alertes.length ? 1 : 0, ou);
      assert.ok(fs.existsSync(path.join(d, "deck.pptx.plan.txt")), ou);
      assert.ok(!fs.existsSync(path.join(d, "deck.pptx")), ou);
    }
  });
