// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motifs de structure : couverture, section et clôture (TYPES), puces, deux
// colonnes et tableau (MOTIFS). Les contrats de `ctx` et du registre sont en
// tête de rendu.js.
//
// Journal des versions retenues (octobre 2026). Trois sources comparées : le
// deck de séance du 29/10/2026 (la plus récente), le deck de formation
// départementale de mai 2026 et pptxgenjs-cds.md v2.
//
//   Masters       pptxgenjs-cds.md v2 (§ Slide Masters), identiques dans les deux
//                 decks ; le logo de la barre prend sa hauteur par hauteurPour()
//                 au lieu d'un 2,0 x 0,5 posé à la main.
//   Titre barre   deck de séance (boîte de W - 2,9 : celle de la v2, W - 2,5,
//                 passait sous le logo) ; la taille ne dépend plus d'un seuil de
//                 55 caractères mais de la mesure en Open Sans, et « // » coupe.
//   Couverture    deck de séance : logo CdS centré, titre, sous-titre or, ligne
//                 de date en blanc, bandeau à sa hauteur native (le deck
//                 départemental l'écrasait à 1,15 pouce). Taille du titre mesurée
//                 au lieu d'adaptiveFontSize (nombre de caractères). Logo client :
//                 la pastille blanche à ombre du deck de séance (un logo foncé
//                 reste lisible sur le bleu), recentrée sous le sous-titre dans
//                 une boîte de 7 x 3,2 cm, ratio natif conservé (le deck
//                 départemental l'étirait dans 1,6 x 0,7 pouce). Boîte écourtée
//                 au besoin (tâche 11) : la pastille reste à 0,3 pouce du bandeau.
//   Section       deck de séance, sans l'encart « Vous êtes ici », absent de la
//                 grammaire.
//   Puces         deck de séance (puce 2022, retrait 18 pt, 10 pt après chaque
//                 paragraphe) ; ajoutés : second niveau, liste numérotée, gras
//                 de la source, taille ajustée de 18 à 14 pt.
//   Deux colonnes deck de séance : cartes grises à liseré bleu puis or, ombre,
//                 titre de colonne centré (la v2 et le deck départemental
//                 n'avaient que du texte nu). Une seule taille pour les deux
//                 colonnes, la plus petite des deux ajustements.
//   Tableau       deck de séance : en-tête bleu, rangées alternées, autoPage
//                 coupé (l'autoPage de la v2 créait des diapositives hors plan).
//                 Largeurs de colonnes mesurées sur le contenu (elles étaient
//                 passées à la main ou égales), taille ajustée de 14 à 10 pt.
//   Clôture       deck de séance : bloc de contact ancré en haut, arrêté
//                 au-dessus du bandeau.
//   Cadres        (tâche 11) colonnes à la hauteur de leur contenu (plancher de
//                 2 pouces), tableau court grandi jusqu'à 18 pt avec des rangées
//                 plus hautes ; colonnes et tableau centrés optiquement (40 % du
//                 vide au-dessus). Les puces restent calées en haut.

const path = require("path");
const g = require("../gabarit.js");
const { largeurPt } = require("../mesure.js");

const { W, H, COULEURS, POLICE, TAILLES } = g;
const CM = 1 / 2.54;
const RETRAIT_PT = 18;
const ESPACE_PUCES = 10;

// ---------------------------------------------------------------------------
// Outils propres aux diapositives sur fond bleu
// ---------------------------------------------------------------------------

function logoCentre(slide, charte, y, largeur) {
  const logo = charte.LOGOS.jaune_blanc;
  const h = charte.hauteurPour(logo, largeur);
  slide.addImage({ ...g.sourceImage(logo), x: (W - largeur) / 2, y, w: largeur, h });
}

function bandeau(slide, charte) {
  const b = charte.BANDEAUX.jaune_h;
  if (!b) return; // repli base64 de la skill : pas de bandeau embarqué
  const h = charte.hauteurPour(b, W);
  slide.addImage({ ...g.sourceImage(b), x: 0, y: H - h, w: W, h });
}

