import type { Card, CardSource, Difficulty, SeedFile, Topic, TopicStatus } from '../types';

const VALID_SOURCES: CardSource[] = ['chat', 'artifact', 'notion', 'manual'];
const VALID_DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];
const VALID_STATUSES: TopicStatus[] = ['active', 'planned'];

export type ImportReport = {
  topics: Topic[];
  cards: Card[];
  errors: string[];
};

const isStr = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
const isStrArray = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === 'string');

const validateTopic = (t: unknown, errors: string[], prefix: string): Topic | null => {
  if (!t || typeof t !== 'object') {
    errors.push(`${prefix}: topic missing or not an object`);
    return null;
  }
  const o = t as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.name) || !isStr(o.description)) {
    errors.push(`${prefix}: topic needs id, name, description`);
    return null;
  }
  if (!VALID_STATUSES.includes(o.status as TopicStatus)) {
    errors.push(`${prefix}: invalid status "${String(o.status)}"`);
    return null;
  }
  return {
    id: o.id,
    name: o.name,
    description: o.description,
    status: o.status as TopicStatus,
    ref: typeof o.ref === 'string' ? o.ref : undefined,
  };
};

const validateCard = (c: unknown, errors: string[], prefix: string): Card | null => {
  if (!c || typeof c !== 'object') {
    errors.push(`${prefix}: card not an object`);
    return null;
  }
  const o = c as Record<string, unknown>;
  if (!isStr(o.id) || !isStr(o.topicId) || !isStr(o.question) || !isStr(o.answer)) {
    errors.push(`${prefix}: card "${String(o.id)}" missing required fields`);
    return null;
  }
  const followUpQuestions = isStrArray(o.followUpQuestions) ? o.followUpQuestions : [];
  const tags = isStrArray(o.tags) ? o.tags : [];
  const source = VALID_SOURCES.includes(o.source as CardSource) ? (o.source as CardSource) : 'manual';
  const difficulty = VALID_DIFFICULTIES.includes(o.difficulty as Difficulty)
    ? (o.difficulty as Difficulty)
    : 'medium';
  const createdAt = isStr(o.createdAt) ? o.createdAt : new Date().toISOString();
  const reviewHistory = Array.isArray(o.reviewHistory) ? (o.reviewHistory as Card['reviewHistory']) : [];
  return {
    id: o.id,
    topicId: o.topicId,
    question: o.question,
    answer: o.answer,
    followUpQuestions,
    tags,
    source,
    difficulty,
    createdAt,
    reviewHistory,
  };
};

export const validateSeedFile = (raw: unknown, label = 'seed'): ImportReport => {
  const errors: string[] = [];
  const report: ImportReport = { topics: [], cards: [], errors };
  if (!raw || typeof raw !== 'object') {
    errors.push(`${label}: root must be an object`);
    return report;
  }
  const root = raw as Partial<SeedFile> & { cards?: unknown; topic?: unknown };
  const topic = validateTopic(root.topic, errors, label);
  if (topic) report.topics.push(topic);
  const cards = Array.isArray(root.cards) ? root.cards : [];
  cards.forEach((c, i) => {
    const card = validateCard(c, errors, `${label}.cards[${i}]`);
    if (card) report.cards.push(card);
  });
  return report;
};

export const validateImportPayload = (raw: unknown): ImportReport => {
  const errors: string[] = [];
  const report: ImportReport = { topics: [], cards: [], errors };
  if (!raw || typeof raw !== 'object') {
    errors.push('payload must be an object');
    return report;
  }
  const root = raw as { topics?: unknown; cards?: unknown; topic?: unknown };
  if (Array.isArray(root.topics)) {
    root.topics.forEach((t, i) => {
      const topic = validateTopic(t, errors, `topics[${i}]`);
      if (topic) report.topics.push(topic);
    });
  } else if (root.topic) {
    const topic = validateTopic(root.topic, errors, 'topic');
    if (topic) report.topics.push(topic);
  }
  if (Array.isArray(root.cards)) {
    root.cards.forEach((c, i) => {
      const card = validateCard(c, errors, `cards[${i}]`);
      if (card) report.cards.push(card);
    });
  }
  return report;
};

export const exportCardsJson = (cards: Card[], topics: Topic[]): string => {
  return JSON.stringify({ topics, cards }, null, 2);
};

export const downloadBlob = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
