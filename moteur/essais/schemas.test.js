// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Schémas : géométrie pure (geometrieSchema) des quatre types dessinés ici,
// puis rendu par le motif schéma, chronologie comprise (déléguée à la frise).
// Charte d'essai en mémoire : aucun fichier de l'atelier ni de la skill n'est lu.
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { MOTIFS } = require("../rendu.js");
const { geometrieSchema } = require("../motifs/schemas.js");
const gabarit = require("../gabarit.js");
const outils = require("./outils-essai.js");

const { md, textes, compte, codes, segmentTraverse } = outils;

// Zone de contenu d'une diapositive sans accroche : 12,33 x 5,5 pouces.
const ZONE = { x: 0.5, y: 1.5, w: 12.33, h: 5.5 };
const EPS = 1e-6;

// Une liste plate d'éléments (D1) écrite comme dans la source : retrait de
// deux espaces par niveau, « ? » en tête d'une question.
function elements(...lignes) {
  return lignes.map((l) => {
    const niveau = (l.length - l.trimStart().length) / 2;
    const texte = l.trim();
    return texte.startsWith("?")
      ? { texte: texte.slice(1).trim(), niveau, question: true }
      : { texte, niveau, question: false };
  });
}
const schema = (type, lignes, legende = null) => ({ type, elements: elements(...lignes), legende });

// Rectangles occupés : boîtes, zones de détail et étiquettes.
function occupes(geo) {
  const r = [];
  for (const b of geo.boites) {
    r.push({ ...b, quoi: `boîte « ${b.texte} »` });
    if (b.zoneDetail) r.push({ ...b.zoneDetail, quoi: `détail de « ${b.texte} »` });
  }
  for (const l of geo.liens) if (l.etiquette) r.push({ ...l.etiquette, quoi: `étiquette « ${l.etiquette.texte} »` });
  if (geo.legende) r.push({ ...geo.legende, quoi: "légende" });
  return r;
}

function dansLaZone(geo, z = ZONE) {
  for (const r of occupes(geo)) {
    assert.ok(r.x >= z.x - EPS && r.y >= z.y - EPS && r.x + r.w <= z.x + z.w + EPS && r.y + r.h <= z.y + z.h + EPS,
      `${r.quoi} hors de la zone : ${JSON.stringify({ x: r.x, y: r.y, w: r.w, h: r.h })}`);
  }
  for (const l of geo.liens) {
    for (const [x, y] of l.points) {
      assert.ok(x >= z.x - EPS && x <= z.x + z.w + EPS && y >= z.y - EPS && y <= z.y + z.h + EPS, `point de lien hors zone : ${x}, ${y}`);
    }
  }
}

function sansChevauchement(geo) {
  const r = occupes(geo);
  for (let i = 0; i < r.length; i++) {
    for (let j = i + 1; j < r.length; j++) {
      const a = r[i];
      const b = r[j];
      const disjoints = a.x + a.w <= b.x + EPS || b.x + b.w <= a.x + EPS || a.y + a.h <= b.y + EPS || b.y + b.h <= a.y + EPS;
      assert.ok(disjoints, `${a.quoi} chevauche ${b.quoi}`);
    }
  }
}

const proche = (p, q) => Math.abs(p[0] - q[0]) < 1e-6 && Math.abs(p[1] - q[1]) < 1e-6;
const basCentre = (b) => [b.x + b.w / 2, b.y + b.h];
const hautCentre = (b) => [b.x + b.w / 2, b.y];

// Deux cases ne se serrent pas : au moins 0,3 pouce entre elles (grille de relecture
// visuelle de la skill). Les détails et les étiquettes, qui accompagnent une case, en sont exemptés.
function ecartees(geo, ecart = 0.3) {
  const b = geo.boites;
  for (let i = 0; i < b.length; i++) {
    for (let j = i + 1; j < b.length; j++) {
      const dx = Math.max(b[j].x - (b[i].x + b[i].w), b[i].x - (b[j].x + b[j].w));
      const dy = Math.max(b[j].y - (b[i].y + b[i].h), b[i].y - (b[j].y + b[j].h));
      assert.ok(Math.max(dx, dy) >= ecart - EPS, `« ${b[i].texte} » et « ${b[j].texte} » à moins de ${ecart} pouce`);
    }
  }
}

// Plus petit écart entre deux cases de la liste (le plus grand de l'écart horizontal et vertical).
function ecartEntre(a, b) {
  return Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w), b.y - (a.y + a.h), a.y - (b.y + b.h));
}

// Bas réel du schéma : cases, détails et étiquettes.
const basSchema = (geo) => Math.max(...occupes({ ...geo, legende: null }).map((r) => r.y + r.h));

