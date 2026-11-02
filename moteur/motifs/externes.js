// SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot
// SPDX-License-Identifier: EUPL-1.2
//
// Motifs qui dépendent d'outils extérieurs : radar et carte de chaleur (Python,
// matplotlib, scripts/cds_charts.py de la skill), grille d'icônes (react-icons,
// react-dom/server, sharp, dépendances facultatives du moteur). Les contrats de
// `ctx` et du registre sont en tête de rendu.js ; titre, accroche, notes et pied
// « Source : … » sont posés par rendu.js, pas ici.
//
// Appel de Python. execFileSync, sans shell, dans un dossier temporaire :
//   python -E -B -c SCRIPT_PYTHON <dossier scripts/ de la skill, absolu> <PNG à écrire>
// SCRIPT_PYTHON est une chaîne constante : libellés et valeurs passent en JSON
// par l'entrée standard, les chemins par argv, jamais dans le code exécuté. -E
// écarte les variables PYTHON* (le site utilisateur reste lu : un matplotlib
// installé par pip --user est trouvé) ; -B n'écrit aucun __pycache__ dans la
// skill ; le dossier courant, temporaire et vide, n'offre rien à importer.
// Python : CDS_PYTHON, sinon python3 ; un chemin relatif se lit depuis le
// dossier courant. Le PNG est écrit dans le dossier temporaire, lu en mémoire
// puis supprimé : l'image est embarquée en data URI, l'écriture différée du
// deck ne relit aucun fichier. Le script écrit sur sa sortie le nombre de
// textes « nan » retirés (lu par les essais).
//
// Dégradation, jamais d'exception : cds_charts.py introuvable, Python absent,
// module manquant, code de sortie non nul, délai dépassé, dossier temporaire
// impossible, paquet d'icônes absent ou conversion en échec : DEPENDANCE_ABSENTE
// une fois par deck et par dépendance (ctx.partage), au message propre à la
// cause, puis une réserve légendée (ou le monogramme pour une icône). Python
// introuvable ou trop lent : l'échec est gardé pour le deck, les visuels
// suivants passent à la réserve sans relancer Python.
//
// Journal des versions retenues (octobre 2026). Sources : pptxgenjs-cds.md v2
// (« Intégrer une dataviz matplotlib », addIconGridSlide, iconToBase64Png) et
// cds_charts.py de la skill, appelé tel quel.
//
//   Radar      cds_charts.generate_radar, une ligne du tableau par dimension et
//              une colonne par série. La v2 posait le PNG en sizing contain
//              dans une boîte fixe ; ici l'image est un carré, le plus grand qui
//              tient dans la zone, centré. Le PNG de matplotlib (bbox tight, la
//              légende déborde à droite) n'est pas carré : le script le complète
//              en blanc jusqu'au carré, sans l'étirer. Ajoutés : une série à
//              valeur vide est retirée (un radar ne trace pas de trou), au moins
//              trois dimensions, libellés lus comme du texte (pas de formule
//              mathtext entre deux « $ »), Open Sans quand matplotlib la trouve.
//   Chaleur    cds_charts.generate_heatmap, tableau repris tel quel : rangées
//              en lignes, séries en colonnes. Échelle 0-10 (maturité) quand
//              toutes les valeurs y tiennent, sinon du minimum au maximum des
//              données ; la v2 fixait 0-10. Case vide : NaN, laissée blanche ;
//              le texte « nan » que la fonction y écrit est retiré des axes
//              juste avant l'enregistrement (enveloppe de Figure.savefig).
//              Image contenue dans la zone, ratio du PNG conservé.
//   Réglages   (tâche 11) faits dans l'enveloppe de savefig, cds_charts.py
//              restant intact. Radar : cercle et cadres en gris 777777 ;
//              libellés d'axes redessinés hors du cercle, alignés selon leur
//              angle ; graduations à la française (« 2,5 ») sur pastille
//              blanche, au-dessus des tracés ; remplissages à 6 % d'opacité ;
//              8 % de marge au-dessus du maximum ; légende centrée dessous ;
//              tailles réglées pour donner 11,5 pt une fois l'image réduite au
//              côté reçu (cote_pouces). Chaleur : dégradé monotone « cds_bleu »
//              (F5F5F5 vers BLEU) passé en cmap ; valeurs « 6 » ou « 6,5 » ;
//              texte blanc ou gris foncé, le plus contrasté sur sa case, noir
//              seulement si aucun des deux n'atteint 4,5:1 ; libellés de
//              colonnes à plat s'ils tiennent dans leur colonne, sinon à 45°.
//              Le script rend sur sa sortie ce qu'il a réglé (JSON).
//   Icônes     addIconGridSlide : cercle sous l'icône, titre en gras bleu,
//              description gris foncé, centrés. Corrigés : l'icône bleue sur un
//              cercle bleu était invisible, le cercle passe en gris clair à
//              liseré or ; quatre icônes faisaient 3 + 1, elles font 2 x 2, cinq
//              font 3 + 2 (la rangée incomplète centrée), six 3 x 2 ; cercle à
//              la mesure de la case au lieu de 0,9 pouce fixe ; titre (16 à
//              12 pt) et description (14 à 10 pt) mesurés, une taille commune à
//              toutes les cases. Repris d'iconToBase64Png : SVG par
//              renderToStaticMarkup, PNG de 256 px par sharp, en BLEU 1F519B
//              (currentColor remplacé). Nom cherché dans fa, md puis lu.

