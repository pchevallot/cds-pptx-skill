// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motif libre : la diapositive dessinée par un module JavaScript de l'auteur.
//
//   Diapositive libre : fichier.js     (chemin relatif au dossier de la source)
//
// Le module exporte `(slide, cds) => void | Promise<void>`. `cds` donne :
//   zone           copie de ctx.zone, où dessiner : sous l'accroche quand elle existe ;
//   pres, diapo, meta, dossierSource, alerter(code, message)   comme dans ctx ;
//   charte, gabarit, mesure, motifs, makeShadow, hauteurPour ;
//   composer(nom, diapo)   rend le motif `nom` du registre, ctx.motifs[nom](pres, diapo, ctx),
//                  dans la zone du motif ; à attendre (await) pour un motif asynchrone.
//                  Le motif libre lui-même n'est pas composable (récursion).
// Le master, le titre, l'accroche et les notes sont déjà posés ; les pieds viennent après.
//
// Le module est du code de l'auteur, exécuté tel quel : pas de bac à sable. Il est
// relu à chaque rendu (le cache de require est purgé pour ce chemin), donc une
// seconde génération dans le même processus voit le module modifié. Les
// dépendances du module restent, elles, en cache.
//
// Tout échec (module introuvable, export qui n'est pas une fonction, erreur
// synchrone, promesse rejetée) devient une alerte LIBRE_INTROUVABLE portant le
// message de l'erreur, sans pile. Ce que le module avait déjà dessiné est
// retiré de la diapositive (objets, relations vers images et graphiques) quand
// PptxGenJS expose ces tableaux internes ; sinon le contenu partiel reste,
// l'alerte est posée quand même.
//
// Deux limites : le module doit attendre (await) toute opération asynchrone,
// car une erreur tardive non attendue arrête le rendu ; et il peut, par ses
// propres `require`, toucher d'autres diapositives : seule sa diapositive est
// remise en état en cas d'erreur.
const path = require("path");

async function libre(pres, diapo, ctx) {
  const { slide, gabarit } = ctx;
  // Tableaux internes que addText, addImage et addChart alimentent : objets de la
  // diapositive, relations vers les médias et vers les graphiques.
  const suivis = ["_slideObjects", "_relsMedia", "_relsChart"]
    .filter((nom) => Array.isArray(slide[nom]))
    .map((nom) => ({ tableau: slide[nom], avant: slide[nom].length }));
  const chemin = path.resolve(ctx.dossierSource, diapo.libre.chemin);
  try {
    let resolu;
    try {
      resolu = require.resolve(chemin);
    } catch {
      throw new Error(`module libre introuvable : ${diapo.libre.chemin}`);
    }
    delete require.cache[resolu];
    const module_ = require(resolu);
    if (typeof module_ !== "function") {
      throw new Error(`le module libre ${diapo.libre.chemin} doit exporter une fonction (slide, cds) : il exporte ${typeof module_}`);
    }
    const cds = {
      zone: { ...ctx.zone }, pres, diapo, meta: ctx.meta, dossierSource: ctx.dossierSource, alerter: ctx.alerter,
      charte: ctx.charte, gabarit, mesure: ctx.mesure, motifs: ctx.motifs,
      makeShadow: gabarit.makeShadow, hauteurPour: ctx.charte.hauteurPour,
      composer(nom, d) {
        if (nom === "libre") throw new Error("cds.composer : motif libre non composable (il se rappellerait lui-même)");
        const motif = ctx.motifs[nom];
        if (typeof motif !== "function") {
          throw new Error(`cds.composer : motif « ${nom} » absent du registre (${Object.keys(ctx.motifs).join(", ")})`);
        }
        return motif(pres, d, ctx);
      },
    };
    await module_(slide, cds);
  } catch (e) {
    for (const { tableau, avant } of suivis) tableau.length = Math.min(tableau.length, avant);
    ctx.alerter("LIBRE_INTROUVABLE", `Diapositive libre ${diapo.libre.chemin} : ${e && e.message ? e.message : String(e)}`);
  }
}

module.exports = { MOTIFS: { libre } };
