// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Analyseur de la source Markdown : texte en entrée, Document en sortie.
// La grammaire de base reprend celle du générateur de diaporamas livré en
// octobre 2026 (couverture, sections, puces, accroche, deux colonnes, tableau,
// schémas, image, notes). Les directives placées juste sous le « ## » ajoutent
// les motifs de la charte : cartes, blocs, chiffres clés, graphiques, radar,
// carte de chaleur, icônes, citation, prompt, décodage, image placée, libre.
//
// L'analyseur ne mesure rien et ne contrôle pas les limites de nombre : le rendu
// s'en charge. Il signale ce qui se voit à la lecture (directive inconnue,
// visuel en double, données illisibles) dans doc.alertes.

const { SIGNAUX } = require("./gabarit.js");

const CLES_META = ["titre", "objet", "mots_cles", "categorie", "commentaires", "client", "date", "logo_client", "cotraitant"];

const TYPES_SCHEMA = {
  processus: "processus", etapes: "processus",
  cycle: "cycle",
  hierarchie: "hierarchie", organigramme: "hierarchie",
  chronologie: "chronologie", frise: "chronologie", calendrier: "chronologie",
  logigramme: "logigramme", "arbre de decision": "logigramme",
};
const TYPES_GRAPHIQUE = ["barres", "courbes", "secteurs"];
const POSITIONS_IMAGE = ["droite", "gauche"];
const MOTIFS_GRAPHIQUE = ["graphique", "radar", "chaleur"];
const MOTIFS_COLONNES = ["cartes", "blocs"];

const sansAccent = (s) => String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/\s+/g, " ").trim();

// Chaque directive rend { motif, ...réglage } ou { erreur } quand sa valeur ne convient pas.
const DIRECTIVES = {
  "cartes": (v) => ({ motif: "cartes", couleurs: v }),
  "blocs": () => ({ motif: "blocs" }),
  "chiffres cles": (v) => ({ motif: "chiffres", couleurs: v }),
  "graphique": (v) => TYPES_GRAPHIQUE.includes(sansAccent(v))
    ? { motif: "graphique", type: sansAccent(v) }
    : { erreur: `graphique « ${v} » inconnu : écrire barres, courbes ou secteurs` },
  "radar": () => ({ motif: "radar", type: "radar" }),
  "carte de chaleur": () => ({ motif: "chaleur", type: "chaleur" }),
  "icones": () => ({ motif: "icones" }),
  "citation": () => ({ motif: "citation" }),
  "prompt": () => ({ motif: "prompt" }),
  "decodage": () => ({ motif: "decodage" }),
  "image": (v) => POSITIONS_IMAGE.includes(sansAccent(v))
    ? { motif: "image", position: sansAccent(v) }
    : { erreur: `position d'image « ${v} » inconnue : écrire droite ou gauche` },
  "diapositive libre": (v) => v
    ? { motif: "libre", chemin: v }
    : { erreur: "diapositive libre sans chemin : écrire le nom du fichier .js voisin de la source" },
  "schema": (v) => TYPES_SCHEMA[sansAccent(v)]
    ? { motif: "schema", type: TYPES_SCHEMA[sansAccent(v)] }
    : { erreur: `schéma « ${v} » inconnu : écrire processus, cycle, hiérarchie, chronologie ou logigramme` },
};

// « Étiquette : valeur », d'un à trois mots, deux-points suivi d'une espace ou de la fin
// de ligne (une adresse « https://… » n'en est pas une). Le gras est ignoré.
function lireEtiquette(nette) {
  const m = /^([\p{L}][\p{L}'’-]*(?:\s+[\p{L}][\p{L}'’-]*){0,2})\s*:(?:\s+(.*))?$/u
    .exec(nette.replace(/\*\*|__/g, "").trim());
  if (!m) return null;
  return { nom: sansAccent(m[1]), mots: m[1].trim().split(/\s+/).length, valeur: (m[2] || "").trim() };
}

// Coupe « a : b : c » aux `max` premiers séparateurs « : » ; le reste garde ses deux-points.
function couper(texte, max) {
  const parts = [];
  let reste = texte;
  const sep = /\s+:\s+/;
  while (parts.length < max) {
    const m = sep.exec(reste);
    if (!m) break;
    parts.push(reste.slice(0, m.index).trim());
    reste = reste.slice(m.index + m[0].length);
  }
  parts.push(reste.trim());
  return parts;
}

