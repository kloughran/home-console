// Minimal Google Tasks API v1 client over raw fetch.
// https://developers.google.com/tasks/reference/rest

import { getAccessToken } from './auth.js';

const BASE = 'https://tasks.googleapis.com/tasks/v1';

async function gfetch(path, options = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Google Tasks API ${res.status} on ${path}: ${JSON.stringify(data)}`);
  return data;
}

// '@default' is the API's alias for the user's primary list — no lookup needed.
export async function resolveListId(name) {
  if (name === '@default') return '@default';
  const data = await gfetch('/users/@me/lists?maxResults=100');
  const list = (data.items || []).find((l) => l.title.trim().toLowerCase() === name.trim().toLowerCase());
  return list?.id ?? null;
}

async function listPaged(listId, baseParams) {
  const items = [];
  let pageToken;
  do {
    const params = new URLSearchParams({ maxResults: '100', ...baseParams });
    if (pageToken) params.set('pageToken', pageToken);
    const data = await gfetch(`/lists/${encodeURIComponent(listId)}/tasks?${params}`);
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
  } while (pageToken);
  return items;
}

// Two calls by design: setting completedMin makes the API return ONLY
// completed tasks (pending ones are filtered out), so pending and completed
// must be fetched separately.
export async function listPendingTasks(listId) {
  return listPaged(listId, { showCompleted: 'false' });
}

export async function listCompletedTasks(listId, completedMin) {
  return listPaged(listId, {
    showCompleted: 'true',
    showHidden: 'true',
    completedMin,
  });
}

export async function insertTask(listId, { title, notes, due }) {
  return gfetch(`/lists/${encodeURIComponent(listId)}/tasks`, {
    method: 'POST',
    body: JSON.stringify({ title, notes, due }),
  });
}

export async function patchTask(listId, taskId, fields) {
  return gfetch(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
}

export async function deleteTask(listId, taskId) {
  await gfetch(`/lists/${encodeURIComponent(listId)}/tasks/${encodeURIComponent(taskId)}`, {
    method: 'DELETE',
  });
}
