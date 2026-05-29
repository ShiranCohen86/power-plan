import { useRef, useState } from 'react';

const SIDEBAR_MIN = 160;
const SIDEBAR_MAX = 400;
const FEED_MIN    = 200;
const FEED_MAX    = 480;
const SIDEBAR_KEY = 'ws-sidebar-w';
const FEED_KEY    = 'ws-feed-w';

function readStoredWidth(key, defaultVal, min, max) {
  return Math.max(min, Math.min(max, parseInt(localStorage.getItem(key), 10) || defaultVal));
}

export function usePanelResize() {
  const sidebarRef     = useRef(null);
  const feedWrapperRef = useRef(null);

  const [sidebarWidth, setSidebarWidth] = useState(() =>
    readStoredWidth(SIDEBAR_KEY, 240, SIDEBAR_MIN, SIDEBAR_MAX),
  );
  const [feedWidth, setFeedWidth] = useState(() =>
    readStoredWidth(FEED_KEY, 280, FEED_MIN, FEED_MAX),
  );

  function startResize(e, which) {
    e.preventDefault();
    const startX = e.clientX;
    const isSidebar = which === 'sidebar';
    const startW = isSidebar
      ? sidebarRef.current.offsetWidth
      : feedWrapperRef.current.offsetWidth;

    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMove(ev) {
      const delta = ev.clientX - startX;
      if (isSidebar) {
        sidebarRef.current.style.width = Math.max(SIDEBAR_MIN, Math.min(SIDEBAR_MAX, startW - delta)) + 'px';
      } else {
        feedWrapperRef.current.style.width = Math.max(FEED_MIN, Math.min(FEED_MAX, startW + delta)) + 'px';
      }
    }

    function onUp() {
      document.body.style.cursor     = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const finalW = isSidebar
        ? sidebarRef.current.offsetWidth
        : feedWrapperRef.current.offsetWidth;
      if (isSidebar) { setSidebarWidth(finalW); localStorage.setItem(SIDEBAR_KEY, finalW); }
      else           { setFeedWidth(finalW);    localStorage.setItem(FEED_KEY, finalW); }
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  return { sidebarRef, feedWrapperRef, sidebarWidth, feedWidth, startResize };
}
