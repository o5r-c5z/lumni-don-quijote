import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../testing/axe';
import { sleep } from '../../../../testing/timers';
import { Episode } from '../../models';
import { EpisodeService } from '../../services/episode.service';
import { EpisodeTitleScreenComponent } from './episode-title-screen.component';

function createEpisode(title: string): Episode {
  const video = { url: 'https://vimeo.com/1', title: 'Video' };
  return {
    title,
    // Data URLs, so that displaying the background makes no request.
    titleBackground: {
      landscape: `data:,${title} landscape`,
      portrait: `data:,${title} portrait`,
    },
    investigation: video,
    pedagogicalConcept: video,
    clues: [video],
    resolution: video,
    questions: [],
  };
}

describe('EpisodeTitleScreenComponent', () => {
  let harness: RouterTestingHarness;
  let episodeService: EpisodeService;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: ':episodeNumber',
            children: [{ path: '**', component: EpisodeTitleScreenComponent }],
          },
        ]),
      ],
    });
    episodeService = TestBed.inject(EpisodeService);
    harness = await RouterTestingHarness.create();
  });

  // Lets the focus timer of the last displayed episode run before teardown.
  afterEach(() => sleep());

  async function showTitleScreen(url = '/3'): Promise<HTMLElement> {
    await harness.navigateByUrl(url, EpisodeTitleScreenComponent);
    return harness.routeNativeElement!;
  }

  function links(host: HTMLElement): HTMLAnchorElement[] {
    return Array.from(host.querySelectorAll('a'));
  }

  describe('before the episode is loaded', () => {
    it('renders nothing', async () => {
      const host = await showTitleScreen();

      expect(host.children.length).toBe(0);
    });

    it('points the background at an "undefined" image', async () => {
      const host = await showTitleScreen();

      expect(host.style.getPropertyValue('--screen-background-landscape')).toBe(
        'url("undefined")',
      );
      expect(host.style.getPropertyValue('--screen-background-portrait')).toBe(
        'url("undefined")',
      );
    });
  });

  describe('once the episode is loaded', () => {
    it('gives the episode title to screen readers only', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      const title = host.querySelector('h1');
      expect(title?.textContent).toBe('La disparition');
      expect(title?.classList).toContain('cdk-visually-hidden');
    });

    it('links to the episode video and to the quiz', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      expect(
        links(host).map((link) => [
          link.textContent?.trim(),
          link.getAttribute('href'),
        ]),
      ).toEqual([
        ["Accès à l'épisode", '/3/video'],
        ["Accès au quiz de l'épisode", '/3/quiz'],
      ]);
    });

    it('builds the links on top of an unknown child path', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen('/3/unknown');

      expect(links(host).map((link) => link.getAttribute('href'))).toEqual([
        '/3/unknown/video',
        '/3/unknown/quiz',
      ]);
    });

    it('displays the episode title background', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      expect(host.classList).toContain('screen');
      expect(host.style.getPropertyValue('--screen-background-landscape')).toBe(
        'url("data:,La disparition landscape")',
      );
      expect(host.style.getPropertyValue('--screen-background-portrait')).toBe(
        'url("data:,La disparition portrait")',
      );
    });

    it('focuses the link to the episode', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      await sleep();

      expect(document.activeElement).toBe(links(host)[0]);
    });

    it('shows the episode loaded after the screen is displayed', async () => {
      const host = await showTitleScreen();

      episodeService.setEpisode(createEpisode('La disparition'));
      harness.detectChanges();
      await sleep();

      expect(host.querySelector('h1')?.textContent).toBe('La disparition');
      expect(document.activeElement).toBe(links(host)[0]);
    });

    it('shows and focuses again when another episode is set', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();
      await sleep();
      links(host)[1].focus();

      episodeService.setEpisode(createEpisode('Le vol'));
      harness.detectChanges();
      await sleep();

      expect(host.querySelector('h1')?.textContent).toBe('Le vol');
      expect(document.activeElement).toBe(links(host)[0]);
    });

    it('has no axe violation', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      expect(await axeViolations(host)).toEqual([]);
    });
  });
});
