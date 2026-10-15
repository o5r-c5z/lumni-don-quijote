import { test as base, expect } from '@playwright/test';
import { stubEpisode } from './doubles/episode';
import { stubVimeo } from './doubles/vimeo';

/**
 * The Playwright test, with every external dependency stubbed: episode.json,
 * the Vimeo player and Google Fonts, whose stylesheet the production build
 * inlines (the fallback font applies). Any other request leaving the local server is aborted and fails
 * the test, so that no test hits the network.
 */
export const test = base.extend<{ unexpectedRequests: string[] }>({
  unexpectedRequests: [
    async ({ context, baseURL }, use) => {
      const unexpectedRequests: string[] = [];
      const localOrigin = new URL(baseURL!).origin;
      await context.route('**/*', (route) => {
        const url = route.request().url();
        if (new URL(url).origin === localOrigin) {
          return route.fallback();
        }
        unexpectedRequests.push(url);
        return route.abort('blockedbyclient');
      });

      await use(unexpectedRequests);

      expect(unexpectedRequests, 'requests leaving the local server').toEqual(
        [],
      );
    },
    { auto: true },
  ],

  page: async ({ page }, use) => {
    await page.route('https://fonts.googleapis.com/**', (route) =>
      route.fulfill({ contentType: 'text/css', body: '' }),
    );
    await page.route('https://fonts.gstatic.com/**', (route) =>
      route.fulfill({ status: 404 }),
    );
    // Silences the sound effects of the quiz: no test listens to them.
    await page.route('**/audio/**', (route) => route.fulfill({ status: 404 }));
    await stubEpisode(page);
    await stubVimeo(page);
    await use(page);
  },
});

export { expect };