// Aucun segment de lien ne passe par l'intérieur d'une case ni d'une zone de détail.
function sansTraversee(geo) {
  const rects = [...geo.boites, ...geo.boites.map((b) => b.zoneDetail).filter(Boolean)];
  for (const l of geo.liens) {
    l.points.slice(1).forEach((q, i) => {
      for (const r of rects) {
        assert.ok(!segmentTraverse(l.points[i], q, r), `lien ${JSON.stringify(l.points)} à travers « ${r.texte || "détail"} »`);
      }
    });
  }
}

// Longueur totale d'un lien.
const longueur = (l) => l.points.slice(1).reduce((s, q, i) => s + Math.hypot(q[0] - l.points[i][0], q[1] - l.points[i][1]), 0);

function valide(geo) {
  assert.deepStrictEqual(geo.invalides, []);
  assert.deepStrictEqual(geo.debordements, []);
  dansLaZone(geo);
  sansChevauchement(geo);
  ecartees(geo);
  sansTraversee(geo);
}

// ---------------------------------------------------------------------------
// Processus
// ---------------------------------------------------------------------------

test("processus : une boîte par puce, sous-puces en détail, dans la zone, sans chevauchement", () => {
  const geo = geometrieSchema(schema("processus", ["Recueillir", "  avec les équipes", "Analyser", "Décider", "  en comité", "  sous un mois"]), ZONE);
  valide(geo);
  assert.deepStrictEqual(geo.boites.map((b) => b.texte), ["Recueillir", "Analyser", "Décider"]);
  assert.deepStrictEqual(geo.boites.map((b) => b.detail), [["avec les équipes"], [], ["en comité", "sous un mois"]]);
  assert.ok(geo.boites.every((b) => b.forme === "rect"));
  // Une flèche de chaque boîte vers la suivante, du bord droit au bord gauche.
  assert.strictEqual(geo.liens.length, 2);
  geo.liens.forEach((l, i) => {
    const [a, b] = [geo.boites[i], geo.boites[i + 1]];
    assert.ok(l.fleche);
    assert.ok(proche(l.points[0], [a.x + a.w, a.y + a.h / 2]) && proche(l.points[l.points.length - 1], [b.x, b.y + b.h / 2]));
  });
});

test("processus : de 2 à 6 étapes, toutes dans la zone sans chevauchement", () => {
  for (let n = 2; n <= 6; n++) {
    const lignes = Array.from({ length: n }, (_, i) => [`Étape numéro ${i + 1}`, `  un détail de l'étape ${i + 1}`]).flat();
    const geo = geometrieSchema(schema("processus", lignes, "Une phrase sous le schéma."), ZONE);
    valide(geo);
    assert.strictEqual(geo.boites.length, n);
    assert.strictEqual(geo.liens.length, n - 1);
  }
});

test("processus : hors de 2 à 6, une alerte de données et un rendu borné", () => {
  const sept = geometrieSchema(schema("processus", ["A", "B", "C", "D", "E", "F", "G"]), ZONE);
  assert.strictEqual(sept.invalides.length, 1);
  assert.match(sept.invalides[0], /« G »/);
  assert.strictEqual(sept.boites.length, 6);
  dansLaZone(sept);
  const une = geometrieSchema(schema("processus", ["Seule étape"]), ZONE);
  assert.strictEqual(une.invalides.length, 1);
  assert.strictEqual(une.boites.length, 1);
  dansLaZone(une);
});

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

test("cycle : de 3 à 6 étapes, autant de liens que de boîtes, dans la zone sans chevauchement", () => {
  for (let n = 3; n <= 6; n++) {
    const lignes = Array.from({ length: n }, (_, i) => `Étape du cycle ${i + 1}`);
    const geo = geometrieSchema(schema("cycle", lignes), ZONE);
    valide(geo);
    assert.strictEqual(geo.boites.length, n);
    assert.strictEqual(geo.liens.length, n);
    assert.ok(geo.liens.every((l) => l.fleche));
  }
});

test("cycle : le dernier lien revient à la première boîte", () => {
  const geo = geometrieSchema(schema("cycle", ["Planifier", "Faire", "Vérifier", "Ajuster"]), ZONE);
  const bords = (b) => [[b.x + b.w / 2, b.y], [b.x, b.y + b.h / 2], [b.x + b.w / 2, b.y + b.h], [b.x + b.w, b.y + b.h / 2]];
  geo.liens.forEach((l, i) => {
    const [de, a] = [geo.boites[i], geo.boites[(i + 1) % geo.boites.length]];
    assert.ok(bords(de).some((p) => proche(p, l.points[0])), `lien ${i} : départ hors des bords de « ${de.texte} »`);
    assert.ok(bords(a).some((p) => proche(p, l.points[l.points.length - 1])), `lien ${i} : arrivée hors des bords de « ${a.texte} »`);
  });
});

