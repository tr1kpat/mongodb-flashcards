import { useMemo } from 'react';
import type { Card, ReviewResult } from '../types';
import { addDays, todayIso } from '../lib/srs';

type Props = {
  cards: Card[];
  days?: number;
};

type Cell = {
  date: string;
  intensity: number;
  total: number;
  correct: number;
  partial: number;
  wrong: number;
};

const ReviewHeatmap = ({ cards, days = 21 }: Props) => {
  const today = todayIso();
  const cells = useMemo<Cell[]>(() => {
    const map: Record<string, { total: number; correct: number; partial: number; wrong: number }> = {};
    for (const c of cards) {
      for (const log of c.reviewHistory) {
        if (!map[log.date]) map[log.date] = { total: 0, correct: 0, partial: 0, wrong: 0 };
        map[log.date].total += 1;
        map[log.date][log.result as ReviewResult] += 1;
      }
    }
    const list: Cell[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      const d = map[date] || { total: 0, correct: 0, partial: 0, wrong: 0 };
      list.push({ date, intensity: Math.min(1, d.total / 4), ...d });
    }
    return list;
  }, [cards, days, today]);

  return (
    <div className="heatmap" role="img" aria-label={`Review-Aktivität letzte ${days} Tage`}>
      {cells.map((c) => (
        <div
          key={c.date}
          className={`heatmap__cell ${c.date === today ? 'is-today' : ''}`}
          style={{ ['--intensity' as string]: c.intensity } as React.CSSProperties}
          title={`${c.date}: ${c.total} Review${c.total === 1 ? '' : 's'}`}
        />
      ))}
    </div>
  );
};

export default ReviewHeatmap;
