import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import Player from '@vimeo/player';
import { axeViolations } from '../../../../testing/axe';
import { Episode } from '../../models';
import { AnnouncementService } from '../../services/announcement.service';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';
import { EpisodeVideoComponent } from './episode-video.component';

function video(id: number, title: string) {
  return { url: `https://vimeo.com/${id}`, title };
}

const episode: Episode = {
  title: 'La disparition',
  titleBackground: { landscape: 'landscape.png', portrait: 'portrait.png' },
  investigation: video(100, 'Enquête'),
  pedagogicalConcept: video(200, 'Cours'),
  clues: [video(300, 'Indice 0'), video(301, 'Indice 1')],
  resolution: video(400, 'Résolution'),
  questions: [],
};

@Component({ template: '<p>Quiz</p>' })
class QuizStubComponent {}

@Component({ template: '<p>Completion</p>' })
class CompletionStubComponent {}

describe('EpisodeVideoComponent', () => {
  let harness: RouterTestingHarness;
  let episodeService: EpisodeService;
  let audioService: jasmine.SpyObj<AudioService>;
  let announcementService: jasmine.SpyObj<AnnouncementService>;
  let oEmbedRequests: jasmine.Spy;
  let playerOn: jasmine.Spy;
  let playerPlay: jasmine.Spy;
  let playerDestroy: jasmine.Spy;

  beforeEach(async () => {
    // A Vimeo player created on a <div> asks vimeo.com for the embed code
    // through XMLHttpRequest. The fake request never answers, so the player
    // never embeds an iframe and never talks to Vimeo.
    oEmbedRequests = jasmine.createSpy('open');
    spyOn(window, 'XMLHttpRequest').and.returnValue({
      open: oEmbedRequests,
      send: () => {},
    } as unknown as XMLHttpRequest);
    playerOn = spyOn(Player.prototype, 'on');
    playerPlay = spyOn(Player.prototype, 'play').and.resolveTo();
    playerDestroy = spyOn(Player.prototype, 'destroy').and.callThrough();

    audioService = jasmine.createSpyObj<AudioService>('AudioService', [
      'play',
      'pause',
    ]);
    announcementService = jasmine.createSpyObj<AnnouncementService>(
      'AnnouncementService',
      ['announce'],
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: ':episodeNumber',
            children: [
              { path: 'video', component: EpisodeVideoComponent },
              { path: 'quiz', component: QuizStubComponent },
              { path: 'completion', component: CompletionStubComponent },
            ],
          },
        ]),
        { provide: AudioService, useValue: audioService },
        { provide: AnnouncementService, useValue: announcementService },
      ],
    });
    episodeService = TestBed.inject(EpisodeService);
    harness = await RouterTestingHarness.create();
  });

  /**
   * Shows the video screen. The video type is read in ngAfterViewInit,
   * after the view was checked, so for a clue or the resolution the
   * development mode reports NG0100 (pinned in its own tests). The screen is
   * then rendered again, as the next change detection would.
   */
  async function showVideo(query = ''): Promise<HTMLElement> {
    await harness.navigateByUrl(`/3/video${query}`).catch((error) => {
      if (
        !/videoType=(clue|resolution)/.test(query) ||
        !String(error).includes('NG0100')
      ) {
        throw error;
      }
    });
    harness.detectChanges();
    return harness.routeNativeElement!;
  }

  /** The video URLs the players were created for, in order. */
  function requestedVideos(): (string | null)[] {
    return oEmbedRequests.calls
      .allArgs()
      .map(([, url]) => new URL(url).searchParams.get('url'));
  }

  /** Simulates an event of the last player created. */
  function emit(event: string): void {
    const lastPlayer = playerOn.calls.mostRecent()?.object;
    const handler = playerOn.calls
      .all()
      .find((call) => call.object === lastPlayer && call.args[0] === event)
      ?.args[1];
    expect(handler).withContext(`"${event}" handler`).toBeDefined();
    handler();
    harness.detectChanges();
  }

  function playerContainer(host: HTMLElement): HTMLElement {
    return host.querySelector('#episode-video__player-container')!;
  }

  function links(host: HTMLElement): (string | null)[][] {
    return Array.from(host.querySelectorAll('a'), (link) => [
      link.textContent?.trim() ?? '',
      link.getAttribute('href'),
    ]);
  }

  function linkNamed(host: HTMLElement, text: string): HTMLAnchorElement {
    return Array.from(host.querySelectorAll('a')).find(
      (link) => link.textContent?.trim() === text,
    )!;
  }

  function currentUrl(): string {
    return TestBed.inject(Router).url;
  }

  describe('video choice', () => {
    beforeEach(() => episodeService.setEpisode(episode));

    for (const [query, expected] of [
      ['', 'https://vimeo.com/100'],
      ['?videoType=investigation', 'https://vimeo.com/100'],
      ['?videoType=unknown', 'https://vimeo.com/100'],
      ['?videoType=pedagogicalConcept', 'https://vimeo.com/200'],
      ['?videoType=clue&clue=0', 'https://vimeo.com/300'],
      ['?videoType=clue&clue=1', 'https://vimeo.com/301'],
      ['?videoType=resolution', 'https://vimeo.com/400'],
    ]) {
      it(`plays ${expected} for "${query}"`, async () => {
        await showVideo(query);

        expect(requestedVideos()).toEqual([expected]);
        expect(playerPlay).toHaveBeenCalledTimes(1);
      });
    }

    it('creates a responsive player in the container', async () => {
      const host = await showVideo();

      const [, url] = oEmbedRequests.calls.mostRecent().args;
      expect(new URL(url).searchParams.get('responsive')).toBe('true');
      expect(playerContainer(host).getAttribute('aria-label')).toBe(
        'Lecteur vidéo',
      );
    });

    it('plays nothing for a clue without a number', async () => {
      await showVideo('?videoType=clue');

      expect(requestedVideos()).toEqual([]);
    });

    it('plays nothing for a clue number out of range', async () => {
      await showVideo('?videoType=clue&clue=5');

      expect(requestedVideos()).toEqual([]);
    });

    it('replaces the player when the query changes', async () => {
      await showVideo('?videoType=clue&clue=0');

      await harness.navigateByUrl('/3/video?videoType=clue&clue=1');

      expect(requestedVideos()).toEqual([
        'https://vimeo.com/300',
        'https://vimeo.com/301',
      ]);
      expect(playerDestroy).toHaveBeenCalledTimes(1);
    });

    it('replays the previous video for a clue without a number', async () => {
      await showVideo('?videoType=clue&clue=1');

      await harness.navigateByUrl('/3/video?videoType=clue');

      expect(requestedVideos()).toEqual([
        'https://vimeo.com/301',
        'https://vimeo.com/301',
      ]);
    });
  });

  describe('in development mode', () => {
    beforeEach(() => episodeService.setEpisode(episode));

    for (const query of [
      '?videoType=clue',
      '?videoType=clue&clue=0',
      '?videoType=resolution',
    ]) {
      it(`reports a view changed after it was checked for "${query}"`, async () => {
        await expectAsync(
          harness.navigateByUrl(`/3/video${query}`),
        ).toBeRejectedWithError(/NG0100/);
      });
    }

    for (const query of ['', '?videoType=pedagogicalConcept']) {
      it(`reports nothing for "${query}"`, async () => {
        await expectAsync(
          harness.navigateByUrl(`/3/video${query}`),
        ).toBeResolved();
      });
    }
  });

  describe('without an episode', () => {
    it('plays nothing until the episode is loaded', async () => {
      await showVideo();
      expect(requestedVideos()).toEqual([]);

      episodeService.setEpisode(episode);

      expect(requestedVideos()).toEqual(['https://vimeo.com/100']);
    });

    it('then creates the player twice on each query change', async () => {
      await showVideo();
      episodeService.setEpisode(episode);

      // Each episode emission adds a subscription to the query parameters.
      await harness.navigateByUrl('/3/video?videoType=pedagogicalConcept');

      expect(requestedVideos()).toEqual([
        'https://vimeo.com/100',
        'https://vimeo.com/200',
        'https://vimeo.com/200',
      ]);
      expect(playerDestroy).toHaveBeenCalledTimes(2);
    });
  });

  describe('while the video plays', () => {
    let host: HTMLElement;

    beforeEach(async () => {
      episodeService.setEpisode(episode);
      host = await showVideo();
    });

    it('pauses the background music', () => {
      expect(audioService.pause).toHaveBeenCalled();
      expect(audioService.play).not.toHaveBeenCalled();
    });

    it('names and focuses the video once loaded', () => {
      // A loaded player has replaced its container content with the iframe.
      const iframe = document.createElement('iframe');
      playerContainer(host).appendChild(iframe);

      emit('loaded');

      expect(iframe.getAttribute('title')).toBe('Enquête');
      expect(iframe.getAttribute('aria-label')).toBe('Vidéo: Enquête');
      expect(document.activeElement).toBe(iframe);
    });

    it('announces when the video plays and pauses', () => {
      audioService.pause.calls.reset();

      emit('play');
      emit('pause');

      expect(audioService.pause).toHaveBeenCalledTimes(1);
      expect(announcementService.announce.calls.allArgs()).toEqual([
        ['Lecture de la vidéo: Enquête'],
        ['Mise en pause de la vidéo'],
      ]);
    });

    it('offers to leave the video for the quiz', () => {
      expect(links(host)).toEqual([
        ['Quitter la vidéo et lancer le quiz', '/3/quiz'],
      ]);
    });

    it('restarts the background music when leaving for the quiz', async () => {
      linkNamed(host, 'Quitter la vidéo et lancer le quiz').click();
      await harness.fixture.whenStable();

      expect(audioService.play).toHaveBeenCalledOnceWith(true);
      expect(currentUrl()).toBe('/3/quiz');
    });

    it('destroys the player when leaving the screen', async () => {
      await harness.navigateByUrl('/3/quiz');

      expect(playerDestroy).toHaveBeenCalledTimes(1);
    });

    it('stops following the episode once the screen is left', async () => {
      await harness.navigateByUrl('/3/quiz');

      episodeService.setEpisode({ ...episode });

      expect(requestedVideos()).toEqual(['https://vimeo.com/100']);
    });

    it('displays the board as a background', () => {
      expect(host.classList).toContain('screen');
      expect(host.style.getPropertyValue('--screen-background-landscape')).toBe(
        'url("/images/landscape/Tableau_UI.jpg")',
      );
      expect(host.style.getPropertyValue('--screen-background-portrait')).toBe(
        'url("/images/portrait/Tableau_UI.jpg")',
      );
      expect(
        host.style.getPropertyValue('--screen-background-overlay-opacity'),
      ).toBe('0.8');
    });

    it('has no axe violation', async () => {
      expect(await axeViolations(host)).toEqual([]);
    });
  });

  describe('exit link', () => {
    beforeEach(() => episodeService.setEpisode(episode));

    it('goes back to the quiz during a clue', async () => {
      const host = await showVideo('?videoType=clue&clue=0');

      expect(links(host)).toEqual([['Retourner au quiz', '/3/quiz']]);
    });

    it('has no axe violation during a clue', async () => {
      const host = await showVideo('?videoType=clue&clue=0');

      expect(await axeViolations(host)).toEqual([]);
    });

    it('is absent during the resolution', async () => {
      const host = await showVideo('?videoType=resolution');

      expect(links(host)).toEqual([]);
    });

    it('has no axe violation during the resolution', async () => {
      const host = await showVideo('?videoType=resolution');

      expect(await axeViolations(host)).toEqual([]);
    });
  });

  describe('at the end of the video', () => {
    beforeEach(() => episodeService.setEpisode(episode));

    /**
     * Ends the investigation or the lesson. The end of the video schedules
     * the focus with setTimeout: the mock clock keeps that timer from firing
     * during a later test.
     */
    function endVideo(): void {
      jasmine.clock().install();
      emit('ended');
    }

    afterEach(() => jasmine.clock().uninstall());

    it('goes back to the quiz after a clue', async () => {
      await showVideo('?videoType=clue&clue=0');

      emit('ended');
      await harness.fixture.whenStable();

      expect(currentUrl()).toBe('/3/quiz');
    });

    it('goes to the completion screen after the resolution', async () => {
      await showVideo('?videoType=resolution');

      emit('ended');
      await harness.fixture.whenStable();

      expect(currentUrl()).toBe('/3/completion');
    });

    for (const query of ['', '?videoType=pedagogicalConcept']) {
      describe(`of "${query}"`, () => {
        let host: HTMLElement;

        beforeEach(async () => {
          host = await showVideo(query);
          endVideo();
        });

        it('stays on the screen and destroys the player', () => {
          expect(currentUrl()).toBe(`/3/video${query}`);
          expect(playerDestroy).toHaveBeenCalledTimes(1);
        });

        it('restarts the background music and announces the end', () => {
          expect(audioService.play).toHaveBeenCalledOnceWith(true);
          expect(announcementService.announce).toHaveBeenCalledOnceWith(
            'Vidéo terminée',
          );
        });

        const isLesson = query === '?videoType=pedagogicalConcept';
        const lessonOffer = isLesson ? '' : ' and the lesson';

        it(`offers the quiz, the video again${lessonOffer}`, () => {
          const nav = host.querySelector('nav');
          expect(nav?.getAttribute('aria-label')).toBe(
            'Options après la vidéo',
          );
          expect(links(host)).toEqual([
            ['Lancer le quiz !', '/3/quiz'],
            ['Revoir toute la vidéo', null],
            ...(isLesson
              ? []
              : [
                  [
                    'Revoir la leçon de Rossinante',
                    '/3/video?videoType=pedagogicalConcept',
                  ],
                ]),
          ]);
        });

        it('cannot reach "Revoir toute la vidéo" with the keyboard', () => {
          const replay = linkNamed(host, 'Revoir toute la vidéo');

          replay.focus();

          expect(replay.hasAttribute('href')).toBeFalse();
          expect(document.activeElement).not.toBe(replay);
        });

        it('focuses the link to the quiz after 100 ms', () => {
          const quizLink = linkNamed(host, 'Lancer le quiz !');

          jasmine.clock().tick(99);
          expect(document.activeElement).not.toBe(quizLink);

          jasmine.clock().tick(1);
          expect(document.activeElement).toBe(quizLink);
        });

        it('displays the office as a background', () => {
          expect(
            host.style.getPropertyValue('--screen-background-landscape'),
          ).toBe('url("/images/landscape/Decors_Bureau 1.jpg")');
          expect(
            host.style.getPropertyValue('--screen-background-portrait'),
          ).toBe('url("/images/portrait/decor_bureau.jpg")');
          expect(
            host.style.getPropertyValue('--screen-background-overlay-opacity'),
          ).toBe('0.45');
        });

        it('replays the same video', () => {
          audioService.pause.calls.reset();
          announcementService.announce.calls.reset();
          playerPlay.calls.reset();

          linkNamed(host, 'Revoir toute la vidéo').click();
          harness.detectChanges();

          expect(requestedVideos().length).toBe(2);
          expect(requestedVideos()[1]).toBe(requestedVideos()[0]);
          // Both initializePlayer() and restartVideo() play the video and
          // pause the music.
          expect(playerPlay).toHaveBeenCalledTimes(2);
          expect(audioService.pause).toHaveBeenCalledTimes(2);
          expect(announcementService.announce).toHaveBeenCalledOnceWith(
            'Redémarrage de la vidéo',
          );
          expect(host.querySelector('nav')).toBeNull();
          expect(
            host.style.getPropertyValue('--screen-background-overlay-opacity'),
          ).toBe('0.8');
        });
      });
    }

    it('plays the lesson from the end of the investigation', async () => {
      const host = await showVideo();
      endVideo();

      linkNamed(host, 'Revoir la leçon de Rossinante').click();
      await harness.fixture.whenStable();

      expect(currentUrl()).toBe('/3/video?videoType=pedagogicalConcept');
      expect(requestedVideos()).toEqual([
        'https://vimeo.com/100',
        'https://vimeo.com/200',
      ]);
    });

    it('names the lesson link as its visible text', async () => {
      const host = await showVideo();
      endVideo();

      const lessonLink = linkNamed(host, 'Revoir la leçon de Rossinante');

      expect(lessonLink.getAttribute('aria-label')).toBeNull();
    });

    it('offers no link to the lesson at the end of the lesson', async () => {
      const host = await showVideo('?videoType=pedagogicalConcept');
      endVideo();

      expect(linkNamed(host, 'Revoir la leçon de Rossinante')).toBeUndefined();
      expect(host.querySelector('a[href*="pedagogicalConcept"]')).toBeNull();
    });

    it('has no axe violation', async () => {
      const host = await showVideo();
      endVideo();
      jasmine.clock().tick(100);
      // axe relies on real timers.
      jasmine.clock().uninstall();

      expect(await axeViolations(host)).toEqual([]);
    });

    it('has no axe violation at the end of the lesson', async () => {
      const host = await showVideo('?videoType=pedagogicalConcept');
      endVideo();
      jasmine.clock().tick(100);
      // axe relies on real timers.
      jasmine.clock().uninstall();

      expect(await axeViolations(host)).toEqual([]);
    });
  });
});
