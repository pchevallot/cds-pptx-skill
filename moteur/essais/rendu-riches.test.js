// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motifs riches : cartes, blocs, chiffres clés, citation, prompt, décodage,
// image, et la frise (rendu de « Schéma : chronologie », appelée par le motif
// schéma). Charte d'essai en mémoire, comme rendu-structure.test.js : aucun
// fichier de l'atelier ni de la skill n'est lu.
const test = require("node:test");
const assert = require("node:assert");
const gabarit = require("../gabarit.js");
const { MOTIFS } = require("../rendu.js");
const riches = require("../motifs/riches.js");
const outils = require("./outils-essai.js");
const { couperLignes } = require("../mesure.js");

const { md, png, dossierTemp, textes, compte, codes, cadres } = outils;

// Rend une source dont la diapositive 2 porte le motif à l'essai : son XML et ses textes.
async function rendu(source, options) {
  const r = await outils.rendu(source, options);
  const xml = await r.xml(2);
  const t = textes(xml);
  return { doc: r.doc, alertes: r.alertes, xml, t, tout: t.join(" ") };
}

const cadreImage = (xml) => cadres(/<p:pic>.*?<\/p:pic>/s.exec(xml)[0])[0];
const dansLesMarges = (r) => outils.dansLesMarges(r.xml);
function contient(r, ...attendus) {
  for (const a of attendus) assert.ok(r.tout.includes(a), `« ${a} » absent de : ${r.t.join(" | ")}`);
}

// ---------------------------------------------------------------------------
// Registre
// ---------------------------------------------------------------------------

test("registre : les sept motifs riches sont inscrits, la frise exportée à part", () => {
  for (const m of ["cartes", "blocs", "chiffres", "citation", "prompt", "decodage", "image"]) {
    assert.strictEqual(typeof MOTIFS[m], "function", m);
  }
  assert.strictEqual(typeof riches.frise, "function");
  assert.strictEqual(riches.MOTIFS.schema, undefined);
});

// ---------------------------------------------------------------------------
// Cartes et blocs
// ---------------------------------------------------------------------------

const CARTES = ["### Former", "- Des ateliers **courts**", "### Outiller", "- Un espace partagé", "  - ouvert à tous", "### Mesurer", "- Trois indicateurs"];

test("cartes : titres et puces rendus, une ombre par carte, dans les marges", async () => {
  const r = await rendu(md("# C", "## Trois leviers", "Cartes :", ...CARTES));
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "Former", "Outiller", "Mesurer", "Des ateliers", "courts", "Un espace partagé", "ouvert à tous", "Trois indicateurs");
  assert.ok(!r.tout.includes("**"));
  assert.ok(compte(r.xml, /<a:outerShdw/g) >= 3);
  dansLesMarges(r);
});

test("cartes, blocs, chiffres : ni vert ni orange (réservés aux graphiques), tout texte à 4,5:1 sur son fond", async () => {
  const sources = {
    cartes: md("# C", "## Quatre", "Cartes :", ...[1, 2, 3, 4].flatMap((i) => [`### Carte ${i}`, `- contenu ${i}`])),
    blocs: md("# C", "## Cinq", "Blocs :", ...[1, 2, 3, 4, 5].flatMap((i) => [`### Bloc ${i}`, `- contenu ${i}`])),
    chiffres: md("# C", "## Quatre", "Chiffres clés :", "- 1 : un", "- 2 : deux", "- 3 : trois", "- 4 : quatre"),
  };
  for (const [motif, source] of Object.entries(sources)) {
    const r = await rendu(source);
    assert.doesNotMatch(r.xml, /4CAF50|FF9800/, motif);
    const lus = outils.textesSurFond(r.xml);
    assert.ok(lus.length > 3, motif);
    for (const { texte, couleur, fond } of lus) {
      const c = outils.contraste(couleur, fond);
      assert.ok(c >= 4.5, `${motif} : « ${texte} » ${couleur} sur ${fond}, contraste ${c.toFixed(2)}`);
    }
  }
});

