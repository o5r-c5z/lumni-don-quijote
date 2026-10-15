import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { sleep } from '../../../../testing/timers';
import { Episode } from '../../models';
import { AudioService } from '../../services/audio.service';
import { EpisodeService } from '../../services/episode.service';
import { AudioControlComponent } from '../audio-control/audio-control.component';
import { EpisodeComponent } from './episode.component';

function createEpisode(title: string): Episode {
  return {
    title,
    titleBackground: 'background.png',
    introduction: { url: 'https://vimeo.com/2', title: 'Introduction' },
    lesson: { url: 'https://vimeo.com/3', title: 'Leçon' },
    questions: [],
  };
}

function respondWith(body: unknown, init: Partial<Response> = {}): Response {
  return { ok: true, json: async () => body, ...init } as Response;
}

@Component({ selector: 'app-audio-control', template: '' })
class AudioControlStubComponent {}

@Component({ template: '<p>Screen</p>' })
class ScreenStubComponent {}

@Component({ template: '<p>Not found</p>' })
class NotFoundStubComponent {}

describe('EpisodeComponent', () => {
  let harness: RouterTestingHarness;
  let audioService: jasmine.SpyObj<AudioService>;
  let episodeService: EpisodeService;
  let fetchSpy: jasmine.Spy<typeof fetch>;

  beforeEach(async () => {
    audioService = jasmine.createSpyObj<AudioService>('AudioService', [
      'initBackgroundMusic',
      'playBackgroundMusic',
      'play',
      'pause',
      'isPlaying',
    ]);
    audioService.isPlaying.and.returnValue(false);
    fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      respondWith(createEpisode(`Episode from ${input}`)),
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: ':episodeNumber',
            component: EpisodeComponent,
            children: [
              { path: 'video', component: ScreenStubComponent },
              { path: 'quiz', component: ScreenStubComponent },
              { path: 'completion', component: ScreenStubComponent },
              { path: '**', component: ScreenStubComponent },
            ],
          },
          { path: '**', component: NotFoundStubComponent },
        ]),
        { provide: AudioService, useValue: audioService },
      ],
    });
    TestBed.overrideComponent(EpisodeComponent, {
      remove: { imports: [AudioControlComponent] },
      add: { imports: [AudioControlStubComponent] },
    });
    episodeService = TestBed.inject(EpisodeService);
    harness = await RouterTestingHarness.create();
  });

  async function navigate(url: string): Promise<void> {
    await harness.navigateByUrl(url);
    await sleep();
    await harness.fixture.whenStable();
  }

  function rendered(): HTMLElement {
    return harness.fixture.nativeElement;
  }

  it('renders the current screen and the audio control', async () => {
    await navigate('/3');

    const episode = rendered().querySelector('app-episode')!;
    expect(episode.querySelector('router-outlet + *')?.textContent).toBe(
      'Screen',
    );
    expect(episode.lastElementChild?.tagName).toBe('APP-AUDIO-CONTROL');
  });

  describe('background music', () => {
    it('plays the background track once when the episode opens on the title screen', async () => {
      // The NavigationEnd subscription starts in ngOnInit, which runs after
      // the initial navigation has ended.
      await navigate('/3');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Entertainment_FOND_SONORE.mp3'],
      ]);
    });

    it('loads and starts no track other than the screen music when the episode opens', async () => {
      await navigate('/3');

      expect(audioService.initBackgroundMusic).not.toHaveBeenCalled();
      expect(audioService.play).not.toHaveBeenCalled();
    });

    it('plays no music when the episode opens on the video', async () => {
      await navigate('/3/video');

      expect(audioService.playBackgroundMusic).not.toHaveBeenCalled();
      expect(audioService.play).not.toHaveBeenCalled();
    });

    it('plays the quiz music when going to the quiz', async () => {
      await navigate('/3');
      audioService.playBackgroundMusic.calls.reset();

      await navigate('/3/quiz');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Guitar Background Mini_QUIZ.mp3'],
      ]);
    });

    it('plays the quiz music when going to the quiz with "/video" in a query parameter', async () => {
      await navigate('/3');
      audioService.playBackgroundMusic.calls.reset();

      await navigate('/3/quiz?from=/video');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Guitar Background Mini_QUIZ.mp3'],
      ]);
    });

    it('plays the quiz music, not the background track, when the episode opens on the quiz', async () => {
      await navigate('/3/quiz');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Guitar Background Mini_QUIZ.mp3'],
      ]);
    });

    it('plays the background track again when going from the quiz to the completion screen', async () => {
      await navigate('/3/quiz');
      audioService.playBackgroundMusic.calls.reset();

      await navigate('/3/completion');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Entertainment_FOND_SONORE.mp3'],
      ]);
    });

    it('plays the background track again when going back from the quiz to the title screen', async () => {
      await navigate('/3/quiz');
      audioService.playBackgroundMusic.calls.reset();

      await navigate('/3');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Entertainment_FOND_SONORE.mp3'],
      ]);
    });

    it('plays the background track when going to a title screen whose URL merely contains "/video"', async () => {
      await navigate('/3/quiz');
      audioService.playBackgroundMusic.calls.reset();

      // Not the video screen: the wildcard route shows the title screen.
      await navigate('/3/video/extra');

      expect(audioService.playBackgroundMusic.calls.allArgs()).toEqual([
        ['/audio/Entertainment_FOND_SONORE.mp3'],
      ]);
    });

    it('pauses it when the episode closes', async () => {
      await navigate('/3');
      expect(audioService.pause).not.toHaveBeenCalled();

      await navigate('/');

      expect(audioService.pause).toHaveBeenCalledTimes(1);
    });

    it('stops following the navigation once the episode is closed', async () => {
      await navigate('/3');
      await navigate('/');
      audioService.playBackgroundMusic.calls.reset();

      await navigate('/?query=1');

      expect(audioService.playBackgroundMusic).not.toHaveBeenCalled();
    });
  });

  describe('episode loading', () => {
    it('fetches the episode of the URL and shares it', async () => {
      await navigate('/3');

      expect(fetchSpy).toHaveBeenCalledOnceWith(
        'uploads/episodes/3/episode.json',
      );
      expect(episodeService.getEpisode()?.title).toBe(
        'Episode from uploads/episodes/3/episode.json',
      );
    });

    it('does not fetch it again on a screen change', async () => {
      await navigate('/3');

      await navigate('/3/quiz');

      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    it('loads another episode when the episode number changes', async () => {
      await navigate('/3');

      await navigate('/4');

      expect(fetchSpy.calls.allArgs()).toEqual([
        ['uploads/episodes/3/episode.json'],
        ['uploads/episodes/4/episode.json'],
      ]);
      expect(episodeService.getEpisode()?.title).toBe(
        'Episode from uploads/episodes/4/episode.json',
      );
    });

    it('shares the response that arrives last, even for a previous episode', async () => {
      const resolvers = new Map<string, (response: Response) => void>();
      fetchSpy.and.callFake(
        (input) =>
          new Promise((resolve) => resolvers.set(String(input), resolve)),
      );
      await navigate('/3');
      await navigate('/4');

      resolvers.get('uploads/episodes/4/episode.json')!(
        respondWith(createEpisode('Episode 4')),
      );
      await sleep();
      resolvers.get('uploads/episodes/3/episode.json')!(
        respondWith(createEpisode('Episode 3')),
      );
      await sleep();

      expect(TestBed.inject(Router).url).toBe('/4');
      expect(episodeService.getEpisode()?.title).toBe('Episode 3');
    });

    it('fetches a NaN episode for a non numeric episode number', async () => {
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));

      await navigate('/abc');

      expect(fetchSpy).toHaveBeenCalledOnceWith(
        'uploads/episodes/NaN/episode.json',
      );
    });

    it('shares the body of an unsuccessful response', async () => {
      fetchSpy.and.resolveTo(
        respondWith(createEpisode('Not found body'), {
          ok: false,
          status: 404,
        }),
      );

      await navigate('/3');

      expect(episodeService.getEpisode()?.title).toBe('Not found body');
      expect(TestBed.inject(Router).url).toBe('/3');
    });

    it('goes to the not found screen when the fetch fails', async () => {
      fetchSpy.and.rejectWith(new TypeError('Failed to fetch'));

      await navigate('/3');

      expect(TestBed.inject(Router).url).toBe('/');
      expect(rendered().textContent).toBe('Not found');
      expect(episodeService.getEpisode()).toBeUndefined();
    });

    it('goes to the not found screen when the body is not JSON', async () => {
      fetchSpy.and.resolveTo(
        respondWith(undefined, {
          json: () => Promise.reject(new SyntaxError('Unexpected token')),
        }),
      );

      await navigate('/3');

      expect(TestBed.inject(Router).url).toBe('/');
      expect(episodeService.getEpisode()).toBeUndefined();
    });
  });
});
