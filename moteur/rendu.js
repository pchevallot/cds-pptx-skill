// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Rendu du Document en présentation PptxGenJS, diapositive par diapositive.
//
//   rendre(doc, { dossierSource, charte?, dossierSkill? }) -> Promise<{ pres, plan, alertes }>
//     pres     la présentation PptxGenJS, à écrire par pres.write() ;
//     plan     { numero, motif, titre }[], motif = type pour couverture, section, clôture ;
//     alertes  Alerte[] du rendu seul (doc.alertes et les contrôles restent à part).
//   dossierSkill  dossier de la skill (assets/, scripts/) ; par défaut le parent du
//                 moteur, comme dans charte.js. Rendu absolu (un chemin relatif se
//                 lit depuis le dossier courant).
//
// Aiguillage : couverture, section et clôture vont à TYPES[diapo.type] ; une
// diapositive de contenu va à MOTIFS[diapo.motif]. Un motif absent du registre
// laisse une réserve légendée « Motif <nom> non disponible », sans alerte.
//
// Ce que rendu.js pose lui-même, pour que les motifs n'aient pas à le refaire :
//   - toute diapositive : le master (CDS_TITRE sur fond bleu, CDS_CONTENU sinon)
//     et les notes (lignes jointes par "\n") ;
//   - diapositive de contenu, AVANT le motif : le titre dans la barre bleue
//     (" // " devient un retour à la ligne, taille ajustée en gras dans
//     zoneTitre) et l'accroche, qui réduit la zone du motif ;
//   - diapositive de contenu, APRÈS le motif : les pieds, en italique gris dans
//     la marge basse : diapo.pied (« Pied : ») à gauche, « Source : … » à droite
//     quand les deux existent, seul l'un ou l'autre sur toute la largeur.
//
// Registre des motifs. Un fichier de motifs exporte { MOTIFS: { nom: fonction } } ;
// on l'ajoute à MODULES_MOTIFS ci-dessous. Une fonction de motif a la forme
//   (pres, diapo, ctx) => void | Promise<void>
// et ne dessine que dans ctx.zone, sur ctx.slide. Elle ne lève jamais
// d'exception pour une donnée de la source : elle appelle ctx.alerter et rend
// une version dégradée (au besoin gabarit.reserve).
//
// Contrat de ctx, un objet neuf par diapositive :
//   pres           la présentation (aussi passée en premier argument) ;
//   slide          la diapositive déjà créée, master, titre et notes posés ;
//   zone           { x, y, w, h } : zoneContenu, ou zoneSousAccroche s'il y a une accroche ;
//   charte         résultat de resoudreCharte : LOGOS, MONOGRAMMES, BANDEAUX, hauteurPour ;
//   gabarit        le module gabarit.js (constantes, mesurerTitre, ajusterListe, reserve…) ;
//   mesure         le module mesure.js (largeurPt, couperLignes, ajuster, motOrphelin) ;
//   motifs         le registre MOTIFS, pour composer un motif à partir d'un autre ;
//   meta           doc.meta ;
//   dossierSource  dossier de la source : base des chemins relatifs (images, modules) ;
//   dossierSkill   dossier de la skill, absolu : scripts/cds_charts.py pour radar et chaleur ;
//   partage        objet commun à tout le deck (par exemple, une alerte à ne poser qu'une fois) ;
//   alerter(code, message)  ajoute { ligne: diapo.ligne, code, message } aux alertes.

const path = require("path");
const gabarit = require("./gabarit.js");
const mesure = require("./mesure.js");
const { resoudreCharte, chargerPptxGenJS } = require("./charte.js");

const MODULES_MOTIFS = [
  "./motifs/structure.js", "./motifs/riches.js", "./motifs/graphiques.js", "./motifs/schemas.js", "./motifs/externes.js", "./libre.js",
];

const MOTIFS = {};
const TYPES = {};
for (const m of MODULES_MOTIFS) {
  const module_ = require(m);
  Object.assign(MOTIFS, module_.MOTIFS || {});
  Object.assign(TYPES, module_.TYPES || {});
}

const { COULEURS, POLICE } = gabarit;

function poserTitre(slide, d) {
  const z = gabarit.zoneTitre;
  const { taille } = gabarit.mesurerTitre(d.titre, z, gabarit.TAILLES.titre);
  slide.addText(gabarit.paragraphesTitre(d.titre, { bold: true }), {
    x: z.x, y: z.y, w: z.w, h: z.h, margin: 0,
    fontFace: POLICE, fontSize: taille, bold: true, color: COULEURS.BLANC, align: "center", valign: "middle",
  });
}

