# Grammaire de la source cds-pptx

Une source est un fichier Markdown qui se lit dans un bloc-notes. Le moteur la lit ligne à ligne
et rend une diapositive à la charte pour chaque titre `#` ou `##`. Chaque alerte cite le numéro
de la ligne en cause.

Chaque exemple de ce document est un deck complet : le copier dans un fichier `.md`, puis lancer
`node moteur/cds-deck.js deck.md --plan`. Le moteur rend alors le deck en mémoire et donne les
mêmes alertes que la génération (bornes, images, modules libres), avec le plan, sans écrire de
PPTX.
Les exemples courts n'ont pas d'en-tête : ils donnent les seules alertes `META_MANQUANTE` et
`LOGO_CLIENT_ABSENT`.

## Règles communes

- `#` : la première est la couverture, les suivantes ouvrent une section (intercalaire), ou la
  clôture.
- `##` : une diapositive de contenu. `###` n'existe que dans une diapositive de contenu.
- Décompte : chaque `#` et chaque `##` produit une diapositive. Leur total est le N de
  `verifier-livrable.py --slides N`.
- Une directive (`Cartes :`, `Schéma : cycle`…) s'écrit juste sous le `##`, ou sous l'accroche.
  Ailleurs, elle est affichée comme du texte, avec une alerte.
- Juste sous le `##`, une ligne « Mot : texte » d'un ou deux mots est lue comme une directive.
  Pour un texte de cette forme, commencer par une puce.
- Un seul visuel par diapositive : tableau, image, deux colonnes, schéma ou motif d'une
  directive. Le second est ignoré.
- `Accroche :`, `Source :` et `Pied :` valent sur toute diapositive de contenu, et sur elle
  seule. `Notes :` vaut sur toute diapositive, couverture et sections comprises.
- Gras : `**mot**`, avec mesure. Les lignes vides et les filets `---` sont ignorés.

## En-tête

Un bloc YAML facultatif, en tête du fichier, porte les métadonnées du PPTX et le logo du client :

- `titre`, `objet`, `mots_cles`, `categorie`, `commentaires`, `client` ;
- `date`, écrite AAAA-MM-JJ ;
- `logo_client`, chemin de l'image relatif au dossier de la source (PNG ou JPEG) ;
- `cotraitant`, ajouté à l'auteur pour un groupement.

L'auteur, le gestionnaire et l'entreprise sont fixés par le moteur. Sans en-tête, le moteur
alerte sur les métadonnées manquantes et sur l'absence de logo client.

`logo_client` est le logo officiel du destinataire : le lui demander, ou le prendre sur son site
officiel. Ne jamais en dessiner ni en générer un. Pour un deck sans destinataire,
`LOGO_CLIENT_ABSENT` est une alerte attendue, qu'on accepte.

```markdown
---
titre: Mieux accueillir les usagers
objet: Exemple d'en-tête de la grammaire
mots_cles: accueil, usagers, exemple
categorie: Exemple
commentaires: Deck fictif de la documentation
client: Organisme Exemple
date: 2026-11-01
logo_client: logo-exemple.png
---
# Mieux accueillir les usagers
Séminaire de direction
Organisme Exemple

## Ce qui change
- Un accueil unique
- Des horaires élargis
```

## Couverture, section et clôture

Les lignes sous la couverture et sous une section en font le sous-titre. Une section dont la
première ligne est `Clôture :` devient la diapositive de clôture. Le texte de cette ligne est
son message, et les lignes suivantes forment le contact.

```markdown
# Mieux accueillir les usagers
Séminaire de direction
Organisme Exemple, janvier 2027

# Le constat
Ce que disent les usagers

## Les attentes exprimées
- Une réponse rapide
- Un interlocuteur identifié

# Merci
Clôture : Des questions ?
Organisme Exemple, direction générale
contact@example.org
```

## Puces

Sans directive, une diapositive de contenu est une liste. Deux niveaux par retrait de deux espaces
ou plus. Une liste numérotée garde ses numéros. Une ligne sans puce est rendue comme une puce de
premier niveau.

