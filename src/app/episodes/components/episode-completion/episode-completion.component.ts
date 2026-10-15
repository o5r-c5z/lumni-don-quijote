import {
  AfterViewInit,
  Component,
  ElementRef,
  HostBinding,
  inject,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { PARCHMENT_BACKGROUND } from '../../screen-backgrounds';
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
  @HostBinding('style.--screen-background-landscape')
  get backgroundImageLandscape() {
    return PARCHMENT_BACKGROUND;
  }

  @HostBinding('style.--screen-background-portrait')
  get backgroundImagePortrait() {
    return PARCHMENT_BACKGROUND;
  }

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