test("cycle : sous-puces en détail dans la boîte, sans chevauchement", () => {
  const lignes = [1, 2, 3, 4, 5, 6].flatMap((i) => [`Étape ${i}`, `  précision ${i}`]);
  const geo = geometrieSchema(schema("cycle", lignes, "Le cycle reprend chaque année."), ZONE);
  valide(geo);
  assert.deepStrictEqual(geo.boites[2].detail, ["précision 3"]);
  // Au moins 0,35 pouce entre deux cases, pour que la flèche entre elles se lise.
  ecartees(geo, 0.35);
});

test("cycle : l'entrée et la sortie d'une case ne partent pas du même point", () => {
  for (const n of [3, 4, 5, 6]) {
    const geo = geometrieSchema(schema("cycle", Array.from({ length: n }, (_, i) => `Étape ${i + 1}`)), ZONE);
    geo.boites.forEach((b, i) => {
      const sortie = geo.liens[i].points[0];
      const entree = geo.liens[(i + n - 1) % n].points.at(-1);
      assert.ok(!proche(sortie, entree), `cycle de ${n}, case ${i + 1} : entrée et sortie confondues`);
    });
  }
});

test("cycle : hors de 3 à 6, une alerte de données, sans exception", () => {
  const deux = geometrieSchema(schema("cycle", ["A", "B"]), ZONE);
  assert.strictEqual(deux.invalides.length, 1);
  assert.strictEqual(deux.boites.length, 2);
  const sept = geometrieSchema(schema("cycle", ["A", "B", "C", "D", "E", "F", "G"]), ZONE);
  assert.strictEqual(sept.invalides.length, 1);
  assert.strictEqual(sept.boites.length, 6);
  dansLaZone(sept);
  sansChevauchement(sept);
});

// ---------------------------------------------------------------------------
// Hiérarchie
// ---------------------------------------------------------------------------

// Chaque enfant est relié à son parent : un lien part du bas de l'un et finit en haut de l'autre.
function relie(geo, parent, enfant) {
  const p = geo.boites.find((b) => b.texte === parent);
  const e = geo.boites.find((b) => b.texte === enfant);
  assert.ok(p && e, `${parent} ou ${enfant} absent`);
  assert.ok(geo.liens.some((l) => proche(l.points[0], basCentre(p)) && proche(l.points[l.points.length - 1], hautCentre(e))),
    `« ${enfant} » n'est pas relié à « ${parent} »`);
}

test("hiérarchie : une tête, ses enfants reliés, le 3e rang en détail, dans la zone", () => {
  const geo = geometrieSchema(schema("hierarchie", [
    "Direction", "  Pôle ressources", "    Finances", "    Achats", "  Pôle services", "    Accueil", "  Pôle projets",
  ], "Organisation cible."), ZONE);
  valide(geo);
  assert.deepStrictEqual(geo.boites.map((b) => b.texte), ["Direction", "Pôle ressources", "Pôle services", "Pôle projets"]);
  assert.deepStrictEqual(geo.boites[1].detail, ["Finances", "Achats"]);
  assert.deepStrictEqual(geo.boites[3].detail, []);
  for (const enfant of ["Pôle ressources", "Pôle services", "Pôle projets"]) relie(geo, "Direction", enfant);
  // La tête est au-dessus de ses enfants.
  assert.ok(geo.boites.slice(1).every((b) => b.y > geo.boites[0].y + geo.boites[0].h));
});

test("hiérarchie : plusieurs racines, chacune reliée à ses enfants, sans chevauchement", () => {
  const geo = geometrieSchema(schema("hierarchie", [
    "Comité", "  Groupe A", "  Groupe B", "Secrétariat", "  Cellule", "    Appui", "Conseil",
  ]), ZONE);
  valide(geo);
  assert.strictEqual(geo.boites.length, 6);
  relie(geo, "Comité", "Groupe A");
  relie(geo, "Comité", "Groupe B");
  relie(geo, "Secrétariat", "Cellule");
  // Le parent est centré au-dessus de ses enfants.
  const [comite, a, b] = ["Comité", "Groupe A", "Groupe B"].map((t) => geo.boites.find((x) => x.texte === t));
  assert.ok(Math.abs(comite.x + comite.w / 2 - (a.x + b.x + b.w) / 2) < 1e-6);
});

test("hiérarchie : 0,3 pouce entre cases sœurs, 0,4 entre deux sous-arbres", () => {
  const geo = geometrieSchema(schema("hierarchie", ["Comité", "  Groupe A", "  Groupe B", "Secrétariat", "  Cellule"]), ZONE);
  valide(geo);
  const [a, b, c] = ["Groupe A", "Groupe B", "Cellule"].map((t) => geo.boites.find((x) => x.texte === t));
  assert.ok(ecartEntre(a, b) >= 0.3 - EPS && ecartEntre(a, b) < 0.4 - EPS, `sœurs : ${ecartEntre(a, b)}`);
  assert.ok(ecartEntre(b, c) >= 0.4 - EPS, `sous-arbres : ${ecartEntre(b, c)}`);
});

