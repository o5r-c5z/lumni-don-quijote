import {
  ComponentFixture,
  fakeAsync,
  flush,
  TestBed,
  tick,
} from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';
import { axeViolations } from '../../../../testing/axe';
import { AnnouncementService } from '../../services/announcement.service';
import { AudioService } from '../../services/audio.service';
import { AudioControlComponent } from './audio-control.component';

/** The part of `AudioService` the control uses, with a mute state. */
class FakeAudioService {
  readonly isPlaying$ = new BehaviorSubject(false);
  private muted = false;

  readonly mute = jasmine.createSpy('mute').and.callFake(() => {
    this.muted = true;
  });
  readonly unmute = jasmine.createSpy('unmute').and.callFake(() => {
    this.muted = false;
  });

  getVolume(): number {
    return 0.05;
  }

  isPlaying(): boolean {
    return this.isPlaying$.value;
  }

  isMuted(): boolean {
    return this.muted;
  }
}

describe('AudioControlComponent', () => {
  let audioService: FakeAudioService;
  let announcementService: jasmine.SpyObj<AnnouncementService>;
  let fixture: ComponentFixture<AudioControlComponent>;
  let host: HTMLElement;

  beforeEach(() => {
    audioService = new FakeAudioService();
    announcementService = jasmine.createSpyObj<AnnouncementService>(
      'AnnouncementService',
      ['announce'],
    );
    TestBed.configureTestingModule({
      providers: [
        { provide: AudioService, useValue: audioService },
        { provide: AnnouncementService, useValue: announcementService },
      ],
    });
  });

  afterEach(() => {
    fixture?.destroy();
  });

  function createComponent({ playing = true } = {}): void {
    audioService.isPlaying$.next(playing);
    fixture = TestBed.createComponent(AudioControlComponent);
    host = fixture.nativeElement;
    fixture.detectChanges();
  }

  function button(): HTMLButtonElement | null {
    return host.querySelector('button');
  }

  function hint(): string | undefined {
    return host
      .querySelector('.audio-control__keyboard-hint')
      ?.textContent?.trim();
  }

  function pressKey(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      key,
      cancelable: true,
      ...init,
    });
    document.dispatchEvent(event);
    fixture.detectChanges();
    return event;
  }

  it('is a group labelled for the background music', () => {
    createComponent();

    expect(host.getAttribute('role')).toBe('group');
    expect(host.getAttribute('aria-label')).toBe(
      'Contrôle de la musique de fond',
    );
  });

  describe('announcements', () => {
    it('announces that the music is paused as soon as it is displayed', () => {
      createComponent({ playing: false });

      expect(announcementService.announce).toHaveBeenCalledOnceWith(
        'Mise en pause de la musique de fond',
      );
    });

    it('announces each change of the playing state once', () => {
      createComponent({ playing: false });

      audioService.isPlaying$.next(true);
      audioService.isPlaying$.next(true);
      audioService.isPlaying$.next(false);

      expect(announcementService.announce.calls.allArgs()).toEqual([
        ['Mise en pause de la musique de fond'],
        ['Lecture de la musique de fond'],
        ['Mise en pause de la musique de fond'],
      ]);
    });

    it('announces nothing when the music is muted', () => {
      createComponent();
      announcementService.announce.calls.reset();

      button()!.click();

      expect(announcementService.announce).not.toHaveBeenCalled();
    });

    it('stops announcing once destroyed', () => {
      createComponent();
      announcementService.announce.calls.reset();

      fixture.destroy();
      audioService.isPlaying$.next(false);

      expect(announcementService.announce).not.toHaveBeenCalled();
    });
  });

  describe('button', () => {
    it('is hidden while the music is not playing', () => {
      createComponent({ playing: false });

      expect(button()).toBeNull();
    });

    it('appears when the music starts playing', () => {
      createComponent({ playing: false });

      audioService.isPlaying$.next(true);
      fixture.detectChanges();

      expect(button()).not.toBeNull();
    });

    it('is labelled "Activer le son", not pressed, while the sound is on', () => {
      createComponent();

      expect(button()!.getAttribute('aria-label')).toBe('Activer le son');
      expect(button()!.getAttribute('aria-pressed')).toBe('false');
      expect(button()!.querySelector('svg')?.getAttribute('data-icon')).toBe(
        'volume-high',
      );
    });

    it('mutes the music when clicked', () => {
      createComponent();

      button()!.click();
      fixture.detectChanges();

      expect(audioService.mute).toHaveBeenCalledTimes(1);
      expect(button()!.getAttribute('aria-label')).toBe('Désactiver le son');
      expect(button()!.getAttribute('aria-pressed')).toBe('true');
      expect(button()!.querySelector('svg')?.getAttribute('data-icon')).toBe(
        'volume-xmark',
      );
    });

    it('unmutes the music when clicked again', () => {
      createComponent();

      button()!.click();
      button()!.click();
      fixture.detectChanges();

      expect(audioService.unmute).toHaveBeenCalledTimes(1);
      expect(button()!.getAttribute('aria-label')).toBe('Activer le son');
      expect(button()!.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('M shortcut', () => {
    for (const key of ['m', 'M']) {
      it(`toggles the sound on "${key}" and prevents its default action`, () => {
        createComponent();

        const event = pressKey(key);
        expect(event.defaultPrevented).toBeTrue();
        expect(audioService.mute).toHaveBeenCalledTimes(1);
        expect(button()!.getAttribute('aria-pressed')).toBe('true');

        pressKey(key);
        expect(audioService.unmute).toHaveBeenCalledTimes(1);
      });
    }

    it('also reacts with a modifier key', () => {
      createComponent();

      pressKey('m', { ctrlKey: true });

      expect(audioService.mute).toHaveBeenCalledTimes(1);
    });

    it('ignores the other keys', () => {
      createComponent();

      const event = pressKey('n');

      expect(event.defaultPrevented).toBeFalse();
      expect(audioService.mute).not.toHaveBeenCalled();
    });

    it('works while the music is not playing and the button is hidden', () => {
      createComponent({ playing: false });

      pressKey('m');

      expect(audioService.mute).toHaveBeenCalledTimes(1);
    });

    describe('while a form field has the focus', () => {
      let field: HTMLElement;

      afterEach(() => field?.remove());

      for (const [description, create] of [
        ['a text input', () => document.createElement('input')],
        [
          'a radio button',
          () =>
            Object.assign(document.createElement('input'), { type: 'radio' }),
        ],
        ['a textarea', () => document.createElement('textarea')],
        ['a select', () => document.createElement('select')],
      ] as const) {
        it(`is ignored in ${description}`, () => {
          createComponent();
          field = create();
          document.body.appendChild(field);
          field.focus();

          const event = pressKey('m');

          expect(event.defaultPrevented).toBeFalse();
          expect(audioService.mute).not.toHaveBeenCalled();
        });
      }
    });
  });

  describe('keyboard hint', () => {
    const hintText = "Raccourci clavier: 'M' pour activer/désactiver le son";

    it('is shown for 5 seconds when displayed', fakeAsync(() => {
      createComponent();
      expect(hint()).toBe(hintText);

      tick(4999);
      fixture.detectChanges();
      expect(hint()).toBe(hintText);

      tick(1);
      fixture.detectChanges();
      expect(hint()).toBeUndefined();
    }));

    it('is not shown while the music is not playing', fakeAsync(() => {
      createComponent({ playing: false });

      expect(hint()).toBeUndefined();
      flush();
    }));

    it('is shown again for 3 seconds after a toggle', fakeAsync(() => {
      createComponent();
      tick(5000);

      pressKey('m');
      expect(hint()).toBe(hintText);

      tick(2999);
      fixture.detectChanges();
      expect(hint()).toBe(hintText);

      tick(1);
      fixture.detectChanges();
      expect(hint()).toBeUndefined();
    }));

    it('is hidden by an earlier timer still running', fakeAsync(() => {
      createComponent();
      tick(4000);

      pressKey('m');
      tick(1000);
      fixture.detectChanges();

      expect(hint()).toBeUndefined();
      flush();
    }));
  });

  it('has no axe violation while the music plays', async () => {
    // axe needs real timers, so the test cannot be `fakeAsync`: the mock
    // clock captures the keyboard hint timer instead, and discards it on
    // uninstall rather than letting it fire during a later test.
    jasmine.clock().install();
    try {
      createComponent();
    } finally {
      jasmine.clock().uninstall();
    }

    expect(await axeViolations(host)).toEqual([]);
  });
});