function poserAccroche(slide, d) {
  const z = gabarit.zoneAccroche;
  const { taille } = gabarit.mesurerAccroche(d.accroche);
  slide.addText(d.accroche.replace(/\*\*|__/g, ""), {
    x: z.x, y: z.y, w: z.w, h: z.h, margin: 0,
    fontFace: POLICE, fontSize: taille, bold: true, italic: true, color: COULEURS.BLEU, valign: "middle",
  });
}

// Pied et source dans zonePied, à une taille commune. Ensemble : chacun à sa
// largeur naturelle quand les deux tiennent sur une ligne ; sinon le plus court
// garde la sienne, jusqu'à la moitié de la place, et l'autre prend le reste. La
// source est alignée sur la marge droite.
const ECART_PIEDS = 0.3;

function poserPieds(slide, d, ctx) {
  const z = gabarit.zonePied;
  const pieds = [
    d.pied && { texte: d.pied, quoi: "Pied trop long", reprise: "le" },
    d.source && { texte: `Source : ${d.source}`, quoi: "Source trop longue", reprise: "la" },
  ].filter(Boolean);
  if (!pieds.length) return;
  const { max } = gabarit.TAILLES.pied;
  if (pieds.length === 2) {
    const dispo = z.w - ECART_PIEDS;
    const [p, s] = pieds.map((x) => mesure.largeurPt(x.texte, { taille: max }) / 72);
    // Une marge de 0,05 pouce par texte : la mesure ignore le crénage et l'italique.
    const naturel = (w) => w + 0.05;
    let wPied;
    if (naturel(p) + naturel(s) <= dispo) wPied = naturel(p);
    else if (p <= s) wPied = Math.min(naturel(p), dispo / 2);
    else wPied = dispo - Math.min(naturel(s), dispo / 2);
    pieds[0].boite = { x: z.x, w: wPied, align: "left" };
    pieds[1].boite = { x: z.x + wPied + ECART_PIEDS, w: dispo - wPied, align: "right" };
  } else {
    pieds[0].boite = { x: z.x, w: z.w, align: "left" };
  }
  const mesures = pieds.map((x) => mesure.ajuster(x.texte, {
    largeur: x.boite.w, hauteur: z.h, ...gabarit.TAILLES.pied, interligne: gabarit.INTERLIGNE,
  }));
  const taille = Math.min(...mesures.map((r) => r.taille));
  pieds.forEach((x, i) => {
    if (mesures[i].deborde) {
      ctx.alerter("TEXTE_TROP_LONG", `${x.quoi} pour le pied de diapositive, même à ${taille} pt : ${x.reprise} raccourcir.`);
    }
    slide.addText(x.texte, {
      x: x.boite.x, y: z.y, w: x.boite.w, h: z.h, margin: 0, align: x.boite.align,
      fontFace: POLICE, fontSize: taille, italic: true, color: COULEURS.GRIS_TEXTE, valign: "top",
    });
  });
}

async function rendre(doc, { dossierSource, charte, dossierSkill } = {}) {
  dossierSkill = path.resolve(dossierSkill || path.join(__dirname, ".."));
  charte = charte || resoudreCharte(dossierSource, { dossierSkill });
  const PptxGenJS = chargerPptxGenJS();
  const pres = new PptxGenJS();
  pres.layout = "LAYOUT_WIDE";
  gabarit.definirMasters(pres, charte);

  const alertes = [];
  if (charte.avertissement) alertes.push({ ligne: 0, code: "DEPENDANCE_ABSENTE", message: charte.avertissement });
  const partage = {};
  const plan = [];

  for (const [i, d] of doc.diapos.entries()) {
    const contenu = d.type === "contenu";
    plan.push({ numero: i + 1, motif: contenu ? d.motif : d.type, titre: d.titre });
    const slide = pres.addSlide({ masterName: contenu ? "CDS_CONTENU" : "CDS_TITRE" });
    const zone = { ...(contenu && d.accroche ? gabarit.zoneSousAccroche : gabarit.zoneContenu) };
    const ctx = {
      pres, slide, zone, charte, gabarit, mesure, motifs: MOTIFS, meta: doc.meta, dossierSource, dossierSkill, partage,
      alerter: (code, message) => alertes.push({ ligne: d.ligne, code, message }),
    };

    if (contenu) {
      poserTitre(slide, d);
      if (d.accroche) poserAccroche(slide, d);
      const motif = MOTIFS[d.motif];
      if (motif) await motif(pres, d, ctx);
      else gabarit.reserve(slide, zone, `Motif ${d.motif} non disponible`, ctx);
      poserPieds(slide, d, ctx);
    } else {
      await TYPES[d.type](pres, d, ctx);
    }
    if (d.notes.length) slide.addNotes(d.notes.join("\n"));
  }

  return { pres, plan, alertes };
}

module.exports = { rendre, MOTIFS, TYPES };
