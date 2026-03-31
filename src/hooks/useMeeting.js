import { useState, useCallback } from 'react';
import { playMeetingEnded, playMeetingStarted } from '../utils/pixelSounds';

export function useMeeting(agents) {
  const [inMeeting, setInMeeting] = useState({});

  const meetingCount = Object.keys(inMeeting).length;

  const startMeeting = useCallback(() => {
    const next = {};
    agents.forEach((a) => {
      if (a.status !== 'done') next[a.id] = true;
    });
    setInMeeting(next);
    playMeetingStarted();
  }, [agents]);

  const endMeeting = useCallback(() => {
    setInMeeting({});
    playMeetingEnded();
  }, []);

  const toggleMeeting = useCallback(() => {
    if (meetingCount > 0) endMeeting();
    else startMeeting();
  }, [meetingCount, startMeeting, endMeeting]);

  return { inMeeting, meetingCount, startMeeting, endMeeting, toggleMeeting };
}
