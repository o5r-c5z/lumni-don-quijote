export interface Episode {
  title: string;
  titleBackground: {
    landscape: string;
    portrait: string;
  };
  introduction: Video;
  lesson: Video;
  investigation: Video;
  pedagogicalConcept: Video;
  clues: Video[];
  resolution: Video;
  questions: QuizQuestion[];
}

export interface Video {
  url: string;
  title: string;
}

export interface QuizQuestion {
  label: string;
  answers: string[];
  correctAnswer: number;
  answerVideo: Video;
}

export enum VideoType {
  Investigation = 'investigation',
  PedagogicalConcept = 'pedagogicalConcept',
  Lesson = 'lesson',
  Clue = 'clue',
  Resolution = 'resolution',
  Answer = 'answer',
}
