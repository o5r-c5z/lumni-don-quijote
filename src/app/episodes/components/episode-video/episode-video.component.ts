import {
  Component,
  ElementRef,
  HostBinding,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import Player from '@vimeo/player';
import { Subscription, switchMap, tap } from 'rxjs';
import { Episode, Video, VideoType } from '../../models';
import { AnnouncementService } from '../../services/announcement.service';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';
import { PARCHMENT_BACKGROUND } from '../../screen-backgrounds';

const VIDEO_PATH = '../video';
const QUIZ_PATH = '../quiz';
const COMPLETION_PATH = '../completion';

/** Where the screen leads once the video is over or skipped. */
interface Destination {
  path: string;
  queryParams?: Params;
}

@Component({
  selector: 'app-episode-video',
  imports: [RouterLink],
  templateUrl: './episode-video.component.html',
  styleUrl: './episode-video.component.scss',
})
export class EpisodeVideoComponent implements OnInit, OnDestroy {
  private readonly episodeService = inject(EpisodeService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly audioService = inject(AudioService);
  private readonly announcementService = inject(AnnouncementService);
  private player?: Player;
  private subscription?: Subscription;

  protected episode?: Episode;
  protected video?: Video;
  protected videoType?: VideoType;

  @ViewChild('playerContainer', { static: true }) playerContainer!: ElementRef;

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
    return 0.8;
  }

  ngOnInit() {
    this.setupSubscriptions();
  }

  ngOnDestroy() {
    this.player?.destroy();
    this.subscription?.unsubscribe();
  }

  private setupSubscriptions() {
    this.subscription = this.episodeService.episode$
      .pipe(
        tap((episode?: Episode) => {
          this.episode = episode;
        }),
        switchMap(() => this.route.queryParams),
        tap((params) => {
          this.videoType = params['videoType'];
          switch (this.videoType) {
            case VideoType.Lesson:
              this.video = this.episode?.lesson;
              break;
            case VideoType.Answer:
              this.video =
                this.episode?.questions[params['question']]?.answerVideo ??
                this.video;
              break;
            default:
              this.video = this.episode?.introduction;
              break;
          }

          this.audioService.pause();
        }),
      )
      .subscribe(() => {
        if (this.player) {
          this.destroyPlayer();
        }
        this.initializePlayer();
      });
  }

  private initializePlayer() {
    if (!this.video) {
      return;
    }

    const videoTitle = this.video?.title || '';

    this.audioService.pause();

    this.player = new Player(this.playerContainer.nativeElement, {
      url: this.video?.url,
      responsive: true,
    });

    this.player.on('loaded', () => {
      const iframe = this.playerContainer.nativeElement.querySelector('iframe');
      if (iframe) {
        iframe.setAttribute('title', videoTitle);
        iframe.setAttribute('aria-label', `Vidéo: ${videoTitle}`);
        iframe.focus();
      }
    });

    this.player.play();

    this.player.on('play', () => {
      this.audioService.pause();
      this.announcementService.announce(`Lecture de la vidéo: ${videoTitle}`);
    });

    this.player.on('pause', () => {
      this.announcementService.announce('Mise en pause de la vidéo');
    });

    this.player.on('ended', () => {
      this.onVideoEnded();
    });
  }

  private onVideoEnded() {
    const { path, queryParams } = this.nextDestination;
    this.router.navigate([path], { relativeTo: this.route, queryParams });
  }

  protected get nextDestination(): Destination {
    switch (this.videoType) {
      case VideoType.Lesson:
        return { path: QUIZ_PATH };
      case VideoType.Answer:
        return { path: this.pathAfterAnswer() };
      default:
        return {
          path: VIDEO_PATH,
          queryParams: { videoType: VideoType.Lesson },
        };
    }
  }

  private pathAfterAnswer(): string {
    return this.isLastQuestion() ? COMPLETION_PATH : QUIZ_PATH;
  }

  private isLastQuestion(): boolean {
    const questionIndex = Number(this.route.snapshot.queryParams['question']);
    const lastQuestionIndex = (this.episode?.questions.length ?? 0) - 1;
    return questionIndex === lastQuestionIndex;
  }

  private destroyPlayer() {
    this.player?.destroy();
    this.player = undefined;
  }
}