```markdown
# Exemple de puces

## Trois règles simples
- Une idée par puce
  - un détail en sous-puce
- Des phrases courtes
- Le **mot clé** en gras, avec mesure

## La marche à suivre
1. Ouvrir le dossier
2. Vérifier les pièces
3. Répondre sous dix jours
```

## Titre et coupure

Le moteur mesure chaque titre en Open Sans. ` // ` marque la coupure voulue, au bloc de sens. Un
titre qui ne tient pas sur une ligne sans coupure marquée, ou qui laisse un mot seul en dernière
ligne, déclenche une alerte avec une coupure proposée. Le moteur ne coupe jamais à la place de
l'auteur.

```markdown
# Exemple de titre coupé

## Le train accélère, // la voie n'est pas encore posée
- Le titre se coupe après la virgule
```

## Accroche

`Accroche :` place une phrase en gras sous la barre de titre. Elle tient sur une ligne, à 18 pt,
ou à 16 pt en repli ; plus longue, elle déclenche une alerte.

```markdown
# Exemple d'accroche

## Pourquoi mesurer
Accroche : Un service qu'on ne mesure pas se pilote à l'intuition.
- Savoir ce que le service rend
- Repérer tôt ce qui se dégrade
```

## Notes

`Notes :` ouvre les notes de l'orateur. Toutes les lignes suivantes y vont, jusqu'au titre
suivant : les écrire en fin de diapositive. Chaque ligne devient un paragraphe des notes.

```markdown
# Exemple de notes

## Le point d'étape
- Trois chantiers sur quatre sont à l'heure
Notes : Rappeler la date du prochain comité.
Le quatrième chantier attend une décision du bureau.
```

## Source

`Source :` s'affiche en pied de diapositive. Plusieurs lignes se joignent par un point-virgule.
Elle est exigée sur les chiffres clés, les graphiques, le radar et la carte de chaleur : tout
chiffre livré cite son document et sa page.

```markdown
# Exemple de source

## Ce que dit l'enquête
- Les usagers attendent d'abord une réponse rapide
Source : enquête fictive pour l'exemple, page 4
```

## Pied

`Pied :` écrit une ligne en pied de diapositive, en italique gris : une traduction signalée,
l'original d'une citation, une précision de lecture. Avec `Source :`, le pied se place à gauche
et la source à droite. Plusieurs lignes se joignent par un point-virgule. Un pied trop long pour
la marge basse déclenche une alerte.

```markdown
# Exemple de pied

## Ce que disent les agents
- Le tableau de bord sert d'abord en réunion
- Il remplace trois fichiers tenus à la main
Pied : Propos recueillis en atelier, reformulés.
Source : compte rendu fictif de l'atelier, page 2
```

## Deux colonnes

Deux `###` sans directive font une comparaison. Un troisième `###` est ignoré.

```markdown
# Exemple de deux colonnes

## Avant et après
### Aujourd'hui
- Des chiffres dans plusieurs fichiers
- Des retards découverts trop tard
### Demain
- Un tableau de bord unique
- Des alertes avant le retard
```

## Tableau

Un tableau Markdown, sa première rangée en en-tête. Une rangée plus longue que l'en-tête perd ses
cellules en trop.

```markdown
# Exemple de tableau

## Les indicateurs suivis
| Indicateur | Fréquence | Responsable |
|---|---|---|
| Délai de réponse | Mensuelle | Cheffe de service |
| Satisfaction | Trimestrielle | Chargé de qualité |
| Disponibilité | Hebdomadaire | Équipe technique |
```

## Schéma

`Schéma :` suivi du type : `processus` (ou `étapes`), `cycle`, `hiérarchie` (ou `organigramme`),
`chronologie` (ou `frise`, `calendrier`), `logigramme` (ou `arbre de décision`). Une puce par
élément, ses sous-puces en détail. Une phrase sans puce sous le schéma en devient la légende.

