// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Outils communs aux essais de rendu : charte d'essai en mémoire (images PNG
// générées ici, sans fichier de l'atelier ni de la skill), dossiers temporaires
// supprimés en fin de fichier d'essai, rendu d'une source et lecture du XML des
// diapositives. Ce module ne finit pas par .test.js : npm test ne le lance pas.
const { after } = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const zlib = require("zlib");
const { analyser } = require("../analyseur.js");
const { rendre } = require("../rendu.js");
const gabarit = require("../gabarit.js");
const { chargerJSZip } = require("../charte.js");

const md = (...lignes) => lignes.join("\n");
const EMU = 914400;

// PNG RVB noir de w x h pixels, sans dépendance.
function png(w, h) {
  const bloc = (type, donnees) => {
    const long = Buffer.alloc(4);
    long.writeUInt32BE(donnees.length);
    const corps = Buffer.concat([Buffer.from(type, "latin1"), donnees]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(zlib.crc32(corps));
    return Buffer.concat([long, corps, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // 8 bits par canal
  ihdr[9] = 2; // RVB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    bloc("IHDR", ihdr),
    bloc("IDAT", zlib.deflateSync(Buffer.alloc((w * 3 + 1) * h))),
    bloc("IEND", Buffer.alloc(0)),
  ]);
}

const uri = (w, h) => "data:image/png;base64," + png(w, h).toString("base64");
function charteEssai(extra = {}) {
  const logo = uri(40, 10);
  return {
    origine: "essai",
    LOGOS: { jaune_blanc: logo, bleu_jaune: logo },
    MONOGRAMMES: {},
    BANDEAUX: { jaune_h: uri(78, 10) },
    hauteurPour: (_c, largeur) => largeur / 4,
    ...extra,
  };
}

// Tous les dossiers temporaires d'un fichier d'essai vivent sous une même
// racine, supprimée quand le fichier a fini.
const RACINE = fs.mkdtempSync(path.join(os.tmpdir(), "cds-essais-"));
after(() => fs.rmSync(RACINE, { recursive: true, force: true }));

function dossierTemp(fichiers = {}) {
  const d = fs.mkdtempSync(path.join(RACINE, "d-"));
  for (const [nom, contenu] of Object.entries(fichiers)) fs.writeFileSync(path.join(d, nom), contenu);
  return d;
}

// Archive lue par JSZip : liste des diapositives et XML de chacune.
async function archive(pres) {
  const zip = await chargerJSZip().loadAsync(await pres.write({ outputType: "nodebuffer" }));
  const noms = Object.keys(zip.files).filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n));
  const xml = (n) => zip.file(`ppt/slides/slide${n}.xml`).async("string");
  const notes = (n) => zip.file(`ppt/notesSlides/notesSlide${n}.xml`).async("string");
  return { zip, noms, xml, notes };
}

// XML des graphiques de l'archive, dans l'ordre des fichiers ppt/charts/chart*.xml.
async function graphiques(zip) {
  const noms = Object.keys(zip.files).filter((n) => /^ppt\/charts\/chart\d+\.xml$/.test(n)).sort();
  return Promise.all(noms.map((n) => zip.file(n).async("string")));
}

// Texte visible d'un XML de diapositive : contenu des <a:t>, entités décodées.
const ENTITES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const textes = (xml) => [...xml.matchAll(/<a:t>([^<]*)<\/a:t>/g)]
  .map((m) => m[1].replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITES[e]));
const compte = (xml, motif) => (xml.match(motif) || []).length;
const images = (xml) => compte(xml, /<p:pic>/g);

// Analyse puis rend une source ; `avant(doc)` retouche le Document avant le rendu.
// `dossierSkill` est passé tel quel au rendu (absent : celui du moteur).
async function rendu(source, { dossierSource, charte, avant, dossierSkill } = {}) {
  const doc = analyser(source);
  if (avant) avant(doc);
  const r = await rendre(doc, {
    dossierSource: dossierSource || dossierTemp(), charte: charte || charteEssai(), dossierSkill,
  });
  return { doc, ...r, ...(await archive(r.pres)) };
}

const codes = (r) => r.alertes.map((a) => [a.ligne, a.code]);

