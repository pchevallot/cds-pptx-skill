// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motif schéma : processus, cycle, hiérarchie et logigramme dessinés ici, la
// chronologie déléguée à la frise (motifs/riches.js), qui pose aussi sa légende.
// Les contrats de `ctx` et du registre sont en tête de rendu.js.
//
//   geometrieSchema(schema, zone) -> {
//     boites: { x, y, w, h, texte, detail: string[], forme: "rect" | "losange",
//               role, taille, tailleDetail, resserre,
//               zoneDetail: { x, y, w, h, cadre, resserre } | null }[],
//     liens: { points: [x, y][], fleche, etiquette?: { texte, x, y, w, h, taille } }[],
//     legende: { x, y, w, h, texte, taille } | null,
//     zone,          la place laissée au schéma par la légende ;
//     invalides,     messages DONNEES_INVALIDES (bornes, type, rang, texte vide, branche) ;
//     debordements,  messages TEXTE_TROP_LONG (texte qui ne tient pas, même au plus petit) ;
//   }
//   Fonction pure : ni PptxGenJS ni ctx ; le texte est mesuré par mesure.couperLignes.
//   Le détail d'une boîte s'écrit dans zoneDetail quand elle existe, sinon dans
//   la boîte, sous son texte, à tailleDetail. `resserre` (pouces, de chaque
//   côté) rétrécit la largeur d'écriture pour éviter un mot seul en dernière
//   ligne. Schéma et légende (0,3 pouce
//   dessous) sont centrés ensemble dans la zone.
//
// Décompte des boîtes (schema.elements est la liste plate de l'analyseur) :
//   processus, cycle  une boîte par puce, ses sous-puces en détail ;
//   hiérarchie        une boîte par puce et par sous-puce, le 3e rang en détail
//                     de la sous-puce ; chaque enfant relié à son parent ;
//   logigramme        une boîte par puce (losange pour « ? »), plus une boîte
//                     par branche « non : action », sous-puce d'une question.
//
// Journal des versions retenues (octobre 2026). Source : le générateur Markdown
// du kit de séance d'octobre 2026 (cases, flèches collées, équerres, arbre des
// éléments) ; on reprend sa géométrie, le rendu passe par les formes PptxGenJS.
//
//   Processus   cases en ligne, flèche droite de l'une à la suivante, sous-puces
//               en texte libre sous chaque case ; une taille commune à toutes les
//               cases. Ajoutés : flèches de 0,6 pouce (1,1 cm dans la source),
//               largeur bornée à 2,8 pouces et ligne centrée (deux cases
//               prenaient chacune la demi-largeur),
//               hauteur du détail mesurée, un paragraphe espacé par détail.
//   Cycle       cases sur une ellipse inscrite dans la zone, départ en haut,
//               flèche entre les deux points d'accroche les plus proches. Ajoutés :
//               les sous-puces, ignorées par la source, vont dans la case, qui
//               grandit pour elles en laissant au moins 0,35 pouce entre deux
//               cases ; entrée et sortie distinctes sur chaque case, aucune
//               flèche à travers une case, longueur totale la plus courte.
//   Hiérarchie  tête centrée, rang des enfants, listes du 3e rang encadrées sous
//               chaque enfant, liaisons en équerre sans pointe. Généralisé : avec
//               plusieurs puces, chacune est une tête centrée sur ses enfants (la
//               source mettait les têtes au rang des enfants et perdait un rang).
//               Écarts portés de 0,5 cm à 0,3 pouce entre cases sœurs, 0,4 entre
//               deux sous-arbres, 0,35 entre une case et sa liste ; au plus six
//               colonnes.
//   Logigramme  colonne du chemin principal, losange par question, branche
//               « non : action » à droite, mots « non » et « oui » posés près des
//               flèches. Corrigés : l'écart vertical est réservé (le losange
//               débordait sur l'écart et collait à la flèche), le « oui » tient
//               dans l'écart, la branche a la largeur des cases, losange 1,8 fois
//               plus large qu'une case et au plus 5 fois plus large que haut ;
//               hauteurs dictées par le texte, une seule taille de 18 à 12 pt
//               (TEXTE_TROP_LONG en deçà), flèches de 0,5 pouce (0,4 au plus
//               serré), composition centrée ;
//               formes réduites au rectangle arrondi et au losange.
//   Texte       taille commune mesurée ; un mot seul en dernière ligne est évité
//               en resserrant la largeur d'écriture (marges latérales).
//   Couleurs    charte CdS, bleu et or seulement (vert et orange sont aux
//               graphiques) : cases bleues à texte blanc, or à texte bleu pour la
//               dernière étape, les enfants et les questions, listes et branches
//               sur EEF2F8 à liseré bleu ; flèches bleues de 3 pt à pointe
//               triangulaire de 0,18 pouce ; ombre sur les cases.

const g = require("../gabarit.js");
const { couperLignes, largeurPt, ajuster, motOrphelin } = require("../mesure.js");
const { frise } = require("./riches.js");

const { COULEURS, POLICE, INTERLIGNE } = g;
const CM = 1 / 2.54;

