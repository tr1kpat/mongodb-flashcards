import { describe, expect, it } from 'vitest';
import { addDays, gradeCard, isDue, nextInterval, todayIso } from '../src/lib/srs';
import type { Card } from '../src/types';

const baseCard: Card = {
  id: 'c1',
  topicId: 't1',
  question: 'Q',
  answer: 'A',
  followUpQuestions: [],
  tags: [],
  source: 'manual',
  difficulty: 'medium',
  createdAt: '2026-04-24',
  reviewHistory: [],
};

describe('nextInterval', () => {
  it('starts at 1 on first correct', () => {
    expect(nextInterval(0, 'correct')).toBe(1);
  });
  it('correct multiplies by 2.5 and rounds', () => {
    expect(nextInterval(2, 'correct')).toBe(5);
    expect(nextInterval(4, 'correct')).toBe(10);
  });
  it('partial multiplies by 1.2 and rounds', () => {
    expect(nextInterval(10, 'partial')).toBe(12);
  });
  it('wrong resets to 1', () => {
    expect(nextInterval(30, 'wrong')).toBe(1);
  });
  it('caps at 60', () => {
    expect(nextInterval(40, 'correct')).toBe(60);
  });
  it('floors at 1', () => {
    expect(nextInterval(0, 'partial')).toBe(1);
  });
});

describe('gradeCard', () => {
  it('appends review log and returns next due date', () => {
    const now = new Date('2026-04-24T12:00:00Z');
    const { updatedCard, log, nextDue } = gradeCard(baseCard, 'correct', now);
    expect(updatedCard.reviewHistory).toHaveLength(1);
    expect(log.result).toBe('correct');
    expect(log.interval).toBe(1);
    expect(nextDue).toBe('2026-04-25');
  });

  it('compounds over multiple correct reviews', () => {
    let card = baseCard;
    const now = new Date('2026-04-24T12:00:00Z');
    card = gradeCard(card, 'correct', now).updatedCard;
    card = gradeCard(card, 'correct', now).updatedCard;
    const last = card.reviewHistory[card.reviewHistory.length - 1];
    expect(last.interval).toBeGreaterThan(1);
  });
});

describe('isDue', () => {
  it('is due when no history', () => {
    expect(isDue(baseCard, new Date('2026-04-24T00:00:00Z'))).toBe(true);
  });
  it('is not due when next review is in the future', () => {
    const withReview: Card = {
      ...baseCard,
      reviewHistory: [{ date: '2026-04-24', result: 'correct', interval: 5 }],
    };
    expect(isDue(withReview, new Date('2026-04-25T00:00:00Z'))).toBe(false);
    expect(isDue(withReview, new Date('2026-04-30T00:00:00Z'))).toBe(true);
  });
});

describe('addDays / todayIso', () => {
  it('adds days correctly across month boundary', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
  });
  it('returns ISO date string', () => {
    expect(todayIso(new Date('2026-04-24T23:30:00Z'))).toBe('2026-04-24');
  });
});
