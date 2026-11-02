// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motifs riches : cartes, blocs, chiffres clés, citation, prompt, décodage et
// image (MOTIFS), plus la frise, rendu de « Schéma : chronologie », exportée à
// part pour le motif schéma. Les contrats de `ctx` et du registre sont en tête
// de rendu.js ; le pied « Source : … » est posé par rendu.js, pas ici.
//
// Journal des versions retenues (octobre 2026). Trois sources comparées : le
// deck de séance du 29/10/2026 (la plus récente), le deck de formation
// départementale de mai 2026 et pptxgenjs-cds.md v2.
//
//   Cartes     deck de séance : liseré bleu, or, vert, orange (la v2 commençait
//              par l'or), titre 17 pt centré sur 0,8 pouce, ombre. Ajoutés :
//              titre mesuré de 17 à 14 pt, puces de la source mesurées de 16 à
//              12 pt, une taille commune à toutes les cartes (le deck passait
//              15 ou 16 pt selon le nombre de cartes, la v2 12 pt fixe).
//   Blocs      deck de séance (écart de 0,12 comme le deck départemental, la v2
//              à 0,15) : fond gris clair à ombre, barre verticale de couleur,
//              titre en capitales. Corrigés : le fond sortait de la marge
//              droite (x 0,6, w CONTENT_W + 0,2, jusqu'à 13,13 pouces dans les
//              trois sources), il est borné à la zone ; un titre or sur gris
//              clair, illisible, passe en bleu. Tailles mesurées et communes.
//   Chiffres   deck de séance : boîte de 3,0 pouces, valeur en gras blanc,
//              couleurs alternées bleu et orange (la v2 prenait la palette,
//              donc un chiffre blanc sur or). La taille de la valeur ne dépend
//              plus de sa longueur (60 ou 44 pt) mais de la mesure, commune à
//              toutes les boîtes, de 60 à 28 pt.
//   Cadres     (tâche 11) cartes, blocs et cadre du prompt à la hauteur de
//              leur contenu mesuré (plancher de 2 pouces pour cartes et prompt),
//              une hauteur commune par rangée, groupe centré optiquement (40 %
//              du vide au-dessus) ; 0,3 pouce entre le cadre du prompt et ses
//              puces ; image à côté des puces alignée sur leur haut.
//   Couleurs   (tâche 11) vert et orange réservés aux graphiques de données :
//              cartes et blocs tournent sur bleu, or, gris foncé ; les chiffres
//              alternent bleu (texte blanc) et or (texte bleu), 4,5:1 au moins.
//              (R60) Couleurs de signal, capacité de la v2 : la source nomme
//              une couleur par carte ou par chiffre (« Cartes : rouge, orange,
//              gris »). Carte : liseré de la couleur, titre de la couleur s'il
//              tient 4,5:1 sur le gris clair, sinon gris foncé. Chiffre : boîte
//              de la couleur, texte blanc ou gris foncé, le meilleur des deux ;
//              un libellé qui ne tient pas 4,5:1 passe en gras dès 14 pt (grand
//              texte, 3:1), ce que seul le rouge demande.
//   Citation   v2 et deck départemental (absente du deck de séance) : grands
//              guillemets or, texte blanc en italique, auteur en or à droite.
//              Ces deux versions occupaient une diapositive à fond bleu sans
//              titre ; ici la diapositive a sa barre de titre, la citation tient
//              dans un panneau bleu à ombre. Guillemets en Open Sans, police de
//              la charte, à 72 pt dans une boîte qui les contient. Taille du
//              texte mesurée de 28 à 16 pt au lieu de 22 ou 24 fixes.
//              (tâche 11) Guillemets or en ligne dans la zone du texte (espace
//              insécable), zone à sa taille mesurée et centrée, attribution
//              alignée sur son bord droit.
//   Prompt     deck de séance seul : cadre EEF2F8 à liseré bleu et ombre,
//              étiquette « PROMPT À COPIER », Consolas, interligne 1,12, puces
//              sous le cadre. Les hauteurs passées à la main (introH, promptH)
//              sont calculées ; la taille du code est mesurée de 14 à 9 pt sur
//              la chasse fixe de Consolas.
//   Décodage   deck de séance (addDecodeSlide, repris dans d'autres decks) :
//              tableau « Morceau du prompt / Ce qu'il apporte / Pour aller plus
//              loin ». Grammaire : une puce par morceau, ses sous-puces font les
//              colonnes suivantes ; sans sous-puce, une liste à puces. Composé
//              sur le motif tableau : la première colonne n'est plus en italique.
//   Image      deck de séance (addCaptureSlide : cadre blanc à liseré gris et
//              ombre, légende italique 13 pt centrée dessous) et v2
//              (addImageTextSlide : image d'un côté, texte de l'autre). Le ratio
//              natif est lu dans le fichier (le deck le codait en dur, la v2
//              passait par sizing contain) ; l'image prend 45 % de la largeur à
//              côté des puces, toute la zone seule.
//   Frise      deck de séance : ligne bleue de 3 pt, cercles de 0,32 pouce à bord
//              blanc et ombre, chiffre bleu sur l'or, textes alternés dessus et
//              dessous ; la v2 traitait l'étape unique. Corrigés : aux deux bouts,
//              les textes sortaient de la marge (x 0,15 pouce) ; les pastilles
//              des bouts sont rentrées pour que chaque texte reste centré sur la
//              sienne ; largeur suivant l'écart entre étapes, jusqu'à 3,2 pouces ;
//              pastilles bleu et or seulement (vert et orange réservés aux
//              graphiques) ; 0,3 pouce entre pastille et texte ; détails en gris
//              foncé ; frise et légende centrées ensemble ; tailles mesurées.