// Couleurs de signal (R60). Liserés des cartes : formes de 0,07 pouce de haut ;
// boîtes des chiffres : formes à ombre de la zone. Seuil de contraste d'un texte :
// 3:1 au-dessus de 18 pt ou en gras dès 14 pt (grand texte), 4,5:1 sinon.
const liseres = (xml) => outils.formes(xml).filter((f) => Math.abs(f.h - 0.07) < 1e-3).map((f) => f.fond);
const titresCartes = (xml) => outils.formes(xml).filter((f) => f.textes.length && Math.abs(f.h - 0.8) < 1e-3).map((f) => f.couleurs[0]);
const boitesChiffres = (xml) => [...xml.matchAll(/<p:sp>.*?<\/p:sp>/gs)].map(([sp]) => sp)
  .filter((sp) => sp.includes("outerShdw")).map((sp) => /<a:solidFill><a:srgbClr val="([0-9A-F]{6})"/.exec(sp)[1]);
const seuil = ({ taille, gras }) => (taille >= 18 || (gras && taille >= 14) ? 3 : 4.5);
function contrastesTenus(xml, quoi) {
  const lus = outils.textesSurFond(xml);
  assert.ok(lus.length > 3, quoi);
  for (const l of lus) {
    const c = outils.contraste(l.couleur, l.fond);
    assert.ok(c >= seuil(l), `${quoi} : « ${l.texte} » ${l.couleur} sur ${l.fond} à ${l.taille} pt, contraste ${c.toFixed(2)}`);
  }
}
const SIX = ["bleu", "or", "gris", "vert", "orange", "rouge"];
const HEX = { bleu: "1F519B", or: "FDC948", gris: "333333", vert: "4CAF50", orange: "FF9800", rouge: "F44336" };

test("couleurs de signal : sans valeur, la rotation des cartes et des chiffres est inchangée", async () => {
  const c = await rendu(md("# C", "## Quatre", "Cartes :", ...[1, 2, 3, 4].flatMap((i) => [`### Carte ${i}`, `- contenu ${i}`])));
  assert.deepStrictEqual(liseres(c.xml), ["1F519B", "FDC948", "333333", "1F519B"]);
  assert.deepStrictEqual(titresCartes(c.xml), Array(4).fill("1F519B"));
  const n = await rendu(md("# C", "## Trois", "Chiffres clés :", "- 1 : un", "- 2 : deux", "- 3 : trois"));
  assert.deepStrictEqual(boitesChiffres(n.xml), ["1F519B", "FDC948", "1F519B"]);
});

test("couleurs de signal : liseré des cartes et boîte des chiffres de la couleur demandée, contraste tenu", async () => {
  for (const groupe of [SIX.slice(0, 4), SIX.slice(2, 6), ["rouge", "or"]]) {
    const cartes = await rendu(md("# C", "## Cartes", `Cartes : ${groupe.join(", ")}`, ...groupe.flatMap((nom) => [`### Carte ${nom}`, `- contenu ${nom}`])));
    assert.deepStrictEqual(cartes.alertes, []);
    assert.deepStrictEqual(liseres(cartes.xml), groupe.map((nom) => HEX[nom]));
    // Le titre est posé sur le gris clair, pas sur le liseré : toujours bleu, quelle que soit la couleur demandée.
    assert.deepStrictEqual(titresCartes(cartes.xml), groupe.map(() => "1F519B"));
    contrastesTenus(cartes.xml, `cartes ${groupe}`);
    const chiffres = await rendu(md("# C", "## Chiffres", `Chiffres clés : ${groupe.join(", ")}`, ...groupe.map((nom, i) => `- ${i + 1} : libellé ${nom}`)));
    assert.deepStrictEqual(chiffres.alertes, []);
    assert.deepStrictEqual(boitesChiffres(chiffres.xml), groupe.map((nom) => HEX[nom]));
    // Chiffres et libellés en blanc, comme l'original, sauf sur l'or qui prend le bleu. Vert et orange
    // tiennent moins de 3:1 : exception assumée (Pascal, 02/11/2026), les autres couleurs tiennent le seuil.
    const lus = outils.textesSurFond(chiffres.xml);
    for (const l of lus) {
      const fond = l.fond;
      assert.strictEqual(l.couleur, fond === "FDC948" ? "1F519B" : "FFFFFF", `chiffres ${groupe} : « ${l.texte} » sur ${fond}`);
      if (fond !== "4CAF50" && fond !== "FF9800") assert.ok(outils.contraste(l.couleur, fond) >= seuil(l), `chiffres ${groupe} : « ${l.texte} » sur ${fond}`);
    }
  }
});

