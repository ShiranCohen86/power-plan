import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listPhases } from '../../api/pipeline.api';

export const fetchPhases = createAsyncThunk(
  'phases/fetchAll',
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await listPhases(projectId);
      return { projectId, phases: res.items };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load phases');
    }
  },
);

const initialState = {
  byProject: {},   // projectId → { items: [], status, error }
};

const phasesSlice = createSlice({
  name: 'phases',
  initialState,
  reducers: {
    upsertPhase(state, action) {
      const { projectId, phase } = action.payload;
      if (!state.byProject[projectId]) {
        state.byProject[projectId] = { items: [], status: 'idle', error: null };
      }
      const items = state.byProject[projectId].items;
      const idx   = items.findIndex((p) => p.index === phase.index);
      if (idx !== -1) {
        items[idx] = { ...items[idx], ...phase };
      } else {
        items.push(phase);
        items.sort((a, b) => a.index - b.index);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPhases.pending, (state, action) => {
        const pid = action.meta.arg;
        state.byProject[pid] = { items: [], status: 'loading', error: null };
      })
      .addCase(fetchPhases.fulfilled, (state, action) => {
        const { projectId, phases } = action.payload;
        state.byProject[projectId] = { items: phases, status: 'succeeded', error: null };
      })
      .addCase(fetchPhases.rejected, (state, action) => {
        const pid = action.meta.arg;
        if (state.byProject[pid]) state.byProject[pid].status = 'failed';
      })
      .addMatcher((action) => action.type === 'auth/logout/fulfilled', () => initialState);
  },
});

export const { upsertPhase } = phasesSlice.actions;

export const selectPhases       = (projectId) => (state) => state.phases.byProject[projectId]?.items || [];
export const selectPhasesStatus = (projectId) => (state) => state.phases.byProject[projectId]?.status || 'idle';

export default phasesSlice.reducer;
