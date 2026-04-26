import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DifficultyDots from '../components/DifficultyDots';
import Sparkline from '../components/Sparkline';
import { useStore } from '../store/useStore';
import {
  addDays,
  confidence as confidenceFor,
  currentInterval,
  isDue,
  nextInterval,
  todayIso,
} from '../lib/srs';
import type { ReviewResult } from '../types';

type Phase = 'question' | 'answer' | 'review';

const RESULT_LABELS: Record<ReviewResult, string> = {
  correct: 'richtig',
  partial: 'teilweise',
  wrong: 'falsch',
};
const RESULT_GLYPH: Record<ReviewResult, string> = {
  correct: '✓',
  partial: '~',
  wrong: '✗',
};

type LocalLog = { result: ReviewResult; cardId: string };
type AskEntry = { q: string; a: string };

const Study = () => {
  const navigate = useNavigate();
  const study = useStore((s) => s.study);
  const cards = useStore((s) => s.cards);
  const topics = useStore((s) => s.topics);
  const startStudy = useStore((s) => s.startStudy);
  const gradeCurrent = useStore((s) => s.gradeCurrent);
  const nextStudyCard = useStore((s) => s.nextStudyCard);
  const exitStudy = useStore((s) => s.exitStudy);

  const [phase, setPhase] = useState<Phase>('question');
  const [flipped, setFlipped] = useState(false);
  const [lastResult, setLastResult] = useState<ReviewResult | null>(null);
  const [sessionLog, setSessionLog] = useState<LocalLog[]>([]);
  const [askInput, setAskInput] = useState('');
  const [askLog, setAskLog] = useState<AskEntry[]>([]);

  useEffect(() => {
    if (!study) startStudy();
  }, [study, startStudy]);

  const queueLength = study?.cardIds.length ?? 0;
  const currentId = study ? study.cardIds[study.index] : undefined;
  const currentCard = useMemo(() => cards.find((c) => c.id === currentId) ?? null, [cards, currentId]);
  const topic = useMemo(() => topics.find((t) => t.id === currentCard?.topicId) ?? null, [topics, currentCard]);

  // Reset per card
  useEffect(() => {
    setPhase('question');
    setFlipped(false);
    setLastResult(null);
    setAskInput('');
    setAskLog([]);
  }, [currentId]);

  const reveal = useCallback(() => {
    setFlipped(true);
    setPhase('answer');
  }, []);

  const handleGrade = useCallback(
    async (result: ReviewResult) => {
      if (!currentCard) return;
      await gradeCurrent(result);
      setLastResult(result);
      setSessionLog((prev) => [...prev, { result, cardId: currentCard.id }]);
      setPhase('review');
    },
    [gradeCurrent, currentCard],
  );

  const handleNext = useCallback(() => {
    nextStudyCard();
  }, [nextStudyCard]);

  const handleExit = useCallback(() => {
    exitStudy();
    navigate('/');
  }, [exitStudy, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'Escape') {
        handleExit();
        return;
      }
      if (!currentCard) return;
      if (phase === 'question' && e.code === 'Space') {
        e.preventDefault();
        reveal();
        return;
      }
      if (phase === 'answer') {
        if (e.key === '1') { e.preventDefault(); void handleGrade('wrong'); }
        else if (e.key === '2') { e.preventDefault(); void handleGrade('partial'); }
        else if (e.key === '3') { e.preventDefault(); void handleGrade('correct'); }
      }
      if (phase === 'review' && e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [phase, currentCard, reveal, handleGrade, handleNext, handleExit]);

  const handleAsk = (e: React.FormEvent): void => {
    e.preventDefault();
    const q = askInput.trim();
    if (!q || !currentCard) return;
    const stub =
      'Antwort-Stub: Diese Frage wird gespeichert und kann später mit einer KI-Integration beantwortet werden. (Aktuell ist keine Live-KI verbunden.)';
    setAskLog((prev) => [...prev, { q, a: stub }]);
    setAskInput('');
    console.info('[Study] follow-up question', { cardId: currentCard.id, q });
  };

  if (!study) {
    return (
      <div className="study study--done">
        <div className="study__done-inner">
          <div className="mono study__done-kicker">SESSION · LÄDT</div>
        </div>
      </div>
    );
  }

  if (!currentCard || study.index >= queueLength) {
    return (
      <div className="study study--done">
        <div className="study__done-inner">
          <div className="mono study__done-kicker">SESSION · COMPLETE</div>
          <h1 className="study__done-h1">
            <em>{queueLength}</em> {queueLength === 1 ? 'Karte' : 'Karten'} bearbeitet.
          </h1>
          <div className="study__done-grid">
            {(['correct', 'partial', 'wrong'] as ReviewResult[]).map((k) => {
              const n = sessionLog.filter((h) => h.result === k).length;
              return (
                <div key={k} className={`donecell donecell--${k}`}>
                  <div className="donecell__n"><em>{n}</em></div>
                  <div className="donecell__l mono">{RESULT_LABELS[k]}</div>
                </div>
              );
            })}
          </div>
          <button type="button" className="btn btn--primary" onClick={handleExit}>
            <span>Zurück zum Dashboard</span>
            <span className="btn__arrow">→</span>
          </button>
        </div>
      </div>
    );
  }

  const prevIv = currentInterval(currentCard);
  const nextIvCorrect = nextInterval(prevIv, 'correct');
  const nextIvPartial = nextInterval(prevIv, 'partial');
  const nextIvWrong = nextInterval(prevIv, 'wrong');
  const conf = confidenceFor(currentCard);
  const showFollowUps =
    phase === 'review' &&
    (lastResult === 'wrong' || lastResult === 'partial') &&
    currentCard.followUpQuestions.length > 0;
  const today = todayIso();

  const progress = (study.index / queueLength) * 100;
  const progressAfter = ((study.index + (phase === 'review' ? 1 : 0)) / queueLength) * 100;

  const dueState = isDue(currentCard) ? 'fällig' : 'voraus';

  return (
    <div className="study">
      <div className="study__top">
        <div className="study__top-left">
          <button type="button" className="iconbtn" onClick={handleExit}>
            <span className="mono">←</span> beenden
          </button>
          <div className="study__crumb">
            <span className="mono study__crumb-ref">{topic?.ref ?? '—'}</span>
            <span className="study__crumb-sep">/</span>
            <span className="study__crumb-name">{topic?.name ?? 'Karte'}</span>
          </div>
        </div>
        <div className="study__top-right">
          <div className="study__position">
            <span className="mono"><em>{study.index + 1}</em>/{queueLength}</span>
            <span className="study__position-label">karte</span>
          </div>
        </div>
      </div>

      <div className="study__rail">
        <div className="study__rail-track">
          <div className="study__rail-fill" style={{ width: progress + '%' }} />
          <div className="study__rail-ghost" style={{ width: progressAfter + '%' }} />
          {study.cardIds.map((id, i) => {
            const log = sessionLog.find((l) => l.cardId === id);
            return (
              <div
                key={id}
                className="study__rail-tick"
                style={{ left: (i / queueLength * 100) + '%' }}
              >
                {log && <span className={`tick-dot tick-dot--${log.result}`} />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="study__stage">
        <div className="study__sidemeta study__sidemeta--left">
          <div className="sidemeta__block">
            <div className="sidemeta__label mono">difficulty</div>
            <div className="sidemeta__value">
              <DifficultyDots d={currentCard.difficulty} />
              <span className="sidemeta__diff">{currentCard.difficulty}</span>
            </div>
          </div>
          <div className="sidemeta__block">
            <div className="sidemeta__label mono">source</div>
            <div className="sidemeta__value mono">{currentCard.source}</div>
          </div>
          <div className="sidemeta__block">
            <div className="sidemeta__label mono">tags</div>
            <div className="sidemeta__tags">
              {currentCard.tags.map((t) => (
                <span key={t} className="tagchip">{t}</span>
              ))}
            </div>
          </div>
          <div className="sidemeta__block">
            <div className="sidemeta__label mono">confidence</div>
            <div className="sidemeta__conf">
              <Sparkline history={currentCard.reviewHistory} width={120} height={28} />
              <div className="mono sidemeta__conf-val"><em>{conf}</em>/100</div>
            </div>
          </div>
          <div className="sidemeta__block">
            <div className="sidemeta__label mono">next if ✓</div>
            <div className="sidemeta__value mono">
              <em>+{nextIvCorrect}d</em>
              <span className="sidemeta__nextdate">→ {addDays(today, nextIvCorrect).slice(5)}</span>
            </div>
          </div>
          <div className="sidemeta__block">
            <div className="sidemeta__label mono">status</div>
            <div className="sidemeta__value mono">{dueState}</div>
          </div>
        </div>

        <div className={`cardstack ${flipped ? 'is-flipped' : ''}`}>
          <div className="cardstack__shadow" />
          <div className="flashcard">
            <div className="flashcard__face flashcard__face--front">
              <div className="flashcard__corner">
                <div className="mono">{currentCard.id}</div>
                <div className="mono">FRAGE</div>
              </div>
              <div className="flashcard__body">
                <h1 className="flashcard__q">{currentCard.question}</h1>
              </div>
              <div className="flashcard__foot">
                {phase === 'question' ? (
                  <button type="button" className="revealbtn" onClick={reveal}>
                    <span>Antwort aufdecken</span>
                    <kbd className="mono">Space</kbd>
                  </button>
                ) : (
                  <div className="flashcard__foot-done mono">aufgedeckt ↑</div>
                )}
              </div>
            </div>

            <div className="flashcard__face flashcard__face--back">
              <div className="flashcard__corner">
                <div className="mono">{currentCard.id}</div>
                <div className="mono">ANTWORT</div>
              </div>
              <div className="flashcard__body">
                <div className="flashcard__q flashcard__q--small">{currentCard.question}</div>
                <div className="flashcard__a">{currentCard.answer}</div>
              </div>
              <div className="flashcard__foot">
                {phase === 'answer' && (
                  <div className="gradebar">
                    <div className="gradebar__label mono">wie gut wusstest du&apos;s?</div>
                    <div className="gradebar__keys">
                      <button type="button" className="gradekey gradekey--wrong" onClick={() => void handleGrade('wrong')}>
                        <span className="gradekey__kbd mono">1</span>
                        <span className="gradekey__text">
                          <span className="gradekey__title">falsch</span>
                          <span className="gradekey__sub mono">→ {nextIvWrong}d</span>
                        </span>
                      </button>
                      <button type="button" className="gradekey gradekey--partial" onClick={() => void handleGrade('partial')}>
                        <span className="gradekey__kbd mono">2</span>
                        <span className="gradekey__text">
                          <span className="gradekey__title">teilweise</span>
                          <span className="gradekey__sub mono">→ {nextIvPartial}d</span>
                        </span>
                      </button>
                      <button type="button" className="gradekey gradekey--correct" onClick={() => void handleGrade('correct')}>
                        <span className="gradekey__kbd mono">3</span>
                        <span className="gradekey__text">
                          <span className="gradekey__title">richtig</span>
                          <span className="gradekey__sub mono">→ {nextIvCorrect}d</span>
                        </span>
                      </button>
                    </div>
                  </div>
                )}
                {phase === 'review' && lastResult && (
                  <div className="reviewbar">
                    <div className={`reviewbar__stamp reviewbar__stamp--${lastResult}`}>
                      <div className="mono reviewbar__stamp-k">{RESULT_GLYPH[lastResult]}</div>
                      <div className="reviewbar__stamp-text">
                        <div>als <em>{RESULT_LABELS[lastResult]}</em> bewertet</div>
                        <div className="mono reviewbar__stamp-sub">
                          nächste Prüfung in {nextInterval(prevIv, lastResult)} Tagen
                        </div>
                      </div>
                    </div>
                    <button type="button" className="btn btn--primary" onClick={handleNext}>
                      <span>{study.index + 1 >= queueLength ? 'Zusammenfassung' : 'Nächste Karte'}</span>
                      <kbd className="mono">Enter</kbd>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="study__sidemeta study__sidemeta--right">
          {showFollowUps && (
            <div className="sidemeta__block sidemeta__block--callout">
              <div className="sidemeta__label mono">vertiefungsfragen</div>
              <ul className="followups">
                {currentCard.followUpQuestions.map((f, i) => (
                  <li key={f}>
                    <span className="followups__ix mono">{String(i + 1).padStart(2, '0')}</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {phase !== 'question' && (
            <div className="sidemeta__block">
              <div className="sidemeta__label mono">frag zur karte</div>
              <form onSubmit={handleAsk} className="askform">
                <div className="askform__input">
                  <span className="mono askform__prompt">&gt;</span>
                  <input
                    type="text"
                    value={askInput}
                    onChange={(e) => setAskInput(e.target.value)}
                    placeholder="z. B. Worin unterscheidet sich Atlas von EA konkret?"
                  />
                </div>
                <button type="submit" className="btn btn--sm btn--ghost" disabled={!askInput.trim()}>
                  senden
                </button>
              </form>
              {askLog.length > 0 && (
                <div className="asklog">
                  {askLog.map((entry, i) => (
                    <div key={i} className="asklog__item">
                      <div className="asklog__q mono">&gt; {entry.q}</div>
                      <div className="asklog__a">{entry.a}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {phase === 'question' && (
            <div className="sidemeta__block sidemeta__block--hint">
              <div className="sidemeta__label mono">hinweis</div>
              <div className="hint-text">
                Antworte <em>laut</em>, bevor du aufdeckst. Das Verbalisieren ist das, was im echten Interview zählt.
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="study__foot mono">
        <div className="study__foot-keys">
          <span><kbd>Space</kbd> umdrehen</span>
          <span><kbd>1</kbd> falsch</span>
          <span><kbd>2</kbd> teilweise</span>
          <span><kbd>3</kbd> richtig</span>
          <span><kbd>Enter</kbd> weiter</span>
          <span><kbd>Esc</kbd> beenden</span>
        </div>
        <div>CARD_ID · {currentCard.id}</div>
      </div>
    </div>
  );
};

export default Study;