### Processus : de 2 à 6 étapes

```markdown
# Exemple de processus

## Le parcours d'une demande
Schéma : processus
- Dépôt
  - en ligne ou au guichet
- Qualification
- Traitement
- Réponse à l'usager
Chaque étape a un responsable nommé.
```

### Cycle : de 3 à 6 étapes

```markdown
# Exemple de cycle

## Le cycle d'amélioration
Schéma : cycle
- Planifier les actions
- Mettre en œuvre
- Mesurer les effets
- Ajuster la feuille de route
Le cycle reprend à chaque trimestre.
```

### Hiérarchie : 3 rangs, 6 colonnes au plus

Les puces font les têtes, les sous-puces le rang suivant, et le troisième rang s'inscrit en liste
sous sa case. Au rang des sous-puces, six colonnes au plus : une par sous-puce, une par puce sans
sous-puce.

```markdown
# Exemple de hiérarchie

## L'organisation du projet
Schéma : hiérarchie
- Comité de pilotage
  - Équipe projet
    - cheffe de projet
    - deux référents métier
  - Groupe des utilisateurs
    - six agents volontaires
  - Appui technique
```

### Chronologie : de 2 à 7 étapes

Chaque puce s'écrit « date : libellé ». Ses sous-puces font le détail de l'étape.

```markdown
# Exemple de chronologie

## Le calendrier de l'année
Schéma : chronologie
- Janvier : lancement
- Mars : premiers essais
  - avec le groupe des utilisateurs
- Juin : bilan d'étape
- Septembre : généralisation
Les dates sont indicatives.
```

### Logigramme : 6 puces au plus sur le chemin principal

Une puce qui commence par `?` est une question, dessinée en losange. Sa sous-puce
« non : action » (ou « oui : action ») est la branche, à droite ; une seule branche par question.

```markdown
# Exemple de logigramme

## Une demande est-elle recevable ?
Schéma : logigramme
- Réception de la demande
- ? Le dossier est-il complet ?
  - non : Demander les pièces manquantes
- Instruction
- ? L'avis est-il favorable ?
  - non : Notifier un refus motivé
- Notification de l'accord
```

## Cartes : de 2 à 4

`Cartes :`, puis un `###` par carte et ses puces. Pour des idées de même rang, côte à côte.

Sans valeur, les cartes tournent sur le bleu, l'or et le gris. Pour un signal (risque, vigilance,
acquis), la directive nomme une couleur par carte, dans l'ordre des `###` : bleu, or, gris, vert,
orange ou rouge. Le liseré prend la couleur ; le titre aussi s'il reste lisible sur le fond
clair, sinon il passe en gris foncé. Un nom inconnu, ou un nombre de couleurs différent du nombre
de cartes, donne une alerte et la rotation par défaut.

```markdown
# Exemple de cartes

## Trois leviers d'action
Cartes :
### Former
- Des ateliers courts, par métier
- Un référent par équipe
### Outiller
- Un espace de travail partagé
- Des modèles prêts à l'emploi
### Mesurer
- Cinq indicateurs, pas plus
- Une revue mensuelle courte
```

```markdown
# Exemple de cartes en couleurs de signal

## Où en sont les chantiers
Cartes : rouge, orange, vert
### En retard
- Le recrutement du référent
### À surveiller
- Le budget de formation
### Acquis
- Le choix de l'outil
```

## Blocs : de 2 à 5

`Blocs :`, puis un `###` par bloc. Pour des couches ou des catégories empilées.

```markdown
# Exemple de blocs

## Les couches du service
Blocs :
### Usages
- Ce que les agents font au quotidien
### Outils
- Les applications et leurs réglages
### Données
- Ce qui est saisi, gardé et partagé
```

## Chiffres clés : de 2 à 4

`Chiffres clés :`, puis une puce « valeur : libellé » par chiffre. `Source :` exigée.

