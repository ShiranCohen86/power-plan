import { useState } from 'react';
import { ratePhase } from '../../api/projects.api';
import toast from 'react-hot-toast';

export default function PhaseRating({ projectId, phaseIndex, initialRating = null }) {
  const [rating, setRating] = useState(initialRating);
  const [loading, setLoading] = useState(false);

  async function handleRate(value) {
    if (loading) return;
    const next = rating === value ? null : value; // toggle off
    setLoading(true);
    try {
      await ratePhase(projectId, phaseIndex, value);
      setRating(next);
    } catch {
      toast.error('Could not save rating');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phase-rating" aria-label="Rate this phase output">
      <button
        className={`phase-rating__btn${rating === 2 ? ' phase-rating__btn--active-up' : ''}`}
        onClick={() => handleRate(2)}
        disabled={loading}
        aria-label="Thumbs up"
        title="Good output"
      >👍</button>
      <button
        className={`phase-rating__btn${rating === 1 ? ' phase-rating__btn--active-down' : ''}`}
        onClick={() => handleRate(1)}
        disabled={loading}
        aria-label="Thumbs down"
        title="Poor output"
      >👎</button>
    </div>
  );
}
