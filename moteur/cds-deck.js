#!/usr/bin/env node
// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Ligne de commande : Markdown vers PPTX à la charte Comptoir des Signaux.
//   node cds-deck.js <source.md> [--sortie fichier.pptx] [--ecraser] [--plan] [--skill dossier]
// --plan rend le deck en mémoire, avec les mêmes alertes que la génération, sans écrire
// ni PPTX ni empreinte. Le plan (<sortie>.plan.txt) est écrit en fin d'exécution réussie,
// avec ou sans --plan ; jamais en code 2, 3 ou 4.
// Codes de sortie : 0 sans alerte, 1 avec alertes (PPTX écrit sauf avec --plan),
// 2 argument invalide (option inconnue, valeur manquante, source absente), source
// illisible ou charte introuvable, 3 écriture refusée ou impossible (garde, fichier ~$,
// retouche, droits, dossier de sortie impossible à créer, sortie = source), 4 exception
// imprévue du moteur (pile sur stderr). Un dossier de sortie absent est créé juste
// avant l'écriture.
const fs = require("fs");
const path = require("path");
const { analyser } = require("./analyseur.js");
const { controlerTexte, controlerMesures } = require("./controles.js");
const { resoudreCharte } = require("./charte.js");
const { rendre } = require("./rendu.js");
const gabarit = require("./gabarit.js");
const { finaliser, empreinteContenu, peutEcrire } = require("./sortie.js");

const USAGE = "Usage : node cds-deck.js <source.md> [--sortie fichier.pptx] [--ecraser] [--plan] [--skill dossier]\n"
  + "Codes de sortie : 0 sans alerte, 1 avec alertes, 2 argument invalide, source illisible ou charte introuvable,\n"
  + "3 écriture refusée ou impossible, 4 exception imprévue du moteur.";

function lireArguments(argv) {
  const opts = { source: null, sortie: null, ecraser: false, plan: false, skill: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--ecraser") opts.ecraser = true;
    else if (a === "--plan") opts.plan = true;
    else if (a === "--sortie" || a === "--skill") {
      const valeur = argv[++i];
      if (valeur === undefined) throw new Error(`${a} demande une valeur.`);
      opts[a.slice(2)] = valeur;
    } else if (a.startsWith("--")) throw new Error(`Option inconnue : ${a}.`);
    else if (opts.source === null) opts.source = a;
    else throw new Error(`Argument en trop : ${a}.`);
  }
  if (opts.source === null) throw new Error("Source manquante.");
  return opts;
}

function lireSource(chemin) {
  try {
    if (!fs.statSync(chemin).isFile()) throw new Error("ce n'est pas un fichier");
    return fs.readFileSync(chemin, "utf8");
  } catch (e) {
    throw new Error(`Source illisible : ${chemin} (${e.code || e.message}).`);
  }
}

// Une alerte par (ligne, code, message), triées par ligne puis par code.
function fusionner(...listes) {
  const vues = new Set();
  const toutes = [];
  for (const a of listes.flat()) {
    const cle = `${a.ligne}\u0000${a.code}\u0000${a.message}`;
    if (!vues.has(cle)) { vues.add(cle); toutes.push(a); }
  }
  return toutes.sort((a, b) => a.ligne - b.ligne || (a.code < b.code ? -1 : a.code > b.code ? 1 : 0));
}

const planDe = (doc) => doc.diapos
  .map((d, i) => `${i + 1}. ${d.type === "contenu" ? d.motif : d.type} : ${d.titre || "(sans titre)"}`)
  .join("\n");

// Échec connu : message d'une ligne, code de sortie propre, pas de pile.
class Echec extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

const ligne = (e) => String(e.message).split("\n")[0];

// Toute erreur d'écriture ou de garde devient un échec de code 3.
function ecriture(action) {
  try {
    return action();
  } catch (e) {
    throw new Echec(3, `Écriture impossible : ${ligne(e)}`);
  }
}

function verifierGarde(sortie, ecraser) {
  const garde = ecriture(() => peutEcrire(sortie, { ecraser }));
  if (!garde.ok) throw new Echec(3, garde.raison);
}

const memeFichier = (a, b) => {
  const reel = (c) => { try { return fs.realpathSync(c); } catch { return c; } };
  return reel(a) === reel(b);
};

