// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Finalisation du PPTX : métadonnées humaines (docProps/core.xml et app.xml, dans
// l'ordre et le format de set_ooxml_metadata.py de la skill), retrait des Override
// sans partie de [Content_Types].xml, empreinte SHA-256 et garde d'écrasement.
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { chargerJSZip } = require("./charte.js");

const AUTEUR = "Pascal Chevallot";
const SOCIETE = "Comptoir des Signaux";
const APPLICATION = "Microsoft Office PowerPoint";
const UNE_HEURE = 3_600_000;

const echapper = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
const w3cdtf = (date) => date.toISOString().replace(/\.\d{3}Z$/, "Z");
const texte = (v) => (Array.isArray(v) ? v.join(", ") : v ?? "");

// AAAA-MM-JJ valide (jour réel du calendrier) : created vaut ce jour à 09:00Z ;
// sinon maintenant moins une heure. Jamais une date vide.
function dateCreation(dateMeta, maintenant) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateMeta ?? ""));
  if (m) {
    const d = new Date(`${m[0]}T09:00:00Z`);
    if (!Number.isNaN(d.getTime()) && d.toISOString().startsWith(m[0])) return d;
  }
  return new Date(maintenant.getTime() - UNE_HEURE);
}

function coreXml(meta, maintenant) {
  const cree = dateCreation(meta.date, maintenant);
  const modifie = cree > maintenant ? cree : maintenant; // jamais modifié avant d'être créé
  const auteur = [AUTEUR, SOCIETE, meta.cotraitant].filter(Boolean).join(" ; ");
  return "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n"
    + '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" '
    + 'xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" '
    + 'xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + `<dc:title>${echapper(meta.titre)}</dc:title>`
    + `<dc:subject>${echapper(meta.objet)}</dc:subject>`
    + `<dc:creator>${echapper(auteur)}</dc:creator>`
    + `<cp:keywords>${echapper(texte(meta.mots_cles))}</cp:keywords>`
    + `<dc:description>${echapper(meta.commentaires)}</dc:description>`
    + `<cp:lastModifiedBy>${echapper(AUTEUR)}</cp:lastModifiedBy>`
    + "<cp:revision>1</cp:revision>"
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${w3cdtf(cree)}</dcterms:created>`
    + `<dcterms:modified xsi:type="dcterms:W3CDTF">${w3cdtf(modifie)}</dcterms:modified>`
    + `<cp:category>${echapper(meta.categorie)}</cp:category>`
    + "</cp:coreProperties>";
}

// Insère <balise> à une place conforme au schéma des propriétés étendues : Manager
// et Company après TitlesOfParts, jamais après AppVersion (Office signale sinon un
// contenu illisible).
function insererBalise(xml, balise, valeur) {
  const fragment = `<${balise}>${valeur}</${balise}>`;
  for (const ancre of ["</TitlesOfParts>", "</HeadingPairs>", "</ScaleCrop>", "</DocSecurity>"]) {
    if (xml.includes(ancre)) return xml.replace(ancre, () => ancre + fragment);
  }
  if (xml.includes("<AppVersion>")) return xml.replace("<AppVersion>", () => fragment + "<AppVersion>");
  return xml.replace("</Properties>", () => fragment + "</Properties>");
}

// Titres de diapositives pour TitlesOfParts : texte brut, point de coupure « // » lu comme une espace.
const titreBrut = (t) => String(t ?? "").replace(/\*\*/g, "").replace(/\s*\/\/\s*/g, " ").replace(/\s+/g, " ").trim();

// HeadingPairs et TitlesOfParts cohérents : une police (Open Sans), un thème, N titres de diapositives.
function titresEtPolices(xml, titres) {
  const n = titres.length;
  const parties = ["Open Sans", "Office Theme", ...titres.map((t, i) => titreBrut(t) || `Diapositive ${i + 1}`)];
  const paires = [["Fonts Used", 1], ["Theme", 1], ["Slide Titles", n]];
  const heading = "<HeadingPairs><vt:vector size=\"" + paires.length * 2 + "\" baseType=\"variant\">"
    + paires.map(([nom, k]) => `<vt:variant><vt:lpstr>${nom}</vt:lpstr></vt:variant><vt:variant><vt:i4>${k}</vt:i4></vt:variant>`).join("")
    + "</vt:vector></HeadingPairs>";
  const titlesOfParts = `<TitlesOfParts><vt:vector size="${parties.length}" baseType="lpstr">`
    + parties.map((t) => `<vt:lpstr>${echapper(t)}</vt:lpstr>`).join("") + "</vt:vector></TitlesOfParts>";
  if (!/<HeadingPairs>/.test(xml) || !/<TitlesOfParts>/.test(xml)) return xml;
  return xml.replace(/<HeadingPairs>[\s\S]*?<\/HeadingPairs>/, () => heading)
    .replace(/<TitlesOfParts>[\s\S]*?<\/TitlesOfParts>/, () => titlesOfParts);
}

function appXml(source, titres) {
  // Un <Properties/> auto-fermant n'a pas de point d'ancrage : on le déplie.
  let xml = source.replace(/(<Properties\b[^>]*?)\s*\/>/, "$1></Properties>");
  if (!/<Properties\b[^>]*>[\s\S]*?<\w[\s\S]*<\/Properties>/.test(xml)) {
    return xml.replace("</Properties>", () => `<Manager>${echapper(AUTEUR)}</Manager><Company>${echapper(SOCIETE)}</Company>`
      + `<Application>${echapper(APPLICATION)}</Application><AppVersion>16.0000</AppVersion></Properties>`);
  }
  if (titres) xml = titresEtPolices(xml, titres);
  const application = `<Application>${echapper(APPLICATION)}</Application>`;
  if (/<Application\/>|<Application>[\s\S]*?<\/Application>/.test(xml)) {
    xml = xml.replace(/<Application\/>|<Application>[\s\S]*?<\/Application>/, application);
  } else {
    xml = insererBalise(xml, "Application", echapper(APPLICATION));
  }
  for (const [balise, valeur] of [["Manager", AUTEUR], ["Company", SOCIETE]]) {
    xml = xml.replace(new RegExp(`<${balise}\\/>|<${balise}>[\\s\\S]*?<\\/${balise}>`, "g"), "");
    xml = insererBalise(xml, balise, echapper(valeur));
  }
  return xml;
}

// Retire de [Content_Types].xml les Override dont la partie n'existe pas dans l'archive.
// Seuls les Override auto-fermants sont traités, sans décodage %XX des PartName : cela
// suffit pour PptxGenJS, qui n'écrit pas autrement ses noms de parties.
function sansOverrideMortes(contentTypes, noms) {
  const presents = new Set(noms);
  return contentTypes.replace(/<Override\b[^>]*?\/>/g, (balise) => {
    const m = /PartName="([^"]+)"/.exec(balise);
    return !m || presents.has(m[1].replace(/^\//, "")) ? balise : "";
  });
}

// `titres` : titres des diapositives dans l'ordre (facultatif ; sans eux, la liste de app.xml reste celle du buffer).
async function finaliser(buffer, meta = {}, { titres } = {}) {
  const zip = await chargerJSZip().loadAsync(buffer);
  zip.file("docProps/core.xml", coreXml(meta, new Date()));
  const app = zip.file("docProps/app.xml");
  zip.file("docProps/app.xml", appXml(app ? await app.async("string") : "<Properties></Properties>", titres));
  const ct = zip.file("[Content_Types].xml");
  if (ct) {
    const noms = Object.keys(zip.files).filter((n) => !zip.files[n].dir);
    zip.file("[Content_Types].xml", sansOverrideMortes(await ct.async("string"), noms));
  }
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

const empreinteContenu = (octets) => crypto.createHash("sha256").update(octets).digest("hex");
const empreinte = (chemin) => empreinteContenu(fs.readFileSync(chemin));

// Fichiers de verrou de PowerPoint pour `sortie` : « ~$nom », ou « ~$ » suivi du nom
// privé de ses deux premiers caractères quand le nom est long.
function verrousOffice(sortie) {
  const nom = path.basename(sortie);
  return [nom, nom.slice(2)].map((n) => path.join(path.dirname(sortie), "~$" + n));
}

// Garde d'écrasement. Un fichier ouvert dans PowerPoint ou retouché à la main n'est
// jamais écrasé, `ecraser` ou non : lever ce garde-fou se fait à la main, en
// déplaçant ou supprimant le fichier. `ecraser` ne sert que pour un fichier sans empreinte.
function peutEcrire(sortie, { ecraser = false } = {}) {
  if (verrousOffice(sortie).some((v) => fs.existsSync(v))) {
    return { ok: false, raison: `${sortie} est ouvert dans PowerPoint (fichier ~$ présent) : le fermer d'abord.` };
  }
  const fichierEmpreinte = sortie + ".empreinte";
  if (fs.existsSync(fichierEmpreinte) && !fs.statSync(fichierEmpreinte).isFile()) {
    return { ok: false, raison: `${fichierEmpreinte} n'est pas un fichier : le déplacer d'abord.` };
  }
  if (!fs.existsSync(sortie)) return { ok: true };
  if (fs.existsSync(fichierEmpreinte)) {
    if (fs.readFileSync(fichierEmpreinte, "utf8").trim() === empreinte(sortie)) return { ok: true };
    return {
      ok: false,
      raison: `${sortie} a été retouché à la main (empreinte différente) : il n'est pas écrasé. `
        + "Le renommer, ou supprimer le fichier .empreinte, si la régénération est voulue.",
    };
  }
  if (ecraser) return { ok: true };
  return { ok: false, raison: `${sortie} existe déjà sans empreinte (non généré par ce moteur) : relancer avec --ecraser pour le remplacer.` };
}

module.exports = { finaliser, empreinte, empreinteContenu, peutEcrire };
