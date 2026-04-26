import type { Difficulty } from '../types';

type Props = { d: Difficulty };

const DifficultyDots = ({ d }: Props) => {
  const n = d === 'easy' ? 1 : d === 'medium' ? 2 : 3;
  return (
    <span className="diff-dots" aria-label={d}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={`diff-dots__dot ${i < n ? 'is-on' : ''}`} />
      ))}
    </span>
  );
};

export default DifficultyDots;