function grandTitre(slide, titre, boite) {
  const { taille } = g.mesurerTitre(titre, boite, TAILLES.grandTitre);
  slide.addText(g.paragraphesTitre(titre, { bold: true }), {
    x: boite.x, y: boite.y, w: boite.w, h: boite.h, margin: 0,
    fontFace: POLICE, fontSize: taille, bold: true, color: COULEURS.BLANC, align: "center", valign: "middle",
  });
}

// Lignes centrées dans une boîte, taille ajustée de max à min ; un débordement
// au minimum pose TEXTE_TROP_LONG (lieu : ce que l'auteur doit raccourcir).
function lignesCentrees(ctx, lieu, lignes, boite, { max, min, couleur, espace = 0, gras = false }) {
  if (!lignes.length) return;
  const paragraphes = lignes.map((texte) => ({ texte }));
  const { taille, deborde } = g.ajusterListe(paragraphes, { largeur: boite.w, hauteur: boite.h, max, min, espace, gras });
  if (deborde) ctx.alerter("TEXTE_TROP_LONG", `${lieu} trop long pour sa place, même à ${taille} pt : raccourcir ou retirer des lignes.`);
  ctx.slide.addText(lignes.map((texte, i) => ({
    text: g.sansGras(texte),
    options: { breakLine: i < lignes.length - 1, paraSpaceAfter: i < lignes.length - 1 ? espace : 0 },
  })), {
    x: boite.x, y: boite.y, w: boite.w, h: boite.h, margin: 0,
    fontFace: POLICE, fontSize: taille, bold: gras, color: couleur, align: "center", valign: "top",
  });
}

// Logo client : chemin relatif au dossier de la source ; null et une alerte
// s'il manque ou ne se lit pas.
function logoClient(ctx) {
  const relatif = ctx.meta && ctx.meta.logo_client;
  if (!relatif) return null;
  const chemin = path.resolve(ctx.dossierSource || ".", relatif);
  const dims = g.dimensionsImage(chemin);
  if (!dims) {
    ctx.alerter("IMAGE_INTROUVABLE", `Logo client « ${relatif} » introuvable ou illisible (PNG ou JPEG attendu, chemin relatif au dossier de la source) : la couverture sort sans lui.`);
    return null;
  }
  return { chemin, dims };
}

// ---------------------------------------------------------------------------
// TYPES : couverture, section, clôture
// ---------------------------------------------------------------------------

const BOITE_LOGO_CLIENT = { w: 7 * CM, h: 3.2 * CM };
const PASTILLE = 0.1;
const ECART_BANDEAU = 0.3;

function couverture(pres, d, ctx) {
  const { slide, charte } = ctx;
  const client = logoClient(ctx);
  const [sousTitre, ...autres] = d.sousTitre;

  if (client) {
    logoCentre(slide, charte, 0.4, 3.2);
    grandTitre(slide, d.titre, g.GRANDS_TITRES.couvertureAvecLogo);
    if (sousTitre) lignesCentrees(ctx, "Sous-titre de couverture", [sousTitre], { x: 1, y: 3.15, w: W - 2, h: 0.5 }, { max: 22, min: 16, couleur: COULEURS.OR });
    lignesCentrees(ctx, "Texte de couverture", autres, { x: 1, y: 3.65, w: W - 2, h: 0.62 }, { max: 16, min: 11, couleur: COULEURS.BLANC });
    // La pastille s'arrête à 0,3 pouce au-dessus du bandeau, quel que soit le ratio du logo.
    const b = charte.BANDEAUX.jaune_h;
    const basLibre = (b ? H - charte.hauteurPour(b, W) : H - g.MARGE) - ECART_BANDEAU - PASTILLE;
    const boite = { x: (W - BOITE_LOGO_CLIENT.w) / 2, y: 4.35, w: BOITE_LOGO_CLIENT.w, h: Math.min(BOITE_LOGO_CLIENT.h, basLibre - 4.35) };
    const r = g.contenir(client.dims, boite);
    slide.addShape("roundRect", {
      x: r.x - PASTILLE, y: r.y - PASTILLE, w: r.w + 2 * PASTILLE, h: r.h + 2 * PASTILLE,
      fill: { color: COULEURS.BLANC }, line: { color: COULEURS.BLANC, width: 0 },
      rectRadius: 0.1, shadow: g.makeShadow(),
    });
    slide.addImage({ path: client.chemin, ...r });
  } else {
    logoCentre(slide, charte, 0.5, 4.0);
    grandTitre(slide, d.titre, g.GRANDS_TITRES.couverture);
    if (sousTitre) lignesCentrees(ctx, "Sous-titre de couverture", [sousTitre], { x: 1, y: 4.1, w: W - 2, h: 0.55 }, { max: 22, min: 16, couleur: COULEURS.OR });
    lignesCentrees(ctx, "Texte de couverture", autres, { x: 1, y: 4.7, w: W - 2, h: 0.9 }, { max: 16, min: 11, couleur: COULEURS.BLANC });
  }
  bandeau(slide, charte);
}

