export type TopicStatus = 'active' | 'planned';

export type Topic = {
  id: string;
  name: string;
  description: string;
  status: TopicStatus;
  ref?: string;
};

export type CardSource = 'chat' | 'artifact' | 'notion' | 'manual';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type ReviewResult = 'correct' | 'partial' | 'wrong';

export type ReviewLog = {
  date: string;
  result: ReviewResult;
  interval: number;
};

export type Card = {
  id: string;
  topicId: string;
  question: string;
  answer: string;
  followUpQuestions: string[];
  tags: string[];
  source: CardSource;
  difficulty: Difficulty;
  createdAt: string;
  reviewHistory: ReviewLog[];
};

export type SeedFile = {
  topic: Topic;
  cards: Array<Omit<Card, 'reviewHistory' | 'createdAt'> & {
    createdAt?: string;
    reviewHistory?: ReviewLog[];
  }>;
};
