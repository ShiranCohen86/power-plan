import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { listProjects, createProject, deleteProject, toggleProjectPin, updateProjectTags, bulkDeleteProjects, bulkArchiveProjects } from '../../api/projects.api';
import { DASHBOARD_PAGE_SIZE } from '../../config/constants';

const PAGE_LIMIT = DASHBOARD_PAGE_SIZE;

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async ({ page = 1, search = '', sort = 'date', statusFilter = '', signal } = {}, { rejectWithValue }) => {
    try {
      return await listProjects({ page, limit: PAGE_LIMIT, search, sort, statusFilter, signal });
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return rejectWithValue('aborted');
      return rejectWithValue(err.message || 'Failed to load projects');
    }
  },
);

export const loadMoreProjects = createAsyncThunk(
  'projects/loadMore',
  async ({ page, search, sort = 'date', statusFilter = '' }, { rejectWithValue }) => {
    try {
      return await listProjects({ page, limit: PAGE_LIMIT, search, sort, statusFilter });
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
      const { items, search, sort, statusFilter } = getState().projects;
      const limit = Math.max(items.length, PAGE_LIMIT);
      return await listProjects({ page: 1, limit, search, sort, statusFilter });
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

export const togglePinThunk = createAsyncThunk(
  'projects/togglePin',
  async (id, { rejectWithValue }) => {
    try {
      const { isPinned } = await toggleProjectPin(id);
      return { id, isPinned };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to toggle pin');
    }
  },
);

export const bulkDeleteThunk = createAsyncThunk(
  'projects/bulkDelete',
  async (ids, { rejectWithValue }) => {
    try {
      await bulkDeleteProjects(ids);
      return ids;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to bulk delete');
    }
  },
);

export const bulkArchiveThunk = createAsyncThunk(
  'projects/bulkArchive',
  async (ids, { rejectWithValue }) => {
    try {
      await bulkArchiveProjects(ids);
      return ids;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to bulk archive');
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
  items:       [],
  status:      'idle',
  loadedAt:    null,
  error:       null,
  page:        1,
  totalPages:  1,
  total:       0,
  search:       '',
  sort:         'date',
  statusFilter: '',
  tagFilter:    '',     // Sprint 92
  selectedIds:  [],     // Sprint 94: bulk select
  hasMore:      false,
  loadingMore:  false,
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
    setStatusFilter(state, action) {
      state.statusFilter = action.payload;
    },
    setProjectsError(state, action) {
      state.status = 'failed';
      state.error  = action.payload;
    },
    setProjectsLoading(state) {
      state.status = 'loading';
    },
    // Sprint 92: tag filter
    setTagFilter(state, action) {
      state.tagFilter = action.payload;
    },
    // Sprint 94: bulk select
    toggleSelectProject(state, action) {
      const id = action.payload;
      const idx = state.selectedIds.indexOf(id);
      if (idx === -1) state.selectedIds.push(id);
      else state.selectedIds.splice(idx, 1);
    },
    selectAllProjects(state) {
      state.selectedIds = state.items.map((p) => p._id);
    },
    clearSelection(state) {
      state.selectedIds = [];
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
      // Sprint 93: pin
      .addCase(togglePinThunk.fulfilled, (state, action) => {
        const { id, isPinned } = action.payload;
        const proj = state.items.find((p) => p._id === id);
        if (proj) proj.isPinned = isPinned;
      })
      // Sprint 94: bulk delete/archive
      .addCase(bulkDeleteThunk.fulfilled, (state, action) => {
        const deleted = new Set(action.payload);
        state.items     = state.items.filter((p) => !deleted.has(p._id));
        state.total     = Math.max(0, state.total - deleted.size);
        state.selectedIds = [];
        state.hasMore   = state.items.length < state.total;
      })
      .addCase(bulkArchiveThunk.fulfilled, (state, action) => {
        const archived = new Set(action.payload);
        state.items.forEach((p) => { if (archived.has(p._id)) p.status = 'archived'; });
        state.selectedIds = [];
      })
      .addMatcher((action) => action.type === 'auth/logout/fulfilled', () => initialState);
  },
});

export const {
  setProjects, addProject, updateProject,
  setSearch, setSort, setStatusFilter, setTagFilter,
  setProjectsError, setProjectsLoading,
  toggleSelectProject, selectAllProjects, clearSelection,
} = projectsSlice.actions;

export const selectProjects        = (state) => state.projects.items;
export const selectProjectsStatus  = (state) => state.projects.status;
export const selectProjectsError   = (state) => state.projects.error;
export const selectProjectsHasMore = (state) => state.projects.hasMore;
export const selectProjectsTotal   = (state) => state.projects.total;
export const selectProjectsSearch  = (state) => state.projects.search;
export const selectProjectsSort         = (state) => state.projects.sort;
export const selectProjectsStatusFilter = (state) => state.projects.statusFilter;
export const selectLoadingMore     = (state) => state.projects.loadingMore;
export const selectProjectById = (id) => (state) => state.projects.items.find((p) => p._id === id);

export const selectTagFilter       = (state) => state.projects.tagFilter;
export const selectSelectedIds     = (state) => state.projects.selectedIds;

// Memoized selectors for derived data
export const selectActiveProjects = createSelector(
  selectProjects,
  (items) => items.filter((p) => ['planning', 'coding', 'deploying'].includes(p.status)),
);

export const selectLiveProjects = createSelector(
  selectProjects,
  (items) => items.filter((p) => p.status === 'live'),
);

export const selectPinnedProjects = createSelector(
  selectProjects,
  (items) => items.filter((p) => p.isPinned),
);

export const selectAllTags = createSelector(
  selectProjects,
  (items) => [...new Set(items.flatMap((p) => p.tags || []))].sort(),
);

export default projectsSlice.reducer;