test("hiérarchie : la liste du 3e rang à 0,35 pouce de sa case", () => {
  const geo = geometrieSchema(schema("hierarchie", ["Tête", "  Service", "    une", "    deux"]), ZONE);
  const b = geo.boites.find((x) => x.texte === "Service");
  assert.ok(Math.abs(b.zoneDetail.y - (b.y + b.h) - 0.35) < 1e-6);
});

test("hiérarchie : au-delà de six colonnes, une alerte de données et un rendu tronqué dans la zone", () => {
  const lignes = ["Tête", ...Array.from({ length: 45 }, (_, i) => `  Enfant ${i + 1}`)];
  const geo = geometrieSchema(schema("hierarchie", lignes), ZONE);
  assert.strictEqual(geo.invalides.length, 1);
  assert.match(geo.invalides[0], /Enfant 7/);
  assert.strictEqual(geo.boites.length, 7);
  assert.ok(geo.boites.every((b) => b.w > 0));
  dansLaZone(geo);
  sansChevauchement(geo);
  const tetes = geometrieSchema(schema("hierarchie", Array.from({ length: 9 }, (_, i) => `Tête ${i + 1}`)), ZONE);
  assert.strictEqual(tetes.invalides.length, 1);
  assert.strictEqual(tetes.boites.length, 6);
});

test("hiérarchie : six enfants à trois détails chacun, dans la zone", () => {
  const lignes = ["Tête"];
  for (let i = 1; i <= 6; i++) lignes.push(`  Service ${i}`, "    une", "    deux", "    trois");
  const geo = geometrieSchema(schema("hierarchie", lignes, "Une phrase."), ZONE);
  valide(geo);
  assert.strictEqual(geo.boites.length, 7);
});

test("hiérarchie : un rang au-delà du troisième, une alerte de données", () => {
  const s = { type: "hierarchie", elements: [...elements("Tête", "  Enfant", "    Petit-enfant"), { texte: "Trop bas", niveau: 3, question: false }], legende: null };
  const geo = geometrieSchema(s, ZONE);
  assert.strictEqual(geo.invalides.length, 1);
  assert.match(geo.invalides[0], /Trop bas/);
  dansLaZone(geo);
});

// ---------------------------------------------------------------------------
// Logigramme
// ---------------------------------------------------------------------------

test("logigramme : un losange par question, une boîte par branche, étiquettes, dans la zone", () => {
  const geo = geometrieSchema(schema("logigramme", [
    "Réception de la demande", "? La demande est-elle complète ?", "  non : Demander les pièces manquantes",
    "Instruction", "? Avis favorable ?", "  non : Notifier le refus motivé", "Notification de l'accord",
  ]), ZONE);
  valide(geo);
  assert.strictEqual(geo.boites.length, 7);
  assert.deepStrictEqual(geo.boites.filter((b) => b.forme === "losange").map((b) => b.texte),
    ["La demande est-elle complète ?", "Avis favorable ?"]);
  const branche = geo.boites.find((b) => b.texte === "Demander les pièces manquantes");
  assert.ok(branche && branche.forme === "rect");
  const etiquettes = geo.liens.filter((l) => l.etiquette).map((l) => l.etiquette.texte);
  assert.deepStrictEqual(etiquettes.sort(), ["non", "non", "oui", "oui"]);
  // Le chemin principal : une flèche de chaque puce vers la suivante, plus une par branche.
  assert.strictEqual(geo.liens.length, 4 + 2);
});

const SIX_PUCES = [
  "Départ", "? Première question ?", "  non : Première branche", "Étape trois", "? Deuxième question ?",
  "  non : Deuxième branche", "    avec un détail", "Étape cinq", "Arrivée",
];

test("logigramme : six puces sur le chemin principal, dans la zone sans chevauchement", () => {
  const geo = geometrieSchema(schema("logigramme", SIX_PUCES), ZONE);
  valide(geo);
  assert.strictEqual(geo.boites.filter((b) => b.forme === "losange").length, 2);
  assert.strictEqual(geo.boites.length, 8);
  assert.deepStrictEqual(geo.boites.find((b) => b.texte === "Deuxième branche").detail, ["avec un détail"]);
});

