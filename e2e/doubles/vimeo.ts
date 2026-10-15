import { expect, Page } from '@playwright/test';

/** The iframe the Vimeo player inserts in the video screen. */
export const PLAYER_IFRAME = '#episode-video__player-container iframe';

/**
 * A stand-in for the page that `player.vimeo.com` serves in the iframe. It
 * speaks just enough of the postMessage protocol of `@vimeo/player`: it
 * announces itself `ready`, answers every method call, emits `loaded` at
 * once and `play` or `pause` when asked to, and `ended` when a test calls
 * `endVideo()`. Like the real player, it holds a focusable control: Firefox
 * can keep Tab inside a focused iframe that has none.
 */
function fakePlayerPage(videoId: string): string {
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <title>Lecteur Vimeo factice</title>
  </head>
  <body style="margin: 0; background: #000; color: #fff">
    <p>Lecteur Vimeo factice, vidéo ${videoId}</p>
    <button type="button">Lecture factice</button>
    <script>
      const data = { seconds: 0, percent: 0, duration: 1 };
      const send = (message) => window.parent.postMessage(message, '*');
      const emit = (event, eventData = data) => send({ event, data: eventData });

      window.addEventListener('message', (message) => {
        const { method, value } =
          typeof message.data === 'string' ? JSON.parse(message.data) : message.data;
        if (!method) {
          return;
        }
        send({ method });
        if (method === 'play' || method === 'pause') {
          emit(method);
        }
      });

      window.endVideo = () =>
        emit('ended', { seconds: 1, percent: 1, duration: 1 });

      send({ event: 'ready' });
      emit('loaded', { id: ${Number(videoId)} });
    </script>
  </body>
</html>`;
}

/**
 * Answers the oEmbed request of `@vimeo/player` with an iframe on the fake
 * player page, so that no video is fetched from Vimeo.
 */
export async function stubVimeo(page: Page): Promise<void> {
  await page.route('https://vimeo.com/api/oembed.json?*', (route) => {
    const videoUrl = new URL(route.request().url()).searchParams.get('url');
    const videoId = new URL(videoUrl ?? '').pathname.slice(1);
    return route.fulfill({
      json: {
        type: 'video',
        video_id: Number(videoId),
        html: `<iframe src="https://player.vimeo.com/video/${videoId}" width="640" height="360" frameborder="0" allow="autoplay; fullscreen" title="Vidéo Vimeo factice ${videoId}"></iframe>`,
      },
    });
  });

  await page.route('https://player.vimeo.com/video/*', (route) => {
    const videoId = new URL(route.request().url()).pathname.split('/').pop();
    return route.fulfill({
      contentType: 'text/html',
      body: fakePlayerPage(videoId ?? ''),
    });
  });
}

/**
 * Waits until the video screen plays the video named `title`: the
 * application names the iframe once the player has loaded.
 */
export async function expectVideo(page: Page, title: string): Promise<void> {
  await expect(page.locator(PLAYER_IFRAME)).toHaveAttribute('title', title);
}

/** Makes the fake player report that the video is over. */
export async function endVideo(page: Page): Promise<void> {
  const frame = await (
    await page.locator(PLAYER_IFRAME).elementHandle()
  )?.contentFrame();
  if (!frame) {
    throw new Error('No Vimeo player on the page');
  }
  await frame.waitForFunction(() => 'endVideo' in window);
  await frame.evaluate(() =>
    (window as unknown as { endVideo(): void }).endVideo(),
  );
}