Comme pour les cartes, la directive peut nommer une couleur par chiffre, dans l'ordre des puces
(`Chiffres clés : vert, rouge`). Le texte passe alors en blanc ou en gris foncé, le plus lisible
des deux ; sur le rouge, le libellé passe en gras pour rester lisible.

```markdown
# Exemple de chiffres clés

## Le service en chiffres
Chiffres clés :
- 1 240 : demandes traitées sur l'année
- 4 j : délai moyen de réponse
- 92 % : usagers satisfaits
Source : données fictives pour l'exemple
```

## Graphique : barres, courbes ou secteurs

`Graphique : barres` (ou `courbes`, `secteurs`), puis un tableau : la première colonne porte les
catégories, chaque colonne suivante une série. Le graphique est natif, modifiable dans PowerPoint.
`Source :` exigée.

- Une cellule est un nombre : espaces admis, virgule décimale, « % » final toléré. Toute autre
  cellule reste vide, avec une alerte.
- Au-delà de cinq séries (ou de cinq parts), deux couleurs se répètent : alerte.
- Les valeurs s'affichent sur les barres jusqu'à douze barres en tout.
- Secteurs : une seule série, des valeurs positives.

```markdown
# Exemple de barres et de courbes

## Les demandes par trimestre
Graphique : barres
| Trimestre | 2025 | 2026 |
|---|---|---|
| T1 | 280 | 310 |
| T2 | 300 | 335 |
| T3 | 240 | 290 |
Source : données fictives pour l'exemple

## Le délai moyen de réponse
Graphique : courbes
| Mois | Délai en jours | Objectif |
|---|---|---|
| Janvier | 7,5 | 5 |
| Février | 6,8 | 5 |
| Mars | 6,1 | 5 |
| Avril | 5,2 | 5 |
Source : données fictives pour l'exemple
```

```markdown
# Exemple de secteurs

## La répartition des demandes
Graphique : secteurs
| Nature | Part |
|---|---|
| Accès et comptes | 38 |
| Matériel | 24 |
| Logiciels métier | 22 |
| Formation | 16 |
Source : données fictives pour l'exemple
```

## Radar

`Radar :`, puis un tableau : une rangée par dimension (3 au moins), une colonne par série. Le
radar de maturité compare une situation et une cible. Une série à valeur vide est retirée. Le
tracé demande Python avec matplotlib et numpy (voir SKILL.md, installation) ; sans eux, une
réserve légendée tient la place. `Source :` exigée.

```markdown
# Exemple de radar

## La maturité du service
Radar :
| Dimension | Situation actuelle | Cible à un an |
|---|---|---|
| Gouvernance | 2 | 4 |
| Données | 3 | 4 |
| Compétences | 2 | 3 |
| Outils | 4 | 5 |
| Usages | 1 | 3 |
Source : données fictives pour l'exemple
```

## Carte de chaleur

`Carte de chaleur :`, puis un tableau : les rangées en lignes, les séries en colonnes. L'échelle va
de 0 à 10 quand toutes les valeurs y tiennent, sinon du minimum au maximum. Une case vide reste
blanche. Python est requis, comme pour le radar. `Source :` exigée.

```markdown
# Exemple de carte de chaleur

## L'exposition des métiers
Carte de chaleur :
| Métier | Rédaction | Synthèse | Recherche |
|---|---|---|---|
| Accueil | 6 | 3 | 4 |
| Urbanisme | 7 | 8 | 6 |
| Finances | 4 | 7 | 5 |
Source : données fictives pour l'exemple
```

## Icônes : de 4 à 6

`Icônes :`, puis une puce « NomIcone : Titre : description » par icône. Le nom est celui d'un
composant react-icons des familles `fa`, `md` ou `lu`, casse comprise (`FaShieldAlt`,
`MdSchool`). Un nom inconnu laisse le monogramme à sa place. Sans les paquets facultatifs du
moteur, une réserve légendée remplace chaque icône.