const path = require("path");
const g = require("../gabarit.js");
const { ajuster, largeurPt } = require("../mesure.js");
const { paragraphesPuces, mesurables } = require("./structure.js");

const { COULEURS, POLICE, POLICE_CODE, INTERLIGNE } = g;

// Bornes de l'ajustement propres à ces motifs, en points.
const TAILLES = {
  titreCarte: { max: 17, min: 14 },
  corpsCarte: { max: 16, min: 12 },
  titreBloc: { max: 16, min: 12 },
  corpsBloc: { max: 14, min: 11 },
  valeur: { max: 60, min: 28 },
  libelle: { max: 16, min: 12 },
  libelleGras: { max: 16, min: 14 },
  citation: { max: 28, min: 16 },
  auteur: { max: 16, min: 12 },
  intro: { max: 14, min: 11 },
  code: { max: 14, min: 9 },
  sousPrompt: { max: 14, min: 11 },
  legende: { max: 13, min: 10 },
  date: { max: 16, min: 11 },
  etape: { max: 14, min: 10 },
};

// Consolas : chasse fixe de 1126/2048 em, ligne de (1884 + 514)/2048 em.
const CHASSE_CODE = 0.55;
const LIGNE_CODE = 1.17;
const INTERLIGNE_PROMPT = 1.12;

// Vert et orange sont réservés aux graphiques de données et aux couleurs de
// signal que la source nomme : sans elles, les motifs riches tournent sur le
// bleu, l'or et le gris foncé.
const ACCENTS = [COULEURS.BLEU, COULEURS.OR, COULEURS.GRIS_FONCE];
const ENTETES_DECODAGE = ["Morceau du prompt", "Ce qu'il apporte", "Pour aller plus loin"];

// L'or ne porte pas un texte blanc : le bleu le remplace. Les chiffres sont blancs sur toute
// autre couleur de signal, vert et orange compris (moins de 3:1, choix de Pascal du 02/11/2026).
// Le titre d'une carte reste bleu : il est posé sur le gris clair, pas sur le liseré.
const texteSur = (fond) => (fond === COULEURS.OR ? COULEURS.BLEU : COULEURS.BLANC);
const lisibleSurClair = (couleur) => {
  if (couleur === COULEURS.OR) return COULEURS.BLEU;
  return g.contraste(couleur, COULEURS.GRIS_CLAIR) >= 4.5 ? couleur : COULEURS.GRIS_FONCE;
};
// Couleurs de signal demandées par la source (d.couleurs), ou null pour la rotation.
const signaux = (d) => (d.couleurs ? d.couleurs.map((nom) => g.SIGNAUX[nom]) : null);
const sansTrait = (couleur) => ({ color: couleur, width: 0 });

// Runs d'un texte de la source, gras conservé.
const runsGras = (texte) => g.morceaux(texte).map((m) => ({ text: m.texte, options: { bold: m.gras } }));

// Une seule taille pour un texte dans sa boîte (mesure.ajuster à l'interligne d'Open Sans).
const mesurer = (texte, boite, { max, min }, gras = false) =>
  ajuster(g.sansGras(texte), { largeur: boite.w, hauteur: boite.h, max, min, gras, interligne: INTERLIGNE });

// Hauteur, en pouces, de paragraphes simples (sans puce) à la taille donnée.
const hauteurTextes = (textes, largeur, taille, gras = false) =>
  g.hauteurListe(textes.map((texte) => ({ texte })), { largeur, taille, gras });

// Hors de min..max : DONNEES_INVALIDES (gabarit.borner), puis rendu des `max` premiers au plus.
function borner(ctx, liste, bornes) {
  const r = g.borner(liste, bornes);
  if (r.message) ctx.alerter("DONNEES_INVALIDES", r.message);
  return r.liste;
}

// Cartes ou blocs sans aucun ### : les puces restent visibles en liste.
function sansTitres(pres, d, ctx, quoi) {
  ctx.alerter("DONNEES_INVALIDES", `${quoi} sans ### : écrire un ### par élément, puis ses puces. Les puces sont rendues en liste.`);
  if (d.blocs.length) return ctx.motifs.puces(pres, d, ctx);
  g.reserve(ctx.slide, ctx.zone, `${quoi} sans contenu`, ctx);
}

// ---------------------------------------------------------------------------
// Cartes et blocs
// ---------------------------------------------------------------------------

const ESPACE_CARTE = 8;

// Haut des puces dans une carte, depuis le haut de la carte (liseré et titre au-dessus).
const HAUT_CORPS_CARTE = 1.1;