test("logigramme : plancher de 12 pt (10 pt pour le détail), losange au plus 5 fois plus large que haut", () => {
  for (const legende of [null, "Une phrase sous le logigramme."]) {
    const geo = geometrieSchema(schema("logigramme", SIX_PUCES, legende), ZONE);
    assert.ok(geo.boites.every((b) => b.taille >= 12), JSON.stringify(geo.boites.map((b) => b.taille)));
    assert.ok(geo.boites.every((b) => !b.tailleDetail || b.tailleDetail >= 10));
    assert.ok(geo.boites.filter((b) => b.forme === "losange").every((b) => b.w / b.h <= 5 + 1e-6));
    dansLaZone(geo);
    sansChevauchement(geo);
    sansTraversee(geo);
  }
  // Avec la légende, six puces ne tiennent plus à 12 pt : débordement signalé, rien de plus petit.
  const charge = geometrieSchema(schema("logigramme", SIX_PUCES, "Une phrase sous le logigramme."), ZONE);
  assert.strictEqual(charge.debordements.length, 1);
  assert.match(charge.debordements[0], /12 pt/);
});

test("logigramme : sans branche, une colonne centrée", () => {
  const geo = geometrieSchema(schema("logigramme", ["Départ", "? Question ?", "Arrivée"]), ZONE);
  valide(geo);
  const centres = geo.boites.map((b) => b.x + b.w / 2);
  assert.ok(centres.every((c) => Math.abs(c - (ZONE.x + ZONE.w / 2)) < 1e-6));
});

test("logigramme : plus de 6 puces sur le chemin principal, une alerte de données, rendu borné", () => {
  const geo = geometrieSchema(schema("logigramme", ["1", "2", "3", "4", "5", "6", "7"]), ZONE);
  assert.strictEqual(geo.invalides.length, 1);
  assert.strictEqual(geo.boites.length, 6);
  dansLaZone(geo);
  sansChevauchement(geo);
});

test("logigramme : deux branches à une question, une alerte, la seconde jointe en détail", () => {
  const geo = geometrieSchema(schema("logigramme", ["Départ", "? Question ?", "  non : Branche A", "  plus tard : Branche B", "Arrivée"]), ZONE);
  assert.strictEqual(geo.invalides.length, 1);
  const branche = geo.boites.find((b) => b.texte === "Branche A");
  assert.deepStrictEqual(branche.detail, ["plus tard : Branche B"]);
  dansLaZone(geo);
  sansChevauchement(geo);
});

test("logigramme : une branche dont l'action contient un deux-points garde tout son texte", () => {
  const geo = geometrieSchema(schema("logigramme", ["Départ", "? Complet ?", "  Relancer le demandeur : sous huit jours", "Arrivée"]), ZONE);
  valide(geo);
  assert.ok(geo.boites.some((b) => b.texte === "Relancer le demandeur : sous huit jours"));
  assert.deepStrictEqual(geo.liens.filter((l) => l.etiquette).map((l) => l.etiquette.texte).sort(), ["non", "oui"]);
  const oui = geometrieSchema(schema("logigramme", ["Départ", "? Urgent ?", "  oui : Traiter le jour même", "Arrivée"]), ZONE);
  assert.ok(oui.boites.some((b) => b.texte === "Traiter le jour même"));
});

test("logigramme : une seule taille de texte pour cases et losanges, les branches pas plus grandes", () => {
  const geo = geometrieSchema(schema("logigramme", ["Réception", "? Le dossier est-il complet ?", "  non : Demander les pièces", "Instruction"]), ZONE);
  const principal = geo.boites.filter((b) => b.role !== "branche");
  assert.strictEqual(new Set(principal.map((b) => b.taille)).size, 1);
  assert.ok(geo.boites.filter((b) => b.role === "branche").every((b) => b.taille <= principal[0].taille));
});

// ---------------------------------------------------------------------------
// Liens : aucune traversée, longueur suffisante
// ---------------------------------------------------------------------------

const CAS_LIENS = [
  ...[2, 3, 4, 5, 6].flatMap((n) => [false, true].map((d) => ["processus", Array.from({ length: n }, (_, i) => [`Étape ${i + 1}`, ...(d ? [`  détail ${i + 1}`] : [])]).flat(), 0.6])),
  ...[3, 4, 5, 6].flatMap((n) => [false, true].map((d) => ["cycle", Array.from({ length: n }, (_, i) => [`Étape ${i + 1}`, ...(d ? [`  détail ${i + 1}`] : [])]).flat(), 0.5])),
  ["hierarchie", ["Tête", "  A", "    a1", "  B", "  C", "    c1"], 0],
  ["hierarchie", ["Comité", "  A", "  B", "Secrétariat", "  C", "    c1", "Conseil"], 0],
  ["logigramme", ["Départ", "? Question ?", "  non : Branche", "    détail", "Étape", "Arrivée"], 0.5],
  ["logigramme", ["Départ", "  détail", "? Question ?", "Arrivée"], 0.5],
];

