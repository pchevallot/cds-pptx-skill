// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const { analyser } = require("../analyseur.js");

const md = (...lignes) => lignes.join("\n");
const BASE = fs.readFileSync(path.join(__dirname, "fixtures", "base.md"), "utf8");
const codes = (doc) => doc.alertes.map((a) => a.code);
const contenu = (...lignes) => analyser(md("# Couverture", "", ...lignes)).diapos[1];

test("base.md : huit diapositives, types, motifs et titres", () => {
  const doc = analyser(BASE);
  assert.deepStrictEqual(doc.diapos.map((d) => [d.type, d.motif, d.titre]), [
    ["couverture", null, "Le tableau unique des suites"],
    ["section", null, "Pourquoi un tableau unique"],
    ["contenu", "puces", "Un pilote unique par suite"],
    ["contenu", "deux-colonnes", "Avant et après"],
    ["contenu", "tableau", "Les colonnes qui posent question"],
    ["contenu", "schema", "Le parcours d'une suite"],
    ["contenu", "schema", "Une suite se clôt en séance"],
    ["contenu", "image", "Le nouveau luminaire"],
  ]);
  assert.deepStrictEqual(doc.alertes, []);
});

test("base.md : couverture, section, accroche, puces et notes", () => {
  const [couv, section, pilote] = analyser(BASE).diapos;
  // « Auteur : » est une donnée d'en-tête du format d'origine : jamais affichée, jamais stockée.
  assert.deepStrictEqual(couv.sousTitre, ["CODIR du 29/10/2026", "Direction générale"]);
  assert.strictEqual(couv.ligne, 1);
  assert.deepStrictEqual(section.sousTitre, ["Un seul endroit pour savoir qui fait quoi, et pour quand"]);
  assert.strictEqual(pilote.accroche, "Une suite sans pilote nommé n'est pas une suite.");
  assert.deepStrictEqual(pilote.blocs, [
    { texte: "Une seule personne, nommée", niveau: 1, numero: null },
    { texte: "les autres sont contributeurs ou informés", niveau: 2, numero: null },
    { texte: "Une date prévue au jour près", niveau: 1, numero: null },
  ]);
  assert.deepStrictEqual(pilote.notes, ["Insister sur le pilote unique : c'est la règle qui change le plus les habitudes."]);
});

test("base.md : colonnes et tableau", () => {
  const d = analyser(BASE).diapos;
  assert.deepStrictEqual(d[3].colonnes, [
    { titre: "Aujourd'hui", blocs: [{ texte: "Les suites sont dispersées", niveau: 1, numero: null }] },
    { titre: "Demain", blocs: [{ texte: "Un tableau unique, repris à chaque réunion", niveau: 1, numero: null }] },
  ]);
  assert.deepStrictEqual(d[4].tableau, {
    entetes: ["Colonne", "Ce qu'on y écrit"],
    rangees: [["Pilote", "Une seule personne, nommée"], ["Date prévue", "JJ/MM/AAAA"]],
  });
});

test("base.md : schéma de 4 éléments en liste plate, logigramme et image à droite", () => {
  const d = analyser(BASE).diapos;
  assert.deepStrictEqual(d[5].schema, {
    type: "processus",
    elements: [
      { texte: "Décision en séance", niveau: 0, question: false },
      { texte: "notée au compte rendu", niveau: 1, question: false },
      { texte: "Inscription au tableau", niveau: 0, question: false },
      { texte: "Clôture en séance", niveau: 0, question: false },
    ],
    legende: null,
  });
  assert.deepStrictEqual(d[6].schema.elements, [
    { texte: "Point d'avancement en réunion", niveau: 0, question: false },
    { texte: "Le livrable est-il remis ?", niveau: 0, question: true },
    { texte: "non : Le pilote propose une nouvelle date", niveau: 1, question: false },
    { texte: "La suite passe à « Clos »", niveau: 0, question: false },
  ]);
  assert.strictEqual(d[6].schema.type, "logigramme");
  assert.deepStrictEqual(d[7].image, { chemin: "photo.jpg", legende: "Photo d'un driver LED Zhaga", position: "droite" });
  assert.deepStrictEqual(d[7].blocs, [{ texte: "Un driver remplaçable sans changer le luminaire", niveau: 1, numero: null }]);
});

