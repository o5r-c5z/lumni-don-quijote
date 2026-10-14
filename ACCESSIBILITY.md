# Accessibility spec

Client requirements, kept as delivered: do not edit them without the client's
agreement. The wording is the client's; only the layout was turned into
Markdown.

## General requirements

- Respecter les impératifs d’Accessibilité UI :
  - Pas d’information donnée uniquement par un changement de couleur (pour les utilisateurs daltoniens)
  - Taux de contraste minimum de textes, pour chaque état, et dans tous les contextes : 4.5  (pour les utilisateurs déficients visuels)
  - Taux de contraste minimum pour les grands textes/ les éléments graphiques porteur d’information, pour chaque état, et dans tous les contextes : 3 (pour les utilisateurs déficients visuels)
  - Taille minimum des zones interactives :
    - Minimum 48x48px pour les éléments interactifs de premier niveau
    - Minimum 32x32px pour les autres
- Ensuite, il faut assurer le parcours focus et la prise de focus visible sur les éléments interactifs (pour les utilisateurs "sans souris") :
  - Tous les liens, boutons, champs de formulaires doivent être atteignables au clavier dans un ordre cohérent, et leur prise de focus doit être visible et conforme (Minimum 3 + pas uniquement identifié par un changement de couleurs).
  - L'activation clavier de chaque élément interactif doit entraîner une prise de focus cohérente. (=faire apparaître chaque élément dans le cadre du quiz (titre de la question, bouton vrai, bouton faux, réponse..)
- Par ailleurs, tous ces éléments doivent présenter une sémantique pertinente et être structuré de manière cohérente, afin d’être correctement vocalisés par les outils d’assistance et d'en assurer la bonne compréhension par les outils d'assistance.
- Pour les jeux et quiz étant intégrés dans une `<iframe>`, cette balise doit avoir un attribut title pertinent (avec un titre explicite en français, permettant de comprendre ce qui est dans cette `<iframe>`).
- Eviter les jeux à compte à rebours, ou si la mécanique du jeu repose sur un compte à rebours, proposer plusieurs modes de difficultés à l’utilisateur (et pourquoi pas un mode sans compte à rebours)
- Éviter les mécaniques de jeux reposant sur des gestes complexes, comme le drag&drop…. Si nécessaire, proposer une alternative au geste complexe via un bouton d’action simple.

## Implementation rules

### HTML

Form
- Focus should be coherent for the user
- Only interactive elements should take the focus
- Each input must be linked to its corresponding label
- Each input must be linked to its error message via the aria-describedby attribute
- Each part of a form must be grouped in a fieldset with a legend
- If there is a required input in the fieldset, the fieldset should have its aria-required property set to true
- The aria-checked attribute of the checkboxes or radio buttons must be set

Stepper
- Each fieldset within a form should indicate the step (example: "Question 1 out of 3")

Screen readers
- The app must be compatible with tools such as NVDA, VoiceOver and Talkback
- Decorative elements should be ignored by screen readers
- Useful images should have an alt property

### SCSS

- Interactive elements should have an outline with a 3:1 contrast at least

### TypeScript

- When a part of a form is hidden and another part is shown, the focus should be put on the first element of the newly shown part