function cartes(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  if (!d.colonnes.length) return sansTitres(pres, d, ctx, "Cartes");
  const liste = borner(ctx, d.colonnes, { min: 2, max: 4, quoi: "Cartes", nom: (c) => c.titre });
  const n = liste.length;
  const ecart = 0.3;
  const carteW = (z.w - ecart * (n - 1)) / n;
  const carteMax = z.h - 0.1;
  const corpsW = carteW - 0.5;
  const ajustes = liste.map((c) => g.ajusterListe(mesurables(c.blocs), {
    largeur: corpsW, hauteur: carteMax - HAUT_CORPS_CARTE - g.MARGE_BAS_CADRE, ...TAILLES.corpsCarte, espace: ESPACE_CARTE,
  }));
  const taille = Math.min(...ajustes.map((a) => a.taille));
  let deborde = ajustes.some((a) => a.deborde);
  // Hauteur commune : celle de la carte la plus remplie, au plancher, bornée à la zone.
  const corpsH = Math.max(0, ...liste.map((c) => g.hauteurListe(mesurables(c.blocs), { largeur: corpsW, taille, espace: ESPACE_CARTE })));
  const carteH = Math.min(carteMax, Math.max(g.PLANCHER_CADRE, HAUT_CORPS_CARTE + corpsH + g.MARGE_BAS_CADRE));
  const corps = { w: corpsW, h: Math.min(corpsH, carteH - HAUT_CORPS_CARTE - g.MARGE_BAS_CADRE) };
  const haut = g.hautOptique(z, carteH);
  const demandes = signaux(d);

  liste.forEach((c, i) => {
    const x = z.x + (carteW + ecart) * i;
    const accent = demandes ? demandes[i] : ACCENTS[i % ACCENTS.length];
    slide.addShape("rect", {
      x, y: haut, w: carteW, h: carteH,
      fill: { color: COULEURS.GRIS_CLAIR }, line: { color: COULEURS.GRIS_MOYEN, width: 1 }, shadow: g.makeShadow(),
    });
    slide.addShape("rect", { x, y: haut, w: carteW, h: 0.07, fill: { color: accent }, line: sansTrait(accent) });
    const boiteTitre = { x: x + 0.2, y: haut + 0.22, w: carteW - 0.4, h: 0.8 };
    const t = g.mesurerTitre(c.titre, boiteTitre, TAILLES.titreCarte);
    deborde = deborde || t.deborde;
    slide.addText(g.paragraphesTitre(c.titre, { bold: true }), {
      ...boiteTitre, margin: 0, fontFace: POLICE, fontSize: t.taille, bold: true,
      color: COULEURS.BLEU, align: "center", valign: "middle",
    });
    if (c.blocs.length) {
      slide.addText(paragraphesPuces(c.blocs, { taille, espace: ESPACE_CARTE }), {
        x: x + 0.25, y: haut + HAUT_CORPS_CARTE, ...corps, margin: 0, fontFace: POLICE, valign: "top",
      });
    }
  });
  if (deborde) ctx.alerter("TEXTE_TROP_LONG", `Carte trop longue pour sa place, même à ${taille} pt : raccourcir, ou alléger une carte.`);
}

const ESPACE_BLOC = 4;

function blocs(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  if (!d.colonnes.length) return sansTitres(pres, d, ctx, "Blocs");
  const liste = borner(ctx, d.colonnes, { min: 2, max: 5, quoi: "Blocs", nom: (c) => c.titre });
  const n = liste.length;
  const ecart = 0.2;
  const blocMax = (z.h - ecart * (n - 1)) / n;
  const titreH = 0.45;
  const hautCorps = 0.05 + titreH + 0.07;
  const basBloc = 0.1;
  const texte = { x: z.x + 0.4, w: z.w - 0.6 };
  const titres = liste.map((c) => c.titre.toUpperCase());
  const mesuresTitres = titres.map((t) => g.mesurerTitre(t, { w: texte.w, h: titreH }, TAILLES.titreBloc));
  const tailleTitre = Math.min(...mesuresTitres.map((m) => m.taille));
  const ajustes = liste.map((c) => g.ajusterListe(mesurables(c.blocs), {
    largeur: texte.w, hauteur: Math.max(blocMax - hautCorps - basBloc, 0.2), ...TAILLES.corpsBloc, espace: ESPACE_BLOC,
  }));
  const taille = Math.min(...ajustes.map((a) => a.taille));
  // Hauteur commune : celle du bloc le plus rempli, bornée ; la pile est centrée optiquement.
  const mesure = Math.max(0, ...liste.map((c) => g.hauteurListe(mesurables(c.blocs), { largeur: texte.w, taille, espace: ESPACE_BLOC })));
  const blocH = Math.min(blocMax, hautCorps + mesure + basBloc);
  const corpsH = Math.max(blocH - hautCorps - basBloc, 0.2);
  const haut = g.hautOptique(z, n * blocH + (n - 1) * ecart);

  liste.forEach((c, i) => {
    const y = haut + (blocH + ecart) * i;
    const accent = ACCENTS[i % ACCENTS.length];
    slide.addShape("rect", {
      x: z.x, y, w: z.w, h: blocH,
      fill: { color: COULEURS.GRIS_CLAIR, transparency: 50 }, line: sansTrait(COULEURS.GRIS_CLAIR), shadow: g.makeShadow(),
    });
    slide.addShape("rect", { x: z.x + 0.05, y, w: 0.07, h: blocH, fill: { color: accent }, line: sansTrait(accent) });
    slide.addText(g.paragraphesTitre(titres[i], { bold: true }), {
      x: texte.x, y: y + 0.05, w: texte.w, h: titreH, margin: 0,
      fontFace: POLICE, fontSize: tailleTitre, bold: true, color: lisibleSurClair(accent), valign: "middle",
    });
    if (c.blocs.length) {
      slide.addText(paragraphesPuces(c.blocs, { taille, espace: ESPACE_BLOC }), {
        x: texte.x, y: y + hautCorps, w: texte.w, h: corpsH, margin: 0, fontFace: POLICE, valign: "top",
      });
    }
  });
  if (ajustes.some((a) => a.deborde) || mesuresTitres.some((m) => m.deborde)) {
    ctx.alerter("TEXTE_TROP_LONG", `Bloc trop long pour sa place, même à ${taille} pt : raccourcir, ou passer à moins de blocs.`);
  }
}

