import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../api/client';
import type { Completion, CommandLogEntry } from '../../api/types';

export function useCompletions() {
  return useQuery({
    queryKey: ['completions'] as const,
    queryFn: () => fetchJson<Completion[]>('/api/completions?limit=50'),
  });
}

export function useCommandLog() {
  return useQuery({
    queryKey: ['commandLog'] as const,
    queryFn: () => fetchJson<CommandLogEntry[]>('/api/command-log?limit=100'),
  });
}
