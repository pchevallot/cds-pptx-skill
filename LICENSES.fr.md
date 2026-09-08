# Licences du dépôt cds-pptx-skill

> Ce document explique la répartition des licences. Il ne constitue pas un avis juridique.

Ce dépôt distingue **trois natures** de contenu, qui ne relèvent pas du même régime :

1. le **code logiciel** ;
2. les **contenus documentaires et méthodologiques** ;
3. l'**identité visuelle et la marque de Comptoir des Signaux**.

Cette distinction évite deux erreurs symétriques : forcer une licence logicielle sur des contenus éditoriaux, et laisser croire qu'une licence libre posée sur le code emporterait un droit d'usage sur la marque. Elle ne l'emporte pas, et le point 3 le dit explicitement.

> **Note de lecture.** GitHub affiche un libellé de licence unique, déduit du fichier `LICENSE` à la racine : il indiquera « EUPL-1.2 » pour l'ensemble du dépôt. Cette détection automatique ne sait pas lire les régimes multiples. C'est le présent document qui fait foi.

---

## 1. Code logiciel : EUPL 1.2

Le code est publié sous licence **European Union Public Licence 1.2 (EUPL 1.2)**.

**Périmètre :**

- `scripts/cds_charts.py` ;
- `references/set_ooxml_metadata.py` ;
- les extraits de code (JavaScript PptxGenJS, Python matplotlib) contenus dans `SKILL.md`, `pptxgenjs-cds.md` et `dataviz.md`, en tant que code ;
- les fichiers de configuration technique.

**Exclusion expresse :** `scripts/logos_b64.py` **n'est pas** couvert par cette licence. Malgré son extension `.py` et son emplacement dans `scripts/`, ce fichier ne contient pas de code : il contient les logos de Comptoir des Signaux encodés en base64. Il relève intégralement du point 3 ci-dessous.

Texte de référence : [`LICENSE`](./LICENSE).

### Pourquoi EUPL 1.2

L'EUPL 1.2 est la licence libre de l'Union européenne, adaptée aux projets publics et aux logiques de communs numériques. Elle permet la réutilisation, la modification et la redistribution, tout en protégeant la circulation des améliorations distribuées. C'est la licence retenue pour les autres publications de Comptoir des Signaux : la cohérence du portefeuille compte autant que le choix lui-même.

Elle présente ici un second avantage, décisif : **son article 5, clause « Legal Protection », exclut expressément la concession de droits sur les marques**.

> « This Licence does not grant permission to use the trade names, trademarks, service marks, or names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the copyright notice. »

Autrement dit, publier le code sous EUPL 1.2 n'autorise personne à utiliser le nom ni les logos de Comptoir des Signaux. Le point 3 ne fait que rendre visible ce que la licence dit déjà.

---

## 2. Contenus documentaires et méthodologiques : CC BY-SA 4.0

Les contenus rédactionnels, méthodologiques et pédagogiques sont publiés sous licence **Creative Commons Attribution, Partage dans les Mêmes Conditions 4.0 International (CC BY-SA 4.0)**, sauf mention contraire.

**Périmètre :**

- `README.md` ;
- `SKILL.md`, `pptxgenjs-cds.md`, `dataviz.md` en tant que textes, guides et méthodes ;
- `references/brand-guide.md`, **à l'exception** des éléments d'identité visuelle qu'il décrit (voir point 3) : la méthode de mise en page est ouverte, la charte qu'elle applique ne l'est pas ;
- le présent document.

Texte de référence : <https://creativecommons.org/licenses/by-sa/4.0/deed.fr>

### Pourquoi CC BY-SA 4.0

CC BY-SA est adaptée aux textes et aux supports méthodologiques. Elle permet la réutilisation et l'adaptation à condition de citer l'auteur et de partager les versions dérivées dans les mêmes conditions. C'est le régime déjà retenu pour les contenus de `comptoir-des-harnais`.

---

## 3. Identité visuelle et marque : tous droits réservés

**Aucune licence libre n'est accordée sur les éléments suivants.** Ils reposent sur deux fondements distincts, qui n'ont ni la même nature ni la même durée.