function section(pres, d, ctx) {
  grandTitre(ctx.slide, d.titre, g.GRANDS_TITRES.section);
  lignesCentrees(ctx, "Sous-titre de section", d.sousTitre, { x: 1, y: 4.5, w: W - 2, h: 1.0 }, { max: 20, min: 14, couleur: COULEURS.OR });
}

function cloture(pres, d, ctx) {
  const { slide, charte } = ctx;
  logoCentre(slide, charte, 0.5, 4.0);
  grandTitre(slide, d.titre, g.GRANDS_TITRES.cloture);
  // « Clôture : texte » : le texte va dans sousTitre, entre le titre et le contact.
  let haut = 3.6;
  if (d.sousTitre.length) {
    lignesCentrees(ctx, "Texte de clôture", d.sousTitre, { x: 1, y: 3.55, w: W - 2, h: 0.5 }, { max: 20, min: 14, couleur: COULEURS.BLANC });
    haut = 4.15;
  }
  // S'arrête au-dessus du bandeau (haut à 5,79 pouces) ; ancré en haut, le bloc ne bouge pas.
  lignesCentrees(ctx, "Contact de clôture", d.contact, { x: 1.2, y: haut, w: W - 2.4, h: 5.7 - haut }, { max: 16, min: 11, couleur: COULEURS.OR, espace: 6 });
  bandeau(slide, charte);
}

// ---------------------------------------------------------------------------
// MOTIFS : puces, deux colonnes, tableau
// ---------------------------------------------------------------------------

// Paragraphes à mesurer pour une liste de blocs : le second niveau est plus
// petit de 2 pt et deux fois plus en retrait.
const mesurables = (blocs) => blocs.map((b) => ({
  texte: b.texte,
  retrait: (b.niveau === 2 ? 2 : 1) * RETRAIT_PT / 72,
  ecart: b.niveau === 2 ? -2 : 0,
}));

// Runs PptxGenJS d'une liste de blocs à la taille donnée. Une liste numérotée
// garde le numéro de son premier élément ; un second niveau ne la coupe pas.
function paragraphesPuces(blocs, { taille, couleur = COULEURS.GRIS_FONCE, espace = ESPACE_PUCES }) {
  const runs = [];
  let debutNumero = null;
  blocs.forEach((b, i) => {
    if (b.niveau === 1) debutNumero = b.numero == null ? null : debutNumero ?? b.numero;
    const second = b.niveau === 2;
    const bullet = !second && b.numero != null
      ? { type: "number", style: "arabicPeriod", numberStartAt: debutNumero, indent: RETRAIT_PT }
      : { code: second ? "25E6" : "2022", indent: RETRAIT_PT };
    // PptxGenJS ouvre un paragraphe à chaque run qui porte une puce : les options
    // de paragraphe ne vont donc que sur le premier run.
    const paragraphe = { bullet, indentLevel: second ? 1 : 0, paraSpaceAfter: i < blocs.length - 1 ? espace : 0 };
    const caractere = { fontSize: taille + (second ? -2 : 0), color: second ? COULEURS.GRIS_TEXTE : couleur };
    const m = g.morceaux(b.texte);
    m.forEach((morceau, j) => runs.push({
      text: morceau.texte,
      options: { ...(j === 0 ? paragraphe : {}), ...caractere, bold: morceau.gras, breakLine: j === m.length - 1 && i < blocs.length - 1 },
    }));
  });
  return runs;
}

