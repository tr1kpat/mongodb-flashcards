import { openDB, type IDBPDatabase } from 'idb';
import type { Card, Topic } from '../types';

const DB_NAME = 'mongodb-flashcards';
const DB_VERSION = 1;

type Schema = {
  cards: { key: string; value: Card };
  topics: { key: string; value: Topic };
};

let dbPromise: Promise<IDBPDatabase<Schema>> | null = null;

const getDb = (): Promise<IDBPDatabase<Schema>> => {
  if (!dbPromise) {
    dbPromise = openDB<Schema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cards')) {
          db.createObjectStore('cards', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('topics')) {
          db.createObjectStore('topics', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const resetDbForTests = (): void => {
  dbPromise = null;
};

export const getAllCards = async (): Promise<Card[]> => {
  const db = await getDb();
  return db.getAll('cards');
};

export const getAllTopics = async (): Promise<Topic[]> => {
  const db = await getDb();
  return db.getAll('topics');
};

export const upsertCard = async (card: Card): Promise<void> => {
  const db = await getDb();
  await db.put('cards', card);
};

export const upsertCards = async (cards: Card[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('cards', 'readwrite');
  await Promise.all(cards.map((c) => tx.store.put(c)));
  await tx.done;
};

export const deleteCard = async (id: string): Promise<void> => {
  const db = await getDb();
  await db.delete('cards', id);
};

export const upsertTopic = async (topic: Topic): Promise<void> => {
  const db = await getDb();
  await db.put('topics', topic);
};

export const upsertTopics = async (topics: Topic[]): Promise<void> => {
  const db = await getDb();
  const tx = db.transaction('topics', 'readwrite');
  await Promise.all(topics.map((t) => tx.store.put(t)));
  await tx.done;
};

export const isEmpty = async (): Promise<boolean> => {
  const db = await getDb();
  const cardsCount = await db.count('cards');
  const topicsCount = await db.count('topics');
  return cardsCount === 0 && topicsCount === 0;
};

export const clearAll = async (): Promise<void> => {
  const db = await getDb();
  await db.clear('cards');
  await db.clear('topics');
};
