// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Module libre d'essai : dessine un texte et rend compte des outils reçus.
module.exports = (slide, cds) => {
  slide.addText("essai libre", { x: 1, y: 2, w: 4, h: 0.5, fontSize: 18, color: cds.charte ? "1F519B" : "000000" });
  const outils = ["charte", "gabarit", "mesure", "motifs", "diapo", "makeShadow", "hauteurPour"]
    .filter((k) => cds[k] === undefined || cds[k] === null);
  slide.addText(`outils manquants : ${outils.length}`, { x: 1, y: 3, w: 6, h: 0.5, fontSize: 14 });
};
