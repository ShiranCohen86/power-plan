import { configureStore } from '@reduxjs/toolkit';
import authReducer          from './slices/authSlice.js';
import uiReducer            from './slices/uiSlice.js';
import projectsReducer      from './slices/projectsSlice.js';
import phasesReducer        from './slices/phasesSlice.js';
import tasksReducer         from './slices/tasksSlice.js';
import sprintsReducer       from './slices/sprintsSlice.js';
import notificationsReducer from './slices/notificationsSlice.js';
import { injectStore }      from '../api/request.js';
import { setAccessToken }   from './slices/authSlice.js';

export const store = configureStore({
  reducer: {
    auth:          authReducer,
    ui:            uiReducer,
    projects:      projectsReducer,
    phases:        phasesReducer,
    tasks:         tasksReducer,
    sprints:       sprintsReducer,
    notifications: notificationsReducer,
  },
});

// Give the axios interceptor access to Redux state + setAccessToken action
injectStore(store, setAccessToken);

export { CACHE_TTL_MS, isCacheStale } from './cacheUtils.js';
