import { EPISODE } from './doubles/episode';
import { expect, test } from './fixtures';
import { currentQuestion, openQuiz } from './helpers/episode';

test.describe('M shortcut', () => {
  test('mutes the music from a quiz answer without checking it', async ({
    page,
  }) => {
    await openQuiz(page);
    const music = page.locator('#background-music');
    const firstAnswer = currentQuestion(page).getByRole('radio', {
      name: EPISODE.questions[0].answers[0].original,
    });
    await expect(music).toHaveJSProperty('muted', false);

    await page.keyboard.press('m');

    await expect(music).toHaveJSProperty('muted', true);
    await expect(firstAnswer).not.toBeChecked();
    await expect(firstAnswer).toBeFocused();
  });
});
