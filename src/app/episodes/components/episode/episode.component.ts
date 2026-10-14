import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterOutlet,
} from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { Episode } from '../../models';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';
import { AudioControlComponent } from '../audio-control/audio-control.component';

@Component({
  selector: 'app-episode',
  imports: [RouterOutlet, AudioControlComponent],
  templateUrl: './episode.component.html',
  providers: [],
  styleUrl: './episode.component.scss',
})
export class EpisodeComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly episodeService = inject(EpisodeService);
  private readonly audioService = inject(AudioService);
  private subscriptions = new Subscription();

  protected episode?: Episode;

  ngOnInit() {
    this.audioService.initBackgroundMusic(
      '/audio/Dark Comedy Ident - Main.mp3',
    );

    this.audioService.play();
    this.audioService.playBackgroundMusic('/audio/Entertainment_FOND_SONORE.mp3');

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: any) => {
          const url = event.url;
          const isVideoScreen = url.includes('/video');

          if (!isVideoScreen) {
            if (!this.audioService.isPlaying()) {
              this.audioService.play(false);
            }
          }
        }),
    );

    this.subscriptions.add(
      this.route.params.subscribe((params) => {
        const episodeNumber = params['episodeNumber'];
        if (episodeNumber) {
          this.loadEpisode(Number(episodeNumber));
        }
      }),
    );
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    this.audioService.pause();
  }

  private loadEpisode(episodeNumber: number) {
    fetch(`uploads/episodes/${episodeNumber}/episode.json`)
      .then((response) => response.json())
      .then((episodeData) => {
        this.episode = episodeData;
        this.episodeService.setEpisode(episodeData);
      })
      .catch(() => this.router.navigate(['/']));
  }
}