// Bornes de l'ajustement propres aux schémas, en points.
const TAILLES = {
  etape: { max: 18, min: 11 },
  noeud: { max: 18, min: 10 },
  logigramme: { max: 18, min: 12 },
  detail: { max: 14, min: 10 },
  etiquette: { max: 14, min: 10 },
  legende: { max: 14, min: 11 },
};
// Marge intérieure des cases rectangulaires, en points. Le losange n'en a pas :
// PowerPoint y écrit dans le rectangle central, de la moitié de ses côtés.
const MARGE_TEXTE = 4;
const PAD = MARGE_TEXTE / 72;
// Rayon des coins des cases et des listes. PowerPoint écrit dans le rectangle
// intérieur du rectangle arrondi, rentré de 0,2929 fois le rayon de chaque côté.
const RAYON = 0.12;
const RAYON_LISTE = 0.08;
const rayonDe = (h) => Math.min(RAYON, h / 4);
const retrait = (rayon) => 2 * (PAD + 0.2929 * rayon);
// Points ajoutés avant chaque paragraphe de détail : deux détails restent distincts.
const ESPACE_DETAIL = 4;
const ECART_LEGENDE = 0.3;
const TRAIT_FLECHE = 3;
const TRAIT_LIAISON = 1.75;
const FOND_CLAIR = "EEF2F8";
const MAX_COLONNES = 6;
// Logigramme : écarts verticaux (longueur des flèches) essayés dans l'ordre, et
// hauteur maximale d'un losange.
const ECARTS_LOGIGRAMME = [0.5, 0.45, 0.4];
const QH_MAX = 2.5;

const NOMS = { processus: "Processus", cycle: "Cycle", hierarchie: "Hiérarchie", logigramme: "Logigramme" };

// ---------------------------------------------------------------------------
// Mesure
// ---------------------------------------------------------------------------

// { h } d'un texte à la taille donnée, en pouces ; Infinity si un mot seul est
// plus large que la boîte.
function mesureTexte(texte, largeur, taille, gras) {
  const lignes = couperLignes(g.sansGras(texte), largeur, { taille, gras });
  if (lignes.some((l) => largeurPt(l, { taille, gras }) > largeur * 72 + 1e-6)) return { h: Infinity };
  return { h: g.hauteurLignes(lignes.length, taille) };
}
const somme = (a, b) => ({ h: a.h + b.h });

// Paragraphes de détail, chacun précédé de ESPACE_DETAIL (sauf le premier si `premierEspace` est faux).
function mesureDetails(details, largeur, taille, premierEspace = true) {
  return details.reduce((m, d, k) => {
    const espace = k > 0 || premierEspace ? ESPACE_DETAIL / 72 : 0;
    return somme(m, { h: mesureTexte(d, largeur, taille, false).h + espace });
  }, { h: 0 });
}

// Le détail écrit dans la case est deux points plus petit que son texte, jamais sous le minimum du détail.
const tailleDetailDe = (taille) => Math.max(taille - 2, TAILLES.detail.min);

// Texte d'une case (gras par défaut), puis son détail en régulier.
function mesureCase(b, largeur, taille, gras = true) {
  const m = mesureTexte(b.texte, largeur, taille, gras);
  return b.detail.length ? somme(m, mesureDetails(b.detail, largeur, tailleDetailDe(taille))) : m;
}

// Plus grande taille de max à min à laquelle chaque contenu tient dans sa place.
// contenu : { texte, place, mesure(taille) -> { h } }. Ce qui ne tient pas,
// même à min, devient un message de débordement.
function tailleCommune(res, contenus, { max, min }, quoi) {
  for (let t = max; t >= min; t--) {
    if (contenus.every((c) => c.mesure(t).h <= c.place + 1e-9)) return t;
  }
  const trop = contenus.filter((c) => c.mesure(min).h > c.place + 1e-9).map((c) => `« ${court(c.texte)} »`);
  res.debordements.push(`${quoi} trop long pour sa case, même à ${min} pt : ${trop.join(", ")}. Raccourcir.`);
  return min;
}

// Retrait horizontal supplémentaire, de chaque côté, qui évite un mot seul en
// dernière ligne : la largeur d'écriture est resserrée par pas de 5 %, jusqu'à
// 60 %, tant que le texte tient dans sa place. 0 si rien n'y fait.
// paragraphe : { texte, taille, gras, espace (pouces avant lui) }.
function resserrer(paragraphes, largeur, place) {
  const orphelin = (w) => paragraphes.some((p) => motOrphelin(couperLignes(g.sansGras(p.texte), w, { taille: p.taille, gras: p.gras })));
  const hauteur = (w) => paragraphes.reduce((s, p) => s + mesureTexte(p.texte, w, p.taille, p.gras).h + (p.espace || 0), 0);
  if (!orphelin(largeur)) return 0;
  for (let k = 1; k <= 8; k++) {
    const w = largeur * (1 - 0.05 * k);
    if (!orphelin(w) && hauteur(w) <= place + 1e-9) return (largeur - w) / 2;
  }
  return 0;
}

const court = (t) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);

// ---------------------------------------------------------------------------
// Éléments
// ---------------------------------------------------------------------------

// Arbre des éléments : puces, leurs sous-puces, et le 3e rang sous la dernière
// sous-puce (repris de la source). Une sous-puce sans puce au-dessus devient
// une puce, signalée.
function arbre(elements, res) {
  const racines = [];
  for (const e of elements) {
    const noeud = { texte: e.texte, question: !!e.question, enfants: [] };
    if (e.niveau === 0 || !racines.length) {
      if (e.niveau > 0) res.invalides.push(`Sous-puce « ${e.texte} » sans puce au-dessus d'elle : rendue comme une puce.`);
      racines.push(noeud);
    } else {
      const parent = racines[racines.length - 1];
      if (e.niveau === 1 || !parent.enfants.length) parent.enfants.push(noeud);
      else parent.enfants[parent.enfants.length - 1].enfants.push(noeud);
    }
  }
  return racines;
}
const descendants = (n) => n.enfants.flatMap((e) => [e.texte, ...descendants(e)]);