```markdown
# Exemple d'icônes

## Les règles d'usage
Icônes :
- FaShieldAlt : Sécurité : aucune donnée sensible hors des outils validés
- FaUsers : Collectif : les usages se partagent en équipe
- FaBalanceScale : Responsabilité : l'agent reste l'auteur de ce qu'il signe
- FaChartLine : Mesure : chaque usage nouveau a son indicateur
```

## Citation

`Citation :`, puis le texte, sur la même ligne ou dessous, et une ligne `Auteur :`. Une citation
anglaise s'affiche traduite, sans guillemets ; l'original vérifié va en `Pied :`, sa référence et
sa date en `Source :`.

```markdown
# Exemple de citation

## Une parole de terrain
Citation :
Le tableau de bord n'a rien changé à notre travail,
il a changé nos réunions.
Auteur : Une directrice de service (citation fictive)
```

## Prompt

`Prompt :`, l'introduction sur la même ligne ou dessous, puis le prompt dans un bloc de code
délimité par trois accents graves. Les puces écrites après le bloc se placent sous le cadre.

````markdown
# Exemple de prompt

## Le prompt du compte rendu
Prompt : À copier tel quel, puis coller les notes de la réunion.
```
Rôle : tu es secrétaire de séance d'un comité de pilotage.
Tâche : rédige le compte rendu des notes ci-dessous.
Contrainte : n'invente rien ; signale ce qui manque.
```
- Relire avant diffusion
````

## Décodage

`Décodage :`, puis une puce par morceau du prompt. Ses deux premières sous-puces font les colonnes
« Ce qu'il apporte » et « Pour aller plus loin ». Sans sous-puce, le décodage est une liste.

```markdown
# Exemple de décodage

## Ce que fait chaque morceau
Décodage :
- Rôle
  - Cadre le ton et le vocabulaire
  - Essayer un autre rôle
- Tâche
  - Dit ce qu'on attend, en un verbe
  - Préciser le public
- Contrainte
  - Limite les inventions
  - Exiger la mention « à vérifier »
```

## Image

La ligne `![légende](chemin)`, chemin relatif au dossier de la source (PNG ou JPEG). Seule sur la
diapositive, l'image prend toute la place ; avec des puces, elle passe à droite. `Image : gauche`
ou `Image : droite` fixe le côté. Une image introuvable laisse une réserve légendée.

```markdown
# Exemple d'image

## Le poste de travail
Image : gauche
- Un tableau de bord ouvert en permanence
- Trois indicateurs visibles d'un coup d'œil
![Illustration fictive d'un poste de travail](image-exemple.png)

## Le même poste, en grand
![Illustration fictive d'un poste de travail](image-exemple.png)
```

## Diapositive libre

`Diapositive libre :` suivi du chemin d'un module `.js` voisin de la source. C'est la porte de
sortie, pour une composition que nul motif ne porte. Le module exporte une fonction
`(slide, cds) => { … }`, éventuellement asynchrone. `cds` donne :

- `zone` : le rectangle où dessiner, `{ x, y, w, h }` en pouces, sous l'accroche s'il y en a une ;
- `composer(nom, diapo)` : rend un motif du registre (`"puces"`, `"cartes"`…, hors `"libre"`) dans cette zone,
  à attendre par `await` ;
