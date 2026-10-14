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
      textes de l'application ; restent le README (section 8), les noms de
      fichiers des assets (section 6) et les liens « Revoir indice N »
      (section 4)

## 3. Tests d'accessibilité (axe-core)

Tests déterministes dans Karma : `axe.run()` sur l'élément hôte de chaque
écran ne renvoie aucune violation. Les résultats `incomplete` sont ignorés.
La règle `color-contrast` est désactivée : les contrastes seront vérifiés par
Playwright, dans un vrai navigateur (section 5).

- [x] `axe-core` en devDependency, en version exacte
- [x] Écran titre
- [x] Écran Bravo
- [x] Contrôle audio
- [x] Quiz
- [x] Vidéo, pendant la lecture et à la fin

## 4. Fonctionnalités (TDD)

- [ ] Modèle d'épisode : introduction, leçon, questions avec leur
      vidéo-réponse (`answerVideo`) ; plus d'indices, donc plus de liens
      « Revoir indice N » sur les questions
- [ ] Titre → Introduction → leçon → première question (plus d'accès direct
      au quiz)
- [ ] Bonne réponse → vidéo-réponse → question suivante, ou écran de fin
      après la dernière
- [ ] « Revoir la leçon de Rossinante » depuis les questions
- [ ] Musique selon l'écran : fond sonore sur le titre et l'écran Bravo,
      musique du quiz sur les questions, silence pendant les vidéos
- [ ] Fond `Parchemin_questions.jpg` sur tous les écrans sauf le titre, en
      paysage comme en portrait (il n'existe qu'en paysage)

## 5. Tests e2e (Playwright)

Hors des cycles TDD : ces tests vérifient l'application assemblée dans un
vrai navigateur, une fois les fonctionnalités en place.

- [ ] Parcours complet de l'épisode au clavier
- [ ] Une mauvaise réponse bloque la progression
- [ ] « Revoir la leçon de Rossinante » depuis une question
- [ ] axe sur chaque écran, contrastes compris
- [ ] Lecteur Vimeo et `episode.json` simulés avec `page.route`
- [ ] Commande `npm run e2e`, lancée par la CI

## 6. Assets

- [ ] Fond commun à tous les écrans sauf le titre :
      `public/images/Parchemin_questions.jpg`
- [ ] Fond sonore du titre et de l'écran Bravo :
      `public/audio/Entertainment_FOND_SONORE.mp3`
- [ ] Fond sonore du quiz : `public/audio/Guitar Background Mini_QUIZ.mp3`
- [ ] Sons de réponse conservés : `App Negative.mp3`, `Win 3.mp3`
- [ ] Images et musique de Biggle supprimées (`public/images/` ne contient
      plus que le parchemin, `Dark Comedy Ident - Main.mp3` retiré), dans la
      même PR que le remplacement de leurs références dans `src/` et le
      README, pour que l'app ne charge aucun fichier manquant
- [ ] À recevoir : image de l'écran titre, personnages éventuels

## 7. Données de l'épisode 1

Comme dans Biggle, les contenus des épisodes vivent dans `uploads/`,
gitignoré (`/uploads/` dans `.gitignore`) et servi sous `/uploads` par
`angular.json`. L'image de titre y sera aussi, via `titleBackground`.

- [ ] `uploads/episodes/1/episode.json` avec les liens Vimeo complets
      (`?h=…`, à fournir)
- [ ] Questions du QUIZZ.docx (bonnes réponses : A, B, B)

## 8. Documentation

- [ ] README propre à Don Quijote

## Notes

### Vidéos Vimeo de l'épisode 1

| Vidéo                   | Écran                         |
| ----------------------- | ----------------------------- |
| EPISODE_01_Introduction | après le titre                |
| Rossinante              | leçon, revisitable            |
| Reponse_Q1              | après une bonne réponse à Q1  |
| Reponse_Q2_1            | après une bonne réponse à Q2  |
| Reponse_Q3              | après Q3, puis écran Bravo    |

Les liens complets (avec `?h=…`) restent à fournir.

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
