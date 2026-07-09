import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../api/client';
import type { AgendaEvent } from '../../api/types';

export function useAgenda() {
  return useQuery({
    queryKey: ['agenda'] as const,
    queryFn: () => fetchJson<{ events: AgendaEvent[] }>('/api/agenda'),
    refetchInterval: 5 * 60_000,
    refetchIntervalInBackground: true,
  });
}
