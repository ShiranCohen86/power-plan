import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import IdeaInput from '../components/discovery/IdeaInput';
import DiscoveryChat from '../components/discovery/DiscoveryChat';
import SettingsGate from '../components/SettingsGate';
import { createNewProject } from '../store/slices/projectsSlice';
import { discoveryComplete, getProject, getProjectSettings, importProjectFromUrl } from '../api/projects.api';

const STEP_IDEA      = 'idea';
const STEP_GATE      = 'gate';
const STEP_DISCOVERY = 'discovery';

export default function NewProject() {
  const { t }          = useTranslation();
  const dispatch       = useDispatch();
  const navigate       = useNavigate();
  const [searchParams] = useSearchParams();

  const [step, setStep]         = useState(STEP_IDEA);
  const [project, setProject]   = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState('');
  const [importUrl,   setImportUrl]   = useState('');
  const [importing,   setImporting]   = useState(false);

  // Resume an existing onboarding project from the dashboard
  const resumeId = searchParams.get('resumeId');
  useEffect(() => {
    if (!resumeId) return;
    (async () => {
      setCreating(true);
      try {
        const [proj, settings] = await Promise.all([
          getProject(resumeId),
          getProjectSettings(resumeId).catch(() => null),
        ]);
        if (proj.status !== 'onboarding') {
          navigate(`/projects/${resumeId}/workspace`);
          return;
        }
        setProject(proj);
        // Show settings gate if no API key, otherwise go straight to discovery
        if (settings?.hasApiKey) {
          setStep(STEP_DISCOVERY);
        } else {
          setStep(STEP_GATE);
        }
      } catch {
        setError('לא ניתן לטעון את הפרויקט — נסה שוב');
      } finally {
        setCreating(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  async function handleIdeaSubmit({ title, idea }) {
    setCreating(true);
    setError('');
    try {
      const result = await dispatch(createNewProject({ title, idea })).unwrap();
      setProject(result);
      setStep(STEP_GATE);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleDiscoveryComplete(answers) {
    try {
      await discoveryComplete(project._id, answers);
      navigate(`/projects/${project._id}/workspace`);
    } catch (err) {
      setError(err?.message || t('common.error'));
    }
  }

  return (
    <div className={`new-project-shell${step === STEP_DISCOVERY ? ' new-project-shell--chat' : ''}`}>
      <div className="new-project-card">
        {error && <div className="alert alert--error">{error}</div>}

        {creating && step === STEP_IDEA && (
          <div style={{ textAlign: 'center', padding: 32 }}>
            <div className="pwa-spinner" />
          </div>
        )}

        {!creating && step === STEP_IDEA && (
          <>
            <IdeaInput onSubmit={handleIdeaSubmit} loading={creating} />
            {/* S140: import from URL */}
            <div className="new-project-import-url">
              <p className="new-project-import-url__label">Or import from a URL:</p>
              <div className="new-project-import-url__row">
                <input
                  type="url"
                  className="new-project-import-url__input"
                  placeholder="https://example.com/product-page"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  dir="ltr"
                />
                <button
                  className="btn btn--secondary"
                  disabled={importing || !importUrl.trim()}
                  onClick={async () => {
                    setImporting(true); setError('');
                    try {
                      const { title, idea } = await importProjectFromUrl(importUrl.trim());
                      await handleIdeaSubmit({ title, idea });
                    } catch (err) {
                      setError(err?.message || 'Could not import from URL');
                    } finally { setImporting(false); }
                  }}
                >
                  {importing ? '...' : '🔗 Import'}
                </button>
              </div>
            </div>
          </>
        )}

        {step === STEP_GATE && project && (
          <SettingsGate
            service="anthropic"
            projectId={project._id}
            onConfigured={() => setStep(STEP_DISCOVERY)}
          />
        )}

        {step === STEP_DISCOVERY && project && (
          <DiscoveryChat
            projectId={project._id}
            onComplete={handleDiscoveryComplete}
          />
        )}
      </div>
    </div>
  );
}
