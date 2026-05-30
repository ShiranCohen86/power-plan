import toast from 'react-hot-toast';

function announce(msg) {
  const el = document.getElementById('toast-announcer');
  if (!el) return;
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

export function toastSuccess(msg, opts) {
  announce(msg);
  return toast.success(msg, opts);
}

export function toastError(msg, opts) {
  announce(msg);
  return toast.error(msg, opts);
}

export function toastInfo(msg, opts) {
  announce(msg);
  return toast(msg, opts);
}
