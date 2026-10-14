import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AudioService implements OnDestroy {
  private backgroundMusic: HTMLAudioElement | null = null;
  private soundEffects: HTMLAudioElement[] = [];
  private backgroundMusicVolume = new BehaviorSubject<number>(0.05);
  private soundEffectsVolume = new BehaviorSubject<number>(0.5);
  private isPlayingSubject = new BehaviorSubject<boolean>(false);

  public isPlaying$ = this.isPlayingSubject.asObservable();
  public musicVolume$ = this.backgroundMusicVolume.asObservable();
  public soundEffectsVolume$ = this.soundEffectsVolume.asObservable();

  initBackgroundMusic(audioSource: string): void {
    if (!audioSource) {
      return;
    }

    if (!this.backgroundMusic) {
      this.backgroundMusic = new Audio(audioSource);
      this.backgroundMusic.loop = true;
      this.backgroundMusic.volume = this.backgroundMusicVolume.value;
      this.backgroundMusic.id = 'background-music';
      this.backgroundMusic.setAttribute('aria-hidden', 'true');
      document.body.appendChild(this.backgroundMusic);

      this.backgroundMusic.addEventListener('error', (e) => {
        console.error('Error loading audio file:', e);
        if (this.backgroundMusic) {
          const errorCodes = [
            'MEDIA_ERR_ABORTED',
            'MEDIA_ERR_NETWORK',
            'MEDIA_ERR_DECODE',
            'MEDIA_ERR_SRC_NOT_SUPPORTED',
          ];
          const error = this.backgroundMusic.error;
          if (error) {
            console.error('Audio error code:', errorCodes[error.code - 1]);
          }
        }
      });
    } else {
      this.backgroundMusic.src = audioSource;
      this.backgroundMusic.load();
    }
  }

  playBackgroundMusic(audioSource: string): void {
    this.initBackgroundMusic(audioSource);
    this.play();
  }

  play(resetToBeginning: boolean = true): void {
    if (!this.backgroundMusic) {
      return;
    }

    if (resetToBeginning) {
      this.backgroundMusic.currentTime = 0;
    }

    const playPromise = this.backgroundMusic.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlayingSubject.next(true);
        })
        .catch((error) => {
          console.error('Error playing background music:', error);

          if (error.name === 'NotAllowedError') {
            console.log(
              'Autoplay prevented. Will try to play on user interaction.',
            );

            const playOnInteraction = () => {
              this.backgroundMusic
                ?.play()
                .then(() => {
                  this.isPlayingSubject.next(true);
                })
                .catch((e) => console.error('Still could not play audio:', e));

              ['click', 'touchstart', 'keydown'].forEach((event) => {
                document.removeEventListener(event, playOnInteraction);
              });
            };

            ['click', 'touchstart', 'keydown'].forEach((event) => {
              document.addEventListener(event, playOnInteraction, {
                once: true,
              });
            });
          }
        });
    }
  }

  pause(): void {
    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.pause();
    this.isPlayingSubject.next(false);
  }

  toggle(): void {
    if (this.isPlayingSubject.value) {
      this.pause();
    } else {
      this.play(false);
    }
  }

  setVolume(volume: number): void {
    if (!this.backgroundMusic) {
      return;
    }

    const newVolume = Math.min(Math.max(volume, 0), 1);
    this.backgroundMusic.volume = newVolume;
    this.backgroundMusicVolume.next(newVolume);
  }

  getVolume(): number {
    return this.backgroundMusicVolume.value;
  }

  /**
   * Set volume for background music
   * @param volume - Volume level (0-1)
   */
  setMusicVolume(volume: number): void {
    if (!this.backgroundMusic) {
      return;
    }

    const newVolume = Math.min(Math.max(volume, 0), 1);
    this.backgroundMusic.volume = newVolume;
    this.backgroundMusicVolume.next(newVolume);
  }

  /**
   * Get the current background music volume
   */
  getMusicVolume(): number {
    return this.backgroundMusicVolume.value;
  }

  /**
   * Set volume for sound effects
   * @param volume - Volume level (0-1)
   */
  setSoundEffectsVolume(volume: number): void {
    const newVolume = Math.min(Math.max(volume, 0), 1);
    this.soundEffectsVolume.next(newVolume);
    
    // Update volume for all currently playing sound effects
    this.soundEffects.forEach(sound => {
      sound.volume = newVolume;
    });
  }

  /**
   * Get the current sound effects volume
   */
  getSoundEffectsVolume(): number {
    return this.soundEffectsVolume.value;
  }

  isPlaying(): boolean {
    return this.isPlayingSubject.value;
  }

  mute(): void {
    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.muted = true;
  }

  unmute(): void {
    if (!this.backgroundMusic) {
      return;
    }

    this.backgroundMusic.muted = false;
  }

  isMuted(): boolean {
    return this.backgroundMusic?.muted ?? false;
  }

  /**
   * Play a one-shot sound effect while background music continues playing
   * @param audioSource - The path to the sound effect audio file
   * @param volume - Optional volume for the sound effect (0-1), defaults to sound effects volume
   * @returns Promise that resolves when the sound starts playing
   */
  playSoundEffect(audioSource: string, volume?: number): Promise<void> {
    if (!audioSource) {
      return Promise.reject(new Error('Audio source is required'));
    }

    const soundEffect = new Audio(audioSource);
    soundEffect.volume = volume ?? this.soundEffectsVolume.value;
    soundEffect.id = `sound-effect-${Date.now()}`;
    soundEffect.setAttribute('aria-hidden', 'true');
    
    // Add to tracking array
    this.soundEffects.push(soundEffect);

    // Clean up when the sound finishes playing
    const cleanup = () => {
      const index = this.soundEffects.indexOf(soundEffect);
      if (index > -1) {
        this.soundEffects.splice(index, 1);
      }
      
      if (soundEffect.parentNode) {
        soundEffect.parentNode.removeChild(soundEffect);
      }
      
      soundEffect.removeEventListener('ended', cleanup);
      soundEffect.removeEventListener('error', cleanup);
    };

    soundEffect.addEventListener('ended', cleanup);
    soundEffect.addEventListener('error', cleanup);

    // Add error handling
    soundEffect.addEventListener('error', (e) => {
      console.error('Error playing sound effect:', e);
      cleanup();
    });

    document.body.appendChild(soundEffect);

    return soundEffect.play().catch((error) => {
      console.error('Error playing sound effect:', error);
      cleanup();
      throw error;
    });
  }

  /**
   * Stop all currently playing sound effects
   */
  stopAllSoundEffects(): void {
    this.soundEffects.forEach(sound => {
      sound.pause();
      sound.currentTime = 0;
    });
    this.soundEffects = [];
  }

  /**
   * Get the number of currently playing sound effects
   */
  getActiveSoundEffectsCount(): number {
    return this.soundEffects.length;
  }

  ngOnDestroy(): void {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.src = '';

      if (this.backgroundMusic.parentNode) {
        this.backgroundMusic.parentNode.removeChild(this.backgroundMusic);
      }

      this.backgroundMusic = null;
    }

    // Clean up all sound effects
    this.stopAllSoundEffects();

    this.isPlayingSubject.complete();
    this.backgroundMusicVolume.complete();
    this.soundEffectsVolume.complete();
  }
}