function puces(pres, d, ctx) {
  const z = ctx.zone;
  const boite = { x: z.x + 0.3, y: z.y + 0.1, w: z.w - 0.6, h: z.h - 0.2 };
  const r = g.ajusterListe(mesurables(d.blocs), { largeur: boite.w, hauteur: boite.h, ...TAILLES.puces, espace: ESPACE_PUCES });
  if (r.deborde) ctx.alerter("TEXTE_TROP_LONG", `Puces trop longues pour la diapositive, même à ${r.taille} pt : couper, ou répartir sur deux diapositives.`);
  if (!d.blocs.length) return;
  ctx.slide.addText(paragraphesPuces(d.blocs, { taille: r.taille }), {
    ...boite, margin: 0, fontFace: POLICE, valign: "top",
  });
}

// Haut des puces dans une colonne, depuis le haut du cadre (liseré et titre au-dessus).
const HAUT_CORPS_COLONNE = 0.85;

function deuxColonnes(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  const colonnes = d.colonnes.slice(0, 2);
  if (colonnes.length !== 2) {
    ctx.alerter("DONNEES_INVALIDES", `Deux colonnes attendues (deux ###), ${colonnes.length} trouvée : rendue sur toute la largeur.`);
  }
  const ecart = 0.5;
  const n = Math.max(colonnes.length, 1);
  const colW = (z.w - ecart * (n - 1)) / n;
  const colMax = z.h - 0.1;
  const corpsW = colW - 0.6;
  // Une seule taille pour les colonnes : la plus petite des ajustements.
  const ajustes = colonnes.map((c) => g.ajusterListe(mesurables(c.blocs), {
    largeur: corpsW, hauteur: colMax - HAUT_CORPS_COLONNE - g.MARGE_BAS_CADRE, ...TAILLES.puces, espace: ESPACE_PUCES,
  }));
  const taille = Math.min(...ajustes.map((a) => a.taille));
  if (ajustes.some((a) => a.deborde)) ctx.alerter("TEXTE_TROP_LONG", `Colonne trop longue, même à ${taille} pt : couper, ou répartir sur deux diapositives.`);
  // Hauteur commune au contenu de la colonne la plus remplie, au plancher, bornée à la zone.
  const corpsH = Math.max(0, ...colonnes.map((c) => g.hauteurListe(mesurables(c.blocs), { largeur: corpsW, taille, espace: ESPACE_PUCES })));
  const colH = Math.min(colMax, Math.max(g.PLANCHER_CADRE, HAUT_CORPS_COLONNE + corpsH + g.MARGE_BAS_CADRE));
  const corps = { w: corpsW, h: Math.min(corpsH, colH - HAUT_CORPS_COLONNE - g.MARGE_BAS_CADRE) };
  const top = g.hautOptique(z, colH);

  colonnes.forEach((c, i) => {
    const x = z.x + (colW + ecart) * i;
    slide.addShape("rect", {
      x, y: top, w: colW, h: colH,
      fill: { color: COULEURS.GRIS_CLAIR }, line: { color: COULEURS.GRIS_MOYEN, width: 1 }, shadow: g.makeShadow(),
    });
    slide.addShape("rect", {
      x, y: top, w: colW, h: 0.07,
      fill: { color: i === 0 ? COULEURS.BLEU : COULEURS.OR }, line: { color: i === 0 ? COULEURS.BLEU : COULEURS.OR, width: 0 },
    });
    const boiteTitre = { x: x + 0.25, y: top + 0.2, w: colW - 0.5, h: 0.55 };
    const t = g.mesurerTitre(c.titre, boiteTitre, { max: 18, min: 14 });
    slide.addText(g.paragraphesTitre(c.titre, { bold: true }), {
      ...boiteTitre, margin: 0, fontFace: POLICE, fontSize: t.taille, bold: true, color: COULEURS.BLEU,
      align: "center", valign: "middle",
    });
    if (c.blocs.length) {
      slide.addText(paragraphesPuces(c.blocs, { taille }), {
        x: x + 0.3, y: top + HAUT_CORPS_COLONNE, ...corps, margin: 0, fontFace: POLICE, valign: "top",
      });
    }
  });
}

