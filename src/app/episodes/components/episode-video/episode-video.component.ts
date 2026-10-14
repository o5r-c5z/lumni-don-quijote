import {
  Component,
  ElementRef,
  HostBinding,
  inject,
  OnDestroy,
  OnInit,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faArrowRotateLeft } from '@fortawesome/free-solid-svg-icons';
import Player from '@vimeo/player';
import { mergeMap, Subscription, tap } from 'rxjs';
import { Episode, Video, VideoType } from '../../models';
import { AnnouncementService } from '../../services/announcement.service';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';

@Component({
  selector: 'app-episode-video',
  imports: [RouterLink, FontAwesomeModule],
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
  protected videoEnded = false;
  protected VideoType = VideoType;
  protected faArrowRotateLeft = faArrowRotateLeft;

  @ViewChild('playerContainer', { static: true }) playerContainer!: ElementRef;

  @HostBinding('class.screen')
  @HostBinding('style.--screen-background-landscape')
  get backgroundImageLandscape() {
    return !this.videoEnded
      ? `url("/images/landscape/Tableau_UI.jpg")`
      : `url("/images/landscape/Decors_Bureau 1.jpg")`;
  }

  @HostBinding('style.--screen-background-portrait')
  get backgroundImagePortrait() {
    return !this.videoEnded
      ? `url("/images/portrait/Tableau_UI.jpg")`
      : `url("/images/portrait/decor_bureau.jpg")`;
  }

  @HostBinding('style.--screen-background-overlay-opacity')
  get backgroundOverlayOpacity() {
    return this.videoEnded ? 0.45 : 0.8;
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
        mergeMap(() => this.route.queryParams),
        tap((params) => {
          this.videoEnded = false;

          this.videoType = params['videoType'];
          switch (this.videoType) {
            case VideoType.PedagogicalConcept:
              this.video = this.episode?.pedagogicalConcept;
              break;
            case VideoType.Clue:
              const clueNumber = params['clue'];
              if (clueNumber) {
                this.video = this.episode?.clues[clueNumber];
              }
              break;
            case VideoType.Resolution:
              this.video = this.episode?.resolution;
              break;
            case VideoType.Investigation:
            default:
              this.video = this.episode?.investigation;
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

  protected restartBackgroundMusic(): void {
    this.audioService.play(true);
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
    switch (this.videoType) {
      case VideoType.Clue:
        this.router.navigate(['../quiz'], { relativeTo: this.route });
        break;
      case VideoType.Resolution:
        this.router.navigate(['../completion'], { relativeTo: this.route });
        break;
      default:
        this.videoEnded = true;
        this.destroyPlayer();

        this.restartBackgroundMusic();
        this.announcementService.announce('Vidéo terminée');

        setTimeout(() => {
          const firstButton = document.getElementById(
            'episode-video__go-to-quiz-btn',
          );
          if (firstButton) {
            firstButton.focus();
          }
        }, 100);
    }
  }

  private destroyPlayer() {
    this.player?.destroy();
    this.player = undefined;
  }

  protected restartVideo() {
    this.videoEnded = false;
    this.initializePlayer();
    this.audioService.pause();
    this.announcementService.announce('Redémarrage de la vidéo');
    this.player?.play();
  }

  protected goToPedagogicalConcept() {
    this.videoEnded = false;
    this.audioService.pause();
    this.announcementService.announce(
      'Changement vers la vidéo du concept pédagogique',
    );
    this.player?.play();
  }
}
