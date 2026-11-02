// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Contrôles du Document, après l'analyse. Chaque contrôle rend des Alerte
// { ligne, code, message } et ne modifie jamais le Document.
//
//   controlerTexte(doc)    typographie, sources, variété des motifs, métadonnées ;
//                          sans mesure, sur le seul texte de la source.
//   controlerMesures(doc)  titres et accroches mesurés en Open Sans dans les
//                          boîtes du gabarit : coupure, mot orphelin, débordement.
//                          Le texte propre à un motif (puces, colonnes, cellules)
//                          est mesuré au rendu, qui alerte de même (TEXTE_TROP_LONG).
//
// Les règles de typographie reprennent celles du vérificateur de texte du
// harnais de l'atelier (outils/harnais/verifier_texte.py) : même masquage de ce
// qui est cité exprès, même distinction entre libellé et phrase.

const gabarit = require("./gabarit.js");
const { largeurPt, motOrphelin } = require("./mesure.js");

const CADRATIN = "\u2014";
const MOTIFS_SOURCES = ["chiffres", "graphique", "radar", "chaleur"];
const META_ATTENDUES = ["titre", "objet", "mots_cles", "categorie", "commentaires", "client", "date"];
const REPETITION = 3;

// ---------------------------------------------------------------------------
// Outils communs
// ---------------------------------------------------------------------------

const alerteur = (alertes) => (ligne, code, message) => alertes.push({ ligne, code, message });
const parLigne = (alertes) => alertes.sort((a, b) => a.ligne - b.ligne);

// Le texte affiché ou livré d'une diapositive : [lieu, texte][], lieu lisible par l'auteur.
function textesDiapo(d) {
  const t = [];
  const ajouter = (lieu, texte) => { if (texte) t.push([lieu, String(texte)]); };
  ajouter("titre", d.titre);
  d.sousTitre.forEach((s) => ajouter("sous-titre", s));
  ajouter("accroche", d.accroche);
  d.blocs.forEach((b) => ajouter("puce", b.texte));
  d.colonnes.forEach((c) => { ajouter("titre de colonne", c.titre); c.blocs.forEach((b) => ajouter("puce", b.texte)); });
  if (d.tableau) {
    d.tableau.entetes.forEach((c) => ajouter("tableau", c));
    d.tableau.rangees.forEach((r) => r.forEach((c) => ajouter("tableau", c)));
  }
  if (d.schema) {
    d.schema.elements.forEach((el) => ajouter("schéma", el.texte));
    ajouter("légende du schéma", d.schema.legende);
  }
  d.chiffres.forEach((c) => { ajouter("chiffre", c.valeur); ajouter("chiffre", c.libelle); });
  if (d.graphique) {
    d.graphique.categories.forEach((c) => ajouter("graphique", c));
    d.graphique.series.forEach((s) => ajouter("graphique", s.nom));
  }
  d.icones.forEach((i) => { ajouter("icône", i.titre); ajouter("icône", i.description); });
  if (d.citation) { ajouter("citation", d.citation.texte); ajouter("citation", d.citation.auteur); }
  if (d.prompt) { ajouter("prompt", d.prompt.intro); ajouter("prompt", d.prompt.texte); }
  if (d.image) ajouter("légende d'image", d.image.legende);
  ajouter("source", d.source);
  ajouter("pied", d.pied);
  d.contact.forEach((c) => ajouter("contact", c));
  d.notes.forEach((n) => ajouter("notes", n));
  return t;
}