test("couleurs de signal : nom inconnu, DONNEES_INVALIDES et rotation par défaut", async () => {
  const r = await rendu(md("# C", "## Deux", "Cartes : rouge, fuchsia", "### A", "- a", "### B", "- b"));
  assert.deepStrictEqual(r.doc.alertes.map((a) => [a.ligne, a.code]), [[3, "DONNEES_INVALIDES"]]);
  assert.deepStrictEqual(r.alertes, []);
  assert.deepStrictEqual(liseres(r.xml), ["1F519B", "FDC948"]);
});

test("cartes : 5 cartes, DONNEES_INVALIDES à la ligne du ##, les 4 premières rendues", async () => {
  const cinq = [1, 2, 3, 4, 5].flatMap((i) => [`### Carte ${i}`, `- contenu ${i}`]);
  const r = await rendu(md("# C", "## Cinq leviers", "Cartes :", ...cinq));
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  assert.match(r.alertes[0].message, /Carte 5/);
  contient(r, "Carte 1", "contenu 4");
  assert.ok(!r.tout.includes("Carte 5"));
});

test("cartes : une seule carte, DONNEES_INVALIDES, rendue sur toute la largeur", async () => {
  const r = await rendu(md("# C", "## Un levier", "Cartes :", "### Former", "- a"));
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  contient(r, "Former");
});

test("cartes : texte trop long pour la carte, TEXTE_TROP_LONG", async () => {
  const long = "une puce délibérément longue qui revient encore et encore sur le même propos ".repeat(3);
  const r = await rendu(md("# C", "## Trop", "Cartes :", "### A", ...Array(8).fill(`- ${long}`), "### B", "- b"));
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
});

test("blocs : titres (en capitales) et puces rendus, dans les marges", async () => {
  const r = await rendu(md("# C", "## Les couches", "Blocs :", "### Données", "- Le pilotage", "### Modèles", "- Le moteur", "  - un détail", "### Usages", "- La valeur"));
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "DONNÉES", "MODÈLES", "USAGES", "Le pilotage", "Le moteur", "un détail", "La valeur");
  assert.ok(compte(r.xml, /<a:outerShdw/g) >= 3);
  dansLesMarges(r);
});

test("blocs : 6 blocs, DONNEES_INVALIDES, les 5 premiers rendus", async () => {
  const six = [1, 2, 3, 4, 5, 6].flatMap((i) => [`### Couche ${i}`, `- contenu ${i}`]);
  const r = await rendu(md("# C", "## Six couches", "Blocs :", ...six));
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  contient(r, "COUCHE 5", "contenu 5");
  assert.ok(!r.tout.includes("COUCHE 6"));
});

test("blocs sans ### : DONNEES_INVALIDES, les puces restent affichées", async () => {
  const r = await rendu(md("# C", "## Les couches", "Blocs :", "- une puce perdue"));
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  contient(r, "une puce perdue");
});

// ---------------------------------------------------------------------------
// Chiffres clés, citation
// ---------------------------------------------------------------------------

test("chiffres : valeurs et libellés rendus, une ombre par chiffre, dans les marges", async () => {
  const r = await rendu(md("# C", "## En chiffres", "Chiffres clés :", "- 42 % : des agents utilisent déjà l'outil",
    "- 3 : directions pilotes", "- 26/26 : tests réussis"));
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "42 %", "des agents utilisent déjà l'outil", "3", "directions pilotes", "26/26", "tests réussis");
  assert.ok(compte(r.xml, /<a:outerShdw/g) >= 3);
  dansLesMarges(r);
});

