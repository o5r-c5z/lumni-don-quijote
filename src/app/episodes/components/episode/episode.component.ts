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

const EPISODE_BACKGROUND_TRACK = '/audio/Entertainment_FOND_SONORE.mp3';
const QUIZ_BACKGROUND_TRACK = '/audio/Guitar Background Mini_QUIZ.mp3';

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
    const startupTrack = this.backgroundTrackFor(this.router.url);
    if (startupTrack) {
      this.audioService.playBackgroundMusic(startupTrack);
    }

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: any) => {
          const track = this.backgroundTrackFor(event.url);
          if (track) {
            this.audioService.playBackgroundMusic(track);
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

  private backgroundTrackFor(url: string): string | undefined {
    if (this.isVideoScreen(url)) {
      return undefined;
    }
    return this.isQuizScreen(url)
      ? QUIZ_BACKGROUND_TRACK
      : EPISODE_BACKGROUND_TRACK;
  }

  private isVideoScreen(url: string): boolean {
    return url.includes('/video');
  }

  private isQuizScreen(url: string): boolean {
    return url.includes('/quiz');
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
