import { CommonModule } from '@angular/common';
import {
  Component,
  HostBinding,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faVolumeHigh, faVolumeXmark } from '@fortawesome/free-solid-svg-icons';
import { distinctUntilChanged, Subscription } from 'rxjs';
import { AnnouncementService } from '../../services/announcement.service';
import { AudioService } from '../../services/audio.service';

const INPUT_TYPES_WITHOUT_LETTER_KEYS = [
  'radio',
  'checkbox',
  'range',
  'submit',
  'color',
  'date',
  'file',
];

@Component({
  selector: 'app-audio-control',
  standalone: true,
  imports: [CommonModule, FontAwesomeModule, FormsModule],
  templateUrl: './audio-control.component.html',
  styleUrl: './audio-control.component.scss',
})
export class AudioControlComponent implements OnInit, OnDestroy {
  private readonly audioService = inject(AudioService);
  private readonly announcementService = inject(AnnouncementService);
  private audioSubscription: Subscription | undefined;

  protected volume = this.audioService.getVolume();
  protected showKeyboardHint = false;
  protected faVolumeXmark = faVolumeXmark;
  protected faVolumeHigh = faVolumeHigh;

  get isPlaying() {
    return this.audioService.isPlaying();
  }

  get isMuted() {
    return this.audioService.isMuted();
  }

  @HostBinding('attr.aria-label')
  get ariaLabel() {
    return 'Contrôle de la musique de fond';
  }

  @HostBinding('attr.role')
  get role() {
    return 'group';
  }

  ngOnInit(): void {
    this.showKeyboardHint = true;
    setTimeout(() => {
      this.showKeyboardHint = false;
    }, 5000);

    this.audioSubscription = this.audioService.isPlaying$
      .pipe(distinctUntilChanged())
      .subscribe((isPlaying) => {
        if (isPlaying) {
          this.announcementService.announce('Lecture de la musique de fond');
        } else {
          this.announcementService.announce(
            'Mise en pause de la musique de fond',
          );
        }
      });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (this.isLetterKeyUsedByFocusedField()) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case 'm':
        this.toggleAudio();
        event.preventDefault();
        break;
    }
  }

  private isLetterKeyUsedByFocusedField(): boolean {
    const focused = document.activeElement;
    return (
      (focused instanceof HTMLInputElement &&
        !INPUT_TYPES_WITHOUT_LETTER_KEYS.includes(focused.type)) ||
      focused instanceof HTMLTextAreaElement ||
      focused instanceof HTMLSelectElement
    );
  }

  protected toggleAudio(): void {
    if (this.isMuted) {
      this.audioService.unmute();
    } else {
      this.audioService.mute();
    }
    this.showKeyboardHint = true;
    setTimeout(() => {
      this.showKeyboardHint = false;
    }, 3000);
  }

  ngOnDestroy(): void {
    if (this.audioSubscription) {
      this.audioSubscription.unsubscribe();
    }
  }
}
