import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { getEpicTree, getTasksBySprint, updateTaskStatus as apiUpdateStatus } from '../../api/tasks.api';

export const fetchEpicTree = createAsyncThunk(
  'tasks/fetchEpicTree',
  async (projectId, { rejectWithValue }) => {
    try {
      const res = await getEpicTree(projectId);
      return { projectId, items: res.items };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load tasks');
    }
  },
);

export const fetchTasksBySprint = createAsyncThunk(
  'tasks/fetchBySprint',
  async ({ projectId, sprintIndex }, { rejectWithValue }) => {
    try {
      const res = await getTasksBySprint(projectId, sprintIndex);
      return { projectId, sprintIndex, items: res.items };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load sprint tasks');
    }
  },
);

export const changeTaskStatus = createAsyncThunk(
  'tasks/updateStatus',
  async ({ projectId, taskId, status }, { rejectWithValue }) => {
    try {
      const res = await apiUpdateStatus(projectId, taskId, status);
      return { projectId, task: res };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to update status');
    }
  },
);

const initialState = {
  epicsByProject:   {},  // projectId → epic tree array
  sprintTasks:      {},  // `${projectId}:${sprintIndex}` → task array
  status:           'idle',
  error:            null,
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchEpicTree.pending,  (state) => { state.status = 'loading'; state.error = null; })
      .addCase(fetchEpicTree.rejected, (state, action) => { state.status = 'failed'; state.error = action.payload; })
      .addCase(fetchEpicTree.fulfilled, (state, action) => {
        const { projectId, items } = action.payload;
        state.epicsByProject[projectId] = items;
        state.status = 'succeeded';
      })
      .addCase(fetchTasksBySprint.fulfilled, (state, action) => {
        const { projectId, sprintIndex, items } = action.payload;
        state.sprintTasks[`${projectId}:${sprintIndex}`] = items;
      })
      .addMatcher((action) => action.type === 'auth/logout/fulfilled', () => initialState)
      .addCase(changeTaskStatus.fulfilled, (state, action) => {
        const { projectId, task } = action.payload;
        // update in epicsByProject
        const epics = state.epicsByProject[projectId];
        if (epics) {
          for (const epic of epics) {
            for (const feat of epic.features || []) {
              const idx = (feat.tasks || []).findIndex((t) => t._id === task._id);
              if (idx !== -1) { feat.tasks[idx] = task; break; }
            }
          }
        }
        // update in sprintTasks
        for (const key of Object.keys(state.sprintTasks)) {
          if (key.startsWith(projectId)) {
            const idx = state.sprintTasks[key].findIndex((t) => t._id === task._id);
            if (idx !== -1) state.sprintTasks[key][idx] = task;
          }
        }
      });
  },
});

export const selectEpicTree   = (projectId) => (state) => state.tasks.epicsByProject[projectId] || [];
export const selectSprintTasks = (projectId, sprintIndex) =>
  (state) => state.tasks.sprintTasks[`${projectId}:${sprintIndex}`] || [];
export const selectTasksStatus = (state) => state.tasks.status;

export default tasksSlice.reducer;
