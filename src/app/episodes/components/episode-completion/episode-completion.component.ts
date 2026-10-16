import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  inject,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { EpisodeService } from '../../services/episode.service';

@Component({
  selector: 'app-episode-completion',
  imports: [RouterLink],
  templateUrl: './episode-completion.component.html',
  styleUrl: './episode-completion.component.scss',
})
export class EpisodeCompletionComponent implements AfterViewInit {
  private readonly episodeService = inject(EpisodeService);

  @ViewChild('resetQuizButton')
  protected resetQuizButton!: ElementRef<HTMLAnchorElement>;

  @HostBinding('class.screen')
  readonly isScreen = true;

  @HostBinding('style.--screen-background-overlay-opacity')
  get backgroundOverlayOpacity() {
    return 0.9;
  }

  ngAfterViewInit() {
    this.resetQuizButton.nativeElement.focus();
  }

  protected resetQuiz() {
    this.episodeService.resetQuiz();
  }
}
