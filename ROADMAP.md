# Roadmap — Don Quijote

Dérivé de Détective Biggle (remote `upstream`). Développement en TDD avec le
skill `tdd:feature`.

Enchaînement de l'épisode 1 (« Bigote y bigote ») : Titre → Introduction →
Rossinante (leçon) → Q1 → Réponse Q1 → Q2 → Réponse Q2 → Q3 → Réponse Q3 →
Bravo. Une bonne réponse est obligatoire pour avancer ; « Revoir la leçon de
Rossinante » reste accessible depuis les questions.

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
- [x] Titre → Introduction → leçon → première question (plus d'accès direct
      au quiz)
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

## 5. Tests e2e (Playwright)

Hors des cycles TDD : ces tests vérifient l'application assemblée dans un
vrai navigateur, une fois les fonctionnalités en place.

- [x] Parcours complet de l'épisode au clavier
- [x] Une mauvaise réponse bloque la progression
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
| EPISODE_01_Rossinante   | leçon, revisitable            |
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
