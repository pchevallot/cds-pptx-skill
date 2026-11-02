// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motifs à dépendance extérieure : radar et carte de chaleur (Python, matplotlib,
// cds_charts.py de la skill), grille d'icônes (react-icons, react-dom, sharp).
//
// Trois sortes d'essais :
//   - un faux Python (script shell écrit ici) qui note ses arguments et son
//     entrée, puis copie un PNG préparé ou échoue : le côté Node est vérifié sans
//     matplotlib (en skip sous Windows) ;
//   - le vrai Python : CDS_PYTHON (D5), skip s'il n'est pas défini ou si la skill
//     (CDS_SKILL, sinon ~/.claude/skills/cds-pptx) n'a pas scripts/cds_charts.py ;
//   - les icônes : skip si react, react-dom, react-icons ou sharp manque.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const gabarit = require("../gabarit.js");
const { MOTIFS } = require("../rendu.js");
const externes = require("../motifs/externes.js");
const outils = require("./outils-essai.js");

const { md, png, uri, charteEssai, dossierTemp, textes, compte, cadres, dansLesMarges, medias, dimensionsPng } = outils;

const PYTHON_REEL = process.env.CDS_PYTHON;
const SKILL = process.env.CDS_SKILL || path.join(os.homedir(), ".claude", "skills", "cds-pptx");
const skillAvecCharts = fs.existsSync(path.join(SKILL, "scripts", "cds_charts.py"));
const sansSh = process.platform === "win32";

function presents(...noms) {
  try { noms.forEach((n) => require(n)); return true; } catch { return false; }
}
const paquetsIcones = presents("react", "react-dom/server", "react-icons/fa", "react-icons/md", "react-icons/lu", "sharp");

// Lance fn avec CDS_PYTHON fixé, puis rétablit la valeur d'origine.
async function avecPython(valeur, fn) {
  const avant = process.env.CDS_PYTHON;
  if (valeur === undefined) delete process.env.CDS_PYTHON;
  else process.env.CDS_PYTHON = valeur;
  try { return await fn(); } finally {
    if (avant === undefined) delete process.env.CDS_PYTHON;
    else process.env.CDS_PYTHON = avant;
  }
}

// Skill d'essai : un scripts/cds_charts.py vide (le faux Python ne le lit pas).
const skillEssai = () => {
  const d = dossierTemp();
  fs.mkdirSync(path.join(d, "scripts"));
  fs.writeFileSync(path.join(d, "scripts", "cds_charts.py"), "");
  return d;
};

// Faux Python : compte ses appels, note chaque argument (arg1, arg2…) et
// l'entrée dans `journal`, puis copie `pngSortie` vers le dernier argument
// (chemin du PNG attendu). Si `pngSortie` est null, il écrit `erreur` sur la
// sortie d'erreur et sort en code 1 ; avec `attente` (secondes), il dort.
function fauxPython(pngSortie, { erreur = "ModuleNotFoundError: No module named 'matplotlib'", attente = 0 } = {}) {
  const journal = dossierTemp();
  const script = path.join(journal, "python");
  const source = pngSortie ? path.join(journal, "sortie.png") : null;
  if (source) fs.writeFileSync(source, pngSortie);
  fs.writeFileSync(path.join(journal, "erreur"), `Traceback (most recent call last):\n${erreur}\n`);
  let fin = `cat "$J/erreur" >&2; exit 1`;
  if (source) fin = `cp '${source}' "$dernier"`;
  if (attente) fin = `exec sleep ${attente}`;
  fs.writeFileSync(script, [
    "#!/bin/sh",
    `J='${journal}'`,
    'echo appel >> "$J/appels"',
    "i=0",
    'for a in "$@"; do i=$((i+1)); printf "%s" "$a" > "$J/arg$i"; dernier="$a"; done',
    'cat > "$J/stdin"',
    fin,
    "",
  ].join("\n"));
  fs.chmodSync(script, 0o755);
  const lire = (nom) => fs.readFileSync(path.join(journal, nom), "utf8");
  const args = () => fs.readdirSync(journal).filter((n) => /^arg\d+$/.test(n))
    .sort((a, b) => a.slice(3) - b.slice(3)).map(lire);
  const appels = () => (fs.existsSync(path.join(journal, "appels")) ? lire("appels").trim().split("\n").length : 0);
  return { script, args, appels, entree: () => JSON.parse(lire("stdin")) };
}

