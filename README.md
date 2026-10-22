# Don Quijote

Application web d'épisodes pédagogiques. Chaque épisode enchaîne des vidéos
(une introduction qui contient la leçon, une vidéo-réponse par question) et
un quiz à choix multiples avec correction immédiate, jusqu'à un écran de fin.
L'interface est en français et conçue pour être utilisable au clavier et avec
un lecteur d'écran. Projet commandé par Lumni, produit par Big Company.

Le projet est dérivé de Détective Biggle (dépôt
`o5r-c5z/lumni-detective-biggle`), dont il a repris le
code, les tests et la CI.

**Année de réalisation : 2026.**

## Déroulé d'un épisode

Un épisode s'ouvre à l'URL `/<n>`, où `<n>` est son numéro (`/1` pour le
premier) :

1. **Titre** — l'image de titre de l'épisode, le lien « Accès à l'épisode »
   (vers l'introduction) et le lien « Accès au quiz de l'épisode », qui
   passe l'introduction. Les deux liens font recommencer le quiz à sa
   première question.
2. **Introduction** — vidéo d'introduction, qui contient la leçon de
   Rossinante ; le quiz la suit directement.
3. **Questions** — une question à la fois, numérotée (« 1 / 3 »). Une fois
   validée, la réponse choisie laisse place, dans sa case et au même
   endroit, à la correction, écrite dans la couleur habituelle du texte :
   seul le fond et la bordure passent au rouge ou au vert. La correction
   rappelle toujours la réponse (« Mauvaise réponse ! « ¿Soy yo español? » »),
   suivie de sa traduction quand la question en fournit une
   (« … signifie « Suis-je espagnol ? » »). Cette
   correction, comme le rouge de la case, reste affichée jusqu'à la
   validation d'une autre réponse, qui fait réapparaître la réponse ; une
   mauvaise réponse ne fait pas avancer : il faut trouver la bonne. Pour
   les lecteurs d'écran, le bouton radio garde la réponse pour nom et
   reçoit la correction pour description (`aria-describedby`). Le verdict,
   et la traduction d'une mauvaise réponse, sont aussi annoncés aux
   lecteurs d'écran, par une
   région live propre au quiz qui reprend la correction affichée (vidée à
   chaque validation puis remplie 100 ms plus tard, comme le fait
   `LiveAnnouncer`, pour qu'un même verdict soit annoncé de nouveau) ; les
   réponses, et la réponse citée dans une traduction, sont marquées comme du
   texte espagnol (`lang="es"`). Après une bonne
   réponse (« Bonne réponse ! « ¿De dónde eres? » », qui rappelle la
   réponse), la vidéo-réponse de la question se lance,
   puis vient la question suivante. Le lien « Revoir la leçon de
   Rossinante » lance la vidéo de la leçon seule, puis ramène au quiz ; il
   reste accessible depuis chaque question.
4. **Bravo** — après la vidéo-réponse de la dernière question, l'écran
   « Bravo ! » propose de retourner au début de l'épisode.

Chaque vidéo peut être passée (« Passer la vidéo ») ; à la fin d'une vidéo,
l'écran suivant s'affiche seul. Le fond sonore accompagne le titre et l'écran
Bravo, une autre musique accompagne les questions, et aucune musique ne joue
pendant les vidéos. Tant que la musique joue, un bouton de son la coupe et la
rétablit ; la touche `M` fait de même, partout sauf dans un champ où l'on
tape du texte (`input` de type `text`, `search`, `email`, `url`, `tel`,
`password` ou `number`, `textarea`, `select`, élément `contenteditable`) :
elle fonctionne donc aussi sur les réponses d'une question, une case à
cocher, un bouton ou un curseur. Avec Ctrl, Alt ou Cmd, elle est ignorée ;
maintenue enfoncée, elle ne bascule le son qu'une fois.

Une URL sans numéro d'épisode, ou un épisode dont l'`episode.json` ne se
charge pas, affiche « Vous devez entrer un numéro d'épisode valide ».

## Contenu

- `src/index.html` — page hôte ; charge la police « Golos Text » (Google Fonts).
- `src/main.ts`, `src/app/app.config.ts` — amorçage Angular (composants standalone, routeur).
- `src/app/app.routes.ts` — routes : `/:episodeNumber` et ses sous-routes `video`, `quiz`, `completion`, sinon écran titre ; les URL hors de la route d'épisode (comme `/`) affichent `not-found`.
- `src/app/episodes/models.ts` — types `Episode`, `Video`, `QuizQuestion`, énum `VideoType` : le format d'`episode.json`.
- `src/styles.scss`, variable `--screen-background` de `.screen` — fond parchemin par défaut des écrans d'épisode ; l'écran titre la surcharge avec l'image `titleBackground` de l'épisode (voir « Données des épisodes »).
- `src/app/episodes/components/episode/` — conteneur d'un épisode ; charge `uploads/episodes/<n>/episode.json` au runtime et choisit la musique selon l'écran.
- `src/app/episodes/components/episode-title-screen/` — écran titre, avec l'image de titre de l'épisode, l'accès à la vidéo d'introduction et l'accès direct au quiz.
- `src/app/episodes/components/episode-video/` — lecteur Vimeo ; enchaînement selon le type de vidéo (introduction ou leçon → quiz, vidéo-réponse → question suivante ou écran Bravo) et lien « Passer la vidéo ».
- `src/app/episodes/components/episode-quiz/` — questions à choix multiples : validation, correction affichée et annoncée jusqu'à la validation d'une autre réponse (avec la traduction d'une mauvaise réponse), effet sonore selon la réponse, vidéo-réponse après une bonne réponse, lien « Revoir la leçon de Rossinante ».
- `src/app/episodes/components/episode-completion/` — écran Bravo et retour au début de l'épisode.
- `src/app/episodes/components/audio-control/` — bouton activer/couper le son (raccourci clavier `M`, sans modificateur, ignoré dans les champs de saisie de texte).
- `src/app/episodes/services/episode.service.ts` — état courant de l'épisode et étape du quiz (`BehaviorSubject`).
- `src/app/episodes/services/audio.service.ts` — musique de fond en boucle, effets sonores ponctuels, volumes séparés.
- `src/app/episodes/services/announcement.service.ts` — annonces aux lecteurs d'écran du lecteur vidéo et du bouton du son, via `LiveAnnouncer` (Angular CDK) ; le quiz a sa propre région live.
- `src/app/shared/components/not-found/` — message « numéro d'épisode valide ».
- `src/styles.scss` — styles globaux, variables CSS (couleurs, ratio d'écran 16/9, fond d'écran), classes `.btn`, `.screen`.
- `src/styles/_reset.scss`, `_a11y.scss`, `_figma.scss` — mixins et fonctions (reset de `fieldset`, contour de focus, conversion des valeurs Figma en `rem`).
- `src/testing/` — utilitaires des tests unitaires (axe-core, minuteries).
- `src/**/*.spec.ts` — tests unitaires (Karma + Jasmine), un spec à côté de chaque fichier testé.
- `e2e/`, `playwright.config.ts` — tests de bout en bout Playwright et leurs doublures (`e2e/doubles/`).
- `public/` — fichiers statiques copiés tels quels : `audio/` (fonds sonores et effets `.mp3`), `images/Parchemin_questions.jpg` (fond de tous les écrans sauf le titre), `favicon.ico`.
- `ACCESSIBILITY.md` — exigences d'accessibilité du client : exigences générales (contrastes, zones interactives, parcours clavier, iframes, mécaniques de jeu) et règles d'implémentation (HTML, SCSS, TS).
- `.github/workflows/ci.yml` — CI GitHub Actions : vérification des types, build de production, tests unitaires et e2e sur chaque pull request et sur `main`.
- `AGENTS.md` — instructions pour les agents de code (en anglais) : commandes, conventions de test, TDD.
- `ROADMAP.md` — feuille de route : travail fait et à faire.
- `angular.json`, `tsconfig*.json`, `.editorconfig`, `.vscode/` — configuration du projet et de l'éditeur.
- `uploads/` — **non versionné** (`.gitignore`) : données des épisodes, voir [Données des épisodes](#données-des-épisodes-uploads).

## Stack technique

- Application monopage Angular 19 (composants standalone, routeur, détection de changement zone.js avec `eventCoalescing`).
- Build et serveur de développement via Angular CLI (`@angular-devkit/build-angular:application`).
- Styles en SCSS ; `normalize.css` ; variables CSS natives ; police « Golos Text » chargée depuis Google Fonts.
- `@vimeo/player` pour la lecture des vidéos (iframes Vimeo, titres et `aria-label` injectés).
- `@angular/cdk` : `LiveAnnouncer` (annonces lecteur d'écran) et utilitaire `cdk-visually-hidden`.
- `@fortawesome/angular-fontawesome` avec `free-solid-svg-icons` (icônes de volume).
- `rxjs` pour la gestion d'état et l'orchestration des transitions (timers, `takeUntilDestroyed`).
- Audio HTML5 (`Audio`) : musique de fond en boucle, effets sonores ponctuels, gestion de l'autoplay bloqué (reprise à la première interaction).
- Données d'épisode chargées en `fetch` JSON au runtime, pas de back-end applicatif.
- Cadrage fixe 16/9.
- Tests unitaires avec Karma + Jasmine, tests d'accessibilité avec axe-core, tests de bout en bout avec Playwright (Chromium, Firefox, WebKit).
- Gestion des dépendances : npm (`package-lock.json`).

## Développement

Prérequis : Node.js et npm (versions compatibles avec Angular 19 / Angular CLI 19 ; la CI utilise Node.js 22). Angular CLI peut être utilisé via `npx` ou `npm run ng`. Les tests unitaires demandent en plus Google Chrome (ou Chromium, désigné par la variable `CHROME_BIN`), les tests e2e les navigateurs de Playwright (`npx playwright install`).

```sh
npm install
npm start            # serveur de développement sur http://localhost:4200/ (épisode 1 : /1)
npm run build        # build de production dans dist/lumni-don-quijote/
npm run watch        # build de développement en watch
npm test             # tests unitaires en watch (Karma/Jasmine, Chrome)
npm run test:ci      # tests unitaires en une passe, Chrome headless
npm run typecheck    # vérification des types (application, specs et tests e2e)
npm run e2e          # tests de bout en bout (Playwright)
npm run ng -- <cmd>  # Angular CLI du projet (ng generate, etc.)
```

`npm start` a besoin du dossier `uploads/` pour afficher un épisode ; les tests et le build n'en ont pas besoin.

### Tests et types

- `npm test` lance Karma en watch dans Chrome : la suite repasse à chaque modification.
- `npm run test:ci` lance la suite une seule fois dans Chrome headless.
- `npm run typecheck` lance `tsc --noEmit` sur `tsconfig.app.json`, `tsconfig.spec.json` puis `e2e/tsconfig.json`, donc vérifie aussi les specs et les tests e2e. Il ne vérifie pas les templates HTML : `ng test` les compile en JIT, sans vérification de types ; `npm run build` et `npm start` (via `ng serve`) les vérifient, car ils compilent en AOT avec `strictTemplates`.
- `npm run e2e` lance les tests de bout en bout Playwright (`e2e/`) dans Chromium, Firefox et WebKit, sur un `ng serve` lancé sur le port 4300 avec la configuration `e2e` : celle de production, sans l'intégration des polices Google Fonts, qui les téléchargerait à la compilation. Pour un seul navigateur : `npm run e2e -- --project=firefox`. En cas d'échec, `npx playwright show-report` ouvre le rapport HTML.
- Avant de pousser, `npm run typecheck`, `npm run test:ci`, `npm run build` et `npm run e2e` doivent passer : la CI GitHub Actions (`.github/workflows/ci.yml`) lance les quatre sur chaque pull request et sur `main`, et joint le rapport Playwright quand les tests e2e échouent. Seul le build vérifie les types des templates.

Chaque fichier testé a son spec à côté de lui (`episode.service.ts` → `episode.service.spec.ts`). Les tests vérifient le comportement observable (DOM rendu, navigation, valeurs émises) et non les détails d'implémentation. Les tests d'accessibilité lancent axe-core sur les écrans titre, question, vidéo et Bravo, et sur le contrôle audio.

Les dépendances externes sont remplacées par des doublures, si bien qu'aucun test ne joue de son ni n'appelle le réseau :

- `fetch` : espionné dans `episode.component.spec.ts`, qui renvoie un épisode factice ou simule un échec ;
- `Audio` : le constructeur est remplacé dans `audio.service.spec.ts` par un élément factice dont `play()`, `pause()` et `load()` sont des espions ;
- `LiveAnnouncer` : remplacé par un espion dans `announcement.service.spec.ts` ;
- Vimeo : dans `episode-video.component.spec.ts`, les méthodes `on()`, `play()` et `destroy()` de `Player` sont espionnées et `XMLHttpRequest` est remplacé par une requête qui ne répond jamais, si bien que le lecteur n'intègre aucune iframe et ne contacte pas Vimeo ;
- les composants reçoivent `AudioService` et `AnnouncementService` sous forme d'espions ; le spec des routes remplace chaque écran par un composant minimal.

### Tests e2e

Les tests Playwright vérifient l'application assemblée, au clavier : le parcours complet de l'épisode, du titre à l'écran Bravo (en regardant chaque vidéo jusqu'au bout, puis en la passant), l'accès direct au quiz depuis l'écran titre, le retour à la première question par les liens de l'écran titre, le blocage sur une mauvaise réponse, sa traduction, son rouge jusqu'à la validation d'une autre réponse et les annonces aux lecteurs d'écran, et « Revoir la leçon de Rossinante » depuis une question. `e2e/accessibility.spec.ts` lance axe-core sur chaque écran ; les contrastes qu'axe ne sait pas évaluer (texte sur image ou dégradé) sont mesurés sur une capture d'écran, contre le pixel de fond le moins favorable. Le contraste du contour de focus n'est pas vérifié.

Aucun test n'appelle le réseau ni ne dépend du dossier `uploads/` ou des assets : `e2e/fixtures.ts` fait échouer tout test dont une requête quitte le serveur local. Avec `page.route`, `episode.json` est remplacé par un épisode factice (`e2e/doubles/episode.ts`), le lecteur Vimeo par une page factice qui imite son protocole `postMessage` (`e2e/doubles/vimeo.ts`), Google Fonts par une feuille vide, et les sons comme les images de `public/images/` par des réponses 404 : les contrastes mesurés ne dépendent pas de la présence du parchemin.

### Développer en TDD

Le TDD est obligatoire : toute nouvelle fonctionnalité et toute correction se développent avec le skill `tdd:feature`, qui enchaîne un cycle rouge/vert/refactorisation par comportement. Chaque cycle commence par un test qui échoue :

1. **Rouge** — écrire un seul test pour le comportement visé et le voir échouer pour la bonne raison.
2. **Vert** — écrire l'implémentation minimale qui le fait passer.
3. **Refactorisation** — améliorer la structure du code, la suite restant verte.

Le code existant est couvert par des tests de caractérisation (sauf l'amorçage, `main.ts` et `app.config.ts`) : ils figent le comportement actuel, défauts compris. Avant de modifier du code encore sans test, écrire d'abord de tels tests. Pour corriger un comportement figé par l'un d'eux, modifier d'abord ce test pour qu'il décrive le comportement attendu, le voir échouer, puis changer le code.

### Données des épisodes (`uploads/`)

Le contenu des épisodes ne fait pas partie du code : chaque épisode est décrit par un fichier `uploads/episodes/<n>/episode.json`, que l'application charge au runtime à cette même URL.

- `uploads/` est **gitignoré** (`/uploads/` dans `.gitignore`) : il faut le fournir pour faire tourner l'application avec `npm start`.
- La configuration `development` d'`angular.json` (celle de `npm start` et `npm run watch`) copie `uploads/` vers `/uploads`. La configuration de production (`npm run build`) ne le copie pas.

Un `episode.json` suit le modèle `Episode` de `src/app/episodes/models.ts` :

| Champ | Contenu |
| --- | --- |
| `title` | titre de l'épisode, lu par les lecteurs d'écran sur l'écran titre |
| `titleBackground` | facultatif : chemin de l'image de titre, une chaîne qui peut contenir un guillemet, un antislash ou un saut de ligne (`\n`) ; absent, vide ou autre chose qu'une chaîne, l'écran titre n'a pas d'image de fond |
| `introduction` | vidéo d'introduction : `{ "url", "title" }` |
| `lesson` | vidéo de la leçon de Rossinante, lancée par « Revoir la leçon de Rossinante » : `{ "url", "title" }` |
| `questions[]` | questions, dans l'ordre de l'épisode |
| `questions[].label` | texte de la question, sans numéro (l'application affiche « 1 / 3 ») |
| `questions[].answers[]` | réponses proposées, sans lettre : `{ "original", "translation" }` |
| `questions[].answers[].original` | texte espagnol de la réponse |
| `questions[].answers[].translation` | facultatif : traduction française de la réponse ; celle d'une mauvaise réponse s'affiche une fois cette réponse validée |
| `questions[].correctAnswer` | indice de la bonne réponse dans `answers`, à partir de 0 |
| `questions[].answerVideo` | vidéo-réponse : `{ "url", "title" }` |

Le `title` de chaque vidéo devient le titre de l'iframe Vimeo, et son `aria-label` précédé de « Vidéo: » ; il figure aussi dans les annonces aux lecteurs d'écran (« Lecture de la vidéo: … », « Fin de la vidéo: … »).

Le `url` de chaque vidéo est le lien complet du lecteur Vimeo, paramètre `h` compris : `https://player.vimeo.com/video/<id>?h=<hash>`.

### Déploiement

Le build de production (`npm run build`, fichiers du site dans `dist/lumni-don-quijote/browser/`) et le dossier `uploads/` sont déposés sur le FTP du serveur de production. Le build ne contenant pas `uploads/`, ce dossier y est déposé à part, de sorte que l'application le trouve sous `/uploads`.

Le versionnement d'`uploads/`, un script de vérification des `episode.json` et la copie d'`uploads/` par la configuration de production ne sont pas encore faits : voir la section 9 de `ROADMAP.md`.

### Notes de configuration

- Fichiers audio référencés en dur depuis `public/audio/` : `Entertainment_FOND_SONORE.mp3` (fond sonore de l'écran titre et de l'écran Bravo), `Guitar Background Mini_QUIZ.mp3` (musique des questions), `Win 3.mp3` (bonne réponse, volume 0,41), `App Negative.mp3` (mauvaise réponse, volume 0,26) ; ces deux volumes ramènent les sons à −23 LUFS, le niveau sonore des vidéos.
- Chemin de sortie du build : `dist/lumni-don-quijote/` ; les fichiers du site sont dans son sous-dossier `browser/`.

## Crédits

- **Commanditaire** — Lumni
- **Production** — Big Company
- **Développement** — Olivier Charvoz

Copyright © 2026 Big Company. Tous droits réservés.
