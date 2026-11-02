// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Les défauts typographiques contrôlés sont écrits entre accents graves ou en
// séquence d'échappement : le vérificateur de texte de l'atelier les tolère ainsi.
const test = require("node:test");
const assert = require("node:assert");
const { analyser } = require("../analyseur.js");
const { controlerTexte } = require("../controles.js");

const md = (...lignes) => lignes.join("\n");
const ENTETE = [
  "---", "titre: Essai", "objet: Contrôles", "mots_cles: essai", "categorie: Présentation",
  "commentaires: Essai automatique", "client: Une collectivité", "date: 2026-10-30", "logo_client: logo.png", "---",
];
const avecEntete = (...lignes) => md(...ENTETE, ...lignes);
const alertes = (...lignes) => controlerTexte(analyser(avecEntete(...lignes)));
const parCode = (liste, code) => liste.filter((a) => a.code === code).map((a) => a.ligne);
const LIBELLE = `Le Comptoir des Signaux`;
const CADRATIN = "\u2014";

test("un en-tête complet ne déclenche rien sur un document propre", () => {
  assert.deepStrictEqual(alertes("# Couverture", "## Une diapositive", "- une puce"), []);
});

test("Chiffres clés sans Source : SOURCE_MANQUANTE à la ligne du ##", () => {
  const liste = alertes("# C", "## En chiffres", "Chiffres clés :", "- 42 % : des agents");
  assert.deepStrictEqual(parCode(liste, "SOURCE_MANQUANTE"), [12]);
  assert.match(liste.find((a) => a.code === "SOURCE_MANQUANTE").message, /source/i);
});

test("SOURCE_MANQUANTE : graphique, radar et chaleur aussi ; la ligne Source l'éteint", () => {
  const tableau = ["| A | B |", "|---|---|", "| x | 1 |"];
  for (const directive of ["Graphique : barres", "Radar :", "Carte de chaleur :"]) {
    assert.deepStrictEqual(parCode(alertes("# C", "## G", directive, ...tableau), "SOURCE_MANQUANTE"), [12], directive);
    assert.deepStrictEqual(parCode(alertes("# C", "## G", directive, ...tableau, "Source : rapport, p. 3"), "SOURCE_MANQUANTE"), [], directive);
  }
  assert.deepStrictEqual(parCode(alertes("# C", "## T", ...tableau), "SOURCE_MANQUANTE"), []);
});

test("trois diapositives cartes consécutives : MOTIF_REPETE sur la troisième", () => {
  const cartes = (titre) => [`## ${titre}`, "Cartes :", "### Un", "- a", "### Deux", "- b"];
  const liste = alertes("# C", ...cartes("Première"), ...cartes("Deuxième"), ...cartes("Troisième"));
  assert.deepStrictEqual(parCode(liste, "MOTIF_REPETE"), [24]);
});

test("MOTIF_REPETE : une section interrompt la série, deux à la suite ne suffisent pas", () => {
  const puce = (titre) => [`## ${titre}`, "- a"];
  assert.deepStrictEqual(parCode(alertes("# C", ...puce("Un"), ...puce("Deux"), "# Partie", ...puce("Trois")), "MOTIF_REPETE"), []);
  assert.deepStrictEqual(parCode(alertes("# C", ...puce("Un"), ...puce("Deux"), ...puce("Trois"), ...puce("Quatre")), "MOTIF_REPETE"), [16]);
});

test("tiret cadratin dans un titre : TYPO_CADRATIN à la ligne de la diapositive", () => {
  const liste = alertes("# C", `## Le constat ${CADRATIN} et la suite`, "- a");
  assert.deepStrictEqual(parCode(liste, "TYPO_CADRATIN"), [12]);
});

