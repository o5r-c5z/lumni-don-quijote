export interface Episode {
  title: string;
  titleBackground: {
    landscape: string;
    portrait: string;
  };
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
  correctAnswer: number;
  answerVideo: Video;
}

export enum VideoType {
  Lesson = 'lesson',
  Answer = 'answer',
}