- `diapo`, `meta` (l'en-tête), `dossierSource`, `pres` et `alerter(code, message)` ;
- `charte` (logos, monogrammes, bandeaux), `gabarit` (couleurs, police, tailles), `mesure`,
  `motifs`, `makeShadow` et `hauteurPour`.

La barre de titre, le logo, l'accroche, les notes et les pieds restent posés par le moteur. Le
contenu reste dans la source, le code dans le module.

```markdown
# Exemple de diapositive libre

## Valeur et effort
Diapositive libre : exemple-libre.js
Notes : Matrice dessinée par le module voisin de la source.
```

Un module libre réutilisé dans un troisième deck entre dans la bibliothèque, avec sa directive.

## Codes d'alerte

Chaque alerte s'écrit `ligne N · CODE · message`. Le message dit ce qui manque et comment le
corriger. Les alertes ne bloquent pas la génération : le PPTX est écrit, et le code de sortie
vaut 1.

| Code | Cause | Correction |
|---|---|---|
| `DIRECTIVE_INCONNUE` | Ligne « Mot : texte » juste sous le `##` qui n'est pas une directive, valeur de directive inconnue (graphique, schéma, côté de l'image), clé d'en-tête inconnue | Corriger le nom ou la valeur ; pour du texte, commencer par une puce |
| `VISUEL_EN_DOUBLE` | Second visuel sur une diapositive : tableau, image, colonne, bloc de code | Une diapositive par visuel |
| `DONNEES_INVALIDES` | Forme attendue non suivie : cellule non numérique, colonne manquante, nombre d'éléments hors des bornes, directive sans contenu ou hors de sa place, `##` sans contenu, accroche, source ou pied hors d'une diapositive de contenu, couleur inconnue ou en nombre faux, couleurs sur des blocs, bloc de code hors d'un prompt, date d'en-tête mal écrite, texte avant le premier `#` | Reprendre la forme de l'exemple de la directive |
| `IMAGE_INTROUVABLE` | Image ou logo client absent, ou ni PNG ni JPEG | Corriger le chemin, relatif au dossier de la source, ou convertir l'image |
| `LIBRE_INTROUVABLE` | Module libre absent, export qui n'est pas une fonction, erreur pendant le dessin | Corriger le module d'après le message |
| `ICONE_INCONNUE` | Nom absent des familles `fa`, `md` et `lu` de react-icons | Écrire le nom exact du composant, casse comprise |
| `DEPENDANCE_ABSENTE` | Python, matplotlib, numpy, `scripts/cds_charts.py` ou paquets d'icônes absents ; Python trop lent ; conversion d'une icône refusée par sharp ; charte de l'atelier inutilisable | Installer ce qui manque, régler `CDS_PYTHON` ou `--skill` (SKILL.md) ; Python trop lent : relancer sur un poste moins chargé, ou vérifier que `CDS_PYTHON` désigne le bon interpréteur ; sharp : le réinstaller (`npm install` dans `moteur/`) ; charte de l'atelier : corriger `cds-visuels/charte.js`, que le message cite |
| `META_MANQUANTE` | Clé d'en-tête vide ou absente parmi titre, objet, mots clés, catégorie, commentaires, client, date | Compléter l'en-tête |
| `LOGO_CLIENT_ABSENT` | Pas de `logo_client` dans l'en-tête | Ajouter le logo officiel du destinataire, demandé ou pris sur son site, jamais dessiné ; sans destinataire, l'accepter |
| `SOURCE_MANQUANTE` | Chiffres clés, graphique, radar ou carte de chaleur sans `Source :` | Citer le document et la page |
| `MOTIF_REPETE` | Même motif sur trois diapositives de contenu de suite | Changer la forme d'une des trois |
| `TITRE_A_COUPER` | Titre sur plusieurs lignes sans ` // `, ou segment marqué trop long | Placer ` // ` au bloc de sens, comme proposé, ou raccourcir |
| `TITRE_ORPHELIN` | Dernière ligne du titre réduite à un mot | Déplacer ` // ` |
| `TEXTE_TROP_LONG` | Texte qui ne tient pas même à la taille minimale du motif | Raccourcir, ou répartir sur deux diapositives |
| `TYPO_CADRATIN` | Tiret cadratin dans un texte | Deux points, virgule ou parenthèses |
| `TYPO_NOMMAGE` | Nom de la société précédé de son article, posé en libellé | Écrire « Comptoir des Signaux », sans déterminant |
| `TYPO_QUALIOPI` | Mention d'une certification que la société ne détient pas | La retirer |

---

<!-- SPDX-FileCopyrightText: 2026 Comptoir des Signaux / Pascal Chevallot -->
<!-- SPDX-License-Identifier: CC-BY-SA-4.0 -->

Contenu sous [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.fr). Les exemples
de source sont sous [EUPL 1.2](./LICENSE).