const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const g = require("../gabarit.js");
const { ajuster } = require("../mesure.js");

const { COULEURS, POLICE, INTERLIGNE } = g;

// Chargement des paquets facultatifs ; les essais le remplacent pour simuler un absent.
const paquets = { charger: (nom) => require(nom) };

// Délai de l'appel à Python, en millisecondes ; les essais le raccourcissent.
const reglages = { delaiPython: 60000 };

const SCRIPT_PYTHON = [
  "import json, math, sys",
  "sys.path.insert(0, sys.argv[1])",
  "sortie = sys.argv[2]",
  "d = json.loads(sys.stdin.buffer.read().decode('utf-8'))",
  "import matplotlib",
  "matplotlib.use('Agg')",
  "if 'text.parse_math' in matplotlib.rcParams:",
  "    matplotlib.rcParams['text.parse_math'] = False",
  "matplotlib.rcParams['font.sans-serif'] = ['Open Sans'] + list(matplotlib.rcParams['font.sans-serif'])",
  "import matplotlib.colors",
  "import matplotlib.figure",
  "import matplotlib.image",
  "import matplotlib.ticker",
  "GRIS = '#777777'",
  "GRIS_FONCE = '#333333'",
  "BLANC = '#FFFFFF'",
  "NOIR = '#000000'",
  "CMAP = 'cds_bleu'",
  "if CMAP not in matplotlib.colormaps:",
  "    matplotlib.colormaps.register(matplotlib.colors.LinearSegmentedColormap.from_list(CMAP, ['#F5F5F5', '#1F519B']))",
  "rapport = {'nan_retires': 0}",
  "def fr(v, _pos=None):",
  "    v = float(v)",
  "    if abs(v - round(v)) < 1e-9:",
  "        return str(int(round(v)))",
  "    return ('%.2f' % v).rstrip('0').replace('.', ',')",
  "def luminance(c):",
  "    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c[:3]]",
  "    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]",
  "def contraste(a, b):",
  "    h, l = sorted([luminance(a), luminance(b)], reverse=True)",
  "    return (h + 0.05) / (l + 0.05)",
  "def contours(fig):",
  "    vus = set()",
  "    for a in fig.axes:",
  "        for s in a.spines.values():",
  "            s.set_edgecolor(GRIS)",
  "            vus.add(matplotlib.colors.to_hex(s.get_edgecolor()))",
  "    rapport['contours'] = sorted(vus)",
  "def regler_chaleur(fig):",
  "    ax = next(a for a in fig.axes if a.images)",
  "    im = ax.images[0]",
  "    rapport['cmap'] = im.get_cmap().name",
  "    textes, choix, minimum = [], [], None",
  "    for t in ax.texts:",
  "        j, i = t.get_position()",
  "        v = d['valeurs'][int(round(i))][int(round(j))]",
  "        if v is None:",
  "            continue",
  "        t.set_text(fr(v))",
  "        fond = im.cmap(im.norm(v))",
  "        blanc = contraste((1, 1, 1), fond)",
  "        fonce = contraste(matplotlib.colors.to_rgb(GRIS_FONCE), fond)",
  "        c, couleur = max((blanc, BLANC), (fonce, GRIS_FONCE))",
  "        if c < 4.5:",
  "            c, couleur = contraste((0, 0, 0), fond), NOIR",
  "        t.set_color(couleur)",
  "        choix.append({'couleur': couleur, 'blanc': round(blanc, 3), 'fonce': round(fonce, 3)})",
  "        textes.append(t.get_text())",
  "        minimum = c if minimum is None else min(minimum, c)",
  "    rapport['textes_cases'] = textes",
  "    rapport['choix_cases'] = choix",
  "    # Libellés de colonnes à plat s'ils tiennent tous dans la largeur d'une colonne, sinon à 45°.",
  "    fig.canvas.draw()",
  "    rendu = fig.canvas.get_renderer()",
  "    colonne = abs(ax.transData.transform((1, 0))[0] - ax.transData.transform((0, 0))[0])",
  "    etiquettes = ax.get_xticklabels()",
  "    for t in etiquettes:",
  "        t.set_rotation(0)",
  "    plat = all(t.get_window_extent(rendu).width <= colonne * 0.95 for t in etiquettes)",
  "    for t in etiquettes:",
  "        t.set_rotation(0 if plat else 45)",
  "        t.set_ha('center' if plat else 'right')",
  "    rapport['rotation_colonnes'] = 0 if plat else 45",
  "    rapport['contraste_min'] = None if minimum is None else round(minimum, 2)",
  "    for a in fig.axes:",
  "        if not a.images:",
  "            a.yaxis.set_major_formatter(matplotlib.ticker.FuncFormatter(fr))",
  "    contours(fig)",
  "def regler_radar(fig):",
  "    ax = next(a for a in fig.axes if a.name == 'polar')",
  "    bas, haut = ax.get_ylim()",
  "    haut = haut * 1.08",
  "    ax.set_ylim(0, haut)",
  "    for p in ax.patches:",
  "        p.set_alpha(0.06)",
  "    rapport['opacite_remplissage'] = max([p.get_alpha() or 0 for p in ax.patches] or [0])",
  "    angles = list(ax.get_xticks())",
  "    graduations = [v for v in ax.get_yticks() if 0 < v <= haut + 1e-9]",
  "    ax.set_xticklabels([])",
  "    ax.set_yticklabels([])",
  "    centre = ax.transData.transform((0, 0))",
  "    libelles = []",
  "    for a, nom in zip(angles, d['categories']):",
  "        bord = ax.transData.transform((a, haut))",
  "        dx, dy = bord[0] - centre[0], bord[1] - centre[1]",
  "        n = math.hypot(dx, dy) or 1",
  "        dx, dy = dx / n, dy / n",
  "        ha = 'left' if dx > 0.2 else 'right' if dx < -0.2 else 'center'",
  "        va = 'bottom' if dy > 0.2 else 'top' if dy < -0.2 else 'center'",
  "        t = ax.annotate(nom, xy=(a, haut), xytext=(0, 0), textcoords='offset points',",
  "                        ha=ha, va=va, annotation_clip=False, color=GRIS_FONCE)",
  "        libelles.append((t, a, dx, dy))",
  "    milieu = math.pi / len(angles) if angles else 0",
  "    traces = max([l.get_zorder() for l in ax.lines] + [p.get_zorder() for p in ax.patches] + [2])",
  "    pastilles = [ax.text(milieu, v, fr(v), ha='center', va='center', color=GRIS_FONCE, zorder=traces + 5,",
  "                         bbox=dict(facecolor='white', edgecolor='none', alpha=0.9, pad=1.5)) for v in graduations]",
  "    poignees, noms = ax.get_legend_handles_labels()",
  "    if ax.get_legend():",
  "        ax.get_legend().remove()",
  "    legende = None",
  "    if noms:",
  "        legende = ax.legend(poignees, noms, loc='upper center', bbox_to_anchor=(0.5, -0.1),",
  "                            ncol=min(len(noms), 3), frameon=False)",
  "        rapport['legende'] = 'dessous'",
  "    contours(fig)",
  "    rendu = fig.canvas.get_renderer()",
  "    taille, echelle = 12.0, 1.0",
  "    for _ in range(8):",
  "        marge = taille * 0.6",
  "        for t, a, dx, dy in libelles:",
  "            t.set_fontsize(taille)",
  "            t.xyann = (dx * marge, dy * marge)",
  "        for t in pastilles:",
  "            t.set_fontsize(taille)",
  "        if legende:",
  "            for t in legende.get_texts():",
  "                t.set_fontsize(taille)",
  "        fig.canvas.draw()",
  "        bb = fig.get_tightbbox(rendu)",
  "        echelle = d['cote_pouces'] / (max(bb.width, bb.height) + 0.2)",
  "        voulue = 11.5 / echelle",
  "        if abs(voulue - taille) < 0.05:",
  "            break",
  "        taille = voulue",
  "    fig.canvas.draw()",
  "    centre = ax.transData.transform((0, 0))",
  "    rayon = math.hypot(*(ax.transData.transform((0, haut)) - centre))",
  "    rapport['libelles'] = []",
  "    for t, a, dx, dy in libelles:",
  "        e = t.get_window_extent(rendu)",
  "        px = min(max(centre[0], e.x0), e.x1)",
  "        py = min(max(centre[1], e.y0), e.y1)",
  "        ecart = (math.hypot(px - centre[0], py - centre[1]) - rayon) * 72 / fig.dpi",
  "        rapport['libelles'].append({'texte': t.get_text(), 'ecart': round(ecart, 2)})",
  "    rapport['taille_rendue'] = round(taille * echelle, 2)",
  "    rapport['graduations'] = [t.get_text() for t in pastilles]",
  "    rapport['graduations_sur_pastille'] = sum(1 for t in pastilles if t.get_bbox_patch() is not None)",
  "    rapport['graduations_dessus'] = all(t.get_zorder() > traces for t in pastilles)",
  "enregistrer = matplotlib.figure.Figure.savefig",
  "def avant_enregistrement(self, *args, **kwargs):",
  "    for ax in self.axes:",
  "        for t in list(ax.texts):",
  "            if t.get_text() == 'nan':",
  "                t.remove()",
  "                rapport['nan_retires'] += 1",
  "    if d['type'] == 'radar':",
  "        regler_radar(self)",
  "    else:",
  "        regler_chaleur(self)",
  "    return enregistrer(self, *args, **kwargs)",
  "matplotlib.figure.Figure.savefig = avant_enregistrement",
  "import numpy as np",
  "import cds_charts",
  "if d['type'] == 'radar':",
  "    jeux = [{'label': s['nom'], 'values': s['valeurs']} for s in d['series']]",
  "    cds_charts.generate_radar(d['categories'], jeux, output_path=sortie)",
  "    img = matplotlib.image.imread(sortie)",
  "    h, w = img.shape[:2]",
  "    cote = max(h, w)",
  "    carre = np.ones((cote, cote) + img.shape[2:], dtype=img.dtype)",
  "    y0, x0 = (cote - h) // 2, (cote - w) // 2",
  "    carre[y0:y0 + h, x0:x0 + w] = img",
  "    matplotlib.image.imsave(sortie, carre)",
  "else:",
  "    valeurs = [[math.nan if v is None else v for v in ligne] for ligne in d['valeurs']]",
  "    cds_charts.generate_heatmap(valeurs, d['lignes'], d['colonnes'], output_path=sortie,",
  "                                vmin=d['vmin'], vmax=d['vmax'], cmap=CMAP)",
  "print(json.dumps(rapport))",
  "",
].join("\n");

