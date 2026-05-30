import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAccessToken } from '../store/slices/authSlice';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const socketRef  = useRef(null);
  const [connected, setConnected] = useState(false);
  const accessToken = useSelector(selectAccessToken);

  useEffect(() => {
    // Disconnect when logged out
    if (!accessToken) {
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      setConnected(false);
      return;
    }

    // Reconnect if token changed (refresh rotation)
    if (socketRef.current) socketRef.current.disconnect();

    // Dynamic import keeps socket.io-client out of the main bundle entry point
    let cancelled = false;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      const socket = io('/', { path: '/socket.io', withCredentials: true, auth: { token: accessToken } });
      socketRef.current = socket;

      socket.on('connect',       () => setConnected(true));
      socket.on('disconnect',    () => setConnected(false));
      socket.on('connect_error', (err) => {
        if (err.message === 'auth:required' || err.message === 'auth:invalid') {
          setConnected(false);
        }
      });
    });

    return () => { cancelled = true; if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; } };
  }, [accessToken]);

  return (
    <SocketContext.Provider value={{ socket: socketRef, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
