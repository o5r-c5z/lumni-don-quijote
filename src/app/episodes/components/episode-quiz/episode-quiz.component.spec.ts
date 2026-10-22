import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../testing/axe';
import { sleep, withMockClock } from '../../../../testing/timers';
import { Episode, QuizQuestion } from '../../models';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';
import { EpisodeQuizComponent } from './episode-quiz.component';

const questions: QuizQuestion[] = [
  {
    label: 'Qui a volé le tableau ?',
    answers: ['Le chat', 'Le jardinier', 'Le majordome'],
    correctAnswer: 2,
    answerVideo: { url: 'https://vimeo.com/10', title: 'Réponse 1' },
  },
  {
    label: 'Où était-il caché ?',
    answers: ['Au grenier', 'À la cave'],
    correctAnswer: 0,
    answerVideo: { url: 'https://vimeo.com/11', title: 'Réponse 2' },
  },
];

const translatedQuestion: QuizQuestion = {
  label: 'Comment dit-on « Es-tu espagnol ? » ?',
  answers: ['¿Es él español?', '¿Soy yo español?', '¿Eres tú español?'],
  answerTranslations: [
    'Est-il espagnol ?',
    'Suis-je espagnol ?',
    'Es-tu espagnol ?',
  ],
  correctAnswer: 2,
  answerVideo: { url: 'https://vimeo.com/10', title: 'Réponse 1' },
};

