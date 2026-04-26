import { useMemo, useRef, useState } from 'react';
import CardEditor from '../components/CardEditor';
import Rail from '../components/Rail';
import { downloadBlob, exportCardsJson, validateImportPayload, validateSeedFile } from '../lib/import';
import { useStore } from '../store/useStore';
import type { Card, Difficulty } from '../types';

type Filters = {
  topicId: string;
  tag: string;
  difficulty: '' | Difficulty;
  query: string;
  status: 'all' | 'active' | 'planned';
};

const defaultFilters: Filters = { topicId: '', tag: '', difficulty: '', query: '', status: 'all' };

const Manage = () => {
  const cards = useStore((s) => s.cards);
  const topics = useStore((s) => s.topics);
  const deleteCard = useStore((s) => s.deleteCard);
  const importData = useStore((s) => s.importData);
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [editing, setEditing] = useState<Card | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const topicMap = useMemo(() => new Map(topics.map((t) => [t.id, t])), [topics]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => c.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [cards]);

  const filteredCards = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return cards.filter((c) => {
      if (filters.topicId && c.topicId !== filters.topicId) return false;
      if (filters.tag && !c.tags.includes(filters.tag)) return false;
      if (filters.difficulty && c.difficulty !== filters.difficulty) return false;
      const topic = topicMap.get(c.topicId);
      if (filters.status !== 'all') {
        if (!topic || topic.status !== filters.status) return false;
      }
      if (query) {
        const hay = `${c.question} ${c.answer} ${c.tags.join(' ')}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [cards, filters, topicMap]);

  const handleImport = async (file: File): Promise<void> => {
    const text = await file.text();
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch (e) {
      setImportMsg(`Parse-Fehler: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    const report =
      raw && typeof raw === 'object' && !Array.isArray(raw) && 'topic' in raw
        ? validateSeedFile(raw, file.name)
        : validateImportPayload(raw);
    if (report.topics.length === 0 && report.cards.length === 0) {
      setImportMsg(`Nichts importiert. ${report.errors.join('; ')}`);
      return;
    }
    await importData({ topics: report.topics, cards: report.cards });
    setImportMsg(
      `${report.cards.length} Karten und ${report.topics.length} Topics importiert.${
        report.errors.length ? ` Warnungen: ${report.errors.length}` : ''
      }`,
    );
  };

  const handleExport = (): void => {
    const payload = exportCardsJson(cards, topics);
    downloadBlob(payload, `mongodb-flashcards-${new Date().toISOString().slice(0, 10)}.json`);
  };

  const handleDelete = async (card: Card): Promise<void> => {
    const ok = window.confirm(`Karte „${card.question.slice(0, 60)}…" löschen?`);
    if (!ok) return;
    await deleteCard(card.id);
  };

  return (
    <div className="manage">
      <Rail topics={topics} cards={cards} />

      <main className="manage__main">
        <header className="manage__head">
          <div>
            <div className="manage__sub mono">Library</div>
            <h1 className="manage__title"><em>{cards.length}</em> Karten · {topics.length} Topics</h1>
          </div>
          <div className="manage__actions">
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleImport(f);
                e.target.value = '';
              }}
            />
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => fileRef.current?.click()}>
              Importieren
            </button>
            <button
              type="button"
              className="btn btn--ghost btn--sm"
              onClick={handleExport}
              disabled={cards.length === 0}
            >
              Exportieren
            </button>
            <button
              type="button"
              className="btn btn--primary btn--sm"
              onClick={() => { setEditing(null); setEditorOpen(true); }}
            >
              Neue Karte
            </button>
          </div>
        </header>

        {importMsg && <div className="manage__notice">{importMsg}</div>}

        <div className="manage__filters">
          <div className="manage__filter">
            <label htmlFor="filter-search">Suche</label>
            <input
              id="filter-search"
              placeholder="Frage, Antwort, Tag…"
              value={filters.query}
              onChange={(e) => setFilters({ ...filters, query: e.target.value })}
            />
          </div>
          <div className="manage__filter">
            <label htmlFor="filter-topic">Topic</label>
            <select
              id="filter-topic"
              value={filters.topicId}
              onChange={(e) => setFilters({ ...filters, topicId: e.target.value })}
            >
              <option value="">Alle</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div className="manage__filter">
            <label htmlFor="filter-tag">Tag</label>
            <select
              id="filter-tag"
              value={filters.tag}
              onChange={(e) => setFilters({ ...filters, tag: e.target.value })}
            >
              <option value="">Alle</option>
              {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="manage__filter">
            <label htmlFor="filter-difficulty">Schwierigkeit</label>
            <select
              id="filter-difficulty"
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value as Filters['difficulty'] })}
            >
              <option value="">Alle</option>
              <option value="easy">easy</option>
              <option value="medium">medium</option>
              <option value="hard">hard</option>
            </select>
          </div>
          <div className="manage__filter">
            <label htmlFor="filter-status">Status</label>
            <select
              id="filter-status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as Filters['status'] })}
            >
              <option value="all">Alle</option>
              <option value="active">active</option>
              <option value="planned">planned</option>
            </select>
          </div>
        </div>

        <div className="manage__table">
          <table>
            <thead>
              <tr>
                <th>Topic</th>
                <th>Frage</th>
                <th>Tags</th>
                <th>Diff</th>
                <th>Reviews</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredCards.map((card) => {
                const topic = topicMap.get(card.topicId);
                return (
                  <tr key={card.id}>
                    <td>
                      <div className="manage__topic-name">{topic?.name ?? '—'}</div>
                      {topic && <div className="manage__topic-status">{topic.status}</div>}
                    </td>
                    <td className="manage__row-q">{card.question}</td>
                    <td>
                      <div className="manage__row-tags">
                        {card.tags.map((t) => <span key={t} className="tagchip">{t}</span>)}
                      </div>
                    </td>
                    <td className="mono">{card.difficulty}</td>
                    <td className="mono">{card.reviewHistory.length}</td>
                    <td>
                      <div className="manage__row-actions">
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => { setEditing(card); setEditorOpen(true); }}
                        >
                          edit
                        </button>
                        <button
                          type="button"
                          className="btn btn--danger btn--sm"
                          onClick={() => void handleDelete(card)}
                        >
                          löschen
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCards.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="manage__empty">Keine Karten für diese Filter.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="dash__foot mono">
          <span>v0.4.0 · localhost:5173</span>
          <span>idb: mongodb-flashcards · {cards.length} records</span>
          <span className="dash__foot-sig">⌘ interview_prep</span>
        </footer>
      </main>

      {editorOpen && (
        <CardEditor
          card={editing}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
        />
      )}
    </div>
  );
};

export default Manage;
