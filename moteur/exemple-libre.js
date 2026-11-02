// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Module de la diapositive libre de l'exemple (« Diapositive libre : exemple-libre.js ») :
// une matrice valeur et effort en quatre cases, dessinée avec les seuls outils
// que le moteur passe dans `cds` : la zone où dessiner (sous l'accroche quand
// la diapositive en a une), les couleurs, la police et l'ombre du gabarit.
// Le titre, l'accroche, les notes et les pieds sont posés par le moteur.

module.exports = (slide, cds) => {
  const z = cds.zone;
  const { COULEURS: C, POLICE, makeShadow } = cds.gabarit;
  const axe = 0.6; // place des libellés d'axe, à gauche et en bas
  const ecart = 0.2;
  const grille = { x: z.x + axe, y: z.y, w: z.w - axe, h: z.h - axe };
  const w = (grille.w - ecart) / 2;
  const h = (grille.h - ecart) / 2;

  const cases = [
    { col: 0, rang: 0, titre: "Gains rapides", texte: ["Forte valeur, faible effort", "À lancer d'abord"], fond: C.OR, encre: C.BLEU },
    { col: 1, rang: 0, titre: "Projets structurants", texte: ["Forte valeur, effort important", "À planifier"], fond: C.BLEU, encre: C.BLANC },
    { col: 0, rang: 1, titre: "Petits plus", texte: ["Faible valeur, faible effort", "Au fil de l'eau"], fond: C.GRIS_CLAIR, encre: C.GRIS_FONCE },
    { col: 1, rang: 1, titre: "À écarter", texte: ["Faible valeur, effort important", "À refuser"], fond: C.GRIS_CLAIR, encre: C.GRIS_FONCE },
  ];
  for (const c of cases) {
    const x = grille.x + c.col * (w + ecart);
    const y = grille.y + c.rang * (h + ecart);
    slide.addShape("rect", { x, y, w, h, fill: { color: c.fond }, line: { color: c.fond, width: 0 }, shadow: makeShadow() });
    slide.addText([
      { text: c.titre, options: { bold: true, fontSize: 22, breakLine: true } },
      { text: c.texte[0], options: { fontSize: 16, breakLine: true } },
      { text: c.texte[1], options: { fontSize: 16, bold: true } },
    ], {
      x: x + 0.3, y: y + 0.2, w: w - 0.6, h: h - 0.4, margin: 0,
      fontFace: POLICE, color: c.encre, align: "center", valign: "middle", paraSpaceAfter: 8,
    });
  }

  // Axes : valeur à la verticale, effort à l'horizontale.
  slide.addText("Valeur", {
    x: z.x + axe / 2 - grille.h / 2, y: grille.y + grille.h / 2 - 0.2, w: grille.h, h: 0.4, rotate: 270, margin: 0,
    fontFace: POLICE, fontSize: 16, bold: true, color: C.BLEU, align: "center", valign: "middle",
  });
  slide.addText("Effort", {
    x: grille.x, y: grille.y + grille.h + 0.15, w: grille.w, h: 0.4, margin: 0,
    fontFace: POLICE, fontSize: 16, bold: true, color: C.BLEU, align: "center", valign: "middle",
  });
};