// ---------------------------------------------------------------------------
// Chiffres clés et citation
// ---------------------------------------------------------------------------

function chiffres(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  // Sans aucun chiffre, l'analyseur a déjà posé DONNEES_INVALIDES.
  if (!d.chiffres.length) return g.reserve(slide, z, "Chiffres clés sans données", ctx);
  const liste = borner(ctx, d.chiffres, { min: 2, max: 4, quoi: "Chiffres clés", nom: (c) => c.valeur });
  const n = liste.length;
  const ecart = 0.4;
  const boiteW = (z.w - ecart * (n - 1)) / n;
  const boiteH = Math.min(3.0, z.h);
  const haut = z.y + Math.min(0.6, (z.h - boiteH) / 2);
  const boiteValeur = { w: boiteW - 0.3, h: 1.6 };
  const boiteLibelle = { w: boiteW - 0.4, h: boiteH - 2.0 };
  const demandes = signaux(d);
  const boites = liste.map((c, i) => {
    const fond = demandes ? demandes[i] : i % 2 === 0 ? COULEURS.BLEU : COULEURS.OR;
    const encre = texteSur(fond);
    return { fond, encre, gras: g.contraste(encre, fond) < 4.5 };
  });
  // Un libellé en gras (grand texte) impose son plancher de 14 pt à tous : une taille commune.
  const bornesLibelle = boites.some((b) => b.gras) ? TAILLES.libelleGras : TAILLES.libelle;
  const valeurs = liste.map((c) => mesurer(c.valeur, boiteValeur, TAILLES.valeur, true));
  const libelles = liste.map((c, i) => c.libelle && mesurer(c.libelle, boiteLibelle, bornesLibelle, boites[i].gras)).filter(Boolean);
  const tailleValeur = Math.min(...valeurs.map((r) => r.taille));
  const tailleLibelle = Math.min(bornesLibelle.max, ...libelles.map((r) => r.taille));

  liste.forEach((c, i) => {
    const x = z.x + (boiteW + ecart) * i;
    const { fond, encre, gras } = boites[i];
    slide.addShape("rect", { x, y: haut, w: boiteW, h: boiteH, fill: { color: fond }, line: sansTrait(fond), shadow: g.makeShadow() });
    slide.addText(g.sansGras(c.valeur), {
      x: x + 0.15, y: haut + 0.25, ...boiteValeur, margin: 0,
      fontFace: POLICE, fontSize: tailleValeur, bold: true, color: encre, align: "center", valign: "middle",
    });
    if (c.libelle) {
      slide.addText(gras ? [{ text: g.sansGras(c.libelle), options: { bold: true } }] : runsGras(c.libelle), {
        x: x + 0.2, y: haut + 1.9, ...boiteLibelle, margin: 0,
        fontFace: POLICE, fontSize: tailleLibelle, color: encre, align: "center", valign: "top",
      });
    }
  });
  if (valeurs.some((r) => r.deborde) || libelles.some((r) => r.deborde)) {
    ctx.alerter("TEXTE_TROP_LONG", "Chiffre clé ou libellé trop long pour sa boîte : raccourcir.");
  }
}

// Guillemets français posés en ligne, dans la zone du texte, espace insécable à
// l'intérieur : le retour à la ligne de PowerPoint les garde collés au premier
// et au dernier mot. La zone prend la largeur de la plus longue ligne mesurée
// (avec une marge, la mesure ignorant l'italique et le crénage) et la hauteur
// de ses lignes ; elle est centrée dans le panneau bleu, l'attribution alignée
// sur son bord droit.
const MARGE_CITATION = 0.15;

