import { safeRequest, httpClient } from './request';

export const listFiles = (projectId) =>
  safeRequest({ method: 'get', url: `/projects/${projectId}/files` });

export async function downloadFiles(projectId, filename) {
  const response = await httpClient({
    method:       'get',
    url:          `/projects/${projectId}/files/download`,
    responseType: 'blob',
  });
  const url  = URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href     = url;
  link.download = filename || 'source.zip';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
