# Roadmap — Don Quijote

Dérivé de Détective Biggle (remote `upstream`). Développement en TDD avec le
skill `tdd:feature`.

Enchaînement de l'épisode 1 (« Bigote y bigote ») : Titre → Introduction
(qui contient la leçon) → Q1 → Réponse Q1 → Q2 → Réponse Q2 → Q3 → Réponse
Q3 → Bravo. L'écran titre donne aussi un accès direct au quiz. Une bonne
réponse est obligatoire pour avancer ; une mauvaise réponse affiche sa
traduction française. « Revoir la leçon de Rossinante » reste accessible
depuis les questions.

## 1. Reprise des tests de Biggle

- [x] `git merge upstream/main` une fois la roadmap de Biggle terminée
      (tests, `AGENTS.md`, CI)
- [x] `AGENTS.md` : TDD obligatoire via `tdd:feature`
- [x] Reprise de la PR #21 de Biggle : test vidéo instable corrigé, build
      de production (vérification des templates) dans la CI, specs générés
      par `ng generate`

## 2. Renommage et textes

- [x] Nom du projet dans `package.json`, `package-lock.json` et
      `angular.json` (`outputPath` compris), chemin du build dans le README
- [x] `<title>` de `src/index.html` (`Don Quijote`) et `title` de
      `AppComponent` (`lumni-don-quijote`)
- [x] Plus aucune mention de Biggle, d'Owliver ni d'« enquête » dans les
      textes de l'application ; le README ne cite Détective Biggle que comme
      projet d'origine

## 3. Tests d'accessibilité (axe-core)

Tests déterministes dans Karma : `axe.run()` sur l'élément hôte de chaque
écran ne renvoie aucune violation. Les résultats `incomplete` sont ignorés.
Les contrastes sur fond uni sont vérifiés ici ; sur une image de fond, axe
ne peut pas conclure (`incomplete`) : ils seront vérifiés par Playwright,
dans un vrai navigateur (section 5).

- [x] `axe-core` en devDependency, en version exacte
- [x] Écran titre
- [x] Écran Bravo
- [x] Contrôle audio
- [x] Quiz
- [x] Vidéo, pendant la lecture et à la fin

## 4. Fonctionnalités (TDD)

- [x] Modèle d'épisode : introduction, leçon, questions avec leur
      vidéo-réponse (`answerVideo`) ; plus d'indices, donc plus de liens
      « Revoir indice N » sur les questions
- [x] ~~Titre → Introduction → leçon → première question (plus d'accès
      direct au quiz)~~ : remplacé par les retours sur l'épisode 1, plus bas
- [x] Bonne réponse → vidéo-réponse → question suivante, ou écran de fin
      après la dernière
- [x] « Revoir la leçon de Rossinante » depuis les questions
- [x] Musique selon l'écran : fond sonore sur le titre et l'écran Bravo,
      musique du quiz sur les questions, silence pendant les vidéos
- [x] Fond `Parchemin_questions.jpg` sur tous les écrans sauf le titre
- [x] Écran titre sans image de fond (`none`) tant qu'`episode.json` n'est
      pas chargé, si son chargement échoue, ou si `titleBackground` est vide
      (auparavant `url("undefined")`, qui faisait demander un fichier
      `/undefined`, ou `url("")`)
- [x] Orientation portrait abandonnée : `--screen-background-portrait`
      n'était lu par aucune feuille de style. Le portrait et la notion de
      paysage sont supprimés : `titleBackground` est un simple chemin, et
      `--screen-background-landscape` devient `--screen-background`
- [x] Un `episode.json` sans `titleBackground` affiche l'écran titre sans
      image de fond, au lieu de le faire planter
- [x] La touche `M` (couper/rétablir le son) fonctionne quand le focus est
      sur un bouton radio, donc sur les réponses des questions ; elle reste
      ignorée dans un champ texte, un `textarea` et un `select`
- [x] `episode-quiz.component.scss` tient dans son budget de 4 kB : trois
      déclarations redondantes retirées, sans changer le rendu