// Lance fn avec la variable d'environnement `nom` fixée, puis la rétablit.
async function avecEnv(nom, valeur, fn) {
  const avant = process.env[nom];
  process.env[nom] = valeur;
  try { return await fn(); } finally {
    if (avant === undefined) delete process.env[nom];
    else process.env[nom] = avant;
  }
}

const RADAR = ["| Dimension | 2025 | 2026 |", "|---|---|---|",
  "| Gouvernance | 2 | 3 |", "| Données | 1 | 4 |", "| Outils | 3 | 3 |", "| Compétences | 2 | 4 |", "| Usages | 1 | 2 |"];
const CHALEUR = ["| Métier | Rédaction | Analyse | Recherche |", "|---|---|---|---|",
  "| Accueil | 3 | 1 | 2 |", "| Finances | 2 | 8 | 4 |"];

// L'image tracée par Python : le plus gros fichier de ppt/media (les autres sont le logo d'essai).
const plusGrandMedia = async (zip) => (await medias(zip)).sort((a, b) => b.octets.length - a.octets.length)[0];
const pics = (xml) => [...xml.matchAll(/<p:pic>.*?<\/p:pic>/gs)].map((m) => cadres(m[0])[0]);
const proche = (a, b, e = 1e-3) => Math.abs(a - b) <= e;
const lesCodes = (r) => r.alertes.map((a) => a.code);

test("registre : radar, chaleur et icones sont inscrits", () => {
  for (const m of ["radar", "chaleur", "icones"]) assert.strictEqual(typeof MOTIFS[m], "function", m);
});

// ---------------------------------------------------------------------------
// Échelle de la carte de chaleur
// ---------------------------------------------------------------------------

test("échelle : 0-10 quand toutes les valeurs y tiennent, sinon min-max des données", () => {
  assert.deepStrictEqual(externes.echelle([[1, null], [8, 10]]), { vmin: 0, vmax: 10 });
  assert.deepStrictEqual(externes.echelle([[0, 0.5]]), { vmin: 0, vmax: 10 });
  assert.deepStrictEqual(externes.echelle([[3, 25], [null, 12]]), { vmin: 3, vmax: 25 });
  assert.deepStrictEqual(externes.echelle([[-2, 3]]), { vmin: -2, vmax: 3 });
});

// ---------------------------------------------------------------------------
// Radar et chaleur, côté Node (faux Python)
// ---------------------------------------------------------------------------

test("radar (faux Python) : image carrée embarquée, arguments et données hors du -c", { skip: sansSh }, async () => {
  const faux = fauxPython(png(300, 300));
  const r = await avecPython(faux.script, () => outils.rendu(md("# R", "## Maturité", "Radar :", ...RADAR), { dossierSkill: skillEssai() }));
  const xml = await r.xml(2);
  assert.deepStrictEqual(lesCodes(r), []);
  const [p] = pics(xml);
  assert.ok(proche(p.w, p.h), `carré : ${JSON.stringify(p)}`);
  const z = gabarit.zoneContenu;
  assert.ok(proche(p.w, Math.min(z.w, z.h)), `côté : ${p.w}`);
  dansLesMarges(xml);
  assert.ok((await medias(r.zip)).some((m) => m.octets.equals(png(300, 300))), "le PNG de Python est embarqué tel quel");

  const args = faux.args();
  assert.strictEqual(args.length, 6);
  assert.deepStrictEqual(args.slice(0, 3), ["-E", "-B", "-c"]);
  assert.strictEqual(args[3], externes.SCRIPT_PYTHON, "le -c est la chaîne constante");
  assert.ok(!/Gouvernance|Compétences|2025/.test(args[3]), "aucune donnée dans le -c");
  assert.strictEqual(path.basename(args[4]), "scripts");
  assert.strictEqual(path.extname(args[5]), ".png");
  assert.ok(!fs.existsSync(path.dirname(args[5])), "dossier temporaire supprimé");
  assert.deepStrictEqual(faux.entree(), {
    type: "radar",
    categories: ["Gouvernance", "Données", "Outils", "Compétences", "Usages"],
    series: [{ nom: "2025", valeurs: [2, 1, 3, 2, 1] }, { nom: "2026", valeurs: [3, 4, 3, 4, 2] }],
    cote_pouces: Math.min(z.w, z.h),
  });
});

