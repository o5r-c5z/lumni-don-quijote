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

@Component({
  selector: 'app-episode-title-screen',
  imports: [RouterLink],
  templateUrl: './episode-title-screen.component.html',
  styleUrl: './episode-title-screen.component.scss',
})
export class EpisodeTitleScreenComponent implements OnInit, OnDestroy {
  private readonly episodeService = inject(EpisodeService);
  private subscription?: Subscription;

  protected episode?: Episode;

  @ViewChild('goToEpisodeButton')
  protected goToEpisodeButton!: ElementRef<HTMLAnchorElement>;

  @HostBinding('class.screen')
  @HostBinding('style.--screen-background')
  get backgroundImage() {
    return `url("${this.episode?.titleBackground}")`;
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
