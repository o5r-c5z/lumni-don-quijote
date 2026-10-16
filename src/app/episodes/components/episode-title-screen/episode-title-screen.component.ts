import {
  Component,
  ElementRef,
  HostBinding,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { Episode } from '../../models';
import { EpisodeService } from '../../services/episode.service';

// A raw line feed ends a CSS string; its hex escape does not. The trailing
// space terminates the escape and is not part of the value.
const CSS_ESCAPED_LINE_FEED = '\\a ';

function cssUrl(path: string): string {
  const escapedPath = path
    .replaceAll('\\', '\\\\')
    .replaceAll('"', '\\"')
    .replaceAll('\n', CSS_ESCAPED_LINE_FEED);
  return `url("${escapedPath}")`;
}

@Component({
  selector: 'app-episode-title-screen',
  imports: [RouterLink],
  templateUrl: './episode-title-screen.component.html',
  styleUrl: './episode-title-screen.component.scss',
  host: { class: 'screen' },
})
export class EpisodeTitleScreenComponent implements OnInit, OnDestroy {
  private readonly episodeService = inject(EpisodeService);
  private subscription?: Subscription;

  protected episode?: Episode;

  @ViewChild('goToEpisodeButton')
  protected goToEpisodeButton!: ElementRef<HTMLAnchorElement>;

  @HostBinding('style.--screen-background')
  get backgroundImage() {
    const background = this.episode?.titleBackground;
    return typeof background === 'string' && background
      ? cssUrl(background)
      : 'none';
  }

  ngOnInit() {
    this.subscription = this.episodeService.episode$.subscribe(
      (episode?: Episode) => {
        if (episode) {
          this.episode = episode;
          this.focusFirstButton();
        }
      },
    );
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  private focusFirstButton(): void {
    setTimeout(() => {
      this.goToEpisodeButton.nativeElement.focus();
    });
  }
}