test("dossierSkill relatif : résolu en absolu avant l'appel à Python", { skip: sansSh }, async () => {
  const faux = fauxPython(png(300, 300));
  const relatif = path.relative(process.cwd(), skillEssai());
  assert.ok(!path.isAbsolute(relatif));
  const r = await avecPython(faux.script, () => outils.rendu(md("# R", "## Maturité", "Radar :", ...RADAR), { dossierSkill: relatif }));
  assert.deepStrictEqual(lesCodes(r), []);
  const scripts = faux.args()[4];
  assert.ok(path.isAbsolute(scripts), scripts);
  assert.strictEqual(scripts, path.resolve(relatif, "scripts"));
});

test("radar avec accroche : le carré tient sous l'accroche", { skip: sansSh }, async () => {
  const faux = fauxPython(png(300, 300));
  const r = await avecPython(faux.script, () => outils.rendu(
    md("# R", "## Maturité", "Accroche : Deux années comparées", "Radar :", ...RADAR), { dossierSkill: skillEssai() }));
  const [p] = pics(await r.xml(2));
  const z = gabarit.zoneSousAccroche;
  assert.ok(proche(p.w, p.h) && proche(p.h, Math.min(z.w, z.h)), JSON.stringify(p));
  assert.ok(p.y >= z.y - 1e-3);
});

test("radar : une série qui contient une cellule vide est retirée et nommée", { skip: sansSh }, async () => {
  const faux = fauxPython(png(300, 300));
  const tableau = [...RADAR.slice(0, 3), "| Outils | 3 | n/a |", ...RADAR.slice(5)];
  const r = await avecPython(faux.script, () => outils.rendu(md("# R", "## Maturité", "Radar :", ...tableau), { dossierSkill: skillEssai() }));
  const invalides = r.alertes.filter((a) => a.code === "DONNEES_INVALIDES");
  assert.strictEqual(invalides.length, 1);
  assert.match(invalides[0].message, /« 2026 »/);
  assert.strictEqual(invalides[0].ligne, 2);
  assert.deepStrictEqual(faux.entree().series.map((s) => s.nom), ["2025"]);
  assert.strictEqual(compte(await r.xml(2), /<p:pic>/g), 1);
});

test("radar : moins de 3 dimensions ou plus aucune série, réserve sans appel à Python", { skip: sansSh }, async () => {
  const deux = ["| Dimension | 2025 |", "|---|---|", "| A | 1 |", "| B | 2 |"];
  const vides = ["| Dimension | 2025 |", "|---|---|", "| A | x |", "| B | 2 |", "| C | 3 |"];
  for (const tableau of [deux, vides]) {
    const faux = fauxPython(png(300, 300));
    const r = await avecPython(faux.script, () => outils.rendu(md("# R", "## Maturité", "Radar :", ...tableau), { dossierSkill: skillEssai() }));
    const xml = await r.xml(2);
    assert.ok(lesCodes(r).includes("DONNEES_INVALIDES"), JSON.stringify(r.alertes));
    assert.ok(!lesCodes(r).includes("DEPENDANCE_ABSENTE"));
    assert.strictEqual(compte(xml, /<p:pic>/g), 0);
    assert.ok(textes(xml).some((t) => /Radar/.test(t)), textes(xml).join("|"));
    assert.deepStrictEqual(faux.args(), [], "Python n'est pas appelé");
  }
});

test("chaleur (faux Python) : tableau repris tel quel, case vide à null, ratio de l'image gardé", { skip: sansSh }, async () => {
  const faux = fauxPython(png(400, 200));
  const tableau = [...CHALEUR.slice(0, 3), "| Finances | 2 | ? | 4 |"];
  const r = await avecPython(faux.script, () => outils.rendu(md("# C", "## Exposition", "Carte de chaleur :", ...tableau), { dossierSkill: skillEssai() }));
  assert.deepStrictEqual(lesCodes(r), [], "la cellule illisible est alertée par l'analyseur, pas par le rendu");
  assert.deepStrictEqual(faux.entree(), {
    type: "chaleur",
    lignes: ["Accueil", "Finances"],
    colonnes: ["Rédaction", "Analyse", "Recherche"],
    valeurs: [[3, 1, 2], [2, null, 4]],
    vmin: 0, vmax: 10,
  });
  const xml = await r.xml(2);
  const [p] = pics(xml);
  const z = gabarit.zoneContenu;
  assert.ok(proche(p.w / p.h, 2), JSON.stringify(p));
  assert.ok(proche(p.h, z.h) && p.w <= z.w + 1e-3, JSON.stringify(p));
  dansLesMarges(xml);
});

