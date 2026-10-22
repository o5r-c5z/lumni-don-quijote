import { Page } from '@playwright/test';
import { EPISODE, EPISODE_NUMBER } from './doubles/episode';
import { expectVideo } from './doubles/vimeo';
import { expect, test } from './fixtures';
import { axeViolations } from './helpers/axe';
import {
  answerWithKeyboard,
  correction,
  expectQuestion,
  openQuiz,
  openTitleScreen,
  rightAnswer,
  translation,
  watchVideo,
  wrongAnswer,
} from './helpers/episode';

/**
 * Defects of the application this suite revealed, reported and left to fix
 * on their own: no screen has a `main` landmark, so its content lies outside
 * any landmark, and only the title screen has an `h1`. Every other rule
 * applies. Remove a rule from this list once its defect is fixed.
 */
const KNOWN_DEFECTS = ['landmark-one-main', 'page-has-heading-one', 'region'];

/**
 * The axe violations of the page, apart from the known defects. Pass
 * `pausedClock` when the test has paused the clock of the page.
 */
function violations(page: Page, { pausedClock = false } = {}) {
  return axeViolations(page, { pausedClock, disabledRules: KNOWN_DEFECTS });
}

/** Answers the questions before `index` right, up to that question. */
async function reachQuestion(page: Page, index: number): Promise<void> {
  await openQuiz(page);
  for (let i = 0; i < index; i++) {
    await answerWithKeyboard(page, i, rightAnswer(i));
    await watchVideo(page, EPISODE.questions[i].answerVideo.title);
    await expectQuestion(page, i + 1);
  }
}

/** Stops the timers of the page, so that a correction stays on screen. */
async function pauseTime(page: Page): Promise<void> {
  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 100);
}

/**
 * Validates the answer at `answerIndex` of the first question while the
 * clock is paused, then lets Angular's coalesced change detection, which
 * waits for a timer, update the page: a right answer leaves the question
 * after 2.3 s.
 */
async function answerWhileTimePaused(page: Page, answerIndex: number) {
  await page.clock.install();
  await openQuiz(page);
  await pauseTime(page);
  await answerWithKeyboard(page, 0, answerIndex);
  await page.clock.runFor(100);
}

test.describe('accessibility', () => {
  test('title screen', async ({ page }) => {
    await openTitleScreen(page);
    expect(await violations(page)).toEqual([]);
  });

  test('introduction video', async ({ page }) => {
    await page.goto(`/${EPISODE_NUMBER}/video`);
    await expectVideo(page, EPISODE.introduction.title);
    expect(await violations(page)).toEqual([]);
  });

  test('lesson video', async ({ page }) => {
    await page.goto(`/${EPISODE_NUMBER}/video?videoType=lesson`);
    await expectVideo(page, EPISODE.lesson.title);
    expect(await violations(page)).toEqual([]);
  });

  test('answer video', async ({ page }) => {
    await page.goto(`/${EPISODE_NUMBER}/video?videoType=answer&question=0`);
    await expectVideo(page, EPISODE.questions[0].answerVideo.title);
    expect(await violations(page)).toEqual([]);
  });

  for (const index of EPISODE.questions.keys()) {
    test(`question ${index + 1}`, async ({ page }) => {
      await reachQuestion(page, index);
      expect(await violations(page)).toEqual([]);
    });
  }

  test('question after a wrong answer', async ({ page }) => {
    await answerWhileTimePaused(page, wrongAnswer(0));
    await expect(correction(page, 'Mauvaise réponse !')).toBeVisible();
    await expect(
      correction(page, translation(0, wrongAnswer(0))),
    ).toBeVisible();
    expect(await violations(page, { pausedClock: true })).toEqual([]);
    await expect(correction(page, 'Mauvaise réponse !')).toBeVisible();
  });

  test('question after a right answer', async ({ page }) => {
    await answerWhileTimePaused(page, rightAnswer(0));
    await expect(correction(page, 'Bonne réponse !')).toBeVisible();
    expect(await violations(page, { pausedClock: true })).toEqual([]);
    await expect(correction(page, 'Bonne réponse !')).toBeVisible();
  });

  test('completion screen', async ({ page }) => {
    await page.goto(`/${EPISODE_NUMBER}/completion`);
    await expect(page.getByRole('heading', { name: 'Bravo !' })).toBeVisible();
    expect(await violations(page)).toEqual([]);
  });
});