const estNombre = (v) => typeof v === "number" && Number.isFinite(v);
const premiereLigne = (texte) => String(texte).split("\n").map((l) => l.trim()).filter(Boolean)[0] || "";
const derniereLigne = (texte) => String(texte).split("\n").map((l) => l.trim()).filter(Boolean).pop() || "";
const uriPng = (octets) => "data:image/png;base64," + octets.toString("base64");

// DEPENDANCE_ABSENTE une seule fois par deck pour une même dépendance.
function dependanceAbsente(ctx, cle, message) {
  const deja = (ctx.partage.dependancesAbsentes ||= new Set());
  if (deja.has(cle)) return;
  deja.add(cle);
  ctx.alerter("DEPENDANCE_ABSENTE", message);
}

// ---------------------------------------------------------------------------
// Python : radar et carte de chaleur
// ---------------------------------------------------------------------------

function commandePython() {
  const v = process.env.CDS_PYTHON || "python3";
  return /[\\/]/.test(v) ? path.resolve(v) : v;
}

const FIN_MESSAGE = "radars et cartes de chaleur remplacés par une réserve.";

// Message de DEPENDANCE_ABSENTE propre à la cause d'un échec de execFileSync,
// et `definitif` vrai quand relancer Python ne servirait à rien (absent, trop lent).
function diagnostic(e, python, quoi) {
  if (e.code === "ENOENT") {
    return { definitif: true, message: `Python introuvable (« ${python} ») : installer Python 3, ou pointer CDS_PYTHON vers son exécutable ; ${FIN_MESSAGE}` };
  }
  if (e.code === "ETIMEDOUT") {
    return { definitif: true, message: `Python (« ${python} ») n'a pas tracé le ${quoi} en ${reglages.delaiPython / 1000} s, appel interrompu ; ${FIN_MESSAGE}` };
  }
  const erreur = derniereLigne(e.stderr);
  const module_ = /^ModuleNotFoundError: No module named '([^'.]+)/.exec(erreur);
  if (module_ && ["matplotlib", "numpy"].includes(module_[1])) {
    return { definitif: false, message: `Python (« ${python} ») n'a pas le module ${module_[1]} : installer matplotlib et numpy, ou pointer CDS_PYTHON vers un Python qui les a ; ${FIN_MESSAGE}` };
  }
  if (module_ && module_[1] === "cds_charts") {
    return { definitif: false, message: `Python (« ${python} ») n'a pas pu importer cds_charts depuis le dossier scripts/ de la skill ; ${FIN_MESSAGE}` };
  }
  const cause = erreur || (e.signal ? `processus interrompu (${e.signal})`
    : typeof e.status === "number" ? `code de sortie ${e.status}` : premiereLigne(e.message));
  return { definitif: false, message: `Python (« ${python} ») a échoué en traçant le ${quoi} : ${cause} ; ${FIN_MESSAGE}` };
}

