import { TestBed } from '@angular/core/testing';
import { Episode } from '../models';
import { EpisodeService } from './episode.service';

function createEpisode(questionCount: number): Episode {
  return {
    title: 'Episode',
    titleBackground: { landscape: 'landscape.jpg', portrait: 'portrait.jpg' },
    introduction: { url: 'https://vimeo.com/2', title: 'Introduction' },
    lesson: { url: 'https://vimeo.com/3', title: 'Leçon' },
    questions: Array.from({ length: questionCount }, (_, index) => ({
      label: `Question ${index + 1}`,
      answers: ['A', 'B'],
      correctAnswer: 0,
      answerVideo: {
        url: `https://vimeo.com/${10 + index}`,
        title: `Réponse ${index + 1}`,
      },
    })),
  };
}

describe('EpisodeService', () => {
  let service: EpisodeService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EpisodeService);
  });

  describe('current episode', () => {
    it('has no episode initially', () => {
      const emitted: (Episode | undefined)[] = [];
      service.episode$.subscribe((episode) => emitted.push(episode));

      expect(service.getEpisode()).toBeUndefined();
      expect(emitted).toEqual([undefined]);
    });

    it('stores and emits the episode that is set', () => {
      const episode = createEpisode(2);
      const emitted: (Episode | undefined)[] = [];
      service.episode$.subscribe((value) => emitted.push(value));

      service.setEpisode(episode);

      expect(service.getEpisode()).toBe(episode);
      expect(emitted).toEqual([undefined, episode]);
    });

    it('replays the current episode to late subscribers', () => {
      const episode = createEpisode(2);
      service.setEpisode(episode);

      let received: Episode | undefined;
      service.episode$.subscribe((value) => (received = value));

      expect(received).toBe(episode);
    });

    it('keeps the quiz step when another episode is set', () => {
      service.setEpisode(createEpisode(3));
      service.incrementQuizStep();

      service.setEpisode(createEpisode(3));

      expect(service.quizStep).toBe(1);
    });
  });

  describe('quiz steps', () => {
    it('starts at step 0', () => {
      const emitted: number[] = [];
      service.quizStep$.subscribe((step) => emitted.push(step));

      expect(service.quizStep).toBe(0);
      expect(emitted).toEqual([0]);
    });

    it('increments the step and emits each new value', () => {
      const emitted: number[] = [];
      service.quizStep$.subscribe((step) => emitted.push(step));

      service.incrementQuizStep();
      service.incrementQuizStep();

      expect(service.quizStep).toBe(2);
      expect(emitted).toEqual([0, 1, 2]);
    });

    it('increments past the number of questions', () => {
      service.setEpisode(createEpisode(1));

      service.incrementQuizStep();
      service.incrementQuizStep();

      expect(service.quizStep).toBe(2);
    });
  });

  describe('reset', () => {
    it('brings the quiz back to step 0 and emits it', () => {
      service.setEpisode(createEpisode(2));
      service.incrementQuizStep();
      service.incrementQuizStep();
      const emitted: number[] = [];
      service.quizStep$.subscribe((step) => emitted.push(step));

      service.resetQuiz();

      expect(service.quizStep).toBe(0);
      expect(emitted).toEqual([2, 0]);
    });

    it('keeps the current episode', () => {
      const episode = createEpisode(2);
      service.setEpisode(episode);

      service.resetQuiz();

      expect(service.getEpisode()).toBe(episode);
    });
  });
});