test("aucun champ n'est undefined : valeurs vides stables", () => {
  const CHAMPS = ["ligne", "type", "titre", "sousTitre", "accroche", "notes", "motif", "blocs", "colonnes",
    "tableau", "schema", "chiffres", "graphique", "icones", "citation", "prompt", "image", "libre", "source", "contact", "couleurs", "pied"];
  for (const d of analyser(BASE).diapos) {
    assert.deepStrictEqual(Object.keys(d).sort(), [...CHAMPS].sort());
    for (const c of CHAMPS) assert.notStrictEqual(d[c], undefined, `${d.titre} : ${c}`);
  }
  const pilote = analyser(BASE).diapos[2];
  assert.deepStrictEqual(
    [pilote.tableau, pilote.schema, pilote.graphique, pilote.citation, pilote.prompt, pilote.image, pilote.libre, pilote.source, pilote.couleurs, pilote.pied],
    [null, null, null, null, null, null, null, null, null, null]);
  assert.deepStrictEqual([pilote.chiffres, pilote.icones, pilote.colonnes, pilote.contact, pilote.sousTitre], [[], [], [], [], []]);
  const couv = analyser(BASE).diapos[0];
  assert.strictEqual(couv.accroche, null);
});

test("BOM et CRLF : même document qu'en LF", () => {
  const crlf = "\uFEFF" + BASE.replace(/\n/g, "\r\n");
  assert.deepStrictEqual(analyser(crlf), analyser(BASE));
  assert.deepStrictEqual(analyser(crlf).diapos.map((d) => d.titre), analyser(BASE).diapos.map((d) => d.titre));
});

test("en-tête YAML : clés de Meta, guillemets facultatifs, valeurs absentes à null", () => {
  const doc = analyser(md(
    "---",
    "titre: \"Formation IA, juin 2026\"",
    "objet: Sensibilisation des encadrants",
    "mots_cles: 'IA ; encadrants'",
    "date: 2026-06-12",
    "logo_client: logos/client.png",
    "---",
    "# Couverture"));
  assert.deepStrictEqual(doc.meta, {
    titre: "Formation IA, juin 2026", objet: "Sensibilisation des encadrants", mots_cles: "IA ; encadrants",
    categorie: null, commentaires: null, client: null, date: "2026-06-12", logo_client: "logos/client.png", cotraitant: null,
  });
  assert.deepStrictEqual(doc.alertes, []);
  assert.strictEqual(doc.diapos[0].ligne, 8);
});

test("en-tête YAML : une clé inconnue déclenche DIRECTIVE_INCONNUE à sa ligne", () => {
  const doc = analyser(md("---", "titre: Essai", "auteur: Quelqu'un", "---", "# Couverture"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[3, "DIRECTIVE_INCONNUE"]]);
  assert.strictEqual(doc.meta.titre, "Essai");
});

test("sans en-tête : Meta complète, à null", () => {
  assert.deepStrictEqual(analyser("# Couverture").meta, {
    titre: null, objet: null, mots_cles: null, categorie: null, commentaires: null,
    client: null, date: null, logo_client: null, cotraitant: null,
  });
});

test("Cartes : un ### par carte, ses puces dans blocs", () => {
  const d = contenu("## Trois leviers", "Cartes :", "### Former", "- Des ateliers courts", "### Outiller", "- Un espace partagé", "  - ouvert à tous");
  assert.strictEqual(d.motif, "cartes");
  assert.deepStrictEqual(d.colonnes, [
    { titre: "Former", blocs: [{ texte: "Des ateliers courts", niveau: 1, numero: null }] },
    { titre: "Outiller", blocs: [{ texte: "Un espace partagé", niveau: 1, numero: null }, { texte: "ouvert à tous", niveau: 2, numero: null }] },
  ]);
});