// Trace le PNG par cds_charts.py ; rend { data, dims } ou null (alerte posée).
function tracer(ctx, donnees, quoi) {
  if (ctx.partage.pythonHorsService) return null;
  const scripts = path.resolve(ctx.dossierSkill, "scripts");
  if (!fs.existsSync(path.join(scripts, "cds_charts.py"))) {
    dependanceAbsente(ctx, "cds_charts", `cds_charts.py introuvable dans le dossier scripts/ de la skill ; ${FIN_MESSAGE}`);
    return null;
  }
  const python = commandePython();
  let dossier;
  try {
    dossier = fs.mkdtempSync(path.join(os.tmpdir(), "cds-pptx-"));
  } catch (e) {
    dependanceAbsente(ctx, "temporaire",
      `Dossier temporaire impossible à créer pour l'image de Python (${premiereLigne(e.message)}) ; ${FIN_MESSAGE}`);
    return null;
  }
  const sortie = path.join(dossier, `${donnees.type}.png`);
  try {
    try {
      execFileSync(python, ["-E", "-B", "-c", SCRIPT_PYTHON, scripts, sortie], {
        input: JSON.stringify(donnees), cwd: dossier, timeout: reglages.delaiPython,
        stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
      });
    } catch (e) {
      const { definitif, message } = diagnostic(e, python, quoi);
      if (definitif) ctx.partage.pythonHorsService = true;
      dependanceAbsente(ctx, "python", message);
      return null;
    }
    const dims = g.dimensionsImage(sortie);
    if (!dims) {
      dependanceAbsente(ctx, "python", `Python (« ${python} ») n'a produit aucune image PNG pour le ${quoi} ; ${FIN_MESSAGE}`);
      return null;
    }
    return { data: uriPng(fs.readFileSync(sortie)), dims };
  } finally {
    fs.rmSync(dossier, { recursive: true, force: true });
  }
}

