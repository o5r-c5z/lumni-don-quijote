import { EPISODE, EPISODE_NUMBER } from './doubles/episode';
import { expectVideo } from './doubles/vimeo';
import { expect, test } from './fixtures';
import {
  answerLabel,
  answerWithKeyboard,
  checkWithKeyboard,
  correction,
  currentQuestion,
  liveRegion,
  openQuiz,
  resolvedColor,
  rightAnswer,
  translation,
  wrongAnswer,
} from './helpers/episode';

test.describe('wrong answer', () => {
  test('keeps the player on the question until the right answer', async ({
    page,
  }) => {
    await page.clock.install();
    await openQuiz(page);

    await answerWithKeyboard(page, 0, wrongAnswer(0));
    await expect(correction(page, 'Mauvaise réponse !')).toBeVisible();

    // A right answer would have left the question after 2.3 s.
    await page.clock.runFor(3000);
    await expect(page).toHaveURL(`/${EPISODE_NUMBER}/quiz`);
    await expect(currentQuestion(page)).toHaveAccessibleName(
      `1 / 3 ${EPISODE.questions[0].label}`,
    );

    await answerWithKeyboard(page, 0, rightAnswer(0), wrongAnswer(0));
    await expect(correction(page, 'Bonne réponse !')).toBeVisible();
    await page.clock.runFor(3000);
    await expect(page).toHaveURL(
      `/${EPISODE_NUMBER}/video?videoType=answer&question=0`,
    );
    await expectVideo(page, EPISODE.questions[0].answerVideo.title);
  });

  test('gives the translation of the wrong answer until another answer is validated', async ({
    page,
  }) => {
    const [firstWrong, secondWrong] = [
      ...EPISODE.questions[0].answers.keys(),
    ].filter((index) => index !== rightAnswer(0));
    await page.clock.install();
    await openQuiz(page);

    await answerWithKeyboard(page, 0, firstWrong);
    await expect(correction(page, 'Mauvaise réponse !')).toBeVisible();
    await expect(correction(page, translation(0, firstWrong))).toBeVisible();

    await page.clock.runFor(3000);
    await expect(correction(page, 'Mauvaise réponse !')).toBeVisible();
    await expect(correction(page, translation(0, firstWrong))).toBeVisible();

    await answerWithKeyboard(page, 0, secondWrong, firstWrong);
    await expect(correction(page, translation(0, firstWrong))).toBeHidden();
    await expect(correction(page, translation(0, secondWrong))).toBeVisible();

    await answerWithKeyboard(page, 0, rightAnswer(0), secondWrong);
    await expect(correction(page, translation(0, secondWrong))).toBeHidden();
    await expect(correction(page, 'Mauvaise réponse !')).toBeHidden();
    await expect(correction(page, 'Bonne réponse !')).toBeVisible();
  });

  test('keeps a validated wrong answer red until another answer is validated', async ({
    page,
  }) => {
    const [firstWrong, secondWrong] = [
      ...EPISODE.questions[0].answers.keys(),
    ].filter((index) => index !== rightAnswer(0));
    await openQuiz(page);
    const danger = await resolvedColor(page, '--danger-color');

    await answerWithKeyboard(page, 0, firstWrong);
    await expect(answerLabel(page, 0, firstWrong)).toHaveCSS(
      'border-color',
      danger,
    );

    // Checking another answer, without validating it, keeps the red.
    await checkWithKeyboard(page, 0, secondWrong, firstWrong);
    await expect(answerLabel(page, 0, firstWrong)).toHaveCSS(
      'border-color',
      danger,
    );
    await expect(correction(page, translation(0, firstWrong))).toBeVisible();

    await page.keyboard.press('Enter');
    await expect(answerLabel(page, 0, secondWrong)).toHaveCSS(
      'border-color',
      danger,
    );
    await expect(answerLabel(page, 0, firstWrong)).not.toHaveCSS(
      'border-color',
      danger,
    );
  });

  test('announces the verdict, and the translation of a wrong answer, to screen readers', async ({
    page,
  }) => {
    await openQuiz(page);

    await answerWithKeyboard(page, 0, wrongAnswer(0));
    await expect(liveRegion(page)).toHaveText(
      `Mauvaise réponse ! ${translation(0, wrongAnswer(0))}`,
    );

    await answerWithKeyboard(page, 0, rightAnswer(0), wrongAnswer(0));
    await expect(liveRegion(page)).toHaveText('Bonne réponse !');
  });
});