test("Cartes et Chiffres clés : couleurs de signal dans l'ordre des éléments, sans accent ni casse", () => {
  const cartes = analyser(md("# C", "## Trois", "Cartes : Rouge, orange , gris", "### A", "- a", "### B", "- b", "### C", "- c"));
  assert.deepStrictEqual(cartes.alertes, []);
  assert.deepStrictEqual(cartes.diapos[1].couleurs, ["rouge", "orange", "gris"]);
  const chiffres = analyser(md("# C", "## Deux", "Chiffres clés : vert, orange", "- 1 : un", "- 2 : deux", "Source : essai"));
  assert.deepStrictEqual(chiffres.alertes, []);
  assert.deepStrictEqual(chiffres.diapos[1].couleurs, ["vert", "orange"]);
  assert.strictEqual(analyser(md("# C", "## Sans", "Cartes :", "### A", "- a", "### B", "- b")).diapos[1].couleurs, null);
});

test("couleurs de signal : nom inconnu ou nombre faux, DONNEES_INVALIDES à la ligne de la directive, rotation", () => {
  const inconnu = analyser(md("# C", "## Deux", "Cartes : rouge, fuchsia", "### A", "- a", "### B", "- b"));
  assert.deepStrictEqual(inconnu.alertes.map((a) => [a.ligne, a.code]), [[3, "DONNEES_INVALIDES"]]);
  assert.match(inconnu.alertes[0].message, /fuchsia.*bleu, or, gris, vert, orange ou rouge/);
  assert.strictEqual(inconnu.diapos[1].couleurs, null);
  assert.strictEqual(inconnu.diapos[1].motif, "cartes");
  const nombre = analyser(md("# C", "## Trois", "Chiffres clés : vert, orange", "- 1 : un", "- 2 : deux", "- 3 : trois", "Source : essai"));
  assert.deepStrictEqual(nombre.alertes.map((a) => [a.ligne, a.code]), [[3, "DONNEES_INVALIDES"]]);
  assert.match(nombre.alertes[0].message, /2 couleurs pour 3 chiffres/);
  assert.strictEqual(nombre.diapos[1].couleurs, null);
});

test("Blocs : trois ### acceptés, sans limite contrôlée par l'analyseur", () => {
  const doc = analyser(md("# C", "## Les couches", "Blocs :", "### Données", "- Le pilotage", "### Modèles", "- Le moteur", "### Usages", "- La valeur"));
  const d = doc.diapos[1];
  assert.strictEqual(d.motif, "blocs");
  assert.deepStrictEqual(d.colonnes.map((c) => [c.titre, c.blocs[0].texte]), [["Données", "Le pilotage"], ["Modèles", "Le moteur"], ["Usages", "La valeur"]]);
  assert.deepStrictEqual(doc.alertes, []);
});

test("Chiffres clés : valeur et libellé coupés au premier « : », source", () => {
  const d = contenu("## En chiffres", "Chiffres clés :", "- 42 % : des agents utilisent déjà l'outil", "- 3 : directions pilotes : RH, finances, urbanisme",
    "Source : enquête interne, mars 2026, p. 4");
  assert.strictEqual(d.motif, "chiffres");
  assert.deepStrictEqual(d.chiffres, [
    { valeur: "42 %", libelle: "des agents utilisent déjà l'outil" },
    { valeur: "3", libelle: "directions pilotes : RH, finances, urbanisme" },
  ]);
  assert.strictEqual(d.source, "enquête interne, mars 2026, p. 4");
  assert.deepStrictEqual(d.blocs, []);
});

test("Graphique : barres, la cellule 12,5 devient 12.5", () => {
  const d = contenu("## Budget", "Graphique : barres", "| Année | Budget |", "|---|---|", "| 2025 | 12,5 |");
  assert.strictEqual(d.motif, "graphique");
  assert.deepStrictEqual(d.graphique, { type: "barres", categories: ["2025"], series: [{ nom: "Budget", valeurs: [12.5] }] });
  assert.strictEqual(d.tableau, null);
});