test("liens : aucun ne traverse une case, avec ou sans détail ; flèches assez longues", () => {
  for (const legende of [null, "Une phrase."]) {
    for (const [type, lignes, minimum] of CAS_LIENS) {
      const geo = geometrieSchema(schema(type, lignes, legende), ZONE);
      sansTraversee(geo);
      for (const l of geo.liens.filter((x) => x.fleche)) {
        assert.ok(longueur(l) >= minimum - 1e-6, `${type} (${lignes.length} lignes) : flèche de ${longueur(l).toFixed(2)} pouce`);
      }
    }
  }
});

test("cycle de 3 : la flèche de la case 2 vers la case 3 reste hors des cases", () => {
  for (const lignes of [["A", "B", "C"], ["A", "  a", "B", "  b", "C", "  c"]]) {
    const geo = geometrieSchema(schema("cycle", lignes), ZONE);
    valide(geo);
    // Les deux cases du bas se font face : la flèche va de l'une à l'autre, à l'horizontale.
    const [p, q] = geo.liens[1].points;
    assert.ok(Math.abs(p[1] - q[1]) < 1e-6 && p[0] > q[0], JSON.stringify(geo.liens[1].points));
  }
});

test("processus de 3 étapes : cases d'au plus 2,8 pouces, flèches d'au moins 0,6, ensemble centré", () => {
  const geo = geometrieSchema(schema("processus", ["Avant", "Pendant", "Après"]), ZONE);
  valide(geo);
  assert.ok(geo.boites.every((b) => b.w <= 2.8 + 1e-9));
  assert.ok(geo.liens.every((l) => longueur(l) >= 0.6 - 1e-9));
  const gauche = geo.boites[0].x - ZONE.x;
  const droite = ZONE.x + ZONE.w - (geo.boites[2].x + geo.boites[2].w);
  assert.ok(Math.abs(gauche - droite) < 1e-6);
});

// ---------------------------------------------------------------------------
// Contrat commun
// ---------------------------------------------------------------------------

test("geometrieSchema est pure : l'entrée n'est pas modifiée, deux appels rendent le même résultat", () => {
  const s = schema("hierarchie", ["Tête", "  A", "    a1", "  B"], "Une phrase.");
  const copie = structuredClone(s);
  const z = { ...ZONE };
  const un = geometrieSchema(s, z);
  assert.deepStrictEqual(s, copie);
  assert.deepStrictEqual(z, ZONE);
  assert.deepStrictEqual(geometrieSchema(s, z), un);
});

test("texte trop long pour sa boîte : signalé en débordement, jamais avalé", () => {
  const long = "un libellé délibérément interminable qui ne tiendra jamais dans une boîte de processus ".repeat(4);
  const geo = geometrieSchema(schema("processus", ["Court", long]), ZONE);
  assert.strictEqual(geo.debordements.length, 1);
  // Un mot plus large que la boîte déborde aussi, même sur une seule ligne.
  const mot = geometrieSchema(schema("processus", ["A", "B", "C", "D", "E", "Anticonstitutionnellementissime"]), ZONE);
  assert.strictEqual(mot.debordements.length, 1);
});

test("légende : à 0,3 pouce sous le schéma, l'ensemble centré dans la zone", () => {
  const cas = [
    ["processus", ["A", "  détail", "B", "C"]],
    ["cycle", ["A", "B", "C", "D", "E", "F"]],
    ["hierarchie", ["Tête", "  A", "    a1", "  B"]],
    ["logigramme", ["A", "? Q ?", "  non : R", "B"]],
  ];
  for (const [type, lignes] of cas) {
    const geo = geometrieSchema(schema(type, lignes, "Une phrase sous le schéma."), ZONE);
    valide(geo);
    assert.strictEqual(geo.legende.texte, "Une phrase sous le schéma.");
    assert.ok(Math.abs(geo.legende.y - basSchema(geo) - 0.3) < 1e-6, `${type} : légende à ${geo.legende.y - basSchema(geo)}`);
    const haut = Math.min(...geo.boites.map((b) => b.y));
    const marge = haut - ZONE.y;
    assert.ok(Math.abs(marge - (ZONE.y + ZONE.h - geo.legende.y - geo.legende.h)) < 1e-6, `${type} : ensemble non centré`);
  }
});

test("élément de texte vide : une alerte de données, sans exception, pour chaque type", () => {
  for (const type of ["processus", "cycle", "hierarchie", "logigramme"]) {
    const s = { type, elements: [{ texte: "", niveau: 0, question: true }, { texte: "précision", niveau: 1, question: false }, ...elements("B", "C")], legende: null };
    const geo = geometrieSchema(s, ZONE);
    assert.ok(geo.invalides.some((m) => /sans texte/.test(m)), type);
  }
});

