import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson, apiPost, apiDelete } from '../../api/client';
import type { Dashboard, Task, Completion } from '../../api/types';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'] as const,
    queryFn: () => fetchJson<Dashboard>('/api/dashboard'),
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiPost<{ task: Task; completion: Completion }>(`/api/tasks/${id}/complete`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['completions'] });
    },
  });
}

export function useUndoCompletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/completions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['completions'] });
    },
  });
}
