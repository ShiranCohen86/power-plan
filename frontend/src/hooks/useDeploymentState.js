import { useState } from 'react';

export function useDeploymentState() {
  const [deploySteps, setDeploySteps]         = useState({});
  const [liveUrl, setLiveUrl]                 = useState(null);
  const [liveGithubUrl, setLiveGithubUrl]     = useState(null);
  const [deployFailed, setDeployFailed]       = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  return {
    deploySteps,     setDeploySteps,
    liveUrl,         setLiveUrl,
    liveGithubUrl,   setLiveGithubUrl,
    deployFailed,    setDeployFailed,
    showCelebration, setShowCelebration,
  };
}
