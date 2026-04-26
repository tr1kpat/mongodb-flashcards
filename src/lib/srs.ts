import type { Card, ReviewLog, ReviewResult } from '../types';

const MIN_INTERVAL = 1;
const MAX_INTERVAL = 60;

export const todayIso = (now: Date = new Date()): string => {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addDays = (iso: string, days: number): string => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return todayIso(date);
};

export const currentInterval = (card: Pick<Card, 'reviewHistory'>): number => {
  const last = card.reviewHistory[card.reviewHistory.length - 1];
  return last ? last.interval : 0;
};

export const nextInterval = (
  prevInterval: number,
  result: ReviewResult,
): number => {
  let next: number;
  switch (result) {
    case 'correct':
      next = prevInterval <= 0 ? MIN_INTERVAL : prevInterval * 2.5;
      break;
    case 'partial':
      next = prevInterval <= 0 ? MIN_INTERVAL : prevInterval * 1.2;
      break;
    case 'wrong':
      next = MIN_INTERVAL;
      break;
  }
  next = Math.round(next);
  if (next < MIN_INTERVAL) next = MIN_INTERVAL;
  if (next > MAX_INTERVAL) next = MAX_INTERVAL;
  return next;
};

export type GradeOutcome = {
  log: ReviewLog;
  nextDue: string;
  updatedCard: Card;
};

export const gradeCard = (
  card: Card,
  result: ReviewResult,
  now: Date = new Date(),
): GradeOutcome => {
  const prev = currentInterval(card);
  const interval = nextInterval(prev, result);
  const dateIso = todayIso(now);
  const log: ReviewLog = { date: dateIso, result, interval };
  const updatedCard: Card = {
    ...card,
    reviewHistory: [...card.reviewHistory, log],
  };
  return {
    log,
    nextDue: addDays(dateIso, interval),
    updatedCard,
  };
};

export const dueDate = (card: Card): string => {
  const last = card.reviewHistory[card.reviewHistory.length - 1];
  if (!last) {
    return todayIso(new Date(card.createdAt));
  }
  return addDays(last.date, last.interval);
};

export const isDue = (card: Card, now: Date = new Date()): boolean => {
  return dueDate(card) <= todayIso(now);
};

export const isMastered = (card: Card): boolean => {
  const last = card.reviewHistory[card.reviewHistory.length - 1];
  return !!last && last.result === 'correct' && last.interval >= 14;
};

/** Confidence score 0–100 weighted across the last 5 reviews. */
export const confidence = (card: Card): number => {
  const recent = card.reviewHistory.slice(-5);
  if (!recent.length) return 0;
  const weights = recent.map((_, i) => i + 1);
  const wsum = weights.reduce((a, b) => a + b, 0);
  const score = recent.reduce((acc, log, i) => {
    const v = log.result === 'correct' ? 1 : log.result === 'partial' ? 0.5 : 0;
    return acc + v * weights[i];
  }, 0);
  return Math.round((score / wsum) * 100);
};

export const MIN_INTERVAL_DAYS = MIN_INTERVAL;
export const MAX_INTERVAL_DAYS = MAX_INTERVAL;