function citation(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  const c = d.citation;
  // Sans texte, l'analyseur a déjà posé DONNEES_INVALIDES.
  if (!c || !c.texte) return g.reserve(slide, z, "Citation sans texte", ctx);
  const p = { x: z.x + 0.4, y: z.y + 0.1, w: z.w - 0.8, h: z.h - 0.2 };
  slide.addShape("rect", { ...p, fill: { color: COULEURS.BLEU }, line: sansTrait(COULEURS.BLEU), shadow: g.makeShadow() });
  const auteurH = c.auteur ? 0.6 : 0;
  const dispo = { w: p.w - 1.6, h: p.h - 1.0 - auteurH };
  const complet = `«\u00A0${g.sansGras(c.texte)}\u00A0»`;
  const r = mesurer(complet, { w: dispo.w - MARGE_CITATION, h: dispo.h }, TAILLES.citation);
  const plusLongue = Math.max(...r.lignes.map((l) => largeurPt(l, { taille: r.taille }) / 72));
  const texte = {
    w: Math.min(dispo.w, plusLongue + MARGE_CITATION),
    h: Math.min(dispo.h, g.hauteurLignes(r.lignes.length, r.taille)),
  };
  texte.x = p.x + (p.w - texte.w) / 2;
  texte.y = p.y + (p.h - texte.h - auteurH) / 2;
  const guillemet = (t) => ({ text: t, options: { color: COULEURS.OR, bold: true, italic: false } });
  slide.addText([guillemet("«\u00A0"), ...runsGras(c.texte), guillemet("\u00A0»")], {
    ...texte, margin: 0, fontFace: POLICE, fontSize: r.taille, italic: true, color: COULEURS.BLANC, valign: "top",
  });
  let deborde = r.deborde;
  if (c.auteur) {
    // Une attribution plus large que le texte déborde vers la gauche, bord droit tenu.
    const w = Math.max(texte.w, Math.min(dispo.w, largeurPt(g.sansGras(c.auteur), { taille: TAILLES.auteur.max }) / 72 + 0.1));
    const boiteAuteur = { x: texte.x + texte.w - w, y: texte.y + texte.h + 0.15, w, h: 0.45 };
    const a = mesurer(c.auteur, boiteAuteur, TAILLES.auteur);
    deborde = deborde || a.deborde;
    slide.addText(runsGras(c.auteur), {
      ...boiteAuteur, margin: 0, fontFace: POLICE, fontSize: a.taille, color: COULEURS.OR, align: "right", valign: "top",
    });
  }
  if (deborde) ctx.alerter("TEXTE_TROP_LONG", `Citation trop longue pour sa place, même à ${r.taille} pt : la resserrer.`);
}

// ---------------------------------------------------------------------------
// Prompt et décodage
// ---------------------------------------------------------------------------

// Lignes affichées d'un bloc de code : chaque ligne de la source, repliée à la largeur.
function lignesCode(texte, largeur, taille) {
  const parLigne = Math.max(1, Math.floor((largeur * 72) / (CHASSE_CODE * taille)));
  return texte.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.trimEnd().length / parLigne)), 0);
}

function tailleCode(texte, boite) {
  for (let taille = TAILLES.code.max; taille >= TAILLES.code.min; taille--) {
    const h = (lignesCode(texte, boite.w, taille) * taille * LIGNE_CODE * INTERLIGNE_PROMPT) / 72;
    if (h <= boite.h) return { taille, deborde: false };
  }
  return { taille: TAILLES.code.min, deborde: true };
}

const ESPACE_SOUS_PROMPT = 5;
// Écart entre le cadre du prompt et les puces qui le suivent.
const ECART_SOUS_PROMPT = 0.3;
// Dans le cadre : étiquette au-dessus du code, marge sous le code.
const HAUT_CODE = 0.45;
const BAS_CODE = 0.15;

