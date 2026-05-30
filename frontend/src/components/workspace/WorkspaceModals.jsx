import { toastSuccess } from '../../utils/announce';
import CelebrationOverlay  from './CelebrationOverlay';
import ProjectSettingsModal from './ProjectSettingsModal';
import CredentialsGateModal from './CredentialsGateModal';
import MeetingRoomOverlay   from './MeetingRoomOverlay';
import { startPipeline }    from '../../api/pipeline.api';

export default function WorkspaceModals({
  showCelebration,
  onCloseCelebration,
  liveUrl,
  liveGithubUrl,
  projectTitle,
  introCount,
  introTargetNode,  // PhaseIntroOverlay rendered from parent
  showProjectSettings,
  onCloseSettings,
  projectId,
  awaitingServices,
  onServicesClose,
  showMeetingRoom,
  onCloseMeeting,
  meetingMsgs,
  isMeetingLive,
}) {
  async function handleServicesDone() {
    onServicesClose();
    try {
      await startPipeline(projectId);
      toastSuccess('המפתחות נשמרו — הפייפליין ממשיך');
    } catch {
      // pipeline may already be resuming server-side
    }
  }

  return (
    <>
      {showCelebration && liveUrl && (
        <CelebrationOverlay
          liveUrl={liveUrl}
          githubUrl={liveGithubUrl}
          projectTitle={projectTitle}
          onClose={onCloseCelebration}
        />
      )}

      {showProjectSettings && (
        <ProjectSettingsModal
          projectId={projectId}
          projectTitle={projectTitle}
          onClose={onCloseSettings}
        />
      )}

      {awaitingServices && (
        <CredentialsGateModal
          projectId={projectId}
          services={awaitingServices}
          onDone={handleServicesDone}
          onClose={onServicesClose}
        />
      )}

      {showMeetingRoom && (
        <MeetingRoomOverlay
          meetingMsgs={meetingMsgs}
          isMeetingLive={isMeetingLive}
          onClose={onCloseMeeting}
        />
      )}
    </>
  );
}