test("chiffres : 5 chiffres ou un seul, DONNEES_INVALIDES", async () => {
  const cinq = await rendu(md("# C", "## En chiffres", "Chiffres clés :", ...[1, 2, 3, 4, 5].map((i) => `- ${i} : libellé ${i}`)));
  assert.deepStrictEqual(codes(cinq), [[2, "DONNEES_INVALIDES"]]);
  contient(cinq, "libellé 4");
  assert.ok(!cinq.tout.includes("libellé 5"));
  const un = await rendu(md("# C", "## En chiffres", "Chiffres clés :", "- 42 % : un seul"));
  assert.deepStrictEqual(codes(un), [[2, "DONNEES_INVALIDES"]]);
  contient(un, "42 %", "un seul");
});

test("citation : texte et auteur rendus, dans les marges", async () => {
  const r = await rendu(md("# C", "## Une parole", "Citation :", "L'outil est un prétexte,", "la décision est le sujet.",
    "Auteur : Une directrice générale des services"));
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "L'outil est un prétexte, la décision est le sujet.", "Une directrice générale des services");
  // Guillemets décoratifs en Open Sans, comme tout le texte de la charte.
  assert.doesNotMatch(r.xml, /Georgia/);
  dansLesMarges(r);
});

// ---------------------------------------------------------------------------
// Prompt et décodage
// ---------------------------------------------------------------------------

test("prompt : intro, lignes du bloc telles quelles en Consolas, puces sous le cadre", async () => {
  const r = await rendu(md("# C", "## Le prompt", "Prompt :", "À copier tel quel dans l'assistant.", "```",
    "# Rôle", "Tu es un **juriste**.", "  - garde la structure", "```", "- Observer le ton", "- Comparer les sorties"));
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "À copier tel quel dans l'assistant.", "Observer le ton", "Comparer les sorties");
  for (const ligne of ["# Rôle", "Tu es un **juriste**.", "  - garde la structure"]) assert.ok(r.t.includes(ligne), ligne);
  assert.match(r.xml, /typeface="Consolas"/);
  assert.ok(compte(r.xml, /<a:outerShdw/g) >= 1);
  dansLesMarges(r);
});

test("prompt trop long pour son cadre : TEXTE_TROP_LONG", async () => {
  const lignes = Array.from({ length: 60 }, (_, i) => `Ligne ${i + 1} du prompt, assez longue pour occuper la largeur du cadre ou presque.`);
  const r = await rendu(md("# C", "## Le prompt", "Prompt :", "```", ...lignes, "```"));
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
});

test("décodage : sous-puces en colonnes d'un tableau morceau / apport / plus loin", async () => {
  const r = await rendu(md("# C", "## Ce qui a marché", "Décodage :",
    "- « Tu es juriste »", "  - fixe le vocabulaire", "  - essayez un autre rôle",
    "- « Cite tes pages »", "  - rend la réponse vérifiable"));
  assert.deepStrictEqual(r.alertes, []);
  assert.match(r.xml, /<a:tbl>/);
  contient(r, "Morceau du prompt", "Ce qu'il apporte", "Pour aller plus loin",
    "« Tu es juriste »", "fixe le vocabulaire", "essayez un autre rôle", "« Cite tes pages »", "rend la réponse vérifiable");
});

test("décodage sans sous-puces : une liste à puces, sans tableau", async () => {
  const r = await rendu(md("# C", "## Ce qui a marché", "Décodage :", "- Le rôle a cadré le ton", "- L'exemple a fixé le format"));
  assert.deepStrictEqual(r.alertes, []);
  assert.doesNotMatch(r.xml, /<a:tbl>/);
  contient(r, "Le rôle a cadré le ton", "L'exemple a fixé le format");
});

test("décodage : trois sous-puces, DONNEES_INVALIDES, la troisième jointe à la dernière colonne", async () => {
  const r = await rendu(md("# C", "## Décodage", "Décodage :", "- morceau", "  - apport", "  - plus loin", "  - encore"));
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  contient(r, "plus loin ; encore");
});

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