test("Graphique : espaces insécables, pourcentage et cellule invalide à null avec sa ligne", () => {
  const doc = analyser(md("# C", "## Évolution", "Graphique : courbes",
    "| Année | Agents | Taux |", "|---|---|---|",
    "| 2024 | 1\u00A0234,5 | 45 % |",
    "| 2025 | n.c. | 50% |",
    "| 2026 | 1 500 |"));
  const g = doc.diapos[1].graphique;
  assert.strictEqual(g.type, "courbes");
  assert.deepStrictEqual(g.categories, ["2024", "2025", "2026"]);
  assert.deepStrictEqual(g.series, [{ nom: "Agents", valeurs: [1234.5, null, 1500] }, { nom: "Taux", valeurs: [45, 50, null] }]);
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[7, "DONNEES_INVALIDES"], [8, "DONNEES_INVALIDES"]]);
});

test("Graphique : type inconnu, DIRECTIVE_INCONNUE", () => {
  const doc = analyser(md("# C", "## Budget", "Graphique : camembert", "| A | B |", "|---|---|", "| x | 1 |"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[3, "DIRECTIVE_INCONNUE"]]);
  assert.notStrictEqual(doc.diapos[1].motif, "graphique");
});

test("Radar : graphique de type radar, une série par colonne", () => {
  const d = contenu("## Maturité", "Radar :", "| Dimension | 2025 | 2026 |", "|---|---|---|", "| Pilotage | 2 | 3 |", "| Outils | 1 | 4 |");
  assert.strictEqual(d.motif, "radar");
  assert.deepStrictEqual(d.graphique, {
    type: "radar", categories: ["Pilotage", "Outils"],
    series: [{ nom: "2025", valeurs: [2, 1] }, { nom: "2026", valeurs: [3, 4] }],
  });
});

test("Carte de chaleur : graphique de type chaleur", () => {
  const d = contenu("## Exposition", "Carte de chaleur :", "| Métier | Rédaction | Analyse |", "|---|---|---|", "| Accueil | 3 | 1 |");
  assert.strictEqual(d.motif, "chaleur");
  assert.deepStrictEqual(d.graphique, { type: "chaleur", categories: ["Accueil"], series: [{ nom: "Rédaction", valeurs: [3] }, { nom: "Analyse", valeurs: [1] }] });
});

test("Icônes : nom, titre et description ; Icones sans accent passe", () => {
  for (const directive of ["Icônes :", "Icones :", "ICÔNES :"]) {
    const d = contenu("## Les règles", directive, "- FaShieldAlt : Sécurité : des données protégées", "- FaUsers : Équipe : un pilote : nommé");
    assert.strictEqual(d.motif, "icones", directive);
    assert.deepStrictEqual(d.icones, [
      { icone: "FaShieldAlt", titre: "Sécurité", description: "des données protégées" },
      { icone: "FaUsers", titre: "Équipe", description: "un pilote : nommé" },
    ]);
  }
});

test("Citation : le texte puis l'auteur", () => {
  const d = contenu("## Une parole", "Citation :", "L'outil est un prétexte,", "la décision est le sujet.", "Auteur : Une directrice générale des services");
  assert.strictEqual(d.motif, "citation");
  assert.deepStrictEqual(d.citation, { texte: "L'outil est un prétexte, la décision est le sujet.", auteur: "Une directrice générale des services" });
  assert.deepStrictEqual(d.blocs, []);
});

test("Prompt : intro avant le bloc, texte brut du bloc (un # n'y est pas un titre)", () => {
  const doc = analyser(md("# C", "## Le prompt", "Prompt :", "À copier tel quel", "dans l'assistant.", "```",
    "# Rôle", "Tu es un juriste.", "  - garde la structure", "```", "## Suite"));
  const d = doc.diapos[1];
  assert.strictEqual(d.motif, "prompt");
  assert.deepStrictEqual(d.prompt, { intro: "À copier tel quel dans l'assistant.", texte: "# Rôle\nTu es un juriste.\n  - garde la structure" });
  assert.strictEqual(doc.diapos.length, 3);
});