// gabarit.borner, le message rangé dans res.invalides.
function borner(res, liste, bornes) {
  const r = g.borner(liste, { ...bornes, nom: (e) => e.texte });
  if (r.message) res.invalides.push(r.message);
  return r.liste;
}

const boite = (x, y, w, h, texte, detail, role, forme = "rect") =>
  ({ x, y, w, h, texte, detail, forme, role, taille: null, tailleDetail: null, zoneDetail: null, resserre: 0 });

// Points d'accroche d'une case : haut, gauche, bas, droite.
const sites = (b) => [[b.x + b.w / 2, b.y], [b.x, b.y + b.h / 2], [b.x + b.w / 2, b.y + b.h], [b.x + b.w, b.y + b.h / 2]];

// Vrai si le segment pq passe par l'intérieur du rectangle r, bords exclus
// (découpage de Liang et Barsky).
function coupe([x1, y1], [x2, y2], r) {
  const e = 1e-6;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, x1 - (r.x + e)], [dx, r.x + r.w - e - x1], [-dy, y1 - (r.y + e)], [dy, r.y + r.h - e - y1]]) {
    if (Math.abs(p) < 1e-12) {
      if (q < 0) return false;
    } else if (p < 0) {
      t0 = Math.max(t0, q / p);
    } else {
      t1 = Math.min(t1, q / p);
    }
  }
  return t1 - t0 > 1e-9;
}

// ---------------------------------------------------------------------------
// Processus
// ---------------------------------------------------------------------------

function processus(elements, z, res) {
  const etapes = borner(res, arbre(elements, res), { min: 2, max: 6, quoi: "Étapes du processus" });
  const n = etapes.length;
  // Flèches de 0,6 pouce au moins : ce sont les cases qui rétrécissent, jusqu'à 2,8 pouces au plus.
  const ecart = 0.6;
  const ecartDetail = 0.3 * CM;
  const w = Math.min((z.w - (n - 1) * ecart) / n, 2.8);
  const x0 = z.x + (z.w - (n * w + (n - 1) * ecart)) / 2;
  const details = etapes.map(descendants);
  const avecDetails = details.some((d) => d.length);
  const h = Math.min(avecDetails ? 3 * CM : 3.6 * CM, z.h * 0.45);
  const placeDetail = z.h - h - ecartDetail;

  const taille = tailleCommune(res, etapes.map((e) => ({
    texte: e.texte, place: h - retrait(rayonDe(h)), mesure: (t) => mesureTexte(e.texte, w - retrait(rayonDe(h)), t, true),
  })), TAILLES.etape, "Texte d'étape");
  let tailleDetail = null;
  let hDetail = 0;
  if (avecDetails) {
    const avec = details.filter((d) => d.length);
    tailleDetail = tailleCommune(res, avec.map((d) => ({
      texte: d[0], place: placeDetail, mesure: (t) => mesureDetails(d, w, t, false),
    })), TAILLES.detail, "Détail d'étape");
    hDetail = Math.min(placeDetail, Math.max(...avec.map((d) => mesureDetails(d, w, tailleDetail, false).h)) + 0.05);
  }
  const total = h + (avecDetails ? ecartDetail + hDetail : 0);
  const y = z.y + (z.h - total) / 2;

  etapes.forEach((e, i) => {
    const b = boite(x0 + i * (w + ecart), y, w, h, e.texte, details[i], i === n - 1 && n > 1 ? "fin" : "etape");
    b.taille = taille;
    if (details[i].length) {
      b.tailleDetail = tailleDetail;
      b.zoneDetail = { x: b.x, y: y + h + ecartDetail, w, h: hDetail, cadre: false };
    }
    res.boites.push(b);
  });
  for (let i = 0; i + 1 < n; i++) {
    res.liens.push({ points: [sites(res.boites[i])[3], sites(res.boites[i + 1])[1]], fleche: true });
  }
}

// ---------------------------------------------------------------------------
// Cycle
// ---------------------------------------------------------------------------

function cycle(elements, z, res) {
  const etapes = borner(res, arbre(elements, res), { min: 3, max: 6, quoi: "Étapes du cycle" });
  const n = etapes.length;
  const details = etapes.map(descendants);
  const avecDetails = details.some((d) => d.length);
  const w = Math.min(7.5 * CM, z.w / 3.4);
  // Avec un détail, la case grandit, mais laisse au moins 0,35 pouce entre deux
  // cases voisines en hauteur (six étapes : celles de 30 et 150 degrés).
  const h = avecDetails ? Math.min(1.3, z.h / 3.8) : Math.min(2.4 * CM, z.h / 4.2);
  const cx = z.x + z.w / 2;
  const cy = z.y + z.h / 2;
  const rx = z.w / 2 - w / 2 - 0.2 * CM;
  const ry = z.h / 2 - h / 2;

  etapes.forEach((e, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    res.boites.push(boite(cx + rx * Math.cos(angle) - w / 2, cy + ry * Math.sin(angle) - h / 2, w, h, e.texte, details[i], "etape"));
  });
  const taille = tailleCommune(res, res.boites.map((b) => ({
    texte: b.texte, place: h - retrait(rayonDe(h)), mesure: (t) => mesureCase(b, w - retrait(rayonDe(h)), t),
  })), TAILLES.etape, "Texte d'étape");
  for (const b of res.boites) {
    b.taille = taille;
    if (b.detail.length) b.tailleDetail = tailleDetailDe(taille);
  }

  for (const l of liensDuCycle(res.boites)) res.liens.push(l);
}

