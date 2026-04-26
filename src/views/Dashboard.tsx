import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Rail from '../components/Rail';
import ReviewHeatmap from '../components/ReviewHeatmap';
import { useStore } from '../store/useStore';
import { addDays, confidence, dueDate, isDue, isMastered, todayIso } from '../lib/srs';

const WEEKDAY_FORMAT = new Intl.DateTimeFormat('de-DE', { weekday: 'short' });

const Dashboard = () => {
  const navigate = useNavigate();
  const topics = useStore((s) => s.topics);
  const cards = useStore((s) => s.cards);
  const startStudy = useStore((s) => s.startStudy);

  const today = todayIso();
  const todayWeekday = WEEKDAY_FORMAT.format(new Date(today + 'T00:00:00Z')).toUpperCase();

  const stats = useMemo(() => {
    return topics.map((t) => {
      const tc = cards.filter((c) => c.topicId === t.id);
      const due = tc.filter((c) => isDue(c)).length;
      const mastered = tc.filter((c) => isMastered(c)).length;
      const avgConf = tc.length
        ? Math.round(tc.reduce((a, c) => a + confidence(c), 0) / tc.length)
        : 0;
      return { topic: t, total: tc.length, due, mastered, avgConf };
    });
  }, [topics, cards]);

  const activeStats = stats.filter((s) => s.topic.status === 'active');
  const plannedStats = stats.filter((s) => s.topic.status === 'planned');
  const totalDue = activeStats.reduce((a, s) => a + s.due, 0);
  const totalMastered = stats.reduce((a, s) => a + s.mastered, 0);
  const totalCards = stats.reduce((a, s) => a + s.total, 0);

  const streak = useMemo(() => {
    const dates = new Set<string>();
    cards.forEach((c) => c.reviewHistory.forEach((l) => dates.add(l.date)));
    let s = 0;
    for (let i = 0; i < 60; i++) {
      const d = addDays(today, -i);
      if (dates.has(d)) s += 1;
      else break;
    }
    return s;
  }, [cards, today]);

  const lastReviewDate = useMemo(() => {
    let max = '';
    for (const c of cards) {
      for (const l of c.reviewHistory) if (l.date > max) max = l.date;
    }
    return max;
  }, [cards]);

  const upcoming = useMemo(() => {
    const map: Record<string, number> = {};
    for (let i = 0; i < 8; i++) map[addDays(today, i)] = 0;
    for (const c of cards) {
      const d = dueDate(c);
      if (d in map) map[d] += 1;
      else if (d < today) map[today] += 1;
    }
    return Object.entries(map);
  }, [cards, today]);
  const upcomingMax = Math.max(1, ...upcoming.map(([, v]) => v));

  const firstActiveTopicId = activeStats.find((s) => s.total > 0)?.topic.id;

  const handleStart = (topicId?: string): void => {
    startStudy(topicId);
    navigate('/study');
  };

  return (
    <div className="dash">
      <Rail topics={topics} cards={cards} />

      <main className="dash__main">
        <header className="dash__hero">
          <div className="dash__date mono">{today} · {todayWeekday}</div>
          <h1 className="dash__h1">
            <span className="dash__h1-lead">Bereit fürs Interview</span>
            <span className="dash__h1-main">
              {totalDue > 0 ? (
                <>
                  <em>{totalDue}</em> {totalDue === 1 ? 'Karte wartet' : 'Karten warten'} heute auf dich.
                </>
              ) : totalCards > 0 ? (
                <>
                  <em>0</em> Karten fällig. Übung ist trotzdem eine gute Idee.
                </>
              ) : (
                <>Noch keine Karten geladen — importiere ein Deck.</>
              )}
            </span>
          </h1>
          <div className="dash__hero-actions">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => handleStart()}
              disabled={totalCards === 0}
            >
              <span>Session starten</span>
              <span className="btn__arrow">→</span>
            </button>
            {firstActiveTopicId && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => handleStart(firstActiveTopicId)}
              >
                Nur Topic 1 · MongoDB
              </button>
            )}
          </div>
        </header>

        <section className="metric-strip">
          <div className="metric">
            <div className="metric__label">Heute fällig</div>
            <div className="metric__value"><em>{totalDue}</em></div>
            <div className="metric__foot mono">/{totalCards} total</div>
          </div>
          <div className="metric">
            <div className="metric__label">Streak</div>
            <div className="metric__value"><em>{streak}</em><span>d</span></div>
            <div className="metric__foot mono">
              {lastReviewDate ? `zuletzt aktiv ${lastReviewDate}` : 'noch nicht aktiv'}
            </div>
          </div>
          <div className="metric">
            <div className="metric__label">Gemeistert</div>
            <div className="metric__value"><em>{totalMastered}</em><span>/{totalCards}</span></div>
            <div className="metric__foot mono">
              {totalCards ? Math.round((totalMastered / totalCards) * 100) : 0}% abgedeckt
            </div>
          </div>
          <div className="metric metric--heat">
            <div className="metric__label">Letzte 21 Tage</div>
            <ReviewHeatmap cards={cards} />
            <div className="metric__foot mono">weniger ── mehr</div>
          </div>
        </section>

        <section className="topic-grid">
          <h2 className="section__h2">Aktive Topics</h2>
          <div className="topic-grid__inner">
            {activeStats.map((s, i) => (
              <article key={s.topic.id} className="topic-card">
                <div className="topic-card__head">
                  <div className="mono">T.{String(i + 1).padStart(2, '0')}</div>
                  <div className="topic-card__ref mono">{s.topic.ref ?? '—'}</div>
                </div>
                <h3 className="topic-card__title">{s.topic.name}</h3>
                <p className="topic-card__desc">{s.topic.description}</p>

                <div className="topic-card__conf">
                  <div className="confbar">
                    <div className="confbar__fill" style={{ width: s.avgConf + '%' }} />
                    <div className="confbar__marks">
                      {[25, 50, 75].map((m) => (
                        <span key={m} style={{ left: m + '%' }} />
                      ))}
                    </div>
                  </div>
                  <div className="confbar__legend mono">
                    <span>confidence</span>
                    <span><em>{s.avgConf}</em>/100</span>
                  </div>
                </div>

                <dl className="topic-card__stats">
                  <div><dt>Karten</dt><dd className="mono">{s.total}</dd></div>
                  <div><dt>Fällig</dt><dd className="mono"><em>{s.due}</em></dd></div>
                  <div><dt>Gemeistert</dt><dd className="mono">{s.mastered}</dd></div>
                </dl>

                <div className="topic-card__cta">
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => handleStart(s.topic.id)}
                    disabled={s.total === 0}
                  >
                    {s.due > 0 ? `${s.due} fällige üben` : 'alle üben'}
                    <span className="btn__arrow">→</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="dash__bottom">
          <div className="sched">
            <h2 className="section__h2">Fälligkeitsplan</h2>
            <div className="sched__rows">
              {upcoming.map(([date, count], i) => {
                const dayLabel =
                  i === 0
                    ? 'HEUTE'
                    : WEEKDAY_FORMAT.format(new Date(date + 'T00:00:00Z')).toUpperCase();
                return (
                  <div
                    key={date}
                    className={`sched__row ${count === 0 ? 'is-empty' : ''} ${i === 0 ? 'is-today' : ''}`}
                  >
                    <div className="sched__day mono">{dayLabel}</div>
                    <div className="sched__date mono">{date.slice(5)}</div>
                    <div className="sched__bar">
                      <div className="sched__bar-fill" style={{ width: (count / upcomingMax * 100) + '%' }} />
                    </div>
                    <div className="sched__count mono">{count}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="planned">
            <h2 className="section__h2">Geplante Topics</h2>
            <div className="planned__list">
              {plannedStats.map((s, i) => (
                <div key={s.topic.id} className="planned__row">
                  <span className="planned__ix mono">
                    T.{String(activeStats.length + i + 1).padStart(2, '0')}
                  </span>
                  <span className="planned__name">{s.topic.name}</span>
                  <span className="planned__pill">geplant</span>
                  <span className="planned__desc">{s.topic.description}</span>
                </div>
              ))}
              {plannedStats.length === 0 && (
                <div className="planned__row">
                  <span className="planned__name">Keine geplanten Topics.</span>
                </div>
              )}
            </div>
          </div>
        </section>

        <footer className="dash__foot mono">
          <span>v0.4.0 · localhost:5173</span>
          <span>idb: mongodb-flashcards · {cards.length} records</span>
          <span className="dash__foot-sig">⌘ interview_prep</span>
        </footer>
      </main>
    </div>
  );
};

export default Dashboard;
