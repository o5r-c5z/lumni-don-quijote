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
    this.audioService.initBackgroundMusic(
      '/audio/Dark Comedy Ident - Main.mp3',
    );

    if (!this.isVideoScreen(this.router.url)) {
      this.audioService.play();
      this.audioService.playBackgroundMusic(
        this.isQuizScreen(this.router.url)
          ? QUIZ_BACKGROUND_TRACK
          : EPISODE_BACKGROUND_TRACK,
      );
    }

    this.subscriptions.add(
      this.router.events
        .pipe(filter((event) => event instanceof NavigationEnd))
        .subscribe((event: any) => {
          if (this.isQuizScreen(event.url)) {
            this.audioService.playBackgroundMusic(QUIZ_BACKGROUND_TRACK);
          }
          if (
            this.isCompletionScreen(event.url) ||
            this.isTitleScreen(event.url)
          ) {
            this.audioService.playBackgroundMusic(EPISODE_BACKGROUND_TRACK);
          }
          if (!this.isVideoScreen(event.url)) {
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

  private isVideoScreen(url: string): boolean {
    return url.includes('/video');
  }

  private isQuizScreen(url: string): boolean {
    return url.includes('/quiz');
  }

  private isCompletionScreen(url: string): boolean {
    return url.includes('/completion');
  }

  private isTitleScreen(url: string): boolean {
    return (
      !this.isVideoScreen(url) &&
      !this.isQuizScreen(url) &&
      !this.isCompletionScreen(url)
    );
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