// Cellule de graphique : espaces (insécables compris) retirés, virgule décimale, « % » final toléré.
function nombre(cellule) {
  if (cellule === undefined) return null;
  const s = cellule.replace(/\s/g, "").replace(/\u2212/g, "-").replace(/%$/, "").replace(",", ".");
  return /^[+-]?\d+(?:\.\d+)?$/.test(s) ? Number(s) : null;
}

function cellules(ligne) {
  return ligne.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

function nouvelleDiapo(type, titre, ligne) {
  return {
    ligne, type, titre, sousTitre: [], accroche: null, notes: [], motif: null,
    blocs: [], colonnes: [], tableau: null, schema: null, chiffres: [], graphique: null,
    icones: [], citation: null, prompt: null, image: null, libre: null, source: null, contact: [],
    couleurs: null,         // cartes et chiffres clés : noms de SIGNAUX, un par élément
    pied: null,             // texte de la ligne « Pied : »
  };
}

// État de lecture d'une diapositive, hors du Document.
function nouvelEtat(d) {
  return {
    directive: null,        // motif fixé par une directive
    position: d.type === "contenu", // la ligne suivante peut encore être une directive
    visuel: null,           // ce qui occupe l'unique place de visuel
    positionImage: null,
    cible: d.blocs,         // où vont les puces : diapositive ou colonne
    pile: [],               // retraits des puces, pour les niveaux
    ignorer: false,         // contenu d'une colonne refusée
    enNotes: false,
    cloture: false,
    texteVu: false,         // une ligne de texte est déjà passée sous le « # »
    legende: [], citation: [], intro: [],
    promptLu: false,        // le bloc du prompt est lu
    promptMalPlace: false,  // une ligne « Prompt : » hors de sa place est déjà signalée
    donneesLues: false,     // le tableau du graphique est lu
    ligneCouleurs: null,    // ligne de la directive qui nomme les couleurs
  };
}

function lireEntete(lignes, alerte) {
  const meta = Object.fromEntries(CLES_META.map((c) => [c, null]));
  if (!lignes.length || lignes[0].trim() !== "---") return { meta, debut: 0 };
  const fin = lignes.findIndex((l, i) => i > 0 && l.trim() === "---");
  if (fin < 0) {
    alerte(1, "DONNEES_INVALIDES", "En-tête ouvert par « --- » sans ligne « --- » de fermeture : il est lu comme du texte.");
    return { meta, debut: 0 };
  }
  for (let i = 1; i < fin; i++) {
    const n = i + 1;
    const nette = lignes[i].trim();
    if (!nette || nette.startsWith("#")) continue;
    const m = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(nette);
    if (!m) { alerte(n, "DIRECTIVE_INCONNUE", `Ligne d'en-tête illisible : écrire « clé: valeur ».`); continue; }
    const cle = m[1];
    if (!CLES_META.includes(cle)) {
      alerte(n, "DIRECTIVE_INCONNUE", `Clé d'en-tête « ${cle} » inconnue : ${CLES_META.join(", ")}.`);
      continue;
    }
    const valeur = m[2].trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1").trim();
    if (!valeur) continue;
    if (cle === "date" && !/^\d{4}-\d{2}-\d{2}$/.test(valeur)) {
      alerte(n, "DONNEES_INVALIDES", `Date « ${valeur} » illisible : écrire AAAA-MM-JJ.`);
      continue;
    }
    meta[cle] = valeur;
  }
  return { meta, debut: fin + 1 };
}

function analyser(md) {
  const lignes = String(md).replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").split("\n");
  const alertes = [];
  const alerte = (ligne, code, message) => alertes.push({ ligne, code, message });
  const { meta, debut } = lireEntete(lignes, alerte);
  const diapos = [];
  let d = null;
  let e = null;
  let lignesTableau = [];
  let avantTitreSignale = false;
  // Bloc de code ouvert : { marqueur, ligne, lignes, vers: "prompt" | "blocs" | "notes" | null }.
  // Son contenu n'est jamais lu comme du Markdown.
  let code = null;

  const enDouble = (n, quoi) =>
    alerte(n, "VISUEL_EN_DOUBLE", `${quoi} : la diapositive porte déjà un visuel (${e.visuel}), un seul par diapositive. Ignoré, le premier est gardé.`);

  function finir() {
    if (!d || d.type !== "contenu") return;
    d.motif = e.directive
      || (d.colonnes.length ? "deux-colonnes" : d.tableau ? "tableau" : d.image ? "image" : "puces");
    // Ni directive, ni puce, ni visuel, ni accroche : la diapositive n'aurait que son titre.
    if (!e.directive && !e.visuel && !d.blocs.length && !d.accroche) {
      alerte(d.ligne, "DONNEES_INVALIDES", "Diapositive sans contenu : écrire des puces, un visuel ou une directive sous le ##, ou retirer ce titre.");
    }
    if (d.image && !d.image.position) d.image.position = d.blocs.length ? "droite" : "pleine";
    if (d.schema) d.schema.legende = e.legende.join(" ") || null;
    if (d.citation) d.citation.texte = e.citation.join(" ") || null;
    if (d.prompt) d.prompt.intro = e.intro.join(" ") || null;
    const manque = {
      graphique: !e.donneesLues && "sans tableau de données",
      radar: !e.donneesLues && "sans tableau de données",
      chaleur: !e.donneesLues && "sans tableau de données",
      prompt: !e.promptLu && "sans bloc de code délimité par ```",
      chiffres: !d.chiffres.length && "sans puce « - valeur : libellé »",
      icones: !d.icones.length && "sans puce « - NomIcone : Titre : description »",
      image: !d.image && "sans ligne ![légende](fichier)",
      citation: !d.citation?.texte && "sans texte",
    }[e.directive];
    if (manque) alerte(d.ligne, "DONNEES_INVALIDES", `Directive ${e.directive} ${manque} : la diapositive serait vide.`);
    if (d.couleurs) {
      const [nombre, quoi] = d.motif === "cartes" ? [d.colonnes.length, "cartes"] : [d.chiffres.length, "chiffres"];
      if (nombre && nombre !== d.couleurs.length) {
        alerte(e.ligneCouleurs, "DONNEES_INVALIDES", `${d.couleurs.length} couleurs pour ${nombre} ${quoi} : en écrire une par élément, dans l'ordre. Rotation des couleurs par défaut.`);
        d.couleurs = null;
      }
    }
  }

  // « Cartes : rouge, orange, gris » : noms de SIGNAUX séparés par des virgules.
  function lireCouleurs(n, valeur) {
    const noms = valeur.split(",").map(sansAccent).filter(Boolean);
    const inconnus = noms.filter((nom) => !SIGNAUX[nom]);
    if (inconnus.length) {
      const pluriel = inconnus.length > 1;
      alerte(n, "DONNEES_INVALIDES", `Couleur${pluriel ? "s" : ""} ${inconnus.map((nom) => `« ${nom} »`).join(", ")} inconnue${pluriel ? "s" : ""} : écrire bleu, or, gris, vert, orange ou rouge. Rotation des couleurs par défaut.`);
      return;
    }
    if (noms.length) { d.couleurs = noms; e.ligneCouleurs = n; }
  }

  function fermerCode() {
    if (code.vers === "prompt") { d.prompt.texte = code.lignes.join("\n"); e.promptLu = true; }
    if (code.vers === "notes") code.lignes.forEach((l) => { if (l.trim()) d.notes.push(l.trim()); });
    if (code.vers === "blocs") {
      code.lignes.forEach((l) => { if (l.trim()) e.cible.push({ texte: l.trim(), niveau: 1, numero: null }); });
    }
    code = null;
  }

  function ouvrirCode(n, marqueur) {
    let vers = null;
    if (!d) {
      alerte(n, "DONNEES_INVALIDES", "Bloc de code placé avant le titre de la présentation (# Titre) : ignoré.");
    } else if (e.enNotes) {
      vers = "notes";
    } else if (d.type === "contenu" && e.directive === "prompt") {
      e.position = false;
      if (e.promptLu) enDouble(n, "Bloc de code");
      else vers = "prompt";
    } else {
      e.position = false;
      vers = e.ignorer ? null : "blocs";
      // Une directive Prompt mal placée est déjà signalée : une seule alerte pour une seule cause.
      if (!e.promptMalPlace) {
        alerte(n, "DONNEES_INVALIDES", "Bloc de code hors d'une diapositive Prompt : son contenu est affiché comme du texte. Pour un prompt, écrire « Prompt : » juste sous le ##.");
      }
    }
    code = { marqueur, ligne: n, lignes: [], vers };
  }

  function remplirGraphique(rangs) {
    const g = d.graphique;
    const [entete, ...donnees] = rangs;
    const noms = entete.cellules.slice(1);
    if (!noms.length) alerte(entete.n, "DONNEES_INVALIDES", `Tableau de ${e.directive} sans colonne de valeurs : seule la colonne des catégories est écrite.`);
    else if (!donnees.length) alerte(entete.n, "DONNEES_INVALIDES", `Tableau de ${e.directive} sans rangée de données : seul l'en-tête est écrit.`);
    g.categories = donnees.map((r) => r.cellules[0]);
    g.series = noms.map((nom, j) => ({
      nom,
      valeurs: donnees.map((r) => {
        const c = r.cellules[j + 1];
        const v = nombre(c);
        if (v === null) {
          alerte(r.n, "DONNEES_INVALIDES", c === undefined
            ? `Colonne « ${nom} » manquante sur la rangée « ${r.cellules[0]} » : valeur vide.`
            : `Cellule « ${c} » illisible (colonne « ${nom} ») : un nombre est attendu, valeur vide.`);
        }
        return v;
      }),
    }));
    for (const r of donnees) {
      if (r.cellules.length > entete.cellules.length) {
        alerte(r.n, "DONNEES_INVALIDES", `Rangée « ${r.cellules[0]} » plus longue que l'en-tête : cellules en trop ignorées.`);
      }
    }
  }

  function fermerTableau() {
    if (!lignesTableau.length) return;
    const n0 = lignesTableau[0].n;
    const rangs = lignesTableau
      .map((l) => ({ n: l.n, cellules: cellules(l.texte) }))
      .filter((r) => !r.cellules.every((c) => /^:?-+:?$/.test(c)));
    lignesTableau = [];
    if (!d || d.type !== "contenu") {
      alerte(n0, "DONNEES_INVALIDES", "Tableau hors d'une diapositive de contenu (## Titre) : ignoré.");
      return;
    }
    e.position = false;
    if (!rangs.length) return;
    if (MOTIFS_GRAPHIQUE.includes(e.directive)) {
      if (e.donneesLues) { enDouble(n0, "Tableau"); return; }
      e.donneesLues = true;
      remplirGraphique(rangs);
      return;
    }
    if (e.visuel) { enDouble(n0, "Tableau"); return; }
    e.visuel = "tableau";
    d.tableau = { entetes: rangs[0].cellules, rangees: rangs.slice(1).map((r) => r.cellules) };
  }

  function appliquerDirective(n, reglage, valeur) {
    e.directive = reglage.motif;
    if (reglage.couleurs) lireCouleurs(n, reglage.couleurs);
    if (reglage.motif === "blocs" && valeur) {
      alerte(n, "DONNEES_INVALIDES", `Blocs n'accepte pas de couleurs : « ${valeur} » est ignoré ; les couleurs de signal valent pour Cartes et Chiffres clés.`);
    }
    e.visuel = reglage.motif;
    if (MOTIFS_GRAPHIQUE.includes(reglage.motif)) d.graphique = { type: reglage.type, categories: [], series: [] };
    if (reglage.motif === "schema") d.schema = { type: reglage.type, elements: [], legende: null };
    if (reglage.motif === "citation") d.citation = { texte: null, auteur: null };
    if (reglage.motif === "prompt") d.prompt = { intro: null, texte: null };
    if (reglage.motif === "libre") d.libre = { chemin: reglage.chemin };
    if (reglage.motif === "image") e.positionImage = reglage.position;
    // « Citation : texte » et « Prompt : intro » : la suite de la ligne est déjà du contenu.
    if (valeur && reglage.motif === "citation") e.citation.push(valeur);
    if (valeur && reglage.motif === "prompt") e.intro.push(valeur);
  }

  // Renvoie vrai si la ligne a été prise comme directive.
  function directive(n, nette) {
    e.position = false;
    const et = lireEtiquette(nette);
    if (!et) return false;
    const regle = DIRECTIVES[et.nom];
    if (regle) {
      const reglage = regle(et.valeur);
      if (!reglage.erreur) { appliquerDirective(n, reglage, et.valeur); return true; }
      alerte(n, "DIRECTIVE_INCONNUE", `${reglage.erreur[0].toUpperCase()}${reglage.erreur.slice(1)}. La ligne est affichée comme du texte.`);
    } else if (et.mots <= 2) {
      alerte(n, "DIRECTIVE_INCONNUE", `Directive « ${et.nom} » inconnue sous le titre : la ligne est affichée comme du texte.`);
    }
    return false;
  }

  function titre(n, niveau, texte) {
    if (niveau === 3) {
      if (!d || d.type !== "contenu") {
        alerte(n, "DONNEES_INVALIDES", "Sous-titre ### hors d'une diapositive de contenu (## Titre) : ignoré.");
        return;
      }
      e.position = false; e.pile = []; e.enNotes = false; e.ignorer = false;
      if (MOTIFS_COLONNES.includes(e.directive)) {
        // cartes et blocs : un ### par élément, sans limite ici
      } else if (e.visuel && e.visuel !== "colonnes") {
        enDouble(n, `Colonne « ${texte} »`); e.ignorer = true; return;
      } else if (d.colonnes.length === 2) {
        alerte(n, "DONNEES_INVALIDES", `Colonne « ${texte} » : plus de deux ### sans directive, seules les deux premières colonnes sont gardées.`);
        e.ignorer = true; return;
      } else {
        e.visuel = "colonnes";
      }
      const col = { titre: texte, blocs: [] };
      d.colonnes.push(col);
      e.cible = col.blocs;
      return;
    }
    finir();
    const type = niveau === 2 ? "contenu" : diapos.length ? "section" : "couverture";
    d = nouvelleDiapo(type, texte, n);
    e = nouvelEtat(d);
    diapos.push(d);
  }

  // Couverture, section, clôture : sous-titre, ou contact après « Clôture : ».
  function ligneHorsContenu(n, nette, texte) {
    if (/^!\[/.test(nette)) {
      alerte(n, "DONNEES_INVALIDES", "Image hors d'une diapositive de contenu (## Titre) : ignorée.");
      return;
    }
    const et = lireEtiquette(nette);
    if (d.type === "section" && !e.texteVu && et && et.nom === "cloture") {
      d.type = "cloture";
      e.cloture = true;
      e.texteVu = true;
      if (et.valeur) d.sousTitre.push(et.valeur);
      return;
    }
    if (et && et.nom === "accroche") {
      alerte(n, "DONNEES_INVALIDES", "Accroche hors d'une diapositive de contenu (## Titre) : ignorée. Sur une couverture ou une section, écrire le texte sans « Accroche : ».");
      return;
    }
    // « Auteur : » sur la couverture : donnée d'en-tête du format d'origine, jamais affichée ;
    // l'auteur des métadonnées est fixé par la charte.
    if (d.type === "couverture" && et && et.nom === "auteur") return;
    e.texteVu = true;
    (e.cloture ? d.contact : d.sousTitre).push(texte);
  }

  function ligneContenu(n, ligne, nette) {
    const et = lireEtiquette(nette);
    if (et && et.nom === "accroche") {
      if (et.valeur) d.accroche = et.valeur;
      return;
    }
    const enPosition = e.position;
    if (enPosition && directive(n, nette)) return;
    e.position = false;
    if (!enPosition && et && DIRECTIVES[et.nom]) {
      alerte(n, "DONNEES_INVALIDES", `Directive « ${nette} » hors de sa place : l'écrire juste sous le titre ## (ou sous l'accroche). La ligne est affichée comme du texte.`);
      if (et.nom === "prompt") e.promptMalPlace = true;
    }

    const image = /^!\[([^\]]*)\]\(([^)]*)\)/.exec(nette);
    if (image) {
      const img = {
        chemin: image[2].trim().replace(/^<|>$/g, "") || null,
        legende: image[1].trim() || null,
        position: e.positionImage,
      };
      const libre = e.directive === "image" ? !d.image : !e.visuel;
      if (!libre) { enDouble(n, `Image « ${img.legende || img.chemin} »`); return; }
      d.image = img;
      e.visuel = "image";
      return;
    }

    if (e.ignorer) return;
    const puce = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(ligne);
    let profondeur = 0;
    let numero = null;
    let texte;
    if (puce) {
      const retrait = puce[1].length;
      while (e.pile.length && retrait < e.pile[e.pile.length - 1]) e.pile.pop();
      if (!e.pile.length || retrait > e.pile[e.pile.length - 1]) e.pile.push(retrait);
      profondeur = Math.min(e.pile.length - 1, 2);
      if (/\d/.test(puce[2])) numero = parseInt(puce[2], 10);
      texte = puce[3].trim();
    } else {
      e.pile = [];
      texte = nette.replace(/^>\s?/, "");
    }

    switch (e.directive) {
      case "schema":
        if (!puce) { e.legende.push(texte); return; }
        if (e.pile.length - 1 > 2) {
          alerte(n, "DONNEES_INVALIDES", `Puce « ${texte} » plus profonde que le 3e rang d'un schéma : ramenée au 3e rang.`);
        }
        d.schema.elements.push(texte.startsWith("?")
          ? { texte: texte.slice(1).trim(), niveau: profondeur, question: true }
          : { texte, niveau: profondeur, question: false });
        return;
      case "chiffres":
        if (puce) {
          const [valeur, libelle] = couper(texte, 1);
          if (libelle === undefined) alerte(n, "DONNEES_INVALIDES", `Chiffre « ${texte} » sans libellé : écrire « - valeur : libellé ».`);
          d.chiffres.push({ valeur, libelle: libelle === undefined ? null : libelle });
          return;
        }
        break;
      case "icones":
        if (puce) {
          const [icone, titreIcone, description] = couper(texte, 2);
          if (titreIcone === undefined) alerte(n, "DONNEES_INVALIDES", `Icône « ${texte} » sans titre : écrire « - NomIcone : Titre : description ».`);
          d.icones.push({ icone, titre: titreIcone === undefined ? null : titreIcone, description: description === undefined ? null : description });
          return;
        }
        break;
      case "citation": {
        const auteur = lireEtiquette(texte);
        if (auteur && auteur.nom === "auteur") d.citation.auteur = auteur.valeur || null;
        else e.citation.push(texte);
        return;
      }
      case "prompt":
        if (!e.promptLu) { e.intro.push(texte); return; }
        break;
    }
    e.cible.push({ texte, niveau: profondeur === 0 ? 1 : 2, numero });
  }

  for (let i = debut; i < lignes.length; i++) {
    const n = i + 1;
    const brute = lignes[i];
    const ligne = brute.replace(/\t/g, "    ");
    const nette = ligne.trim();

    if (code) {
      if (nette.startsWith(code.marqueur) && !nette.slice(3).trim()) fermerCode();
      else code.lignes.push(brute);
      continue;
    }

    if (/^\|/.test(nette) && !(e && e.enNotes)) { lignesTableau.push({ n, texte: nette }); continue; }
    fermerTableau();

    const delimiteur = /^(```|~~~)/.exec(nette);
    if (delimiteur) { ouvrirCode(n, delimiteur[1]); continue; }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(nette)) continue;
    if (!nette) { if (e) e.pile = []; continue; }

    const t = /^(#{1,3})\s+(.*)$/.exec(nette);
    if (t) { titre(n, t[1].length, t[2].replace(/\s+#+\s*$/, "").trim()); continue; }

    if (!d) {
      if (!avantTitreSignale) alerte(n, "DONNEES_INVALIDES", "Texte placé avant le titre de la présentation (# Titre) : ignoré.");
      avantTitreSignale = true;
      continue;
    }

    const et = lireEtiquette(nette);
    if (et && (et.nom === "notes" || et.nom === "note")) {
      e.enNotes = true;
      if (et.valeur) d.notes.push(et.valeur);
      continue;
    }
    if (e.enNotes) { d.notes.push(nette.replace(/^[-*+]\s+/, "")); continue; }
    if (et && (et.nom === "source" || et.nom === "sources")) {
      if (d.type !== "contenu") alerte(n, "DONNEES_INVALIDES", "Source hors d'une diapositive de contenu (## Titre) : ignorée.");
      else if (et.valeur) d.source = d.source ? `${d.source} ; ${et.valeur}` : et.valeur;
      continue;
    }
    if (et && et.nom === "pied") {
      if (d.type !== "contenu") alerte(n, "DONNEES_INVALIDES", "Pied hors d'une diapositive de contenu (## Titre) : ignoré.");
      else if (et.valeur) d.pied = d.pied ? `${d.pied} ; ${et.valeur}` : et.valeur;
      continue;
    }

    if (d.type === "contenu") ligneContenu(n, ligne, nette);
    else ligneHorsContenu(n, nette, nette.replace(/^([-*+]|\d+[.)])\s+/, ""));
  }
  fermerTableau();
  if (code) {
    alerte(code.ligne, "DONNEES_INVALIDES", "Bloc de code sans délimiteur de fermeture : il court jusqu'à la fin du fichier.");
    fermerCode();
  }
  finir();
  if (!diapos.length) alerte(1, "DONNEES_INVALIDES", "Aucun titre trouvé : la présentation commence par une ligne « # Titre ».");

  alertes.sort((a, b) => a.ligne - b.ligne);
  return { meta, diapos, alertes };
}

module.exports = { analyser };
