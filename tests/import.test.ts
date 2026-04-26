import { describe, expect, it } from 'vitest';
import { validateImportPayload, validateSeedFile } from '../src/lib/import';

describe('validateSeedFile', () => {
  it('accepts a valid seed file', () => {
    const report = validateSeedFile({
      topic: { id: 't1', name: 'Topic', description: 'D', status: 'active' },
      cards: [
        {
          id: 'c1',
          topicId: 't1',
          question: 'Q',
          answer: 'A',
          followUpQuestions: ['F1'],
          tags: ['x'],
          source: 'notion',
          difficulty: 'medium',
        },
      ],
    });
    expect(report.errors).toEqual([]);
    expect(report.topics).toHaveLength(1);
    expect(report.cards).toHaveLength(1);
  });

  it('rejects missing required fields', () => {
    const report = validateSeedFile({ topic: { id: 't1' } });
    expect(report.errors.length).toBeGreaterThan(0);
  });

  it('rejects invalid status', () => {
    const report = validateSeedFile({
      topic: { id: 't1', name: 'X', description: 'Y', status: 'wrong' },
      cards: [],
    });
    expect(report.errors.length).toBeGreaterThan(0);
  });
});

describe('validateImportPayload', () => {
  it('accepts full export payload', () => {
    const report = validateImportPayload({
      topics: [{ id: 't1', name: 'T', description: 'D', status: 'active' }],
      cards: [
        {
          id: 'c1',
          topicId: 't1',
          question: 'Q',
          answer: 'A',
          followUpQuestions: [],
          tags: [],
          source: 'manual',
          difficulty: 'easy',
        },
      ],
    });
    expect(report.errors).toEqual([]);
    expect(report.topics).toHaveLength(1);
    expect(report.cards).toHaveLength(1);
  });
});