// Liens d'un cycle : chaque case vers la suivante, la dernière vers la première.
// Chaque case a un point d'entrée et un point de sortie distincts, parmi ses
// quatre points d'accroche ; on choisit l'ensemble de plus courte longueur
// totale, un segment qui traverse une case comptant comme interdit. Recherche
// exacte : le point d'entrée et de sortie de la première case est fixé (12
// choix), puis on parcourt le cycle en ne gardant, pour chaque point de sortie
// possible de la case courante, que le meilleur chemin (programmation dynamique).
function liensDuCycle(boites) {
  const n = boites.length;
  if (n < 2) return [];
  const S = boites.map(sites);
  const INTERDIT = 1e6;
  const cout = (i, a, j, k) => {
    const [p, q] = [S[i][a], S[j][k]];
    const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
    return boites.some((r) => coupe(p, q, r)) ? INTERDIT + d : d;
  };
  let meilleur = null;
  for (let e0 = 0; e0 < 4; e0++) {
    for (let s0 = 0; s0 < 4; s0++) {
      if (e0 === s0) continue;
      // etats[s] : meilleur chemin dont la case courante sort par s ; choix = [entrée, sortie] par case.
      let etats = [null, null, null, null];
      etats[s0] = { cout: 0, choix: [[e0, s0]] };
      for (let i = 1; i < n; i++) {
        const suivants = [null, null, null, null];
        etats.forEach((etat, sp) => {
          if (!etat) return;
          for (let e = 0; e < 4; e++) {
            for (let sx = 0; sx < 4; sx++) {
              if (e === sx) continue;
              const c = etat.cout + cout(i - 1, sp, i, e);
              if (!suivants[sx] || c < suivants[sx].cout) suivants[sx] = { cout: c, choix: [...etat.choix, [e, sx]] };
            }
          }
        });
        etats = suivants;
      }
      etats.forEach((etat, sp) => {
        if (!etat) return;
        const c = etat.cout + cout(n - 1, sp, 0, e0);
        if (!meilleur || c < meilleur.cout) meilleur = { cout: c, choix: etat.choix };
      });
    }
  }
  return meilleur.choix.map(([, sortie], i) => {
    const j = (i + 1) % n;
    return { points: [S[i][sortie], S[j][meilleur.choix[j][0]]], fleche: true };
  });
}

// ---------------------------------------------------------------------------
// Hiérarchie
// ---------------------------------------------------------------------------

// Lien d'un parent à son enfant : droit s'ils sont alignés, sinon en équerre
// (vers le bas, de côté, vers le bas) à mi-hauteur de l'écart entre les rangs.
function equerre(parent, enfant) {
  const [x1, y1] = sites(parent)[2];
  const [x2, y2] = sites(enfant)[0];
  if (Math.abs(x2 - x1) < 1e-6) return { points: [[x1, y1], [x2, y2]], fleche: false };
  const ym = (y1 + y2) / 2;
  return { points: [[x1, y1], [x1, ym], [x2, ym], [x2, y2]], fleche: false };
}

// Au plus MAX_COLONNES colonnes : une par enfant, une par tête sans enfant.
function bornerColonnes(res, racines) {
  let reste = MAX_COLONNES;
  const gardees = [];
  const ignores = [];
  for (const r of racines) {
    if (reste <= 0) { ignores.push(r.texte); continue; }
    const enfants = r.enfants.slice(0, reste);
    ignores.push(...r.enfants.slice(reste).map((e) => e.texte));
    gardees.push({ ...r, enfants });
    reste -= Math.max(1, enfants.length);
  }
  if (ignores.length) {
    res.invalides.push(`Hiérarchie : au plus ${MAX_COLONNES} cases au rang des sous-puces (une colonne par sous-puce, une par puce sans sous-puce). Non rendues : ${ignores.map((t) => `« ${t} »`).join(", ")}.`);
  }
  return gardees;
}