test("chaleur : valeurs hors de 0-10, échelle min-max transmise", { skip: sansSh }, async () => {
  const faux = fauxPython(png(400, 200));
  const tableau = ["| Poste | 2025 | 2026 |", "|---|---|---|", "| Eau | 12 | 40 |", "| Air | 25 | 31 |"];
  await avecPython(faux.script, () => outils.rendu(md("# C", "## Coûts", "Carte de chaleur :", ...tableau), { dossierSkill: skillEssai() }));
  const { vmin, vmax } = faux.entree();
  assert.deepStrictEqual({ vmin, vmax }, { vmin: 12, vmax: 40 });
});

test("chaleur : aucune valeur lisible, réserve sans appel à Python", { skip: sansSh }, async () => {
  const faux = fauxPython(png(400, 200));
  const tableau = ["| Poste | 2025 |", "|---|---|", "| Eau | x |"];
  const r = await avecPython(faux.script, () => outils.rendu(md("# C", "## Coûts", "Carte de chaleur :", ...tableau), { dossierSkill: skillEssai() }));
  assert.strictEqual(compte(await r.xml(2), /<p:pic>/g), 0);
  assert.deepStrictEqual(faux.args(), []);
});

// ---------------------------------------------------------------------------
// Dégradation : Python absent ou en échec, cds_charts.py introuvable
// ---------------------------------------------------------------------------

test("CDS_PYTHON=/bin/false : DEPENDANCE_ABSENTE une fois par deck, réserves, deck généré", { skip: sansSh }, async () => {
  const source = md("# R", "## Un", "Radar :", ...RADAR, "## Deux", "Radar :", ...RADAR, "## Trois", "Carte de chaleur :", ...CHALEUR);
  const r = await avecPython("/bin/false", () => outils.rendu(source, { dossierSkill: skillEssai() }));
  const absentes = r.alertes.filter((a) => a.code === "DEPENDANCE_ABSENTE");
  assert.strictEqual(absentes.length, 1, JSON.stringify(r.alertes));
  assert.strictEqual(absentes[0].ligne, 2);
  assert.match(absentes[0].message, /\/bin\/false/);
  assert.strictEqual(r.noms.length, 4, "le deck est écrit");
  for (const n of [2, 3, 4]) {
    const xml = await r.xml(n);
    assert.strictEqual(compte(xml, /<p:pic>/g), 0);
    assert.ok(textes(xml).some((t) => /non disponible/.test(t)), textes(xml).join("|"));
  }
});

