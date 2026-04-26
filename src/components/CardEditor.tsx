import { useEffect, useState } from 'react';
import type { Card, CardSource, Difficulty } from '../types';
import { useStore } from '../store/useStore';

const SOURCES: CardSource[] = ['manual', 'chat', 'artifact', 'notion'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

type Props = {
  card: Card | null;
  onClose: () => void;
};

const emptyCard = (topicId: string): Card => ({
  id: crypto.randomUUID(),
  topicId,
  question: '',
  answer: '',
  followUpQuestions: [],
  tags: [],
  source: 'manual',
  difficulty: 'medium',
  createdAt: new Date().toISOString(),
  reviewHistory: [],
});

const CardEditor = ({ card, onClose }: Props) => {
  const topics = useStore((s) => s.topics);
  const addCard = useStore((s) => s.addCard);
  const updateCard = useStore((s) => s.updateCard);
  const [draft, setDraft] = useState<Card>(() => card ?? emptyCard(topics[0]?.id ?? ''));
  const [followUpsRaw, setFollowUpsRaw] = useState(() => (card?.followUpQuestions ?? []).join('\n'));
  const [tagsRaw, setTagsRaw] = useState(() => (card?.tags ?? []).join(', '));

  useEffect(() => {
    const base = card ?? emptyCard(topics[0]?.id ?? '');
    setDraft(base);
    setFollowUpsRaw(base.followUpQuestions.join('\n'));
    setTagsRaw(base.tags.join(', '));
  }, [card, topics]);

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const normalized: Card = {
      ...draft,
      followUpQuestions: followUpsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
      tags: tagsRaw.split(',').map((s) => s.trim()).filter(Boolean),
    };
    if (card) await updateCard(normalized);
    else await addCard(normalized);
    onClose();
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <form onSubmit={handleSave} className="modal">
        <h2 className="modal__title">{card ? 'Karte bearbeiten' : 'Neue Karte'}</h2>
        <div className="modal__grid">
          <label>
            Topic
            <select
              value={draft.topicId}
              onChange={(e) => setDraft({ ...draft, topicId: e.target.value })}
              required
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label>
            Schwierigkeit
            <select
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Difficulty })}
            >
              {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>
          <label className="full">
            Frage
            <textarea
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              required
            />
          </label>
          <label className="full">
            Antwort
            <textarea
              value={draft.answer}
              onChange={(e) => setDraft({ ...draft, answer: e.target.value })}
              required
            />
          </label>
          <label className="full">
            Follow-up-Fragen (eine pro Zeile)
            <textarea
              value={followUpsRaw}
              onChange={(e) => setFollowUpsRaw(e.target.value)}
            />
          </label>
          <label className="full">
            Tags (komma-getrennt)
            <input
              value={tagsRaw}
              onChange={(e) => setTagsRaw(e.target.value)}
            />
          </label>
          <label>
            Quelle
            <select
              value={draft.source}
              onChange={(e) => setDraft({ ...draft, source: e.target.value as CardSource })}
            >
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="modal__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn btn--primary btn--sm">Speichern</button>
        </div>
      </form>
    </div>
  );
};

export default CardEditor;