test("Décodage : les puces vont dans blocs", () => {
  const d = contenu("## Ce qui a marché", "Décodage :", "- Le rôle a cadré le ton", "- L'exemple a fixé le format");
  assert.strictEqual(d.motif, "decodage");
  assert.deepStrictEqual(d.blocs, [
    { texte: "Le rôle a cadré le ton", niveau: 1, numero: null },
    { texte: "L'exemple a fixé le format", niveau: 1, numero: null },
  ]);
});

test("Image : gauche, sous des puces", () => {
  const d = contenu("## Le terrain", "Image : gauche", "- Un poste partagé", "![La salle du conseil](salle.jpg)");
  assert.strictEqual(d.motif, "image");
  assert.deepStrictEqual(d.image, { chemin: "salle.jpg", legende: "La salle du conseil", position: "gauche" });
  assert.strictEqual(d.blocs.length, 1);
});

test("Diapositive libre : le chemin du module", () => {
  const d = contenu("## Trois cercles", "Diapositive libre : venn-trois-cercles.js");
  assert.strictEqual(d.motif, "libre");
  assert.deepStrictEqual(d.libre, { chemin: "venn-trois-cercles.js" });
});

test("Schéma : hiérarchie et chronologie, sans accent dans le type, légende sous le schéma", () => {
  const h = contenu("## L'organisation", "Schéma : hiérarchie", "- Direction", "  - Service A", "    - Cellule", "Une phrase sous le schéma.");
  assert.deepStrictEqual(h.schema, {
    type: "hierarchie",
    elements: [
      { texte: "Direction", niveau: 0, question: false },
      { texte: "Service A", niveau: 1, question: false },
      { texte: "Cellule", niveau: 2, question: false },
    ],
    legende: "Une phrase sous le schéma.",
  });
  const c = contenu("## Le calendrier", "Schema : chronologie", "- 12/06 : lancement", "- 30/09 : bilan");
  assert.deepStrictEqual(c.schema.elements.map((e) => e.texte), ["12/06 : lancement", "30/09 : bilan"]);
  assert.strictEqual(c.schema.type, "chronologie");
});

test("Schéma : puce plus profonde que le 3e rang, DONNEES_INVALIDES à sa ligne, ramenée au niveau 2", () => {
  const doc = analyser(md("# C", "## L'organisation", "Schéma : hiérarchie", "- Direction", "  - Service", "    - Cellule", "      - Trop bas"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[7, "DONNEES_INVALIDES"]]);
  assert.match(doc.alertes[0].message, /Trop bas/);
  assert.deepStrictEqual(doc.diapos[1].schema.elements.at(-1), { texte: "Trop bas", niveau: 2, question: false });
});

test("Schéma : type inconnu, DIRECTIVE_INCONNUE et ligne affichée", () => {
  const doc = analyser(md("# C", "## Titre", "Schéma : spirale", "- un"));
  assert.deepStrictEqual(codes(doc), ["DIRECTIVE_INCONNUE"]);
  assert.strictEqual(doc.diapos[1].motif, "puces");
  assert.strictEqual(doc.diapos[1].blocs[0].texte, "Schéma : spirale");
});

test("motifs par défaut : deux ###, tableau seul, image seule en pleine", () => {
  assert.strictEqual(contenu("## A", "### G", "- g", "### D", "- d").motif, "deux-colonnes");
  assert.strictEqual(contenu("## A", "| x | y |", "|---|---|", "| 1 | 2 |").motif, "tableau");
  const img = contenu("## A", "![Le site](site.png)");
  assert.strictEqual(img.motif, "image");
  assert.deepStrictEqual(img.image, { chemin: "site.png", legende: "Le site", position: "pleine" });
  assert.strictEqual(contenu("## A", "- une puce").motif, "puces");
});

