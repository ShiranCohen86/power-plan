import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SafeMarkdown from '../components/ui/SafeMarkdown';

const STATUS_LABEL = {
  onboarding: 'Onboarding', planning: 'Planning', coding: 'Coding',
  deploying: 'Deploying', live: 'Live', failed: 'Failed',
  paused: 'Paused', archived: 'Archived',
};

export default function SharedProject() {
  const { shareToken }       = useParams();
  const [data,    setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]  = useState(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || '';
    fetch(`${apiBase}/api/public/share/${shareToken}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'Not found');
        return res.json();
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) return (
    <div className="shared-project shared-project--loading">
      <div className="shared-project__spinner" />
      <p>Loading shared project…</p>
    </div>
  );

  if (error) return (
    <div className="shared-project shared-project--error">
      <span className="shared-project__error-icon">🔒</span>
      <h1>Share link not found</h1>
      <p>{error}</p>
    </div>
  );

  const { project, phases, documents } = data;

  return (
    <div className="shared-project">
      <header className="shared-project__header">
        <div className="shared-project__brand">⚡ Power Plan</div>
        <span className="shared-project__badge">Read-only</span>
      </header>

      <main className="shared-project__main">
        <div className="shared-project__title-row">
          <h1 className="shared-project__title">{project.title}</h1>
          <span className={`project-status project-status--${project.status}`}>{STATUS_LABEL[project.status] || project.status}</span>
        </div>
        <p className="shared-project__idea">{project.idea}</p>

        {project.deployedUrl && (
          <a href={project.deployedUrl} target="_blank" rel="noopener noreferrer" className="shared-project__live-link">
            🌐 View live app
          </a>
        )}

        <div className="shared-project__progress-bar">
          <div className="shared-project__progress-fill" style={{ width: `${project.completionPercent || 0}%` }} />
        </div>
        <p className="shared-project__progress-label">{project.completionPercent || 0}% complete</p>

        {phases.length > 0 && (
          <section className="shared-project__phases">
            <h2>Phases</h2>
            <ul className="shared-phases-list">
              {phases.map((phase) => (
                <li key={phase._id} className={`shared-phase shared-phase--${phase.status}`}>
                  <span className="shared-phase__index">Phase {phase.index}</span>
                  <span className="shared-phase__type">{phase.type}</span>
                  <span className={`shared-phase__status`}>{phase.status}</span>
                  {phase.tokensUsed > 0 && <span className="shared-phase__tokens">{phase.tokensUsed.toLocaleString()} tokens</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {documents.length > 0 && (
          <section className="shared-project__docs">
            <h2>Documents</h2>
            {documents.map((doc) => (
              <div key={doc._id} className="shared-doc">
                <h3 className="shared-doc__type">{doc.type}</h3>
                {doc.summary && <SafeMarkdown>{doc.summary}</SafeMarkdown>}
              </div>
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
