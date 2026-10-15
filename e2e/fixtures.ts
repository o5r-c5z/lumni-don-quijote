import { test as base, expect } from '@playwright/test';
import { stubEpisode } from './doubles/episode';
import { stubVimeo } from './doubles/vimeo';

/**
 * The Playwright test, with every external dependency stubbed: episode.json,
 * the Vimeo player, Google Fonts (the fallback font applies), the sound
 * effects and the background images. Any other request leaving the local
 * server is aborted and fails the test, so that no test hits the network.
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
    // Silences the sound effects of the quiz: no test listens to them.
    await page.route('**/audio/**', (route) => route.fulfill({ status: 404 }));
    // Hides the parchment background, so that the contrasts measured on a
    // screenshot are the same whether public/images/ holds it or not.
    await page.route('**/images/**', (route) => route.fulfill({ status: 404 }));
    await stubEpisode(page);
    await stubVimeo(page);
    await use(page);
  },
});

export { expect };
