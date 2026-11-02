// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
const test = require("node:test");
const assert = require("node:assert");
const { largeurPt, couperLignes, ajuster, motOrphelin } = require("../mesure.js");

test("largeurPt reprend la mesure PIL de référence", () => {
  assert.ok(Math.abs(largeurPt("Comptoir des Signaux", { taille: 20 }) - 204.47) <= 0.5);
  assert.ok(Math.abs(largeurPt("Comptoir des Signaux", { taille: 20, gras: true }) - 216.83) <= 0.5);
});

test("largeurPt est proportionnelle à la taille", () => {
  const a = largeurPt("Signaux", { taille: 10 });
  assert.ok(Math.abs(largeurPt("Signaux", { taille: 30 }) - 3 * a) < 1e-9);
});

test("les caractères typographiques sont dans la table", () => {
  assert.ok(largeurPt("l’œil « vu »", { taille: 20, strict: true }) > 0);
  assert.ok(largeurPt("a\u00A0b\u202F– € …", { taille: 20, strict: true }) > 0);
});

test("strict lève sur un caractère inconnu, le mode normal utilise la largeur par défaut", () => {
  assert.throws(() => largeurPt("日", { taille: 20, strict: true }), /日/);
  assert.ok(largeurPt("日", { taille: 20 }) > 0);
});

test("couperLignes coupe par mots et respecte ' // '", () => {
  assert.deepStrictEqual(
    couperLignes("Le train accélère, // la voie n'est pas posée", 20, { taille: 28 }),
    ["Le train accélère,", "la voie n'est pas posée"]);
  const l = couperLignes("un deux trois quatre cinq six sept huit neuf dix", 1.5, { taille: 20 });
  assert.ok(l.length > 1);
  for (const x of l) assert.ok(largeurPt(x, { taille: 20 }) <= 1.5 * 72);
  assert.strictEqual(l.join(" "), "un deux trois quatre cinq six sept huit neuf dix");
});

test("l'espace insécable ne coupe pas", () => {
  const l = couperLignes("aaaa bbbb\u00A0cccc", 0.9, { taille: 20 });
  assert.deepStrictEqual(l, ["aaaa", "bbbb\u00A0cccc"]);
});

test("l'espace fine insécable (U+202F) ne coupe pas et lie les mots d'une dernière ligne", () => {
  const l = couperLignes("aaaa bbbb\u202Fcccc", 0.9, { taille: 20 });
  assert.deepStrictEqual(l, ["aaaa", "bbbb\u202Fcccc"]);
  assert.strictEqual(motOrphelin(["Le taux atteint", "42\u202F%"]), true);
  assert.strictEqual(motOrphelin(["Le taux atteint", "42\u00A0%"]), true);
  assert.strictEqual(motOrphelin(["Le taux", "atteint 42\u202F%"]), false);
});

test("aucune espace insécable écrite en dur dans le code du moteur ni dans ses essais", () => {
  const fs = require("fs");
  const path = require("path");
  const racine = path.join(__dirname, "..");
  const fichiers = [racine, path.join(racine, "motifs"), __dirname]
    .flatMap((d) => fs.readdirSync(d).filter((n) => n.endsWith(".js")).map((n) => path.join(d, n)));
  const fautifs = fichiers.filter((f) => /[\u00A0\u202F]/.test(fs.readFileSync(f, "utf8")));
  assert.deepStrictEqual(fautifs.map((f) => path.relative(racine, f)), [], "écrire \\u00A0 ou \\u202F");
});

test("un mot plus large que la ligne reste seul", () => {
  assert.deepStrictEqual(couperLignes("anticonstitutionnellement a", 0.5, { taille: 20 }),
    ["anticonstitutionnellement", "a"]);
});

test("ajuster garde la plus grande taille qui tient", () => {
  const r = ajuster("Un titre court", { largeur: 10, hauteur: 2, max: 40, min: 20 });
  assert.deepStrictEqual(r, { taille: 40, lignes: ["Un titre court"], deborde: false });
});

test("ajuster réduit la taille puis déborde à min", () => {
  const texte = "Le train accélère, la voie n'est pas encore posée. ".repeat(8).slice(0, 400);
  const r = ajuster(texte, { largeur: 4, hauteur: 1, max: 18, min: 12 });
  assert.strictEqual(r.deborde, true);
  assert.strictEqual(r.taille, 12);
  const m = ajuster(texte, { largeur: 4, hauteur: 3.2, max: 18, min: 12 });
  assert.strictEqual(m.deborde, false);
  assert.ok(Array.isArray(m.lignes) && m.lignes.length > 0);
  assert.ok(m.lignes.length * m.taille * 1.2 / 72 <= 3.2);
  assert.strictEqual(typeof motOrphelin(m.lignes), "boolean");
  assert.ok(ajuster("a // b", { largeur: 10, hauteur: 2, max: 20, min: 12 }).lignes.join("|") === "a|b");
});

test("motOrphelin repère un mot seul en dernière ligne", () => {
  assert.strictEqual(motOrphelin(["Le train accélère, la voie n'est pas encore", "posée"]), true);
  assert.strictEqual(motOrphelin(["Le train accélère,", "la voie posée"]), false);
  assert.strictEqual(motOrphelin(["posée"]), false);
});
