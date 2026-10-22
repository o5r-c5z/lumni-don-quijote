import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  DestroyRef,
  ElementRef,
  HostBinding,
  inject,
  OnInit,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { Subscription, timer } from 'rxjs';
import { concatMap, mergeMap, tap } from 'rxjs/operators';
import { Answer, Episode, VideoType } from '../../models';
import { EpisodeService } from '../../services/episode.service';
import { AudioService } from '../../services/audio.service';

const VALIDATED_CLASS = 'active';

/**
 * Delay between emptying the live region and filling it, as LiveAnnouncer
 * does: screen readers then announce the verdict even when it repeats the
 * previous one.
 */
const LIVE_REGION_DELAY_MS = 100;

/** Brings the right-answer sound's loudness down to −23 LUFS. */
const RIGHT_ANSWER_SOUND_VOLUME = 0.41;

/** Brings the wrong-answer sound's loudness down to −23 LUFS. */
const WRONG_ANSWER_SOUND_VOLUME = 0.26;

/** The verdict on a validated answer: a wrong one is corrected by the answer. */
type Verdict = { isCorrect: true } | { isCorrect: false; answer: Answer };

@Component({
  selector: 'app-episode-quiz',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './episode-quiz.component.html',
  styleUrl: './episode-quiz.component.scss',
  host: { class: 'screen' },
})
export class EpisodeQuizComponent implements OnInit {
  private readonly audioService = inject(AudioService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly episodeService = inject(EpisodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  @ViewChild('form')
  protected form!: ElementRef<HTMLFormElement>;

  protected episode?: Episode;
  protected quizStep: number = 0;
  protected checkedAnswers: Record<number, number> = {};
  protected animationDuration: number = 0.3;
  protected VideoType = VideoType;
  protected liveVerdict?: Verdict;
  private pendingAnnouncement?: Subscription;

  @HostBinding('style.--screen-background-overlay-opacity')
  get backgroundOverlayOpacity() {
    return 0.8;
  }

  ngOnInit() {
    this.episodeService.episode$
      .pipe(
        tap((episode?: Episode) => {
          this.episode = episode;
        }),
        mergeMap(() => this.episodeService.quizStep$),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((quizStep: number) => {
        this.quizStep = quizStep;
        if (this.isQuizComplete(quizStep)) {
          this.showCompletion();
          return;
        }
        this.focusFirstInput();
        this.showNextQuestion();
      });
  }

  private isQuizComplete(quizStep: number): boolean {
    return quizStep > 0 && quizStep >= (this.episode?.questions.length ?? 0);
  }

  private showCompletion(): void {
    this.router.navigate(['../completion'], { relativeTo: this.route });
  }

  private focusFirstInput(): void {
    timer(100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const firstRadioInput = this.form.nativeElement.querySelector(
          'fieldset:not([hidden]) input:first-of-type',
        ) as HTMLInputElement;

        if (firstRadioInput) {
          firstRadioInput.focus();
        }
      });
  }

  private showNextQuestion(): void {
    timer(100)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        const fieldset = this.form.nativeElement.querySelector(
          'fieldset:not([hidden])',
        ) as HTMLFieldSetElement;
        fieldset.classList.remove('hidden');
      });
  }

  protected onCheckAnswer(questionIndex: number, answerIndex: number): void {
    this.checkedAnswers[questionIndex] = answerIndex;
  }

  protected onValidateAnswer($event: Event) {
    const button = $event.target as HTMLButtonElement;
    const fieldset = button.closest('fieldset');
    const selectedRadio = fieldset?.querySelector(
      'input:checked',
    ) as HTMLInputElement | null;

    if (!selectedRadio) {
      return;
    }

    this.validateAnswer(selectedRadio);
  }

  private validateAnswer(input: HTMLInputElement) {
    const questionIndex = parseInt(
      input.getAttribute('data-question-index') ?? '-1',
    );
    const selectedAnswerIndex = parseInt(
      input.getAttribute('data-answer-index') ?? '-1',
    );

    if (questionIndex === -1 || selectedAnswerIndex === -1) {
      return;
    }

    const correctionId = input.getAttribute('aria-describedby');
    const correction = correctionId
      ? document.getElementById(correctionId)
      : null;
    const isCorrect =
      selectedAnswerIndex ===
      this.episode?.questions[questionIndex].correctAnswer;

    const fieldset = input.closest('fieldset');

    if (fieldset) {
      this.clearPreviousValidation(fieldset);
    }
    input.classList.add(VALIDATED_CLASS);
    correction?.classList.add(VALIDATED_CLASS);

    if (isCorrect) {
      if (fieldset) {
        fieldset.disabled = true;
      }

      this.handleCorrectAnswer(fieldset as HTMLFieldSetElement, questionIndex);
    } else {
      this.handleIncorrectAnswer(questionIndex, selectedAnswerIndex);
    }
  }

  private clearPreviousValidation(fieldset: HTMLFieldSetElement): void {
    fieldset
      .querySelectorAll(
        `.episode-quiz__answer-input.${VALIDATED_CLASS},` +
          ` .episode-quiz__question-correction.${VALIDATED_CLASS}`,
      )
      .forEach((element) => element.classList.remove(VALIDATED_CLASS));
  }

  private handleCorrectAnswer(
    fieldset: HTMLFieldSetElement,
    questionIndex: number,
  ): void {
    this.audioService.playSoundEffect(
      '/audio/Win 3.mp3',
      RIGHT_ANSWER_SOUND_VOLUME,
    );
    this.announce({ isCorrect: true });

    timer(2000)
      .pipe(
        tap(() => fieldset.classList.add('hiding')),
        concatMap(() => timer(this.animationDuration * 1000)),
        tap(() => {
          fieldset.classList.remove('hiding');
          this.episodeService.incrementQuizStep();

          this.playVideo({
            videoType: VideoType.Answer,
            question: questionIndex,
          });
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private playVideo(queryParams: Params): void {
    this.router.navigate(['../video'], {
      queryParams,
      relativeTo: this.route,
    });
  }

  private handleIncorrectAnswer(
    questionIndex: number,
    answerIndex: number,
  ): void {
    this.audioService.playSoundEffect(
      '/audio/App Negative.mp3',
      WRONG_ANSWER_SOUND_VOLUME,
    );
    const answer = this.episode?.questions[questionIndex]?.answers[answerIndex];
    this.announce(answer ? { isCorrect: false, answer } : undefined);
  }

  private announce(verdict?: Verdict): void {
    this.liveVerdict = undefined;
    this.pendingAnnouncement?.unsubscribe();
    this.pendingAnnouncement = timer(LIVE_REGION_DELAY_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.liveVerdict = verdict;
      });
  }
}
