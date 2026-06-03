import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentUser } from '../../store/slices/authSlice';
import { getPhaseComments, addPhaseComment, deletePhaseComment } from '../../api/projects.api';
import toast from 'react-hot-toast';

export default function PhaseComments({ projectId, phaseIndex }) {
  const user     = useSelector(selectCurrentUser);
  const [comments, setComments] = useState([]);
  const [text,     setText]     = useState('');
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    getPhaseComments(projectId, phaseIndex).then(setComments).catch(() => {});
  }, [projectId, phaseIndex]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    try {
      const comment = await addPhaseComment(projectId, phaseIndex, text.trim());
      setComments((prev) => [...prev, comment]);
      setText('');
    } catch { toast.error('Could not add comment'); }
    finally { setLoading(false); }
  }

  async function handleDelete(commentId) {
    try {
      await deletePhaseComment(projectId, phaseIndex, commentId);
      setComments((prev) => prev.filter((c) => c._id !== commentId));
    } catch { toast.error('Could not delete comment'); }
  }

  return (
    <div className="phase-comments">
      <h4 className="phase-comments__title">Comments</h4>

      {!comments.length && (
        <p className="phase-comments__empty">No comments yet. Be the first to add one.</p>
      )}

      <ul className="phase-comments__list">
        {comments.map((c) => (
          <li key={c._id} className="phase-comment">
            <div className="phase-comment__header">
              <strong className="phase-comment__author">{c.userName}</strong>
              <span className="phase-comment__time">{new Date(c.createdAt).toLocaleString()}</span>
              {user && String(c.userId) === String(user._id) && (
                <button className="phase-comment__delete" onClick={() => handleDelete(c._id)} aria-label="Delete comment">✕</button>
              )}
            </div>
            <p className="phase-comment__text">{c.text}</p>
          </li>
        ))}
      </ul>

      <form className="phase-comments__form" onSubmit={handleSubmit}>
        <textarea
          className="phase-comments__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment…"
          rows={2}
          maxLength={2000}
        />
        <button className="btn btn--sm" type="submit" disabled={loading || !text.trim()}>
          Post
        </button>
      </form>
    </div>
  );
}