test("sous-puce sans puce au-dessus : une alerte de données", () => {
  const s = { type: "processus", elements: [{ texte: "orpheline", niveau: 1, question: false }, ...elements("B", "C")], legende: null };
  const geo = geometrieSchema(s, ZONE);
  assert.strictEqual(geo.invalides.length, 1);
  assert.match(geo.invalides[0], /orpheline/);
});

test("mot seul en dernière ligne : la largeur d'écriture est resserrée pour l'éviter", () => {
  const { couperLignes, motOrphelin } = require("../mesure.js");
  const geo = geometrieSchema(schema("cycle", ["Planifier les actions", "Mettre en œuvre", "Mesurer les effets", "Ajuster la feuille de route"]), ZONE);
  const b = geo.boites[3];
  const plein = b.w - 2 * (4 / 72 + 0.2929 * Math.min(0.12, b.h / 4));
  assert.ok(motOrphelin(couperLignes(b.texte, plein, { taille: b.taille, gras: true })), "le cas d'essai doit avoir un orphelin");
  assert.ok(b.resserre > 0);
  assert.ok(!motOrphelin(couperLignes(b.texte, plein - 2 * b.resserre, { taille: b.taille, gras: true })));
  assert.strictEqual(geo.boites[0].resserre, 0);
});

test("détail dans la case : jamais sous la taille minimale du détail", () => {
  const long = "un libellé long qui pousse la taille de la case vers son minimum ".repeat(2);
  const geo = geometrieSchema(schema("cycle", ["A", "  précision", "B", `${long}`, "C"]), ZONE);
  assert.ok(geo.boites[0].tailleDetail >= 10);
});

test("schéma sans type : un message lisible", () => {
  const geo = geometrieSchema(null, ZONE);
  assert.deepStrictEqual(geo.invalides.length, 1);
  assert.match(geo.invalides[0], /Schéma sans type/);
  assert.doesNotMatch(geo.invalides[0], /null|undefined/);
});

test("gabarit.borner : fonction pure, message seulement hors bornes", () => {
  const nom = (e) => e;
  assert.deepStrictEqual(gabarit.borner(["a", "b"], { min: 2, max: 3, quoi: "X", nom }), { liste: ["a", "b"], message: null });
  const trop = gabarit.borner(["a", "b", "c", "d"], { min: 2, max: 3, quoi: "X", nom });
  assert.deepStrictEqual(trop.liste, ["a", "b", "c"]);
  assert.match(trop.message, /de 2 à 3.*« d »/);
  assert.match(gabarit.borner(["a"], { min: 2, max: 3, quoi: "X", nom }).message, /Rendu tel quel/);
});

test("sans élément ou type inconnu : une alerte de données, aucune boîte", () => {
  for (const type of ["processus", "cycle", "hierarchie", "logigramme", "inconnu"]) {
    const geo = geometrieSchema({ type, elements: [], legende: null }, ZONE);
    assert.strictEqual(geo.invalides.length, 1, type);
    assert.deepStrictEqual(geo.boites, [], type);
  }
});

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

async function rendu(...lignes) {
  const r = await outils.rendu(md("# C", ...lignes));
  const xml = await r.xml(2);
  const t = textes(xml);
  return { alertes: r.alertes, xml, t, tout: t.join(" ") };
}
const formes = (xml, prst) => compte(xml, new RegExp(`<a:prstGeom prst="${prst}">`, "g"));
const pointes = (xml) => compte(xml, /<a:prstGeom prst="triangle">/g);

test("registre : le motif schéma est inscrit", () => {
  assert.strictEqual(typeof MOTIFS.schema, "function");
});

test("rendu processus : boîtes arrondies, flèches, détails et légende rendus une fois, dans les marges", async () => {
  const r = await rendu("## Le parcours", "Schéma : processus", "- Recueillir", "  - avec les équipes", "- Analyser", "- Décider", "Une phrase sous le schéma.");
  assert.deepStrictEqual(r.alertes, []);
  assert.strictEqual(formes(r.xml, "roundRect"), 3);
  assert.strictEqual(pointes(r.xml), 2);
  // Trait de 3 pt : 3 x 12 700 EMU.
  assert.match(r.xml, /<a:ln w="38100"/);
  for (const t of ["Recueillir", "avec les équipes", "Analyser", "Décider"]) assert.ok(r.t.includes(t), t);
  assert.strictEqual(r.t.filter((t) => t === "Une phrase sous le schéma.").length, 1);
  outils.dansLesMarges(r.xml);
});

test("rendu logigramme : losanges, branches et étiquettes, dans les marges", async () => {
  const r = await rendu("## La décision", "Schéma : logigramme", "- Réception", "- ? Dossier complet ?", "  - non : Relancer le demandeur", "- Instruction");
  assert.deepStrictEqual(r.alertes, []);
  assert.strictEqual(formes(r.xml, "diamond"), 1);
  for (const t of ["Dossier complet ?", "Relancer le demandeur", "non", "oui"]) assert.ok(r.t.includes(t), t);
  assert.ok(!r.tout.includes("non : "));
  outils.dansLesMarges(r.xml);
});