// Tableau : marges de cellule en pouces (PptxGenJS lit une valeur < 1 en pouces).
// La marge verticale grandit avec le texte : 0,05 pouce à 10 pt, 0,13 à 18 pt.
const MARGE_CELLULE = { v: 0.05, h: 0.1 };
const margeVerticale = (taille) => MARGE_CELLULE.v + (taille - TAILLES.tableau.min) * 0.01;

// Largeurs de colonnes en deux temps. D'abord le plancher de chaque colonne :
// son mot le plus long, mesuré avec son gras, marges comprises, que rien ne réduit ensuite. Puis le
// reste de la largeur, au prorata du contenu mesuré (borné à 8 % et 60 % de la
// largeur), entre les seules colonnes dont la part dépasse leur plancher ; une
// colonne qui tomberait sous le sien y est fixée et la répartition reprend.
// `tient` vaut faux si les planchers dépassent à eux seuls la largeur : les
// colonnes sont alors au prorata des planchers et un mot déborde de la sienne.
// Mots d'une cellule, chacun en morceaux { texte, gras } : le gras de la source
// (**mot**) suit chaque morceau ; l'en-tête est en gras partout.
function motsCellule(cellule, entete) {
  const mots = [[]];
  for (const m of g.morceaux(cellule)) {
    m.texte.split(/(\s+)/).forEach((bout, j) => {
      if (j % 2 === 1) mots.push([]);
      else if (bout) mots[mots.length - 1].push({ texte: bout, gras: m.gras || entete });
    });
  }
  return mots.filter((mot) => mot.length);
}

// Largeur en pouces d'un mot fait de morceaux, chacun à son propre gras.
const largeurMot = (mot, taille) => mot.reduce((t, m) => t + largeurPt(m.texte, { taille, gras: m.gras }), 0) / 72;

// Nombre de lignes d'une cellule repliée à la largeur, comme couperLignes, mais
// chaque mot mesuré avec son gras ; un mot plus large que la ligne reste seul.
function lignesCellule(cellule, largeur, taille, entete) {
  const espace = largeurPt(" ", { taille }) / 72;
  let lignes = 0;
  let courante = null;
  for (const mot of motsCellule(cellule, entete)) {
    const w = largeurMot(mot, taille);
    if (courante !== null && courante + espace + w <= largeur) {
      courante += espace + w;
    } else {
      lignes++;
      courante = w;
    }
  }
  return Math.max(lignes, 1);
}

