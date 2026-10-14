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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { timer } from 'rxjs';
import { concatMap, mergeMap, tap } from 'rxjs/operators';
import { Episode } from '../../models';
import { EpisodeService } from '../../services/episode.service';
import { AudioService } from '../../services/audio.service';

@Component({
  selector: 'app-episode-quiz',
  imports: [RouterLink],
  templateUrl: './episode-quiz.component.html',
  styleUrl: './episode-quiz.component.scss',
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

  @HostBinding('class.screen')
  @HostBinding('style.--screen-background-landscape')
  get backgroundImageLandscape() {
    return `url("/images/landscape/Ecran_UI.jpg")`;
  }

  @HostBinding('style.--screen-background-portrait')
  get backgroundImagePortrait() {
    return `url("/images/portrait/Ecran_UI.jpg")`;
  }

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
        this.focusFirstInput();
        this.showNextQuestion();
      });
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

    input.classList.add('active');
    correction?.classList.add('active');

    if (isCorrect) {
      const fieldset = input.closest('fieldset');
      if (fieldset) {
        fieldset.disabled = true;
      }

      this.handleCorrectAnswer(fieldset as HTMLFieldSetElement);
    } else {
      this.handleIncorrectAnswer(correction);
    }
  }

  private handleCorrectAnswer(fieldset: HTMLFieldSetElement): void {
    this.audioService.playSoundEffect('/audio/Win 3.mp3');

    timer(2000)
      .pipe(
        tap(() => fieldset.classList.add('hiding')),
        concatMap(() => timer(this.animationDuration * 1000)),
        tap(() => {
          fieldset.classList.remove('hiding');
          this.episodeService.incrementQuizStep();

          if (this.episodeService.isQuizComplete()) {
            this.router.navigate(['../video'], {
              queryParams: { videoType: 'resolution' },
              relativeTo: this.route,
            });
          }
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();
  }

  private handleIncorrectAnswer(correction: HTMLElement | null): void {
    this.audioService.playSoundEffect('/audio/App Negative.mp3');

    timer(2000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        correction?.classList.remove('active');
      });
  }
}
