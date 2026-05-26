import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import IdeaInput from '../components/discovery/IdeaInput';
import DiscoveryChat from '../components/discovery/DiscoveryChat';
import SettingsGate from '../components/SettingsGate';
import { createNewProject } from '../store/slices/projectsSlice';
import { discoveryComplete } from '../api/projects.api';

const STEP_IDEA      = 'idea';
const STEP_GATE      = 'gate';       // Anthropic key missing for this project
const STEP_DISCOVERY = 'discovery';

export default function NewProject() {
  const { t }    = useTranslation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [step, setStep]         = useState(STEP_IDEA);
  const [project, setProject]   = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError]       = useState('');

  async function handleIdeaSubmit({ title, idea }) {
    setCreating(true);
    setError('');
    try {
      const result = await dispatch(createNewProject({ title, idea })).unwrap();
      setProject(result);
      // Always show the key gate — key is per-project
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
    <div className="new-project-shell">
      <div className="new-project-card">
        {error && <div className="alert alert--error">{error}</div>}

        {step === STEP_IDEA && (
          <IdeaInput onSubmit={handleIdeaSubmit} loading={creating} />
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
