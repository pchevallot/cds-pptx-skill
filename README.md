# CdS PPTX Skill v3 : moteur déterministe, Comptoir des Signaux

Skill pour Claude Code (et autres outils IA) qui produit des présentations PowerPoint à la charte graphique de **Comptoir des Signaux**.

**v3** : on écrit une source Markdown, un moteur Node (sans IA) la convertit en PPTX. La mise en forme n'est plus générée par le modèle : le résultat est reproductible, les alertes sont signalées par numéro de ligne, et la consommation de tokens tombe à la seule rédaction du contenu. Les seize motifs de la v2 sont conservés (cartes, chiffres clés, schémas, graphiques natifs, radar, carte de chaleur, icônes, citation, prompt, décodage, image, diapositive libre).

## Utilisation

```bash
cd moteur && npm install          # une seule fois (Node 20 ou plus)
node moteur/cds-deck.js source.md --sortie deck.pptx
```

Le format de la source est décrit dans `grammaire.md` (une section par directive) ; `moteur/exemple.md` est un exemple complet de 29 diapositives. Le radar et la carte de chaleur demandent Python avec matplotlib (variable `CDS_PYTHON`).

## Contenu du repository

```
cds-pptx-skill/
├── SKILL.md                     # Point d'entrée (routage, usage du moteur)
├── grammaire.md                 # Grammaire de la source Markdown
├── moteur/                      # Moteur Node (cds-deck.js), essais, exemple
├── dataviz.md                   # Guide matplotlib : radar, carte de chaleur
├── references/
│   ├── brand-guide.md           # Guide de marque complet
│   └── v2-motifs-historiques.md # Guide PptxGenJS de la v2, pour maintenance seulement
├── scripts/                     # cds_charts.py, logos_b64.py
└── assets/                      # logos, monogrammes, bandeaux
```

## Installation (Claude Code)

```bash
git clone https://github.com/pchevallot/cds-pptx-skill.git
cp -r cds-pptx-skill ~/.claude/skills/cds-pptx
cd ~/.claude/skills/cds-pptx/moteur && npm install
```

## Charte graphique : Resume

### Couleurs

| Nom | Hex | Usage |
|-----|-----|-------|
| Bleu CdS | `#1F519B` | Couleur principale (titres, barres, fonds couverture) |
| Or CdS | `#FDC948` | Accents, sous-titres, mise en valeur |
| Blanc | `#FFFFFF` | Texte sur fond bleu, fonds clairs |
| Gris fonce | `#333333` | Texte courant |
| Gris clair | `#F5F5F5` | Fonds secondaires, lignes alternees |

### Typographie

**Open Sans** partout (fallback : Calibri sur Windows, Carlito sur Linux).

## Licence

Ce dépôt est publié sous **licences multiples**, parce qu'il mélange trois natures
de contenu. Le détail figure dans [`LICENSES.fr.md`](./LICENSES.fr.md).

| Nature | Licence | Périmètre |
|---|---|---|
| **Code logiciel** | [EUPL 1.2](./LICENSE) | `moteur/`, `scripts/cds_charts.py`, `references/set_ooxml_metadata.py`, extraits de code des guides |
| **Contenus et méthode** | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr) | `SKILL.md`, `grammaire.md`, `dataviz.md`, `references/brand-guide.md`, `README.md` |
| **Identité visuelle et marque** | **Tous droits réservés** | `assets/`, `scripts/logos_b64.py`, la dénomination « COMPTOIR DES SIGNAUX » |

> **Réserve de marque.** « COMPTOIR DES SIGNAUX » est une marque verbale française
> enregistrée le 21/06/2024 sous le numéro **5036143**, classes 38, 41 et 42, au nom de
> COMPTOIR DES SIGNAUX, SAS. Les logos, monogrammes et bandeaux, y compris leur version
> base64 dans `scripts/logos_b64.py`, sont protégés au titre du droit d'auteur. Vous
> pouvez réutiliser le code et la méthode **en y substituant votre propre identité
> visuelle**. Voir [`assets/LICENCE-MARQUE.md`](./assets/LICENCE-MARQUE.md).

GitHub affiche un libellé de licence unique, déduit du fichier `LICENSE` : il annoncera
« EUPL-1.2 » pour tout le dépôt. Cette détection ne sait pas lire les régimes multiples,
c'est le tableau ci-dessus qui fait foi.

Ce choix est celui déjà retenu pour [`comptoir-des-harnais`](https://github.com/pchevallot/comptoir-des-harnais),
étendu d'un troisième régime que ce dépôt impose : il est fait de marque.

Les dépendances (PptxGenJS, matplotlib, NumPy, Pillow) restent régies par leurs propres
licences. Aucun fichier de police n'est distribué : **Open Sans** est seulement prescrite.