test("plus de deux ### sans directive : DONNEES_INVALIDES, deux colonnes gardées", () => {
  const doc = analyser(md("# C", "## A", "### Un", "- 1", "### Deux", "- 2", "### Trois", "- 3"));
  const d = doc.diapos[1];
  assert.strictEqual(d.motif, "deux-colonnes");
  assert.deepStrictEqual(d.colonnes.map((c) => c.titre), ["Un", "Deux"]);
  assert.deepStrictEqual(d.colonnes[1].blocs.map((b) => b.texte), ["2"]);
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[7, "DONNEES_INVALIDES"]]);
});

test("liste numérotée : numero renseigné", () => {
  assert.deepStrictEqual(contenu("## Étapes", "1. Lire", "2. Écrire").blocs, [
    { texte: "Lire", niveau: 1, numero: 1 },
    { texte: "Écrire", niveau: 1, numero: 2 },
  ]);
});

test("directive inconnue en position : alerte, ligne gardée en texte ; phrase ordinaire ou hors position : rien", () => {
  const doc = analyser(md("# C", "## A", "Pourquoi :", "- une puce"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[3, "DIRECTIVE_INCONNUE"]]);
  assert.strictEqual(doc.diapos[1].blocs[0].texte, "Pourquoi :");
  const apresAccroche = analyser(md("# C", "## A", "Accroche : Une phrase.", "Attention : prudence"));
  assert.deepStrictEqual(codes(apresAccroche), ["DIRECTIVE_INCONNUE"]);
  assert.strictEqual(apresAccroche.diapos[1].accroche, "Une phrase.");
  const phrase = analyser(md("# C", "## A", "Le constat est simple : on manque de temps"));
  assert.deepStrictEqual(phrase.alertes, []);
  assert.strictEqual(phrase.diapos[1].blocs[0].texte, "Le constat est simple : on manque de temps");
  const horsPosition = analyser(md("# C", "## A", "- une puce", "Exemple : voilà"));
  assert.deepStrictEqual(horsPosition.alertes, []);
  assert.strictEqual(horsPosition.diapos[1].blocs[1].texte, "Exemple : voilà");
});

test("deuxième visuel : VISUEL_EN_DOUBLE, le premier est gardé", () => {
  const doc = analyser(md("# C", "## A", "| x | y |", "|---|---|", "| 1 | 2 |", "![Une photo](p.jpg)"));
  const d = doc.diapos[1];
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[6, "VISUEL_EN_DOUBLE"]]);
  assert.strictEqual(d.motif, "tableau");
  assert.strictEqual(d.image, null);
  const schema = analyser(md("# C", "## A", "Schéma : cycle", "- a", "- b", "- c", "| x |", "|---|", "| 1 |"));
  assert.deepStrictEqual(codes(schema), ["VISUEL_EN_DOUBLE"]);
  assert.strictEqual(schema.diapos[1].tableau, null);
  assert.strictEqual(schema.diapos[1].schema.elements.length, 3);
});

test("Source : sur toute diapositive ; Notes : sur plusieurs lignes", () => {
  const doc = analyser(md("# C", "## A", "- une puce", "Source : rapport annuel 2025, p. 12", "Notes : premier point", "- second point", "", "troisième"));
  const d = doc.diapos[1];
  assert.strictEqual(d.source, "rapport annuel 2025, p. 12");
  assert.deepStrictEqual(d.notes, ["premier point", "second point", "troisième"]);
  assert.deepStrictEqual(d.blocs.map((b) => b.texte), ["une puce"]);
});

test("Pied : directive connue sur toute diapositive de contenu, lignes jointes, position de directive gardée", () => {
  const doc = analyser(md("# C", "## A", "Pied : Traduit de l'anglais.", "Cartes :", "### Un", "- a", "### Deux", "- b",
    "Pied : original en notes", "Source : rapport, p. 3"));
  assert.deepStrictEqual(doc.alertes, []);
  const d = doc.diapos[1];
  assert.strictEqual(d.motif, "cartes");
  assert.strictEqual(d.pied, "Traduit de l'anglais. ; original en notes");
  assert.strictEqual(d.source, "rapport, p. 3");
  assert.deepStrictEqual(d.colonnes[1].blocs, [{ texte: "b", niveau: 1, numero: null }]);
});

