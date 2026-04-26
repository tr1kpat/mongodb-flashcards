import { describe, expect, it } from 'vitest';
import topic1 from '../content/topic-1-mongodb.json';
import topic2 from '../content/topic-2-fullstack.json';
import topic3 from '../content/topic-3-architecture.json';
import topic4 from '../content/topic-4-performance.json';
import { validateSeedFile } from '../src/lib/import';

const ALL_FILES = [
  { label: 'topic-1', file: topic1, topicId: 'topic-1-mongodb', minCards: 40 },
  { label: 'topic-2', file: topic2, topicId: 'topic-2-fullstack', minCards: 15 },
  { label: 'topic-3', file: topic3, topicId: 'topic-3-architecture', minCards: 25 },
  { label: 'topic-4', file: topic4, topicId: 'topic-4-performance', minCards: 25 },
] as const;

describe('seed content', () => {
  it.each(ALL_FILES)('$label validates cleanly', ({ label, file }) => {
    const report = validateSeedFile(file, label);
    expect(report.errors).toEqual([]);
    expect(report.topics).toHaveLength(1);
  });

  it.each(ALL_FILES)('$label is active and meets the minimum card count', ({ label, file, minCards }) => {
    const report = validateSeedFile(file, label);
    expect(report.topics[0].status).toBe('active');
    expect(report.cards.length).toBeGreaterThanOrEqual(minCards);
  });

  it.each(ALL_FILES)('$label cards reference the right topic and have unique ids', ({ label, file, topicId }) => {
    const report = validateSeedFile(file, label);
    const ids = report.cards.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of report.cards) {
      expect(c.topicId).toBe(topicId);
    }
  });

  it('all card ids are globally unique across topics', () => {
    const ids: string[] = [];
    for (const { file, label } of ALL_FILES) {
      const report = validateSeedFile(file, label);
      ids.push(...report.cards.map((c) => c.id));
    }
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('total card count crosses 130', () => {
    const total = ALL_FILES.reduce((acc, { file, label }) => {
      const report = validateSeedFile(file, label);
      return acc + report.cards.length;
    }, 0);
    expect(total).toBeGreaterThanOrEqual(130);
  });
});