test("rendu cycle et hiérarchie : textes rendus, dans les marges", async () => {
  const c = await rendu("## Le cycle", "Schéma : cycle", "- Planifier", "- Faire", "- Vérifier", "- Ajuster");
  assert.deepStrictEqual(c.alertes, []);
  assert.strictEqual(pointes(c.xml), 4);
  outils.dansLesMarges(c.xml);
  const h = await rendu("## L'organisation", "Schéma : hiérarchie", "- Direction", "  - Pôle A", "    - Cellule", "  - Pôle B");
  assert.deepStrictEqual(h.alertes, []);
  for (const t of ["Direction", "Pôle A", "Cellule", "Pôle B"]) assert.ok(h.t.includes(t), t);
  outils.dansLesMarges(h.xml);
});

test("rendu chronologie : la frise dessine les étapes et sa légende, une seule fois", async () => {
  const r = await rendu("## Le calendrier", "Schéma : chronologie", "- 12/06 : lancement", "- 30/09 : bilan", "Une phrase sous la frise.");
  assert.deepStrictEqual(r.alertes, []);
  for (const t of ["12/06", "lancement", "30/09", "bilan"]) assert.ok(r.t.includes(t), t);
  assert.strictEqual(r.t.filter((t) => t === "Une phrase sous la frise.").length, 1);
});

test("rendu chronologie : pastilles bleu et or seulement, vert et orange réservés aux graphiques", async () => {
  const r = await rendu("## Le calendrier", "Schéma : chronologie", ...[1, 2, 3, 4, 5].map((i) => `- J${i} : étape ${i}`));
  const { VERT, ORANGE, BLEU, OR } = gabarit.COULEURS;
  assert.doesNotMatch(r.xml, new RegExp(`${VERT}|${ORANGE}`));
  assert.match(r.xml, new RegExp(BLEU));
  assert.match(r.xml, new RegExp(OR));
  outils.dansLesMarges(r.xml);
});

test("rendu d'un élément vide : DONNEES_INVALIDES, sans exception", async () => {
  const r = await rendu("## Vide", "Schéma : cycle", "- ?", "  - précision", "- B", "- C");
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  assert.ok(r.t.includes("précision"));
});

test("rendu hors bornes : DONNEES_INVALIDES à la ligne du ##, sans exception", async () => {
  const r = await rendu("## Trop d'étapes", "Schéma : processus", ...["A", "B", "C", "D", "E", "F", "G"].map((x) => `- ${x}`));
  assert.deepStrictEqual(codes(r), [[2, "DONNEES_INVALIDES"]]);
  assert.ok(!r.t.includes("G"));
  const vide = await rendu("## Rien", "Schéma : cycle", "Une phrase seule.");
  assert.deepStrictEqual(codes(vide), [[2, "DONNEES_INVALIDES"]]);
});

test("rendu d'un logigramme trop chargé : TEXTE_TROP_LONG, pas de texte sous 12 pt", async () => {
  const r = await rendu("## Chargé", "Schéma : logigramme", ...SIX_PUCES.map((l) => `${l.match(/^ */)[0]}- ${l.trim()}`), "Une phrase sous le logigramme.");
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
  const tailles = [...r.xml.matchAll(/sz="(\d+)"/g)].map((m) => Number(m[1]) / 100);
  assert.ok(tailles.every((t) => t >= 10), tailles.join(" "));
  outils.dansLesMarges(r.xml);
});

test("rendu d'un texte trop long : TEXTE_TROP_LONG à la ligne du ##", async () => {
  const long = "un libellé délibérément interminable qui ne tiendra jamais dans une boîte ".repeat(5);
  const r = await rendu("## Trop long", "Schéma : cycle", "- A", "- B", `- ${long}`);
  assert.deepStrictEqual(codes(r), [[2, "TEXTE_TROP_LONG"]]);
});

test("fixture schemas.md : un schéma de chaque type, rendus sans alerte", async () => {
  const source = fs.readFileSync(path.join(__dirname, "fixtures", "schemas.md"), "utf8");
  const r = await outils.rendu(source);
  const types = r.doc.diapos.filter((d) => d.motif === "schema").map((d) => d.schema.type);
  assert.deepStrictEqual(types.sort(), ["chronologie", "cycle", "hierarchie", "logigramme", "processus"]);
  assert.deepStrictEqual(r.doc.alertes, []);
  assert.deepStrictEqual(r.alertes, []);
  for (let n = 1; n <= r.noms.length; n++) if (r.doc.diapos[n - 1].type === "contenu") outils.dansLesMarges(await r.xml(n));
});