function radar(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  const gr = d.graphique || { categories: [], series: [] };
  const n = gr.categories.length;
  if (n < 3) {
    ctx.alerter("DONNEES_INVALIDES", `Radar : il faut au moins 3 dimensions (une rangée par dimension), la source en a ${n}. Réserve à la place du radar.`);
    return g.reserve(slide, z, "Radar : au moins 3 dimensions", ctx);
  }
  const retirees = gr.series.filter((s) => !s.valeurs.every(estNombre));
  if (retirees.length) {
    const noms = retirees.map((s) => `« ${s.nom} »`).join(", ");
    ctx.alerter("DONNEES_INVALIDES", retirees.length > 1
      ? `Radar : séries ${noms} retirées, une valeur y est vide (un radar ne trace pas de trou).`
      : `Radar : série ${noms} retirée, une valeur y est vide (un radar ne trace pas de trou).`);
  }
  const series = gr.series.filter((s) => !retirees.includes(s));
  if (!series.length) {
    ctx.alerter("DONNEES_INVALIDES", "Radar : aucune série complète à tracer. Réserve à la place du radar.");
    return g.reserve(slide, z, "Radar sans série complète", ctx);
  }
  const cote = Math.min(z.w, z.h);
  const image = tracer(ctx, {
    type: "radar", categories: gr.categories, series: series.map(({ nom, valeurs }) => ({ nom, valeurs })), cote_pouces: cote,
  }, "radar");
  if (!image) return g.reserve(slide, z, "Radar non disponible (voir les alertes)", ctx);
  slide.addImage({
    data: image.data, x: z.x + (z.w - cote) / 2, y: z.y + (z.h - cote) / 2, w: cote, h: cote,
    altText: `Radar : ${gr.categories.join(", ")}`,
  });
}