- [x] Un `titleBackground` qui n'est pas une chaîne (ancien format objet
      `{ landscape, portrait }`) donne `none`, et non plus
      `url("[object Object]")`
- [x] Le chemin de `titleBackground` est échappé dans `url("…")` : un
      guillemet, un antislash ou un retour à la ligne donnent quand même une
      déclaration valide qui désigne ce fichier
- [x] `titleBackground` est facultatif dans le type `Episode`
      (`titleBackground?: string`), comme le README l'accepte
- [x] La touche `M` n'est ignorée que dans les champs où l'on tape du
      texte (`input` de type text, search, email, url, tel, password et
      number, `textarea`, `select`, élément `contenteditable`) ; elle
      fonctionne partout ailleurs, y compris sur une case à cocher, un bouton
      et un curseur, et le nom de la fonction de garde reflète cette règle
- [x] Raccourci `M` : Ctrl, Alt ou Cmd+M ne coupent plus le son, une touche
      maintenue ne bascule le son qu'une fois, un `keydown` sans `key` ne
      provoque pas d'erreur
- [x] Fond parchemin par défaut : valeur par défaut de `--screen-background`
      sur `.screen` dans `styles.scss`, que l'écran titre surcharge, au lieu
      d'un getter dupliqué dans les écrans quiz, vidéo et Bravo ; le rendu ne
      change pas
- [x] Test de la touche `M` sur une vraie réponse du quiz, et non plus sur
      un bouton radio isolé
- [x] Retours sur l'épisode 1 :
  - [x] L'introduction contient déjà la leçon : sa fin, ou « Passer la
        vidéo », mène directement au quiz
  - [x] Écran titre : « Accès au quiz de l'épisode », après « Accès à
        l'épisode », pour passer l'introduction
  - [x] Une mauvaise réponse donne sa traduction française (« « … » signifie
        « … » »), tirée du champ facultatif `answerTranslations` de la
        question ; jamais pour la bonne réponse
  - [x] La correction d'une mauvaise réponse reste affichée jusqu'à la
        réponse suivante (auparavant 2 s), et ne chevauche pas la réponse
        suivante quand elle tient sur plusieurs lignes
- [x] Suites de la relecture des retours sur l'épisode 1 :
  - [x] Les réponses, et la réponse citée dans une traduction, sont
        marquées comme du texte espagnol (`lang="es"`) ; la traduction
        française ne l'est pas
  - [x] Une mauvaise réponse validée reste en rouge quand on coche une
        autre réponse, jusqu'à la validation de celle-ci
  - [x] Le verdict est annoncé aux lecteurs d'écran (« Bonne réponse ! »,
        « Mauvaise réponse ! » suivi de la traduction de la réponse)
  - [x] « Accès au quiz de l'épisode » mène toujours à la première
        question, et « Accès à l'épisode » fait recommencer l'épisode
        depuis l'introduction, même après un retour à l'écran titre en
        cours de quiz
  - [x] Tests : `tick(2000)` sans effet retirés, la correction est vérifiée
        sur son texte affiché et non plus sur la classe `active`

## 5. Tests e2e (Playwright)

Hors des cycles TDD : ces tests vérifient l'application assemblée dans un
vrai navigateur, une fois les fonctionnalités en place.

- [x] Parcours complet de l'épisode au clavier
- [x] Une mauvaise réponse bloque la progression, et affiche sa traduction
      jusqu'à la réponse suivante
- [x] Accès direct au quiz depuis l'écran titre
- [x] Retour à la première question par les deux liens de l'écran titre,
      après un retour arrière du navigateur en cours de quiz
- [x] Une mauvaise réponse reste en rouge jusqu'à la validation d'une autre
- [x] Annonce du verdict et de la traduction aux lecteurs d'écran
- [x] « Revoir la leçon de Rossinante » depuis une question
- [x] axe sur chaque écran, contrastes compris
- [x] Lecteur Vimeo et `episode.json` simulés avec `page.route`
- [x] Commande `npm run e2e`, lancée par la CI

## 6. Assets

- [x] Fond commun à tous les écrans sauf le titre :
      `public/images/Parchemin_questions.jpg`
