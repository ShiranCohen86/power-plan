import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import * as api from '../../api/notifications.api';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      return await api.getNotifications(); // { notifications, unreadCount }
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch');
    }
  },
);

export const doMarkRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      await api.markRead(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed');
    }
  },
);

export const doMarkAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.markAllRead();
    } catch (err) {
      return rejectWithValue(err.message || 'Failed');
    }
  },
);

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: {
    items:       [],
    unreadCount: 0,
    status:      'idle',
  },
  reducers: {
    addNotification(state, action) {
      state.items.unshift(action.payload);
      if (!action.payload.read) state.unreadCount += 1;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.items       = action.payload.notifications;
        state.unreadCount = action.payload.unreadCount;
        state.status      = 'loaded';
      })
      .addCase(doMarkRead.fulfilled, (state, action) => {
        const item = state.items.find((n) => n._id === action.payload);
        if (item && !item.read) { item.read = true; state.unreadCount = Math.max(0, state.unreadCount - 1); }
      })
      .addCase(doMarkAllRead.fulfilled, (state) => {
        state.items.forEach((n) => { n.read = true; });
        state.unreadCount = 0;
      })
      .addMatcher((action) => action.type === 'auth/logout/fulfilled',
        (state) => { state.items = []; state.unreadCount = 0; state.status = 'idle'; });
  },
});

export const { addNotification } = notificationsSlice.actions;

export const selectNotifications  = (s) => s.notifications.items;
export const selectUnreadCount    = (s) => s.notifications.unreadCount;

export default notificationsSlice.reducer;
