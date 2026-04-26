import type { ReviewLog } from '../types';

type Props = {
  history: ReviewLog[];
  width?: number;
  height?: number;
};

const Sparkline = ({ history, width = 80, height = 20 }: Props) => {
  if (!history.length) {
    return (
      <svg width={width} height={height} className="sparkline sparkline--empty" aria-hidden>
        <line x1={0} y1={height - 1} x2={width} y2={height - 1} strokeDasharray="2 3" />
      </svg>
    );
  }
  const vals = history.slice(-10).map((h) =>
    h.result === 'correct' ? 1 : h.result === 'partial' ? 0.5 : 0,
  );
  const step = vals.length > 1 ? width / (vals.length - 1) : width;
  const pts = vals.map((v, i) => [i * step, height - 2 - v * (height - 4)] as const);
  const d = pts.map((p, i) => (i === 0 ? 'M' : 'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
  return (
    <svg width={width} height={height} className="sparkline" aria-hidden>
      <path d={d} />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={1.8} />
      ))}
    </svg>
  );
};

export default Sparkline;