// Images embarquées dans l'archive : { nom, octets } de chaque ppt/media/*.
async function medias(zip) {
  const noms = Object.keys(zip.files).filter((n) => /^ppt\/media\//.test(n) && !zip.files[n].dir).sort();
  return Promise.all(noms.map(async (nom) => ({ nom, octets: await zip.file(nom).async("nodebuffer") })));
}

// Largeur et hauteur en pixels d'un PNG, lues dans son en-tête ; null sinon.
const dimensionsPng = (o) => (o.length >= 24 && o.readUInt32BE(0) === 0x89504e47
  ? { largeur: o.readUInt32BE(16), hauteur: o.readUInt32BE(20) } : null);

// Positions en pouces de chaque forme, image ou zone de texte de la diapositive
// (le groupe racine de l'arbre, sans dimension, est écarté).
const cadres = (xml) => [...xml.matchAll(/<a:off x="(-?\d+)" y="(-?\d+)"\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\/>/g)]
  .map((m) => ({ x: m[1] / EMU, y: m[2] / EMU, w: m[3] / EMU, h: m[4] / EMU }))
  .filter((c) => c.w > 0 || c.h > 0);

// Rien ne sort des marges de la diapositive (le titre est dans la barre, déjà mesuré).
function dansLesMarges(xml) {
  const { W, H, MARGE } = gabarit;
  for (const c of cadres(xml)) {
    assert.ok(c.x >= MARGE - 1e-3 && c.x + c.w <= W - MARGE + 1e-3, `hors marges en largeur : ${JSON.stringify(c)}`);
    assert.ok(c.y >= 0 && c.y + c.h <= H - MARGE + 1e-3, `hors marges en hauteur : ${JSON.stringify(c)}`);
  }
}

// Vrai si le segment pq passe par l'intérieur du rectangle r ({ x, y, w, h }),
// bords et extrémités sur un bord exclus.
function segmentTraverse([x1, y1], [x2, y2], r) {
  const e = 1e-6;
  const dx = x2 - x1;
  const dy = y2 - y1;
  let t0 = 0;
  let t1 = 1;
  const contraintes = [[-dx, x1 - (r.x + e)], [dx, r.x + r.w - e - x1], [-dy, y1 - (r.y + e)], [dy, r.y + r.h - e - y1]];
  for (const [p, q] of contraintes) {
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

// Formes de la diapositive, dans l'ordre d'empilement : cadre en pouces, couleur de
// remplissage (null sans remplissage), couleurs et tailles (pt) des runs, textes.
function formes(xml) {
  return [...xml.matchAll(/<p:sp>.*?<\/p:sp>/gs)].map(([sp]) => {
    const [c] = cadres(sp);
    const fond = /<\/a:prstGeom><a:solidFill><a:srgbClr val="([0-9A-F]{6})"/.exec(sp);
    return {
      ...c,
      fond: fond ? fond[1] : null,
      couleurs: [...sp.matchAll(/<a:rPr[^>]*>\s*<a:solidFill><a:srgbClr val="([0-9A-F]{6})"/g)].map((m) => m[1]),
      tailles: [...sp.matchAll(/<a:rPr[^>]* sz="(\d+)"/g)].map((m) => Number(m[1]) / 100),
      gras: [...sp.matchAll(/<a:rPr([^>]*)>/g)].map((m) => / b="1"/.test(m[1])),
      textes: textes(sp),
    };
  });
}

// Rapport de contraste WCAG entre deux couleurs hexadécimales.
function contraste(a, b) {
  const lum = (hex) => {
    const [r, g, b_] = [0, 2, 4].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b_;
  };
  const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (h + 0.05) / (l + 0.05);
}

// Chaque texte coloré et le fond sur lequel il est lu : la dernière forme remplie,
// posée avant lui, qui contient son centre ; à défaut la barre de titre (bleue) ou le blanc.
// `taille` est la plus petite taille de ses runs, `gras` vaut vrai si tous sont en gras.
function textesSurFond(xml) {
  const f = formes(xml);
  const sortie = [];
  f.forEach((t, i) => {
    if (!t.textes.length || !t.couleurs.length) return;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const dessous = f.slice(0, t.fond ? i + 1 : i).reverse()
      .find((s) => s.fond && cx >= s.x && cx <= s.x + s.w && cy >= s.y && cy <= s.y + s.h);
    const fond = dessous ? dessous.fond : cy < gabarit.BARRE ? "1F519B" : "FFFFFF";
    const taille = Math.min(...t.tailles);
    const gras = t.gras.length > 0 && t.gras.every(Boolean);
    for (const couleur of new Set(t.couleurs)) sortie.push({ texte: t.textes.join(" "), couleur, fond, taille, gras });
  });
  return sortie;
}

module.exports = {
  md, EMU, png, uri, charteEssai, dossierTemp, archive, graphiques, ENTITES, textes, compte, images,
  rendu, codes, medias, dimensionsPng, cadres, dansLesMarges, segmentTraverse, formes, contraste, textesSurFond,
};