// Intro, cadre ajusté au code (plancher de la charte) et puces : un groupe centré
// optiquement dans la zone.
function prompt(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  const { intro, texte } = d.prompt || { intro: null, texte: null };
  let deborde = false;

  let introH = 0;
  let tailleIntro = TAILLES.intro.max;
  if (intro) {
    const r = mesurer(intro, { w: z.w, h: 0.9 }, TAILLES.intro);
    introH = Math.min(g.hauteurLignes(r.lignes.length, r.taille) + 0.05, 0.9);
    tailleIntro = r.taille;
    deborde = r.deborde;
  }

  // Puces écrites après le bloc : sous le cadre, au plus 1,8 pouce.
  const puces = { x: z.x + 0.3, w: z.w - 0.6, h: 0 };
  let taillePuces = TAILLES.sousPrompt.max;
  if (d.blocs.length) {
    const r = g.ajusterListe(mesurables(d.blocs), { largeur: puces.w, hauteur: 1.8, ...TAILLES.sousPrompt, espace: ESPACE_SOUS_PROMPT });
    taillePuces = r.taille;
    deborde = deborde || r.deborde;
    puces.h = Math.min(g.hauteurListe(mesurables(d.blocs), { largeur: puces.w, taille: taillePuces, espace: ESPACE_SOUS_PROMPT }) + 0.05, 1.8);
  }

  const avant = intro ? introH + 0.1 : 0;
  const apres = puces.h ? puces.h + ECART_SOUS_PROMPT : 0;
  const cadreMax = z.h - avant - apres;
  const codeMax = { w: z.w - 0.6, h: cadreMax - HAUT_CODE - BAS_CODE };
  let tailleTexte = TAILLES.code.max;
  let codeH = codeMax.h;
  if (texte) {
    const r = tailleCode(texte, codeMax);
    deborde = deborde || r.deborde;
    tailleTexte = r.taille;
    codeH = Math.min(codeMax.h, (lignesCode(texte, codeMax.w, r.taille) * r.taille * LIGNE_CODE * INTERLIGNE_PROMPT) / 72);
  }
  const cadreH = Math.min(cadreMax, Math.max(g.PLANCHER_CADRE, HAUT_CODE + codeH + BAS_CODE));
  let y = g.hautOptique(z, avant + cadreH + apres);

  if (intro) {
    slide.addText(runsGras(intro), {
      x: z.x, y, w: z.w, h: introH, margin: 0, fontFace: POLICE, fontSize: tailleIntro, color: COULEURS.GRIS_FONCE, valign: "top",
    });
    y += avant;
  }

  const cadre = { x: z.x, y, w: z.w, h: cadreH };
  slide.addShape("rect", {
    ...cadre, fill: { color: "EEF2F8" }, line: { color: COULEURS.BLEU, width: 1.25 }, shadow: g.makeShadow(),
  });
  slide.addText("PROMPT À COPIER", {
    x: cadre.x + 0.25, y: cadre.y + 0.12, w: 3.5, h: 0.3, margin: 0,
    fontFace: POLICE, fontSize: 10, bold: true, color: COULEURS.BLEU, charSpacing: 2,
  });
  const code = { x: cadre.x + 0.3, y: cadre.y + HAUT_CODE, w: codeMax.w, h: cadre.h - HAUT_CODE - BAS_CODE };
  if (texte) {
    const lignes = texte.split("\n");
    // Texte brut : ni gras ni puce interprétés, espaces de tête gardées.
    slide.addText(lignes.map((l, i) => ({ text: l, options: { breakLine: i < lignes.length - 1 } })), {
      ...code, margin: 0, fontFace: POLICE_CODE, fontSize: tailleTexte, color: COULEURS.GRIS_FONCE,
      valign: "top", lineSpacingMultiple: INTERLIGNE_PROMPT,
    });
  } else {
    // Sans bloc de code, l'analyseur a déjà posé DONNEES_INVALIDES.
    g.reserve(slide, code, "Prompt sans bloc de code", ctx);
  }

  if (d.blocs.length) {
    slide.addText(paragraphesPuces(d.blocs, { taille: taillePuces, espace: ESPACE_SOUS_PROMPT }), {
      ...puces, y: cadre.y + cadre.h + ECART_SOUS_PROMPT, margin: 0, fontFace: POLICE, valign: "top",
    });
  }
  if (deborde) ctx.alerter("TEXTE_TROP_LONG", "Prompt trop long pour la diapositive, même au plus petit : le raccourcir, ou le répartir sur deux diapositives.");
}