// Ce qui est cité exprès ne compte pas : accents graves, « X » court, adresse web.
function masquer(texte) {
  const blanc = (m) => " ".repeat(m.length);
  return texte
    .replace(/`[^`\n]*`/g, blanc)
    .replace(/«\s?[^»\n]{0,40}\s?»/g, blanc)
    .replace(/https?:\/\/\S+/g, blanc);
}

// « Le Comptoir des Signaux » en libellé : rien après, ou autre chose qu'un mot en
// minuscule (fin de titre, de cellule, ponctuation). Suivi d'un mot en minuscule,
// c'est un début de phrase : admis.
const RE_NOM_AVEC_ARTICLE = /(?<![\p{L}\p{N}_])Le\s+Comptoir\s+des\s+Signaux(?![\p{L}\p{N}_])/gu;
const RE_SUITE_DE_PHRASE = /^\s+[a-zàâçéèêëîïôûùüÿœ]/;

function enLibelle(texte) {
  for (const m of texte.matchAll(RE_NOM_AVEC_ARTICLE)) {
    const fin = m.index + m[0].length;
    if (!RE_SUITE_DE_PHRASE.test(texte.slice(fin, fin + 3) + "  ")) return true;
  }
  return false;
}

const extrait = (texte) => (texte.length > 50 ? `${texte.slice(0, 47)}…` : texte);

function controlerTypo(lieu, texte, alerter, ligne) {
  const propre = masquer(texte);
  if (propre.includes(CADRATIN)) {
    alerter(ligne, "TYPO_CADRATIN", `${lieu} : tiret cadratin dans « ${extrait(texte)} » ; écrire deux points, virgule ou parenthèses.`);
  }
  if (enLibelle(propre)) {
    alerter(ligne, "TYPO_NOMMAGE", `${lieu} : « Le Comptoir des Signaux » en libellé ; écrire « Comptoir des Signaux », sans déterminant.`);
  }
  // Jamais écrit, même cité : le Comptoir des Signaux n'est pas certifié.
  if (/qualiopi/i.test(texte)) {
    alerter(ligne, "TYPO_QUALIOPI", `${lieu} : mention de Qualiopi ; le Comptoir des Signaux n'est pas certifié, la retirer.`);
  }
}

// ---------------------------------------------------------------------------
// controlerTexte : typographie, sources, variété, métadonnées
// ---------------------------------------------------------------------------

function controlerTexte(doc) {
  const alertes = [];
  const alerter = alerteur(alertes);
  const { meta, diapos } = doc;

  // Métadonnées : l'en-tête n'a pas de numéro de ligne par clé dans le Document.
  const manquantes = META_ATTENDUES.filter((c) => !meta[c]);
  if (manquantes.length) {
    alerter(1, "META_MANQUANTE", `Métadonnées manquantes : ${manquantes.join(", ")} ; les écrire dans l'en-tête (bloc « --- » en tête de fichier).`);
  }
  if (!meta.logo_client) {
    alerter(1, "LOGO_CLIENT_ABSENT", "Aucun logo client : ajouter « logo_client: chemin/du/logo.png » dans l'en-tête.");
  }
  for (const [cle, valeur] of Object.entries(meta)) {
    if (valeur && cle !== "logo_client") controlerTypo(`En-tête, ${cle}`, valeur, alerter, 1);
  }

  let precedent = null;
  let serie = 0;
  diapos.forEach((d, i) => {
    const nom = `Diapositive ${i + 1}`;
    for (const [lieu, texte] of textesDiapo(d)) controlerTypo(`${nom}, ${lieu}`, texte, alerter, d.ligne);

    if (d.type === "contenu" && MOTIFS_SOURCES.includes(d.motif) && !d.source) {
      alerter(d.ligne, "SOURCE_MANQUANTE", `${nom} : motif ${d.motif} sans ligne « Source : » ; tout chiffre livré cite sa source (document, page).`);
    }

    // Variété : une section, une couverture ou une clôture interrompt la série.
    if (d.type !== "contenu") { precedent = null; serie = 0; return; }
    serie = d.motif === precedent ? serie + 1 : 1;
    precedent = d.motif;
    if (serie === REPETITION) {
      alerter(d.ligne, "MOTIF_REPETE", `${nom} : motif ${d.motif} pour la ${REPETITION}e diapositive de suite ; varier la mise en forme.`);
    }
  });

  return parLigne(alertes);
}

