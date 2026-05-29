import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function IdeaInput({ onSubmit, loading }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [idea, setIdea]   = useState('');

  const canSubmit = title.trim().length >= 2 && idea.trim().length >= 10 && !loading;

  function handleSubmit(e) {
    e.preventDefault();
    if (canSubmit) onSubmit({ title: title.trim(), idea: idea.trim() });
  }

  return (
    <form className="idea-input" onSubmit={handleSubmit}>
      <div className="idea-input__header">
        <span className="idea-input__icon">💡</span>
        <h2 className="idea-input__title">{t('newProject.title')}</h2>
        <p className="idea-input__subtitle">{t('newProject.subtitle')}</p>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="project-title">
          {t('newProject.projectName')}
        </label>
        <input
          id="project-title"
          className="form-input"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('newProject.namePlaceholder')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={100}
          disabled={loading}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="project-idea">
          {t('newProject.ideaLabel')}
        </label>
        <textarea
          id="project-idea"
          className="form-input idea-input__textarea"
          autoComplete="off"
          spellCheck={false}
          placeholder={t('newProject.ideaPlaceholder')}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          maxLength={2000}
          rows={5}
          disabled={loading}
        />
        <span className="idea-input__count">{idea.length}/2000</span>
      </div>

      <button
        type="submit"
        className="btn btn--primary btn--full"
        disabled={!canSubmit}
      >
        {loading ? t('common.loading') : t('newProject.startBtn')}
      </button>
    </form>
  );
}