function hierarchie(elements, z, res) {
  const profonds = elements.filter((e) => e.niveau > 2);
  if (profonds.length) {
    res.invalides.push(`Hiérarchie : trois rangs au plus ; rendus au 3e rang : ${profonds.map((e) => `« ${e.texte} »`).join(", ")}.`);
  }
  const racines = bornerColonnes(res, arbre(elements, res));
  const hNoeud = 1.9 * CM;
  const ecartRang = 1.3 * CM;
  const ecartListe = 0.35;
  const ecart = 0.3;
  const ecartGroupe = 0.4;
  const enfants = racines.flatMap((r) => r.enfants);
  const listes = enfants.filter((e) => e.enfants.length);

  // Une colonne par enfant, une pour une tête sans enfant ; la tête est centrée sur les siennes.
  const colonnes = racines.map((r) => Math.max(1, r.enfants.length));
  const nCol = colonnes.reduce((a, b) => a + b, 0);
  const ecarts = (nCol - racines.length) * ecart + (racines.length - 1) * ecartGroupe;
  const colW = Math.min((z.w - ecarts) / nCol, 3.6);
  const x0 = z.x + (z.w - (nCol * colW + ecarts)) / 2;
  const placeListe = z.h - 2 * hNoeud - ecartRang - ecartListe;

  let tailleListe = null;
  let hListe = 0;
  if (listes.length) {
    tailleListe = tailleCommune(res, listes.map((e) => ({
      texte: e.enfants[0].texte, place: placeListe - retrait(RAYON_LISTE), mesure: (t) => mesureDetails(descendants(e), colW - retrait(RAYON_LISTE), t, false),
    })), TAILLES.detail, "Liste du 3e rang");
    const besoin = Math.max(...listes.map((e) => mesureDetails(descendants(e), colW - retrait(RAYON_LISTE), tailleListe, false).h));
    hListe = Math.min(placeListe, besoin + retrait(RAYON_LISTE) + 0.1);
  }
  const total = hNoeud + (enfants.length ? ecartRang + hNoeud : 0) + (listes.length ? ecartListe + hListe : 0);
  const yTete = z.y + (z.h - total) / 2;
  const yEnfant = yTete + hNoeud + ecartRang;

  const tetes = [];
  const rang = [];
  let x = x0;
  racines.forEach((r, i) => {
    const span = colonnes[i] * colW + (colonnes[i] - 1) * ecart;
    const wTete = Math.min(span, 10 * CM);
    const tete = boite(x + (span - wTete) / 2, yTete, wTete, hNoeud, r.texte, [], "tete");
    res.boites.push(tete);
    tetes.push(tete);
    r.enfants.forEach((e, j) => {
      const b = boite(x + j * (colW + ecart), yEnfant, colW, hNoeud, e.texte, descendants(e), "noeud");
      if (b.detail.length) {
        b.tailleDetail = tailleListe;
        b.zoneDetail = { x: b.x, y: yEnfant + hNoeud + ecartListe, w: colW, h: hListe, cadre: true };
      }
      res.boites.push(b);
      rang.push(b);
      res.liens.push(equerre(tete, b));
      if (b.zoneDetail) res.liens.push({ points: [sites(b)[2], sites(b.zoneDetail)[0]], fleche: false });
    });
    x += span + ecartGroupe;
  });

  const mesurer = (liste, bornes, quoi) => {
    const taille = tailleCommune(res, liste.map((b) => ({
      texte: b.texte, place: b.h - retrait(rayonDe(b.h)), mesure: (t) => mesureTexte(b.texte, b.w - retrait(rayonDe(b.h)), t, true),
    })), bornes, quoi);
    for (const b of liste) b.taille = taille;
  };
  mesurer(tetes, TAILLES.etape, "Texte de tête");
  if (rang.length) mesurer(rang, TAILLES.noeud, "Texte de case");
}

// ---------------------------------------------------------------------------
// Logigramme
// ---------------------------------------------------------------------------

// « non : action » -> ["non", "action"]. Seul un mot sans espace avant « : »
// fait le mot de la branche ; sinon tout le texte est l'action d'un « non ».
function couperBranche(texte) {
  const m = /^([^\s:]{1,20})\s*:\s+(.+)$/.exec(texte);
  return m ? [m[1], m[2].trim()] : ["non", texte];
}
const OPPOSES = { non: "oui", oui: "non" };
const sansAccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