test("tiret cadratin ailleurs : puce, notes, cellule, schéma, en-tête", () => {
  assert.deepStrictEqual(parCode(alertes("# C", "## A", `- une puce ${CADRATIN} longue`), "TYPO_CADRATIN"), [12]);
  assert.deepStrictEqual(parCode(alertes("# C", "## A", "- a", `Notes : dire ${CADRATIN} ceci`), "TYPO_CADRATIN"), [12]);
  assert.deepStrictEqual(parCode(alertes("# C", "## A", "| x |", "|---|", `| a ${CADRATIN} b |`), "TYPO_CADRATIN"), [12]);
  assert.deepStrictEqual(parCode(alertes("# C", "## A", "Schéma : processus", `- un ${CADRATIN} deux`, "- trois"), "TYPO_CADRATIN"), [12]);
  assert.deepStrictEqual(parCode(alertes("# C", "## A", "- a", `Pied : un pied ${CADRATIN} bref`), "TYPO_CADRATIN"), [12]);
  const entete = controlerTexte(analyser(md("---", `objet: Un objet ${CADRATIN} bref`, "---", "# C")));
  assert.deepStrictEqual(parCode(entete, "TYPO_CADRATIN"), [1]);
});

test("nommage : en sous-titre de couverture, TYPO_NOMMAGE ; dans une phrase, rien", () => {
  assert.deepStrictEqual(parCode(alertes("# Formation IA", LIBELLE), "TYPO_NOMMAGE"), [11]);
  assert.deepStrictEqual(parCode(alertes("# Formation IA", "## A", "- avec le Comptoir des Signaux"), "TYPO_NOMMAGE"), []);
  assert.deepStrictEqual(parCode(alertes("# Formation IA", "## A", `- ${LIBELLE} accompagne les agents`), "TYPO_NOMMAGE"), []);
  assert.deepStrictEqual(parCode(alertes("# Formation IA", `## ${LIBELLE}`), "TYPO_NOMMAGE"), [12]);
  assert.deepStrictEqual(parCode(alertes("# Formation IA", "Comptoir des Signaux"), "TYPO_NOMMAGE"), []);
});

test("un défaut cité exprès entre « » courts ou accents graves n'alerte pas", () => {
  assert.deepStrictEqual(alertes("# C", "## A", `- écrire « ${CADRATIN} » est proscrit`), []);
  assert.deepStrictEqual(alertes("# C", "## A", "- le libellé `" + LIBELLE + "` est proscrit"), []);
});

test("Qualiopi : TYPO_QUALIOPI", () => {
  assert.deepStrictEqual(parCode(alertes("# C", "## A", "- Organisme Qualiopi"), "TYPO_QUALIOPI"), [12]);
  assert.deepStrictEqual(parCode(alertes("# C", "## A", "- a", "Notes : rappeler la démarche qualiopi"), "TYPO_QUALIOPI"), [12]);
});

test("sans en-tête : META_MANQUANTE et LOGO_CLIENT_ABSENT", () => {
  const liste = controlerTexte(analyser(md("# C", "## A", "- a")));
  assert.deepStrictEqual(liste.map((a) => a.code).sort(), ["LOGO_CLIENT_ABSENT", "META_MANQUANTE"]);
  const meta = liste.find((a) => a.code === "META_MANQUANTE");
  assert.strictEqual(meta.ligne, 1);
  for (const cle of ["titre", "objet", "mots_cles", "categorie", "commentaires", "client", "date"]) assert.match(meta.message, new RegExp(cle));
});

test("en-tête partiel : META_MANQUANTE ne nomme que les clés absentes", () => {
  const liste = controlerTexte(analyser(md("---", "titre: Essai", "logo_client: logo.png", "---", "# C")));
  assert.deepStrictEqual(liste.map((a) => a.code), ["META_MANQUANTE"]);
  assert.doesNotMatch(liste[0].message, /titre/);
  assert.match(liste[0].message, /objet/);
});

test("chaque alerte a ligne, code et message", () => {
  for (const a of controlerTexte(analyser(md("# C", `## A ${CADRATIN} B`, "Chiffres clés :", "- 1 : a")))) {
    assert.strictEqual(typeof a.ligne, "number");
    assert.strictEqual(typeof a.code, "string");
    assert.ok(a.message.length > 0);
  }
});
