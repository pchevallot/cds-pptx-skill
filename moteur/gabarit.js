// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Gabarit de la charte : page, marges, zones, palette, tailles de texte, masters,
// et les outils de mise en page partagés par les motifs (mesure d'un titre ou
// d'une liste, image contenue dans une boîte, réserve légendée). Toutes les
// dimensions sont en pouces, les tailles de texte en points.

const fs = require("fs");
const { couperLignes, ajuster } = require("./mesure.js");

const W = 13.33;
const H = 7.5;
const MARGE = 0.5;
const BARRE = 1.0;
const POLICE = "Open Sans";
const POLICE_CODE = "Consolas";

// Hauteur d'une ligne d'Open Sans en simple interligne : (ascendante + descendante)
// / unités par em = (2189 + 600) / 2048. PowerPoint la reprend telle quelle.
const INTERLIGNE = 1.36;

const COULEURS = {
  BLEU: "1F519B",
  OR: "FDC948",
  BLANC: "FFFFFF",
  GRIS_FONCE: "333333",
  GRIS_CLAIR: "F5F5F5",
  GRIS_MOYEN: "DDDDDD",
  GRIS_TEXTE: "777777",
  VERT: "4CAF50",
  ORANGE: "FF9800",
  ROUGE: "F44336",
};
const PALETTE = [COULEURS.BLEU, COULEURS.OR, COULEURS.VERT, COULEURS.ORANGE, COULEURS.ROUGE];

// Couleurs de signal qu'une source nomme pour ses cartes et ses chiffres clés
// (« Cartes : rouge, orange, gris ») : le nom, puis sa couleur.
const SIGNAUX = {
  bleu: COULEURS.BLEU, or: COULEURS.OR, gris: COULEURS.GRIS_FONCE,
  vert: COULEURS.VERT, orange: COULEURS.ORANGE, rouge: COULEURS.ROUGE,
};

// Rapport de contraste WCAG 2 entre deux couleurs hexadécimales (1 à 21).
function contraste(a, b) {
  const luminance = (hex) => {
    const [r, v, b_] = [0, 2, 4].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * v + 0.0722 * b_;
  };
  const [clair, fonce] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (clair + 0.05) / (fonce + 0.05);
}

// Une ombre neuve à chaque appel : PptxGenJS modifie l'objet qu'on lui passe.
const makeShadow = () => ({ type: "outer", color: "000000", blur: 6, offset: 2, angle: 135, opacity: 0.15 });

// Logo du master de contenu, à droite de la barre ; le titre s'arrête avant lui.
const LOGO_BARRE = { x: W - 2.2, w: 2.0 };
const zoneTitre = { x: MARGE, y: 0, w: W - 2.9, h: BARRE };
// Zone des motifs ; l'accroche, quand elle existe, prend le haut de la zone.
const zoneContenu = { x: MARGE, y: 1.5, w: W - 2 * MARGE, h: H - 1.5 - MARGE };
const zoneAccroche = { x: MARGE, y: 1.2, w: W - 2 * MARGE, h: 0.5 };
const zoneSousAccroche = { x: MARGE, y: 1.8, w: W - 2 * MARGE, h: H - 1.8 - MARGE };
// Pied « Source : … », dans la marge basse : il ne prend rien à la zone de contenu.
const zonePied = { x: MARGE, y: H - MARGE, w: W - 2 * MARGE, h: 0.35 };

// Cadres ajustés au contenu (cartes, colonnes, blocs, prompt) : hauteur mesurée,
// jamais sous le plancher, plus une marge basse sous le texte. Le groupe est
// centré optiquement dans la zone : 40 % du vide au-dessus, 60 % au-dessous.
const PLANCHER_CADRE = 2.0;
const MARGE_BAS_CADRE = 0.3;
const CENTRAGE_OPTIQUE = 0.4;
const hautOptique = (zone, h) => zone.y + Math.max(0, zone.h - h) * CENTRAGE_OPTIQUE;

// Titres des diapositives sur fond bleu.
const GRANDS_TITRES = {
  couverture: { x: 1, y: 1.8, w: W - 2, h: 2.2 },
  couvertureAvecLogo: { x: 1, y: 1.35, w: W - 2, h: 1.75 },
  section: { x: 1, y: 1.9, w: W - 2, h: 2.4 },
  cloture: { x: 1, y: 1.75, w: W - 2, h: 1.75 },
};

// Bornes de l'ajustement, en points.
const TAILLES = {
  titre: { max: 24, min: 18 },
  grandTitre: { max: 44, min: 28 },
  accroche: { max: 18, min: 16 }, // deux tailles seulement : voir mesurerAccroche
  puces: { max: 18, min: 14 },
  tableau: { max: 18, min: 10 },
  pied: { max: 10, min: 8 },
};