- [x] Fond sonore du titre et de l'écran Bravo :
      `public/audio/Entertainment_FOND_SONORE.mp3`
- [x] Fond sonore du quiz : `public/audio/Guitar Background Mini_QUIZ.mp3`
- [x] Sons de réponse conservés : `App Negative.mp3`, `Win 3.mp3`
- [x] Images de Biggle supprimées (`public/images/` ne contient plus que le
      parchemin), dans la même PR que le remplacement de leurs références
      dans `src/` et le README, pour que l'app ne charge aucun fichier
      manquant
- [ ] À recevoir : image de l'écran titre, personnages éventuels

## 7. Données de l'épisode 1

Comme dans Biggle, les contenus des épisodes vivent dans `uploads/`,
gitignoré (`/uploads/` dans `.gitignore`) et servi sous `/uploads` par la
configuration `development` d'`angular.json` (`npm start`) ; le build de
production ne le copie pas. L'image de titre y sera aussi, via `titleBackground`.

- [x] `uploads/episodes/1/episode.json` avec les liens Vimeo complets
      (`https://player.vimeo.com/video/<id>?h=<hash>`)
- [x] Questions du QUIZZ.docx (bonnes réponses : A, B, B), sans le préfixe
      « Question N / » ni les lettres des réponses, que l'application
      n'affiche pas
- [x] Traduction française de chaque réponse (`answerTranslations`)

En attendant l'image de titre (section 6), `titleBackground` vaut `""` :
l'écran titre n'a alors pas d'image de fond.

## 8. Documentation

- [x] README propre à Don Quijote

## 9. Contenu versionné et déploiement

Le jeu est en accès libre sur le site de Lumni : le contenu d'`uploads/` n'a
rien de confidentiel. Le build et `uploads/` sont déposés sur le FTP du
serveur de production.

- [ ] Versionner `uploads/` (le retirer du `.gitignore`) ; les tests
      unitaires et e2e gardent leurs propres données et ne le lisent pas
- [ ] Script de vérification des `episode.json` (champs du modèle `Episode`,
      liens Vimeo complets avec `?h=`, indice de bonne réponse valide,
      fichiers de `titleBackground` existants), lancé dans la CI
- [ ] `uploads/` copié par la configuration de production d'`angular.json`,
      pour que `dist/` soit le seul dossier à déposer sur le FTP

## Notes

### Vidéos Vimeo de l'épisode 1

| Vidéo (nom sur Vimeo)   | Écran                         |
| ----------------------- | ----------------------------- |
| EPISODE_01_Introduction | après le titre                |
| EPISODE_01_Rossinante   | leçon seule, depuis le quiz   |
| EPISODE_01_Reponse_Q1   | après une bonne réponse à Q1  |
| EPISODE_01_Reponse_Q2_1 | après une bonne réponse à Q2  |
| EPISODE_01_Reponse_Q3   | après Q3, puis écran Bravo    |

Le `_1` de `Reponse_Q2_1` vient seulement du nom donné lors de l'upload :
il n'y a qu'une vidéo de réponse par question. Les liens complets (avec
`?h=…`) sont dans `uploads/episodes/1/episode.json`.

### Musique selon l'écran

Idée retenue (écrite puis annulée en attendant le TDD) :
`AudioService.playBackgroundMusic(src)` mémorise la source en cours ; si elle
change, il change de piste et la relance au début, sinon il reprend la piste
en cours. `EpisodeComponent` choisit la musique du quiz
(`Guitar Background Mini_QUIZ.mp3`) sur `/quiz`, le fond sonore
(`Entertainment_FOND_SONORE.mp3`) sur le titre et l'écran Bravo, et ne
fait rien sur `/video`.

### Dépôts

- `origin` : `o5r-c5z/lumni-don-quijote` (public).
- `upstream` : le dépôt de Biggle, `o5r-c5z/lumni-detective-biggle`.
  L'historique est commun :
  `git fetch upstream && git merge upstream/main` récupère les évolutions de
  Biggle, dont ses tests.