function logigramme(elements, z, res) {
  const principal = borner(res, arbre(elements, res), { min: 1, max: 6, quoi: "Puces du chemin principal du logigramme" });
  const n = principal.length;
  const avecBranches = principal.some((e) => e.question && e.enfants.length);
  // Le losange, jusqu'à 1,8 fois plus large qu'une case, écrit dans sa moitié
  // centrale ; il n'est jamais plus de 5 fois plus large que haut.
  const w = Math.min(10 * CM, z.w * (avecBranches ? 0.27 : 0.4));
  const lwMax = Math.min(1.8 * w, z.w);
  const ecartBranche = 1.3;
  const hMax = 2.1 * CM;
  const ret = retrait(RAYON);

  // Un rang par puce : une étape, ou une question et sa branche « mot : action ».
  const doublees = [];
  const rangs = principal.map((e) => {
    if (!e.question) return { question: false, texte: e.texte, detail: descendants(e), branche: null };
    let branche = null;
    if (e.enfants.length) {
      const [premiere, ...autres] = e.enfants;
      if (autres.length) doublees.push(e.texte);
      const [mot, action] = couperBranche(premiere.texte);
      branche = { mot, texte: action, detail: [...descendants(premiere), ...autres.flatMap((a) => [a.texte, ...descendants(a)])] };
    }
    return { question: true, texte: e.texte, detail: [], branche };
  });
  if (doublees.length) {
    res.invalides.push(`Logigramme : une seule branche « non : action » par question ; les suivantes sont jointes au détail de la première pour ${doublees.map((t) => `« ${t} »`).join(", ")}.`);
  }
  const etapes = rangs.filter((r) => !r.question);
  const questions = rangs.filter((r) => r.question);

  // Hauteurs à la taille t, dictées par le texte : une commune aux étapes, une
  // commune aux losanges (la branche tient dans la hauteur de sa question).
  const hEtape = (t) => Math.max(0.45, ...etapes.map((r) => mesureCase(r, w - ret, t).h + ret));
  const hQuestion = (t) => {
    for (let qh = 0.5; qh <= QH_MAX + 1e-9; qh += 0.05) {
      const lw = Math.min(lwMax, 5 * qh);
      const tient = questions.every((r) => mesureTexte(r.texte, lw / 2, t, true).h <= qh / 2 + 1e-9
        && (!r.branche || mesureCase(r.branche, w - ret, t, false).h <= qh - ret + 1e-9));
      if (tient) return qh;
    }
    return Infinity;
  };
  const hauteursA = (t) => ({ hs: etapes.length ? hEtape(t) : 0, qh: questions.length ? hQuestion(t) : 0 });
  const besoin = ({ hs, qh }) => etapes.length * hs + questions.length * qh;
  // Plus grande taille, de 18 à 12 pt, à laquelle le chemin principal tient en
  // hauteur avec des flèches de 0,5 pouce ; à défaut, les flèches descendent à
  // 0,45 puis 0,4 pouce avant que le texte ne déborde.
  let taille = null;
  let hs;
  let qh;
  let ecartV;
  for (const e of ECARTS_LOGIGRAMME) {
    for (let t = TAILLES.logigramme.max; t >= TAILLES.logigramme.min && taille === null; t--) {
      const r = hauteursA(t);
      if (besoin(r) <= z.h - (n - 1) * e + 1e-9) ({ hs, qh } = r, taille = t, ecartV = e);
    }
    if (taille !== null) break;
  }
  if (taille === null) {
    ecartV = ECARTS_LOGIGRAMME[ECARTS_LOGIGRAMME.length - 1];
    taille = TAILLES.logigramme.min;
    ({ hs, qh } = hauteursA(taille));
    qh = Math.min(qh, QH_MAX);
    res.debordements.push(`Logigramme trop chargé pour la diapositive, même à ${taille} pt : raccourcir les textes ou retirer une puce.`);
  }
  const place = z.h - (n - 1) * ecartV;
  if (besoin({ hs, qh }) > place) {
    // Débordement déjà signalé : les rangs sont réduits ensemble pour rester dans la zone.
    const k = place / besoin({ hs, qh });
    hs *= k;
    qh *= k;
  } else {
    // La place restante agrandit les rangs, jusqu'à 2,1 cm pour une étape.
    const d = (place - besoin({ hs, qh })) / n;
    hs = Math.max(hs, Math.min(hMax, hs + d));
    qh = Math.max(qh, Math.min(1.4 * hMax, qh + d));
  }
  const lw = Math.min(lwMax, 5 * qh);
  const hauteurs = rangs.map((r) => (r.question ? qh : hs));
  const total = hauteurs.reduce((x, y) => x + y, 0) + (n - 1) * ecartV;
  const largeurTotale = avecBranches ? lw + ecartBranche + w : 0;
  const cx = avecBranches ? z.x + (z.w - largeurTotale) / 2 + lw / 2 : z.x + z.w / 2;
  const xBranche = cx + lw / 2 + ecartBranche;

  let y = z.y + (z.h - total) / 2;
  const cases = [];
  const branches = [];
  rangs.forEach((r, i) => {
    const hc = hauteurs[i];
    if (r.question) {
      const q = boite(cx - lw / 2, y, lw, hc, r.texte, [], "question", "losange");
      cases.push(q);
      if (r.branche) branches.push({ question: q, mot: r.branche.mot, b: boite(xBranche, y, w, hc, r.branche.texte, r.branche.detail, "branche") });
    } else {
      cases.push(boite(cx - w / 2, y, w, hc, r.texte, r.detail, "etape"));
    }
    y += hc + ecartV;
  });
  // Une seule taille pour les cases, les losanges et les branches.
  for (const b of [...cases, ...branches.map((br) => br.b)]) {
    b.taille = taille;
    if (b.detail.length) b.tailleDetail = tailleDetailDe(taille);
  }

  // Étiquettes « non » et « oui » : mesurées ensemble, posées hors des cases.
  const hEtiquette = 0.3;
  const placeMot = { w: ecartBranche - 0.2, h: hEtiquette };
  const placeOppose = { w: 0.9, h: hEtiquette };
  const mots = branches.map(({ mot, question }) => {
    const i = cases.indexOf(question);
    return { mot, oppose: i + 1 < n ? OPPOSES[sansAccent(mot)] : null };
  });
  const etiquettes = mots.flatMap(({ mot, oppose }) => [{ texte: mot, ...placeMot }, ...(oppose ? [{ texte: oppose, ...placeOppose }] : [])]);
  let tailleEtiquette = TAILLES.etiquette.max;
  if (etiquettes.length) {
    tailleEtiquette = tailleCommune(res, etiquettes.map((e) => ({
      texte: e.texte, place: e.h,
      mesure: (t) => (couperLignes(e.texte, e.w, { taille: t, gras: true }).length > 1 ? { h: Infinity } : mesureTexte(e.texte, e.w, t, true)),
    })), TAILLES.etiquette, "Mot de branche");
  }

  cases.forEach((b, i) => {
    res.boites.push(b);
    if (i + 1 < n) {
      const lien = { points: [sites(b)[2], sites(cases[i + 1])[0]], fleche: true };
      const j = branches.findIndex((br) => br.question === b);
      if (j >= 0 && mots[j].oppose) {
        lien.etiquette = { texte: mots[j].oppose, x: cx + 0.15, y: b.y + b.h + (ecartV - hEtiquette) / 2, ...placeOppose, taille: tailleEtiquette };
      }
      res.liens.push(lien);
    }
  });
  branches.forEach(({ question, b }, j) => {
    res.boites.push(b);
    const depart = sites(question)[3];
    res.liens.push({
      points: [depart, sites(b)[1]], fleche: true,
      etiquette: { texte: mots[j].mot, x: depart[0] + 0.1, y: depart[1] - hEtiquette - 0.06, ...placeMot, taille: tailleEtiquette },
    });
  });
}

// ---------------------------------------------------------------------------
// Géométrie
// ---------------------------------------------------------------------------