// ---------------------------------------------------------------------------
// Texte : gras de la source, mesure d'un titre, mesure d'une liste
// ---------------------------------------------------------------------------

const RE_GRAS = /(\*\*[^*]+\*\*|__[^_]+__)/;

// « une **puce** forte » -> [{ texte: "une " }, { texte: "puce", gras: true }, { texte: " forte" }]
function morceaux(texte) {
  return String(texte).split(RE_GRAS).filter((m) => m !== "")
    .map((m) => (RE_GRAS.test(m) ? { texte: m.slice(2, -2), gras: true } : { texte: m, gras: false }));
}
const sansGras = (texte) => morceaux(texte).map((m) => m.texte).join("");

// Paragraphes d'un titre : un par segment " // ", gras de la source conservé.
function paragraphesTitre(titre, options) {
  const segments = String(titre || "").split(" // ");
  const runs = [];
  segments.forEach((segment, i) => {
    const m = morceaux(segment);
    m.forEach((morceau, j) => runs.push({
      text: morceau.texte,
      options: { ...options, breakLine: j === m.length - 1 && i < segments.length - 1 },
    }));
  });
  return runs;
}

const hauteurLignes = (n, taille) => (n * taille * INTERLIGNE) / 72;

// Taille d'un titre en gras dans sa boîte. Une taille plus petite qui garde
// chaque segment (" // ") sur une ligne passe avant une taille plus grande qui
// coupe d'elle-même. `coupe` vaut vrai si le titre se coupe sans « // » voulu.
function mesurerTitre(titre, boite, { max, min }) {
  const texte = sansGras(titre || "");
  const segments = texte.split(" // ").length;
  for (let taille = max; taille >= min; taille--) {
    const lignes = couperLignes(texte, boite.w, { taille, gras: true });
    if (lignes.length <= segments && hauteurLignes(lignes.length, taille) <= boite.h) {
      return { taille, lignes, deborde: false, coupe: false };
    }
  }
  const r = ajuster(texte, { largeur: boite.w, hauteur: boite.h, max, min, gras: true, interligne: INTERLIGNE });
  return { ...r, coupe: r.lignes.length > segments };
}

// Accroche, en gras dans zoneAccroche : 18 pt, ou 16 pt en repli, rien entre les
// deux ni en dessous. `deborde` vaut vrai si elle ne tient pas même à 16 pt ; le
// rendu la pose alors à 16 pt et les contrôles alertent. Seule mesure de
// l'accroche, partagée par rendu.js et controles.js.
function mesurerAccroche(accroche) {
  const z = zoneAccroche;
  const texte = sansGras(accroche);
  let r;
  for (const taille of [TAILLES.accroche.max, TAILLES.accroche.min]) {
    r = ajuster(texte, { largeur: z.w, hauteur: z.h, max: taille, min: taille, gras: true, interligne: INTERLIGNE });
    if (!r.deborde) return r;
  }
  return r;
}

// Hauteur, en pouces, d'une liste de paragraphes à la taille donnée.
// paragraphe : { texte, retrait (pouces), ecart (points, ajouté à la taille) }.
// espace : points ajoutés après chaque paragraphe sauf le dernier.
function hauteurListe(paragraphes, { largeur, taille, espace = 0, gras = false }) {
  let total = (espace * Math.max(paragraphes.length - 1, 0)) / 72;
  for (const p of paragraphes) {
    const t = taille + (p.ecart || 0);
    const lignes = couperLignes(sansGras(p.texte), largeur - (p.retrait || 0), { taille: t, gras });
    total += hauteurLignes(lignes.length, t);
  }
  return total;
}

// Plus grande taille de max à min à laquelle une liste de paragraphes tient en
// hauteur (paragraphes et espace : voir hauteurListe).
function ajusterListe(paragraphes, { largeur, hauteur, max, min, espace = 0, gras = false }) {
  for (let taille = max; taille >= min; taille--) {
    if (hauteurListe(paragraphes, { largeur, taille, espace, gras }) <= hauteur) return { taille, deborde: false };
  }
  return { taille: min, deborde: true };
}

