// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Mesure du texte en Open Sans, sans police installée : table de largeurs par
// caractère (open-sans-largeurs.json, générée par outils/mesurer-open-sans.py).
// Le crénage n'est pas pris en compte.

const TABLE = require("./open-sans-largeurs.json");

const ESPACE_INSECABLE = /[\u00A0\u202F]/;

function largeurPt(texte, { taille, gras = false, strict = false } = {}) {
  const jeu = gras ? TABLE.gras : TABLE.regulier;
  const defaut = gras ? TABLE.defaut.gras : TABLE.defaut.regulier;
  let em = 0;
  for (const c of texte) {
    const w = jeu[c];
    if (w === undefined) {
      if (strict) throw new Error(`Caractère absent de la table : « ${c} »`);
      em += defaut;
    } else {
      em += w;
    }
  }
  return em * taille;
}

// Retour à la ligne par mots ; " // " force une coupure et ne s'affiche pas ;
// l'espace insécable lie les mots sans couper.
function couperLignes(texte, largeurPouces, { taille, gras = false } = {}) {
  const limite = largeurPouces * 72;
  const mesure = (s) => largeurPt(s, { taille, gras });
  const lignes = [];
  for (const segment of String(texte).split(" // ")) {
    let courante = "";
    for (const mot of segment.split(" ").filter((m) => m !== "")) {
      if (courante === "") {
        courante = mot;
      } else if (mesure(`${courante} ${mot}`) <= limite) {
        courante = `${courante} ${mot}`;
      } else {
        lignes.push(courante);
        courante = mot;
      }
    }
    if (courante !== "" || segment === "") lignes.push(courante);
  }
  return lignes;
}

// Plus grande taille entière de max à min qui tient en hauteur ; `lignes` est
// le tableau des lignes à cette taille (" // " retirés) ; `deborde` vaut vrai
// si même min ne tient pas.
function ajuster(texte, { largeur, hauteur, max, min, gras = false, interligne = 1.2 }) {
  let lignes = [];
  for (let taille = max; taille >= min; taille--) {
    lignes = couperLignes(texte, largeur, { taille, gras });
    if ((lignes.length * taille * interligne) / 72 <= hauteur) return { taille, lignes, deborde: false };
  }
  return { taille: min, lignes, deborde: true };
}

// Vrai si un texte sur plusieurs lignes se termine par une ligne d'un seul mot.
function motOrphelin(lignes) {
  if (lignes.length < 2) return false;
  const derniere = lignes[lignes.length - 1].trim();
  return derniere !== "" && !/\s/.test(derniere.replace(ESPACE_INSECABLE, "x"));
}

module.exports = { largeurPt, couperLignes, ajuster, motOrphelin };
