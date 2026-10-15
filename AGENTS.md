# Don Quijote — agent instructions

Angular 19 application (standalone components), derived from Détective
Biggle (git remote `upstream`). See `README.md` for the repository contents
and `ROADMAP.md` for the work in progress. The user-facing text, `README.md`
and `ROADMAP.md` are in French; this file, code, commits and pull requests
are in English.

## Commands

```sh
npm install          # dependencies (npm install <package> to add one)
npm start            # dev server on http://localhost:4200/
npm run build        # production build (AOT, type-checks the templates)
npm test             # unit tests in watch mode (Karma + Jasmine, Chrome)
npm run test:ci      # unit tests once, headless Chrome
npm run typecheck    # type check (application code, specs and e2e tests)
npm run e2e          # end-to-end tests (Playwright: Chromium, Firefox, WebKit)
```

Before pushing, `npm run typecheck`, `npm run test:ci`, `npm run build` and
`npm run e2e` must pass. The GitHub Actions CI runs all four on every pull
request and on `main`. Only the build type-checks the templates: `tsc` skips
them and `ng test` compiles them in JIT mode.

## Tests

- One `*.spec.ts` file next to the file under test
  (`episode.service.ts` → `episode.service.spec.ts`).
- Jasmine for assertions and spies, `TestBed` for services and components.
- Test observable behavior (rendered DOM, navigation, emitted values), not
  implementation details.
- External dependencies (Vimeo player, `Audio`, `fetch`, `LiveAnnouncer`) are
  replaced by test doubles: no test plays a sound or hits the network.
- End-to-end tests live in `e2e/`, outside the TDD cycles: they check the
  assembled application with the keyboard and run axe on every screen.
  `page.route` stubs `episode.json`, the Vimeo player and Google Fonts, and
  answers the sounds and the images of `public/` with a 404, so that the
  tests pass whether these assets are there or not; `e2e/fixtures.ts` fails
  any test whose requests leave the local server.

## Test-driven development

TDD is mandatory: develop every new feature or bug fix with the
`tdd:feature` skill, which runs one red/green/refactor cycle per behavior
through the `tdd:red`, `tdd:green` and `tdd:refactor` subagents, on its own
branch and pull request. Never write production code before a failing test
that requires it. Each cycle follows these steps:

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