test("image à droite : puces à gauche, image au ratio natif à droite, légende", async () => {
  const dossierSource = dossierTemp({ "salle du conseil.png": png(200, 100) });
  const r = await rendu(md("# C", "## Le terrain", "- Un poste partagé", "![La salle du **conseil**](salle du conseil.png)"), { dossierSource });
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "Un poste partagé", "La salle du ", "conseil");
  assert.match(r.xml, /descr="La salle du conseil"/);
  assert.strictEqual(compte(r.xml, /<p:pic>/g), 1);
  const c = cadreImage(r.xml);
  assert.ok(Math.abs(c.w / c.h - 2) < 0.01, JSON.stringify(c));
  assert.ok(c.x > gabarit.W / 2, JSON.stringify(c));
  dansLesMarges(r);
});

test("image à gauche et image pleine : position et ratio", async () => {
  const dossierSource = dossierTemp({ "plan.png": png(100, 100) });
  const gauche = await rendu(md("# C", "## Le terrain", "Image : gauche", "- Un poste partagé", "![Le plan](plan.png)"), { dossierSource });
  assert.deepStrictEqual(gauche.alertes, []);
  const cg = cadreImage(gauche.xml);
  assert.ok(cg.x + cg.w < gabarit.W / 2 && Math.abs(cg.w - cg.h) < 0.01, JSON.stringify(cg));
  const pleine = await rendu(md("# C", "## Le plan", "![Le plan](plan.png)"), { dossierSource });
  assert.deepStrictEqual(pleine.alertes, []);
  const cp = cadreImage(pleine.xml);
  assert.ok(Math.abs(cp.x + cp.w / 2 - gabarit.W / 2) < 0.01, JSON.stringify(cp));
  contient(pleine, "Le plan");
  dansLesMarges(pleine);
});

test("image introuvable : IMAGE_INTROUVABLE, réserve légendée, puces gardées", async () => {
  const r = await rendu(md("# C", "## Le nouveau luminaire", "- Un driver remplaçable", "![Photo d'un driver](photo.jpg)"));
  assert.deepStrictEqual(codes(r), [[2, "IMAGE_INTROUVABLE"]]);
  assert.match(r.alertes[0].message, /photo\.jpg/);
  assert.strictEqual(compte(r.xml, /<p:pic>/g), 0);
  assert.ok(r.t.some((x) => x.includes("Image introuvable") && x.includes("photo.jpg")), r.t.join(" | "));
  contient(r, "Un driver remplaçable", "Photo d'un driver");
});

// ---------------------------------------------------------------------------
// Frise (Schéma : chronologie)
// ---------------------------------------------------------------------------

// La frise n'est pas un motif inscrit ici : l'essai l'appelle sous un nom à lui.
async function friseRendue(...lignes) {
  MOTIFS.frise_essai = riches.frise;
  try {
    return await rendu(md("# C", "## Le calendrier", "Schéma : chronologie", ...lignes), {
      avant: (doc) => { doc.diapos[1].motif = "frise_essai"; },
    });
  } finally {
    delete MOTIFS.frise_essai;
  }
}

test("frise : dates, libellés, détails et légende rendus, une ombre par étape, dans les marges", async () => {
  const r = await friseRendue("- 12/06 : lancement", "  - avec la direction", "- 30/09 : bilan d'étape", "- 15/12 : décision", "- Mars 2027 : généralisation",
    "Une phrase sous la frise.");
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "12/06", "lancement", "avec la direction", "30/09", "bilan d'étape", "15/12", "décision", "Mars 2027", "généralisation", "Une phrase sous la frise.");
  assert.ok(compte(r.xml, /<a:outerShdw/g) >= 4);
  dansLesMarges(r);
});

test("frise à sept étapes : dans les marges, sans alerte", async () => {
  const r = await friseRendue(...[1, 2, 3, 4, 5, 6, 7].map((i) => `- Étape ${i} : un libellé de longueur moyenne pour l'étape ${i}`));
  assert.deepStrictEqual(r.alertes, []);
  contient(r, "Étape 1", "Étape 7");
  dansLesMarges(r);
});

