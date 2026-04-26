import { create } from 'zustand';
import type { Card, ReviewResult, Topic } from '../types';
import * as db from '../lib/db';
import { gradeCard, isDue } from '../lib/srs';

type StudyQueue = {
  cardIds: string[];
  index: number;
  topicId: string | null;
};

type State = {
  cards: Card[];
  topics: Topic[];
  loaded: boolean;
  study: StudyQueue | null;
};

type Actions = {
  loadAll: () => Promise<void>;
  addCard: (card: Card) => Promise<void>;
  updateCard: (card: Card) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  importData: (payload: { topics: Topic[]; cards: Card[] }) => Promise<void>;
  startStudy: (topicId?: string) => void;
  gradeCurrent: (result: ReviewResult) => Promise<Card | null>;
  exitStudy: () => void;
  nextStudyCard: () => void;
};

export const useStore = create<State & Actions>((set, get) => ({
  cards: [],
  topics: [],
  loaded: false,
  study: null,

  loadAll: async () => {
    const [cards, topics] = await Promise.all([db.getAllCards(), db.getAllTopics()]);
    set({ cards, topics, loaded: true });
  },

  addCard: async (card) => {
    await db.upsertCard(card);
    set((s) => ({ cards: [...s.cards.filter((c) => c.id !== card.id), card] }));
  },

  updateCard: async (card) => {
    await db.upsertCard(card);
    set((s) => ({ cards: s.cards.map((c) => (c.id === card.id ? card : c)) }));
  },

  deleteCard: async (id) => {
    await db.deleteCard(id);
    set((s) => ({ cards: s.cards.filter((c) => c.id !== id) }));
  },

  importData: async ({ topics, cards }) => {
    if (topics.length) await db.upsertTopics(topics);
    if (cards.length) await db.upsertCards(cards);
    await get().loadAll();
  },

  startStudy: (topicId) => {
    const { cards, topics } = get();
    const activeTopicIds = new Set(topics.filter((t) => t.status === 'active').map((t) => t.id));
    const pool = cards.filter((c) => {
      if (topicId) return c.topicId === topicId;
      return activeTopicIds.has(c.topicId);
    });
    const due = pool.filter((c) => isDue(c));
    const rest = pool.filter((c) => !isDue(c));
    const queue = [...due, ...rest].slice(0, 20);
    set({
      study: {
        cardIds: queue.map((c) => c.id),
        index: 0,
        topicId: topicId ?? null,
      },
    });
  },

  gradeCurrent: async (result) => {
    const { study, cards } = get();
    if (!study) return null;
    const id = study.cardIds[study.index];
    const card = cards.find((c) => c.id === id);
    if (!card) return null;
    const { updatedCard } = gradeCard(card, result);
    await db.upsertCard(updatedCard);
    set((s) => ({
      cards: s.cards.map((c) => (c.id === updatedCard.id ? updatedCard : c)),
    }));
    return updatedCard;
  },

  nextStudyCard: () => {
    const { study } = get();
    if (!study) return;
    set({ study: { ...study, index: study.index + 1 } });
  },

  exitStudy: () => set({ study: null }),
}));

export const selectActiveTopics = (s: State): Topic[] => s.topics.filter((t) => t.status === 'active');
