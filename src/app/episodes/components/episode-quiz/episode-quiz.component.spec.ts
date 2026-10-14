import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../testing/axe';
import { sleep } from '../../../../testing/timers';
import { Episode, QuizQuestion } from '../../models';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';
import { EpisodeQuizComponent } from './episode-quiz.component';

const questions: QuizQuestion[] = [
  {
    label: 'Qui a volé le tableau ?',
    answers: ['Le chat', 'Le jardinier', 'Le majordome'],
    correctAnswer: 2,
  },
  {
    label: 'Où était-il caché ?',
    answers: ['Au grenier', 'À la cave'],
    correctAnswer: 0,
  },
];

function createEpisode(quiz = questions): Episode {
  const video = { url: 'https://vimeo.com/1', title: 'Video' };
  return {
    title: 'La disparition',
    titleBackground: { landscape: 'landscape.png', portrait: 'portrait.png' },
    investigation: video,
    pedagogicalConcept: video,
    clues: [{ ...video }, { ...video }],
    resolution: video,
    questions: quiz,
  };
}

/**
 * Advances the fake clock, to be called inside `fakeAsync`, and returns the
 * errors thrown on the way, which `tick()` rethrows one at a time. The RxJS
 * timers of the component are periodic tasks that `flush()` would skip.
 */
function tickErrors(milliseconds: number): string[] {
  const errors: string[] = [];
  for (let advance = milliseconds; ; advance = 0) {
    try {
      tick(advance);
      return errors;
    } catch (error) {
      errors.push(String(error));
    }
  }
}

/** Each error of a timer callback comes out of `tick()` twice. */
function reportedTwice(...errors: string[]): string[] {
  return errors.flatMap((error) => [error, error]);
}

const formNotRendered =
  "TypeError: Cannot read properties of undefined (reading 'nativeElement')";
const noVisibleQuestion =
  "TypeError: Cannot read properties of null (reading 'classList')";

@Component({ template: '<p>Video</p>' })
class VideoStubComponent {}