// Échelle de couleur : 0-10 si toutes les valeurs y tiennent (maturité), sinon min-max.
function echelle(valeurs) {
  const lues = valeurs.flat().filter(estNombre);
  if (!lues.length || lues.every((v) => v >= 0 && v <= 10)) return { vmin: 0, vmax: 10 };
  return { vmin: Math.min(...lues), vmax: Math.max(...lues) };
}

function chaleur(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  const gr = d.graphique || { categories: [], series: [] };
  const valeurs = gr.categories.map((_, i) => gr.series.map((s) => (estNombre(s.valeurs[i]) ? s.valeurs[i] : null)));
  // L'analyseur a déjà alerté sur le tableau absent et les cellules illisibles.
  if (!valeurs.flat().some(estNombre)) return g.reserve(slide, z, "Carte de chaleur sans valeur numérique", ctx);
  const { vmin, vmax } = echelle(valeurs);
  const image = tracer(ctx, {
    type: "chaleur", lignes: gr.categories, colonnes: gr.series.map((s) => s.nom), valeurs, vmin, vmax,
  }, "carte de chaleur");
  if (!image) return g.reserve(slide, z, "Carte de chaleur non disponible (voir les alertes)", ctx);
  slide.addImage({ data: image.data, ...g.contenir(image.dims, z), altText: `Carte de chaleur : ${gr.categories.join(", ")}` });
}