// Bornes d'un motif : au-delà de max, les `max` premiers sont gardés ; en deçà
// de min, la liste reste telle quelle. `message` est le texte de l'alerte
// DONNEES_INVALIDES à poser par l'appelant, null dans les bornes. Fonction pure.
function borner(liste, { min, max, quoi, nom }) {
  const bornes = min > 1 ? `il en faut de ${min} à ${max}` : `au plus ${max}`;
  let message = null;
  if (liste.length > max) {
    const ignores = liste.slice(max).map((e) => `« ${nom(e)} »`).join(", ");
    message = `${quoi} : ${bornes}, la source en a ${liste.length}. Rendu limité aux ${max} premiers ; non rendus : ${ignores}.`;
  } else if (liste.length < min) {
    message = `${quoi} : ${bornes}, la source en a ${liste.length}. Rendu tel quel.`;
  }
  return { liste: liste.slice(0, max), message };
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

// Une dimension nulle rend l'image illisible : aucun ratio à conserver.
const lisibles = (largeur, hauteur) => (largeur > 0 && hauteur > 0 ? { largeur, hauteur } : null);

// Dimensions natives en pixels, lues dans l'en-tête PNG ou JPEG ; null sinon.
function dimensionsImage(chemin) {
  let o;
  try { o = fs.readFileSync(chemin); } catch { return null; }
  if (o.length >= 24 && o.readUInt32BE(0) === 0x89504e47 && o.toString("latin1", 12, 16) === "IHDR") {
    return lisibles(o.readUInt32BE(16), o.readUInt32BE(20));
  }
  if (o.length >= 4 && o[0] === 0xff && o[1] === 0xd8) {
    let i = 2;
    while (i + 9 < o.length) {
      if (o[i] !== 0xff) return null;
      const marqueur = o[i + 1];
      if (marqueur === 0xff) { i++; continue; }
      // SOF0 à SOF15, hors DHT (C4), JPG (C8) et DAC (CC).
      if (marqueur >= 0xc0 && marqueur <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marqueur)) {
        return lisibles(o.readUInt16BE(i + 7), o.readUInt16BE(i + 5));
      }
      i += 2 + o.readUInt16BE(i + 2);
    }
  }
  return null;
}

// Plus grand rectangle au ratio de l'image qui tient dans la boîte, centré.
function contenir({ largeur, hauteur }, boite) {
  const ratio = largeur / hauteur;
  const w = Math.min(boite.w, boite.h * ratio);
  const h = w / ratio;
  return { x: boite.x + (boite.w - w) / 2, y: boite.y + (boite.h - h) / 2, w, h };
}

// Image de la charte : chemin de fichier, ou data URI (repli base64 de la skill).
const sourceImage = (s) => (String(s).startsWith("data:") ? { data: s } : { path: s });

// ---------------------------------------------------------------------------
// Masters et réserve
// ---------------------------------------------------------------------------

function definirMasters(pres, charte) {
  pres.defineSlideMaster({ title: "CDS_TITRE", background: { color: COULEURS.BLEU }, objects: [] });
  const logo = charte.LOGOS.jaune_blanc;
  const h = charte.hauteurPour(logo, LOGO_BARRE.w);
  pres.defineSlideMaster({
    title: "CDS_CONTENU",
    background: { color: COULEURS.BLANC },
    objects: [
      { rect: { x: 0, y: 0, w: W, h: BARRE, fill: { color: COULEURS.BLEU } } },
      { image: { ...sourceImage(logo), x: LOGO_BARRE.x, y: (BARRE - h) / 2, w: LOGO_BARRE.w, h } },
    ],
  });
}

// Réserve légendée : ce qui ne peut pas être rendu (motif non inscrit, image
// introuvable, dépendance absente) laisse sa place visible au lieu de disparaître.
// `ctx` est accepté pour un appel uniforme depuis les motifs ; il n'est pas lu.
function reserve(slide, zone, legende, ctx) {
  slide.addText(legende, {
    shape: "rect", x: zone.x, y: zone.y, w: zone.w, h: zone.h,
    fill: { color: COULEURS.GRIS_CLAIR }, line: { color: "AAAAAA", width: 1, dashType: "dash" },
    fontFace: POLICE, fontSize: 14, italic: true, color: COULEURS.GRIS_TEXTE,
    align: "center", valign: "middle",
  });
}

module.exports = {
  W, H, MARGE, BARRE, POLICE, POLICE_CODE, INTERLIGNE, COULEURS, PALETTE, SIGNAUX, contraste, makeShadow,
  LOGO_BARRE, zoneTitre, zoneContenu, zoneAccroche, zoneSousAccroche, zonePied, GRANDS_TITRES, TAILLES,
  PLANCHER_CADRE, MARGE_BAS_CADRE, hautOptique,
  morceaux, sansGras, paragraphesTitre, hauteurLignes, mesurerTitre, mesurerAccroche, hauteurListe, ajusterListe, borner,
  dimensionsImage, contenir, sourceImage, definirMasters, reserve,
};
