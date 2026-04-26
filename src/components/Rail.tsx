import { useNavigate, NavLink } from 'react-router-dom';
import type { Card, Topic } from '../types';
import { isDue } from '../lib/srs';
import { useStore } from '../store/useStore';

type Props = {
  topics: Topic[];
  cards: Card[];
};

const Rail = ({ topics, cards }: Props) => {
  const navigate = useNavigate();
  const startStudy = useStore((s) => s.startStudy);

  const stats = topics.map((t) => {
    const tc = cards.filter((c) => c.topicId === t.id);
    return {
      topic: t,
      total: tc.length,
      due: tc.filter((c) => isDue(c)).length,
    };
  });

  const handleStart = (topicId: string, total: number): void => {
    if (!total) return;
    startStudy(topicId);
    navigate('/study');
  };

  return (
    <aside className="dash__rail">
      <div className="rail__mark">
        <div className="rail__mark-glyph" aria-hidden>◆</div>
        <div>
          <div className="rail__mark-title">INTERVIEW_PREP</div>
          <div className="rail__mark-sub">mongodb · senior csm</div>
        </div>
      </div>

      <nav className="rail__nav" aria-label="Topics">
        <div className="rail__label">Topics</div>
        {stats.map((s, i) => (
          <button
            key={s.topic.id}
            type="button"
            className={`rail__topic ${s.topic.status}`}
            onClick={() => handleStart(s.topic.id, s.total)}
            disabled={s.total === 0}
          >
            <span className="rail__topic-idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="rail__topic-body">
              <span className="rail__topic-name">{s.topic.name}</span>
              <span className="rail__topic-meta">
                {s.topic.status === 'planned' ? (
                  <span className="rail__topic-pill">geplant</span>
                ) : (
                  <>
                    <span className="mono">{s.total}</span> karten
                    {s.due > 0 && <span className="rail__topic-due">{' · '}{s.due} fällig</span>}
                  </>
                )}
              </span>
            </span>
            <span className="rail__topic-ref mono">{s.topic.ref ?? '—'}</span>
          </button>
        ))}
      </nav>

      <div className="rail__foot">
        <div>
          <div className="rail__label">Shortcuts</div>
          <div className="rail__shortcuts">
            <div><span className="mono">Space</span><span>umdrehen</span></div>
            <div><span className="mono">1/2/3</span><span>bewerten</span></div>
            <div><span className="mono">Enter</span><span>nächste</span></div>
            <div><span className="mono">Esc</span><span>beenden</span></div>
          </div>
        </div>
        <NavLink
          to="/manage"
          end
          className={({ isActive }) => `rail__manage-link ${isActive ? 'is-active' : ''}`}
        >
          <span aria-hidden>›</span>
          Karten verwalten
        </NavLink>
      </div>
    </aside>
  );
};

export default Rail;