function createEpisode(quiz = questions): Episode {
  return {
    title: 'La disparition',
    titleBackground: 'background.png',
    introduction: { url: 'https://vimeo.com/2', title: 'Introduction' },
    lesson: { url: 'https://vimeo.com/3', title: 'Leçon' },
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

@Component({ template: '<p>Completion</p>' })
class CompletionStubComponent {}

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
              { path: 'completion', component: CompletionStubComponent },
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

  /**
   * Displays the quiz screen and waits out the component's 100 ms timer,
   * after which it reveals the question and focuses its first answer.
   *
   * Relies on real timers: do not call it inside `fakeAsync`.
   */
  async function showRevealedQuiz(): Promise<void> {
    await harness.navigateByUrl('/3/quiz');
    await sleep(100);
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

  /** The text of an answer's correction, whitespace collapsed. */
  function correctionText(input: HTMLInputElement): string | undefined {
    return correction(input).textContent?.replace(/\s+/g, ' ').trim();
  }

  function label(input: HTMLInputElement): HTMLLabelElement {
    return host().querySelector(`label[for="${input.id}"]`)!;
  }

  /** The colour a CSS custom property resolves to inside the quiz. */
  function resolvedColor(customProperty: string): string {
    const probe = document.createElement('span');
    probe.style.color = `var(${customProperty})`;
    host().appendChild(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
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

    it('marks each answer label as Spanish', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([translatedQuestion]));
      showQuiz();

      expect(
        radios(fieldsets()[0]).map((input) =>
          host()
            .querySelector(`label[for="${input.id}"]`)
            ?.getAttribute('lang'),
        ),
      ).toEqual(['es', 'es', 'es']);
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

    it('links only to the lesson of Rossinante', fakeAsync(() => {
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
          '/3/video?videoType=lesson',
        ],
      ]);
    }));

    it('displays the parchment as a background', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();

      expect(host().classList).toContain('screen');
      expect(getComputedStyle(host(), '::before').backgroundImage).toMatch(
        /^url\("[^"]*\/images\/Parchemin_questions\.jpg"\)$/,
      );
      expect(
        host().style.getPropertyValue('--screen-background-overlay-opacity'),
      ).toBe('0.8');
    }));

    it('has no axe violation', async () => {
      episodeService.setEpisode(createEpisode());
      await showRevealedQuiz();

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
  });

  describe('once every question is answered', () => {
    it('goes to the completion screen', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      episodeService.incrementQuizStep();
      episodeService.incrementQuizStep();

      showQuiz();

      expect(url()).toBe('/3/completion');
      expect(host().textContent).toBe('Completion');
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
    it('plays the negative sound and keeps its correction shown', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      const input = answer(0);

      expect(audioService.playSoundEffect).toHaveBeenCalledOnceWith(
        '/audio/App Negative.mp3',
      );
      expect(input.classList).toContain('active');
      expect(correction(input).classList).toContain('active');

      tick(2000);
      expect(correction(input).innerText).toBe('Mauvaise réponse !');

      tick(60000);
      expect(correction(input).innerText).toBe('Mauvaise réponse !');
      expect(input.classList).toContain('active');
    }));

    it('lets the question be answered again', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      answer(0);

      expect(fieldsets()[0].disabled).toBeFalse();
      expect(episodeService.quizStep).toBe(0);
      expect(visibleFieldsets()).toEqual([fieldsets()[0]]);

      answer(2);
      expect(fieldsets()[0].disabled).toBeTrue();
    }));

    it('hides its correction once another answer is validated', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      const first = answer(0);
      const second = answer(1);

      expect(correction(first).innerText).toBe('');
      expect(correction(second).innerText).toBe('Mauvaise réponse !');
    }));

    it('stays highlighted in red once another answer is checked but not validated', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      const wrong = answer(0);
      radios(fieldsets()[0])[1].click();
      harness.detectChanges();

      const style = getComputedStyle(label(wrong));
      expect([style.backgroundColor, style.borderColor]).toEqual([
        resolvedColor('--light-danger-color'),
        resolvedColor('--danger-color'),
      ]);
    }));

    it('gives no translation when the question has none', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);

      const input = answer(1);

      expect(correctionText(input)).toBe('Mauvaise réponse !');
    }));

    it('gives the translation of the chosen answer when there is one', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([translatedQuestion]));
      showQuiz();
      tick(100);

      const input = answer(1);

      expect(correctionText(input)).toBe(
        'Mauvaise réponse ! « ¿Soy yo español? » signifie « Suis-je espagnol ? »',
      );
    }));

    it('marks the quoted answer of its translation as Spanish, and only it', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([translatedQuestion]));
      showQuiz();
      tick(100);

      const input = answer(1);

      expect(correction(input).closest('[lang="es"]')).toBeNull();
      expect(
        Array.from(correction(input).querySelectorAll('[lang="es"]'), (span) =>
          span.textContent?.trim(),
        ),
      ).toEqual(['¿Soy yo español?']);
    }));

    it('gives the translation of the chosen answer on a later question', fakeAsync(() => {
      const laterTranslatedQuestion = {
        label: 'Comment dit-on « Être » ?',
        answers: ['Tener', 'Ser', 'Hacer'],
        answerTranslations: ['Avoir', 'Être', 'Faire'],
        correctAnswer: 1,
        answerVideo: { url: 'https://vimeo.com/11', title: 'Réponse 2' },
      };
      episodeService.setEpisode(
        createEpisode([questions[0], laterTranslatedQuestion]),
      );
      episodeService.incrementQuizStep();
      showQuiz();
      tick(100);

      const input = answer(2);

      expect(correctionText(input)).toBe(
        'Mauvaise réponse ! « Hacer » signifie « Faire »',
      );
    }));

    it('does not overlap the next answer when its correction wraps onto several lines', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([translatedQuestion]));
      showQuiz();
      tick(100);
      // A narrow quiz, so that the correction wraps.
      host().style.width = '240px';

      const input = answer(1);

      const text = document.createRange();
      text.selectNodeContents(correction(input));
      const textRect = text.getBoundingClientRect();
      const lineHeight = parseFloat(
        getComputedStyle(correction(input)).lineHeight,
      );
      expect(textRect.height).toBeGreaterThan(1.5 * lineHeight);
      const nextLabel = host().querySelector(
        `label[for="${radios(fieldsets()[0])[2].id}"]`,
      )!;
      expect(textRect.bottom).toBeLessThanOrEqual(
        nextLabel.getBoundingClientRect().top,
      );
    }));

    it('shows no correction nor translation on screen before validation', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([translatedQuestion]));
      showQuiz();
      tick(100);

      expect(
        radios(fieldsets()[0]).map((input) => correction(input).innerText),
      ).toEqual(['', '', '']);
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

    it('gives no translation, even when the question has some', fakeAsync(() => {
      episodeService.setEpisode(createEpisode([translatedQuestion]));
      showQuiz();
      tick(100);

      const input = answer(2);

      expect(correctionText(input)).toBe('Bonne réponse !');
    }));

    it('has no axe violation once validated', async () => {
      episodeService.setEpisode(createEpisode());
      await showRevealedQuiz();

      // The mock clock captures the 2 s slide-out timer, keeping the
      // correction shown.
      withMockClock(() => {
        answer(2);
        expect(fieldsets()[0].disabled).toBeTrue();
      });

      expect(await axeViolations(host())).toEqual([]);
    });

    it('slides the question out after 2 seconds, then plays its answer video', fakeAsync(() => {
      episodeService.setEpisode(createEpisode());
      showQuiz();
      tick(100);
      const [first] = fieldsets();

      answer(2);
      tick(1999);
      expect(first.classList).not.toContain('hiding');

      tick(1);
      expect(first.classList).toContain('hiding');
      expect(episodeService.quizStep).toBe(0);

      tick(300);
      tick();
      expect(episodeService.quizStep).toBe(1);
      expect(url()).toBe('/3/video?videoType=answer&question=0');
      expect(host().textContent).toBe('Video');
    }));

    it('plays the answer video of the last question', fakeAsync(() => {
      episodeService.setEpisode(
        createEpisode([
          ...questions,
          {
            label: 'Quand a-t-il été volé ?',
            answers: ['La nuit', 'Le jour'],
            correctAnswer: 1,
            answerVideo: { url: 'https://vimeo.com/12', title: 'Réponse 3' },
          },
          {
            label: 'Pourquoi ?',
            answers: ['Par jalousie', 'Par cupidité', 'Par erreur'],
            correctAnswer: 1,
            answerVideo: { url: 'https://vimeo.com/13', title: 'Réponse 4' },
          },
        ]),
      );
      episodeService.incrementQuizStep();
      episodeService.incrementQuizStep();
      episodeService.incrementQuizStep();
      showQuiz();
      tick(100);

      answer(1);
      tick(2000);
      tick(300);
      tick();

      expect(url()).toBe('/3/video?videoType=answer&question=3');
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
      episodeService.incrementQuizStep();
      harness.detectChanges();
      tick(100);
      expect(secondFocus).toHaveBeenCalledTimes(2);
    }));
  });
});