describe('EpisodeQuizComponent', () => {
  let harness: RouterTestingHarness;
  let episodeService: EpisodeService;
  let audioService: jasmine.SpyObj<AudioService>;

  beforeEach(async () => {
    audioService = jasmine.createSpyObj<AudioService>('AudioService', [
      'playSoundEffect',
    ]);
    audioService.playSoundEffect.and.resolveTo();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: ':episodeNumber',
            children: [
              { path: 'quiz', component: EpisodeQuizComponent },
              { path: 'video', component: VideoStubComponent },
            ],
          },
        ]),
        { provide: AudioService, useValue: audioService },
      ],
    });
    episodeService = TestBed.inject(EpisodeService);
    harness = await RouterTestingHarness.create();
  });

  /** Displays the quiz screen, to be called inside `fakeAsync`. */
  function showQuiz(): void {
    harness.navigateByUrl('/3/quiz');
    tick();
  }

  function url(): string {
    return TestBed.inject(Router).url;
  }

  function host(): HTMLElement {
    return harness.routeNativeElement!;
  }

  function fieldsets(): HTMLFieldSetElement[] {
    return Array.from(host().querySelectorAll('fieldset'));
  }

  function visibleFieldsets(): HTMLFieldSetElement[] {
    return fieldsets().filter((fieldset) => !fieldset.hidden);
  }

  function radios(fieldset: HTMLFieldSetElement): HTMLInputElement[] {
    return Array.from(fieldset.querySelectorAll('input'));
  }

  function validateButton(fieldset: HTMLFieldSetElement): HTMLButtonElement {
    return fieldset.querySelector('button')!;
  }

  function correction(input: HTMLInputElement): HTMLElement {
    return document.getElementById(input.getAttribute('aria-describedby')!)!;
  }

  /** Checks an answer of the visible question and validates it. */
  function answer(answerIndex: number): HTMLInputElement {
    const [fieldset] = visibleFieldsets();
    const input = radios(fieldset)[answerIndex];
    input.click();
    validateButton(fieldset).click();
    harness.detectChanges();
    return input;
  }

  describe('display', () => {
    it('shows one question at a time, with its step', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();

      expect(host().querySelector('form')?.getAttribute('aria-label')).toBe(
        'Quiz',
      );
      expect(
        fieldsets().map((fieldset) => [
          fieldset.querySelector('legend')?.textContent?.trim(),
          fieldset.hidden,
          fieldset.getAttribute('aria-required'),
        ]),
      ).toEqual([
        ['1 / 2 Qui a volé le tableau ?', false, 'true'],
        ['2 / 2 Où était-il caché ?', true, 'true'],
      ]);
    }));

    it('shows the question of the current quiz step', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      episodeService.incrementQuizStep();
      showQuiz();

      expect(visibleFieldsets()).toEqual([fieldsets()[1]]);
    }));

    it('lists the answers as radio buttons with a hidden correction', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();

      const inputs = radios(fieldsets()[0]);
      expect(
        inputs.map((input) => [
          input.type,
          input.name,
          host().querySelector(`label[for="${input.id}"]`)?.textContent?.trim(),
          input.getAttribute('aria-checked'),
          correction(input).textContent?.trim(),
          correction(input).classList.contains('active'),
        ]),
      ).toEqual([
        [
          'radio',
          'question-0',
          'Le chat',
          'false',
          'Mauvaise réponse !',
          false,
        ],
        [
          'radio',
          'question-0',
          'Le jardinier',
          'false',
          'Mauvaise réponse !',
          false,
        ],
        [
          'radio',
          'question-0',
          'Le majordome',
          'false',
          'Bonne réponse !',
          false,
        ],
      ]);
    }));

    it('sets aria-checked to "true" on the checked answer', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);
      const input = radios(fieldsets()[0])[1];

      input.click();
      harness.detectChanges();

      expect(input.getAttribute('aria-checked')).toBe('true');
    }));

    it('sets aria-checked back to "false" on the previously checked answer', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);
      const inputs = radios(fieldsets()[0]);
      inputs[1].click();
      harness.detectChanges();

      inputs[2].click();
      harness.detectChanges();

      expect(inputs.map((input) => input.getAttribute('aria-checked'))).toEqual(
        ['false', 'false', 'true'],
      );
    }));

    it('marks the right answer and its correction as correct', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();

      expect(
        radios(fieldsets()[0]).map((input) => [
          input.classList.contains('correct'),
          correction(input).classList.contains('correct'),
        ]),
      ).toEqual([
        [false, false],
        [false, false],
        [true, true],
      ]);
    }));

    it('slides the question in and focuses its first answer after 100 ms', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      const [first, second] = fieldsets();
      expect(first.classList).toContain('hidden');

      tick(99);
      expect(first.classList).toContain('hidden');
      expect(document.activeElement).not.toBe(radios(first)[0]);

      tick(1);
      expect(first.classList).not.toContain('hidden');
      expect(second.classList).toContain('hidden');
      expect(document.activeElement).toBe(radios(first)[0]);
    }));

    it('links to the lesson and to each clue video', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();

      const nav = host().querySelector('nav')!;
      expect(
        Array.from(nav.querySelectorAll('a'), (link) => [
          link.textContent?.trim(),
          link.getAttribute('aria-label'),
          link.getAttribute('href'),
        ]),
      ).toEqual([
        [
          'Revoir la leçon de Rossinante',
          null,
          '/3/video?videoType=pedagogicalConcept',
        ],
        [
          'Revoir indice 1',
          'Revoir indice 1',
          '/3/video?videoType=clue&clue=0',
        ],
        [
          'Revoir indice 2',
          'Revoir indice 2',
          '/3/video?videoType=clue&clue=1',
        ],
      ]);
    }));

    it('displays the screen background', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();

      expect(host().classList).toContain('screen');
      expect(
        host().style.getPropertyValue('--screen-background-landscape'),
      ).toBe('url("/images/landscape/Ecran_UI.jpg")');
      expect(
        host().style.getPropertyValue('--screen-background-portrait'),
      ).toBe('url("/images/portrait/Ecran_UI.jpg")');
      expect(
        host().style.getPropertyValue('--screen-background-overlay-opacity'),
      ).toBe('0.8');
    }));

    it('has no axe violation', async () => {
      episodeService.setEpisode(createEpisode());
      await harness.navigateByUrl('/3/quiz');
      // Waits out the component's 100 ms timer, after which it reveals the
      // question and focuses its first answer.
      await sleep(100);

      expect(await axeViolations(host())).toEqual([]);
    });
  });

  describe('without a question to show', () => {
    it('renders nothing and throws TypeErrors before the episode is loaded', fakeAsync(() => {
      showQuiz();

      expect(host().children.length).toBe(0);
      // Both the focus and the slide-in timers fail.
      expect(tickErrors(100)).toEqual(
        reportedTwice(formNotRendered, formNotRendered),
      );
    }));

    it('throws a TypeError when the episode has no question', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([]));
      showQuiz();

      expect(fieldsets()).toEqual([]);
      expect(tickErrors(100)).toEqual(reportedTwice(noVisibleQuestion));
    }));

    it('shows no question and throws a TypeError once the quiz is complete', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      episodeService.incrementQuizStep();
      episodeService.incrementQuizStep();
      showQuiz();

      expect(fieldsets().length).toBe(2);
      expect(visibleFieldsets()).toEqual([]);
      expect(host().querySelector('nav')).not.toBeNull();
      expect(tickErrors(100)).toEqual(reportedTwice(noVisibleQuestion));
    }));
  });

  describe('answer validation', () => {
    it('does nothing without a checked answer', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      validateButton(fieldsets()[0]).click();
      tick(2300);

      expect(audioService.playSoundEffect).not.toHaveBeenCalled();
      expect(episodeService.quizStep).toBe(0);
    }));

    it('validates the checked answer on Enter', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);
      const input = radios(fieldsets()[0])[2];
      input.click();

      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
      );

      expect(audioService.playSoundEffect).toHaveBeenCalledOnceWith(
        '/audio/Win 3.mp3',
      );
    }));

    describe('on Enter on the validate button', () => {
      /**
       * Presses Enter on the validate button. A synthetic keydown doesn't
       * activate the button, so this also fires the click that a browser
       * fires when the keydown isn't prevented.
       */
      function pressEnterOnValidate(): void {
        const button = validateButton(fieldsets()[0]);
        button.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
        );
        button.click();
      }

      it('validates a wrong answer twice', fakeAsync(() => {
        episodeService.setEpisode(createEpisode());
        showQuiz();
        tick(100);
        radios(fieldsets()[0])[0].click();

        pressEnterOnValidate();

        expect(audioService.playSoundEffect.calls.allArgs()).toEqual([
          ['/audio/App Negative.mp3'],
          ['/audio/App Negative.mp3'],
        ]);
        tick(2000);
      }));

      it('validates a right answer once, as it locks the question', fakeAsync(() => {
        episodeService.setEpisode(createEpisode());
        showQuiz();
        tick(100);
        radios(fieldsets()[0])[2].click();

        pressEnterOnValidate();

        expect(audioService.playSoundEffect).toHaveBeenCalledOnceWith(
          '/audio/Win 3.mp3',
        );
        tick(2400);
      }));
    });
  });

  describe('a wrong answer', () => {
    it('plays the negative sound and shows its correction for 2 seconds', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      const input = answer(0);

      expect(audioService.playSoundEffect).toHaveBeenCalledOnceWith(
        '/audio/App Negative.mp3',
      );
      expect(input.classList).toContain('active');
      expect(correction(input).classList).toContain('active');

      tick(1999);
      expect(correction(input).classList).toContain('active');

      tick(1);
      expect(correction(input).classList).not.toContain('active');
      expect(input.classList).toContain('active');
    }));

    it('lets the question be answered again', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      answer(0);
      tick(2000);

      expect(fieldsets()[0].disabled).toBeFalse();
      expect(episodeService.quizStep).toBe(0);
      expect(visibleFieldsets()).toEqual([fieldsets()[0]]);

      answer(2);
      expect(fieldsets()[0].disabled).toBeTrue();
    }));
  });

  describe('a right answer', () => {
    it('plays the winning sound, shows its correction and locks the question', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      const input = answer(2);

      expect(audioService.playSoundEffect).toHaveBeenCalledOnceWith(
        '/audio/Win 3.mp3',
      );
      expect(input.classList).toContain('active');
      expect(correction(input).classList).toContain('active');
      expect(fieldsets()[0].disabled).toBeTrue();
    }));

    it('has no axe violation once validated', async () => {
      episodeService.setEpisode(createEpisode());
      await harness.navigateByUrl('/3/quiz');
      // Waits out the component's 100 ms timer, after which it reveals the
      // question and focuses its first answer.
      await sleep(100);

      // axe needs real timers, so the test cannot be `fakeAsync`: the mock
      // clock captures the 2 s slide-out timer instead, keeping the
      // correction shown, and discards it on uninstall rather than letting
      // it fire during a later test.
      jasmine.clock().install();
      try {
        answer(2);
        expect(fieldsets()[0].disabled).toBeTrue();
      } finally {
        jasmine.clock().uninstall();
      }

      expect(await axeViolations(host())).toEqual([]);
    });

    it('slides the question out after 2 seconds, then shows the next one', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);
      const [first, second] = fieldsets();

      answer(2);
      tick(1999);
      expect(first.classList).not.toContain('hiding');

      tick(1);
      expect(first.classList).toContain('hiding');
      expect(episodeService.quizStep).toBe(0);

      tick(300);
      harness.detectChanges();
      expect(first.classList).not.toContain('hiding');
      expect(episodeService.quizStep).toBe(1);
      expect(visibleFieldsets()).toEqual([second]);
      expect(second.classList).toContain('hidden');

      tick(100);
      expect(second.classList).not.toContain('hidden');
      expect(document.activeElement).toBe(radios(second)[0]);
    }));

    it('plays the resolution video after the last question', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      answer(2);
      tick(2300);
      harness.detectChanges();
      tick(100);
      answer(0);
      tick(2300);
      tick();

      expect(episodeService.quizStep).toBe(2);
      expect(url()).toBe('/3/video?videoType=resolution');
      expect(host().textContent).toBe('Video');
    }));

    it('goes on even when the sound cannot be played', fakeAsync(() => {
      audioService.playSoundEffect.and.rejectWith(
        new DOMException('Not allowed', 'NotAllowedError'),
      );
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      answer(2);
      expect(tickErrors(0)).toEqual([
        'Error: Uncaught (in promise): NotAllowedError: Not allowed',
      ]);
      tick(2300);

      expect(episodeService.quizStep).toBe(1);
    }));

    it('stops when the quiz is left before the next question', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      answer(2);
      harness.navigateByUrl('/3/video');
      tick(2300);

      expect(episodeService.quizStep).toBe(0);
    }));
  });

  describe('when the episode is loaded after the quiz is displayed', () => {
    it('focuses the first answer once per episode emission', fakeAsync(() => {
      showQuiz();
      tickErrors(100);

      episodeService.setEpisode(createEpisode());
      harness.detectChanges();
      const [first, second] = fieldsets();
      const focus = spyOn(radios(first)[0], 'focus').and.callThrough();
      tick(100);
      expect(focus).toHaveBeenCalledTimes(1);

      // Each episode emission adds a subscription to the quiz step.
      const secondFocus = spyOn(radios(second)[0], 'focus');
      answer(2);
      tick(2300);
      harness.detectChanges();
      tick(100);
      expect(secondFocus).toHaveBeenCalledTimes(2);
    }));
  });
});
