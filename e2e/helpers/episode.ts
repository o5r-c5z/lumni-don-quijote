import { expect, Locator, Page } from '@playwright/test';
import { EPISODE, EPISODE_NUMBER } from '../doubles/episode';
import { endVideo, expectVideo } from '../doubles/vimeo';

/** Opens the title screen and checks that its link has the focus. */
export async function openTitleScreen(page: Page): Promise<void> {
  await page.goto(`/${EPISODE_NUMBER}`);
  await expect(
    page.getByRole('link', { name: "Accès à l'épisode" }),
  ).toBeFocused();
}

/**
 * Opens the quiz on its first question, the way a player reaches it: by
 * skipping the lesson. Loaded directly, the quiz subscribes twice to its
 * steps and focuses the first answer twice, the second time possibly after
 * the test has moved on.
 */
export async function openQuiz(page: Page): Promise<void> {
  await page.goto(`/${EPISODE_NUMBER}/video?videoType=lesson`);
  await expectVideo(page, EPISODE.lesson.title);
  await page.getByRole('link', { name: 'Passer la vidéo' }).click();
  await expectQuestion(page, 0);
}

/** The question on screen: the only fieldset that is not hidden. */
export function currentQuestion(page: Page): Locator {
  return page.getByRole('radiogroup');
}

/**
 * Checks that the quiz shows the question at `index`, with its step, and
 * focuses its first answer.
 */
export async function expectQuestion(page: Page, index: number): Promise<void> {
  const { questions } = EPISODE;
  await expect(page).toHaveURL(`/${EPISODE_NUMBER}/quiz`);
  await expect(currentQuestion(page)).toHaveAccessibleName(
    `${index + 1} / ${questions.length} ${questions[index].label}`,
  );
  await expect(
    currentQuestion(page).getByRole('radio', {
      name: questions[index].answers[0],
    }),
  ).toBeFocused();
}

/**
 * Checks the answer at `answerIndex` with the arrow keys, from the answer at
 * `fromIndex`, which has the focus, and validates it with Enter.
 */
export async function answerWithKeyboard(
  page: Page,
  questionIndex: number,
  answerIndex: number,
  fromIndex = 0,
): Promise<void> {
  const moves = answerIndex - fromIndex;
  if (moves === 0) {
    await page.keyboard.press('Space');
  }
  for (let i = 0; i < Math.abs(moves); i++) {
    await page.keyboard.press(moves > 0 ? 'ArrowDown' : 'ArrowUp');
  }
  const answer = EPISODE.questions[questionIndex].answers[answerIndex];
  await expect(
    currentQuestion(page).getByRole('radio', { name: answer }),
  ).toBeChecked();
  await page.keyboard.press('Enter');
}

/** The right answer of the question at `questionIndex`. */
export function rightAnswer(questionIndex: number): number {
  return EPISODE.questions[questionIndex].correctAnswer;
}

/** A wrong answer of the question at `questionIndex`. */
export function wrongAnswer(questionIndex: number): number {
  const { answers } = EPISODE.questions[questionIndex];
  return (rightAnswer(questionIndex) + 1) % answers.length;
}

/** The correction shown under the checked answer once validated. */
export function correction(page: Page, text: string): Locator {
  return currentQuestion(page).getByText(text).filter({ visible: true });
}

/** Moves the focus with Tab until `target` has it. */
export async function tabTo(page: Page, target: Locator): Promise<void> {
  for (let i = 0; i < 10; i++) {
    if (
      await target.evaluate((element) => element === document.activeElement)
    ) {
      return;
    }
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

/** Lets the video named `title` play until its end. */
export async function watchVideo(page: Page, title: string): Promise<void> {
  await expectVideo(page, title);
  await endVideo(page);
}

/** Skips the video named `title` with the keyboard. */
export async function skipVideo(page: Page, title: string): Promise<void> {
  await expectVideo(page, title);
  await tabTo(page, page.getByRole('link', { name: 'Passer la vidéo' }));
  await page.keyboard.press('Enter');
}