function decodage(pres, d, ctx) {
  if (!d.blocs.length) {
    ctx.alerter("DONNEES_INVALIDES", "Décodage sans puce : écrire une puce par morceau du prompt, et ses sous-puces.");
    return g.reserve(ctx.slide, ctx.zone, "Décodage sans contenu", ctx);
  }
  if (!d.blocs.some((b) => b.niveau === 2)) return ctx.motifs.puces(pres, d, ctx);
  const rangees = [];
  for (const b of d.blocs) {
    if (b.niveau === 1 || !rangees.length) rangees.push([b.texte]);
    else rangees[rangees.length - 1].push(b.texte);
  }
  const longues = rangees.filter((r) => r.length > ENTETES_DECODAGE.length);
  if (longues.length) {
    ctx.alerter("DONNEES_INVALIDES", `Décodage : au plus deux sous-puces par morceau (ce qu'il apporte, pour aller plus loin) ; les suivantes sont jointes à la dernière colonne pour « ${longues.map((r) => r[0]).join(" », « ")} ».`);
  }
  const n = ENTETES_DECODAGE.length;
  const cellules = rangees.map((r) => (r.length > n ? [...r.slice(0, n - 1), r.slice(n - 1).join(" ; ")] : r));
  const colonnes = Math.max(...cellules.map((r) => r.length));
  return ctx.motifs.tableau(pres, { ...d, tableau: { entetes: ENTETES_DECODAGE.slice(0, colonnes), rangees: cellules } }, ctx);
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

const CADRE = 0.1;

function image(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  // Sans ligne ![légende](fichier), l'analyseur a déjà posé DONNEES_INVALIDES.
  if (!d.image) return ctx.motifs.puces(pres, d, ctx);
  const { chemin, legende, position } = d.image;
  const avecTexte = position !== "pleine" && d.blocs.length > 0;
  const ecart = 0.5;
  const imageW = avecTexte ? (z.w - ecart) * 0.45 : z.w;
  const imageX = avecTexte && position === "droite" ? z.x + z.w - imageW : z.x;
  const legendeH = legende ? 0.5 : 0;
  const boite = { x: imageX, y: z.y, w: imageW, h: z.h - legendeH };
  const hautTexte = z.y + 0.1;
  let deborde = false;

  const absolu = chemin ? path.resolve(ctx.dossierSource || ".", chemin) : null;
  const dims = absolu ? g.dimensionsImage(absolu) : null;
  let basVisuel;
  if (dims) {
    const r = g.contenir(dims, { x: boite.x + CADRE, y: boite.y + CADRE, w: boite.w - 2 * CADRE, h: boite.h - 2 * CADRE });
    // À côté des puces, l'image monte au haut des puces au lieu de flotter au milieu.
    if (avecTexte) r.y = hautTexte;
    slide.addShape("rect", {
      x: r.x - CADRE, y: r.y - CADRE, w: r.w + 2 * CADRE, h: r.h + 2 * CADRE,
      fill: { color: COULEURS.BLANC }, line: { color: COULEURS.GRIS_MOYEN, width: 1 }, shadow: g.makeShadow(),
    });
    slide.addImage({ path: absolu, ...r, altText: legende ? g.sansGras(legende) : "" });
    basVisuel = r.y + r.h + CADRE;
  } else {
    ctx.alerter("IMAGE_INTROUVABLE", `Image « ${chemin || ""} » introuvable ou illisible (PNG ou JPEG attendu, chemin relatif au dossier de la source) : une réserve légendée la remplace.`);
    g.reserve(slide, boite, `Image introuvable : ${chemin || "chemin vide"}`, ctx);
    basVisuel = boite.y + boite.h;
  }

  if (legende) {
    const boiteLegende = { x: boite.x, y: basVisuel + 0.1, w: boite.w, h: 0.4 };
    const r = mesurer(legende, boiteLegende, TAILLES.legende);
    deborde = r.deborde;
    slide.addText(runsGras(legende), {
      ...boiteLegende, margin: 0, fontFace: POLICE, fontSize: r.taille, italic: true, color: COULEURS.GRIS_FONCE,
      align: "center", valign: "top",
    });
  }

  if (avecTexte) {
    const texte = {
      x: position === "droite" ? z.x + 0.1 : z.x + imageW + ecart, y: hautTexte,
      w: z.w - imageW - ecart - 0.1, h: z.h - 0.2,
    };
    const r = g.ajusterListe(mesurables(d.blocs), { largeur: texte.w, hauteur: texte.h, ...g.TAILLES.puces, espace: 10 });
    deborde = deborde || r.deborde;
    slide.addText(paragraphesPuces(d.blocs, { taille: r.taille }), { ...texte, margin: 0, fontFace: POLICE, valign: "top" });
  }
  if (deborde) ctx.alerter("TEXTE_TROP_LONG", "Puces ou légende trop longues à côté de l'image : raccourcir.");
}

// ---------------------------------------------------------------------------
// Frise : rendu de « Schéma : chronologie », appelée par le motif schéma
// ---------------------------------------------------------------------------

// Étapes de la frise : une puce de niveau 0 « date : libellé » chacune ; les
// sous-puces s'ajoutent en détail à l'étape qui les précède.
function etapesFrise(elements) {
  const etapes = [];
  for (const e of elements) {
    if (e.niveau === 0 || !etapes.length) etapes.push({ texte: e.texte, details: [] });
    else etapes[etapes.length - 1].details.push(e.texte);
  }
  return etapes;
}

// Écart entre une pastille et ses textes, et entre la frise et sa légende.
const ECART_FRISE = 0.3;

function frise(pres, d, ctx) {
  const { slide } = ctx;
  const schema = d.schema || { elements: [], legende: null };
  const z = { ...ctx.zone };
  let deborde = false;

  // Légende mesurée d'abord : sa hauteur et l'écart sont retirés de la place de la frise.
  let legende = null;
  if (schema.legende) {
    const r = mesurer(schema.legende, { w: z.w, h: 0.45 }, { max: 14, min: 11 });
    deborde = r.deborde;
    legende = { taille: r.taille, h: Math.min(g.hauteurLignes(r.lignes.length, r.taille), 0.45) };
    z.h -= legende.h + ECART_FRISE;
  }
  const poserLegende = (y) => slide.addText(runsGras(schema.legende), {
    x: z.x, y, w: z.w, h: legende.h, margin: 0, fontFace: POLICE, fontSize: legende.taille, italic: true,
    color: COULEURS.GRIS_FONCE, align: "center", valign: "top",
  });

  const toutes = etapesFrise(schema.elements);
  if (!toutes.length) {
    ctx.alerter("DONNEES_INVALIDES", "Frise sans étape : écrire une puce « - date : libellé » par étape, de 2 à 7.");
    g.reserve(slide, z, "Frise sans étape", ctx);
    if (legende) poserLegende(z.y + z.h + ECART_FRISE);
    return;
  }
  const liste = borner(ctx, toutes, { min: 2, max: 7, quoi: "Étapes de la frise", nom: (e) => e.texte });
  const sansDate = [];
  const etapes = liste.map(({ texte, details }) => {
    const i = texte.indexOf(" : ");
    if (i < 0) {
      sansDate.push(texte);
      return { date: null, textes: [texte, ...details] };
    }
    return { date: texte.slice(0, i).trim(), textes: [texte.slice(i + 3).trim(), ...details] };
  });
  if (sansDate.length) {
    ctx.alerter("DONNEES_INVALIDES", `Étape de frise sans date : « ${sansDate.join(" », « ")} ». Écrire « - date : libellé ».`);
  }

  const n = etapes.length;
  const R = 0.32;
  // Chaque texte est centré sur sa pastille : les pastilles des bouts sont
  // rentrées d'une demi-largeur de texte. Deux étapes voisines sont de part et
  // d'autre de la ligne : un texte peut prendre presque deux pas, borné à 3,2 pouces.
  const largeur = n > 1 ? Math.min(3.2, (2 * z.w - 0.2 * (n - 1)) / (n + 1)) : 3.0;
  const debut = z.x + largeur / 2;
  const fin = z.x + z.w - largeur / 2;
  const pas = n > 1 ? (fin - debut) / (n - 1) : 0;
  const centre = (i) => (n > 1 ? debut + pas * i : z.x + z.w / 2);
  const demi = z.h / 2 - R - ECART_FRISE;

  const datees = etapes.filter((e) => e.date);
  const mesuresDates = datees.map((e) => mesurer(e.date, { w: largeur, h: 0.6 }, TAILLES.date, true));
  const tailleDate = Math.min(TAILLES.date.max, ...mesuresDates.map((r) => r.taille));
  const hauteurDate = (e) => (e.date ? hauteurTextes([e.date], largeur, tailleDate, true) : 0);
  const placeTexte = demi - Math.max(0, ...etapes.map(hauteurDate)) - 0.05;
  const mesuresTextes = etapes.map((e) => g.ajusterListe(e.textes.map((texte) => ({ texte })), {
    largeur, hauteur: placeTexte, ...TAILLES.etape,
  }));
  const tailleTexte = Math.min(...mesuresTextes.map((r) => r.taille));
  deborde = deborde || mesuresDates.some((r) => r.deborde) || mesuresTextes.some((r) => r.deborde);

  // Hauteurs réelles au-dessus et au-dessous de la ligne : l'ensemble frise et
  // légende est centré dans la zone, la légende à ECART_FRISE sous la frise.
  const blocs = etapes.map((e) => {
    const hDate = hauteurDate(e);
    return { hDate, hTexte: Math.min(hauteurTextes(e.textes, largeur, tailleTexte), demi - hDate) };
  });
  const cote = (pair) => Math.max(0, ...blocs.filter((_, i) => (i % 2 === 0) === pair).map((b) => b.hDate + b.hTexte));
  const hDessus = cote(true);
  const hDessous = cote(false);
  const avecEcart = (h) => (h > 0 ? h + ECART_FRISE : 0);
  const total = avecEcart(hDessus) + 2 * R + avecEcart(hDessous) + (legende ? ECART_FRISE + legende.h : 0);
  const ligneY = ctx.zone.y + (ctx.zone.h - total) / 2 + avecEcart(hDessus) + R;

  slide.addShape("line", { x: debut, y: ligneY, w: fin - debut, h: 0, line: { color: COULEURS.BLEU, width: 3 } });
  etapes.forEach((e, i) => {
    const cx = centre(i);
    // R35 : la frise ne prend que le bleu et l'or, le vert et l'orange sont aux graphiques.
    const fond = i % 2 === 0 ? COULEURS.BLEU : COULEURS.OR;
    const rond = { x: cx - R, y: ligneY - R, w: 2 * R, h: 2 * R };
    slide.addShape("ellipse", { ...rond, fill: { color: fond }, line: { color: COULEURS.BLANC, width: 3 }, shadow: g.makeShadow() });
    slide.addText(String(i + 1), {
      ...rond, margin: 0, fontFace: POLICE, fontSize: 14, bold: true, color: texteSur(fond), align: "center", valign: "middle",
    });
    const x = cx - largeur / 2;
    const { hDate, hTexte } = blocs[i];
    const dessus = i % 2 === 0;
    const yDate = dessus ? ligneY - R - ECART_FRISE - hTexte - hDate : ligneY + R + ECART_FRISE;
    if (e.date) {
      slide.addText(runsGras(e.date), {
        x, y: yDate, w: largeur, h: hDate, margin: 0,
        fontFace: POLICE, fontSize: tailleDate, bold: true, color: COULEURS.BLEU, align: "center", valign: "top",
      });
    }
    // Libellé puis détails, en gris foncé (le gris moyen n'était pas assez contrasté), détails en italique.
    slide.addText(e.textes.flatMap((t, k) => g.morceaux(t).map((m, j, tous) => ({
      text: m.texte,
      options: { bold: m.gras, italic: k > 0, color: COULEURS.GRIS_FONCE, breakLine: j === tous.length - 1 && k < e.textes.length - 1 },
    }))), {
      x, y: yDate + hDate, w: largeur, h: hTexte, margin: 0,
      fontFace: POLICE, fontSize: tailleTexte, align: "center", valign: "top",
    });
  });
  if (legende) poserLegende(ligneY + R + avecEcart(hDessous) + ECART_FRISE);
  if (deborde) ctx.alerter("TEXTE_TROP_LONG", `Étape de frise trop longue pour sa place, même à ${tailleTexte} pt : raccourcir les libellés.`);
}

module.exports = {
  MOTIFS: { cartes, blocs, chiffres, citation, prompt, decodage, image },
  frise,
};