// ---------------------------------------------------------------------------
// Icônes
// ---------------------------------------------------------------------------

const FAMILLES = ["fa", "md", "lu"];
const TAILLE_PNG = 256;
const TAILLES = { titre: { max: 16, min: 12 }, description: { max: 14, min: 10 } };

// Paquets des icônes, ou null (DEPENDANCE_ABSENTE posée).
function chargerIcones(ctx) {
  try {
    return {
      React: paquets.charger("react"),
      serveur: paquets.charger("react-dom/server"),
      sharp: paquets.charger("sharp"),
      familles: FAMILLES.map((f) => paquets.charger(`react-icons/${f}`)),
    };
  } catch (e) {
    dependanceAbsente(ctx, "icones",
      `Icônes non rendues, paquet facultatif absent : ${premiereLigne(e.message)}. Installer les dépendances ` +
      "facultatives du moteur (react, react-dom, react-icons, sharp) ; une réserve à la place de chaque icône.");
    return null;
  }
}

// PNG de l'icône en data URI, ou null si le nom n'est dans aucune famille.
async function pictogramme(nom, p) {
  const famille = p.familles.find((f) => Object.hasOwn(f, nom) && typeof f[nom] === "function");
  if (!famille) return null;
  const bleu = `#${COULEURS.BLEU}`;
  const svg = p.serveur.renderToStaticMarkup(p.React.createElement(famille[nom], { size: TAILLE_PNG, color: bleu }))
    .replace(/currentColor/g, bleu);
  return uriPng(await p.sharp(Buffer.from(svg)).resize(TAILLE_PNG, TAILLE_PNG).png().toBuffer());
}

// Ce qui tient la place de chaque icône : { data } (icône), { monogramme } ou { reserve: légende }.
async function visuels(liste, ctx) {
  const p = chargerIcones(ctx);
  if (!p) return liste.map(() => ({ reserve: "Icône non disponible" }));
  const monogramme = ctx.charte.MONOGRAMMES && ctx.charte.MONOGRAMMES.bleu_jaune;
  const aLaPlace = monogramme ? "le monogramme à sa place" : "une réserve à sa place (pas de monogramme dans la charte de repli)";
  const remplacement = monogramme ? { monogramme } : { reserve: "Icône inconnue" };
  const sortie = [];
  for (const e of liste) {
    let data = null;
    try {
      data = await pictogramme(e.icone, p);
      if (!data) {
        ctx.alerter("ICONE_INCONNUE", `Icône « ${e.icone} » inconnue dans react-icons (${FAMILLES.join(", ")}) : ${aLaPlace}. ` +
          "Écrire le nom exact du composant, casse comprise (par exemple FaShieldAlt).");
      }
    } catch (err) {
      dependanceAbsente(ctx, "conversion",
        `sharp n'a pas converti l'icône « ${e.icone} » en PNG (${premiereLigne(err.message)}) : ${aLaPlace}, ` +
        "de même pour toute autre icône refusée dans ce deck. Réinstaller sharp.");
    }
    sortie.push(data ? { data } : remplacement);
  }
  return sortie;
}

// Colonnes de la grille : 2 x 2 pour quatre, 3 + 2 pour cinq, 3 x 2 pour six ; en deçà, une rangée.
const colonnesPour = (n) => (n <= 3 ? n : n === 4 ? 2 : 3);

const mesurer = (texte, boite, { max, min }, gras) =>
  ajuster(g.sansGras(texte), { largeur: boite.w, hauteur: boite.h, max, min, gras, interligne: INTERLIGNE });

