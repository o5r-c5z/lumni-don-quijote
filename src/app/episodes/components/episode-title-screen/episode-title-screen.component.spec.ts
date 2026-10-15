import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { axeViolations } from '../../../../testing/axe';
import { sleep } from '../../../../testing/timers';
import { Episode } from '../../models';
import { EpisodeService } from '../../services/episode.service';
import { EpisodeTitleScreenComponent } from './episode-title-screen.component';

function createEpisode(title: string): Episode {
  return {
    title,
    // A data URL, so that displaying the background makes no request.
    titleBackground: `data:,${title} background`,
    introduction: { url: 'https://vimeo.com/2', title: 'Introduction' },
    lesson: { url: 'https://vimeo.com/3', title: 'Leçon' },
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

    it('has no background image', async () => {
      const host = await showTitleScreen();

      expect(host.style.getPropertyValue('--screen-background')).toBe('none');
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

    it('links to the episode video only', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      expect(
        links(host).map((link) => [
          link.textContent?.trim(),
          link.getAttribute('href'),
        ]),
      ).toEqual([["Accès à l'épisode", '/3/video']]);
    });

    it('builds the links on top of an unknown child path', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen('/3/unknown');

      expect(links(host).map((link) => link.getAttribute('href'))).toEqual([
        '/3/unknown/video',
      ]);
    });

    it('displays the episode title background', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      expect(getComputedStyle(host, '::before').backgroundImage).toBe(
        'url("data:,La disparition background")',
      );
    });

    it('has no background image when the episode has none', async () => {
      episodeService.setEpisode({
        ...createEpisode('La disparition'),
        titleBackground: '',
      });
      const host = await showTitleScreen();

      expect(host.style.getPropertyValue('--screen-background')).toBe('none');
    });

    it('renders without a background image when the episode lacks the field', async () => {
      // An episode.json may omit the field, whatever the Episode type says.
      const { titleBackground, ...episode } = createEpisode('La disparition');
      episodeService.setEpisode(episode as Episode);
      const host = await showTitleScreen();

      expect(host.querySelector('h1')?.textContent).toBe('La disparition');
      expect(host.style.getPropertyValue('--screen-background')).toBe('none');
    });

    it('shows no background image behind the links', async () => {
      episodeService.setEpisode(createEpisode('La disparition'));
      const host = await showTitleScreen();

      const panel = host.querySelector('nav.episode-title-screen__links')!;
      expect(getComputedStyle(panel).backgroundImage).toBe('none');
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
      links(host)[0].blur();

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
