import { Page } from '@playwright/test';
import { Episode } from '../../src/app/episodes/models';

/** The episode number the tests open: `/1`. */
export const EPISODE_NUMBER = 1;

/**
 * An obviously fake episode: the real data of episode 1 lives in the
 * untracked `uploads/` folder. The right answers sit at different positions
 * so that the tests follow the data, not a position.
 */
export const EPISODE: Episode = {
  title: 'Épisode factice e2e',
  titleBackground: '/e2e/titre-factice-paysage.jpg',
  introduction: {
    url: 'https://vimeo.com/1',
    title: 'Introduction factice',
  },
  lesson: {
    url: 'https://vimeo.com/2',
    title: 'Leçon factice',
  },
  questions: [
    {
      label: 'Question factice 1 ?',
      answers: ['Réponse A', 'Réponse B', 'Réponse C'],
      correctAnswer: 0,
      answerVideo: {
        url: 'https://vimeo.com/3',
        title: 'Réponse factice 1',
      },
    },
    {
      label: 'Question factice 2 ?',
      answers: ['Réponse A', 'Réponse B', 'Réponse C'],
      correctAnswer: 2,
      answerVideo: {
        url: 'https://vimeo.com/4',
        title: 'Réponse factice 2',
      },
    },
    {
      label: 'Question factice 3 ?',
      answers: ['Réponse A', 'Réponse B', 'Réponse C'],
      correctAnswer: 1,
      answerVideo: {
        url: 'https://vimeo.com/5',
        title: 'Réponse factice 3',
      },
    },
  ],
};

/** Serves {@link EPISODE} as the episode.json of every episode. */
export async function stubEpisode(page: Page): Promise<void> {
  await page.route('**/uploads/episodes/*/episode.json', (route) =>
    route.fulfill({ json: EPISODE }),
  );
}