async function icones(pres, d, ctx) {
  const { slide, zone: z } = ctx;
  // L'analyseur a déjà alerté sur la directive sans puce.
  if (!d.icones.length) return g.reserve(slide, z, "Icônes sans contenu", ctx);
  const r = g.borner(d.icones, { min: 4, max: 6, quoi: "Icônes", nom: (e) => e.titre || e.icone });
  if (r.message) ctx.alerter("DONNEES_INVALIDES", r.message);
  const liste = r.liste;

  const n = liste.length;
  const colonnes = colonnesPour(n);
  const rangees = Math.ceil(n / colonnes);
  const ecartX = 0.3;
  const ecartY = 0.25;
  const caseW = (z.w - ecartX * (colonnes - 1)) / colonnes;
  const caseH = (z.h - ecartY * (rangees - 1)) / rangees;
  const cercle = Math.min(1.1, caseH * 0.3);
  const icone = cercle * 0.6;
  const titreH = 0.6;
  const boiteTitre = { w: caseW - 0.3, h: titreH };
  const boiteDescription = { w: caseW - 0.3, h: Math.max(caseH - cercle - titreH - 0.35, 0.3) };

  const mesuresTitres = liste.map((e) => mesurer(e.titre || "", boiteTitre, TAILLES.titre, true));
  const mesuresDescriptions = liste.filter((e) => e.description).map((e) => mesurer(e.description, boiteDescription, TAILLES.description, false));
  const tailleTitre = Math.min(...mesuresTitres.map((m) => m.taille));
  const tailleDescription = Math.min(TAILLES.description.max, ...mesuresDescriptions.map((m) => m.taille));
  const deborde = [...mesuresTitres, ...mesuresDescriptions].some((m) => m.deborde);

  const places = await visuels(liste, ctx);
  liste.forEach((e, i) => {
    const rangee = Math.floor(i / colonnes);
    const dansRangee = Math.min(colonnes, n - rangee * colonnes);
    const decalage = ((colonnes - dansRangee) * (caseW + ecartX)) / 2;
    const x = z.x + decalage + (i % colonnes) * (caseW + ecartX);
    const y = z.y + rangee * (caseH + ecartY);
    const cx = x + caseW / 2;
    const cy = y + 0.1 + cercle / 2;
    const place = places[i];

    if (place.reserve) {
      const w = Math.min(caseW - 0.2, 2.4);
      g.reserve(slide, { x: cx - w / 2, y: cy - cercle / 2, w, h: cercle }, place.reserve, ctx);
    } else {
      slide.addShape("ellipse", {
        x: cx - cercle / 2, y: cy - cercle / 2, w: cercle, h: cercle,
        fill: { color: COULEURS.GRIS_CLAIR }, line: { color: COULEURS.OR, width: 2 },
      });
      if (place.data) {
        slide.addImage({ data: place.data, x: cx - icone / 2, y: cy - icone / 2, w: icone, h: icone, altText: e.titre || e.icone });
      } else {
        const w = cercle * 0.62;
        const h = ctx.charte.hauteurPour(place.monogramme, w);
        slide.addImage({ ...g.sourceImage(place.monogramme), x: cx - w / 2, y: cy - h / 2, w, h, altText: "Comptoir des Signaux" });
      }
    }
    const yTitre = y + 0.1 + cercle + 0.15;
    if (e.titre) {
      slide.addText(g.sansGras(e.titre), {
        x: x + 0.15, y: yTitre, ...boiteTitre, margin: 0,
        fontFace: POLICE, fontSize: tailleTitre, bold: true, color: COULEURS.BLEU, align: "center", valign: "middle",
      });
    }
    if (e.description) {
      slide.addText(g.morceaux(e.description).map((m) => ({ text: m.texte, options: { bold: m.gras } })), {
        x: x + 0.15, y: yTitre + titreH + 0.1, ...boiteDescription, margin: 0,
        fontFace: POLICE, fontSize: tailleDescription, color: COULEURS.GRIS_FONCE, align: "center", valign: "top",
      });
    }
  });
  if (deborde) {
    ctx.alerter("TEXTE_TROP_LONG", `Titre ou description d'icône trop long pour sa case, même à ${TAILLES.titre.min} et ${TAILLES.description.min} pt : raccourcir.`);
  }
}

module.exports = { MOTIFS: { radar, chaleur, icones }, echelle, paquets, reglages, SCRIPT_PYTHON };
