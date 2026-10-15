import { EPISODE, EPISODE_NUMBER } from './doubles/episode';
import { expect, test } from './fixtures';
import {
  answerWithKeyboard,
  expectQuestion,
  openQuiz,
  rightAnswer,
  tabTo,
  watchVideo,
} from './helpers/episode';

test.describe('lesson replay', () => {
  test('replays the lesson from a question, then comes back to that question', async ({
    page,
  }) => {
    await openQuiz(page);
    await answerWithKeyboard(page, 0, rightAnswer(0));
    await watchVideo(page, EPISODE.questions[0].answerVideo.title);
    await expectQuestion(page, 1);

    await tabTo(
      page,
      page.getByRole('link', { name: 'Revoir la leçon de Rossinante' }),
    );
    await page.keyboard.press('Enter');

    await expect(page).toHaveURL(`/${EPISODE_NUMBER}/video?videoType=lesson`);
    await watchVideo(page, EPISODE.lesson.title);
    await expectQuestion(page, 1);
  });
});