// Dossier de la sortie, créé au besoin juste avant d'y écrire : jamais pour une
// exécution qui s'arrête avant (code 2, rendu en échec).
const creerDossier = (sortie) => ecriture(() => fs.mkdirSync(path.dirname(sortie), { recursive: true }));

// PPTX écrit à côté sous .tmp, son empreinte (calculée sur les octets) écrite, puis
// le .tmp renommé : un échec ne laisse jamais un PPTX sans son empreinte. Si le
// renommage échoue, l'empreinte précédente est remise. La garde est rejouée juste
// avant, le rendu pouvant durer.
function ecrirePptx(sortie, contenu, ecraser) {
  verifierGarde(sortie, ecraser);
  creerDossier(sortie);
  const tmp = sortie + ".tmp";
  const fichierEmpreinte = sortie + ".empreinte";
  let precedente = null;
  try { precedente = fs.readFileSync(fichierEmpreinte); } catch { precedente = null; }
  let empreinteEcrite = false;
  try {
    fs.writeFileSync(tmp, contenu);
    fs.writeFileSync(fichierEmpreinte, empreinteContenu(contenu) + "\n");
    empreinteEcrite = true;
    fs.renameSync(tmp, sortie);
  } catch (e) {
    try { fs.rmSync(tmp, { force: true }); } catch { /* rien à nettoyer */ }
    if (empreinteEcrite) {
      try {
        if (precedente === null) fs.rmSync(fichierEmpreinte, { force: true });
        else fs.writeFileSync(fichierEmpreinte, precedente);
      } catch { /* l'empreinte ne correspond plus : la garde refusera, ce qui reste sûr */ }
    }
    throw new Echec(3, `Écriture impossible : ${ligne(e)}`);
  }
}

async function executer(argv) {
  let opts;
  try {
    opts = lireArguments(argv);
  } catch (e) {
    throw new Echec(2, `${e.message}\n${USAGE}`);
  }
  const source = path.resolve(opts.source);
  const sortie = path.resolve(opts.sortie || source.replace(/\.[^./\\]*$/, "") + ".pptx");
  const dossierSkill = opts.skill || process.env.CDS_SKILL || undefined;

  let texteSource;
  try {
    texteSource = lireSource(source);
  } catch (e) {
    throw new Echec(2, e.message);
  }
  if (memeFichier(sortie, source)) throw new Echec(3, `La sortie ${sortie} est la source elle-même : choisir un autre --sortie.`);

  const doc = analyser(texteSource);
  let alertes = fusionner(doc.alertes, controlerTexte(doc), controlerMesures(doc));
  const plan = planDe(doc);

  if (!opts.plan) verifierGarde(sortie, opts.ecraser);
  const dossierSource = path.dirname(source);
  let charte;
  try {
    charte = resoudreCharte(dossierSource, { dossierSkill });
  } catch (e) {
    throw new Echec(2, `${ligne(e)}\nPiste : préciser --skill <dossier de la skill installée> ou CDS_SKILL.`);
  }
  const rendu = await rendre(doc, { dossierSource, charte, dossierSkill });
  alertes = fusionner(alertes, rendu.alertes);
  if (!opts.plan) {
    const brut = await rendu.pres.write({ outputType: "nodebuffer" });
    const titres = doc.diapos.map((d) => gabarit.sansGras(d.titre || ""));
    ecrirePptx(sortie, await finaliser(brut, doc.meta, { titres }), opts.ecraser);
  }

  creerDossier(sortie);
  ecriture(() => fs.writeFileSync(sortie + ".plan.txt", plan + "\n"));
  const lignes = alertes.map((a) => `ligne ${a.ligne} · ${a.code} · ${a.message}`);
  console.log([...lignes, ...(lignes.length ? [""] : []), plan].join("\n"));
  if (!opts.plan) console.log(`\nPPTX écrit : ${sortie}`);
  return alertes.length ? 1 : 0;
}

executer(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (e) => {
  if (e instanceof Echec) {
    console.error(e.message);
    process.exitCode = e.code;
  } else {
    console.error(e && e.stack ? e.stack : String(e));
    process.exitCode = 4;
  }
});
