# Détective Biggle — agent instructions

Angular 19 application (standalone components). See `README.md` for the
repository contents and `ROADMAP.md` for the work in progress. The user-facing
text, `README.md` and `ROADMAP.md` are in French; this file, code, commits and
pull requests are in English.

## Commands

```sh
npm install          # dependencies (npm install <package> to add one)
npm start            # dev server on http://localhost:4200/
npm run build        # production build
npm test             # unit tests in watch mode (Karma + Jasmine, Chrome)
npm run test:ci      # unit tests once, headless Chrome
npm run typecheck    # type check (application code and specs)
```

Before pushing, `npm run typecheck` and `npm run test:ci` must pass. The
GitHub Actions CI runs both on every pull request.

## Tests

- One `*.spec.ts` file next to the file under test
  (`episode.service.ts` → `episode.service.spec.ts`).
- Jasmine for assertions and spies, `TestBed` for services and components.
- Test observable behavior (rendered DOM, navigation, emitted values), not
  implementation details.
- External dependencies (Vimeo player, `Audio`, `fetch`, `LiveAnnouncer`) are
  replaced by test doubles: no test plays a sound or hits the network.

## Test-driven development

Every new feature or bug fix starts with a failing test:

1. **Red** — write a single test for the target behavior and watch it fail
   for the right reason.
2. **Green** — write the minimal implementation that makes it pass.
3. **Refactor** — improve the structure while the suite stays green.

For existing code without tests, first write characterization tests that pin
down the current behavior, then change it.

## Accessibility

The application must stay usable with a keyboard and a screen reader. The
client's accessibility spec is in `ACCESSIBILITY.md`: follow it as written.
It is a client requirement, so never edit it; raise any disagreement with the
user instead.