| Élément | Fondement | Portée |
|---|---|---|
| Dénomination « COMPTOIR DES SIGNAUX » | Marque verbale française n° **5036143**, classes 38, 41 et 42 | France, jusqu'au 06/03/2034 |
| `assets/logos/`, `assets/monogrammes/`, `assets/bandeaux/`, `scripts/logos_b64.py` | Droit d'auteur sur œuvre graphique | Sans formalité ni échéance courte |

**La marque.** « COMPTOIR DES SIGNAUX » est une marque verbale déposée le 06/03/2024 et enregistrée sans modification le 21/06/2024 (BOPI 2024-25) sous le numéro **5036143**, au nom de COMPTOIR DES SIGNAUX, SAS (Siren 343237459). Étant verbale, elle protège la dénomination en toute typographie. Les classes couvertes sont la 38 (télécommunications), la 41 (éducation, formation, colloques, conférences, congrès) et la 42 (conception, développement, maintenance et location de logiciels, SaaS, conseils en technologies de l'information, analyse et conception de systèmes informatiques). Ces classes recouvrent le domaine même de ce dépôt.

**Portée territoriale.** L'enregistrement produit ses effets en France. Hors de France, la réserve repose sur le droit d'auteur et sur la concurrence déloyale, non sur ce titre.

**Les éléments graphiques.** Logos, monogrammes et bandeaux sont des œuvres graphiques protégées par le droit d'auteur, indépendamment de la marque. `scripts/logos_b64.py` en est une simple transposition en base64 et suit le même régime.

Leur reproduction, leur adaptation, leur intégration dans un document ou un logiciel, et leur usage à titre de marque sont **soumis à autorisation écrite préalable**.

### Ce qui reste permis sans autorisation

Pour éviter toute lecture excessive de la réserve ci-dessus :

- **lire, cloner et forker** le dépôt sur GitHub, dans les conditions des conditions générales de GitHub ;
- **réutiliser le code** sous EUPL 1.2 et **la méthode** sous CC BY-SA 4.0, en y substituant votre propre identité visuelle ;
- **citer** le nom « Comptoir des Signaux » pour désigner l'origine de l'œuvre, ce que l'article 5 de l'EUPL prévoit expressément ;
- **produire des documents** aux couleurs de Comptoir des Signaux dans le cadre d'une mission pour Comptoir des Signaux, ce qui est la finalité même de ce dépôt.

Ce qui n'est pas permis, en clair : reprendre les logos pour habiller vos propres livrables, ou publier un dérivé de ce skill en conservant l'identité visuelle de Comptoir des Signaux.

---

## Polices de caractères

La charte prescrit **Open Sans**, avec Calibri et Carlito en repli. **Aucun fichier de police n'est distribué dans ce dépôt** : seuls les noms sont cités, ce qui n'emporte aucune obligation de licence.

Si un fichier de police venait à être ajouté, sa propre licence s'appliquerait et devrait accompagner le fichier. *Vérifier alors la licence exacte de la version embarquée : Open Sans a été distribuée sous Apache 2.0 puis sous SIL Open Font License 1.1 selon les millésimes.*

---

## Dépendances tierces

Les bibliothèques utilisées restent régies par leurs propres licences, que la présente répartition ne modifie pas : PptxGenJS, matplotlib, NumPy, Pillow. Elles sont **appelées, non redistribuées** par ce dépôt : aucune obligation de redistribution ne pèse donc ici.

---

## Contributions

En contribuant à ce dépôt, vous acceptez que votre contribution soit publiée sous la licence applicable au fichier modifié :

- **EUPL 1.2** pour le code ;
- **CC BY-SA 4.0** pour les contenus documentaires et méthodologiques.

Aucune contribution portant sur les éléments d'identité visuelle n'est acceptée : ils relèvent de la marque, pas du projet.

---

## Attribution

Projet porté par **Comptoir des Signaux / Pascal Chevallot**.

Merci de conserver cette attribution en cas de réutilisation, conformément aux licences applicables.

*Dernière mise à jour : 8 septembre 2026.*
