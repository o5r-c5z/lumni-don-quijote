export interface Episode {
  title: string;
  titleBackground?: string;
  introduction: Video;
  lesson: Video;
  questions: QuizQuestion[];
}

export interface Video {
  url: string;
  title: string;
}

export interface Answer {
  original: string;
  translation?: string;
}

export interface QuizQuestion {
  label: string;
  answers: Answer[];
  correctAnswer: number;
  answerVideo: Video;
}

export enum VideoType {
  Lesson = 'lesson',
  Answer = 'answer',
}
