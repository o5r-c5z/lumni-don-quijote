import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { EpisodeService } from '../../services/episode.service';
import { EpisodeCompletionComponent } from './episode-completion.component';

@Component({ template: '<p>Title screen</p>' })
class TitleScreenStubComponent {}

describe('EpisodeCompletionComponent', () => {
  let harness: RouterTestingHarness;
  let episodeService: EpisodeService;
  let host: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: ':episodeNumber',
            children: [
              { path: 'completion', component: EpisodeCompletionComponent },
              { path: '**', component: TitleScreenStubComponent },
            ],
          },
        ]),
      ],
    });
    episodeService = TestBed.inject(EpisodeService);
    harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/3/completion', EpisodeCompletionComponent);
    host = harness.routeNativeElement!;
  });

  function backLink(): HTMLAnchorElement {
    return host.querySelector('a')!;
  }

  it('congratulates the player', () => {
    expect(host.querySelector('h2')?.textContent).toBe('Bravo !');
    expect(host.querySelector('p')?.textContent).toBe(
      "Vous avez terminé l'épisode !",
    );
  });

  it('links back to the start of the episode', () => {
    expect(backLink().textContent?.trim()).toBe(
      "Retourner au début de l'épisode",
    );
    expect(backLink().getAttribute('href')).toBe('/3');
  });

  it('focuses the link back to the start', () => {
    expect(document.activeElement).toBe(backLink());
  });

  it('resets the quiz and goes back to the title screen on click', async () => {
    episodeService.incrementQuizStep();
    episodeService.incrementQuizStep();

    backLink().click();
    await harness.fixture.whenStable();

    expect(episodeService.quizStep).toBe(0);
    expect(TestBed.inject(Router).url).toBe('/3');
    expect(harness.routeNativeElement?.textContent).toBe('Title screen');
  });

  it('displays the investigation table as a mostly hidden background', () => {
    expect(host.classList).toContain('screen');
    expect(host.style.getPropertyValue('--screen-background-landscape')).toBe(
      'url("/images/landscape/Table_enquete_UI.jpg")',
    );
    expect(host.style.getPropertyValue('--screen-background-portrait')).toBe(
      'url("/images/portrait/Table_enquete_UI.jpg")',
    );
    expect(
      host.style.getPropertyValue('--screen-background-overlay-opacity'),
    ).toBe('0.9');
  });
});
