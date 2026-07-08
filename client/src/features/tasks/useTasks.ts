import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchJson, apiPost, apiPut, apiDelete } from '../../api/client';
import type { Task, TaskInput, UpdateTaskInput } from '../../api/types';

export function useTasks() {
  return useQuery({
    queryKey: ['tasks'] as const,
    queryFn: () => fetchJson<Task[]>('/api/tasks'),
  });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: TaskInput) => apiPost<Task>('/api/tasks', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTaskInput }) =>
      apiPut<Task>(`/api/tasks/${id}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiDelete(`/api/tasks/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['completions'] });
    },
  });
}