// Pose `resserre` (pouces de chaque côté) sur la case et sur sa zone de détail.
function resserrerBoite(b) {
  const losange = b.forme === "losange";
  const ecrit = losange ? { w: b.w / 2, h: b.h / 2 } : { w: b.w - retrait(rayonDe(b.h)), h: b.h - retrait(rayonDe(b.h)) };
  const dedans = b.zoneDetail ? [] : b.detail;
  b.resserre = resserrer([
    { texte: b.texte, taille: b.taille, gras: b.role !== "branche" },
    ...dedans.map((d) => ({ texte: d, taille: b.tailleDetail, gras: false, espace: ESPACE_DETAIL / 72 })),
  ], ecrit.w, ecrit.h);
  if (b.zoneDetail) {
    const zd = b.zoneDetail;
    const r = zd.cadre ? retrait(RAYON_LISTE) : 0;
    zd.resserre = resserrer(b.detail.map((d, k) => ({ texte: d, taille: b.tailleDetail, gras: false, espace: k ? ESPACE_DETAIL / 72 : 0 })), zd.w - r, zd.h - r);
  }
}

const CONSTRUIRE = { processus, cycle, hierarchie, logigramme };

// Pose la légende à ECART_LEGENDE sous le bas réel du schéma, puis centre
// l'ensemble schéma et légende en hauteur dans la zone.
function centrer(res, zone) {
  const rects = [...res.boites, ...res.boites.map((b) => b.zoneDetail).filter(Boolean), ...res.liens.map((l) => l.etiquette).filter(Boolean)];
  if (!rects.length) return;
  const ys = res.liens.flatMap((l) => l.points.map((p) => p[1]));
  const haut = Math.min(...rects.map((r) => r.y), ...ys);
  let bas = Math.max(...rects.map((r) => r.y + r.h), ...ys);
  if (res.legende) {
    res.legende.y = bas + ECART_LEGENDE;
    bas = res.legende.y + res.legende.h;
  }
  const dy = zone.y + (zone.h - (bas - haut)) / 2 - haut;
  for (const r of rects) r.y += dy;
  for (const l of res.liens) l.points = l.points.map(([x, y]) => [x, y + dy]);
  if (res.legende) res.legende.y += dy;
}

function geometrieSchema(schema, zone) {
  const s = schema || { type: null, elements: [], legende: null };
  const res = { boites: [], liens: [], legende: null, zone: { ...zone }, invalides: [], debordements: [] };
  const z = res.zone;

  if (s.legende) {
    const r = ajuster(g.sansGras(s.legende), { largeur: z.w, hauteur: 0.45, ...TAILLES.legende, interligne: INTERLIGNE });
    const h = Math.min(g.hauteurLignes(r.lignes.length, r.taille), 0.45);
    if (r.deborde) res.debordements.push(`Phrase sous le schéma trop longue, même à ${r.taille} pt : la raccourcir.`);
    res.legende = { x: z.x, y: z.y + z.h - h, w: z.w, h, texte: s.legende, taille: r.taille };
    z.h -= h + ECART_LEGENDE;
  }

  const construire = CONSTRUIRE[s.type];
  if (!construire) {
    const nom = s.type ? `Schéma « ${s.type} »` : "Schéma sans type";
    res.invalides.push(`${nom} : écrire processus, cycle, hiérarchie ou logigramme.`);
    return res;
  }
  const elements = s.elements || [];
  if (!elements.length) {
    res.invalides.push(`${NOMS[s.type]} sans puce : écrire une puce « - » par élément sous la ligne « Schéma : ».`);
    return res;
  }
  const vides = elements.filter((e) => !String(e.texte || "").trim()).length;
  if (vides) {
    res.invalides.push(`${NOMS[s.type]} : ${vides} puce${vides > 1 ? "s" : ""} sans texte ; écrire un texte après « - » (et après « ? » pour une question).`);
  }
  construire(elements, z, res);
  for (const b of res.boites) resserrerBoite(b);
  centrer(res, zone);
  return res;
}

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------

const STYLES = {
  etape: { fond: COULEURS.BLEU, texte: COULEURS.BLANC, gras: true },
  tete: { fond: COULEURS.BLEU, texte: COULEURS.BLANC, gras: true },
  fin: { fond: COULEURS.OR, texte: COULEURS.BLEU, gras: true },
  noeud: { fond: COULEURS.OR, texte: COULEURS.BLEU, gras: true },
  question: { fond: COULEURS.OR, texte: COULEURS.BLEU, gras: true },
  branche: { fond: FOND_CLAIR, texte: COULEURS.GRIS_FONCE, gras: false, trait: COULEURS.BLEU },
};

// Paragraphes de détail : gras de la source conservé, ESPACE_DETAIL avant
// chacun (avant le premier aussi si `premierEspace`).
function runsDetail(detail, options, premierEspace) {
  return detail.flatMap((d, k) => {
    const m = g.morceaux(d);
    const morceaux = m.length ? m : [{ texte: "", gras: false }];
    return morceaux.map((x, j) => ({
      text: x.texte,
      options: {
        ...options, bold: x.gras, breakLine: j === morceaux.length - 1 && k < detail.length - 1,
        ...(j === 0 && (k > 0 || premierEspace) ? { paraSpaceBefore: ESPACE_DETAIL } : {}),
      },
    }));
  });
}

// Runs d'un texte de la source (gras conservé), puis de son détail. Un texte
// vide donne un run vide : la case reste visible, l'alerte est déjà posée.
function runs(texte, detail, { gras, couleur, tailleDetail, couleurDetail }) {
  const tete = g.morceaux(texte).map((m) => ({ text: m.texte, options: { bold: gras || m.gras, color: couleur } }));
  if (!tete.length) tete.push({ text: "", options: { color: couleur } });
  if (!detail.length) return tete;
  tete[tete.length - 1].options.breakLine = true;
  return [...tete, ...runsDetail(detail, { color: couleurDetail, fontSize: tailleDetail }, true)];
}

