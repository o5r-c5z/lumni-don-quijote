# Détective Biggle — enquêtes éducatives

Application web d'épisodes d'enquête à visée pédagogique. Chaque épisode
enchaîne des vidéos (l'enquête menée par le détective Biggle, un cours du
professeur Owliver, des indices), un quiz à choix multiples avec correction
immédiate, puis une vidéo de résolution et un écran de fin. L'interface est
en français et conçue pour être utilisable au clavier et avec un lecteur
d'écran. Projet commandé par Lumni, produit par Big Company.

**Année de réalisation : 2025.**

## Contenu

- `src/index.html` — page hôte ; charge la police « Golos Text » (Google Fonts).
- `src/main.ts`, `src/app/app.config.ts` — amorçage Angular (composants standalone, routeur).
- `src/app/app.routes.ts` — routes : `/:episodeNumber` et ses sous-routes `video`, `quiz`, `completion`, sinon écran-titre ; toute autre URL affiche `not-found`.
- `src/app/episodes/models.ts` — types `Episode`, `Video`, `QuizQuestion`, énum `VideoType`.
- `src/app/episodes/components/episode/` — conteneur d'un épisode ; charge `uploads/episodes/<n>/episode.json` au runtime et pilote la musique de fond.
- `src/app/episodes/components/episode-title-screen/` — écran-titre avec accès à l'épisode ou au quiz.
- `src/app/episodes/components/episode-video/` — lecteur Vimeo ; navigation selon le type de vidéo (enquête, concept pédagogique, indice, résolution).
- `src/app/episodes/components/episode-quiz/` — quiz QCM : validation, correction affichée, effet sonore selon la réponse, passage à la question suivante.
- `src/app/episodes/components/episode-completion/` — écran de fin (« Bravo ! ») et retour au début de l'épisode.
- `src/app/episodes/components/audio-control/` — bouton activer/couper le son (raccourci clavier `M`).
- `src/app/episodes/services/episode.service.ts` — état courant de l'épisode et étape du quiz (`BehaviorSubject`).
- `src/app/episodes/services/audio.service.ts` — musique de fond en boucle, effets sonores ponctuels, volumes séparés.
- `src/app/episodes/services/announcement.service.ts` — annonces aux lecteurs d'écran via `LiveAnnouncer` (Angular CDK).
- `src/app/shared/components/not-found/` — message « numéro d'épisode valide ».
- `src/styles.scss` — styles globaux, variables CSS (couleurs, ratio d'écran 16/9), classes `.btn`, `.screen`.
- `src/styles/_reset.scss`, `_a11y.scss`, `_figma.scss` — mixins et fonctions (reset de `fieldset`, contour de focus, conversion des valeurs Figma en `rem`).
- `public/` — fichiers statiques copiés tels quels : `audio/` (musique et effets `.mp3`), `images/landscape/` et `images/portrait/` (décors), `images/` (personnages Biggle et Owliver), `favicon.ico`.
- `ACCESSIBILITY.md` — exigences d'accessibilité du client : exigences générales (contrastes, zones interactives, parcours clavier, iframes, mécaniques de jeu) et règles d'implémentation (HTML, SCSS, TS).
- `src/**/*.spec.ts` — tests unitaires (Karma + Jasmine), un spec à côté de chaque fichier testé.
- `.github/workflows/ci.yml` — CI GitHub Actions : vérification des types, tests et build de production sur chaque pull request et sur `main`.
- `AGENTS.md` — instructions pour les agents de code (en anglais) : commandes, conventions de test, TDD.
- `ROADMAP.md` — feuille de route de Don Quijote (reprise des tests de Biggle, renommage, fonctionnalités, assets).
- `angular.json`, `tsconfig*.json`, `.editorconfig`, `.vscode/` — configuration du projet et de l'éditeur.
- `uploads/` — **non versionné** (`.gitignore`) ; contient les données des épisodes (`episodes/<n>/episode.json`), servies uniquement en configuration de développement.

## Stack technique

- Application monopage Angular 19 (composants standalone, routeur, détection de changement zone.js avec `eventCoalescing`).
- Build et serveur de développement via Angular CLI (`@angular-devkit/build-angular:application`).
- Styles en SCSS ; `normalize.css` ; variables CSS natives ; police « Golos Text » chargée depuis Google Fonts.
- `@vimeo/player` pour la lecture des vidéos d'épisode (iframes Vimeo, titres et `aria-label` injectés).
- `@angular/cdk` : `LiveAnnouncer` (annonces lecteur d'écran) et utilitaire `cdk-visually-hidden`.
- `@fortawesome/angular-fontawesome` avec `free-solid-svg-icons` (icônes de volume, de redémarrage).
- `rxjs` pour la gestion d'état et l'orchestration des transitions (timers, `takeUntilDestroyed`).
- Audio HTML5 (`Audio`) : musique de fond en boucle, effets sonores ponctuels, gestion de l'autoplay bloqué (reprise à la première interaction).
- Données d'épisode chargées en `fetch` JSON au runtime, pas de back-end applicatif.
- Cadrage fixe 16/9, orientation paysage (la prise en charge du portrait a été retirée).
- Tests unitaires avec Karma + Jasmine : un `*.spec.ts` à côté de chaque fichier testé, que `ng generate` crée par défaut.
- Gestion des dépendances : npm (`package-lock.json`).

## Développement

Prérequis : Node.js et npm (versions compatibles avec Angular 19 / Angular CLI 19). Angular CLI peut être utilisé via `npx` ou installé globalement. Les tests unitaires demandent en plus Google Chrome (ou Chromium, désigné par la variable `CHROME_BIN`).

```sh
npm install
npm start            # serveur de développement sur http://localhost:4200/
npm run build        # build de production dans dist/enquetes-educatives/
npm run watch        # build de développement en watch
npm test             # tests unitaires en watch (Karma/Jasmine, Chrome)
npm run test:ci      # tests unitaires en une passe, Chrome headless
npm run typecheck    # vérification des types (code de l'application et specs)
```

### Tests et types

- `npm test` lance Karma en watch dans Chrome : la suite repasse à chaque modification.
- `npm run test:ci` lance la suite une seule fois dans Chrome headless.
- `npm run typecheck` lance `tsc --noEmit` sur `tsconfig.app.json` puis sur `tsconfig.spec.json`, donc vérifie aussi les specs. Il ne vérifie pas les templates HTML : `ng test` les compile en JIT, sans vérification de types ; `npm run build` et `npm start` (via `ng serve`) les vérifient, car ils compilent en AOT avec `strictTemplates`.
- Avant de pousser, `npm run typecheck`, `npm run test:ci` et `npm run build` doivent passer : la CI GitHub Actions (`.github/workflows/ci.yml`) lance les trois sur chaque pull request et sur `main`. Des trois, seul le build vérifie les types des templates ; il n'a pas besoin du dossier `uploads/`.

Chaque fichier testé a son spec à côté de lui (`episode.service.ts` → `episode.service.spec.ts`). Les tests vérifient le comportement observable (DOM rendu, navigation, valeurs émises) et non les détails d'implémentation.

Les dépendances externes sont remplacées par des doublures, si bien qu'aucun test ne joue de son ni n'appelle le réseau :

- `fetch` : espionné dans `episode.component.spec.ts`, qui renvoie un épisode factice ou simule un échec ;
- `Audio` : le constructeur est remplacé dans `audio.service.spec.ts` par un élément factice dont `play()`, `pause()` et `load()` sont des espions ;
- `LiveAnnouncer` : remplacé par un espion dans `announcement.service.spec.ts` ;
- Vimeo : dans `episode-video.component.spec.ts`, les méthodes `on()`, `play()` et `destroy()` de `Player` sont espionnées et `XMLHttpRequest` est remplacé par une requête qui ne répond jamais, si bien que le lecteur n'intègre aucune iframe et ne contacte pas Vimeo ;
- les composants reçoivent `AudioService` et `AnnouncementService` sous forme d'espions ; le spec des routes remplace chaque écran par un composant minimal.

### Développer en TDD

Le TDD est obligatoire : toute nouvelle fonctionnalité et toute correction se développent avec le skill `tdd:feature`, qui enchaîne un cycle rouge/vert/refactorisation par comportement. Chaque cycle commence par un test qui échoue :

1. **Rouge** — écrire un seul test pour le comportement visé et le voir échouer pour la bonne raison.
2. **Vert** — écrire l'implémentation minimale qui le fait passer.
3. **Refactorisation** — améliorer la structure du code, la suite restant verte.

Le code existant est couvert par des tests de caractérisation (sauf l'amorçage, `main.ts` et `app.config.ts`) : ils figent le comportement actuel, défauts compris. Avant de modifier du code encore sans test, écrire d'abord de tels tests. Pour corriger un comportement figé par l'un d'eux, modifier d'abord ce test pour qu'il décrive le comportement attendu, le voir échouer, puis changer le code. Les issues [#15](https://github.com/o5r-c5z/lumni-detective-biggle/issues/15) (nettoyage sans effet visible) et [#19](https://github.com/o5r-c5z/lumni-detective-biggle/issues/19) (défauts visibles, surtout d'accessibilité) du dépôt de Biggle listent les défauts relevés pendant l'écriture de ces tests et, le cas échéant, le test qui fige chacun d'eux.

### Notes de configuration

- L'application attend les données d'un épisode à l'URL `uploads/episodes/<n>/episode.json` (avec `<n>` le numéro d'épisode dans la route). En configuration `development`, `angular.json` copie le dossier local `uploads/` vers `/uploads`. Ce dossier n'est pas versionné : il faut le fournir pour faire tourner l'application. Un `episode.json` décrit le titre, les images de fond, les vidéos (URL Vimeo) et les questions du quiz — voir `src/app/episodes/models.ts`.
- La configuration de production (`npm run build`) ne copie pas `uploads/` ; l'hébergement doit exposer ce chemin.
- Fichiers audio référencés en dur depuis `public/audio/` : `Dark Comedy Ident - Main.mp3` (musique de fond), `Win 3.mp3` (bonne réponse), `App Negative.mp3` (mauvaise réponse).
- Chemin de sortie du build : `dist/enquetes-educatives/`.

## Crédits

- **Commanditaire** — Lumni
- **Production** — Big Company
- **Développement** — Olivier Charvoz

Copyright © 2025 Big Company. Tous droits réservés.
