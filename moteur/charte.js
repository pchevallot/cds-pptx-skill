// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Résolution de la charte (logos, monogrammes, bandeaux) et chargement des
// dépendances embarquées (PptxGenJS, JSZip), sans npm install ni réseau.
//
// Ordre de recherche de la charte :
//   1. cds-visuels/charte.js, cherché en remontant depuis le dossier de la source ;
//   2. assets/ de la skill installée ;
//   3. logos en base64 de scripts/logos_b64.py (BANDEAUX et MONOGRAMMES vides).
//
// La charte de l'atelier est chargée par `require` du premier cds-visuels/charte.js
// trouvé en remontant depuis la source : c'est du code exécuté tel quel, sans bac à
// sable, ce que la conception accepte (§ 3 : dans l'atelier, les assets se résolvent
// par ce module). Une source posée sous un dossier étranger qui contiendrait un
// cds-visuels/charte.js le ferait donc exécuter.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const RATIO_BASE64 = 3.99;

// Noms de fichiers de la skill, par famille et par clé.
const FICHIERS = {
  LOGOS: {
    dossier: "logos",
    noms: {
      blanc: "CDS-Logo-Blanc.png",
      bleu_blanc: "CDS-Logo-Bleu-Blanc.png",
      bleu_jaune: "CDS-Logo-Bleu-Jaune.png",
      jaune_blanc: "CDS-Logo-Jaune-Blanc.png",
      noir: "CDS-Logo-Noir.png",
    },
  },
  MONOGRAMMES: {
    dossier: "monogrammes",
    noms: {
      blanc: "Monogramme-Blanc.png",
      blanc_jaune: "Monogramme-Blanc-Jaune.png",
      bleu_jaune: "Monogramme-Bleu-Jaune.png",
      noir: "Monogramme-Noir.png",
    },
  },
  BANDEAUX: {
    dossier: "bandeaux",
    noms: {
      blanc_h: "Bandeau-motifs-blanc-horizontal.png",
      blanc_v: "Bandeau-motifs-blanc-vertical.png",
      bleu_h: "Bandeau-motifs-bleu-horizontal.png",
      bleu_v: "Bandeau-motifs-bleu-vertical.png",
      jaune_h: "Bandeau-motifs-jaune-horizontal.png",
      jaune_v: "Bandeau-motifs-jaune-vertical.png",
    },
  },
};

// Dimensions natives en pixels (mêmes valeurs que cds-visuels/charte.js).
const DIMENSIONS = {
  "Bandeau-motifs-blanc-horizontal.png": [1453, 186],
  "Bandeau-motifs-blanc-vertical.png": [223, 1879],
  "Bandeau-motifs-bleu-horizontal.png": [1453, 186],
  "Bandeau-motifs-bleu-vertical.png": [223, 1879],
  "Bandeau-motifs-jaune-horizontal.png": [1453, 186],
  "Bandeau-motifs-jaune-vertical.png": [223, 1879],
  "CDS-Logo-Blanc.png": [2771, 694],
  "CDS-Logo-Bleu-Blanc.png": [2770, 694],
  "CDS-Logo-Bleu-Jaune.png": [2770, 693],
  "CDS-Logo-Jaune-Blanc.png": [2770, 694],
  "CDS-Logo-Noir.png": [2771, 693],
  "Monogramme-Blanc-Jaune.png": [2450, 1782],
  "Monogramme-Blanc.png": [2450, 1782],
  "Monogramme-Bleu-Jaune.png": [2450, 1783],
  "Monogramme-Noir.png": [2450, 1783],
};

function remonter(depart, relatif) {
  let d = path.resolve(depart);
  for (;;) {
    const c = path.join(d, relatif);
    if (fs.existsSync(c)) return c;
    const parent = path.dirname(d);
    if (parent === d) return null;
    d = parent;
  }
}

function depuisAtelier(dossierSource) {
  const fichier = remonter(dossierSource, path.join("cds-visuels", "charte.js"));
  if (!fichier) return null;
  try {
    const c = require(fichier);
    return {
      origine: "atelier",
      LOGOS: c.LOGOS,
      MONOGRAMMES: c.MONOGRAMMES,
      BANDEAUX: c.BANDEAUX,
      hauteurPour: c.hauteurPour,
    };
  } catch (e) {
    return { erreur: `${fichier} : ${e.message.split("\n")[0]}` };
  }
}