// Marges d'une zone de texte, en points : `base` partout, plus le resserrement
// (pouces) à gauche et à droite. PptxGenJS lit [gauche, droite, bas, haut].
const marges = (base, resserre = 0) => (resserre ? [base + resserre * 72, base + resserre * 72, base, base] : base);

function dessinerBoite(slide, b) {
  const st = STYLES[b.role];
  const losange = b.forme === "losange";
  const dedans = b.zoneDetail ? [] : b.detail;
  slide.addText(runs(b.texte, dedans, {
    gras: st.gras, couleur: st.texte, tailleDetail: b.tailleDetail, couleurDetail: st.fond === COULEURS.BLEU ? COULEURS.BLANC : COULEURS.GRIS_FONCE,
  }), {
    shape: losange ? "diamond" : "roundRect", x: b.x, y: b.y, w: b.w, h: b.h,
    ...(losange ? {} : { rectRadius: rayonDe(b.h) }),
    fill: { color: st.fond }, line: { color: st.trait || st.fond, width: st.trait ? 1 : 0 }, shadow: g.makeShadow(),
    margin: marges(losange ? 0 : MARGE_TEXTE, b.resserre), fontFace: POLICE, fontSize: b.taille, align: "center", valign: "middle",
  });
  if (!b.zoneDetail) return;
  const zd = b.zoneDetail;
  slide.addText(runsDetail(b.detail, {}, false), {
    x: zd.x, y: zd.y, w: zd.w, h: zd.h, fontFace: POLICE, fontSize: b.tailleDetail, color: COULEURS.GRIS_FONCE, align: "center",
    ...(zd.cadre
      ? { shape: "roundRect", rectRadius: RAYON_LISTE, fill: { color: FOND_CLAIR }, line: { color: COULEURS.BLEU, width: 1 }, margin: marges(MARGE_TEXTE, zd.resserre), valign: "middle" }
      : { margin: marges(0, zd.resserre), valign: "top" }),
  });
}

// Pointe de flèche dessinée en triangle plein : PptxGenJS ne règle pas la
// taille d'une tête de ligne (« med » par défaut, 0,12 pouce pour un trait de
// 3 pt), trop petite en projection.
const POINTE = { long: 0.18, large: 0.16 };

function dessinerPointe(slide, [x1, y1], [x2, y2]) {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / d;
  const uy = (y2 - y1) / d;
  const cx = x2 - (ux * POINTE.long) / 2;
  const cy = y2 - (uy * POINTE.long) / 2;
  // Le triangle pointe vers le haut ; on le tourne, dans le sens horaire, vers (ux, uy).
  const angle = ((Math.atan2(ux, -uy) * 180) / Math.PI + 360) % 360;
  slide.addShape("triangle", {
    x: cx - POINTE.large / 2, y: cy - POINTE.long / 2, w: POINTE.large, h: POINTE.long, rotate: angle,
    fill: { color: COULEURS.BLEU }, line: { color: COULEURS.BLEU, width: 0 },
  });
}

// Un lien : un segment par paire de points ; sur le dernier, la pointe, et le
// trait arrêté sous elle.
function dessinerLien(slide, l, epaisseur) {
  l.points.slice(1).forEach((fin, i) => {
    const debut = l.points[i];
    let [x2, y2] = fin;
    const [x1, y1] = debut;
    if (l.fleche && i === l.points.length - 2) {
      dessinerPointe(slide, debut, fin);
      const d = Math.hypot(x2 - x1, y2 - y1);
      const recul = Math.min(POINTE.long * 0.8, d);
      x2 -= ((x2 - x1) / d) * recul;
      y2 -= ((y2 - y1) / d) * recul;
    }
    slide.addShape("line", {
      x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
      flipH: x2 < x1, flipV: y2 < y1,
      line: { color: COULEURS.BLEU, width: epaisseur },
    });
  });
  if (l.etiquette) {
    const e = l.etiquette;
    slide.addText(e.texte, {
      x: e.x, y: e.y, w: e.w, h: e.h, margin: 0, fontFace: POLICE, fontSize: e.taille, bold: true, color: COULEURS.BLEU,
      align: "left", valign: "middle",
    });
  }
}

function schema(pres, d, ctx) {
  const { slide } = ctx;
  if (d.schema && d.schema.type === "chronologie") return frise(pres, d, ctx);
  const geo = geometrieSchema(d.schema, ctx.zone);
  for (const m of geo.invalides) ctx.alerter("DONNEES_INVALIDES", m);

  if (!geo.boites.length) {
    g.reserve(slide, geo.zone, "Schéma sans élément", ctx);
  } else {
    const epaisseur = d.schema.type === "hierarchie" ? TRAIT_LIAISON : TRAIT_FLECHE;
    for (const l of geo.liens) dessinerLien(slide, l, epaisseur);
    for (const b of geo.boites) dessinerBoite(slide, b);
  }
  if (geo.legende) {
    const l = geo.legende;
    slide.addText(g.morceaux(l.texte).map((m) => ({ text: m.texte, options: { bold: m.gras } })), {
      x: l.x, y: l.y, w: l.w, h: l.h, margin: 0, fontFace: POLICE, fontSize: l.taille, italic: true, color: COULEURS.GRIS_FONCE,
      align: "center", valign: "top",
    });
  }
  if (geo.debordements.length) ctx.alerter("TEXTE_TROP_LONG", geo.debordements.join(" "));
}

module.exports = { MOTIFS: { schema }, geometrieSchema };
