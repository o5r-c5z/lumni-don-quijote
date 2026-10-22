import { Page } from '@playwright/test';
import { EPISODE, EPISODE_NUMBER } from './doubles/episode';
import { expect, test } from './fixtures';
import {
  answerWithKeyboard,
  correction,
  expectQuestion,
  openTitleScreen,
  rightAnswer,
  skipVideo,
  tabTo,
  watchVideo,
} from './helpers/episode';

type GoThroughVideo = (page: Page, title: string) => Promise<void>;

/**
 * Plays the whole episode with the keyboard, from the title screen to the
 * completion screen, going through each video with `goThroughVideo`.
 */
async function playEpisode(page: Page, goThroughVideo: GoThroughVideo) {
  await openTitleScreen(page);
  await page.keyboard.press('Enter');

  // The introduction holds the lesson: the quiz follows it.
  await expect(page).toHaveURL(`/${EPISODE_NUMBER}/video`);
  await goThroughVideo(page, EPISODE.introduction.title);

  for (const [index, question] of EPISODE.questions.entries()) {
    await expectQuestion(page, index);
    await answerWithKeyboard(page, index, rightAnswer(index));
    await expect(correction(page, 'Bonne réponse !')).toBeVisible();

    await expect(page).toHaveURL(
      `/${EPISODE_NUMBER}/video?videoType=answer&question=${index}`,
    );
    await goThroughVideo(page, question.answerVideo.title);
  }

  await expect(page).toHaveURL(`/${EPISODE_NUMBER}/completion`);
  await expect(page.getByRole('heading', { name: 'Bravo !' })).toBeVisible();
  await expect(
    page.getByRole('link', { name: "Retourner au début de l'épisode" }),
  ).toBeFocused();
}

test.describe('episode flow', () => {
  test('goes from the title to the completion screen with the keyboard, watching each video to its end', async ({
    page,
  }) => {
    await playEpisode(page, watchVideo);
  });

  test('goes from the title to the completion screen with the keyboard, skipping each video', async ({
    page,
  }) => {
    await playEpisode(page, skipVideo);
  });

  test('goes from the title screen straight to the quiz with the keyboard', async ({
    page,
  }) => {
    await openTitleScreen(page);
    await page.keyboard.press('Tab');
    await expect(
      page.getByRole('link', { name: "Accès au quiz de l'épisode" }),
    ).toBeFocused();
    await page.keyboard.press('Enter');

    await expectQuestion(page, 0);
  });

  for (const { link, intro } of [
    { link: "Accès au quiz de l'épisode", intro: false },
    { link: "Accès à l'épisode", intro: true },
  ]) {
    test(`restarts the quiz at its first question through « ${link} », after going back to the title screen mid-quiz`, async ({
      page,
    }) => {
      await openTitleScreen(page);
      await tabTo(
        page,
        page.getByRole('link', { name: "Accès au quiz de l'épisode" }),
      );
      await page.keyboard.press('Enter');
      await expectQuestion(page, 0);
      await answerWithKeyboard(page, 0, rightAnswer(0));
      await skipVideo(page, EPISODE.questions[0].answerVideo.title);
      await expectQuestion(page, 1);

      await page.goBack();
      await page.goBack();
      await page.goBack();
      await expect(page).toHaveURL(`/${EPISODE_NUMBER}`);
      await tabTo(page, page.getByRole('link', { name: link }));
      await page.keyboard.press('Enter');

      if (intro) {
        await skipVideo(page, EPISODE.introduction.title);
      }
      await expectQuestion(page, 0);
    });
  }
});
