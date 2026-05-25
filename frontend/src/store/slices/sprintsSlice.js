import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listSprints, getSprint } from '../../api/sprints.api';

export const fetchSprints = createAsyncThunk(
  'sprints/fetchAll',
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await listSprints(projectId);
      return { projectId, items: res.data.items };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load sprints');
    }
  },
);

export const fetchSprint = createAsyncThunk(
  'sprints/fetchOne',
  async ({ projectId, sprintIndex }, { rejectWithValue }) => {
    try {
      const res = await getSprint(projectId, sprintIndex);
      return { projectId, sprint: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.error || 'Failed to load sprint');
    }
  },
);

const initialState = {
  byProject: {},   // projectId → sprint array
  status:    'idle',
  error:     null,
};

const sprintsSlice = createSlice({
  name: 'sprints',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchSprints.pending,  (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchSprints.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(fetchSprints.fulfilled, (state, action) => {
        const { projectId, items } = action.payload;
        state.byProject[projectId] = items;
        state.status = 'succeeded';
      })
      .addCase(fetchSprint.fulfilled, (state, action) => {
        const { projectId, sprint } = action.payload;
        if (!state.byProject[projectId]) state.byProject[projectId] = [];
        const idx = state.byProject[projectId].findIndex((s) => s.index === sprint.index);
        if (idx !== -1) state.byProject[projectId][idx] = sprint;
        else state.byProject[projectId].push(sprint);
      });
  },
});

export const selectSprints    = (projectId) => (state) => state.sprints.byProject[projectId] || [];
export const selectSprintByIdx = (projectId, idx) =>
  (state) => (state.sprints.byProject[projectId] || []).find((s) => s.index === idx);

export default sprintsSlice.reducer;