test("matplotlib absent : conseil d'installation, dossier temporaire supprimé", { skip: sansSh }, async () => {
  const faux = fauxPython(null);
  const r = await avecPython(faux.script, () => outils.rendu(md("# R", "## Un", "Radar :", ...RADAR), { dossierSkill: skillEssai() }));
  const [a] = r.alertes.filter((x) => x.code === "DEPENDANCE_ABSENTE");
  assert.match(a.message, /n'a pas le module matplotlib : installer matplotlib et numpy/);
  assert.ok(!fs.existsSync(path.dirname(faux.args()[5])));
});

test("échec de Python : un message propre à chaque cause, sans conseil d'installation hors module manquant", { skip: sansSh }, async () => {
  const cas = [
    [{ erreur: "KeyError: 'type'" }, /a échoué en traçant le radar : KeyError: 'type'/],
    [{ erreur: "ModuleNotFoundError: No module named 'cds_charts'" }, /n'a pas pu importer cds_charts/],
    [{ erreur: "ModuleNotFoundError: No module named 'numpy'" }, /n'a pas le module numpy : installer matplotlib et numpy/],
    [{ erreur: "ModuleNotFoundError: No module named 'PIL'" }, /a échoué en traçant le radar : ModuleNotFoundError: No module named 'PIL'/],
  ];
  for (const [options, attendu] of cas) {
    const faux = fauxPython(null, options);
    const r = await avecPython(faux.script, () => outils.rendu(md("# R", "## Un", "Radar :", ...RADAR), { dossierSkill: skillEssai() }));
    const [a] = r.alertes.filter((x) => x.code === "DEPENDANCE_ABSENTE");
    assert.match(a.message, attendu);
    if (!/numpy/.test(options.erreur)) assert.doesNotMatch(a.message, /installer matplotlib/i, a.message);
  }
  const r = await avecPython("/bin/false", () => outils.rendu(md("# R", "## Un", "Radar :", ...RADAR), { dossierSkill: skillEssai() }));
  assert.match(r.alertes[0].message, /code de sortie 1/);
  assert.doesNotMatch(r.alertes[0].message, /installer matplotlib/i);
});

test("Python trop lent : un seul appel, l'échec est gardé pour les visuels suivants", { skip: sansSh }, async () => {
  const faux = fauxPython(null, { attente: 5 });
  const delai = externes.reglages.delaiPython;
  externes.reglages.delaiPython = 300;
  try {
    const source = md("# R", "## Un", "Radar :", ...RADAR, "## Deux", "Radar :", ...RADAR, "## Trois", "Carte de chaleur :", ...CHALEUR);
    const r = await avecPython(faux.script, () => outils.rendu(source, { dossierSkill: skillEssai() }));
    assert.strictEqual(faux.appels(), 1);
    assert.deepStrictEqual(lesCodes(r), ["DEPENDANCE_ABSENTE"]);
    assert.match(r.alertes[0].message, /en 0\.3 s, appel interrompu/);
    assert.doesNotMatch(r.alertes[0].message, /installer matplotlib/i);
    for (const n of [2, 3, 4]) assert.ok(textes(await r.xml(n)).some((t) => /non disponible/.test(t)));
  } finally {
    externes.reglages.delaiPython = delai;
  }
});

test("dossier temporaire impossible : DEPENDANCE_ABSENTE et réserve, sans exception", { skip: sansSh }, async () => {
  const faux = fauxPython(png(300, 300));
  const absent = path.join(dossierTemp(), "absent");
  const r = await avecPython(faux.script, () => avecEnv("TMPDIR", absent,
    () => outils.rendu(md("# R", "## Un", "Radar :", ...RADAR), { dossierSkill: skillEssai() })));
  assert.deepStrictEqual(lesCodes(r), ["DEPENDANCE_ABSENTE"]);
  assert.match(r.alertes[0].message, /Dossier temporaire impossible/);
  assert.strictEqual(faux.appels(), 0);
  assert.ok(textes(await r.xml(2)).some((t) => /non disponible/.test(t)));
});

test("Python introuvable : DEPENDANCE_ABSENTE et réserve", async () => {
  const absent = path.join(dossierTemp(), "pas-de-python");
  const r = await avecPython(absent, () => outils.rendu(md("# R", "## Un", "Radar :", ...RADAR, "## Deux", "Radar :", ...RADAR), { dossierSkill: skillEssai() }));
  assert.deepStrictEqual(lesCodes(r), ["DEPENDANCE_ABSENTE"]);
  assert.match(r.alertes[0].message, /Python introuvable/);
  assert.doesNotMatch(r.alertes[0].message, /installer matplotlib/i);
  for (const n of [2, 3]) assert.strictEqual(compte(await r.xml(n), /<p:pic>/g), 0);
});

test("cds_charts.py absent de la skill : DEPENDANCE_ABSENTE et réserve", async () => {
  const r = await avecPython("/bin/false", () => outils.rendu(
    md("# R", "## Un", "Radar :", ...RADAR, "## Deux", "Carte de chaleur :", ...CHALEUR), { dossierSkill: dossierTemp() }));
  assert.deepStrictEqual(lesCodes(r), ["DEPENDANCE_ABSENTE"]);
  assert.match(r.alertes[0].message, /cds_charts\.py/);
  for (const n of [2, 3]) assert.ok(textes(await r.xml(n)).some((t) => /non disponible/.test(t)));
});

// ---------------------------------------------------------------------------
// Radar et chaleur avec le vrai Python (D5)
// ---------------------------------------------------------------------------

const sansPythonReel = !PYTHON_REEL || !skillAvecCharts;

test("radar réel : 5 dimensions et 2 séries donnent un PNG carré, libellés à guillemets compris", { skip: sansPythonReel }, async () => {
  const tableau = ["| Dimension | Année « 2025 » | L'an \"2026\" |", "|---|---|---|",
    "| Gouvernance | 2 | 3 |", "| Données d'usage | 1 | 4 |", "| Outils ; scripts | 3 | 3 |", "| Compétences | 2,5 | 4 |", "| Usages \\ cas | 1 | 2 |"];
  const r = await avecPython(PYTHON_REEL, () => outils.rendu(md("# R", "## Maturité", "Radar :", ...tableau), { dossierSkill: SKILL }));
  assert.deepStrictEqual(lesCodes(r), [], JSON.stringify(r.alertes));
  const xml = await r.xml(2);
  const [p] = pics(xml);
  assert.ok(proche(p.w, p.h), JSON.stringify(p));
  dansLesMarges(xml);
  const media = await plusGrandMedia(r.zip);
  const dims = dimensionsPng(media.octets);
  assert.ok(media.octets.length > 1024, `${media.octets.length} octets`);
  assert.strictEqual(dims.largeur, dims.hauteur, "PNG complété en carré");
});

// Lance le script constant avec le vrai Python ; rend ce qu'il a réglé (JSON de sa sortie).
function scriptReel(donnees) {
  const sortie = path.join(dossierTemp(), `${donnees.type}.png`);
  const stdout = execFileSync(path.resolve(PYTHON_REEL), ["-E", "-B", "-c", externes.SCRIPT_PYTHON, path.join(SKILL, "scripts"), sortie],
    { input: JSON.stringify(donnees), stdio: ["pipe", "pipe", "pipe"] });
  assert.ok(dimensionsPng(fs.readFileSync(sortie)));
  return JSON.parse(String(stdout));
}

test("script Python réel, chaleur : case vide sans « nan », dégradé monotone, décimales françaises, texte à 4,5:1", { skip: sansPythonReel }, () => {
  // Toute l'échelle, pour que chaque teinte du dégradé porte un texte.
  const regle = scriptReel({
    type: "chaleur", lignes: ["A", "B"], colonnes: ["1", "2", "3", "4", "5", "6"],
    valeurs: [[0, 1, 2, 3.5, 4, 5], [6, 7, 8, 9, 10, null]], vmin: 0, vmax: 10,
  });
  assert.strictEqual(regle.nan_retires, 1);
  assert.strictEqual(regle.cmap, "cds_bleu");
  assert.deepStrictEqual(regle.textes_cases, ["0", "1", "2", "3,5", "4", "5", "6", "7", "8", "9", "10"]);
  assert.ok(regle.contraste_min >= 4.5, `contraste ${regle.contraste_min}`);
  assert.deepStrictEqual(regle.contours, ["#777777"]);
  // Règle unique : entre blanc et 333333, le plus contrasté ; le noir seulement si aucun n'atteint 4,5:1.
  for (const { couleur, blanc, fonce } of regle.choix_cases) {
    const attendu = Math.max(blanc, fonce) >= 4.5 ? (blanc >= fonce ? "#FFFFFF" : "#333333") : "#000000";
    assert.strictEqual(couleur, attendu, JSON.stringify({ couleur, blanc, fonce }));
  }
  assert.strictEqual(regle.rotation_colonnes, 0, "libellés courts : à plat");
});

test("script Python réel, chaleur : libellés de colonnes trop larges pour leur colonne, à 45°", { skip: sansPythonReel }, () => {
  const regle = scriptReel({
    type: "chaleur", lignes: ["A", "B"], colonnes: ["Rédaction de courriers longs", "Synthèse de documents nombreux"],
    valeurs: [[1, 2], [3, 4]], vmin: 0, vmax: 10,
  });
  assert.strictEqual(regle.rotation_colonnes, 45);
});

test("script Python réel, radar : textes à 11 pt au moins une fois posés, graduations françaises, cercle gris, légende dessous", { skip: sansPythonReel }, () => {
  const regle = scriptReel({
    type: "radar", categories: ["Gouvernance", "Données", "Compétences", "Outils", "Usages"],
    series: [{ nom: "Actuel", valeurs: [2, 3, 2.5, 4, 1] }, { nom: "Cible", valeurs: [4, 4, 3, 5, 3] }], cote_pouces: 5.5,
  });
  assert.ok(regle.taille_rendue >= 11, `taille rendue ${regle.taille_rendue}`);
  assert.ok(regle.graduations.length > 2 && regle.graduations.every((t) => !t.includes(".")), regle.graduations.join(" "));
  assert.deepStrictEqual(regle.contours, ["#777777"]);
  assert.strictEqual(regle.legende, "dessous");
  // Chaque libellé d'axe hors du cercle extérieur, avec une marge (en points).
  assert.strictEqual(regle.libelles.length, 5);
  for (const l of regle.libelles) assert.ok(l.ecart >= 3, JSON.stringify(l));
  // Toutes les graduations sur pastille blanche, au-dessus des tracés ; remplissages légers.
  assert.strictEqual(regle.graduations_sur_pastille, regle.graduations.length);
  assert.strictEqual(regle.graduations_dessus, true);
  assert.ok(regle.opacite_remplissage <= 0.08, `opacité ${regle.opacite_remplissage}`);
});

test("carte de chaleur réelle : case vide, valeurs hors de 0-10, image au ratio du PNG", { skip: sansPythonReel }, async () => {
  const tableau = ["| Métier | Rédaction | Analyse | Recherche |", "|---|---|---|---|",
    "| Accueil | 3 | 1 | 20 |", "| Finances | 2 | x | 14 |", "| Urbanisme | 7 | 5 | 11 |"];
  const r = await avecPython(PYTHON_REEL, () => outils.rendu(md("# C", "## Exposition", "Carte de chaleur :", ...tableau), { dossierSkill: SKILL }));
  assert.deepStrictEqual(lesCodes(r), [], JSON.stringify(r.alertes));
  const xml = await r.xml(2);
  const [p] = pics(xml);
  const media = await plusGrandMedia(r.zip);
  const dims = dimensionsPng(media.octets);
  assert.ok(proche(p.w / p.h, dims.largeur / dims.hauteur, 1e-2), `${JSON.stringify(p)} ${JSON.stringify(dims)}`);
  dansLesMarges(xml);
});

// ---------------------------------------------------------------------------
// Icônes
// ---------------------------------------------------------------------------

const ICONES = ["- FaShieldAlt : Sécurité : Protéger les données des agents",
  "- FaInexistant : Inconnue : Nom qui n'existe pas",
  "- MdSecurity : Contrôle : Vérifier avant d'envoyer",
  "- LuShield : Confiance : Un cadre partagé"];
const avecMonogramme = () => charteEssai({ MONOGRAMMES: { bleu_jaune: uri(245, 178) } });
const icones = (lignes, options = {}) => outils.rendu(md("# I", "## Principes", "Icônes :", ...lignes), { charte: avecMonogramme(), ...options });

// Pixels pleinement opaques d'un PNG (le bord lissé est exclu) : vrai s'ils sont tous BLEU 1F519B.
async function toutBleu(octets) {
  const sharp = require("sharp");
  const { data, info } = await sharp(octets).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaques = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (data[i + 3] < 255) continue;
    opaques++;
    if (data[i] !== 0x1f || data[i + 1] !== 0x51 || data[i + 2] !== 0x9b) return false;
  }
  return opaques > 0;
}

test("icônes : FaShieldAlt, MdSecurity, LuShield en PNG 256 px bleus ; FaInexistant, ICONE_INCONNUE et monogramme", { skip: !paquetsIcones }, async () => {
  const r = await icones(ICONES);
  assert.deepStrictEqual(lesCodes(r), ["ICONE_INCONNUE"], JSON.stringify(r.alertes));
  assert.match(r.alertes[0].message, /FaInexistant/);
  assert.strictEqual(r.alertes[0].ligne, 2);
  const xml = await r.xml(2);
  const p = pics(xml);
  assert.strictEqual(p.length, 4);
  assert.ok(proche(p[1].w / p[1].h, 4), `monogramme au ratio de hauteurPour : ${JSON.stringify(p[1])}`);
  for (const i of [0, 2, 3]) assert.ok(proche(p[i].w, p[i].h), JSON.stringify(p[i]));
  const lesMedias = await medias(r.zip);
  const pngIcones = lesMedias.filter((m) => {
    const d = dimensionsPng(m.octets);
    return d && d.largeur === 256 && d.hauteur === 256;
  });
  assert.strictEqual(pngIcones.length, 3);
  for (const m of pngIcones) assert.ok(await toutBleu(m.octets), `${m.nom} n'est pas bleu`);
  const t = textes(xml);
  for (const mot of ["Sécurité", "Inconnue", "Contrôle", "Confiance", "Un cadre partagé"]) assert.ok(t.includes(mot), mot);
  dansLesMarges(xml);
});

test("icônes : sans monogramme (charte de repli), une réserve à la place de l'icône inconnue", { skip: !paquetsIcones }, async () => {
  const r = await icones(ICONES, { charte: charteEssai() });
  assert.deepStrictEqual(lesCodes(r), ["ICONE_INCONNUE"]);
  const xml = await r.xml(2);
  assert.strictEqual(pics(xml).length, 3);
  assert.ok(textes(xml).includes("Icône inconnue"), textes(xml).join("|"));
});

test("icônes : de 4 à 6, hors bornes DONNEES_INVALIDES puis rendu dégradé", { skip: !paquetsIcones }, async () => {
  const une = (i) => `- FaShieldAlt : Titre ${i} : Description ${i}`;
  const trois = await icones([1, 2, 3].map(une));
  assert.deepStrictEqual(lesCodes(trois), ["DONNEES_INVALIDES"]);
  assert.strictEqual(pics(await trois.xml(2)).length, 3);
  const sept = await icones([1, 2, 3, 4, 5, 6, 7].map(une));
  assert.deepStrictEqual(lesCodes(sept), ["DONNEES_INVALIDES"]);
  assert.match(sept.alertes[0].message, /« Titre 7 »/);
  const xml = await sept.xml(2);
  assert.strictEqual(pics(xml).length, 6);
  assert.ok(!textes(xml).includes("Titre 7"));
});

test("icônes : 4, 5 et 6, sous une accroche, tout reste dans les marges", { skip: !paquetsIcones }, async () => {
  const une = (i) => `- MdSecurity : Titre ${i} : Une description de quelques mots pour l'icône ${i}`;
  for (const n of [4, 5, 6]) {
    const r = await outils.rendu(md("# I", "## Principes", "Accroche : Une accroche", "Icônes :", ...Array.from({ length: n }, (_, i) => une(i + 1))),
      { charte: avecMonogramme() });
    assert.deepStrictEqual(lesCodes(r), []);
    const xml = await r.xml(2);
    assert.strictEqual(pics(xml).length, n);
    for (const p of pics(xml)) assert.ok(p.y >= gabarit.zoneSousAccroche.y - 1e-3, JSON.stringify(p));
    dansLesMarges(xml);
  }
});

test("icônes : directive sans puce, réserve sans seconde alerte (l'analyseur a alerté)", async () => {
  const r = await outils.rendu(md("# I", "## Principes", "Icônes :", "Une phrase sans puce."), { charte: avecMonogramme() });
  assert.deepStrictEqual(lesCodes(r), []);
  assert.ok(r.doc.alertes.some((a) => a.code === "DONNEES_INVALIDES"));
  assert.ok(textes(await r.xml(2)).includes("Icônes sans contenu"));
});

test("icônes : description trop longue, TEXTE_TROP_LONG", { skip: !paquetsIcones }, async () => {
  const long = Array.from({ length: 80 }, () => "description").join(" ");
  const r = await icones([...ICONES.filter((l) => !/Inexistant/.test(l)), `- FaShieldAlt : Longue : ${long}`]);
  assert.deepStrictEqual(lesCodes(r), ["TEXTE_TROP_LONG"]);
});

test("icônes : paquet absent, DEPENDANCE_ABSENTE une fois par deck, réserves, textes gardés", async () => {
  const charger = externes.paquets.charger;
  externes.paquets.charger = (nom) => {
    if (nom === "sharp") throw new Error("Cannot find module 'sharp'");
    return charger(nom);
  };
  try {
    const r = await outils.rendu(md("# I", "## Un", "Icônes :", ...ICONES, "## Deux", "Icônes :", ...ICONES), { charte: avecMonogramme() });
    assert.deepStrictEqual(lesCodes(r), ["DEPENDANCE_ABSENTE"], JSON.stringify(r.alertes));
    assert.match(r.alertes[0].message, /sharp/);
    for (const n of [2, 3]) {
      const xml = await r.xml(n);
      assert.strictEqual(compte(xml, /<p:pic>/g), 0);
      const t = textes(xml);
      assert.strictEqual(t.filter((x) => x === "Icône non disponible").length, 4);
      assert.ok(t.includes("Sécurité"));
    }
  } finally {
    externes.paquets.charger = charger;
  }
});

test("icônes : conversion refusée par sharp, DEPENDANCE_ABSENTE une fois, monogramme à la place", { skip: !paquetsIcones }, async () => {
  const charger = externes.paquets.charger;
  const sharpCasse = () => {
    const chaine = { resize: () => chaine, png: () => chaine, toBuffer: async () => { throw new Error("libvips indisponible"); } };
    return chaine;
  };
  externes.paquets.charger = (nom) => (nom === "sharp" ? sharpCasse : charger(nom));
  try {
    const r = await icones(ICONES);
    assert.deepStrictEqual(lesCodes(r).sort(), ["DEPENDANCE_ABSENTE", "ICONE_INCONNUE"], JSON.stringify(r.alertes));
    const absente = r.alertes.find((a) => a.code === "DEPENDANCE_ABSENTE");
    assert.match(absente.message, /sharp n'a pas converti l'icône « FaShieldAlt »/);
    assert.match(absente.message, /libvips indisponible/);
    assert.match(r.alertes.find((a) => a.code === "ICONE_INCONNUE").message, /FaInexistant/);
    const p = pics(await r.xml(2));
    assert.strictEqual(p.length, 4);
    for (const c of p) assert.ok(proche(c.w / c.h, 4), `monogramme : ${JSON.stringify(c)}`);
  } finally {
    externes.paquets.charger = charger;
  }
});