test("frise : 8 étapes ou une seule, DONNEES_INVALIDES, sans exception", async () => {
  const huit = await friseRendue(...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => `- J${i} : étape ${i}`));
  assert.deepStrictEqual(codes(huit), [[2, "DONNEES_INVALIDES"]]);
  contient(huit, "étape 7");
  assert.ok(!huit.tout.includes("étape 8"));
  const une = await friseRendue("- 12/06 : lancement");
  assert.deepStrictEqual(codes(une), [[2, "DONNEES_INVALIDES"]]);
  contient(une, "12/06", "lancement");
  const vide = await friseRendue("Une phrase seule.");
  assert.deepStrictEqual(codes(vide), [[2, "DONNEES_INVALIDES"]]);
});

test("frise : étape sans « date : », DONNEES_INVALIDES, son texte reste affiché", async () => {
  const r = await friseRendue("- 12/06 : lancement", "- un jalon sans date");
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  contient(r, "un jalon sans date");
});

// ---------------------------------------------------------------------------
// Cadres ajustés au contenu, groupe centré à 40 % au-dessus, 60 % au-dessous
// ---------------------------------------------------------------------------

const Z = gabarit.zoneContenu;
const pres = (a, b, e = 0.011) => Math.abs(a - b) <= e;
const cadresGris = (xml) => outils.formes(xml).filter((f) => f.fond === "F5F5F5" && f.w > 1);
// Haut attendu d'un groupe de hauteur h centré optiquement dans la zone de contenu.
const hautOptique = (h) => Z.y + 0.4 * (Z.h - h);

test("cartes et deux colonnes courtes : cadres au plancher de 2 pouces, groupe centré optiquement", async () => {
  for (const source of [
    md("# C", "## Trois", "Cartes :", "### Un", "- a", "### Deux", "- b", "### Trois", "- c"),
    md("# C", "## Deux", "### Avant", "- a", "### Après", "- b"),
  ]) {
    const r = await rendu(source);
    const c = cadresGris(r.xml);
    assert.ok(c.length >= 2);
    for (const k of c) {
      assert.ok(pres(k.h, gabarit.PLANCHER_CADRE), JSON.stringify(k));
      assert.ok(pres(k.y, hautOptique(k.h)), `haut ${k.y} au lieu de ${hautOptique(k.h)}`);
    }
  }
});

test("cartes longues : même hauteur pour toutes, celle du contenu mesuré plus la marge basse", async () => {
  const longues = Array.from({ length: 6 }, (_, i) => `- Une puce assez longue numéro ${i + 1}, sur deux lignes`);
  const r = await rendu(md("# C", "## Trois", "Cartes :", "### Un", ...longues, "### Deux", "- b", "### Trois", "- c"));
  assert.deepStrictEqual(r.alertes, []);
  const c = cadresGris(r.xml);
  assert.ok(c.every((k) => pres(k.h, c[0].h)) && c[0].h > gabarit.PLANCHER_CADRE + 0.5, JSON.stringify(c));
  // Zone de puces de la première carte : la plus haute, elle fixe la hauteur des cadres.
  const corps = outils.formes(r.xml).find((f) => f.textes.includes("Une puce assez longue numéro 1, sur deux lignes"));
  assert.ok(pres(c[0].y + c[0].h - (corps.y + corps.h), gabarit.MARGE_BAS_CADRE), JSON.stringify({ corps, carte: c[0] }));
  assert.ok(pres(c[0].y, hautOptique(c[0].h)));
});

test("blocs : même hauteur, au contenu, groupe centré optiquement", async () => {
  const r = await rendu(md("# C", "## Couches", "Blocs :", "### Un", "- a", "### Deux", "- b", "### Trois", "- c"));
  const c = cadresGris(r.xml);
  assert.strictEqual(c.length, 3);
  assert.ok(c.every((k) => pres(k.h, c[0].h)) && c[0].h < 1.2, JSON.stringify(c));
  const total = c[2].y + c[2].h - c[0].y;
  assert.ok(pres(c[0].y, hautOptique(total)), `haut ${c[0].y} au lieu de ${hautOptique(total)}`);
});

