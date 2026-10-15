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

  await expect(page).toHaveURL(`/${EPISODE_NUMBER}/video`);
  await goThroughVideo(page, EPISODE.introduction.title);

  await expect(page).toHaveURL(`/${EPISODE_NUMBER}/video?videoType=lesson`);
  await goThroughVideo(page, EPISODE.lesson.title);

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
});
