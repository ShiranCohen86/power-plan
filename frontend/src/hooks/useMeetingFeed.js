import { useState } from 'react';

export function useMeetingFeed() {
  const [meetingMsgs, setMeetingMsgs]               = useState([]);
  const [techLogs, setTechLogs]                     = useState([]);
  const [activeFeedTab, setActiveFeedTab]           = useState('meeting');
  const [scheduledMeeting, setScheduledMeeting]     = useState(null);
  const [isMeetingLive, setIsMeetingLive]           = useState(false);
  const [missedMeeting, setMissedMeeting]           = useState(false);
  const [showMeetingRoom, setShowMeetingRoom]       = useState(false);
  const [consultantMsgs, setConsultantMsgs]         = useState([]);
  const [consultantsRunning, setConsultantsRunning] = useState(false);

  return {
    meetingMsgs,       setMeetingMsgs,
    techLogs,          setTechLogs,
    activeFeedTab,     setActiveFeedTab,
    scheduledMeeting,  setScheduledMeeting,
    isMeetingLive,     setIsMeetingLive,
    missedMeeting,     setMissedMeeting,
    showMeetingRoom,   setShowMeetingRoom,
    consultantMsgs,    setConsultantMsgs,
    consultantsRunning, setConsultantsRunning,
  };
}
