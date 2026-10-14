import { Component, inject } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  provideRouter,
  Router,
  RouterOutlet,
  Routes,
} from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';

/**
 * Renders the name of the component its route points to, then a nested
 * outlet. Each component has its own spec: this one only checks which
 * screens a URL displays, without running their fetch, Vimeo player or
 * timers.
 */
@Component({
  imports: [RouterOutlet],
  template: '<p class="screen">{{ name }}</p><router-outlet />',
})
class ScreenStubComponent {
  protected readonly name = inject(ActivatedRoute).snapshot.data['component'];
}

function withStubs(config: Routes): Routes {
  return config.map((route) => ({
    ...route,
    ...(route.component && {
      component: ScreenStubComponent,
      data: { ...route.data, component: route.component.name },
    }),
    children: route.children && withStubs(route.children),
  }));
}

describe('routes', () => {
  let harness: RouterTestingHarness;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter(withStubs(routes))],
    });
    harness = await RouterTestingHarness.create();
  });

  function screens(): string[] {
    const element: HTMLElement = harness.fixture.nativeElement;
    return Array.from(
      element.querySelectorAll('.screen'),
      (screen) => screen.textContent ?? '',
    );
  }

  function episodeNumber(): string | undefined {
    const router = TestBed.inject(Router);
    return router.routerState.snapshot.root.firstChild?.params['episodeNumber'];
  }

  for (const [url, screen] of [
    ['/3', 'EpisodeTitleScreenComponent'],
    ['/3/video', 'EpisodeVideoComponent'],
    ['/3/video?videoType=clue&clue=1', 'EpisodeVideoComponent'],
    ['/3/quiz', 'EpisodeQuizComponent'],
    ['/3/completion', 'EpisodeCompletionComponent'],
    ['/3/unknown', 'EpisodeTitleScreenComponent'],
    ['/3/quiz/extra', 'EpisodeTitleScreenComponent'],
  ]) {
    it(`shows ${screen} inside the episode for ${url}`, async () => {
      await harness.navigateByUrl(url);

      expect(screens()).toEqual(['EpisodeComponent', screen]);
      expect(episodeNumber()).toBe('3');
    });
  }

  it('takes any first segment as the episode number', async () => {
    await harness.navigateByUrl('/not-a-number');

    expect(screens()).toEqual([
      'EpisodeComponent',
      'EpisodeTitleScreenComponent',
    ]);
    expect(episodeNumber()).toBe('not-a-number');
  });

  it('shows the not found screen without an episode number', async () => {
    await harness.navigateByUrl('/');

    expect(screens()).toEqual(['NotFoundComponent']);
  });
});