function largeursColonnes(lignes, largeur, taille) {
  const n = lignes[0].length;
  const marges = 2 * MARGE_CELLULE.h;
  const planchers = [];
  const poids = [];
  for (let c = 0; c < n; c++) {
    let naturel = 0;
    let mot = 0;
    lignes.forEach((r, i) => {
      const mots = motsCellule(r[c], i === 0);
      const espaces = Math.max(mots.length - 1, 0) * (largeurPt(" ", { taille }) / 72);
      const largeurs = mots.map((m) => largeurMot(m, taille));
      naturel = Math.max(naturel, largeurs.reduce((a, b) => a + b, 0) + espaces + marges);
      for (const w of largeurs) mot = Math.max(mot, w + marges);
    });
    planchers.push(mot);
    poids.push(Math.max(mot, Math.min(Math.max(naturel, largeur * 0.08), largeur * 0.6)));
  }
  const somme = (liste) => liste.reduce((a, b) => a + b, 0);
  if (somme(planchers) > largeur) {
    return { colW: planchers.map((p) => (p / somme(planchers)) * largeur), tient: false };
  }
  const fixees = new Set();
  for (;;) {
    const libres = poids.map((p, c) => c).filter((c) => !fixees.has(c));
    const reste = largeur - somme([...fixees].map((c) => planchers[c]));
    const echelle = reste / somme(libres.map((c) => poids[c]));
    const sous = libres.filter((c) => poids[c] * echelle < planchers[c]);
    if (!sous.length) {
      return { colW: poids.map((p, c) => (fixees.has(c) ? planchers[c] : p * echelle)), tient: true };
    }
    for (const c of sous) fixees.add(c);
  }
}

function hauteurTableau(lignes, colW, taille) {
  return lignes.reduce((total, r, i) => total + Math.max(...r.map((cellule, c) => {
    const n = lignesCellule(cellule, colW[c] - 2 * MARGE_CELLULE.h, taille, i === 0);
    return g.hauteurLignes(n, taille);
  })) + 2 * margeVerticale(taille), 0);
}

function tableau(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  const { entetes, rangees } = d.tableau;
  const n = entetes.length;
  if (rangees.some((r) => r.length > n)) {
    ctx.alerter("DONNEES_INVALIDES", `Rangée du tableau plus longue que l'en-tête (${n} colonnes) : les cellules en trop sont ignorées.`);
  }
  const lignes = [entetes, ...rangees].map((r) => Array.from({ length: n }, (_, c) => r[c] ?? ""));
  let taille = TAILLES.tableau.max;
  let { colW, tient } = largeursColonnes(lignes, z.w, taille);
  while (taille > TAILLES.tableau.min && (!tient || hauteurTableau(lignes, colW, taille) > z.h)) {
    taille--;
    ({ colW, tient } = largeursColonnes(lignes, z.w, taille));
  }
  if (!tient) {
    ctx.alerter("TEXTE_TROP_LONG", `Tableau : mot plus large que sa colonne, même à ${taille} pt ; raccourcir les mots longs ou retirer une colonne.`);
  }
  if (hauteurTableau(lignes, colW, taille) > z.h) {
    ctx.alerter("TEXTE_TROP_LONG", `Tableau trop haut pour la diapositive, même à ${taille} pt : alléger ou répartir sur deux diapositives.`);
  }
  const marge = margeVerticale(taille);
  const cellule = (texte, options) => ({
    text: g.morceaux(texte).map((m) => ({ text: m.texte, options: { bold: m.gras || options.bold } })),
    options: { fontFace: POLICE, fontSize: taille, valign: "middle", margin: [marge, MARGE_CELLULE.h, marge, MARGE_CELLULE.h], ...options },
  });
  const donnees = lignes.map((r, i) => r.map((texte) => (i === 0
    ? cellule(texte, { fill: { color: COULEURS.BLEU }, color: COULEURS.BLANC, bold: true, align: "center" })
    : cellule(texte, { fill: { color: i % 2 === 1 ? COULEURS.BLANC : COULEURS.GRIS_CLAIR }, color: COULEURS.GRIS_FONCE, bold: false }))));
  // Un tableau court grandit jusqu'à 18 pt et se centre optiquement dans la zone.
  slide.addTable(donnees, {
    x: z.x, y: g.hautOptique(z, hauteurTableau(lignes, colW, taille)), w: z.w, colW,
    border: { type: "solid", pt: 0.5, color: COULEURS.GRIS_MOYEN }, autoPage: false,
  });
}

module.exports = {
  TYPES: { couverture, section, cloture },
  MOTIFS: { puces, "deux-colonnes": deuxColonnes, tableau },
  paragraphesPuces, mesurables, ESPACE_PUCES,
};
