import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { selectSelectedIds, clearSelection, bulkDeleteThunk, bulkArchiveThunk } from '../../store/slices/projectsSlice';

export default function BulkActionsBar() {
  const dispatch     = useDispatch();
  const selectedIds  = useSelector(selectSelectedIds);

  if (!selectedIds.length) return null;

  async function handleBulkDelete() {
    if (!window.confirm(`Delete ${selectedIds.length} project(s)? This cannot be undone.`)) return;
    try {
      await dispatch(bulkDeleteThunk(selectedIds)).unwrap();
      toast.success(`${selectedIds.length} project(s) deleted`);
    } catch {
      toast.error('Failed to delete some projects');
    }
  }

  async function handleBulkArchive() {
    try {
      await dispatch(bulkArchiveThunk(selectedIds)).unwrap();
      toast.success(`${selectedIds.length} project(s) archived`);
    } catch {
      toast.error('Failed to archive some projects');
    }
  }

  return (
    <div className="bulk-actions-bar" role="toolbar" aria-label="Bulk actions">
      <span className="bulk-actions-bar__count">{selectedIds.length} selected</span>
      <button className="bulk-actions-bar__btn bulk-actions-bar__btn--archive" onClick={handleBulkArchive}>
        📦 Archive
      </button>
      <button className="bulk-actions-bar__btn bulk-actions-bar__btn--delete" onClick={handleBulkDelete}>
        🗑️ Delete
      </button>
      <button className="bulk-actions-bar__btn bulk-actions-bar__btn--clear" onClick={() => dispatch(clearSelection())}>
        ✕ Clear
      </button>
    </div>
  );
}
