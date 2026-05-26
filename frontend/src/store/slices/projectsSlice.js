import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listProjects, createProject, deleteProject } from '../../api/projects.api';

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await listProjects();
      return res.items;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load projects');
    }
  },
);

// Silent background refresh — doesn't set status to 'loading' (no skeleton flash)
export const refreshProjects = createAsyncThunk(
  'projects/refresh',
  async (_, { rejectWithValue }) => {
    try {
      const res = await listProjects();
      return res.items;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  },
);

export const deleteProjectThunk = createAsyncThunk(
  'projects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await deleteProject(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to delete project');
    }
  },
);

export const createNewProject = createAsyncThunk(
  'projects/create',
  async ({ title, idea }, { rejectWithValue }) => {
    try {
      return await createProject({ title, idea });
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to create project');
    }
  },
);

const initialState = {
  items:    [],
  status:   'idle',
  loadedAt: null,
  error:    null,
};

const projectsSlice = createSlice({
  name: 'projects',
  initialState,
  reducers: {
    setProjects(state, action) {
      state.items    = action.payload;
      state.loadedAt = Date.now();
      state.status   = 'succeeded';
    },
    addProject(state, action) {
      state.items.unshift(action.payload);
    },
    updateProject(state, action) {
      const idx = state.items.findIndex((p) => p._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    setProjectsError(state, action) {
      state.status = 'failed';
      state.error  = action.payload;
    },
    setProjectsLoading(state) {
      state.status = 'loading';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => {
        state.status = 'loading';
        state.error  = null;
      })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.items    = action.payload;
        state.loadedAt = Date.now();
        state.status   = 'succeeded';
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.status = 'failed';
        state.error  = action.payload;
      })
      .addCase(createNewProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      })
      .addCase(refreshProjects.fulfilled, (state, action) => {
        state.items    = action.payload;
        state.loadedAt = Date.now();
      })
      .addCase(deleteProjectThunk.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p._id !== action.payload);
      });
  },
});

export const { setProjects, addProject, updateProject, setProjectsError, setProjectsLoading } =
  projectsSlice.actions;

export const selectProjects       = (state) => state.projects.items;
export const selectProjectsStatus = (state) => state.projects.status;
export const selectProjectsError  = (state) => state.projects.error;
export const selectProjectById    = (id) => (state) => state.projects.items.find((p) => p._id === id);

export default projectsSlice.reducer;