function depuisSkill(dossierSkill) {
  const assets = path.join(dossierSkill, "assets");
  const sortie = { origine: "skill", LOGOS: {}, MONOGRAMMES: {}, BANDEAUX: {} };
  for (const [famille, { dossier, noms }] of Object.entries(FICHIERS)) {
    for (const [cle, nom] of Object.entries(noms)) {
      const p = path.join(assets, dossier, nom);
      if (!fs.existsSync(p)) return null;
      sortie[famille][cle] = p;
    }
  }
  sortie.hauteurPour = (chemin, largeur) => {
    const d = DIMENSIONS[path.basename(chemin)];
    if (!d) throw new Error(`Dimensions inconnues pour ${chemin}`);
    return largeur / (d[0] / d[1]);
  };
  return sortie;
}

function depuisBase64(dossierSkill) {
  const script = path.join(dossierSkill, "scripts", "logos_b64.py");
  if (!fs.existsSync(script)) return null;
  const texte = fs.readFileSync(script, "utf8");
  const lire = (nom) => {
    const m = texte.match(new RegExp(nom + '\\s*=\\s*"([A-Za-z0-9+/=]+)"'));
    return m ? "data:image/png;base64," + m[1] : null;
  };
  const bleuJaune = lire("LOGO_BLEU_JAUNE_B64");
  const jauneBlanc = lire("LOGO_JAUNE_BLANC_B64");
  if (!bleuJaune || !jauneBlanc) return null;
  return {
    origine: "base64",
    LOGOS: { bleu_jaune: bleuJaune, jaune_blanc: jauneBlanc },
    MONOGRAMMES: {},
    BANDEAUX: {},
    hauteurPour: (_chemin, largeur) => largeur / RATIO_BASE64,
  };
}

function resoudreCharte(dossierSource, options = {}) {
  const dossierSkill = options.dossierSkill || path.join(__dirname, "..");
  const atelier = depuisAtelier(dossierSource);
  if (atelier && !atelier.erreur) return atelier;
  const charte = depuisSkill(dossierSkill) || depuisBase64(dossierSkill);
  if (charte && atelier) {
    charte.avertissement = `Charte de l'atelier trouvée mais inutilisable, repli sur ${charte.origine} : ${atelier.erreur}`;
  }
  if (!charte) {
    throw new Error(
      "Charte CdS introuvable : ni cds-visuels/charte.js au-dessus de la source, " +
        "ni assets/ ni scripts/logos_b64.py dans " + dossierSkill
    );
  }
  return charte;
}

// Un paragraphe de plusieurs runs (un mot en gras dans une puce) recevait un
// <a:pPr> par run, alors que le schéma n'en admet qu'un, en tête : on ne garde
// que celui du premier run (index `e` de la boucle des runs du paragraphe).
// L'expression visée doit figurer une fois et une seule dans le bundle.
const PPR_PAR_RUN = 'n=Te(r,!1),i+=n.replace("<a:pPr></a:pPr>","")';
function corrigerPprParRun(source) {
  if (source.split(PPR_PAR_RUN).length !== 2) {
    throw new Error("pptxgen.bundle.js : correctif <a:pPr> inapplicable, expression absente ou en double (version changée ?)");
  }
  return source.replace(PPR_PAR_RUN, 'n=Te(r,!1),i+=0<e?"":n.replace("<a:pPr></a:pPr>","")');
}

// PptxGenJS 4 : le bundle navigateur attend un JSZip global et pose la classe
// PptxGenJS en global. On l'évalue dans un contexte isolé qui fournit
// JSZip (embarqué) et les globales Node utiles ; aucun réseau, aucun npm.
let _pptx = null;
function chargerPptxGenJS() {
  if (_pptx) return _pptx;
  const contexte = {
    JSZip: chargerJSZip(),
    console, process, Buffer, setTimeout, clearTimeout, setImmediate,
    TextEncoder, TextDecoder, URL,
  };
  vm.createContext(contexte);
  // Le bundle fait import("node:fs") et import("node:https") (images locales,
  // images distantes, écriture du fichier) :
  // un import dynamique n'est pas disponible dans vm sans option expérimentale,
  // on les remplace par les modules fournis au contexte.
  contexte.__fs = { default: fs, promises: fs.promises };
  contexte.__https = { default: require("https") };
  let source = fs
    .readFileSync(path.join(__dirname, "vendor", "pptxgen.bundle.js"), "utf8")
    .split('import("node:fs")')
    .join("Promise.resolve(__fs)")
    .split('import("node:https")')
    .join("Promise.resolve(__https)");
  source = corrigerPprParRun(source);
  vm.runInContext(source, contexte, { filename: "pptxgen.bundle.js" });
  if (typeof contexte.PptxGenJS !== "function") {
    throw new Error("Le bundle PptxGenJS n'a pas exposé la classe PptxGenJS");
  }
  _pptx = contexte.PptxGenJS;
  return _pptx;
}

function chargerJSZip() {
  return require("./vendor/jszip.min.js");
}

module.exports = { resoudreCharte, chargerPptxGenJS, chargerJSZip, corrigerPprParRun };
