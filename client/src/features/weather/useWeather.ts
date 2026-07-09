import { useQuery } from '@tanstack/react-query';
import { fetchJson } from '../../api/client';
import type { WeatherReport } from '../../api/types';

export function useWeather() {
  return useQuery({
    queryKey: ['weather'] as const,
    queryFn: () => fetchJson<WeatherReport>('/api/weather'),
    refetchInterval: 15 * 60_000,
    refetchIntervalInBackground: true,
  });
}