test("Pied : hors d'une diapositive de contenu, DONNEES_INVALIDES à sa ligne, ni sous-titre ni pied", () => {
  const doc = analyser(md("# C", "Pied : sur la couverture", "Sous-titre", "## A", "- a"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"]]);
  assert.deepStrictEqual(doc.diapos[0].sousTitre, ["Sous-titre"]);
  assert.strictEqual(doc.diapos[0].pied, null);
});

test("## sans aucun contenu : DONNEES_INVALIDES « diapositive sans contenu » à la ligne du ##", () => {
  const doc = analyser(md("# C", "## Vide", "Notes : rien à l'écran", "## Pleine", "- a", "## Accroche seule", "Accroche : Une phrase forte."));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"]]);
  assert.match(doc.alertes[0].message, /^Diapositive sans contenu/);
  const fin = analyser(md("# C", "## Dernière"));
  assert.deepStrictEqual(fin.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"]]);
});

test("Accroche : hors d'une diapositive de contenu, DONNEES_INVALIDES et ni sous-titre ni contact", () => {
  const doc = analyser(md("# Couverture", "Accroche : sur la couverture", "Sous-titre", "# Section", "Accroche : sur la section",
    "## A", "- a", "# Merci", "Clôture : Des questions ?", "Accroche : sur la clôture", "contact@example.org"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"], [5, "DONNEES_INVALIDES"], [10, "DONNEES_INVALIDES"]]);
  const [couv, section, , cloture] = doc.diapos;
  assert.deepStrictEqual(couv.sousTitre, ["Sous-titre"]);
  assert.deepStrictEqual(section.sousTitre, []);
  assert.deepStrictEqual([cloture.type, cloture.contact], ["cloture", ["contact@example.org"]]);
  assert.ok(doc.diapos.every((d) => d.accroche === null));
});

test("Source : hors d'une diapositive de contenu, DONNEES_INVALIDES à sa ligne ; Notes : y reste admis", () => {
  const doc = analyser(md("# C", "Source : sur la couverture", "Notes : dit à l'oral", "# Section", "Source : sur la section", "## A", "- a"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"], [5, "DONNEES_INVALIDES"]]);
  assert.match(doc.alertes[0].message, /Source hors d'une diapositive de contenu/);
  assert.deepStrictEqual([doc.diapos[0].source, doc.diapos[1].source], [null, null]);
  assert.deepStrictEqual(doc.diapos[0].notes, ["dit à l'oral"]);
});

test("Blocs : une valeur de couleurs, DONNEES_INVALIDES à sa ligne, blocs rendus sans couleurs", () => {
  const doc = analyser(md("# C", "## Couches", "Blocs : rouge, vert", "### A", "- a", "### B", "- b"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[3, "DONNEES_INVALIDES"]]);
  assert.match(doc.alertes[0].message, /Blocs n'accepte pas de couleurs/);
  assert.deepStrictEqual([doc.diapos[1].motif, doc.diapos[1].couleurs], ["blocs", null]);
});

test("Clôture : type cloture et contact", () => {
  const doc = analyser(md("# Couverture", "## A", "- x", "# Merci", "Clôture :", "contact@exemple.fr"));
  const d = doc.diapos[2];
  assert.strictEqual(d.type, "cloture");
  assert.strictEqual(d.titre, "Merci");
  assert.deepStrictEqual(d.contact, ["contact@exemple.fr"]);
  assert.deepStrictEqual(d.sousTitre, []);
  assert.strictEqual(d.motif, null);
  const avecTexte = analyser(md("# C", "# Merci", "Clôture : Des questions ?", "contact@exemple.fr", "06 00 00 00 00")).diapos[1];
  assert.deepStrictEqual(avecTexte.sousTitre, ["Des questions ?"]);
  assert.deepStrictEqual(avecTexte.contact, ["contact@exemple.fr", "06 00 00 00 00"]);
});

test("titre : « // » conservé, dièses finaux retirés", () => {
  assert.strictEqual(contenu("## Le train accélère, // la voie n'est pas posée ##").titre, "Le train accélère, // la voie n'est pas posée");
});

test("directive connue hors de sa place : DONNEES_INVALIDES à sa ligne, lue comme du texte", () => {
  const doc = analyser(md("# C", "## A", "- puce", "Cartes :", "### Un", "- a"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[4, "DONNEES_INVALIDES"]]);
  assert.match(doc.alertes[0].message, /juste sous le titre ##/);
  assert.notStrictEqual(doc.diapos[1].motif, "cartes");
  assert.deepStrictEqual(doc.diapos[1].blocs.map((b) => b.texte), ["puce", "Cartes :"]);
});

test("Prompt mal placé suivi d'un bloc : deux diapositives, une alerte, le # du bloc n'est pas un titre", () => {
  const doc = analyser(md("## Le prompt", "À copier tel quel.", "Prompt :", "```", "# Rôle", "Tu es un juriste.", "```", "## Tâche", "- a"));
  assert.deepStrictEqual(doc.diapos.map((d) => d.titre), ["Le prompt", "Tâche"]);
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[3, "DONNEES_INVALIDES"]]);
  assert.strictEqual(doc.diapos[0].prompt, null);
  assert.deepStrictEqual(doc.diapos[0].blocs.map((b) => b.texte), ["À copier tel quel.", "Prompt :", "# Rôle", "Tu es un juriste."]);
});

test("bloc de code hors d'une diapositive Prompt : alerte à l'ouverture, contenu en blocs de niveau 1", () => {
  const doc = analyser(md("# C", "## A", "- avant", "```", "# Rôle", "", "  - pas une puce", "```"));
  assert.deepStrictEqual(doc.alertes.map((a) => [a.ligne, a.code]), [[4, "DONNEES_INVALIDES"]]);
  assert.strictEqual(doc.diapos.length, 2);
  assert.deepStrictEqual(doc.diapos[1].blocs, [
    { texte: "avant", niveau: 1, numero: null },
    { texte: "# Rôle", niveau: 1, numero: null },
    { texte: "- pas une puce", niveau: 1, numero: null },
  ]);
});

test("directive sans ses données : DONNEES_INVALIDES à la ligne du ##", () => {
  const graphique = analyser(md("# C", "", "## Budget", "Graphique : barres", "Source : rapport, p. 2"));
  assert.deepStrictEqual(graphique.alertes.map((a) => [a.ligne, a.code]), [[3, "DONNEES_INVALIDES"]]);
  assert.strictEqual(graphique.diapos[1].motif, "graphique");
  const chiffres = analyser(md("# C", "## En chiffres", "Chiffres clés :", "Une phrase seule."));
  assert.deepStrictEqual(chiffres.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"]]);
  const image = analyser(md("# C", "## Le site", "Image : droite", "- une puce"));
  assert.deepStrictEqual(image.alertes.map((a) => [a.ligne, a.code]), [[2, "DONNEES_INVALIDES"]]);
});

test("Graphique, radar, chaleur : tableau sans colonne de valeurs ou sans rangée, une alerte à la ligne du tableau", () => {
  for (const directive of ["Graphique : barres", "Radar :", "Carte de chaleur :"]) {
    const sans = analyser(md("# C", "## D", directive, "| Poste |", "|---|", "| Eau |"));
    assert.deepStrictEqual(sans.alertes.map((a) => [a.ligne, a.code]), [[4, "DONNEES_INVALIDES"]], directive);
    assert.deepStrictEqual(sans.diapos[1].graphique.series, []);
    const vide = analyser(md("# C", "## D", directive, "| Poste | 2026 |", "|---|---|"));
    assert.deepStrictEqual(vide.alertes.map((a) => [a.ligne, a.code]), [[4, "DONNEES_INVALIDES"]], directive);
    assert.deepStrictEqual(vide.diapos[1].graphique.categories, []);
  }
});