// ---------------------------------------------------------------------------
// controlerMesures : titres et accroches
// ---------------------------------------------------------------------------

// Mots qui ouvrent un bloc de sens : une coupure juste avant eux se lit bien.
const LIENS = new Set(["et", "ou", "mais", "pour", "avec", "sans", "qui", "que", "dont", "dans", "par",
  "sur", "vers", "entre", "avant", "après", "depuis", "car", "sinon"]);

// Coupure proposée : deux lignes les plus égales possible, de deux mots au moins
// chacune, de préférence après une ponctuation ou avant un mot de liaison.
function proposerCoupure(titre, taille) {
  const mots = titre.split(" ").filter((m) => m !== "");
  const largeur = (m) => largeurPt(m.join(" "), { taille, gras: true });
  let meilleure = null;
  for (let k = 2; k <= mots.length - 2; k++) {
    const avant = mots.slice(0, k);
    const apres = mots.slice(k);
    if (/^[:;!?»]/.test(apres[0])) continue;
    const wa = largeur(avant);
    const wb = largeur(apres);
    let score = Math.abs(wa - wb) / (wa + wb);
    if (/[,;:]$/.test(avant[k - 1])) score -= 0.15;
    if (LIENS.has(apres[0].toLowerCase())) score -= 0.1;
    if (!meilleure || score < meilleure.score) meilleure = { score, texte: `${avant.join(" ")} // ${apres.join(" ")}` };
  }
  return meilleure && meilleure.texte;
}

function boiteDuTitre(d, meta) {
  if (d.type === "contenu") return [gabarit.zoneTitre, gabarit.TAILLES.titre];
  const cle = d.type === "couverture" && meta.logo_client ? "couvertureAvecLogo" : d.type;
  return [gabarit.GRANDS_TITRES[cle], gabarit.TAILLES.grandTitre];
}

function controlerMesures(doc) {
  const alertes = [];
  const alerter = alerteur(alertes);
  doc.diapos.forEach((d, i) => {
    const nom = `Diapositive ${i + 1}`;
    if (d.titre) {
      const [boite, tailles] = boiteDuTitre(d, doc.meta);
      const r = gabarit.mesurerTitre(d.titre, boite, tailles);
      const marque = d.titre.includes(" // ");
      if (r.deborde) {
        alerter(d.ligne, "TEXTE_TROP_LONG", `${nom} : titre trop long, ${r.lignes.length} lignes même à ${r.taille} pt ; le raccourcir.`);
      } else if (r.coupe) {
        const proposition = marque ? null : proposerCoupure(gabarit.sansGras(d.titre), r.taille);
        alerter(d.ligne, "TITRE_A_COUPER", marque
          ? `${nom} : un segment du titre ne tient pas sur une ligne à ${r.taille} pt ; déplacer « // » ou raccourcir.`
          : `${nom} : titre sur ${r.lignes.length} lignes sans coupure marquée ; écrire « // » au point de coupure voulu${proposition ? `, par exemple « ${proposition} »` : ""}.`);
      } else if (motOrphelin(r.lignes)) {
        alerter(d.ligne, "TITRE_ORPHELIN", `${nom} : la dernière ligne du titre n'a qu'un mot (« ${r.lignes[r.lignes.length - 1]} ») ; déplacer « // ».`);
      }
    }
    if (d.type === "contenu" && d.accroche) {
      const r = gabarit.mesurerAccroche(d.accroche);
      if (r.deborde) alerter(d.ligne, "TEXTE_TROP_LONG", `${nom} : accroche trop longue, ${r.lignes.length} lignes même à ${r.taille} pt ; la tenir sur une ligne.`);
    }
  });
  return parLigne(alertes);
}

module.exports = { controlerTexte, controlerMesures };
