import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Episode } from '../models';

@Injectable({
  providedIn: 'root',
})
export class EpisodeService {
  private readonly episodeSubject = new BehaviorSubject<Episode | undefined>(
    undefined,
  );
  private readonly quizStepSubject = new BehaviorSubject<number>(0);

  episode$ = this.episodeSubject.asObservable();
  quizStep$ = this.quizStepSubject.asObservable();

  get quizStep() {
    return this.quizStepSubject.getValue();
  }

  setEpisode(episode: Episode) {
    this.episodeSubject.next(episode);
  }

  getEpisode() {
    return this.episodeSubject.getValue();
  }

  incrementQuizStep() {
    this.quizStepSubject.next(this.quizStep + 1);
  }

  resetQuiz() {
    this.quizStepSubject.next(0);
  }
}
