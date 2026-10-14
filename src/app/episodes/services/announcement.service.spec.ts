import { LiveAnnouncer } from '@angular/cdk/a11y';
import { TestBed } from '@angular/core/testing';
import { AnnouncementService } from './announcement.service';

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let liveAnnouncer: jasmine.SpyObj<LiveAnnouncer>;

  beforeEach(() => {
    liveAnnouncer = jasmine.createSpyObj<LiveAnnouncer>('LiveAnnouncer', {
      announce: Promise.resolve(),
    });
    TestBed.configureTestingModule({
      providers: [{ provide: LiveAnnouncer, useValue: liveAnnouncer }],
    });
    service = TestBed.inject(AnnouncementService);
    spyOn(console, 'debug');
  });

  it('announces the message to screen readers with the default politeness', () => {
    service.announce('Vidéo terminée');

    expect(liveAnnouncer.announce).toHaveBeenCalledOnceWith('Vidéo terminée');
  });

  it('announces each message, including a repeated one', () => {
    service.announce('Mise en pause de la vidéo');
    service.announce('Mise en pause de la vidéo');

    expect(liveAnnouncer.announce.calls.allArgs()).toEqual([
      ['Mise en pause de la vidéo'],
      ['Mise en pause de la vidéo'],
    ]);
  });
});