test("prompt court : cadre au plancher, puce séparée du cadre de 0,3 pouce", async () => {
  const r = await rendu(md("# C", "## Le prompt", "Prompt :", "```", "Rôle : secrétaire.", "Tâche : un compte rendu.", "```", "- Relire avant diffusion"));
  const f = outils.formes(r.xml);
  const cadre = f.find((x) => x.fond === "EEF2F8");
  const puce = f.find((x) => x.textes.includes("Relire avant diffusion"));
  assert.ok(pres(cadre.h, gabarit.PLANCHER_CADRE), JSON.stringify(cadre));
  assert.ok(pres(puce.y - (cadre.y + cadre.h), 0.3), JSON.stringify({ cadre, puce }));
});

test("tableau et décodage courts : texte à 18 pt, tableau descendu sous le haut de la zone", async () => {
  for (const source of [
    md("# C", "## T", "| A | B |", "|---|---|", "| 1 | 2 |", "| 3 | 4 |"),
    md("# C", "## D", "Décodage :", "- Rôle", "  - cadre le ton", "- Tâche", "  - dit ce qu'on attend"),
  ]) {
    const r = await rendu(source);
    const tailles = [...r.xml.matchAll(/<a:rPr[^>]* sz="(\d+)"/g)].map((m) => Number(m[1]) / 100).filter((t) => t !== 24);
    assert.ok(tailles.length && tailles.every((t) => t === 18), tailles.join(","));
    const [table] = cadres(/<p:graphicFrame>.*?<\/p:graphicFrame>/s.exec(r.xml)[0]);
    assert.ok(table.y > Z.y + 0.5, JSON.stringify(table));
  }
});

test("image à côté des puces : le haut de l'image s'aligne sur le haut des puces", async () => {
  const d = dossierTemp({ "p.png": png(300, 200) });
  const r = await rendu(md("# C", "## Poste", "Image : gauche", "- Un tableau de bord", "![Un poste](p.png)"), { dossierSource: d });
  const image = cadreImage(r.xml);
  const puces = outils.formes(r.xml).find((x) => x.textes.includes("Un tableau de bord"));
  assert.ok(pres(image.y, puces.y, 0.12), JSON.stringify({ image, puces }));
});

test("citation : guillemets en ligne dans la zone du texte, attribution alignée sur son bord droit", async () => {
  const r = await rendu(md("# C", "## Une parole", "Citation :", "Le tableau de bord n'a rien changé à notre travail,",
    "il a changé nos réunions : on y parle enfin des mêmes choses.", "Auteur : Une directrice de service"));
  // Les guillemets sont des runs du même <p:txBody> que la citation, espace insécable à l'intérieur.
  const corps = [...r.xml.matchAll(/<p:txBody>.*?<\/p:txBody>/gs)].map((m) => outils.textes(m[0]).join(""))
    .find((t) => t.includes("Le tableau de bord"));
  assert.ok(corps.startsWith("«\u00A0Le tableau de bord") && corps.endsWith("choses.\u00A0»"), JSON.stringify(corps));
  const f = outils.formes(r.xml);
  assert.ok(!f.some((x) => ["«", "»"].includes(x.textes.join("").trim())), "plus de forme de guillemet séparée");
  const texte = f.find((x) => x.textes.join("").includes("Le tableau de bord"));
  const auteur = f.find((x) => x.textes.join("") === "Une directrice de service");
  const ligne = (texte.tailles[0] * gabarit.INTERLIGNE) / 72;
  const n = couperLignes(texte.textes.join(""), texte.w, { taille: texte.tailles[0] }).length;
  assert.ok(n >= 2 && pres(texte.h, n * ligne, 0.06), `hauteur ${texte.h} pour ${n} lignes de ${ligne}`);
  assert.ok(pres(auteur.x + auteur.w, texte.x + texte.w), JSON.stringify({ auteur, texte }));
});
