import { useRef, useState, useEffect } from 'react';

const SCROLL_THRESHOLD = 50;

export function useApprovalScroll(awaitingPhase) {
  const mainRef = useRef(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  // Reset gate when a different phase awaits approval
  useEffect(() => { setHasScrolledToBottom(false); }, [awaitingPhase]);

  // Detect scroll-to-bottom to unlock the Approve button
  useEffect(() => {
    const el = mainRef.current;
    if (!el || awaitingPhase === null) return;
    const check = () =>
      setHasScrolledToBottom(el.scrollTop + el.clientHeight >= el.scrollHeight - SCROLL_THRESHOLD);
    check();
    el.addEventListener('scroll', check);
    return () => el.removeEventListener('scroll', check);
  }, [awaitingPhase]);

  return { mainRef, hasScrolledToBottom };
}
