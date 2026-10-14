import { fakeAsync, flushMicrotasks, TestBed } from '@angular/core/testing';
import { AudioService } from './audio.service';

/**
 * Stand-in for `HTMLAudioElement`: a plain DOM node (so it can be appended to
 * the document and receive events) with the media properties the service uses
 * and spies for the media methods. It never loads or plays anything.
 */
interface FakeAudio extends HTMLAudioElement {
  play: jasmine.Spy<() => Promise<void>>;
  pause: jasmine.Spy<() => void>;
  load: jasmine.Spy<() => void>;
}

describe('AudioService', () => {
  let service: AudioService;
  let audioConstructor: jasmine.Spy<(src?: string) => HTMLAudioElement>;
  let createdAudio: FakeAudio[];

  function createFakeAudio(src = ''): FakeAudio {
    const audio = document.createElement('div') as unknown as FakeAudio;
    Object.assign(audio, {
      src,
      loop: false,
      volume: 1,
      muted: false,
      currentTime: 0,
      error: null,
    });
    audio.play = jasmine.createSpy('play').and.resolveTo();
    audio.pause = jasmine.createSpy('pause');
    audio.load = jasmine.createSpy('load');
    createdAudio.push(audio);
    return audio;
  }

  function initMusic(src = '/audio/music.mp3'): FakeAudio {
    service.initBackgroundMusic(src);
    return createdAudio[createdAudio.length - 1];
  }

  function notAllowedError(): DOMException {
    return new DOMException('Autoplay blocked', 'NotAllowedError');
  }

  beforeEach(() => {
    createdAudio = [];
    audioConstructor = spyOn(window, 'Audio').and.callFake(createFakeAudio);
    spyOn(console, 'error');
    spyOn(console, 'log');

    TestBed.configureTestingModule({});
    service = TestBed.inject(AudioService);
  });

  afterEach(() => {
    createdAudio.forEach((audio) => {
      audio.play.and.resolveTo();
      audio.remove();
    });
    // Any autoplay retry still waiting detaches itself on the next interaction.
    document.dispatchEvent(new Event('click'));
  });

  describe('initial state', () => {
    it('is not playing and not muted', () => {
      expect(service.isPlaying()).toBeFalse();
      expect(service.isMuted()).toBeFalse();
    });

    it('has a music volume of 0.05 and a sound effects volume of 0.5', () => {
      let musicVolume: number | undefined;
      let soundEffectsVolume: number | undefined;
      service.musicVolume$.subscribe((volume) => (musicVolume = volume));
      service.soundEffectsVolume$.subscribe(
        (volume) => (soundEffectsVolume = volume),
      );

      expect(service.getVolume()).toBe(0.05);
      expect(service.getMusicVolume()).toBe(0.05);
      expect(musicVolume).toBe(0.05);
      expect(service.getSoundEffectsVolume()).toBe(0.5);
      expect(soundEffectsVolume).toBe(0.5);
    });

    it('emits false on isPlaying$', () => {
      let playing: boolean | undefined;
      service.isPlaying$.subscribe((value) => (playing = value));

      expect(playing).toBeFalse();
    });
  });

  describe('background music', () => {
    it('ignores an empty source', () => {
      service.initBackgroundMusic('');

      expect(audioConstructor).not.toHaveBeenCalled();
    });

    it('creates a looping, hidden audio element appended to the body', () => {
      const music = initMusic('/audio/music.mp3');

      expect(audioConstructor).toHaveBeenCalledOnceWith('/audio/music.mp3');
      expect(music.loop).toBeTrue();
      expect(music.volume).toBe(0.05);
      expect(music.id).toBe('background-music');
      expect(music.getAttribute('aria-hidden')).toBe('true');
      expect(music.parentNode).toBe(document.body);
    });

    it('does not start playing when initialized', () => {
      const music = initMusic();

      expect(music.play).not.toHaveBeenCalled();
      expect(service.isPlaying()).toBeFalse();
    });

    it('reuses the same element and reloads it when initialized again', () => {
      const music = initMusic('/audio/first.mp3');

      service.initBackgroundMusic('/audio/second.mp3');

      expect(audioConstructor).toHaveBeenCalledTimes(1);
      expect(music.src).toBe('/audio/second.mp3');
      expect(music.load).toHaveBeenCalledTimes(1);
    });
  });

  describe('play', () => {
    it('does nothing before the music is initialized', fakeAsync(() => {
      service.play();
      flushMicrotasks();

      expect(service.isPlaying()).toBeFalse();
    }));

    it('restarts the music from the beginning by default', fakeAsync(() => {
      const music = initMusic();
      music.currentTime = 42;

      service.play();
      flushMicrotasks();

      expect(music.currentTime).toBe(0);
      expect(music.play).toHaveBeenCalledTimes(1);
      expect(service.isPlaying()).toBeTrue();
    }));

    it('resumes from the current position when asked not to reset', fakeAsync(() => {
      const music = initMusic();
      music.currentTime = 42;

      service.play(false);
      flushMicrotasks();

      expect(music.currentTime).toBe(42);
      expect(service.isPlaying()).toBeTrue();
    }));

    it('reports playing only once the browser has started playback', fakeAsync(() => {
      const music = initMusic();
      const emitted: boolean[] = [];
      service.isPlaying$.subscribe((value) => emitted.push(value));

      service.play();

      expect(service.isPlaying()).toBeFalse();
      flushMicrotasks();
      expect(emitted).toEqual([false, true]);
      expect(music.play).toHaveBeenCalledTimes(1);
    }));

    it('stays stopped and does not retry when playback fails', fakeAsync(() => {
      const music = initMusic();
      music.play.and.rejectWith(
        new DOMException('Bad file', 'NotSupportedError'),
      );

      service.play();
      flushMicrotasks();
      document.dispatchEvent(new MouseEvent('click'));
      flushMicrotasks();

      expect(service.isPlaying()).toBeFalse();
      expect(music.play).toHaveBeenCalledTimes(1);
    }));

    describe('when autoplay is blocked', () => {
      for (const eventType of ['click', 'touchstart', 'keydown']) {
        it(`retries on the next ${eventType} on the document`, fakeAsync(() => {
          const music = initMusic();
          music.play.and.rejectWith(notAllowedError());

          service.play();
          flushMicrotasks();
          expect(service.isPlaying()).toBeFalse();

          music.play.and.resolveTo();
          document.dispatchEvent(new Event(eventType));
          flushMicrotasks();

          expect(music.play).toHaveBeenCalledTimes(2);
          expect(service.isPlaying()).toBeTrue();
        }));
      }

      it('retries only once, on the first interaction', fakeAsync(() => {
        const music = initMusic();
        music.play.and.rejectWith(notAllowedError());
        service.play();
        flushMicrotasks();

        document.dispatchEvent(new MouseEvent('click'));
        document.dispatchEvent(new KeyboardEvent('keydown'));
        document.dispatchEvent(new Event('touchstart'));
        flushMicrotasks();

        expect(music.play).toHaveBeenCalledTimes(2);
      }));

      it('stays stopped when the retry fails too', fakeAsync(() => {
        const music = initMusic();
        music.play.and.rejectWith(notAllowedError());
        service.play();
        flushMicrotasks();

        document.dispatchEvent(new MouseEvent('click'));
        flushMicrotasks();

        expect(music.play).toHaveBeenCalledTimes(2);
        expect(service.isPlaying()).toBeFalse();
      }));

      it('retries once per blocked attempt on the same interaction', fakeAsync(() => {
        const music = initMusic();
        music.play.and.rejectWith(notAllowedError());
        service.play();
        service.play(false);
        flushMicrotasks();

        music.play.and.resolveTo();
        document.dispatchEvent(new MouseEvent('click'));
        flushMicrotasks();

        expect(music.play).toHaveBeenCalledTimes(4);
      }));

      it('still retries after the music was paused', fakeAsync(() => {
        const music = initMusic();
        music.play.and.rejectWith(notAllowedError());
        service.play();
        flushMicrotasks();
        service.pause();

        music.play.and.resolveTo();
        document.dispatchEvent(new MouseEvent('click'));
        flushMicrotasks();

        expect(music.play).toHaveBeenCalledTimes(2);
        expect(service.isPlaying()).toBeTrue();
      }));
    });
  });

  describe('pause', () => {
    it('does nothing before the music is initialized', () => {
      expect(() => service.pause()).not.toThrow();
      expect(service.isPlaying()).toBeFalse();
    });

    it('pauses the music and reports it stopped', fakeAsync(() => {
      const music = initMusic();
      service.play();
      flushMicrotasks();

      service.pause();

      expect(music.pause).toHaveBeenCalledTimes(1);
      expect(service.isPlaying()).toBeFalse();
    }));
  });

  describe('toggle', () => {
    it('resumes without restarting when stopped', fakeAsync(() => {
      const music = initMusic();
      music.currentTime = 42;

      service.toggle();
      flushMicrotasks();

      expect(music.currentTime).toBe(42);
      expect(service.isPlaying()).toBeTrue();
    }));

    it('pauses when playing', fakeAsync(() => {
      const music = initMusic();
      service.play();
      flushMicrotasks();

      service.toggle();

      expect(music.pause).toHaveBeenCalledTimes(1);
      expect(service.isPlaying()).toBeFalse();
    }));
  });

  describe('mute', () => {
    it('mutes and unmutes the music without pausing it', fakeAsync(() => {
      const music = initMusic();
      service.play();
      flushMicrotasks();

      service.mute();
      expect(music.muted).toBeTrue();
      expect(service.isMuted()).toBeTrue();
      expect(service.isPlaying()).toBeTrue();

      service.unmute();
      expect(music.muted).toBeFalse();
      expect(service.isMuted()).toBeFalse();
    }));

    it('is ignored before the music is initialized', () => {
      service.mute();
      const music = initMusic();

      expect(music.muted).toBeFalse();
      expect(service.isMuted()).toBeFalse();
    });

    it('does not mute sound effects', async () => {
      initMusic();
      service.mute();

      await service.playSoundEffect('/audio/Win 3.mp3');

      expect(createdAudio[1].muted).toBeFalse();
    });
  });

  describe('music volume', () => {
    for (const [setVolume, getVolume] of [
      ['setVolume', 'getVolume'],
      ['setMusicVolume', 'getMusicVolume'],
    ] as const) {
      describe(setVolume, () => {
        it('applies the volume to the music and emits it', () => {
          const music = initMusic();
          const emitted: number[] = [];
          service.musicVolume$.subscribe((volume) => emitted.push(volume));

          service[setVolume](0.3);

          expect(music.volume).toBe(0.3);
          expect(service[getVolume]()).toBe(0.3);
          expect(emitted).toEqual([0.05, 0.3]);
        });

        it('clamps the volume between 0 and 1', () => {
          const music = initMusic();

          service[setVolume](1.5);
          expect(music.volume).toBe(1);

          service[setVolume](-0.5);
          expect(music.volume).toBe(0);
          expect(service[getVolume]()).toBe(0);
        });

        it('is ignored before the music is initialized', () => {
          service[setVolume](0.3);
          const music = initMusic();

          expect(service[getVolume]()).toBe(0.05);
          expect(music.volume).toBe(0.05);
        });
      });
    }
  });

  describe('sound effects', () => {
    it('rejects an empty source without creating an element', async () => {
      await expectAsync(service.playSoundEffect('')).toBeRejectedWithError(
        'Audio source is required',
      );
      expect(audioConstructor).not.toHaveBeenCalled();
    });

    it('plays a hidden element appended to the body, without music', async () => {
      spyOn(Date, 'now').and.returnValue(1234);

      await service.playSoundEffect('/audio/Win 3.mp3');

      const effect = createdAudio[0];
      expect(audioConstructor).toHaveBeenCalledOnceWith('/audio/Win 3.mp3');
      expect(effect.play).toHaveBeenCalledTimes(1);
      expect(effect.volume).toBe(0.5);
      expect(effect.id).toBe('sound-effect-1234');
      expect(effect.getAttribute('aria-hidden')).toBe('true');
      expect(effect.parentNode).toBe(document.body);
      expect(service.getActiveSoundEffectsCount()).toBe(1);
    });

    it('gives the same id to effects started in the same millisecond', async () => {
      spyOn(Date, 'now').and.returnValue(1234);

      await service.playSoundEffect('/audio/Win 3.mp3');
      await service.playSoundEffect('/audio/App Negative.mp3');

      expect(createdAudio.map((effect) => effect.id)).toEqual([
        'sound-effect-1234',
        'sound-effect-1234',
      ]);
    });

    it('leaves the background music untouched', async () => {
      const music = initMusic();
      await service.playSoundEffect('/audio/Win 3.mp3');

      expect(music.pause).not.toHaveBeenCalled();
      expect(music.play).not.toHaveBeenCalled();
    });

    it('uses the volume passed as is', async () => {
      await service.playSoundEffect('/audio/Win 3.mp3', 0.8);

      expect(createdAudio[0].volume).toBe(0.8);
    });

    it('removes the element once it has ended', async () => {
      await service.playSoundEffect('/audio/Win 3.mp3');
      const effect = createdAudio[0];

      effect.dispatchEvent(new Event('ended'));

      expect(effect.parentNode).toBeNull();
      expect(service.getActiveSoundEffectsCount()).toBe(0);
    });

    it('removes the element when it fails to load', async () => {
      await service.playSoundEffect('/audio/Win 3.mp3');
      const effect = createdAudio[0];

      effect.dispatchEvent(new Event('error'));

      expect(effect.parentNode).toBeNull();
      expect(service.getActiveSoundEffectsCount()).toBe(0);
    });

    it('rejects and removes the element when playback fails', async () => {
      const error = notAllowedError();
      // A function expression, not an arrow: the service calls `new Audio()`.
      audioConstructor.and.callFake(function (src?: string) {
        const effect = createFakeAudio(src);
        effect.play.and.rejectWith(error);
        return effect;
      });

      await expectAsync(
        service.playSoundEffect('/audio/Win 3.mp3'),
      ).toBeRejectedWith(error);
      expect(createdAudio[0].parentNode).toBeNull();
      expect(service.getActiveSoundEffectsCount()).toBe(0);
    });

    describe('volume', () => {
      it('clamps the volume between 0 and 1 and emits it', () => {
        const emitted: number[] = [];
        service.soundEffectsVolume$.subscribe((volume) => emitted.push(volume));

        service.setSoundEffectsVolume(1.5);
        service.setSoundEffectsVolume(-0.5);

        expect(service.getSoundEffectsVolume()).toBe(0);
        expect(emitted).toEqual([0.5, 1, 0]);
      });

      it('applies to the effects being played and to the next ones', async () => {
        await service.playSoundEffect('/audio/Win 3.mp3');

        service.setSoundEffectsVolume(0.2);
        await service.playSoundEffect('/audio/App Negative.mp3');

        expect(createdAudio.map((effect) => effect.volume)).toEqual([0.2, 0.2]);
      });

      it('does not change the music volume', () => {
        const music = initMusic();

        service.setSoundEffectsVolume(0.2);

        expect(music.volume).toBe(0.05);
        expect(service.getMusicVolume()).toBe(0.05);
      });
    });

    describe('stopAllSoundEffects', () => {
      it('pauses and rewinds every effect and stops tracking them', async () => {
        await service.playSoundEffect('/audio/Win 3.mp3');
        await service.playSoundEffect('/audio/App Negative.mp3');
        createdAudio.forEach((effect) => (effect.currentTime = 0.4));

        service.stopAllSoundEffects();

        for (const effect of createdAudio) {
          expect(effect.pause).toHaveBeenCalledTimes(1);
          expect(effect.currentTime).toBe(0);
        }
        expect(service.getActiveSoundEffectsCount()).toBe(0);
      });

      it('leaves the stopped elements in the document', async () => {
        await service.playSoundEffect('/audio/Win 3.mp3');

        service.stopAllSoundEffects();

        expect(createdAudio[0].parentNode).toBe(document.body);
      });

      it('stops applying volume changes to the stopped effects', async () => {
        await service.playSoundEffect('/audio/Win 3.mp3');
        service.stopAllSoundEffects();

        service.setSoundEffectsVolume(0.2);

        expect(createdAudio[0].volume).toBe(0.5);
      });
    });
  });

  describe('ngOnDestroy', () => {
    it('stops, empties and removes the background music', fakeAsync(() => {
      const music = initMusic();
      service.play();
      flushMicrotasks();
      service.mute();

      service.ngOnDestroy();

      expect(music.pause).toHaveBeenCalledTimes(1);
      expect(music.src).toBe('');
      expect(music.parentNode).toBeNull();
      expect(service.isMuted()).toBeFalse();
    }));

    it('stops the sound effects', async () => {
      await service.playSoundEffect('/audio/Win 3.mp3');

      service.ngOnDestroy();

      expect(createdAudio[0].pause).toHaveBeenCalledTimes(1);
      expect(service.getActiveSoundEffectsCount()).toBe(0);
    });

    it('completes the observables', () => {
      const completed: string[] = [];
      service.isPlaying$.subscribe({
        complete: () => completed.push('isPlaying$'),
      });
      service.musicVolume$.subscribe({
        complete: () => completed.push('musicVolume$'),
      });
      service.soundEffectsVolume$.subscribe({
        complete: () => completed.push('soundEffectsVolume$'),
      });

      service.ngOnDestroy();

      expect(completed).toEqual([
        'isPlaying$',
        'musicVolume$',
        'soundEffectsVolume$',
      ]);
    });
  });
});
