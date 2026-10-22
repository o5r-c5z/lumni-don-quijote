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

export interface QuizQuestion {
  label: string;
  answers: string[];
  answerTranslations?: string[];
  correctAnswer: number;
  answerVideo: Video;
}

export enum VideoType {
  Lesson = 'lesson',
  Answer = 'answer',
}
