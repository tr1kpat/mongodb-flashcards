/// <reference types="vite/client" />
import type { Card, Topic } from '../types';
import { getAllCards, upsertCards, upsertTopics } from './db';
import { validateSeedFile } from './import';

const seedModules = import.meta.glob('/content/*.json', { eager: true });

export type SeedSummary = {
  /** True only on a totally fresh install (no cards in IndexedDB before). */
  freshInstall: boolean;
  /** True if any new topic-card-batches were inserted (delta-seed). */
  deltaSeeded: boolean;
  topics: Topic[];
  cardsAdded: Card[];
  topicsWithNewCards: string[];
  errors: string[];
};

export const collectSeed = (): { topics: Topic[]; cards: Card[]; errors: string[] } => {
  const topics: Topic[] = [];
  const cards: Card[] = [];
  const errors: string[] = [];
  for (const [path, mod] of Object.entries(seedModules)) {
    const raw = (mod as { default: unknown }).default;
    const report = validateSeedFile(raw, path);
    errors.push(...report.errors);
    topics.push(...report.topics);
    cards.push(...report.cards);
  }
  return { topics, cards, errors };
};

/**
 * Seed strategy:
 * - Topic metadata is always upserted, so schema additions (e.g. new `ref`,
 *   description tweaks, status flips from 'planned' → 'active') propagate.
 * - Card seeding is per-topic delta: if IndexedDB has zero cards for a topic
 *   and the seed file ships cards for it, those cards are inserted. Topics
 *   that already have cards are left alone — we never wipe user reviews.
 *
 * This means the very first launch behaves like a fresh install (everything
 * lands), and adding a new topic JSON later automatically populates that
 * topic on next reload.
 */
export const seedIfEmpty = async (): Promise<SeedSummary> => {
  const existingCards = await getAllCards();
  const { topics, cards, errors } = collectSeed();

  if (topics.length) await upsertTopics(topics);

  const existingByTopic = new Map<string, number>();
  for (const c of existingCards) {
    existingByTopic.set(c.topicId, (existingByTopic.get(c.topicId) ?? 0) + 1);
  }

  const cardsToInsert: Card[] = [];
  const topicsWithNewCards = new Set<string>();
  for (const card of cards) {
    if ((existingByTopic.get(card.topicId) ?? 0) === 0) {
      cardsToInsert.push(card);
      topicsWithNewCards.add(card.topicId);
    }
  }

  if (cardsToInsert.length) await upsertCards(cardsToInsert);

  return {
    freshInstall: existingCards.length === 0,
    deltaSeeded: cardsToInsert.length > 0,
    topics,
    cardsAdded: cardsToInsert,
    topicsWithNewCards: Array.from(topicsWithNewCards),
    errors,
  };
};
