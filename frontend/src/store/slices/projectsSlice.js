import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { listProjects, createProject, deleteProject } from '../../api/projects.api';

const PAGE_LIMIT = 12;

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async ({ page = 1, search = '', sort = 'date', signal } = {}, { rejectWithValue }) => {
    try {
      return await listProjects({ page, limit: PAGE_LIMIT, search, sort, signal });
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return rejectWithValue('aborted');
      return rejectWithValue(err.message || 'Failed to load projects');
    }
  },
);

export const loadMoreProjects = createAsyncThunk(
  'projects/loadMore',
  async ({ page, search, sort = 'date' }, { rejectWithValue }) => {
    try {
      return await listProjects({ page, limit: PAGE_LIMIT, search, sort });
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to load more');
    }
  },
);

// Silent background refresh — doesn't set status to 'loading' (no skeleton flash)
export const refreshProjects = createAsyncThunk(
  'projects/refresh',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { items, search, sort } = getState().projects;
      const limit = Math.max(items.length, PAGE_LIMIT);
      return await listProjects({ page: 1, limit, search, sort });
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
  items:      [],
  status:     'idle',
  loadedAt:   null,
  error:      null,
  page:       1,
  totalPages: 1,
  total:      0,
  search:     '',
  sort:       'date',
  hasMore:    false,
  loadingMore: false,
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
      state.total += 1;
    },
    updateProject(state, action) {
      const idx = state.items.findIndex((p) => p._id === action.payload._id);
      if (idx !== -1) state.items[idx] = action.payload;
    },
    setSearch(state, action) {
      state.search = action.payload;
    },
    setSort(state, action) {
      state.sort = action.payload;
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
        const { items, total, page, totalPages } = action.payload;
        state.items      = items;
        state.total      = total;
        state.page       = page;
        state.totalPages = totalPages;
        state.hasMore    = page < totalPages;
        state.loadedAt   = Date.now();
        state.status     = 'succeeded';
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        if (action.payload === 'aborted') return; // stale request cancelled — ignore
        state.status = 'failed';
        state.error  = action.payload;
      })
      .addCase(loadMoreProjects.pending, (state) => {
        state.loadingMore = true;
      })
      .addCase(loadMoreProjects.fulfilled, (state, action) => {
        const { items, total, page, totalPages } = action.payload;
        state.items      = [...state.items, ...items];
        state.total      = total;
        state.page       = page;
        state.totalPages = totalPages;
        state.hasMore    = page < totalPages;
        state.loadingMore = false;
      })
      .addCase(loadMoreProjects.rejected, (state) => {
        state.loadingMore = false;
      })
      .addCase(createNewProject.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.total += 1;
      })
      .addCase(refreshProjects.fulfilled, (state, action) => {
        const { items, total, totalPages } = action.payload;
        state.items      = items;
        state.total      = total;
        state.totalPages = totalPages;
        state.hasMore    = state.page < totalPages;
        state.loadedAt   = Date.now();
      })
      .addCase(deleteProjectThunk.fulfilled, (state, action) => {
        state.items  = state.items.filter((p) => p._id !== action.payload);
        state.total  = Math.max(0, state.total - 1);
        state.hasMore = state.items.length < state.total;
      })
      .addMatcher((action) => action.type === 'auth/logout/fulfilled', () => initialState);
  },
});

export const { setProjects, addProject, updateProject, setSearch, setSort, setProjectsError, setProjectsLoading } =
  projectsSlice.actions;

export const selectProjects        = (state) => state.projects.items;
export const selectProjectsStatus  = (state) => state.projects.status;
export const selectProjectsError   = (state) => state.projects.error;
export const selectProjectsHasMore = (state) => state.projects.hasMore;
export const selectProjectsTotal   = (state) => state.projects.total;
export const selectProjectsSearch  = (state) => state.projects.search;
export const selectProjectsSort    = (state) => state.projects.sort;
export const selectLoadingMore     = (state) => state.projects.loadingMore;
export const selectProjectById     = (id) => (state) => state.projects.items.find((p) => p._id === id);

export default projectsSlice.reducer;
